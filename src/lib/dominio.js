// Helpers de dominio: formato, resúmenes, plantilla de pedido base.

import { MEDIDAS_DEF } from "./constants.js";

export const medInit = () => Object.fromEntries(MEDIDAS_DEF.map(m => [m.k, ""]));
export const hoy = () => new Date().toISOString().split("T")[0];
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
  estatus: "Tomado",
  costurera: "(Sin asignar)",
  vendedor: "",
  notas: "",
  medidas: medInit(),
  imagenes: [],
  abonos: [],
  personas: [],
  modoRegistro: "tallas",
};
