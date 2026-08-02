// Importador de pedidos desde los Excel de medidas del taller (formato de
// don Rafael): libro con hojas tipo CAMISAS / BLUSAS / PANTALON / FALDAS /
// KEPIS, cada una con encabezado ITEM · NOMBRE · GRADO · TALLA · medidas.
// Una hoja puede traer DOS tablas lado a lado (pantalón + camisa) — se
// detectan por cada columna cuyo encabezado es "ITEM".
//
// Devuelve un borrador de pedido (modo lista) con personas[] en el mismo
// shape que usan los pedidos cargados a mano: medidas anidadas por prenda
// (pantalon / chaqueta / quepi) + prendas[] por persona.
//
// Usa el XLSX global (SheetJS por CDN en index.html).

const norm = s =>
  String(s == null ? "" : s)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();

// encabezado de medida → { bucket, clave } (claves = las que ya renderiza
// la hoja de producción: PANTALON_MEDS / CHAQUETA_MEDS / QUEPI_MEDS)
const MAPA_MEDIDAS = {
  // camisa / blusa / chaqueta
  "HOMBRO": ["chaqueta", "hombro"],
  "PECHO": ["chaqueta", "pecho"],
  "PECHO/BUSTO": ["chaqueta", "pecho"],
  "BUSTO": ["chaqueta", "pecho"],
  "CUELLO": ["chaqueta", "cuello"],
  "SISA": ["chaqueta", "sisa"],
  "LARGO DE MANGA": ["chaqueta", "manga"],
  "MANGA": ["chaqueta", "manga"],
  "PUNO": ["chaqueta", "puno"],
  "TALLE": ["chaqueta", "talle"],
  "COSTADO": ["chaqueta", "costado"],
  "SEPARACION": ["chaqueta", "sep"],
  "ESCOTE": ["chaqueta", "escote"],
  "ALTO": ["chaqueta", "alto"],
  "ALTO DE CODO": ["chaqueta", "altcodo"],
  "CONTORNO DE CODO": ["chaqueta", "ctcodo"],
  // pantalón / falda
  "MUSLO": ["pantalon", "muslo"],
  "RODILLA": ["pantalon", "rodilla"],
  "RUEDO": ["pantalon", "ruedo"],
  "VUELO/RUEDO": ["pantalon", "ruedo"],
  "VUELO": ["pantalon", "ruedo"],
  "TIRO DELANTERO": ["pantalon", "tiroD"],
  "TIRO DELANTE": ["pantalon", "tiroD"],
  "TIRO TRASERO": ["pantalon", "tiroT"],
  // quepis
  "CONTORNO DE CABEZA": ["quepi", "contornoCabeza"],
  "CONTORNO": ["quepi", "contornoCabeza"],
};
// Ambiguas: dependen del tipo de tabla.
//
// CADERA y BASE son la misma medida (el contorno de cadera) con distinto nombre
// según la prenda: los Excel del taller la llaman CADERA en la tabla de pantalón
// y BASE en la de camisa. Antes estaban en MAPA_MEDIDAS con el bucket fijo, así
// que la CADERA del pantalón terminaba en `chaqueta` y la BASE de la camisa en
// `pantalon` — cruzadas. Acá el bucket lo decide la tabla de la que vienen.
const MAPA_POR_TIPO = {
  "CINTURA": { pantalon: ["pantalon", "cintura"], chaqueta: ["chaqueta", "cintura"] },
  "LARGO": { pantalon: ["pantalon", "largo"], chaqueta: ["chaqueta", "largo"] },
  "CADERA": { pantalon: ["pantalon", "base"], chaqueta: ["chaqueta", "cadera"] },
  "BASE": { pantalon: ["pantalon", "base"], chaqueta: ["chaqueta", "cadera"] },
};

const tipoDeTexto = txt => {
  const t = norm(txt);
  if (/KEPI|QUEPI/.test(t)) return { prenda: "Quepis", bucket: "quepi" };
  if (/PANTALON/.test(t) && /FALDA/.test(t)) return { prenda: "Pantalón/Falda", bucket: "pantalon" };
  if (/PANTALON/.test(t)) return { prenda: "Pantalón", bucket: "pantalon" };
  if (/FALDA/.test(t)) return { prenda: "Falda", bucket: "pantalon" };
  if (/CAMISA/.test(t) && /BLUSA/.test(t)) return { prenda: "Camisa/Blusa", bucket: "chaqueta" };
  if (/BLUSA/.test(t)) return { prenda: "Blusa", bucket: "chaqueta" };
  if (/CAMISA/.test(t)) return { prenda: "Camisa", bucket: "chaqueta" };
  return null;
};

