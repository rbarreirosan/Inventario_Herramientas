/* =============================================================
   Render: construye el DOM de cada pantalla desde `state`.
   Los eventos se enganchan por delegación (data-act) en app.js.
   Se conserva fielmente la identidad visual del diseño (estilos
   inline con la misma paleta y medidas).
   ============================================================= */

const APP = document.getElementById("app");

/* ---------- helpers de fragmento ---------- */

function loanLineText(t) {
  return `${escapeHtml(t.holder)} · desde ${escapeHtml(t.since)}`;
}

// Tarjeta de una pieza individual dentro de la lista
function singleCardHtml(t) {
  const hasLoan = t.status === "Prestada";
  return `
    <button class="js" data-act="openModal" data-id="${t.id}" style="display:flex;gap:0;width:100%;text-align:left;padding:0;border:2px solid #16181A;border-radius:4px;background:#FFFFFF;overflow:hidden;cursor:pointer">
      <div style="${accentStyle(t.loc)}"></div>
      <div style="flex:1;min-width:0;padding:14px 14px 14px 12px">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px">
          <div style="min-width:0">
            <div style="font-size:19px;font-weight:700;line-height:1.15;letter-spacing:-0.01em">${escapeHtml(t.name)}</div>
            <div style="font-family:'IBM Plex Mono',monospace;font-size:13px;font-weight:600;color:#6B6E72;margin-top:4px">${escapeHtml(t.control)} · ${escapeHtml(t.loc)}</div>
          </div>
          <div style="${badgeStyle(t.status)}">${escapeHtml(t.status)}</div>
        </div>
        ${hasLoan ? `<div style="margin-top:10px;padding-top:10px;border-top:1px dashed #DCDAD6;font-size:15px;font-weight:600;color:#8A4B00">${loanLineText(t)}</div>` : ""}
      </div>
    </button>`;
}

// Tarjeta de grupo (piezas duplicadas) con resumen y expansión
function groupCardHtml(g) {
  const open = !!state.expanded[g.key];
  const summary = Object.keys(g.counts).map((k) => {
    const n = g.counts[k];
    const plural = { Disponible: "disponibles", Prestada: "prestadas", "En reparación": "en reparación" };
    const one = { Disponible: "disponible", Prestada: "prestada", "En reparación": "en reparación" };
    const label = `${n} ${n === 1 ? one[k] : plural[k]}`;
    const c = ST[k];
    return `<div style="padding:6px 10px;border:2px solid ${c.bd};border-radius:4px;background:${c.bg};color:${c.fg};font-size:13px;font-weight:800;text-transform:uppercase;letter-spacing:0.04em">${escapeHtml(label)}</div>`;
  }).join("");

  const pieces = g.pieces.map((p) => {
    const hasLoan = p.status === "Prestada";
    return `
      <button class="js" data-act="openModal" data-id="${p.id}" style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;width:100%;text-align:left;border:2px solid #C7C4BF;border-radius:4px;background:#FFFFFF;padding:12px;cursor:pointer">
        <div style="min-width:0">
          <div style="font-family:'IBM Plex Mono',monospace;font-size:16px;font-weight:600">${escapeHtml(p.control)}</div>
          ${hasLoan ? `<div style="font-size:14px;font-weight:600;color:#8A4B00;margin-top:4px">${loanLineText(p)}</div>` : ""}
        </div>
        <div style="${badgeStyle(p.status)}">${escapeHtml(p.status)}</div>
      </button>`;
  }).join("");

  const chev = open ? "▲" : "▼";
  const chevStyle = `flex:none;width:44px;height:44px;display:flex;align-items:center;justify-content:center;border:2px solid #16181A;border-radius:4px;background:${open ? "#16181A" : "#FFFFFF"};color:${open ? "#F4F3F1" : "#16181A"};font-size:14px;font-weight:800`;

  return `
    <div style="border:2px solid #16181A;border-radius:4px;background:#FFFFFF;overflow:hidden">
      <button class="js" data-act="toggleGroup" data-key="${escapeHtml(g.key)}" style="display:flex;gap:0;width:100%;text-align:left;padding:0;border:none;background:#FFFFFF;cursor:pointer">
        <div style="${accentStyle(g.first.loc)}"></div>
        <div style="flex:1;min-width:0;padding:14px 14px 14px 12px">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px">
            <div style="min-width:0">
              <div style="font-size:19px;font-weight:700;line-height:1.15;letter-spacing:-0.01em">${escapeHtml(g.name)}</div>
              <div style="font-family:'IBM Plex Mono',monospace;font-size:13px;font-weight:600;color:#6B6E72;margin-top:4px">${g.pieces.length} piezas · ${escapeHtml(g.first.control)} … ${escapeHtml(g.last.control)}</div>
            </div>
            <div style="${chevStyle}">${chev}</div>
          </div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:10px">${summary}</div>
        </div>
      </button>
      ${open ? `<div style="border-top:2px solid #16181A;background:#EDEBE7;padding:10px;display:flex;flex-direction:column;gap:8px">${pieces}</div>` : ""}
    </div>`;
}

