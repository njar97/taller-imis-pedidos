// Helpers de dominio: formato, resúmenes, plantilla de pedido base.

import { MEDIDAS_DEF } from "./constants.js";

export const medInit = () => Object.fromEntries(MEDIDAS_DEF.map(m => [m.k, ""]));
export const hoy = () => new Date().toISOString().split("T")[0];
/** Formatea un número como precio en dólares: `fmt$(4.5)` → `"$4.50"`. Trata null/undefined como 0. */
export const fmt$ = n => "$" + parseFloat(n || 0).toFixed(2);

// Monto en número, venga como venga: hay data real con "$335" y "$1113.50"
// en `anticipo` — parseFloat("$335") da NaN y el NaN se propaga al recibo.
// Se limpia todo lo que no sea dígito o punto.
export const montoNum = v => {
  const n = parseFloat(String(v ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
};

// Suma real de abonos. Si el pedido tiene abonos[], usa eso (fuente de
// verdad). Si no, cae a p.anticipo. Es el "total ya pagado".
//
// OJO: los abonos anotados por persona (personas[].medidas.abono) NO se
// suman aquí a propósito: en los pedidos reales (34, 35, 36, 63) ya están
// transcritos a abonos[] con el nombre en la nota, y en el 27 el anticipo
// manual los cubre — sumarlos duplicaría el dinero. Para detectar los que
// quedaron SIN transcribir está abonosAnotadosSinRegistrar().
export const sumarAbonos = p =>
  (p.abonos || []).length > 0
    ? p.abonos.reduce((s, a) => s + montoNum(a.monto), 0)
    : montoNum(p.anticipo);

// Dinero anotado por persona en la captura de medidas que NO aparece en el
// registro de pagos. En los pedidos históricos da 0 (todo transcrito); si un
// día se captura y no se transcribe, esto es lo que hay que reclamar antes
// de que el saldo salga inflado frente al cliente.
export const abonosAnotadosSinRegistrar = p => {
  const anotado = (p.personas || []).reduce(
    (s, per) => s + montoNum(per.medidas && per.medidas.abono),
    0
  );
  const dif = anotado - sumarAbonos(p);
  return dif > 0.009 ? Math.round(dif * 100) / 100 : 0;
};

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
// Precio unitario de una pieza del conjunto: busca entre los items del pedido
// el que tenga el mismo `tipo` y devuelve su precio. Si hay varios con ese tipo
// (misma prenda en distintas tallas) toma el primero con precio — el precio de
// una prenda no varía por talla salvo recargo, que se cobra aparte.
const precioPieza = (nombre, items) => {
  const clave = String(nombre || "").trim().toLowerCase();
  if (!clave) return null;
  const hit = items.find(it =>
    String(it.tipo || "").trim().toLowerCase() === clave && parseFloat(it.precio) > 0);
  return hit ? parseFloat(hit.precio) : null;
};

// Resuelve un conjunto contra los items del pedido: devuelve sus piezas con
// precio y el total. `faltantes` lista las piezas que no cruzaron con ningún
// item — se muestran para que el descuadre sea visible en vez de silencioso.
export const resolverConjunto = (conjunto, items) => {
  const piezas = (conjunto?.piezas || []).map(pz => {
    const qty = parseInt(pz.qty) > 0 ? parseInt(pz.qty) : 1;
    const precio = precioPieza(pz.nombre, items);
    return { nombre: pz.nombre, qty, precio, subtotal: precio == null ? null : precio * qty };
  });
  const faltantes = piezas.filter(pz => pz.precio == null).map(pz => pz.nombre);
  const total = piezas.reduce((s, pz) => s + (pz.subtotal || 0), 0);
  return { nombre: conjunto?.nombre || "", piezas, total, faltantes };
};

// Todos los conjuntos del pedido ya resueltos. Los que no tienen ninguna pieza
// con precio se descartan: no aportan nada al documento.
export const conjuntosResueltos = p => {
  const items = itemsResumen(p);
  return (Array.isArray(p.conjuntos) ? p.conjuntos : [])
    .map(c => resolverConjunto(c, items))
    .filter(c => c.piezas.length > 0);
};

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
  // Otras prendas del pedido, además de la principal. Dos formas:
  //   · talla única (gabacha, gorro) → {nombre, cantidad, talla, nota}
  //   · con tallas (pantalón junto a la camisa) → {nombre, tallasQty:{talla:qty}}
  // Además pueden apuntar a un producto del catálogo con `catalogoRef` para
  // heredar su ficha. La cantidad se lee siempre con cantidadComponente().
  componentes: [],
  // Uniformes/kits armados con las prendas del pedido: {id, nombre, piezas:[{nombre, qty}]}.
  // Cada pieza cruza por `nombre` con el `tipo` de los items para resolver su precio, así
  // el total del conjunto nunca se descuadra de las prendas. Solo agrupa para presentar
  // ("un uniforme de chef cuesta X"): el total del pedido lo siguen dando las prendas.
  conjuntos: [],
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
    const qty = cantidadComponente(c);
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
  const sumaLineas = lineas.length && lineas.every(l => l.subtotal != null)
    ? +lineas.reduce((s, l) => s + l.subtotal, 0).toFixed(2)
    : null;
  const total = parseFloat(p.precio || 0) || sumaLineas || 0;
  const gravado = +(total / 1.13).toFixed(2);
  const iva = +(total - gravado).toFixed(2);
  const descuadre = sumaLineas != null && Math.abs(sumaLineas - total) > 0.01;
  return { lineas, totalQty, sumaLineas, total, gravado, iva, descuadre };
}

// Vista "carrito de supermercado" de un pedido: presenta TODO lo que lleva la
// orden como renglones de una boleta, separado en tres canastas. NO cambia el
// guardado ni el DTE — es solo presentación. Reusa detalleFactura (canasta 1)
// y itemsResumen (canasta 2) para no duplicar la lógica de precios.
//
// Cuántas prendas son un componente del pedido. Si trae desglose por talla
// manda la suma del desglose; si no, el campo cantidad. Un componente con
// tallas deja `cantidad` vacío, así que leerlo directo daría 0 y la prenda
// no se produciría ni se facturaría.
export function cantidadComponente(c) {
  if (!c) return 0;
  const tq = c.tallasQty;
  if (tq && typeof tq === "object") {
    const suma = Object.values(tq).reduce((a, v) => a + (parseInt(v, 10) || 0), 0);
    if (suma > 0) return suma;
  }
  return parseInt(c.cantidad, 10) || 0;
}

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
    .filter(c => c && (c.nombre || c.cantidad || c.tallasQty))
    .filter(c => c.precio == null || c.precio === "" || parseFloat(c.precio) <= 0)
    .map(c => ({ nombre: (c.nombre || "Prenda").trim(), talla: c.talla || "", qty: cantidadComponente(c) }));

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

// ── Opciones de un comparativo de cotizaciones ────────────────────────────
// Cuando se eligen dos o más cotizaciones para mandarlas juntas como
// opciones, el cliente necesita saber QUÉ está comparando. Antes el
// comparativo (PDF y WhatsApp) mostraba solo la foto y el precio, así que
// las opciones se veían idénticas salvo el monto.

// "Producto — Diferencia": el producto va una sola vez arriba y por opción
// queda solo lo que cambia. Sin "—", todo es producto y la etiqueta va vacía.
export const partirTipoPrenda = tipo => {
  const s = String(tipo || "");
  const i = s.indexOf("—");
  if (i === -1) return { comun: s.trim(), etiqueta: "" };
  return { comun: s.slice(0, i).trim(), etiqueta: s.slice(i + 1).trim() };
};

// Tela sin el paréntesis explicativo, que es nota interna:
// "Jersey básico (más económico que piqué)" → "Jersey básico".
export const telaCorta = c => String((c && c.tela) || "").replace(/\s*\([^)]*\)/g, "").trim();

