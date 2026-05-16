// Helpers de dominio: formato, resúmenes, plantilla de pedido base.

import { MEDIDAS_DEF } from "./constants.js";

export const medInit = () => Object.fromEntries(MEDIDAS_DEF.map(m => [m.k, ""]));
export const hoy = () => new Date().toISOString().split("T")[0];
export const fmt$ = n => "$" + parseFloat(n || 0).toFixed(2);

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