function groupsHtml() {
  const groups = computeGroups();
  if (!groups.length) {
    return `<div style="padding:28px 16px;border:2px dashed #C7C4BF;border-radius:4px;text-align:center;font-size:17px;font-weight:600;color:#6B6E72">Sin resultados con estos filtros.</div>`;
  }
  return groups.map((g) => {
    const items = g.items.map((it) => it.type === "single" ? singleCardHtml(it.tool) : groupCardHtml(it)).join(`<div style="height:10px"></div>`);
    return `
      <div style="display:flex;flex-direction:column;gap:10px">
        <div style="display:flex;align-items:center;gap:10px">
          <div style="font-size:13px;font-weight:800;text-transform:uppercase;letter-spacing:0.08em;color:#4A4D51">${escapeHtml(g.title)}</div>
          <div style="height:2px;flex:1;background:#DCDAD6"></div>
          <div style="font-family:'IBM Plex Mono',monospace;font-size:13px;font-weight:600;color:#8C8F93">${g.count}</div>
        </div>
        ${items}
      </div>`;
  }).join(`<div style="height:22px"></div>`);
}

/* ---------- pantalla: LISTA ---------- */

function listHtml() {
  const searching = isSearching();
  const estadoChips = ["Todos", "Disponible", "Prestada", "En reparación"]
    .map((s) => `<button class="js" data-act="setStatus" data-val="${escapeHtml(s)}" style="${chipStyle(state.status === s)}">${escapeHtml(s)}</button>`)
    .join("");
  const catChips = ["Todas"].concat(CATS)
    .map((c) => `<button class="js" data-act="setCat" data-val="${escapeHtml(c)}" style="${chipStyle(state.cat === c)}">${escapeHtml(c)}</button>`)
    .join("");

  return `
    <div>
      <div style="position:sticky;top:0;z-index:20;background:#16181A;padding:14px 16px 0">
        <div style="display:flex;justify-content:space-between;align-items:baseline;gap:12px;margin-bottom:12px">
          <div style="color:#F4F3F1;font-size:19px;font-weight:800;letter-spacing:-0.01em;text-transform:uppercase">Inventario de Herramientas</div>
          <div style="font-family:'IBM Plex Mono',monospace;font-size:12px;font-weight:500;color:#8C8F93">${state.tools.length} registros</div>
        </div>
        <input id="search" class="js" data-field="query" type="text" value="${escapeHtml(state.query)}" placeholder="Buscar en Fosa y Arriba…" style="width:100%;height:54px;border:2px solid #2C2F33;border-radius:4px;background:#0E0F10;color:#F4F3F1;font-size:18px;font-weight:600;padding:0 14px;margin-bottom:12px">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
          <button id="tab-fosa" class="js" data-act="pickLoc" data-val="Fosa" style="${tabStyle("Fosa", state.loc === "Fosa" && !searching)}">Fosa</button>
          <button id="tab-arriba" class="js" data-act="pickLoc" data-val="Arriba" style="${tabStyle("Arriba", state.loc === "Arriba" && !searching)}">Arriba</button>
        </div>
      </div>

      <div style="padding:14px 16px 0;display:flex;flex-direction:column;gap:8px">
        <div class="scroll-x" style="display:flex;gap:8px;overflow-x:auto;padding-bottom:2px">${estadoChips}</div>
        <div class="scroll-x" style="display:flex;gap:8px;overflow-x:auto;padding-bottom:2px">${catChips}</div>
      </div>

      <div style="padding:16px 16px 80px;display:flex;flex-direction:column;gap:22px">
        <div id="list-groups">${groupsHtml()}</div>
      </div>

      <div style="position:fixed;bottom:86px;left:0;right:0;display:flex;justify-content:center;pointer-events:none;z-index:38">
        <div style="width:100%;max-width:520px;padding:0 16px;display:flex;justify-content:flex-end;pointer-events:auto">
          <button class="js" data-act="openAdd" style="height:62px;padding:0 22px;border:3px solid #16181A;border-radius:4px;background:#F4C518;color:#16181A;font-size:18px;font-weight:800;text-transform:uppercase;letter-spacing:0.04em;cursor:pointer;box-shadow:0 4px 0 0 #16181A">+ Agregar herramienta</button>
        </div>
      </div>
    </div>`;
}

/* ---------- pantalla: DETALLE ---------- */

