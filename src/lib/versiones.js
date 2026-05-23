// Historial de versiones de pedidos.
// La tabla taller_pedido_versiones se llena automáticamente vía
// trigger BEFORE UPDATE en BD (lib/db.js no hace nada extra).
// Cada vez que un pedido cambia, se guarda el estado anterior.
//
// Esta lib expone:
//   - leerVersiones(pedidoId): lista de versiones (más nueva primero)
//   - restaurarVersion(versionId, pedidoId): hace UPDATE con snapshot

import { withRetry } from "./retry.js";

const SUPA_URL  = "https://kszdievqesveluzcnzsh.supabase.co";
const SUPA_ANON = "sb_publishable_XCwHC4aEI6g4_AFXLXbzIg_QpUL_FpX";
const REST = SUPA_URL + "/rest/v1";
const HEADERS = {
  apikey: SUPA_ANON,
  Authorization: "Bearer " + SUPA_ANON,
  "Content-Type": "application/json",
};

export async function leerVersiones(pedidoId) {
  try {
    const url = `${REST}/taller_pedido_versiones?pedido_id=eq.${pedidoId}&order=creado_en.desc&limit=50`;
    const r = await withRetry(() => fetch(url, { headers: HEADERS }));
    if (!r.ok) return [];
    return await r.json();
  } catch (e) {
    console.warn("leerVersiones falló:", e.message);
    return [];
  }
}

// Restaura una versión del pedido. Patch del pedido con el snapshot.
// NOTA: esto a su vez creará UNA nueva versión (la actual antes de
// restaurar) por el trigger — ese es el comportamiento deseado para
// poder "des-restaurar".
export async function restaurarVersion(versionId, pedidoId) {
  try {
    // 1) Obtener el snapshot
    const rGet = await fetch(`${REST}/taller_pedido_versiones?id=eq.${versionId}&select=snapshot`, {
      headers: HEADERS,
    });
    if (!rGet.ok) return false;
    const rows = await rGet.json();
    if (!rows[0]?.snapshot) return false;
    const snap = rows[0].snapshot;
    // No queremos sobreescribir el id ni deleted_at ni creado_en
    delete snap.id;
    delete snap.deleted_at;
    // 2) Patch del pedido con el snapshot
    const rPut = await fetch(`${REST}/taller_pedidos?id=eq.${pedidoId}`, {
      method: "PATCH",
      headers: { ...HEADERS, Prefer: "return=minimal" },
      body: JSON.stringify(snap),
    });
    return rPut.ok;
  } catch (e) {
    console.warn("restaurarVersion falló:", e.message);
    return false;
  }
}
