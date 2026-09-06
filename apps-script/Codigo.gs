/* =================================================================
   Inventario de Herramientas — Backend (Google Apps Script)
   -----------------------------------------------------------------
   Cómo instalar:
   1) Abre el Google Sheets → Extensiones → Apps Script.
   2) Pega TODO este archivo (reemplaza el contenido).
   3) Proyecto → Configuración del proyecto → Propiedades del script
      → agrega la propiedad:  TOKEN = <tu-token-secreto>
      (el mismo valor que pondrás en js/config.js del frontend).
   4) Implementar → Nueva implementación → Tipo: Aplicación web
        - Ejecutar como:  Yo (el dueño)
        - Quién tiene acceso:  Cualquiera
   5) Copia la URL /exec y pégala en js/config.js (WEB_APP_URL).

   Hojas esperadas (fila 1 = encabezados):
   - Herramientas:        ID | Nombre | Marca/Modelo | Categoría | Ubicación |
                          Número de control | Estado | Prestado a | Fecha préstamo |
                          Última calibración | Próxima calibración
   - Historial_Prestamos: ID_Registro | ID_Herramienta | Número de control | Nombre |
                          Prestado a | Fecha_Prestamo | Fecha_Devolucion | Estatus
   - Conteos:             ID_Conteo | Fecha | Total revisadas | En su lugar |
                          Mal ubicadas | Faltantes | Detalle
   ================================================================= */

var SHEET_TOOLS = "Herramientas";
var SHEET_HISTORY = "Historial_Prestamos";
var SHEET_COUNTS = "Conteos";

/* ---------- utilidades ---------- */

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function checkToken_(token) {
  var expected = PropertiesService.getScriptProperties().getProperty("TOKEN");
  if (!expected) throw new Error("Falta configurar TOKEN en Propiedades del script.");
  if (String(token) !== String(expected)) throw new Error("Token inválido.");
}

function norm_(s) {
  return String(s || "")
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // quita acentos
    .replace(/[.\s]+/g, " ")
    .trim();
}

// Mapa fieldKey -> índice de columna (0-based), buscando por encabezado con alias
function colMap_(headers, spec) {
  var normHeaders = headers.map(norm_);
  var map = {};
  Object.keys(spec).forEach(function (key) {
    var aliases = spec[key];
    var idx = -1;
    for (var a = 0; a < aliases.length; a++) {
      idx = normHeaders.indexOf(norm_(aliases[a]));
      if (idx >= 0) break;
    }
    map[key] = idx;
  });
  return map;
}

var TOOLS_SPEC = {
  id: ["ID"],
  name: ["Nombre"],
  brand: ["Marca/Modelo", "Marca / modelo", "Marca", "Modelo"],
  cat: ["Categoría"],
  loc: ["Ubicación"],
  control: ["Número de control", "No. de control", "Control"],
  status: ["Estado"],
  holder: ["Prestado a"],
  since: ["Fecha préstamo", "Fecha de préstamo"],
  calLast: ["Última calibración"],
  calNext: ["Próxima calibración"],
};

var HIST_SPEC = {
  regId: ["ID_Registro", "ID Registro"],
  toolId: ["ID_Herramienta", "ID Herramienta"],
  control: ["Número de control", "Control"],
  name: ["Nombre"],
  holder: ["Prestado a"],
  out: ["Fecha_Prestamo", "Fecha préstamo", "Fecha de préstamo"],
  back: ["Fecha_Devolucion", "Fecha devolución"],
  status: ["Estatus", "Estado"],
};

function sheet_(name) {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
  if (!sh) throw new Error("No existe la hoja: " + name);
  return sh;
}

function stamp_(d) {
  d = d || new Date();
  var p = function (n) { return ("" + n).length < 2 ? "0" + n : "" + n; };
  var ms = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  return p(d.getDate()) + " " + ms[d.getMonth()] + " " + d.getFullYear() + " " + p(d.getHours()) + ":" + p(d.getMinutes());
}

/* ---------- lectura ---------- */

function readTools_() {
  var sh = sheet_(SHEET_TOOLS);
  var values = sh.getDataRange().getValues();
  if (values.length < 2) return [];
  var headers = values[0];
  var c = colMap_(headers, TOOLS_SPEC);
  if (c.id < 0) throw new Error("La hoja Herramientas no tiene columna 'ID'.");

  var history = readHistoryByTool_();

  var tools = [];
  for (var r = 1; r < values.length; r++) {
    var row = values[r];
    var id = row[c.id];
    if (id === "" || id === null) continue;
    var status = c.status >= 0 ? String(row[c.status] || "").trim() : "";
    if (!status) status = "Disponible";
    tools.push({
      id: id,
      name: c.name >= 0 ? String(row[c.name] || "") : "",
      brand: c.brand >= 0 ? String(row[c.brand] || "") : "",
      cat: c.cat >= 0 ? String(row[c.cat] || "") : "",
      loc: c.loc >= 0 ? String(row[c.loc] || "") : "",
      control: c.control >= 0 ? String(row[c.control] || "") : "",
      status: status,
      holder: c.holder >= 0 ? String(row[c.holder] || "") : "",
      since: c.since >= 0 ? String(row[c.since] || "") : "",
      calLast: c.calLast >= 0 ? String(row[c.calLast] || "") : "",
      calNext: c.calNext >= 0 ? String(row[c.calNext] || "") : "",
      history: history[String(id)] || [],
    });
  }
  return tools;
}