function detailHtml() {
  const d = toolById(state.detailId);
  if (!d) return "";
  const loan = d.status === "Prestada";
  const showCal = isMedicion(d.cat);
  const due = isCalDue(d.calNext);

  const actLabel = d.status === "Disponible" ? "Prestar herramienta" : loan ? "Registrar devolución" : "En reparación";
  const actBg = d.status === "Disponible" ? "#16181A" : loan ? "#1B7A3D" : "#DCDAD6";
  const actFg = d.status === "En reparación" ? "#6B6E72" : "#FFFFFF";
  const actDisabled = d.status === "En reparación";

  const history = d.history.length
    ? d.history.map((h) => {
        const line = h.back ? `Salió ${escapeHtml(h.out)} · Devolvió ${escapeHtml(h.back)}` : `Salió ${escapeHtml(h.out)} · sin devolver`;
        const dot = `flex:none;width:14px;height:14px;margin-top:6px;border-radius:2px;background:${h.back ? "#1B7A3D" : "#B45309"}`;
        return `
          <div style="display:flex;gap:12px;align-items:flex-start;padding-bottom:10px;border-bottom:1px solid #ECEAE6">
            <div style="${dot}"></div>
            <div style="min-width:0">
              <div style="font-size:17px;font-weight:700">${escapeHtml(h.who)}</div>
              <div style="font-family:'IBM Plex Mono',monospace;font-size:13px;font-weight:500;color:#6B6E72;margin-top:3px">${line}</div>
            </div>
          </div>`;
      }).join("")
    : `<div style="font-size:16px;font-weight:600;color:#6B6E72">Sin movimientos registrados.</div>`;

  const calBox = `border:2px solid ${due ? "#B45309" : "#DCDAD6"};border-radius:4px;padding:10px 12px;background:${due ? "#FFF7EC" : "#FFFFFF"}`;

  return `
    <div>
      <div style="position:sticky;top:0;z-index:20;background:#16181A;padding:12px 16px">
        <button class="js" data-act="back" style="height:48px;padding:0 16px;border:2px solid #3A3D41;border-radius:4px;background:#0E0F10;color:#F4F3F1;font-size:16px;font-weight:700;cursor:pointer">← Volver</button>
      </div>
      <div style="padding:16px;display:flex;flex-direction:column;gap:16px">
        <div style="border:2px solid #16181A;border-radius:4px;background:#FFFFFF;display:flex;overflow:hidden">
          <div style="${accentStyle(d.loc, 10)}"></div>
          <div style="padding:16px;flex:1;min-width:0">
            <div style="${badgeStyle(d.status)}">${escapeHtml(d.status)}</div>
            <div style="font-size:28px;font-weight:800;line-height:1.1;letter-spacing:-0.02em;margin-top:10px">${escapeHtml(d.name)}</div>
            <div style="font-size:17px;font-weight:600;color:#4A4D51;margin-top:6px">${escapeHtml(d.brand || "—")}</div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:1px;background:#DCDAD6;margin-top:16px;border:1px solid #DCDAD6">
              <div style="background:#FFFFFF;padding:10px 12px">
                <div style="font-size:11px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;color:#8C8F93">N.º de control</div>
                <div style="font-family:'IBM Plex Mono',monospace;font-size:17px;font-weight:600;margin-top:2px">${escapeHtml(d.control)}</div>
              </div>
              <div style="background:#FFFFFF;padding:10px 12px">
                <div style="font-size:11px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;color:#8C8F93">Ubicación asignada</div>
                <div style="font-size:16px;font-weight:800;margin-top:2px;color:${ACC[d.loc]}">${escapeHtml(d.loc)}</div>
              </div>
              <div style="background:#FFFFFF;padding:10px 12px;grid-column:span 2">
                <div style="font-size:11px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;color:#8C8F93">Categoría</div>
                <div style="font-size:16px;font-weight:700;margin-top:2px">${escapeHtml(d.cat)}</div>
              </div>
            </div>
            ${loan ? `<div style="margin-top:14px;padding:12px;border:2px solid #B45309;border-radius:4px;background:#FFF5E8;font-size:16px;font-weight:700;color:#8A4B00">Prestada a ${escapeHtml(d.holder)} · desde ${escapeHtml(d.since)}</div>` : ""}
            <button class="js" ${actDisabled ? "disabled" : ""} data-act="detailAction" data-id="${d.id}" style="width:100%;margin-top:14px;height:64px;border-radius:4px;font-size:18px;font-weight:800;text-transform:uppercase;letter-spacing:0.03em;cursor:${actDisabled ? "default" : "pointer"};border:2px solid #16181A;background:${actBg};color:${actFg}">${actLabel}</button>
          </div>
        </div>

        ${showCal ? `
        <div style="border:2px solid #16181A;border-radius:4px;background:#FFFFFF;padding:16px">
          <div style="font-size:13px;font-weight:800;text-transform:uppercase;letter-spacing:0.08em;color:#4A4D51;margin-bottom:12px">Calibración</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
            <div style="border:2px solid #DCDAD6;border-radius:4px;padding:10px 12px">
              <div style="font-size:11px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;color:#8C8F93">Última</div>
              <div style="font-family:'IBM Plex Mono',monospace;font-size:17px;font-weight:600;margin-top:4px">${escapeHtml(d.calLast || "—")}</div>
            </div>
            <div style="${calBox}">
              <div style="font-size:11px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;color:#8C8F93">Próxima</div>
              <div style="font-family:'IBM Plex Mono',monospace;font-size:17px;font-weight:600;margin-top:4px">${escapeHtml(d.calNext || "—")}</div>
            </div>
          </div>
        </div>` : ""}

        <div style="border:2px solid #16181A;border-radius:4px;background:#FFFFFF;padding:16px">
          <div style="font-size:13px;font-weight:800;text-transform:uppercase;letter-spacing:0.08em;color:#4A4D51;margin-bottom:12px">Historial de préstamos</div>
          <div style="display:flex;flex-direction:column;gap:10px">${history}</div>
        </div>

        <button class="js" data-act="askDelete" data-id="${d.id}" style="height:62px;border:2px solid #B3261E;border-radius:4px;background:#FFFFFF;color:#8E1B15;font-size:17px;font-weight:800;text-transform:uppercase;letter-spacing:0.04em;cursor:pointer">Eliminar herramienta</button>
      </div>
    </div>`;
}

