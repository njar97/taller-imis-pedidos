// Constantes de dominio del taller.
// Estados de pedido/bordado/cuello, opciones de selects, tallas, etc.

export const TALLER = "Taller IMIS";

// SQL.js (lector de archivos .db) — librería externa por CDN
export const SQL_JS = "https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.2/sql-wasm.js";
export const SQL_WASM = "https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.2/sql-wasm.wasm";

// API key de Anthropic (Claude). Vacía por defecto — el usuario la pega
// en el modal de IA y queda en localStorage.taller_ia_key.
export const ANTHROPIC_KEY = "";

// ── Pedidos de confección ─────────────────────────────────
// Estatus simplificados (21-may-2026): 4 estados visibles. Cancelado se
// implementa como soft-delete (papelera), no como estatus. Los estados
// viejos siguen mapeados en EC por si quedan pedidos legacy sin migrar.
export const ESTATUS = [
  "Cotización", "Corte", "Producción", "Listo", "Entregado",
];
export const EC = {
  "Cotización":     { bg: "#EDE7F6", fg: "#4527A0" },
  "Corte":          { bg: "#FFF9C4", fg: "#795548" },
  "Producción":     { bg: "#CCE5FF", fg: "#004085" },
  "Listo":          { bg: "#D4EDDA", fg: "#155724" },
  "Entregado":      { bg: "#E2E3E5", fg: "#383D41" },
  // Legacy — pedidos antiguos sin migrar. No se usan en UI nueva.
  "Tomado":         { bg: "#FFF9C4", fg: "#795548" },
  "Diseño Wilcom":  { bg: "#CCE5FF", fg: "#004085" },
  "Bordado":        { bg: "#CCE5FF", fg: "#004085" },
  "En corte":       { bg: "#FFF9C4", fg: "#795548" },
  "En costura":     { bg: "#CCE5FF", fg: "#004085" },
  "En acabados":    { bg: "#CCE5FF", fg: "#004085" },
  "Cancelado":      { bg: "#F8D7DA", fg: "#721C24" },
};

// ── Bordados ─────────────────────────────────────────────
// Simplificado el 21-may-2026: de 7 estados a 4. Cancelado se convierte
// en soft-delete (papelera). Los estados viejos quedan en EC para que
// pedidos legacy sin migrar no rompan la UI.
export const BORD_E = [
  "Diseño", "Bordado", "Listo", "Entregado",
];
export const BORD_EC = {
  "Diseño":          { bg: "#E8F5E9", fg: "#1B5E20" },
  "Bordado":         { bg: "#FCE4EC", fg: "#880E4F" },
  "Listo":           { bg: "#D4EDDA", fg: "#155724" },
  "Entregado":       { bg: "#E2E3E5", fg: "#383D41" },
  // Legacy
  "Tomado":          { bg: "#E8F5E9", fg: "#1B5E20" },
  "Diseño Wilcom":   { bg: "#E8F5E9", fg: "#1B5E20" },
  "Prueba bordado":  { bg: "#E8F5E9", fg: "#1B5E20" },
  "En producción":   { bg: "#FCE4EC", fg: "#880E4F" },
  "Cancelado":       { bg: "#F8D7DA", fg: "#721C24" },
};
export const SOPORTES_BORD = [
  "Camisa polo", "Camiseta", "Gorra", "Bolso/Morral", "Toalla",
  "Tela suelta", "Parche independiente", "Delantal", "Otro",
];
export const POSICIONES_BORD = [
  "Pecho izquierdo", "Pecho centro", "Espalda alta", "Espalda completa",
  "Manga derecha", "Manga izquierda", "Frente gorra", "Costado gorra",
  "Bolsillo", "Libre/Otra",
];
export const DISENO_EST = ["Pendiente diseñar", "En Wilcom", "Diseño listo", "Diseño del cliente"];

// ── Cuellos ──────────────────────────────────────────────
// Simplificado el 21-may-2026: de 6 estados a 4.
export const CUEL_E = ["Pendiente", "Tejido", "Listo", "Entregado"];
export const CUEL_EC = {
  "Pendiente":       { bg: "#FFF8E1", fg: "#7B5E00" },
  "Tejido":          { bg: "#E0F7FA", fg: "#006064" },
  "Listo":           { bg: "#D4EDDA", fg: "#155724" },
  "Entregado":       { bg: "#E2E3E5", fg: "#383D41" },
  // Legacy
  "Tomado":          { bg: "#FFF8E1", fg: "#7B5E00" },
  "En tejido":       { bg: "#E0F7FA", fg: "#006064" },
  "Control calidad": { bg: "#E0F7FA", fg: "#006064" },
  "Cancelado":       { bg: "#F8D7DA", fg: "#721C24" },
};
export const TIPOS_CUELLO = ["Redondo básico", "V básico", "Polo (con abertura)", "Con tapa de botones", "Bebé", "Deportivo cuadrado", "Especial/otro"];
export const MATS_CUELLO = ["Acrílico", "Algodón", "Poliéster", "Lana", "Mezcla algodón-poliéster", "Otro"];
export const CALS_CUELLO = ["Fino", "Medio", "Grueso"];
export const TALLAS_CUELLO = ["Bebé", "Niño pequeño", "Niño", "S", "M", "L", "XL", "XXL", "A medida"];

// ── Facturación / colaboradores ──────────────────────────
export const TIPO_DOC = ["Consumidor Final", "Crédito Fiscal (pendiente datos)", "Crédito Fiscal (completo)"];
export const COLABORADORAS = ["(Sin asignar)", "Blanqui", "Sandra", "Tere", "Paty", "Morena", "Imelda"];

// ── Tallas estándar ──────────────────────────────────────
export const TALLAS_A = ["XS", "S", "M", "L", "XL", "XXL", "XXXL"];
export const TALLAS_N = ["2", "4", "6", "8", "10", "12", "14", "16"];
export const TALLAS_NUM = ["34", "36", "38", "40", "42", "44", "46", "48"];

// ── Medidas para toma a la medida ────────────────────────
export const MEDIDAS_DEF = [
  { k: "hombro", l: "Hombro" },
  { k: "pecho", l: "Pecho" },
  { k: "cintura", l: "Cintura" },
  { k: "base", l: "Base" },
  { k: "largo", l: "Largo" },
  { k: "lManga", l: "L. Manga" },
  { k: "sisa", l: "Sisa" },
  { k: "pinsa", l: "Pinsa" },
  { k: "escote", l: "Escote" },
  { k: "lAtras", l: "L. Atrás" },
  { k: "pierna", l: "Pierna" },
  { k: "rodillo", l: "Rodillo" },
  { k: "ruedo", l: "Ruedo" },
  { k: "tiro", l: "Tiro" },
];

// ── Categorías de inventario ─────────────────────────────
export const CATEGORIAS_INV = [
  { id: "material",    label: "Material",    icon: "🧵", color: "#9B59B6", desc: "Telas, hilos, botones" },
  { id: "herramienta", label: "Herramienta", icon: "✂️", color: "#E67E22", desc: "Tijeras, agujas, reglas..." },
  { id: "equipo",      label: "Equipo",      icon: "🔧", color: "#2980B9", desc: "Máquinas, planchas..." },
];
