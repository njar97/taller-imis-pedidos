// Envía un reporte de error a Supabase (tabla taller_errores).
//
// Fire-and-forget: no devuelve promesa, no espera respuesta, no muestra
// toasts. Si la red está caída, el SW está roto, o la tabla todavía no
// existe en Supabase, se loguea en consola y se sigue. NUNCA debe lanzar
// — vive en handlers de error y un throw acá podría dispararse en loop.

const SUPA_URL = "https://kszdievqesveluzcnzsh.supabase.co";
const SUPA_ANON = "sb_publishable_XCwHC4aEI6g4_AFXLXbzIg_QpUL_FpX";

// __APP_VERSION__ lo inyecta vite.config.js (commit SHA corto).
const VERSION = typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "?";

// keepalive: true permite que el fetch sobreviva si el usuario recarga
// inmediatamente después del error (botón "Recargar app" del ErrorBoundary).
function send(payload) {
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
}

function basePayload(tipo) {
  return {
    tipo,
    url: typeof location !== "undefined" ? location.href : null,
    user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
    app_version: VERSION,
  };
}

// Errores capturados por ErrorBoundary (render React).
export function reportError(error, info) {
  try {
    send({
      ...basePayload("render"),
      mensaje: String((error && error.message) || error || "").slice(0, 2000),
      stack: error && error.stack ? String(error.stack).slice(0, 8000) : null,
      component_stack: info && info.componentStack
        ? String(info.componentStack).slice(0, 4000)
        : null,
    });
  } catch (e) {
    console.warn("reportError:", e && e.message);
  }
}

// Captura errores que escapan a React: handlers async, fetches sin await,
// throws en setTimeout, promesas rechazadas que nadie atrapa, etc. Estos
// son los más comunes en la práctica — un click handler que tira excepción
// no se ve afectado por el ErrorBoundary.
//
// Idempotente: aunque se llame múltiples veces, sólo se instalan los
// listeners una vez.
let installed = false;
export function installGlobalErrorHandlers() {
  if (installed || typeof window === "undefined") return;
  installed = true;

  window.addEventListener("error", evt => {
    try {
      // Errores de carga de recursos (img.onerror, <link>, <script>) caen
      // acá sin .error y sin .message útil — los ignoramos para no llenar
      // la tabla con ruido de imágenes que no cargaron.
      if (!evt.error && !evt.message) return;
      const err = evt.error;
      send({
        ...basePayload("window.error"),
        mensaje: String(
          (err && err.message) || evt.message || "Unknown error"
        ).slice(0, 2000),
        stack: err && err.stack ? String(err.stack).slice(0, 8000) : null,
        component_stack: null,
      });
    } catch (e) {
      console.warn("reportError(window.error):", e && e.message);
    }
  });

  window.addEventListener("unhandledrejection", evt => {
    try {
      const r = evt.reason;
      send({
        ...basePayload("unhandledrejection"),
        mensaje: String((r && r.message) || r || "Promise rejected").slice(0, 2000),
        stack: r && r.stack ? String(r.stack).slice(0, 8000) : null,
        component_stack: null,
      });
    } catch (e) {
      console.warn("reportError(unhandledrejection):", e && e.message);
    }
  });
}
