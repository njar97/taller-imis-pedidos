// Helpers de dominio: formato, resúmenes, plantilla de pedido base.

import { MEDIDAS_DEF } from "./constants.js";

export const medInit = () => Object.fromEntries(MEDIDAS_DEF.map(m => [m.k, ""]));
export const hoy = () => new Date().toISOString().split("T")[0];
/** Formatea un número como precio en dólares: `fmt$(4.5)` → `"$4.50"`. Trata null/undefined como 0. */
export const fmt$ = n => "$" + parseFloat(n || 0).toFixed(2);

// Suma real de abonos. Si el pedido tiene abonos[], usa eso (fuente de
// verdad). Si no, cae a p.anticipo. Es el "total ya pagado".
export const sumarAbonos = p =>
  (p.abonos || []).length > 0
    ? p.abonos.reduce((s, a) => s + parseFloat(a.monto || 0), 0)
    : parseFloat(p.anticipo || 0);

// Resumen agregado de TODAS las prendas del pedido, conservando el tipo
// (Pantalón, Camisa, etc.) cuando viene en personas[].prendas[]. Cada item
// resultante: { tipo, talla, precio, qty, spec }.
//
// - Si hay personas con prendas, agrupa por tipo+talla+precio+spec global
//   (sumando entre personas).
// - Si no, devuelve tallasItems (modo "Por tallas") en el mismo shape pero
//   con tipo vacío (cae al tipo del pedido principal en el render).
export function resumenAgregadoPorTipo(p) {
  const personasConPrendas = (p.personas || []).filter(per =>
    Array.isArray(per.prendas) && per.prendas.some(pr => pr.tipo || pr.talla)
  );
  if (personasConPrendas.length > 0) {
    const mapa = new Map();
    for (const per of personasConPrendas) {
      for (const pr of per.prendas) {
        if (!pr.tipo && !pr.talla) continue;
        const key = JSON.stringify([
          pr.tipo || "",
          pr.talla || "",
          pr.precio,
          pr.spec || "",
        ]);
        if (!mapa.has(key)) {
          mapa.set(key, {
            tipo: pr.tipo || "",
            talla: pr.talla || "",
            precio: pr.precio,
            spec: pr.spec || "",
            qty: 0,
          });
        }
        mapa.get(key).qty++;
      }
    }
    return [...mapa.values()];
  }
  return (p.tallasItems || []).map(it => ({
    tipo: "",
    talla: it.talla,
    precio: it.precio,
    spec: it.spec || "",
    qty: it.qty,
  }));
}

export const tallasTexto = (qty = {}) =>
  Object.entries(qty).filter(([, c]) => parseInt(c) > 0).map(([t, c]) => c + "×" + t).join(" · ");

export const tallasItemsTexto = (items = []) => items.map(it => {
  const base = `${it.qty}×${it.talla}`;
  const s = (it.spec || "").trim();
  const abrev = s.length === 0 ? "" : s.length <= 12 ? s : s.replace(/[aeiouáéíóúü]/gi, "").slice(0, 10);
  const p = it.precio != null && it.precio !== "" && parseFloat(it.precio) > 0
    ? `@$${parseFloat(it.precio).toFixed(2)}`
    : "";
  const extras = [abrev, p].filter(Boolean).join(" ");
  return extras ? `${base}(${extras})` : base;
}).join(" · ");

export const resumenTallas = p => {
  if (p.tallasItems && p.tallasItems.length) return tallasItemsTexto(p.tallasItems);
  if (p.modoTallas === "libre") return p.tallasLibre || "";
  return tallasTexto(p.tallasQty || {});
};

// Orden lógico de tallas (mismo rank que SelectorTallas, duplicado para
// no acoplar dominio.js a un componente). Orden natural pequeño → grande:
// primero tallas numéricas (niño 6, 8, 12... y numéricas de camisa 34-48),
// después letras XS < S < M < L < XL < XXL < XXXL. La app usa "XXL" pero
// hay data legacy con "2XL" — se aceptan ambas.
const _RANK_TALLAS = { XS: 1, S: 2, M: 3, L: 4, XL: 5, XXL: 6, "2XL": 6, XXXL: 7, "3XL": 7 };
export const rankTalla = t => {
  if (!t) return 99999; // "sin talla" al final
  if (_RANK_TALLAS[t]) return 1000 + _RANK_TALLAS[t];
  const n = parseInt(t, 10);
  if (Number.isFinite(n)) return n;
  return 9999;
};
const _rankTalla = rankTalla;