/* ---------- pantalla: CONTEO ---------- */

function countHtml() {
  const vals = Object.values(state.marks);
  const progress = `${vals.length} de ${state.tools.length} herramientas revisadas`;

  if (state.countDone) {
    const missing = state.tools.filter((t) => state.marks[t.id] === "missing");
    const mis = state.tools.filter((t) => state.marks[t.id] === "mis");
    const nPresent = vals.filter((v) => v === "present").length;

    const missingHtml = missing.length
      ? missing.map((t) => `<div style="background:#FFFFFF;border:1px solid #E3B4B0;border-radius:4px;padding:10px 12px"><div style="font-size:17px;font-weight:700">${escapeHtml(t.name)}</div><div style="font-family:'IBM Plex Mono',monospace;font-size:13px;font-weight:500;color:#6B6E72;margin-top:3px">${escapeHtml(t.control)} · debía estar en ${escapeHtml(t.loc)}</div></div>`).join("")
      : `<div style="font-size:16px;font-weight:600;color:#4A4D51">Ninguna. Todo el inventario aparece.</div>`;

    const misHtml = mis.length
      ? mis.map((t) => `<div style="background:#FFFFFF;border:1px solid #E3C79A;border-radius:4px;padding:10px 12px"><div style="font-size:17px;font-weight:700">${escapeHtml(t.name)}</div><div style="font-family:'IBM Plex Mono',monospace;font-size:13px;font-weight:500;color:#6B6E72;margin-top:3px">${escapeHtml(t.control)} · asignada a ${escapeHtml(t.loc)} · encontrada en otra ubicación</div></div>`).join("")
      : `<div style="font-size:16px;font-weight:600;color:#4A4D51">Ninguna fuera de su ubicación.</div>`;

    return `
      <div>
        <div style="position:sticky;top:0;z-index:20;background:#16181A;padding:14px 16px">
          <div style="color:#F4F3F1;font-size:19px;font-weight:800;text-transform:uppercase;letter-spacing:-0.01em">Conteo físico</div>
          <div style="font-family:'IBM Plex Mono',monospace;font-size:13px;font-weight:500;color:#8C8F93;margin-top:6px">${progress}</div>
        </div>
        <div style="padding:16px 16px 96px;display:flex;flex-direction:column;gap:14px">
          <div style="border:2px solid #16181A;border-radius:4px;background:#FFFFFF;padding:16px">
            <div style="font-size:22px;font-weight:800;letter-spacing:-0.01em">Resumen del conteo</div>
            <div style="font-family:'IBM Plex Mono',monospace;font-size:13px;font-weight:500;color:#6B6E72;margin-top:6px">${escapeHtml(state.summaryStamp)}</div>
            <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-top:14px">
              <div style="border:2px solid #1B7A3D;border-radius:4px;padding:10px;text-align:center"><div style="font-size:26px;font-weight:800;color:#1B7A3D">${nPresent}</div><div style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:0.06em;color:#4A4D51">En su lugar</div></div>
              <div style="border:2px solid #B45309;border-radius:4px;padding:10px;text-align:center"><div style="font-size:26px;font-weight:800;color:#B45309">${mis.length}</div><div style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:0.06em;color:#4A4D51">Mal ubicadas</div></div>
              <div style="border:2px solid #B3261E;border-radius:4px;padding:10px;text-align:center"><div style="font-size:26px;font-weight:800;color:#B3261E">${missing.length}</div><div style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:0.06em;color:#4A4D51">Faltantes</div></div>
            </div>
          </div>
          <div style="border:2px solid #B3261E;border-radius:4px;background:#FFF3F2;padding:16px">
            <div style="font-size:13px;font-weight:800;text-transform:uppercase;letter-spacing:0.08em;color:#8E1B15;margin-bottom:10px">Faltantes</div>
            <div style="display:flex;flex-direction:column;gap:8px">${missingHtml}</div>
          </div>
          <div style="border:2px solid #B45309;border-radius:4px;background:#FFF7EC;padding:16px">
            <div style="font-size:13px;font-weight:800;text-transform:uppercase;letter-spacing:0.08em;color:#8A4B00;margin-bottom:10px">Mal ubicadas</div>
            <div style="display:flex;flex-direction:column;gap:8px">${misHtml}</div>
          </div>
          <button class="js" data-act="resetCount" style="height:60px;border:2px solid #16181A;border-radius:4px;background:#16181A;color:#F4F3F1;font-size:18px;font-weight:800;text-transform:uppercase;letter-spacing:0.04em;cursor:pointer">Nuevo conteo</button>
        </div>
      </div>`;
  }

  // Conteo abierto: checklist por ubicación -> categoría -> pieza
  const sections = LOCS.map((loc) => {
    const groups = CATS.map((cat) => {
      const list = state.tools.filter((t) => t.loc === loc && t.cat === cat);
      if (!list.length) return "";
      const tools = list.map((t) => {
        const mk = state.marks[t.id];
        const label = mk === "present" ? "Verificada" : mk === "missing" ? "Faltante" : mk === "mis" ? "Otra ubicación" : "Sin marcar";
        const col = mk === "present" ? "#1B7A3D" : mk === "missing" ? "#B3261E" : mk === "mis" ? "#B45309" : "#8C8F93";
        const box = `border:2px solid ${mk ? col : "#16181A"};border-left:8px solid ${col};border-radius:4px;background:#FFFFFF;padding:14px`;
        return `
          <div style="${box}">
            <div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start">
              <div style="min-width:0">
                <div style="font-size:18px;font-weight:700;line-height:1.15">${escapeHtml(t.name)}</div>
                <div style="font-family:'IBM Plex Mono',monospace;font-size:13px;font-weight:600;color:#6B6E72;margin-top:3px">${escapeHtml(t.control)}</div>
              </div>
              <div style="flex:none;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:0.05em;color:${col}">${label}</div>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-top:12px">
              <button class="js" data-act="mark" data-id="${t.id}" data-val="present" style="${markBtnStyle(mk === "present", "#1B7A3D")}">Está</button>
              <button class="js" data-act="mark" data-id="${t.id}" data-val="missing" style="${markBtnStyle(mk === "missing", "#B3261E")}">Falta</button>
              <button class="js" data-act="mark" data-id="${t.id}" data-val="mis" style="${markBtnStyle(mk === "mis", "#B45309")}">Otra ubic.</button>
            </div>
          </div>`;
      }).join(`<div style="height:10px"></div>`);
      return `
        <div style="display:flex;flex-direction:column;gap:10px">
          <div style="font-size:13px;font-weight:800;text-transform:uppercase;letter-spacing:0.08em;color:#4A4D51">${escapeHtml(cat)}</div>
          ${tools}
        </div>`;
    }).filter(Boolean).join(`<div style="height:16px"></div>`);

    return `
      <div style="display:flex;flex-direction:column;gap:16px">
        <div style="padding:12px 14px;border-radius:4px;background:${ACC[loc]};color:#FFFFFF;font-size:22px;font-weight:800;text-transform:uppercase;letter-spacing:0.08em">${loc}</div>
        ${groups}
      </div>`;
  }).join(`<div style="height:24px"></div>`);

  return `
    <div>
      <div style="position:sticky;top:0;z-index:20;background:#16181A;padding:14px 16px">
        <div style="color:#F4F3F1;font-size:19px;font-weight:800;text-transform:uppercase;letter-spacing:-0.01em">Conteo físico</div>
        <div style="font-family:'IBM Plex Mono',monospace;font-size:13px;font-weight:500;color:#8C8F93;margin-top:6px">${progress}</div>
      </div>
      <div style="padding:16px 16px 96px;display:flex;flex-direction:column;gap:24px">
        ${sections}
        <button class="js" data-act="finishCount" style="height:64px;border:2px solid #16181A;border-radius:4px;background:#16181A;color:#F4F3F1;font-size:18px;font-weight:800;text-transform:uppercase;letter-spacing:0.04em;cursor:pointer">Finalizar y generar resumen</button>
      </div>
    </div>`;
}