// Ficha de una opción: precio y todo lo que la distingue de las demás.
// `i` es el índice para el nombre de respaldo ("Opción 2") cuando no hay
// ni etiqueta después del "—" ni tela que la identifique.
export const fichaOpcion = (c, i = 0) => {
  // itemsResumen y no c.tallasItems: si la cotización se registró por lista
  // de personas, tallasItems viene vacío y el precio unitario salía igual
  // al total.
  const items = itemsResumen(c || {});
  const qty = items.reduce((s, it) => s + (parseInt(it.qty) || 0), 0);
  const total = parseFloat((c && c.precio) || 0);
  // Sin cantidad no se puede prorratear: cae al precio del primer ítem y,
  // si tampoco hay, al total tal cual.
  const unit =
    qty > 0
      ? total / qty
      : items[0] && items[0].precio != null
      ? parseFloat(items[0].precio)
      : total;
  const tela = telaCorta(c);
  const etiqueta = partirTipoPrenda(c && c.tipoPrenda).etiqueta || tela || "Opción " + (i + 1);
  const specs = [];
  // La tela no se repite si ya es el nombre de la opción.
  if (tela && tela !== etiqueta) specs.push({ k: "Tela", v: tela });
  if (c && c.color) specs.push({ k: "Color", v: c.color });
  // Tallas en limpio ("10× M · 5× L"). resumenTallas trae el precio pegado
  // a cada talla y acá el precio va en su propio renglón.
  const tallas = items
    .map(it => `${it.qty}\u00d7 ${it.talla || it.tipo || ""}`.trim())
    .join(" \u00b7 ");
  if (tallas) specs.push({ k: "Tallas", v: tallas });
  if (c && c.tieneBordado) specs.push({ k: "Incluye", v: "Bordado" });
  return {
    etiqueta,
    specs,
    descripcion: (c && c.descripcion) || "",
    qty,
    total,
    unit,
  };
};

// Reparte las fichas de un comparativo: lo que TODAS las opciones comparten
// (misma tela, mismas tallas, misma nota) sube al encabezado una sola vez y
// en cada opción queda solo lo que la diferencia. Así el cliente ve el
// detalle completo sin leer tres veces lo mismo.
export const comparativoOpciones = cots => {
  const lista = (cots || []).map((c, i) => fichaOpcion(c, i));
  const primera = lista[0] || { specs: [], descripcion: "" };
  const igualEnTodas = s => lista.every(f => f.specs.some(o => o.k === s.k && o.v === s.v));
  const comunes = lista.length > 1 ? primera.specs.filter(igualEnTodas) : [];
  const esComun = s => comunes.some(o => o.k === s.k && o.v === s.v);
  const descComun =
    lista.length > 1 && primera.descripcion && lista.every(f => f.descripcion === primera.descripcion)
      ? primera.descripcion
      : "";
  return {
    comun: partirTipoPrenda(cots && cots[0] && cots[0].tipoPrenda).comun || "Cotización",
    comunes,
    descComun,
    opciones: lista.map(f => ({
      ...f,
      specs: f.specs.filter(s => !esComun(s)),
      descripcion: descComun ? "" : f.descripcion,
    })),
  };
};
