// Configuración global del taller (firma RL, sello, etc.).
// Guardada en taller_config (key/value). Cargada al iniciar la app.

import { withRetry } from "./retry.js";

const SUPA_URL  = "https://kszdievqesveluzcnzsh.supabase.co";
const SUPA_ANON = "sb_publishable_XCwHC4aEI6g4_AFXLXbzIg_QpUL_FpX";
const REST = SUPA_URL + "/rest/v1";
const HEADERS = {
  apikey: SUPA_ANON,
  Authorization: "Bearer " + SUPA_ANON,
  "Content-Type": "application/json",
};

// Lee TODA la configuración como un objeto plano {key: value}.
export async function leerConfigTotal() {
  try {
    const r = await withRetry(() => fetch(`${REST}/taller_config?select=*`, { headers: HEADERS }));
    if (!r.ok) return {};
    const rows = await r.json();
    return rows.reduce((acc, row) => ({ ...acc, [row.key]: row.value }), {});
  } catch (e) {
    console.warn("leerConfigTotal falló:", e.message);
    return {};
  }
}

// Upsert de un par key/value.
export async function guardarConfig(key, value) {
  try {
    const r = await fetch(`${REST}/taller_config?on_conflict=key`, {
      method: "POST",
      headers: { ...HEADERS, Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify({ key, value, actualizado_en: new Date().toISOString() }),
    });
    return r.ok;
  } catch (e) {
    console.warn("guardarConfig falló:", e.message);
    return false;
  }
}
