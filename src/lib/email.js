// Helper para invocar la Edge Function enviar-cotizacion.
//
// La función es pública (no-verify-jwt) — cualquiera con la anon key
// puede invocarla. No es problema porque solo manda emails de
// cotizaciones que ya existen en BD.

const SUPA_URL = "https://kszdievqesveluzcnzsh.supabase.co";
const SUPA_ANON = "sb_publishable_XCwHC4aEI6g4_AFXLXbzIg_QpUL_FpX";

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