/* ---------- nav inferior ---------- */

function navHtml() {
  const onCount = state.screen === "count";
  return `
    <div style="position:fixed;bottom:0;left:0;right:0;display:flex;justify-content:center;pointer-events:none;z-index:40">
      <div style="width:100%;max-width:520px;background:#16181A;padding:10px;display:grid;grid-template-columns:1fr 1fr;gap:8px;pointer-events:auto">
        <button class="js" data-act="goList" style="${navStyle(!onCount)}">Herramientas</button>
        <button class="js" data-act="goCount" style="${navStyle(onCount)}">Conteo</button>
      </div>
    </div>`;
}

/* ---------- modales ---------- */

function modalsHtml() {
  let html = "";

  // Modal préstamo / devolución / reparación
  const m = toolById(state.modalId);
  if (m) {
    const canLend = m.status === "Disponible";
    const canReturn = m.status === "Prestada";
    const isRepair = m.status === "En reparación";
    const people = PEOPLE.map((p) => `<button class="js" data-act="pickPerson" data-val="${escapeHtml(p)}" style="height:46px;padding:0 14px;border:2px solid #C7C4BF;border-radius:4px;background:#FFFFFF;font-size:16px;font-weight:700;cursor:pointer">${escapeHtml(p)}</button>`).join("");
    const canSend = state.borrower.trim().length > 0;

    html += `
      <div class="js" data-act="closeModalBg" style="position:fixed;inset:0;z-index:60;background:rgba(10,11,12,0.62);display:flex;align-items:flex-end;justify-content:center">
        <div data-stop="1" style="width:100%;max-width:520px;background:#F4F3F1;border-top:3px solid #16181A;padding:18px 16px 22px">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px">
            <div style="min-width:0">
              <div style="font-size:22px;font-weight:800;line-height:1.15;letter-spacing:-0.01em">${escapeHtml(m.name)}</div>
              <div style="font-family:'IBM Plex Mono',monospace;font-size:13px;font-weight:600;color:#6B6E72;margin-top:4px">${escapeHtml(m.control)} · ${escapeHtml(m.loc)} · ${escapeHtml(m.cat)}</div>
            </div>
            <button class="js" data-act="closeModal" style="width:48px;height:48px;flex:none;border:2px solid #16181A;border-radius:4px;background:#FFFFFF;font-size:20px;font-weight:800;cursor:pointer">✕</button>
          </div>

          ${canLend ? `
          <div style="margin-top:16px">
            <div style="font-size:13px;font-weight:800;text-transform:uppercase;letter-spacing:0.08em;color:#4A4D51;margin-bottom:8px">¿Quién la solicita?</div>
            <input id="borrower" class="js" data-field="borrower" type="text" value="${escapeHtml(state.borrower)}" placeholder="Nombre del técnico" style="width:100%;height:58px;border:2px solid #16181A;border-radius:4px;background:#FFFFFF;font-size:19px;font-weight:600;padding:0 14px">
            <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px">${people}</div>
            <button class="js" ${canSend ? "" : "disabled"} data-act="doLend" data-id="${m.id}" style="width:100%;height:64px;margin-top:14px;border-radius:4px;font-size:19px;font-weight:800;text-transform:uppercase;letter-spacing:0.03em;cursor:${canSend ? "pointer" : "default"};border:2px solid #16181A;background:${canSend ? "#16181A" : "#C7C4BF"};color:${canSend ? "#F4F3F1" : "#7A7D81"}">Prestar</button>
          </div>` : ""}

          ${canReturn ? `
          <div style="margin-top:16px">
            <div style="border:2px solid #B45309;border-radius:4px;background:#FFF5E8;padding:14px">
              <div style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:0.08em;color:#8A4B00">Prestada a</div>
              <div style="font-size:22px;font-weight:800;margin-top:4px">${escapeHtml(m.holder || "")}</div>
              <div style="font-family:'IBM Plex Mono',monospace;font-size:14px;font-weight:500;color:#6B6E72;margin-top:6px">${m.since ? "Desde " + escapeHtml(m.since) : ""}</div>
            </div>
            <div style="font-size:15px;font-weight:600;color:#4A4D51;margin-top:12px">Al devolverla debe regresar a su ubicación asignada: <b>${escapeHtml(m.loc)}</b>.</div>
            <button class="js" data-act="doReturn" data-id="${m.id}" style="width:100%;height:64px;margin-top:14px;border:2px solid #16181A;border-radius:4px;background:#1B7A3D;color:#FFFFFF;font-size:19px;font-weight:800;text-transform:uppercase;letter-spacing:0.04em;cursor:pointer">Registrar devolución</button>
          </div>` : ""}

          ${isRepair ? `<div style="margin-top:16px;border:2px solid #B3261E;border-radius:4px;background:#FFF3F2;padding:14px;font-size:17px;font-weight:700;color:#8E1B15">En reparación — no disponible para préstamo.</div>` : ""}

          <button class="js" data-act="openDetail" data-id="${m.id}" style="width:100%;height:56px;margin-top:10px;border:2px solid #16181A;border-radius:4px;background:#FFFFFF;font-size:17px;font-weight:700;cursor:pointer">Ver detalle e historial</button>
        </div>
      </div>`;
  }

  // Modal agregar herramienta
  if (state.addOpen) {
    const f = state.form;
    const locOpts = LOCS.map((l) => `<button class="js" data-act="formLoc" data-val="${escapeHtml(l)}" style="height:60px;border-radius:4px;border:3px solid ${f.loc === l ? ACC[l] : "#C7C4BF"};background:${f.loc === l ? ACC[l] : "#FFFFFF"};color:${f.loc === l ? "#FFFFFF" : "#3A3D41"};font-size:19px;font-weight:800;text-transform:uppercase;letter-spacing:0.06em;cursor:pointer">${escapeHtml(l)}</button>`).join("");
    const catOpts = CATS.map((c) => `<button class="js" data-act="formCat" data-val="${escapeHtml(c)}" style="height:56px;padding:0 14px;text-align:left;border-radius:4px;border:2px solid ${f.cat === c ? "#16181A" : "#C7C4BF"};background:${f.cat === c ? "#16181A" : "#FFFFFF"};color:${f.cat === c ? "#F4F3F1" : "#3A3D41"};font-size:16px;font-weight:700;cursor:pointer">${escapeHtml(c)}</button>`).join("");
    const controlHint = "060-A";
    const ctrlDup = stripPrefix(f.control).trim().length > 0 && controlExists(f.control);
    const canSave = f.name.trim() && stripPrefix(f.control).trim().length > 0 && !ctrlDup;

    html += `
      <div class="js" data-act="closeAddBg" style="position:fixed;inset:0;z-index:65;background:rgba(10,11,12,0.62);display:flex;align-items:flex-end;justify-content:center">
        <div data-stop="1" style="width:100%;max-width:520px;max-height:92vh;overflow-y:auto;background:#F4F3F1;border-top:3px solid #16181A;padding:18px 16px 22px">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px">
            <div style="font-size:22px;font-weight:800;letter-spacing:-0.01em">Agregar herramienta</div>
            <button class="js" data-act="closeAdd" style="width:48px;height:48px;flex:none;border:2px solid #16181A;border-radius:4px;background:#FFFFFF;font-size:20px;font-weight:800;cursor:pointer">✕</button>
          </div>
          <div style="display:flex;flex-direction:column;gap:16px;margin-top:16px">
            <div>
              <div style="font-size:13px;font-weight:800;text-transform:uppercase;letter-spacing:0.08em;color:#4A4D51;margin-bottom:8px">Nombre</div>
              <input id="f_name" class="js" data-field="form.name" type="text" value="${escapeHtml(f.name)}" placeholder='Ej. Dado 8mm hex 3/8&quot;' style="width:100%;height:58px;border:2px solid #16181A;border-radius:4px;background:#FFFFFF;font-size:19px;font-weight:600;padding:0 14px">
            </div>
            <div>
              <div style="font-size:13px;font-weight:800;text-transform:uppercase;letter-spacing:0.08em;color:#4A4D51;margin-bottom:8px">Marca / modelo</div>
              <input id="f_brand" class="js" data-field="form.brand" type="text" value="${escapeHtml(f.brand)}" placeholder="Ej. Urrea 6300" style="width:100%;height:58px;border:2px solid #16181A;border-radius:4px;background:#FFFFFF;font-size:19px;font-weight:600;padding:0 14px">
            </div>
            <div>
              <div style="font-size:13px;font-weight:800;text-transform:uppercase;letter-spacing:0.08em;color:#4A4D51;margin-bottom:8px">Ubicación</div>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">${locOpts}</div>
            </div>
            <div>
              <div style="font-size:13px;font-weight:800;text-transform:uppercase;letter-spacing:0.08em;color:#4A4D51;margin-bottom:8px">Categoría</div>
              <div style="display:flex;flex-direction:column;gap:8px">${catOpts}</div>
            </div>
            <div>
              <div style="font-size:13px;font-weight:800;text-transform:uppercase;letter-spacing:0.08em;color:#4A4D51;margin-bottom:8px">Número de control</div>
              <input id="f_control" class="js" data-field="form.control" type="text" value="${escapeHtml(f.control)}" placeholder="${controlHint}" style="width:100%;height:58px;border:2px solid ${ctrlDup ? "#B3261E" : "#16181A"};border-radius:4px;background:${ctrlDup ? "#FFF3F2" : "#FFFFFF"};color:${ctrlDup ? "#8E1B15" : "#16181A"};font-family:'IBM Plex Mono',monospace;font-size:19px;font-weight:600;padding:0 14px">
              ${ctrlDup ? `<div style="margin-top:8px;font-size:14px;font-weight:700;color:#8E1B15">Ya existe una herramienta con el número de control <b>${escapeHtml(f.control.trim())}</b>. Cambia el número o el sufijo (A/B/C).</div>` : ""}
            </div>
            ${isMedicion(f.cat) ? `
            <div style="border:2px solid #B45309;border-radius:4px;background:#FFF7EC;padding:14px">
              <div style="font-size:13px;font-weight:800;text-transform:uppercase;letter-spacing:0.08em;color:#8A4B00;margin-bottom:10px">Calibración (equipo de medición)</div>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
                <input id="f_calLast" class="js" data-field="form.calLast" type="text" value="${escapeHtml(f.calLast)}" placeholder="Última" style="width:100%;height:54px;border:2px solid #16181A;border-radius:4px;background:#FFFFFF;font-family:'IBM Plex Mono',monospace;font-size:17px;font-weight:600;padding:0 12px">
                <input id="f_calNext" class="js" data-field="form.calNext" type="text" value="${escapeHtml(f.calNext)}" placeholder="Próxima" style="width:100%;height:54px;border:2px solid #16181A;border-radius:4px;background:#FFFFFF;font-family:'IBM Plex Mono',monospace;font-size:17px;font-weight:600;padding:0 12px">
              </div>
            </div>` : ""}
            <button class="js" ${canSave ? "" : "disabled"} data-act="saveNew" style="width:100%;height:66px;border-radius:4px;font-size:19px;font-weight:800;text-transform:uppercase;letter-spacing:0.03em;cursor:${canSave ? "pointer" : "default"};border:2px solid #16181A;background:${canSave ? "#16181A" : "#C7C4BF"};color:${canSave ? "#F4F3F1" : "#7A7D81"}">Guardar</button>
          </div>
        </div>
      </div>`;
  }

  // Confirmación de eliminación
  if (state.confirmId) {
    const t = toolById(state.confirmId);
    if (t) {
      html += `
        <div style="position:fixed;inset:0;z-index:70;background:rgba(10,11,12,0.7);display:flex;align-items:center;justify-content:center;padding:16px">
          <div style="width:100%;max-width:420px;background:#F4F3F1;border:3px solid #B3261E;border-radius:4px;padding:20px">
            <div style="font-size:22px;font-weight:800;line-height:1.2;letter-spacing:-0.01em">¿Seguro que quieres eliminar esta herramienta?</div>
            <div style="font-size:16px;font-weight:600;color:#4A4D51;margin-top:8px">Esta acción no se puede deshacer.</div>
            <div style="margin-top:14px;border:2px solid #DCDAD6;border-radius:4px;background:#FFFFFF;padding:12px">
              <div style="font-size:18px;font-weight:700">${escapeHtml(t.name)}</div>
              <div style="font-family:'IBM Plex Mono',monospace;font-size:13px;font-weight:600;color:#6B6E72;margin-top:4px">${escapeHtml(t.control)} · ${escapeHtml(t.loc)} · ${escapeHtml(t.cat)}</div>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:16px">
              <button class="js" data-act="cancelDelete" style="height:60px;border:2px solid #16181A;border-radius:4px;background:#FFFFFF;font-size:16px;font-weight:800;text-transform:uppercase;letter-spacing:0.03em;cursor:pointer">Cancelar</button>
              <button class="js" data-act="doDelete" data-id="${t.id}" style="height:60px;border:2px solid #B3261E;border-radius:4px;background:#B3261E;color:#FFFFFF;font-size:16px;font-weight:800;text-transform:uppercase;letter-spacing:0.03em;cursor:pointer">Eliminar</button>
            </div>
          </div>
        </div>`;
    }
  }

  return html;
}

