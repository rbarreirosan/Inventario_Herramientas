/* =============================================================
   Datos de ejemplo (solo MODO DEMO)
   Espejo del SEED del diseño de referencia. No se persiste nada.
   Forma de cada herramienta:
   { id, name, brand, control, loc, cat, status, holder, since,
     calLast, calNext, history:[{who, out, back}] }
   ============================================================= */

function demoTool(id, name, brand, control, loc, cat, status, holder, since, history, cal) {
  return {
    id,
    name,
    brand,
    control,
    loc,
    cat,
    status,
    holder: holder || "",
    since: since || "",
    calLast: cal ? cal.last : "",
    calNext: cal ? cal.next : "",
    history: (history || []).map((h) => ({ ...h })),
  };
}

const DEMO_SEED = [
  demoTool(1, 'Matraca 1/2"', 'Urrea 6300 · cuadro 1/2"', "FO-HM-014", "Fosa", "Herramienta de mano", "Prestada", "Ramírez", "hoy 08:40", [{ who: "Ramírez", out: "06 sep 08:40", back: null }, { who: "Ortega", out: "04 sep 11:05", back: "04 sep 16:20" }]),
  demoTool(2, 'Juego de dados 1/2" (14 pz)', "Truper 15080", "FO-HM-021", "Fosa", "Herramienta de mano", "Disponible", null, null, [{ who: "J. Luna", out: "05 sep 09:15", back: "05 sep 13:40" }]),
  demoTool(3, "Juego de desarmadores (6 pz)", "Stanley 60-220", "FO-HM-033", "Fosa", "Herramienta de mano", "Disponible", null, null, []),
  demoTool(4, 'Palanca de fuerza 1/2"', "Urrea 6001", "FO-HM-040", "Fosa", "Herramienta de mano", "En reparación", null, null, [{ who: "Chávez", out: "02 sep 10:00", back: "02 sep 18:10" }]),
  demoTool(101, 'Dado 13mm hex 1/2"', "Urrea 5113", "FO-HM-052-A", "Fosa", "Herramienta de mano", "Disponible", null, null, []),
  demoTool(102, 'Dado 13mm hex 1/2"', "Urrea 5113", "FO-HM-052-B", "Fosa", "Herramienta de mano", "Prestada", "Chávez", "hoy 07:55", [{ who: "Chávez", out: "06 sep 07:55", back: null }]),
  demoTool(5, 'Pistola de impacto 1/2"', "Makita TW700 · inalámbrica", "FO-HE-102", "Fosa", "Herramienta especial/eléctrica", "Prestada", "Beto", "ayer 17:20", [{ who: "Beto", out: "05 sep 17:20", back: null }]),
  demoTool(6, "Lámpara LED de fosa", "Bosch GLI 18V", "FO-HE-108", "Fosa", "Herramienta especial/eléctrica", "Disponible", null, null, []),
  demoTool(7, "Manómetro de aceite", "Mityvac MV5530", "FO-EM-201", "Fosa", "Equipo de medición", "Disponible", null, null, [], { last: "12 mar 2026", next: "12 mar 2027" }),
  demoTool(8, "Rampa hidráulica 2 postes", "Rotary SPO12 · 5.4 t", "FO-EF-301", "Fosa", "Equipo fijo", "Disponible", null, null, []),
  demoTool(9, "Gato de transmisión", "Ranger RTJ-1000", "FO-EF-305", "Fosa", "Equipo fijo", "Disponible", null, null, []),

  demoTool(10, 'Matraca 1/2"', 'Urrea 6300 · cuadro 1/2"', "AR-HM-015", "Arriba", "Herramienta de mano", "Disponible", null, null, [{ who: "Ortega", out: "05 sep 08:05", back: "05 sep 12:30" }]),
  demoTool(11, 'Juego de dados 1/2" (14 pz)', "Truper 15080", "AR-HM-022", "Arriba", "Herramienta de mano", "Prestada", "Ortega", "hoy 09:10", [{ who: "Ortega", out: "06 sep 09:10", back: null }]),
  demoTool(12, "Juego de desarmadores (6 pz)", "Stanley 60-220", "AR-HM-034", "Arriba", "Herramienta de mano", "Disponible", null, null, []),
  demoTool(13, "Llaves mixtas 8–19 mm", "Urrea 1200 · 12 pz", "AR-HM-047", "Arriba", "Herramienta de mano", "Disponible", null, null, []),
  demoTool(110, 'Dado 8mm hex 3/8"', "Truper D-8038", "AR-HM-015-A", "Arriba", "Herramienta de mano", "Disponible", null, null, []),
  demoTool(111, 'Dado 8mm hex 3/8"', "Truper D-8038", "AR-HM-015-B", "Arriba", "Herramienta de mano", "Disponible", null, null, []),
  demoTool(112, 'Dado 8mm hex 3/8"', "Truper D-8038", "AR-HM-015-C", "Arriba", "Herramienta de mano", "Prestada", "Beto", "hoy 11:05", [{ who: "Beto", out: "06 sep 11:05", back: null }]),
  demoTool(14, 'Esmeriladora angular 4 1/2"', "DeWalt DWE402", "AR-HE-110", "Arriba", "Herramienta especial/eléctrica", "Disponible", null, null, []),
  demoTool(15, "Extractor de baleros", "Truper EXT-3", "AR-HE-117", "Arriba", "Herramienta especial/eléctrica", "En reparación", null, null, []),
  demoTool(16, 'Torquímetro 1/2" (28–210 Nm)', "Proto J6014C", "AR-EM-205", "Arriba", "Equipo de medición", "Prestada", "J. Luna", "hoy 10:25", [{ who: "J. Luna", out: "06 sep 10:25", back: null }, { who: "Ramírez", out: "03 sep 09:00", back: "03 sep 14:15" }], { last: "20 ene 2026", next: "20 sep 2026" }),
  demoTool(17, "Multímetro automotriz", "Fluke 88V", "AR-EM-209", "Arriba", "Equipo de medición", "Disponible", null, null, [], { last: "08 jun 2026", next: "08 jun 2027" }),
  demoTool(18, "Compresor de banda 60 gal", "Kaeser AirCenter", "AR-EF-310", "Arriba", "Equipo fijo", "Disponible", null, null, []),
];
