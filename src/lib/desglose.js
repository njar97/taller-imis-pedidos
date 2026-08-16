// Decide COMO mostrar el desglose de tallas de un pedido, mirando sus datos.
//
// POR QUE EXISTE
// Habia un solo formato: una tarjeta por item. En el pedido 38 eso eran 25
// tarjetas para 65 camisetas, las 25 diciendo "$5.50 c/u". Javier pidio algo
// mas compacto y ordenado, y cuando se le propuso UN formato mejor, corrigio:
// «no todos los pedidos tienen la misma naturaleza». Tenia razon: de los 22
// pedidos con desglose, 14 son de UN solo item, 3 viven del precio por linea
// (Mizata: 17 articulos, 15 precios, una talla) y solo 2 cruzan talla x color.
//
// La solucion es la misma que en los filtros de beneficiarios: NO fijar el
// formato — deducirlo. Se cuentan los ejes con mas de un valor y se mira si el
// precio varia. Las cuatro formas comen el mismo dato; la que decide es esta
// funcion chica. Un pedido raro cae en la forma mas cercana, no se rompe.

// ── orden de tallas ──
// ⚠ El rank viejo les daba 1-7 a las letras y 1000+n a los numeros: por eso
// salian M, L, XL ANTES que 2, 4, 6. En el taller lo natural es al reves — las
// numericas (ninos) primero y las de letra (adultos) despues.
const RANK_LETRA = { XS: 1, S: 2, M: 3, L: 4, XL: 5, "2XL": 6, XXL: 6, "3XL": 7 };
export function rankTalla(t) {
  const s = String(t || "").trim().toUpperCase();
  const n = parseInt(s, 10);
  if (Number.isFinite(n)) return n;                 // 2, 4, 6 … 44
  if (RANK_LETRA[s]) return 1000 + RANK_LETRA[s];   // XS … 3XL
  return 2000;                                      // "A la medida", vacio
}
export const ordenarTallas = items =>
  [...(items || [])].sort((a, b) => rankTalla(a.talla) - rankTalla(b.talla)
    || String(a.spec || "").localeCompare(String(b.spec || ""), "es"));

// ── analisis ──
const limpio = v => String(v == null ? "" : v).trim();
// el spec mezcla color y variante ("Azul · cuello V"): el eje es la 1a parte,
// la variante se conserva como nota para no perder la instruccion de confeccion
export const parteDetalle = spec => limpio(String(spec || "").split("·")[0]);
export const parteVariante = spec => {
  const i = String(spec || "").indexOf("·");
  return i < 0 ? "" : limpio(String(spec).slice(i + 1));
};

/**
 * Analiza los items y decide la forma.
 * @returns {{forma:'linea'|'tabla'|'cuadro'|'tira', precioUnico:number|null,
 *            totalQty:number, totalMonto:number|null, filas, columnas, notas}}
 */
export function analizarDesglose(items) {
  const its = (items || []).map(it => ({
    ...it,
    qty: parseInt(it.qty) || 0,
    precioN: it.precio != null && it.precio !== "" ? parseFloat(it.precio) : null,
  }));
  const totalQty = its.reduce((s, it) => s + it.qty, 0);

  const distintos = f => new Set(its.map(f).filter(v => v !== "")).size;
  const nTallas = distintos(it => limpio(it.talla));
  const nDetalles = distintos(it => parteDetalle(it.spec));
  const nTipos = distintos(it => limpio(it.tipo));
  const precios = new Set(its.filter(it => it.precioN != null).map(it => it.precioN));
  const precioUnico = precios.size === 1 ? [...precios][0] : null;
  const conPrecio = its.filter(it => it.precioN != null);
  const totalMonto = conPrecio.length
    ? conPrecio.reduce((s, it) => s + it.precioN * it.qty, 0) : null;

  // variantes que el cuadro/tira no muestran: se anotan aparte, una por una
  const notas = [];
  for (const it of its) {
    const v = parteVariante(it.spec);
    if (v) notas.push(`${it.qty} ${it.talla || ""} ${parteDetalle(it.spec)}: ${v}`.replace(/\s+/g, " ").trim());
  }

  let forma;
  if (its.length <= 1) forma = "linea";
  // el precio ES la informacion: casi cada linea con el suyo (Mizata, MdC)
  else if (precios.size >= Math.max(3, its.length * 0.6)) forma = "tabla";
  // dos ejes reales -> cuadro (talla x detalle, o talla x tipo)
  else if (nTallas > 1 && (nDetalles > 1 || nTipos > 1)) forma = "cuadro";
  else forma = "tira";

  // ── datos ya agrupados para cada forma ──
  let filas = null, columnas = null;
  if (forma === "cuadro") {
    const ejeCol = nDetalles > 1 ? (it => parteDetalle(it.spec) || "—")
                                 : (it => limpio(it.tipo) || "—");
    columnas = [...new Set(its.map(ejeCol))]
      .sort((a, b) => a.localeCompare(b, "es"));
    const porTalla = new Map();
    for (const it of its) {
      const t = limpio(it.talla) || "—";
      if (!porTalla.has(t)) porTalla.set(t, new Map());
      const fila = porTalla.get(t);
      const c = ejeCol(it);
      fila.set(c, (fila.get(c) || 0) + it.qty);
    }
    filas = [...porTalla.entries()]
      .sort((a, b) => rankTalla(a[0]) - rankTalla(b[0]))
      .map(([talla, m]) => ({
        talla,
        celdas: columnas.map(c => m.get(c) || 0),
        total: [...m.values()].reduce((s, n) => s + n, 0),
      }));
  } else if (forma === "tira") {
    const porTalla = new Map();
    for (const it of its) {
      const t = limpio(it.talla) || "—";
      porTalla.set(t, (porTalla.get(t) || 0) + it.qty);
    }
    filas = [...porTalla.entries()]
      .sort((a, b) => rankTalla(a[0]) - rankTalla(b[0]))
      .map(([talla, qty]) => ({ talla, qty }));
  } else if (forma === "tabla") {
    filas = ordenarTallas(its).map(it => ({
      nombre: [limpio(it.tipo), limpio(it.talla), limpio(it.spec)]
        .filter(Boolean).join(" · ") || "—",
      qty: it.qty, precio: it.precioN,
      subtotal: it.precioN != null ? it.precioN * it.qty : null,
    }));
  }

  return { forma, items: its, precioUnico, totalQty, totalMonto,
           filas, columnas, notas };
}
