// API legacy del Apps Script (Google Sheets + Drive).
//
// 2026-05-15: el CRUD migró a Postgres (lib/db.js) y los uploads de fotos/archivos
// a Supabase Storage (supabaseStorage.js). Este módulo queda como un shim mínimo:
//
//   - SCRIPT_URL: la deployment del Apps Script. Sigue activa por si hay que
//     debuggear datos viejos del Sheet o reactivar algún endpoint puntual.
//   - fetchConTimeout: helper genérico, reusado en otros módulos.
//
// Las funciones gsLeer/gsGuardar/subirImagenADrive/subirEmbADrive viven en el
// historial de git (commit anterior). No reintroducir importaciones aquí sin
// motivo claro — la idea es que el Apps Script termine apagado.

export const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyam7Sk6hstowABIbcEsH7zEJ46eIWNKIRCrm-xmkYCqdC0QF1x0QdGo5qBYo8zU18/exec";

export async function fetchConTimeout(url, opts = {}, timeoutMs = 30000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, { ...opts, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}
