// Reintento con backoff exponencial para llamadas de red.
//
// Pensado para el wifi inestable del taller: cuando un guardado o subida
// falla por errores transitorios (red caída, timeout, 5xx, 429), reintenta
// 2-3 veces antes de levantar el error al usuario.
//
// NO reintenta en errores 4xx (input inválido, sin permisos): esos son
// problemas reales y reintentar no ayuda.

const DEFAULT_DELAYS = [300, 800, 2000]; // ms — 3 reintentos, ~3.1s total

// Decide si un error vale la pena reintentar.
function esTransitorio(err) {
  // TypeError: "Failed to fetch" → red caída
  if (err && err.name === "TypeError") return true;
  // Mensajes que típicamente vienen de fetch wrappers
  const msg = String((err && err.message) || err || "");
  if (/network|timeout|abort/i.test(msg)) return true;
  // HTTP 5xx, 408 (Request Timeout), 429 (Too Many Requests)
  const m = msg.match(/(?:HTTP|PostgREST)\s+(\d{3})/i);
  if (m) {
    const status = parseInt(m[1], 10);
    return status >= 500 || status === 408 || status === 429;
  }
  return false;
}

/**
 * Ejecuta `fn` y la reintenta si falla con un error transitorio.
 *
 * @param {() => Promise<T>} fn - función async a ejecutar
 * @param {object} opts
 * @param {number[]} [opts.delays] - lista de delays en ms entre reintentos
 * @param {(err: Error, intento: number) => void} [opts.onRetry] - callback de logging
 * @returns {Promise<T>}
 */
export async function withRetry(fn, opts = {}) {
  const delays = opts.delays || DEFAULT_DELAYS;
  let lastErr;
  for (let i = 0; i <= delays.length; i++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      if (i === delays.length || !esTransitorio(e)) throw e;
      opts.onRetry && opts.onRetry(e, i + 1);
      await new Promise(r => setTimeout(r, delays[i]));
    }
  }
  throw lastErr;
}