// Devuelve { [toolId]: [{who, out, back}, ...] } con el más reciente primero
function readHistoryByTool_() {
  var out = {};
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET_HISTORY);
  if (!sh) return out;
  var values = sh.getDataRange().getValues();
  if (values.length < 2) return out;
  var c = colMap_(values[0], HIST_SPEC);
  if (c.toolId < 0) return out;
  for (var r = 1; r < values.length; r++) {
    var row = values[r];
    var tid = row[c.toolId];
    if (tid === "" || tid === null) continue;
    var key = String(tid);
    if (!out[key]) out[key] = [];
    out[key].push({
      who: c.holder >= 0 ? String(row[c.holder] || "") : "",
      out: c.out >= 0 ? String(row[c.out] || "") : "",
      back: c.back >= 0 && row[c.back] !== "" ? String(row[c.back]) : null,
    });
  }
  // más reciente primero (asumiendo append cronológico)
  Object.keys(out).forEach(function (k) { out[k].reverse(); });
  return out;
}

// Encuentra el número de fila (1-based) de una herramienta por ID
function findToolRow_(sh, c, id) {
  var values = sh.getDataRange().getValues();
  for (var r = 1; r < values.length; r++) {
    if (String(values[r][c.id]) === String(id)) return r + 1;
  }
  return -1;
}

/* ---------- escritura ---------- */

// Normaliza un número de control para comparar (sin espacios, mayúsculas)
function normControl_(s) {
  return String(s || "").trim().toUpperCase().replace(/\s+/g, "");
}

function addTool_(p) {
  var sh = sheet_(SHEET_TOOLS);
  var data = sh.getDataRange().getValues();
  var headers = data[0];
  var c = colMap_(headers, TOOLS_SPEC);

  // Red de seguridad: no permitir número de control duplicado
  if (c.control >= 0) {
    var wanted = normControl_(p.control);
    if (wanted) {
      for (var r = 1; r < data.length; r++) {
        if (normControl_(data[r][c.control]) === wanted) {
          return { ok: false, error: "Ya existe una herramienta con el número de control " + p.control };
        }
      }
    }
  }

  var id = "H-" + Date.now();
  var row = new Array(headers.length).fill("");
  if (c.id >= 0) row[c.id] = id;
  if (c.name >= 0) row[c.name] = p.name || "";
  if (c.brand >= 0) row[c.brand] = p.brand || "";
  if (c.cat >= 0) row[c.cat] = p.cat || "";
  if (c.loc >= 0) row[c.loc] = p.loc || "";
  if (c.control >= 0) row[c.control] = p.control || "";
  if (c.status >= 0) row[c.status] = "Disponible";
  if (c.calLast >= 0) row[c.calLast] = p.calLast || "";
  if (c.calNext >= 0) row[c.calNext] = p.calNext || "";
  sh.appendRow(row);
  return {
    ok: true,
    tool: {
      id: id, name: p.name || "", brand: p.brand || "", cat: p.cat || "",
      loc: p.loc || "", control: p.control || "", status: "Disponible",
      holder: "", since: "", calLast: p.calLast || "", calNext: p.calNext || "", history: [],
    },
  };
}

function deleteTool_(p) {
  var sh = sheet_(SHEET_TOOLS);
  var c = colMap_(sh.getDataRange().getValues()[0], TOOLS_SPEC);
  var rowNum = findToolRow_(sh, c, p.id);
  if (rowNum < 0) throw new Error("Herramienta no encontrada: " + p.id);
  sh.deleteRow(rowNum);
  return { ok: true };
}

function lendTool_(p) {
  var borrower = String(p.borrower || "").trim();
  if (!borrower) throw new Error("Falta el nombre del solicitante.");
  var since = stamp_();

  // 1) actualizar Herramientas
  var sh = sheet_(SHEET_TOOLS);
  var c = colMap_(sh.getDataRange().getValues()[0], TOOLS_SPEC);
  var rowNum = findToolRow_(sh, c, p.id);
  if (rowNum < 0) throw new Error("Herramienta no encontrada: " + p.id);
  if (c.status >= 0) sh.getRange(rowNum, c.status + 1).setValue("Prestada");
  if (c.holder >= 0) sh.getRange(rowNum, c.holder + 1).setValue(borrower);
  if (c.since >= 0) sh.getRange(rowNum, c.since + 1).setValue(since);

  // datos para el registro de historial
  var vals = sh.getRange(rowNum, 1, 1, sh.getLastColumn()).getValues()[0];
  var control = c.control >= 0 ? vals[c.control] : "";
  var name = c.name >= 0 ? vals[c.name] : "";

  // 2) agregar fila en Historial_Prestamos (append-only)
  appendHistory_({ toolId: p.id, control: control, name: name, holder: borrower, out: since });

  return { ok: true, since: since };
}

