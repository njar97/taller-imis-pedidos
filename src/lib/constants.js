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
export const ESTATUS = [
  "Tomado", "Diseño Wilcom", "Bordado", "En corte", "En costura",
  "En acabados", "Listo", "Entregado", "Cancelado",
];
export const EC = {
  "Tomado":         { bg: "#FFF3CD", fg: "#856404" },
  "Diseño Wilcom":  { bg: "#FFE5D0", fg: "#7B3A10" },
  "Bordado":        { bg: "#FCE4EC", fg: "#880E4F" },
  "En corte":       { bg: "#FFF9C4", fg: "#795548" },
  "En costura":     { bg: "#CCE5FF", fg: "#004085" },
  "En acabados":    { bg: "#E8D5FF", fg: "#4B0082" },
  "Listo":          { bg: "#D4EDDA", fg: "#155724" },
  "Entregado":      { bg: "#E2E3E5", fg: "#383D41" },
  "Cancelado":      { bg: "#F8D7DA", fg: "#721C24" },
};

// ── Bordados ─────────────────────────────────────────────
export const BORD_E = [
  "Tomado", "Diseño Wilcom", "Prueba bordado", "En producción",
  "Listo", "Entregado", "Cancelado",
];
export const BORD_EC = {
  "Tomado":          { bg: "#FFF8E1", fg: "#7B5E00" },
  "Diseño Wilcom":   { bg: "#E8F5E9", fg: "#1B5E20" },
  "Prueba bordado":  { bg: "#E3F2FD", fg: "#0D47A1" },
  "En producción":   { bg: "#FCE4EC", fg: "#880E4F" },
  "Listo":           { bg: "#D4EDDA", fg: "#155724" },
  "Entregado":       { bg: "#E2E3E5", fg: "#383D41" },
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
export const CUEL_E = ["Tomado", "En tejido", "Control calidad", "Listo", "Entregado", "Cancelado"];
export const CUEL_EC = {
  "Tomado":          { bg: "#FFF8E1", fg: "#7B5E00" },
  "En tejido":       { bg: "#E0F7FA", fg: "#006064" },
  "Control calidad": { bg: "#F3E5F5", fg: "#4A148C" },
  "Listo":           { bg: "#D4EDDA", fg: "#155724" },
  "Entregado":       { bg: "#E2E3E5", fg: "#383D41" },
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
