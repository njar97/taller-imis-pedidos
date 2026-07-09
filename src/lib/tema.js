// Modo nocturno (tema oscuro).
//
// El styling de la app está hardcodeado inline en ~2.3k lugares, así que en
// vez de recolorear cada componente, el tema oscuro se logra con un filtro
// global de inversión sobre #root (ver index.html). Este módulo sólo maneja
// la preferencia: la persiste en localStorage y aplica/quita la clase
// `theme-dark` en <html>. Si el usuario no eligió nada, seguimos la
// preferencia del sistema (prefers-color-scheme).

const KEY = "imis_tema";

// Lee la preferencia efectiva: "dark" | "claro".
// Prioridad: lo guardado por el usuario > preferencia del sistema > claro.
export function getTema() {
  try {
    const t = localStorage.getItem(KEY);
    if (t === "dark" || t === "claro") return t;
  } catch {}
  try {
    if (window.matchMedia("(prefers-color-scheme: dark)").matches) return "dark";
  } catch {}
  return "claro";
}

// Aplica el tema al DOM (clase en <html> + color de la barra del navegador).
// No persiste — usar setTema para eso.
export function aplicarTema(tema) {
  const dark = tema === "dark";
  document.documentElement.classList.toggle("theme-dark", dark);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", dark ? "#0f0d15" : "#2C1654");
}

// Guarda la preferencia y la aplica.
export function setTema(tema) {
  const t = tema === "dark" ? "dark" : "claro";
  try { localStorage.setItem(KEY, t); } catch {}
  aplicarTema(t);
  return t;
}

// Alterna entre claro y oscuro. Devuelve el tema resultante.
export function toggleTema() {
  return setTema(getTema() === "dark" ? "claro" : "dark");
}
