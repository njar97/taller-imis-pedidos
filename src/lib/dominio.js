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
// tallas 4-8 → cuello 11", 10-12 → 12", 14/S → 14", M-L → 15", XL+ → 17".
// Devuelve null para tallas que no
// mapean (numéricas de camisa 34-48, texto libre) — esas se listan aparte
// en la hoja de producción para resolverlas a mano.
export const medidaCuelloParaTalla = t => {
  if (t == null || t === "") return null;
  const s = String(t).trim().toUpperCase();
  // Solo tallas 100% numéricas ("2XL" parsearía como 2 con parseInt)
  if (/^\d+$/.test(s)) {
    const n = parseInt(s, 10);
    if (n <= 8) return '11"';
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
// Claves = medida de cuello (grupo de talla); valor = agujas reales (HxPDS).
// El puño ahora es DOBLADO (mucho más ancho que el cuello), así que ya no
// comparte montaje con ningún cuello — cada pieza teje en su propio ancho.
export const AGUJAS_TEJIDO = {
  cuello: { '11"': 170, '12"': 184, '14"': 215, '15"': 231, '16"': 248, '17"': 265 },
  puno:   { '11"': 370, '12"': 400, '14"': 432, '15"': 462, '17"': 492 },
};
export const agujasTejido = (medida, pieza) =>
  (AGUJAS_TEJIDO[pieza] || {})[medida] ?? null;

// PLANTILLA de diseños de tejido por medida de cuello — qué archivo exacto
// (código en D:\TEJIDOS, formato <tipo><pulg>-<estilo>-<agujas>) se teje de
// cuello y de puño para cada grupo de tallas. Establecida con el pedido COED
// El Sunza (jul 2026) como base REUTILIZABLE. Tabla OFICIAL 2026-07-09: cada
// grupo de talla tiene su cuello (alto 3" tallas 4-12, 3.5" de la 14 en
// adelante) y su PUÑO DOBLADO (alto 1.5", largo distinto por talla: 24/26/
// 28/30/32"). punoMedida = largo del puño en pulgadas. Nombres = agujas reales.
export const PLANTILLA_TEJIDO = {
  '11"': { cuello: "C11-2L-170", puno: "P24-2L-370", punoMedida: '24"' },
  '12"': { cuello: "C12-2L-184", puno: "P26-2L-400", punoMedida: '26"' },
  '14"': { cuello: "C14-2L-215", puno: "P28-2L-432", punoMedida: '28"' },
  '15"': { cuello: "C15-2L-231", puno: "P30-2L-462", punoMedida: '30"' },
  '17"': { cuello: "C17-2L-265", puno: "P32-2L-492", punoMedida: '32"' },
};
// Diseño de tejido para una talla de prenda: combina el mapa talla→cuello con
// la plantilla. Devuelve { cuelloMedida, cuello, puno, punoMedida } o null.
export const disenoTejidoParaTalla = t => {
  const m = medidaCuelloParaTalla(t);
  const p = m && PLANTILLA_TEJIDO[m];
  return p ? { cuelloMedida: m, ...p } : null;
};

// Items con tipo+talla+qty+precio listos para renderizar el resumen del
// pedido (TallasChips). Resuelve la fuente correcta:
//   - modoRegistro === "lista": agrupa personas[].prendas[] por tipo+talla+precio+spec.
//   - modoRegistro === "tallas": usa tallasItems tal cual.
// Ordena por tipo de prenda (alfabético) y luego por talla (lógico).
// Si tallasItems viene de un pedido legacy sin `tipo`, devuelve los items
// igual (el chip simplemente no muestra el tipo encima).
export const itemsResumen = p => {
  const personas = Array.isArray(p.personas) ? p.personas : [];
  // Cuenta como "lista" si el modo lo dice, o si hay personas con talla/prendas
  // (p.ej. tallas tomadas persona-por-persona en la captura de medidas, que
  // llenan personas[].talla directamente sin prendas[]).
  const esLista = personas.length &&
    (p.modoRegistro === "lista" || personas.some(per => per.talla || (per.prendas || []).length));
  let items;
  if (esLista) {
    const mapa = new Map();
    for (const per of personas) {
      // Prendas explícitas de la persona; si no tiene pero sí talla, se genera
      // una prenda a partir de la talla capturada + el tipo de prenda del pedido,
      // usando la especialidad (cargo) como "detalle" para poder agrupar por ella.
      const prendas = (per.prendas || []).length
        ? per.prendas
        : (per.talla ? [{ tipo: p.tipoPrenda || "", talla: per.talla, spec: per.cargo || "" }] : []);
      for (const pr of prendas) {
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
  recargoTalla: "",
  enviarA: "",
  comisionUnit: "",
  anticipo: "",
  fechaInicio: "",
  fechaEntrega: "",
  estatus: "Corte",
  costurera: "(Sin asignar)",
  vendedor: "",
  notas: "",
  disenos: [],
  catalogoRef: null,
  // Id del pedido/cotización del que sale este registro. Mismo patrón que
  // confRef en bordados/cuellos: texto con el id, sin FK, se resuelve en el
  // cliente. Sirve para que una cotización y el pedido que salió de ella (o
  // una carga desde Excel) no queden como historias separadas.
  origenRef: "",
  tecnicaSeleccionada: "",
  medidas: medInit(),
  imagenes: [],
  abonos: [],
  personas: [],
  // Prendas adicionales del kit de TALLA ÚNICA (gabacha, gorro, etc.) que no
  // se toman por persona pero sí hay que producir. [{nombre, cantidad, talla, nota}]
  componentes: [],
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
//   totalQty, qtySinPrecio (unidades en líneas sin precio),
//   sumaLineas (null si alguna línea no tiene precio),
//   total (precio acordado del pedido, o la suma si no hay precio),
//   gravado, iva, descuadre (true si la suma de líneas ≠ total),
//   incompleto (true si hay prendas sin precio y el pedido tampoco tiene
//   precio acordado → el total mostrado no es real)
export function detalleFactura(p) {
  // Las personas marcadas `noFactura` (pago aparte, no entran al DTE del
  // cliente) se excluyen del cálculo facturable — pero siguen en la hoja de
  // producción, que no filtra. Así una misma orden se produce junta y se
  // factura solo lo que corresponde.
  const pFact = {
    ...p,
    personas: (Array.isArray(p.personas) ? p.personas : []).filter(per => !per.noFactura),
  };
  const items = itemsResumen(pFact);
  const mapa = new Map();
  for (const it of items) {
    const tipo = ((it.tipo || "").trim()) || (p.tipoPrenda || "Producto");
    const precio = it.precio != null && it.precio !== "" ? parseFloat(it.precio) : null;
    const key = tipo + "|" + (precio == null ? "?" : precio.toFixed(2));
    if (!mapa.has(key)) mapa.set(key, { tipo, precio, qty: 0 });
    mapa.get(key).qty += parseInt(it.qty) || 0;
  }
  // Componentes del kit (gabacha, gorro, bolsos…) que tengan precio propio se
  // suman como líneas de la factura. Sin precio = van incluidos en la prenda
  // base (o no se facturan por separado): salen en producción pero no aquí.
  for (const c of (Array.isArray(p.componentes) ? p.componentes : [])) {
    const nombre = (c.nombre || "").trim();
    const qty = parseInt(c.cantidad) || 0;
    const precio = c.precio != null && c.precio !== "" ? parseFloat(c.precio) : null;
    if (!nombre || qty <= 0 || precio == null) continue;
    const key = nombre + "|" + precio.toFixed(2);
    if (!mapa.has(key)) mapa.set(key, { tipo: nombre, precio, qty: 0 });
    mapa.get(key).qty += qty;
  }
  const lineas = [...mapa.values()]
    .map(l => ({ ...l, subtotal: l.precio != null ? +(l.precio * l.qty).toFixed(2) : null }))
    .sort((a, b) => a.tipo.localeCompare(b.tipo) || (a.precio || 0) - (b.precio || 0));

  const totalQty = lineas.reduce((s, l) => s + l.qty, 0);
  const qtySinPrecio = lineas.reduce((s, l) => s + (l.precio == null ? l.qty : 0), 0);
  const sumaLineas = lineas.length && lineas.every(l => l.subtotal != null)
    ? +lineas.reduce((s, l) => s + l.subtotal, 0).toFixed(2)
    : null;
  const total = parseFloat(p.precio || 0) || sumaLineas || 0;
  const gravado = +(total / 1.13).toFixed(2);
  const iva = +(total - gravado).toFixed(2);
  const descuadre = sumaLineas != null && Math.abs(sumaLineas - total) > 0.01;
  // Hay prendas sin precio Y el pedido tampoco tiene precio acordado → el
  // total sale $0.00 sin que descuadre salte (sumaLineas es null). Es el caso
  // que más necesita alerta: abonos contra un total que no es real.
  const incompleto = qtySinPrecio > 0 && !(parseFloat(p.precio) > 0);
  return { lineas, totalQty, qtySinPrecio, incompleto, sumaLineas, total, gravado, iva, descuadre };
}

// Vista "carrito de supermercado" de un pedido: presenta TODO lo que lleva la
// orden como renglones de una boleta, separado en tres canastas. NO cambia el
// guardado ni el DTE — es solo presentación. Reusa detalleFactura (canasta 1)
// y itemsResumen (canasta 2) para no duplicar la lógica de precios.
//
// Devuelve:
//   factura   : { lineas, gravado, iva, total, ... }  → lo que va a UN DTE
//   aparte    : { lineas:[{tipo,talla,precio,qty,subtotal}], total }  → personas
//               noFactura (pago aparte, no entran al DTE del cliente)
//   sinPrecio : [{ nombre, talla, qty }]  → componentes del kit sin precio
//               (se producen pero no se facturan por separado) → sirve de alerta
export function carritoPedido(p) {
  const personas = Array.isArray(p.personas) ? p.personas : [];
  const factura = detalleFactura(p);

  // Canasta 2: personas marcadas noFactura, agrupadas por tipo+talla+precio.
  const apartePersonas = personas.filter(per => per.noFactura);
  const itemsAparte = apartePersonas.length
    ? itemsResumen({ ...p, personas: apartePersonas, tallasItems: [] })
    : [];
  const mapa = new Map();
  for (const it of itemsAparte) {
    const tipo = ((it.tipo || "").trim()) || (p.tipoPrenda || "Producto");
    const talla = it.talla || "";
    const precio = it.precio != null && it.precio !== "" ? parseFloat(it.precio) : null;
    const key = tipo + "|" + talla + "|" + (precio == null ? "?" : precio.toFixed(2));
    if (!mapa.has(key)) mapa.set(key, { tipo, talla, precio, qty: 0 });
    mapa.get(key).qty += parseInt(it.qty) || 0;
  }
  const lineasAparte = [...mapa.values()]
    .map(l => ({ ...l, subtotal: l.precio != null ? +(l.precio * l.qty).toFixed(2) : null }))
    .sort((a, b) => a.tipo.localeCompare(b.tipo) || _rankTalla(a.talla) - _rankTalla(b.talla));
  const totalAparte = lineasAparte.reduce((s, l) => s + (l.subtotal || 0), 0);

  // Canasta 3: componentes del kit sin precio → se producen pero no facturan.
  const sinPrecio = (Array.isArray(p.componentes) ? p.componentes : [])
    .filter(c => c && (c.nombre || c.cantidad))
    .filter(c => c.precio == null || c.precio === "" || parseFloat(c.precio) <= 0)
    .map(c => ({ nombre: (c.nombre || "Prenda").trim(), talla: c.talla || "", qty: parseInt(c.cantidad) || 0 }));

  return { factura, aparte: { lineas: lineasAparte, total: +totalAparte.toFixed(2) }, sinPrecio };
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

// Qué más ha pedido cada beneficiario en OTROS pedidos relacionados: mismos
// del cliente (igualdad exacta de nombre, como en el resto de la app) o
// enlazados por origenRef en cualquier dirección. El cruce de personas es por
// normNombre. Limitarlo al cliente/cadena evita emparejar homónimos de
// clientes distintos — y mantiene la vista DENTRO del pedido: no reagrupa ni
// mueve nada, solo muestra que el mismo cadete aparece en el 36 y en el 63.
//
// Devuelve Map: normNombre → [{ pedidoId, esCotizacion, tipoPrenda, estatus,
// prendas, abono }] ordenado por número de pedido. `prendas` respeta el shape
// nuevo (per.prendas[]) y el viejo (talla/precio sueltos → prenda virtual con
// el tipoPrenda del pedido). `abono` sale de los abonos cuya nota nombra a la
// persona, o de medidas.abono (captura tipo Excel); null si no hay.
// Pedidos "familia" de uno dado: mismo cliente (igualdad exacta) o enlace
// origenRef en cualquier dirección. Compartido por otrosPedidosPorPersona y
// listaUnificadaGrupo.
const _pedidosRelacionados = (pedido, pedidos) => {
  const cli = String(pedido.cliente || "").trim().toLowerCase();
  return (Array.isArray(pedidos) ? pedidos : []).filter(p =>
    p.id !== pedido.id &&
    ((cli && String(p.cliente || "").trim().toLowerCase() === cli) ||
      String(p.origenRef || "") === String(pedido.id) ||
      (pedido.origenRef && String(pedido.origenRef) === String(p.id)))
  );
};

// Abonos de un pedido sumados por persona (la nota del abono lleva el nombre).
const _abonosPorNombre = p => {
  const m = new Map();
  for (const a of Array.isArray(p.abonos) ? p.abonos : []) {
    const k = normNombre(a.nota);
    if (!k) continue;
    m.set(k, (m.get(k) || 0) + parseFloat(a.monto || 0));
  }
  return m;
};

// Prendas de una persona en un pedido, respetando el shape nuevo (prendas[])
// y el viejo (talla/precio sueltos → prenda virtual con el tipo del pedido).
const _prendasDe = (per, p) =>
  Array.isArray(per.prendas) && per.prendas.length
    ? per.prendas
    : per.talla || per.precio != null
      ? [{ tipo: p.tipoPrenda || "", talla: per.talla || "", precio: per.precio != null ? per.precio : null }]
      : [];

// Abono de una persona en un pedido: nota de abono con su nombre, o
// medidas.abono (captura tipo Excel). null si no hay registro.
const _abonoDe = (per, abonosNombre, k) => {
  const reg = abonosNombre.get(k);
  if (reg != null) return reg;
  if (per.medidas && per.medidas.abono != null && per.medidas.abono !== "") {
    return parseFloat(per.medidas.abono);
  }
  return null;
};

export function otrosPedidosPorPersona(pedido, pedidos) {
  const mapa = new Map();
  for (const p of _pedidosRelacionados(pedido, pedidos)) {
    const abonosNombre = _abonosPorNombre(p);
    for (const per of Array.isArray(p.personas) ? p.personas : []) {
      const k = normNombre(per.nombre);
      if (!k) continue;
      const abono = _abonoDe(per, abonosNombre, k);
      if (!mapa.has(k)) mapa.set(k, []);
      mapa.get(k).push({
        pedidoId: p.id,
        esCotizacion: !!p.esCotizacion,
        tipoPrenda: p.tipoPrenda || "",
        estatus: p.estatus || "",
        prendas: _prendasDe(per, p),
        abono: abono != null ? abono : null,
      });
    }
  }
  for (const arr of mapa.values()) {
    arr.sort((a, b) => (parseInt(a.pedidoId) || 0) - (parseInt(b.pedidoId) || 0));
  }
  return mapa;
}

// Lista unificada del grupo: une ESTE pedido con los relacionados que
// comparten al menos una persona (el uniforme del 36 + la camiseta del 63) y
// arma un renglón por persona con TODO lo que pidió, su total, abonado y
// saldo. Excluye cotizaciones (una COT que derivó en pedido es el mismo
// trabajo — sumarla duplicaría las prendas) y cancelados. Es solo una vista:
// cada pedido sigue siendo un pedido del cliente, con su factura aparte.
//
// Devuelve:
//   pedidosIncluidos: [{ id, tipoPrenda, estatus }]   (ordenados por id)
//   personas: [{ nombre, filas:[{ pedidoId, tipo, talla, spec, qty, precio,
//                subtotal }], total, abonado, saldo, sinPrecio }]
//   totales: { total, abonado, saldo, conSinPrecio }
export function listaUnificadaGrupo(pedido, pedidos) {
  const descartable = p =>
    p.esCotizacion || p.estatus === "Cotización" || p.estatus === "Cancelado";
  const nombresBase = new Set(
    (Array.isArray(pedido.personas) ? pedido.personas : [])
      .map(per => normNombre(per.nombre))
      .filter(Boolean)
  );
  const rel = _pedidosRelacionados(pedido, pedidos)
    .filter(p =>
      !descartable(p) &&
      (Array.isArray(p.personas) ? p.personas : []).some(per => nombresBase.has(normNombre(per.nombre)))
    )
    .sort((a, b) => (parseInt(a.id) || 0) - (parseInt(b.id) || 0));

  const mapa = new Map();
  const orden = [];
  // El pedido abierto va primero: sus personas definen el orden y la grafía
  // del nombre; los relacionados solo agregan renglones.
  for (const p of [pedido, ...rel]) {
    const abonosNombre = _abonosPorNombre(p);
    for (const per of Array.isArray(p.personas) ? p.personas : []) {
      const k = normNombre(per.nombre);
      if (!k) continue;
      if (!mapa.has(k)) {
        mapa.set(k, { nombre: per.nombre, filas: [], total: 0, abonado: 0, sinPrecio: false });
        orden.push(k);
      }
      const acc = mapa.get(k);
      // Agrupar prendas idénticas de esta persona en este pedido
      const grupos = new Map();
      for (const pr of _prendasDe(per, p)) {
        const precio = pr.precio != null && pr.precio !== "" ? parseFloat(pr.precio) : null;
        const gk = JSON.stringify([pr.tipo || "", pr.talla || "", precio, pr.spec || ""]);
        if (!grupos.has(gk)) {
          grupos.set(gk, { tipo: pr.tipo || "", talla: pr.talla || "", spec: pr.spec || "", precio, qty: 0 });
        }
        grupos.get(gk).qty += 1;
      }
      for (const g of grupos.values()) {
        const subtotal = g.precio != null ? +(g.precio * g.qty).toFixed(2) : null;
        acc.filas.push({ pedidoId: p.id, ...g, subtotal });
        if (subtotal != null) acc.total = +(acc.total + subtotal).toFixed(2);
        else acc.sinPrecio = true;
      }
      const ab = _abonoDe(per, abonosNombre, k);
      if (ab) acc.abonado = +(acc.abonado + ab).toFixed(2);
    }
  }
  const personas = orden.map(k => {
    const x = mapa.get(k);
    x.filas.sort((a, b) => (parseInt(a.pedidoId) || 0) - (parseInt(b.pedidoId) || 0));
    return { ...x, saldo: +(x.total - x.abonado).toFixed(2) };
  });
  const totales = {
    total: +personas.reduce((s, x) => s + x.total, 0).toFixed(2),
    abonado: +personas.reduce((s, x) => s + x.abonado, 0).toFixed(2),
    conSinPrecio: personas.filter(x => x.sinPrecio).length,
  };
  totales.saldo = +(totales.total - totales.abonado).toFixed(2);
  const incluidos = [pedido, ...rel].sort((a, b) => (parseInt(a.id) || 0) - (parseInt(b.id) || 0));
  return {
    pedidosIncluidos: incluidos.map(p => ({ id: p.id, tipoPrenda: p.tipoPrenda || "", estatus: p.estatus || "" })),
    personas,
    totales,
  };
}

// ¿Hay algún valor real en un juego de medidas? Soporta el shape plano
// ({ pecho: "98" }) y el anidado por prenda ({ pantalon: {...}, chaqueta: {...} }).
export const tieneMedidas = m =>
  !!m &&
  Object.values(m).some(v =>
    v != null && (typeof v === "object" ? Object.values(v).some(Boolean) : !!v)
  );

// Llave para cruzar personas por nombre entre registros. Hoy una persona no
// tiene id estable: se la reconoce por cómo se escribe su nombre, y eso llega
// de fuentes que no coinciden — el formulario respeta las tildes ("Adonay
// Alemán") y los Excel del taller vienen en mayúsculas y sin acentos ("ADONAY
// ALEMAN"). Sin normalizar, esos dos son personas distintas para la app.
//
// Quita tildes, pasa a mayúsculas y colapsa espacios. NO intenta adivinar
// nombres incompletos: "Lindsay Romero" y "Lindsay Clarisa Romero" siguen
// siendo distintos a propósito — eso es un dato a corregir, no un formato.
// Ojo con la \u00f1: es una letra propia del alfabeto, no una "n" con acento.
// NFD la parte en "n" + tilde y el filtro de diacr\u00edticos se la comer\u00eda, con lo
// que "Pe\u00f1a" y "Pena" pasar\u00edan a ser la misma persona. Por eso se aparta antes
// de descomponer y se repone despu\u00e9s.
export const normNombre = s =>
  String(s || "")
    .normalize("NFC")
    .replace(/\u00f1/g, "\u0001")
    .replace(/\u00d1/g, "\u0002")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\u0001/g, "\u00f1")
    .replace(/\u0002/g, "\u00d1")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, " ");
