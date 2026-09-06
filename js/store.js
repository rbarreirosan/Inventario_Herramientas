/* =============================================================
   Estado de la app + lógica de dominio (agrupación, filtros)
   ============================================================= */

const state = {
  tools: [],
  loaded: false,
  loadError: "",

  screen: "list", // list | detail | count
  loc: "Fosa",
  query: "",
  cat: "Todas",
  status: "Todos",

  modalId: null, // herramienta abierta en el modal de préstamo/devolución
  detailId: null,
  confirmId: null, // herramienta pendiente de confirmar eliminación
  addOpen: false,

  borrower: "",
  form: { name: "", brand: "", cat: CATS[0], loc: "Fosa", control: "", calLast: "", calNext: "" },

  expanded: {}, // { [loc|name]: true } grupos desplegados en la lista

  // Conteo físico
  marks: {}, // { [id]: "present" | "missing" | "mis" }
  countDone: false,
  summaryStamp: "",

  busy: false,
  banner: "", // mensaje de error visible
};

/* ---------- utilidades ---------- */

function escapeHtml(v) {
  return String(v == null ? "" : v)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function stampNow() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  const ms = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  return `${p(d.getDate())} ${ms[d.getMonth()]} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

// Intenta parsear "20 sep 2026" / "20 sep" -> Date, o null
function parseSpanishDate(s) {
  if (!s) return null;
  const ms = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  const m = String(s).toLowerCase().match(/(\d{1,2})\s*([a-záéíóú]{3,})\.?\s*(\d{4})?/);
  if (!m) return null;
  const day = parseInt(m[1], 10);
  const mon = ms.indexOf(m[2].slice(0, 3));
  if (mon < 0) return null;
  const year = m[3] ? parseInt(m[3], 10) : new Date().getFullYear();
  return new Date(year, mon, day);
}

// ¿La próxima calibración está vencida o por vencer (<=30 días)?
function isCalDue(next) {
  const d = parseSpanishDate(next);
  if (!d) return false;
  const diff = (d - new Date()) / 86400000;
  return diff <= 30;
}

function isMedicion(cat) {
  return cat === "Equipo de medición";
}

/* ---------- prefijo automático del número de control ---------- */

const LOC_CODE = { Fosa: "FO", Arriba: "AR" };
const CAT_CODE = {
  "Herramienta de mano": "HM",
  "Herramienta especial/eléctrica": "HE",
  "Equipo de medición": "EM",
  "Equipo fijo": "EF",
};

// Prefijo según ubicación + categoría, p. ej. "FO-HM-"
function ctrlPrefix(loc, cat) {
  return (LOC_CODE[loc] || "") + "-" + (CAT_CODE[cat] || "") + "-";
}

// Quita un prefijo tipo "XX-XX-" del inicio (para reemplazarlo por otro)
function stripPrefix(control) {
  return String(control || "").replace(/^[A-Za-z]{2}-[A-Za-z]{2}-/, "");
}

// Reaplica el prefijo correcto conservando lo que el usuario ya escribió
function applyPrefix(loc, cat, control) {
  return ctrlPrefix(loc, cat) + stripPrefix(control);
}

/* ---------- estilos derivados (ported del diseño) ---------- */

function badgeStyle(status) {
  const c = ST[status] || ST.Disponible;
  return `flex:none;padding:7px 10px;border:2px solid ${c.bd};border-radius:4px;background:${c.bg};color:${c.fg};font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:0.05em;white-space:nowrap`;
}

function accentStyle(loc, width) {
  return `flex:none;width:${width || 8}px;background:${ACC[loc] || "#16181A"}`;
}

function chipStyle(active) {
  return `flex:none;height:46px;padding:0 14px;border-radius:4px;border:2px solid ${active ? "#16181A" : "#C7C4BF"};background:${active ? "#16181A" : "#FFFFFF"};color:${active ? "#F4F3F1" : "#3A3D41"};font-size:15px;font-weight:700;cursor:pointer;white-space:nowrap`;
}

function tabStyle(loc, active) {
  return `height:60px;border-radius:4px;border:3px solid ${active ? ACC[loc] : "#2C2F33"};background:${active ? ACC[loc] : "#0E0F10"};color:${active ? "#FFFFFF" : "#8C8F93"};font-size:20px;font-weight:800;text-transform:uppercase;letter-spacing:0.06em;cursor:pointer`;
}

function navStyle(active) {
  return `height:56px;border-radius:4px;font-size:15px;font-weight:800;text-transform:uppercase;letter-spacing:0.03em;cursor:pointer;border:2px solid ${active ? "#F4F3F1" : "#3A3D41"};background:${active ? "#F4F3F1" : "#16181A"};color:${active ? "#16181A" : "#8C8F93"}`;
}

function markBtnStyle(on, color) {
  return `height:52px;border-radius:4px;border:2px solid ${on ? color : "#C7C4BF"};background:${on ? color : "#FFFFFF"};color:${on ? "#FFFFFF" : "#3A3D41"};font-size:14px;font-weight:800;text-transform:uppercase;letter-spacing:0.02em;cursor:pointer`;
}

/* ---------- filtros y agrupación ---------- */

function isSearching() {
  return state.query.trim().length > 0;
}

// Herramientas que pasan búsqueda + filtros de chip
function matchTool(t) {
  const q = state.query.trim().toLowerCase();
  const bySearch = !q || (t.name + " " + t.control + " " + (t.brand || "")).toLowerCase().includes(q);
  const byCat = state.cat === "Todas" || t.cat === state.cat;
  const bySt = state.status === "Todos" || t.status === state.status;
  return bySearch && byCat && bySt;
}

// Agrupa piezas duplicadas por ubicación+nombre.
// Devuelve items: { type:'single', tool } | { type:'group', key, name, first, last, pieces, counts }
function groupItems(list) {
  const out = [];
  const seen = {};
  list.forEach((t) => {
    const key = t.loc + "|" + t.name;
    if (seen[key] !== undefined) { out[seen[key]].push(t); return; }
    seen[key] = out.length;
    out.push([t]);
  });
  return out.map((pieces) => {
    if (pieces.length === 1) return { type: "single", tool: pieces[0] };
    const counts = {};
    pieces.forEach((p) => { counts[p.status] = (counts[p.status] || 0) + 1; });
    const first = pieces[0];
    const last = pieces[pieces.length - 1];
    return { type: "group", key: first.loc + "|" + first.name, name: first.name, first, last, pieces, counts };
  });
}

// Grupos por categoría (o por ubicación+categoría cuando se busca)
function computeGroups() {
  const searching = isSearching();
  const pool = state.tools.filter((t) => matchTool(t) && (searching || t.loc === state.loc));
  const groups = [];
  if (searching) {
    LOCS.forEach((loc) => CATS.forEach((cat) => {
      const list = pool.filter((t) => t.loc === loc && t.cat === cat);
      if (list.length) groups.push({ title: loc + " — " + cat, count: list.length, items: groupItems(list) });
    }));
  } else {
    CATS.forEach((cat) => {
      const list = pool.filter((t) => t.cat === cat);
      if (list.length) groups.push({ title: cat, count: list.length, items: groupItems(list) });
    });
  }
  return groups;
}

function toolById(id) {
  return state.tools.find((t) => String(t.id) === String(id));
}
