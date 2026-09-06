/* =============================================================
   Inventario de Herramientas — Configuración
   -------------------------------------------------------------
   1) Pega aquí la URL del Web App de Apps Script y el TOKEN.
   2) Mientras WEB_APP_URL siga con el valor "PEGA_AQUI_...",
      la app corre en MODO DEMO (datos de ejemplo, sin guardar).
   ============================================================= */

const CONFIG = {
  // URL que te da Apps Script al desplegar (Implementar → Aplicación web)
  WEB_APP_URL: "PEGA_AQUI_LA_URL_DEL_WEB_APP",

  // Debe coincidir con la propiedad TOKEN en Script Properties de Apps Script
  TOKEN: "PEGA_AQUI_EL_TOKEN",
};

/* ---- Constantes de dominio (deben coincidir con el diseño) ---- */

// Categorías EXACTAS (mismo texto que se guarda en la hoja Herramientas)
const CATS = [
  "Herramienta de mano",
  "Herramienta especial/eléctrica",
  "Equipo de medición",
  "Equipo fijo",
];

const LOCS = ["Fosa", "Arriba"];

// Color de acento por ubicación
const ACC = { Fosa: "#17507E", Arriba: "#5B3E9B" };

// Estilos por estado (badge/borde/fondo/texto)
const ST = {
  Disponible:      { bg: "#E4F4E9", fg: "#14622F", bd: "#1B7A3D" },
  Prestada:        { bg: "#FFF0DB", fg: "#8A4B00", bd: "#B45309" },
  "En reparación": { bg: "#FFE7E5", fg: "#8E1B15", bd: "#B3261E" },
};

// Sugerencias rápidas de técnicos en el modal de préstamo
const PEOPLE = ["Ramírez", "Ortega", "J. Luna", "Beto", "Chávez"];

// ¿Estamos en modo demo? (no hay backend configurado todavía)
const DEMO_MODE = !CONFIG.WEB_APP_URL || CONFIG.WEB_APP_URL.indexOf("PEGA_AQUI") === 0;
