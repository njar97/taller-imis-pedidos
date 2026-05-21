// Lector de la tabla taller_costos_base — costos típicos del taller
// (telas $/yd, mano de obra, extras) que usa el estimador de precio.
//
// Las ediciones desde Admin → Costos hacen UPSERT por (categoria,nombre).
// Si la tabla no existe o falla la red, devolvemos [] silenciosamente —
// el modal mostrará campos vacíos y el user puede tipear manual.

import { withRetry } from "./retry.js";

const SUPA_URL  = "https://kszdievqesveluzcnzsh.supabase.co";
const SUPA_ANON = "sb_publishable_XCwHC4aEI6g4_AFXLXbzIg_QpUL_FpX";
const REST = SUPA_URL + "/rest/v1";
const HEADERS = {
  apikey: SUPA_ANON,
  Authorization: "Bearer " + SUPA_ANON,
  "Content-Type": "application/json",
};

export async function leerCostos() {
  try {
    const url = `${REST}/taller_costos_base?select=*&activo=is.true&order=categoria,orden,nombre`;
    const r = await withRetry(() => fetch(url, { headers: HEADERS }));
    if (!r.ok) return [];
    return await r.json();
  } catch (e) {
    console.warn("leerCostos falló:", e.message);
    return [];
  }
}

export function agruparCostos(rows) {
  const out = { tela: [], mano_obra: [], extra: [] };
  for (const r of rows || []) {
    if (out[r.categoria]) out[r.categoria].push(r);
  }
  return out;
}
