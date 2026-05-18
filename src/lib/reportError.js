// Envía un reporte de error a Supabase (tabla taller_errores).
//
// Fire-and-forget: no devuelve promesa, no espera respuesta, no muestra
// toasts. Si la red está caída, el SW está roto, o la tabla todavía no
// existe en Supabase, se loguea en consola y se sigue. NUNCA debe lanzar
// — vive dentro de ErrorBoundary.componentDidCatch y un throw acá podría
// dispararse en loop.

const SUPA_URL = "https://kszdievqesveluzcnzsh.supabase.co";
const SUPA_ANON = "sb_publishable_XCwHC4aEI6g4_AFXLXbzIg_QpUL_FpX";

// __APP_VERSION__ lo inyecta vite.config.js (commit SHA corto).
// Si por alguna razón no está definido (tests, hot path raro), cae a "?".
const VERSION = typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "?";

export function reportError(error, info) {
  try {
    const payload = {
      mensaje: String((error && error.message) || error || "").slice(0, 2000),
      stack: error && error.stack ? String(error.stack).slice(0, 8000) : null,
      component_stack: info && info.componentStack
        ? String(info.componentStack).slice(0, 4000)
        : null,
      url: typeof location !== "undefined" ? location.href : null,
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
      app_version: VERSION,
    };

    // keepalive: true permite que el fetch sobreviva si el usuario recarga
    // inmediatamente después del error (botón "Recargar app" del ErrorBoundary).
    fetch(SUPA_URL + "/rest/v1/taller_errores", {
      method: "POST",
      headers: {
        apikey: SUPA_ANON,
        Authorization: "Bearer " + SUPA_ANON,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(e => {
      console.warn("reportError: no se pudo enviar:", e && e.message);
    });
  } catch (e) {
    console.warn("reportError: payload inválido:", e && e.message);
  }
}
