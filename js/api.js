/* =============================================================
   Capa de red hacia Apps Script
   -------------------------------------------------------------
   - Lecturas: GET con query params.
   - Escrituras: POST con Content-Type text/plain (evita el
     preflight CORS que Apps Script no responde). El cuerpo es
     un string JSON: { action, token, ...payload }.
   - En MODO DEMO no se toca la red: se simula en memoria.
   ============================================================= */

const API = (() => {
  function url(params) {
    const u = new URL(CONFIG.WEB_APP_URL);
    u.searchParams.set("token", CONFIG.TOKEN);
    Object.keys(params || {}).forEach((k) => u.searchParams.set(k, params[k]));
    return u.toString();
  }

  async function get(action, params) {
    const res = await fetch(url({ action, ...(params || {}) }), { method: "GET" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const data = await res.json();
    if (data && data.ok === false) throw new Error(data.error || "Error del servidor");
    return data;
  }

  async function post(action, payload) {
    const res = await fetch(CONFIG.WEB_APP_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action, token: CONFIG.TOKEN, ...(payload || {}) }),
    });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const data = await res.json();
    if (data && data.ok === false) throw new Error(data.error || "Error del servidor");
    return data;
  }

  return {
    // Devuelve { ok:true, tools:[...] }
    list: () => get("list"),
    // payload: { name, brand, cat, loc, control, calLast, calNext } -> { ok, tool }
    add: (p) => post("add", p),
    // payload: { id } -> { ok }
    remove: (id) => post("delete", { id }),
    // payload: { id, borrower } -> { ok, since }
    lend: (id, borrower) => post("lend", { id, borrower }),
    // payload: { id } -> { ok, back }
    giveBack: (id) => post("return", { id }),
    // payload: { totalRevisadas, enSuLugar, malUbicadas, faltantes, detalle } -> { ok }
    saveCount: (p) => post("saveCount", p),
  };
})();