// Mapa talla de prenda → medida del cuello tejido (pulgadas), según la
// tabla definida con el pedido COED El Sunza (jul 2026): el cuello 12"
// cubre las tallas de niño hasta la 12, el 14" llega hasta la S, el 15"
// viste M-L y el 17" de XL en adelante. Devuelve null para tallas que no
// mapean (numéricas de camisa 34-48, texto libre) — esas se listan aparte
// en la hoja de producción para resolverlas a mano.
export const medidaCuelloParaTalla = t => {
  if (t == null || t === "") return null;
  const s = String(t).trim().toUpperCase();
  // Solo tallas 100% numéricas ("2XL" parsearía como 2 con parseInt)
  if (/^\d+$/.test(s)) {
    const n = parseInt(s, 10);
    if (n <= 12) return '12"';
    if (n <= 14) return '14"';
    return null;
  }
  if (s === "XS" || s === "S") return '14"';
  if (s === "M" || s === "L") return '15"';
  if (["XL", "XXL", "2XL", "XXXL", "3XL", "4XL"].includes(s)) return '17"';
  return null;
};

// Agujas por pieza tejida, ESTANDARIZADAS para emparejar montajes de máquina.
// El cambio de ancho (agujas) es lo caro en la rectilínea (botar tejido al
// achicar, candado al agrandar); el largo (filas) es barato. Los puños son
// rib y estiran, así que se ajustan para caer EN LAS MISMAS AGUJAS que un
// cuello y tejer cuello+puño de distinta medida en un solo montaje.
// Pares: 215 = cuello 14" + puños 15"/16" · 231 = cuello 15" + puño 17".
// Cuellos mandan el número (rígidos); los puños ajustados validar con muestra
// cosida antes de producir. Editable cuando cambien las medidas del catálogo.
export const AGUJAS_TEJIDO = {
  cuello: { '12"': 184, '14"': 215, '15"': 231, '16"': 248, '17"': 265 },
  puno:   { '12"': 196, '14"': 196, '15"': 215, '16"': 215, '17"': 231 },
};
export const agujasTejido = (medida, pieza) =>
  (AGUJAS_TEJIDO[pieza] || {})[medida] ?? null;

// Items con tipo+talla+qty+precio listos para renderizar el resumen del
// pedido (TallasChips). Resuelve la fuente correcta:
//   - modoRegistro === "lista": agrupa personas[].prendas[] por tipo+talla+precio+spec.
//   - modoRegistro === "tallas": usa tallasItems tal cual.
// Ordena por tipo de prenda (alfabético) y luego por talla (lógico).
// Si tallasItems viene de un pedido legacy sin `tipo`, devuelve los items
// igual (el chip simplemente no muestra el tipo encima).
export const itemsResumen = p => {
  const esLista = p.modoRegistro === "lista" && Array.isArray(p.personas) && p.personas.length;
  let items;
  if (esLista) {
    const mapa = new Map();
    for (const per of p.personas) {
      for (const pr of per.prendas || []) {
        const tipo = (pr.tipo || "").trim();
        const talla = pr.talla || "";
        const precio = pr.precio != null ? pr.precio : null;
        const spec = (pr.spec || "").trim();
        const key = JSON.stringify([tipo, talla, precio, spec]);
        if (!mapa.has(key)) {
          mapa.set(key, { id: key, tipo, talla, qty: 0, precio, spec, grupo: pr.grupo || "adulto" });
        }
        mapa.get(key).qty += 1;
      }
    }
    items = [...mapa.values()];
  } else {
    items = Array.isArray(p.tallasItems) ? [...p.tallasItems] : [];
  }
  return items.sort((a, b) => {
    const tipoA = (a.tipo || "zzz").toLowerCase();
    const tipoB = (b.tipo || "zzz").toLowerCase();
    if (tipoA !== tipoB) return tipoA.localeCompare(tipoB);
    return _rankTalla(a.talla) - _rankTalla(b.talla);
  });
};

export const PEDIDO_BASE = {
  cliente: "",
  tipoCliente: "persona",
  nombreContacto: "",
  telefono: "",
  modoPrenda: "medida",
  tipoPrenda: "",
  modoTallas: "estandar",
  grupoTallas: "adulto",
  tallasQty: {},
  tallasLibre: "",
  tallasItems: [],
  tela: "",
  color: "",
  descripcion: "",
  tieneBordado: false,
  estatusDiseno: "",
  telaComprada: false,
  tipoDocumento: "Consumidor Final",
  razonSocial: "",
  nit: "",
  nrc: "",
  dirFiscal: "",
  precio: "",
  anticipo: "",
  fechaInicio: "",
  fechaEntrega: "",
  estatus: "Corte",
  costurera: "(Sin asignar)",
  vendedor: "",
  notas: "",
  disenos: [],
  catalogoRef: null,
  tecnicaSeleccionada: "",
  medidas: medInit(),
  imagenes: [],
  abonos: [],
  personas: [],
  modoRegistro: "tallas",
  // Condiciones formales para cotización (todos opcionales). Si tienen
  // contenido se renderizan como secciones en el PDF de cotización.
  procesoRef: "",      // ej. "Proceso COMPRASAL — Ministerio de Cultura"
  plazoEntrega: "",    // ej. "15 días hábiles desde la firma de la orden"
  lugarEntrega: "",    // ej. "Col. Escalón, San Salvador, Nivel 2"
  formaPago: "",       // ej. "Crédito a 30 días contra entrega + acta"
  incluirAnexoCapacidad: false, // si true, el PDF incluye anexo declaración capacidad instalada
  // Snapshot del estimador cuando se guardó como cotización. Permite
  // ver cómo se llegó al precio (tela $/yd, mano obra, etc.) y
  // re-abrir en el estimador para ajustar parámetros.
  // Shape: { modo: 'confeccion'|'bordado'|'cuello', margen: Number,
  //          items: [{ tipoPrenda, qty, telaNombre, telaCostoYd,
  //                    yardasPorPrenda, moModo, moCostoUnit, moHoras,
  //                    bordActivo, bordPunt, otros: [...] }] }
  desgloseEstimador: null,
  // true → cotización de precio por unidad (cantidad abierta/estimada).
  // Cambia el mensaje WA y el PDF para mostrar el precio/unidad en lugar del total fijo.
  cotizacionAbierta: false,
};