function returnTool_(p) {
  var back = stamp_();

  // 1) limpiar Herramientas
  var sh = sheet_(SHEET_TOOLS);
  var c = colMap_(sh.getDataRange().getValues()[0], TOOLS_SPEC);
  var rowNum = findToolRow_(sh, c, p.id);
  if (rowNum < 0) throw new Error("Herramienta no encontrada: " + p.id);
  if (c.status >= 0) sh.getRange(rowNum, c.status + 1).setValue("Disponible");
  if (c.holder >= 0) sh.getRange(rowNum, c.holder + 1).setValue("");
  if (c.since >= 0) sh.getRange(rowNum, c.since + 1).setValue("");

  // 2) cerrar el préstamo abierto más reciente en Historial_Prestamos
  closeHistory_(p.id, back);

  return { ok: true, back: back };
}

function appendHistory_(h) {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_HISTORY);
  if (!sh) throw new Error("No existe la hoja: " + SHEET_HISTORY);
  var headers = sh.getDataRange().getValues()[0];
  var c = colMap_(headers, HIST_SPEC);
  var row = new Array(headers.length).fill("");
  if (c.regId >= 0) row[c.regId] = "R-" + Date.now();
  if (c.toolId >= 0) row[c.toolId] = h.toolId;
  if (c.control >= 0) row[c.control] = h.control || "";
  if (c.name >= 0) row[c.name] = h.name || "";
  if (c.holder >= 0) row[c.holder] = h.holder || "";
  if (c.out >= 0) row[c.out] = h.out || "";
  if (c.back >= 0) row[c.back] = "";
  if (c.status >= 0) row[c.status] = "Prestada";
  sh.appendRow(row);
}

function closeHistory_(toolId, back) {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_HISTORY);
  if (!sh) return;
  var values = sh.getDataRange().getValues();
  if (values.length < 2) return;
  var c = colMap_(values[0], HIST_SPEC);
  if (c.toolId < 0) return;
  // recorrer de abajo hacia arriba buscando el préstamo abierto de esa herramienta
  for (var r = values.length - 1; r >= 1; r--) {
    if (String(values[r][c.toolId]) !== String(toolId)) continue;
    var isOpen = c.back < 0 || values[r][c.back] === "" || values[r][c.back] === null;
    if (isOpen) {
      if (c.back >= 0) sh.getRange(r + 1, c.back + 1).setValue(back);
      if (c.status >= 0) sh.getRange(r + 1, c.status + 1).setValue("Devuelta");
      return;
    }
  }
}

function saveCount_(p) {
  var sh = sheet_(SHEET_COUNTS);
  var headers = sh.getDataRange().getValues()[0];
  var spec = {
    id: ["ID_Conteo", "ID Conteo"],
    fecha: ["Fecha"],
    total: ["Total revisadas", "Total"],
    enSuLugar: ["En su lugar"],
    malUbicadas: ["Mal ubicadas"],
    faltantes: ["Faltantes"],
    detalle: ["Detalle"],
  };
  var c = colMap_(headers, spec);
  var row = new Array(headers.length).fill("");
  if (c.id >= 0) row[c.id] = "C-" + Date.now();
  if (c.fecha >= 0) row[c.fecha] = stamp_();
  if (c.total >= 0) row[c.total] = p.totalRevisadas || 0;
  if (c.enSuLugar >= 0) row[c.enSuLugar] = p.enSuLugar || 0;
  if (c.malUbicadas >= 0) row[c.malUbicadas] = p.malUbicadas || 0;
  if (c.faltantes >= 0) row[c.faltantes] = p.faltantes || 0;
  if (c.detalle >= 0) row[c.detalle] = p.detalle || "";
  sh.appendRow(row);
  return { ok: true };
}

/* ---------- endpoints ---------- */

function doGet(e) {
  try {
    var params = (e && e.parameter) || {};
    checkToken_(params.token);
    var action = params.action || "list";
    if (action === "ping") return json_({ ok: true, pong: true });
    if (action === "list") return json_({ ok: true, tools: readTools_() });
    throw new Error("Acción GET desconocida: " + action);
  } catch (err) {
    return json_({ ok: false, error: err.message });
  }
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000); // serializa escrituras concurrentes
    var body = JSON.parse((e && e.postData && e.postData.contents) || "{}");
    checkToken_(body.token);
    switch (body.action) {
      case "add": return json_(addTool_(body));
      case "delete": return json_(deleteTool_(body));
      case "lend": return json_(lendTool_(body));
      case "return": return json_(returnTool_(body));
      case "saveCount": return json_(saveCount_(body));
      default: throw new Error("Acción POST desconocida: " + body.action);
    }
  } catch (err) {
    return json_({ ok: false, error: err.message });
  } finally {
    try { lock.releaseLock(); } catch (e2) {}
  }
}
