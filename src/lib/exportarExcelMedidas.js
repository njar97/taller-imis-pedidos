// Exporta un pedido (modo lista, con personas[]) al formato de los libros
// de medidas del taller: una hoja por tipo de prenda con encabezado
// ITEM · NOMBRE · GRADO · TALLA · medidas · ABONO — el mismo layout que
// don Rafael usa en Excel, para revisar/imprimir en terreno conocido.
//
// armarHojas() es puro (testeable); exportarExcelMedidas() usa el XLSX
// global (SheetJS por CDN) para descargar el archivo.

const COLS = {
  chaqueta: [
    ["hombro", "HOMBRO"], ["pecho", "PECHO/BUSTO"], ["cintura", "CINTURA"],
    ["cadera", "CADERA"], ["largo", "LARGO"], ["cuello", "CUELLO"],
    ["sisa", "SISA"], ["manga", "LARGO DE MANGA"], ["puno", "PUÑO"],
    ["talle", "TALLE"], ["costado", "COSTADO"], ["sep", "SEPARACION"],
    ["altcodo", "ALTO DE CODO"], ["ctcodo", "CONTORNO DE CODO"],
  ],
  pantalon: [
    ["cintura", "CINTURA"], ["base", "BASE"], ["largo", "LARGO"],
    ["ruedo", "VUELO/RUEDO"], ["muslo", "MUSLO"], ["rodilla", "RODILLA"],
    ["tiroD", "TIRO DELANTERO"], ["tiroT", "TIRO TRASERO"],
  ],
  quepi: [["contornoCabeza", "CONTORNO DE CABEZA"]],
};

const bucketDeTipo = tipo => {
  const t = String(tipo || "").toUpperCase();
  if (/KEPI|QUEPI/.test(t)) return "quepi";
  if (/PANTALON|PANTALÓN|FALDA/.test(t)) return "pantalon";
  return "chaqueta";
};

const nombreHoja = tipo =>
  String(tipo || "PRENDAS")
    .toUpperCase()
    .replace(/\//g, "-")
    .replace(/PANTALÓN/g, "PANTALON")
    .replace(/[^A-ZÁÉÍÓÚÑ0-9 \-]/g, "")
    .slice(0, 28);

// pedido → [{ nombre, aoa }] (array-of-arrays por hoja)
export function armarHojas(pedido) {
  const personas = pedido.personas || [];
  if (!personas.length) return [];

  // Tipos de prenda presentes (en orden de aparición). Personas sin
  // prendas pero con medidas entran por su bucket con un tipo genérico.
  const tipos = [];
  const versonasDe = new Map(); // tipo → [{persona, talla}]
  const meter = (tipo, p, talla) => {
    if (!versonasDe.has(tipo)) { versonasDe.set(tipo, []); tipos.push(tipo); }
    versonasDe.get(tipo).push({ p, talla });
  };
  for (const p of personas) {
    const prendas = (p.prendas || []).filter(pr => pr.tipo);
    if (prendas.length) {
      for (const pr of prendas) meter(pr.tipo, p, pr.talla || p.talla || "");
    } else {
      const buckets = Object.keys(p.medidas || {}).filter(b => COLS[b]);
      const tipo = buckets.length === 1 && buckets[0] === "pantalon" ? "Pantalón"
        : buckets.length === 1 && buckets[0] === "quepi" ? "Quepis"
        : pedido.tipoPrenda || "Prendas";
      meter(tipo, p, p.talla || "");
    }
  }

  const titulo = [pedido.cliente, pedido.fecha].filter(Boolean).join(" — ");
  return tipos.map(tipo => {
    const bucket = bucketDeTipo(tipo);
    const cols = COLS[bucket];
    const header = ["ITEM", "NOMBRE", "GRADO", "TALLA", ...cols.map(([, l]) => l), "ABONO"];
    const filas = versonasDe.get(tipo).map(({ p, talla }, i) => [
      i + 1,
      p.nombre || "",
      p.cargo || "",
      talla || "",
      ...cols.map(([k]) => ((p.medidas || {})[bucket] || {})[k] ?? ""),
      (p.medidas || {}).abono ?? "",
    ]);
    return {
      nombre: nombreHoja(tipo),
      aoa: [[titulo], [tipo.toUpperCase()], header, ...filas],
    };
  });
}

export function exportarExcelMedidas(pedido) {
  const XLSX = window.XLSX;
  if (!XLSX) throw new Error("La librería de Excel no cargó — recargá la app.");
  const hojas = armarHojas(pedido);
  if (!hojas.length) throw new Error("Este pedido no tiene personas para exportar.");
  const wb = XLSX.utils.book_new();
  const usados = new Set();
  for (const h of hojas) {
    let n = h.nombre; let i = 2;
    while (usados.has(n)) n = `${h.nombre} ${i++}`.slice(0, 31);
    usados.add(n);
    const ws = XLSX.utils.aoa_to_sheet(h.aoa);
    ws["!cols"] = h.aoa[2].map((c, j) => ({ wch: j === 1 ? 26 : Math.max(String(c).length + 2, 8) }));
    XLSX.utils.book_append_sheet(wb, ws, n);
  }
  const cli = String(pedido.cliente || "pedido").replace(/[^\w\dáéíóúñ -]/gi, "").trim().replace(/\s+/g, "_");
  XLSX.writeFile(wb, `Medidas_${cli}_${pedido.fecha || ""}.xlsx`);
}
