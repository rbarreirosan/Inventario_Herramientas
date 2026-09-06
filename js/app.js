/* =============================================================
   App: init, orquestación de acciones y delegación de eventos.
   ============================================================= */

function setBusy(v) { state.busy = v; renderApp(); }
function fail(e) { state.banner = (e && e.message) || "Ocurrió un error"; }

// Ejecuta una acción de red mostrando spinner y capturando errores.
async function run(fn) {
  state.busy = true; state.banner = ""; renderApp();
  try {
    await fn();
  } catch (e) {
    fail(e);
  } finally {
    state.busy = false;
    renderApp();
  }
}

/* ---------- carga inicial ---------- */

async function init() {
  if (DEMO_MODE) {
    state.tools = DEMO_SEED.map((t) => ({ ...t, history: t.history.map((h) => ({ ...h })) }));
    state.loaded = true;
    renderApp();
    return;
  }
  try {
    const data = await API.list();
    state.tools = (data.tools || []).map((t) => ({ ...t, history: t.history || [] }));
    state.loaded = true;
  } catch (e) {
    state.loadError = e.message || "Error de red";
  }
  renderApp();
}

/* ---------- acciones de datos (demo o real) ---------- */

async function actLend(id, borrower) {
  const name = borrower.trim();
  if (!name) return;
  await run(async () => {
    let since;
    if (DEMO_MODE) {
      since = stampNow();
    } else {
      const r = await API.lend(id, name);
      since = r.since || stampNow();
    }
    const t = toolById(id);
    if (t) {
      t.status = "Prestada";
      t.holder = name;
      t.since = since;
      t.history = [{ who: name, out: since, back: null }, ...(t.history || [])];
    }
    state.modalId = null;
    state.borrower = "";
  });
}

async function actReturn(id) {
  await run(async () => {
    let back;
    if (DEMO_MODE) {
      back = stampNow();
    } else {
      const r = await API.giveBack(id);
      back = r.back || stampNow();
    }
    const t = toolById(id);
    if (t) {
      t.status = "Disponible";
      t.holder = "";
      t.since = "";
      const h = (t.history || []).slice();
      if (h[0] && !h[0].back) h[0] = { ...h[0], back };
      t.history = h;
    }
    state.modalId = null;
  });
}

async function actAdd() {
  const f = state.form;
  if (!f.name.trim() || stripPrefix(f.control).trim() === "") return;
  if (controlExists(f.control)) {
    state.banner = "Ya existe una herramienta con el número de control " + f.control.trim();
    if (navigator.vibrate) navigator.vibrate(200);
    renderApp();
    return;
  }
  const payload = {
    name: f.name.trim(),
    brand: f.brand.trim(),
    cat: f.cat,
    loc: f.loc,
    control: f.control.trim(),
    calLast: isMedicion(f.cat) ? f.calLast.trim() : "",
    calNext: isMedicion(f.cat) ? f.calNext.trim() : "",
  };
  await run(async () => {
    let tool;
    if (DEMO_MODE) {
      tool = { id: Date.now(), status: "Disponible", holder: "", since: "", history: [], ...payload };
    } else {
      const r = await API.add(payload);
      tool = r.tool;
    }
    state.tools.push(tool);
    state.loc = f.loc;
    state.addOpen = false;
    state.form = { name: "", brand: "", cat: CATS[0], loc: f.loc, control: "", calLast: "", calNext: "" };
  });
}

async function actDelete(id) {
  await run(async () => {
    if (!DEMO_MODE) await API.remove(id);
    state.tools = state.tools.filter((t) => String(t.id) !== String(id));
    state.confirmId = null;
    state.detailId = null;
    state.screen = "list";
  });
}

async function actFinishCount() {
  const present = state.tools.filter((t) => state.marks[t.id] === "present");
  const missing = state.tools.filter((t) => state.marks[t.id] === "missing");
  const mis = state.tools.filter((t) => state.marks[t.id] === "mis");
  const payload = {
    totalRevisadas: Object.keys(state.marks).length,
    enSuLugar: present.length,
    malUbicadas: mis.length,
    faltantes: missing.length,
    detalle: JSON.stringify({
      faltantes: missing.map((t) => ({ control: t.control, name: t.name, loc: t.loc })),
      malUbicadas: mis.map((t) => ({ control: t.control, name: t.name, loc: t.loc })),
    }),
  };
  await run(async () => {
    if (!DEMO_MODE) await API.saveCount(payload);
    state.countDone = true;
    state.summaryStamp = "Cerrado " + stampNow();
  });
}