/* ---------- overlays de estado ---------- */

function overlaysHtml() {
  let html = "";
  if (DEMO_MODE) {
    html += `<div style="position:fixed;top:0;left:0;right:0;z-index:80;display:flex;justify-content:center;pointer-events:none"><div style="max-width:520px;width:100%;background:#F4C518;color:#16181A;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:0.04em;text-align:center;padding:4px 8px;border-bottom:2px solid #16181A">Modo demo — configura Apps Script para datos reales</div></div>`;
  }
  if (state.banner) {
    html += `<div class="js" data-act="clearBanner" style="position:fixed;top:0;left:0;right:0;z-index:90;display:flex;justify-content:center"><div style="max-width:520px;width:100%;background:#B3261E;color:#FFFFFF;font-size:14px;font-weight:700;text-align:center;padding:10px 12px;cursor:pointer">${escapeHtml(state.banner)} (toca para cerrar)</div></div>`;
  }
  if (state.busy) {
    html += `<div style="position:fixed;inset:0;z-index:100;background:rgba(10,11,12,0.35);display:flex;align-items:center;justify-content:center"><div class="spinner"></div></div>`;
  }
  return html;
}

/* ---------- render principal ---------- */

function renderApp() {
  // preservar foco/caret de inputs entre renders
  const active = document.activeElement;
  const focusId = active && active.id ? active.id : null;
  const selStart = focusId ? active.selectionStart : null;
  const selEnd = focusId ? active.selectionEnd : null;

  let shell = "";
  if (!state.loaded && !state.loadError) {
    shell = `<div style="min-height:100vh;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:14px;color:#6B6E72"><div class="spinner"></div><div style="font-size:16px;font-weight:600">Cargando inventario…</div></div>`;
  } else if (state.loadError) {
    shell = `<div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px"><div style="max-width:420px;text-align:center"><div style="font-size:20px;font-weight:800;color:#8E1B15">No se pudo cargar el inventario</div><div style="font-size:15px;font-weight:600;color:#4A4D51;margin-top:8px">${escapeHtml(state.loadError)}</div><button class="js" data-act="reload" style="margin-top:16px;height:56px;padding:0 20px;border:2px solid #16181A;border-radius:4px;background:#16181A;color:#F4F3F1;font-size:16px;font-weight:800;text-transform:uppercase;cursor:pointer">Reintentar</button></div></div>`;
  } else if (state.screen === "detail") {
    shell = detailHtml();
  } else if (state.screen === "count") {
    shell = countHtml();
  } else {
    shell = listHtml();
  }

  const showNav = state.loaded && !state.loadError && state.screen !== "detail";

  APP.innerHTML =
    `<div style="width:100%;max-width:520px;margin:0 auto;min-height:100vh;background:#F4F3F1;position:relative;padding-bottom:96px;box-shadow:0 0 0 1px rgba(0,0,0,0.08)">${shell}</div>` +
    (showNav ? navHtml() : "") +
    modalsHtml() +
    overlaysHtml();

  if (focusId) {
    const el = document.getElementById(focusId);
    if (el) {
      el.focus();
      try { if (selStart != null) el.setSelectionRange(selStart, selEnd); } catch (e) { /* algunos tipos no soportan selección */ }
    }
  }
}

// Actualización ligera solo de la lista (para escribir en el buscador sin perder foco)
function refreshListResults() {
  const box = document.getElementById("list-groups");
  if (box) box.innerHTML = groupsHtml();
  const tf = document.getElementById("tab-fosa");
  const ta = document.getElementById("tab-arriba");
  const searching = isSearching();
  if (tf) tf.setAttribute("style", tabStyle("Fosa", state.loc === "Fosa" && !searching));
  if (ta) ta.setAttribute("style", tabStyle("Arriba", state.loc === "Arriba" && !searching));
}
