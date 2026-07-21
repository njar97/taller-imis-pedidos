// Link público de captura de medidas.
//
// Un pedido puede tener un `captura_token`: quien abra la app con
// ?captura=TOKEN ve SOLO la tabla de personas/medidas de ese pedido
// (sin login) y puede llenarla desde el teléfono en el lugar del
// cliente. El token es una cadena aleatoria de 32 hex — funciona como
// llave por oscuridad: sin el link no se puede adivinar, y el admin lo
// puede rotar/quitar cuando el pedido cierra.
//
// Va directo contra PostgREST con la anon key (igual que db.js) porque
// la página de captura corre sin sesión.

const SUPA_URL = "https://kszdievqesveluzcnzsh.supabase.co";
const SUPA_ANON = "sb_publishable_XCwHC4aEI6g4_AFXLXbzIg_QpUL_FpX";
const REST = SUPA_URL + "/rest/v1";
const HEADERS = {
  apikey: SUPA_ANON,
  Authorization: "Bearer " + SUPA_ANON,
  "Content-Type": "application/json",
};

export function generarTokenCaptura() {
  const a = new Uint8Array(16);
  crypto.getRandomValues(a);
  return Array.from(a, b => b.toString(16).padStart(2, "0")).join("");
}

export function urlCaptura(token) {
  const path = window.location.pathname.endsWith("/")
    ? window.location.pathname
    : window.location.pathname + "/";
  return `${window.location.origin}${path}?captura=${token}`;
}

// Lee el pedido asociado a un token. Devuelve el pedido (campos mínimos)
// o null si el token no existe / el pedido está borrado.
export async function capturaLeerPedido(token) {
  try {
    const r = await fetch(
      `${REST}/taller_pedidos?captura_token=eq.${encodeURIComponent(token)}` +
      `&deleted_at=is.null&select=id,cliente,tipo_prenda,fecha_entrega,personas,estatus`,
      { headers: HEADERS }
    );
    if (!r.ok) return null;
    const rows = await r.json();
    return rows?.[0] || null;
  } catch {
    return null;
  }
}

// Guarda SOLO el campo personas del pedido del token (la página pública
// no puede tocar nada más).
export async function capturaGuardarPersonas(token, personas) {
  try {
    const r = await fetch(
      `${REST}/taller_pedidos?captura_token=eq.${encodeURIComponent(token)}&deleted_at=is.null`,
      {
        method: "PATCH",
        headers: { ...HEADERS, Prefer: "return=minimal" },
        body: JSON.stringify({ personas }),
      }
    );
    return r.ok;
  } catch {
    return false;
  }
}