/* ---------- delegación de clicks ---------- */

document.addEventListener("click", (e) => {
  const el = e.target.closest("[data-act]");
  if (!el) return;
  const act = el.dataset.act;
  const id = el.dataset.id;
  const val = el.dataset.val;
  const key = el.dataset.key;

  // clicks en el fondo de un modal: cerrar solo si no fue dentro del panel
  if (act === "closeModalBg" || act === "closeAddBg") {
    if (e.target.closest("[data-stop]")) return;
  }

  switch (act) {
    // navegación
    case "goList": state.screen = "list"; state.detailId = null; renderApp(); break;
    case "goCount": state.screen = "count"; renderApp(); break;
    case "back": state.screen = "list"; state.detailId = null; renderApp(); break;
    case "reload": location.reload(); break;
    case "clearBanner": state.banner = ""; renderApp(); break;

    // filtros / lista
    case "pickLoc": state.loc = val; renderApp(); break;
    case "setStatus": state.status = val; renderApp(); break;
    case "setCat": state.cat = val; renderApp(); break;
    case "toggleGroup": state.expanded[key] = !state.expanded[key]; refreshListResults(); break;

    // modal préstamo/devolución
    case "openModal":
      state.modalId = id; state.borrower = ""; renderApp();
      { const b = document.getElementById("borrower"); if (b) b.focus(); }
      break;
    case "closeModal":
    case "closeModalBg": state.modalId = null; state.borrower = ""; renderApp(); break;
    case "pickPerson": state.borrower = val; renderApp(); break;
    case "doLend": actLend(id, state.borrower); break;
    case "doReturn": actReturn(id); break;
    case "openDetail": state.screen = "detail"; state.detailId = state.modalId || id; state.modalId = null; renderApp(); break;

    // detalle
    case "detailAction": {
      const t = toolById(id);
      if (t && t.status !== "En reparación") { state.modalId = id; state.borrower = ""; renderApp(); const b = document.getElementById("borrower"); if (b) b.focus(); }
      break;
    }
    case "askDelete": state.confirmId = id; renderApp(); break;
    case "cancelDelete": state.confirmId = null; renderApp(); break;
    case "doDelete": actDelete(id); break;

    // agregar
    case "openAdd":
      state.addOpen = true;
      state.form.control = ctrlPrefix(state.form.loc, state.form.cat);
      state.ctrlWasDup = false;
      renderApp();
      break;
    case "closeAdd":
    case "closeAddBg": state.addOpen = false; renderApp(); break;
    case "formLoc":
      state.form.loc = val;
      state.form.control = applyPrefix(val, state.form.cat, state.form.control);
      renderApp();
      break;
    case "formCat":
      state.form.cat = val;
      state.form.control = applyPrefix(state.form.loc, val, state.form.control);
      renderApp();
      break;
    case "saveNew": actAdd(); break;

    // conteo
    case "mark": state.marks[id] = val; renderApp(); break;
    case "finishCount": actFinishCount(); break;
    case "resetCount": state.marks = {}; state.countDone = false; state.summaryStamp = ""; renderApp(); break;

    default: break;
  }
});

/* ---------- delegación de inputs ---------- */

document.addEventListener("input", (e) => {
  const el = e.target.closest("[data-field]");
  if (!el) return;
  const field = el.dataset.field;
  const value = el.value;

  if (field === "query") {
    state.query = value;
    refreshListResults(); // actualización ligera: no perder el foco del buscador
    return;
  }
  if (field === "borrower") {
    state.borrower = value;
    renderApp();
    return;
  }
  if (field.indexOf("form.") === 0) {
    state.form[field.slice(5)] = value;
    // aviso de número de control duplicado: vibrar al detectarlo
    if (field === "form.control") {
      const dup = stripPrefix(value).trim().length > 0 && controlExists(value);
      if (dup && !state.ctrlWasDup && navigator.vibrate) navigator.vibrate(200);
      state.ctrlWasDup = dup;
    }
    renderApp();
    return;
  }
});

/* ---------- Enter para prestar / guardar ---------- */

document.addEventListener("keydown", (e) => {
  if (e.key !== "Enter") return;
  const el = e.target;
  if (el.id === "borrower" && state.borrower.trim() && state.modalId) {
    e.preventDefault();
    actLend(state.modalId, state.borrower);
  }
});

init();
