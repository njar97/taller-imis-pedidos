// Costo real de un pedido: se arma sumando lo que se le asigno de bodega
// en la pestana Inventario (tabla taller_asignaciones).
//
// POR QUE VIVE APARTE
// El costo NO sale del precio ni del estimador: sale de las facturas de
// compra que alguien amarro a este pedido. Son dos numeros distintos y
// mezclarlos fue justo el error que tenia la app antes (el costo de tela
// en taller_costos_base venia con el margen adentro, inflado 2-4x).
//
// LO QUE ESTE MODULO NO PUEDE SABER
// Si a un pedido le falta asignar la mitad de sus compras, el margen sale
// altisimo y miente. Por eso devuelve `completo`: sin tela asignada, un
// pedido de ropa esta incompleto casi con seguridad, y la UI tiene que
// mostrarlo como provisional en vez de cantar un margen que no existe.

const num = v => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
};

/** Tipo fino del insumo (TELA, HILO, ZIPPER...). Vive al inicio de
 *  `especificacion`, con el formato "TELA - ADIDAS - 60\" - $1.68/yarda". */
export function tipoInsumo(item) {
  if (!item || !item.especificacion) return null;
  return String(item.especificacion).split(" - ")[0].trim().toUpperCase() || null;
}

/**
 * @param {object} pedido
 * @param {Array}  asignaciones  todas las asignaciones (se filtran aca)
 * @param {Array}  inventario    para saber que es tela y que es avio
 * @returns {{
 *   items: Array, n: number, costo: number, costoTela: number,
 *   costoAvio: number, precio: number, hayPrecio: boolean,
 *   margen: number, margenPct: number|null, completo: boolean
 * }}
 */
export function costeoPedido(pedido, asignaciones = [], inventario = []) {
  const pid = String(pedido?.id ?? "");
  const mias = asignaciones.filter(a => String(a.pedidoId) === pid);

  const porId = new Map(inventario.map(m => [String(m.id), m]));
  let costoTela = 0;
  let costoAvio = 0;
  const items = mias.map(a => {
    const mat = porId.get(String(a.materialId)) || null;
    const tipo = tipoInsumo(mat);
    const c = num(a.costo);
    if (tipo === "TELA") costoTela += c;
    else costoAvio += c;
    return { ...a, material: mat, tipo };
  });

  const costo = costoTela + costoAvio;
  const precio = num(pedido?.precio);
  const hayPrecio = precio > 0;
  const margen = precio - costo;

  return {
    items,
    n: items.length,
    costo,
    costoTela,
    costoAvio,
    precio,
    hayPrecio,
    margen,
    margenPct: hayPrecio ? (margen / precio) * 100 : null,
    // Sin una sola tela asignada, el costo de una prenda esta incompleto.
    completo: costoTela > 0,
  };
}

/** Color del margen. Gris cuando es provisional: un margen calculado sobre
 *  un costo a medias no merece verse verde. */
export function colorMargen(c) {
  if (!c.hayPrecio || !c.n) return "#999";
  if (!c.completo) return "#999";
  if (c.margen < 0) return "#C0392B";
  if (c.margenPct < 25) return "#E67E22";
  return "#27AE60";
}