// hojas: [{ name, rows: any[][] }] → { personas, titulo, tablas }
export function parsearLibroMedidas(hojas) {
  const porNombre = new Map();
  const tablasDetectadas = [];
  let titulo = "";

  for (const hoja of hojas) {
    if (/^IMPRIMIR/i.test(hoja.name.trim())) continue;
    const rows = hoja.rows || [];
    // fila de encabezado = la primera que contenga una celda "ITEM"
    let hIdx = -1;
    for (let i = 0; i < Math.min(rows.length, 10); i++) {
      if ((rows[i] || []).some(c => norm(c) === "ITEM")) { hIdx = i; break; }
    }
    if (hIdx < 0) continue;
    const header = rows[hIdx] || [];
    const itemCols = [];
    header.forEach((c, i) => { if (norm(c) === "ITEM") itemCols.push(i); });

    itemCols.forEach((ini, t) => {
      const fin = t + 1 < itemCols.length ? itemCols[t + 1] : header.length;
      // tipo de la tabla: texto en las filas de arriba dentro del rango, o el nombre de la hoja
      let tipo = null;
      for (let i = 0; i < hIdx && !tipo; i++) {
        for (let j = ini; j < fin && !tipo; j++) tipo = tipoDeTexto((rows[i] || [])[j]);
      }
      tipo = tipo || tipoDeTexto(hoja.name) || { prenda: "Prenda", bucket: "chaqueta" };
      if (!titulo) {
        for (let i = 0; i < hIdx && !titulo; i++) {
          const c = (rows[i] || []).find(v => norm(v).length > 4);
          if (c) titulo = String(c).trim();
        }
      }
      // columnas de la tabla
      const cols = [];
      for (let j = ini; j < fin; j++) {
        const h = norm(header[j]);
        if (!h || h === "ITEM") continue;
        if (/NOMBRE/.test(h)) cols.push([j, "_nombre"]);
        else if (h === "GRADO") cols.push([j, "_grado"]);
        else if (h === "TALLA") cols.push([j, "_talla"]);
        else if (h === "ABONO") cols.push([j, "_abono"]);
        else if (h === "RESTA") cols.push([j, "_resta"]);
        else if (MAPA_POR_TIPO[h]) cols.push([j, MAPA_POR_TIPO[h][tipo.bucket] || MAPA_POR_TIPO[h].chaqueta]);
        else if (MAPA_MEDIDAS[h]) cols.push([j, MAPA_MEDIDAS[h]]);
      }
      let filas = 0;
      for (let i = hIdx + 1; i < rows.length; i++) {
        const row = rows[i] || [];
        const reg = {};
        for (const [j, destino] of cols) {
          const v = row[j];
          if (v == null || String(v).trim() === "") continue;
          if (typeof destino === "string") reg[destino] = String(v).trim();
          else {
            reg._medidas = reg._medidas || {};
            const [bucket, clave] = destino;
            reg._medidas[bucket] = reg._medidas[bucket] || {};
            reg._medidas[bucket][clave] = String(v).trim();
          }
        }
        if (!reg._nombre) continue;
        filas++;
        const clave = norm(reg._nombre);
        const per = porNombre.get(clave) || {
          nombre: String(reg._nombre).trim(), talla: "", prendas: [], medidas: {},
        };
        if (reg._grado && !per.cargo) per.cargo = reg._grado;
        if (reg._talla && !per.talla) per.talla = reg._talla;
        if (reg._abono) per.medidas.abono = parseFloat(reg._abono) || reg._abono;
        if (reg._medidas) {
          for (const b of Object.keys(reg._medidas)) {
            per.medidas[b] = { ...(per.medidas[b] || {}), ...reg._medidas[b] };
          }
        }
        // Una prenda por "bucket" (chaqueta/pantalon/quepi): los libros
        // suelen repetir a la persona (Hoja1 combinada + hoja específica).
        // Si el tipo genérico ("Camisa/Blusa") aparece primero, la hoja
        // específica posterior ("Blusa") lo refina.
        const ya = per.prendas.find(pr => pr._bucket === tipo.bucket);
        if (!ya) {
          per.prendas.push({
            id: per.prendas.length + 1,
            tipo: tipo.prenda,
            talla: reg._talla || "",
            precio: null,
            _bucket: tipo.bucket,
          });
        } else {
          if (ya.tipo.includes("/") && !tipo.prenda.includes("/")) ya.tipo = tipo.prenda;
          if (!ya.talla && reg._talla) ya.talla = reg._talla;
        }
        porNombre.set(clave, per);
      }
      if (filas) tablasDetectadas.push({ hoja: hoja.name, tipo: tipo.prenda, filas });
    });
  }

  const personas = [...porNombre.values()].map(p => ({
    ...p,
    prendas: p.prendas.map(({ _bucket, ...resto }) => resto),
    // compat shape viejo: talla/precio top-level desde la primera prenda
    talla: p.talla || p.prendas[0]?.talla || "",
  }));
  return { personas, titulo, tablas: tablasDetectadas };
}

// Archivo .xlsx → borrador de pedido listo para abrir en el FormPedido.
export async function importarExcelPedido(file) {
  const XLSX = window.XLSX;
  if (!XLSX) throw new Error("La librería de Excel no cargó — revisá tu conexión y recargá.");
  const data = await file.arrayBuffer();
  const wb = XLSX.read(data, { type: "array" });
  const hojas = wb.SheetNames.map(name => ({
    name,
    rows: XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, raw: false, defval: "" }),
  }));
  const { personas, titulo, tablas } = parsearLibroMedidas(hojas);
  if (!personas.length) {
    throw new Error("No encontré tablas con ITEM/NOMBRE en este Excel. ¿Es el formato de medidas del taller?");
  }
  const tipos = [...new Set(tablas.map(t => t.tipo))];
  return {
    borrador: {
      cliente: "",
      tipoPrenda: titulo || tipos.join(" + "),
      modoRegistro: "lista",
      modoPrenda: "medida",
      personas,
      notas: `Importado de Excel "${file.name}" — ${personas.length} personas, tablas: ${tablas.map(t => `${t.tipo} (${t.filas})`).join(", ")}.`,
    },
    resumen: { personas: personas.length, tablas, titulo },
  };
}