// Agrupa los ítems del pedido por PRODUCTO + PRECIO UNITARIO para armar el
// detalle de una factura: colapsa tallas y personas (lo tedioso de hacer a
// mano). Reusa itemsResumen (que ya resuelve tallas vs personas).
//
// El precio del pedido se asume CON IVA incluido (estándar consumidor final
// en El Salvador): gravado = total / 1.13, IVA = total − gravado.
//
// Devuelve:
//   lineas: [{ tipo, precio, qty, subtotal }]  (subtotal null si la línea no tiene precio)
//   totalQty, sumaLineas (null si alguna línea no tiene precio),
//   total (precio acordado del pedido, o la suma si no hay precio),
//   gravado, iva, descuadre (true si la suma de líneas ≠ total)
export function detalleFactura(p) {
  const items = itemsResumen(p);
  const mapa = new Map();
  for (const it of items) {
    const tipo = ((it.tipo || "").trim()) || (p.tipoPrenda || "Producto");
    const precio = it.precio != null && it.precio !== "" ? parseFloat(it.precio) : null;
    const key = tipo + "|" + (precio == null ? "?" : precio.toFixed(2));
    if (!mapa.has(key)) mapa.set(key, { tipo, precio, qty: 0 });
    mapa.get(key).qty += parseInt(it.qty) || 0;
  }
  const lineas = [...mapa.values()]
    .map(l => ({ ...l, subtotal: l.precio != null ? +(l.precio * l.qty).toFixed(2) : null }))
    .sort((a, b) => a.tipo.localeCompare(b.tipo) || (a.precio || 0) - (b.precio || 0));

  const totalQty = lineas.reduce((s, l) => s + l.qty, 0);
  const sumaLineas = lineas.length && lineas.every(l => l.subtotal != null)
    ? +lineas.reduce((s, l) => s + l.subtotal, 0).toFixed(2)
    : null;
  const total = parseFloat(p.precio || 0) || sumaLineas || 0;
  const gravado = +(total / 1.13).toFixed(2);
  const iva = +(total - gravado).toFixed(2);
  const descuadre = sumaLineas != null && Math.abs(sumaLineas - total) > 0.01;
  return { lineas, totalQty, sumaLineas, total, gravado, iva, descuadre };
}

// Texto plano del detalle de factura, listo para copiar/pegar donde se emite.
export function textoFactura(p) {
  const d = detalleFactura(p);
  const L = [];
  L.push(`Cliente: ${p.cliente || ""}`);
  L.push(`Documento: ${p.tipoDocumento || "Consumidor Final"}`);
  if (p.razonSocial) L.push(`Razón social: ${p.razonSocial}`);
  if (p.nit) L.push(`NIT: ${p.nit}`);
  if (p.nrc) L.push(`NRC: ${p.nrc}`);
  if (p.dirFiscal) L.push(`Dirección: ${p.dirFiscal}`);
  L.push("");
  L.push("CANT  DESCRIPCIÓN                 P.UNIT      TOTAL");
  for (const l of d.lineas) {
    const cant = String(l.qty).padStart(4);
    const desc = (l.tipo || "").slice(0, 26).padEnd(26);
    const pu = l.precio != null ? fmt$(l.precio).padStart(8) : "   —    ";
    const tot = l.subtotal != null ? fmt$(l.subtotal).padStart(10) : "     —    ";
    L.push(`${cant}  ${desc}  ${pu}  ${tot}`);
  }
  L.push("");
  L.push(`TOTAL: ${fmt$(d.total)} (IVA incluido)`);
  L.push(`  Gravado: ${fmt$(d.gravado)}`);
  L.push(`  IVA 13%: ${fmt$(d.iva)}`);
  return L.join("\n");
}
