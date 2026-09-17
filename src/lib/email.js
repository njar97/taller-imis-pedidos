// Helper para invocar la Edge Function enviar-cotizacion.
//
// La función es pública (no-verify-jwt) — cualquiera con la anon key
// puede invocarla. No es problema porque solo manda emails de
// cotizaciones que ya existen en BD.

const SUPA_URL = "https://kszdievqesveluzcnzsh.supabase.co";
const SUPA_ANON = "sb_publishable_XCwHC4aEI6g4_AFXLXbzIg_QpUL_FpX";

// Manda un DTE ya emitido al cliente: PDF + JSON oficial, los dos adjuntos.
// El PDF lo arma la función enviar-dte, no el navegador, para que salga igual
// al emitir, al reenviar o al reintentar. Identificá la factura por id o por
// código de generación (al emitir todavía no tenemos el id).
export async function enviarDteEmail({ facturaId, codigoGeneracion, destinatarios, mensajeExtra }) {
  try {
    const r = await fetch(`${SUPA_URL}/functions/v1/enviar-dte`, {
      method: "POST",
      headers: {
        apikey: SUPA_ANON,
        Authorization: "Bearer " + SUPA_ANON,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        factura_id: facturaId,
        codigo_generacion: codigoGeneracion,
        destinatarios,
        mensaje_extra: mensajeExtra,
      }),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) return { ok: false, error: data?.error || `HTTP ${r.status}` };
    return { ok: true, ...data };
  } catch (e) {
    return { ok: false, error: e?.message || String(e) };
  }
}

export async function enviarCotizacionEmail({ pedidoId, destinatarios, asunto, mensajeExtra }) {
  try {
    const r = await fetch(`${SUPA_URL}/functions/v1/enviar-cotizacion`, {
      method: "POST",
      headers: {
        apikey: SUPA_ANON,
        Authorization: "Bearer " + SUPA_ANON,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        pedido_id: pedidoId,
        destinatarios,
        asunto,
        mensaje_extra: mensajeExtra,
      }),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      return { ok: false, error: data?.error || data?.detail || `HTTP ${r.status}` };
    }
    return { ok: true, ...data };
  } catch (e) {
    return { ok: false, error: e?.message || String(e) };
  }
}
