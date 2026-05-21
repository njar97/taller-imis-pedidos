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

// Si pasás id → PATCH (UPDATE). Sino → POST (INSERT). El constraint
// UNIQUE(categoria, nombre) hará fallar el INSERT si el nombre ya existe
// en esa categoría — ahí el caller debería usar el id de la fila
// existente y hacer UPDATE.
export async function upsertCosto({ id, categoria, nombre, unidad, costo, orden = 0 }) {
  try {
    const payload = {
      ...(id ? {} : { categoria, unidad, orden }),
      nombre: String(nombre || "").trim(),
      costo: Number(costo) || 0,
      actualizado_en: new Date().toISOString(),
    };
    const url = id
      ? `${REST}/taller_costos_base?id=eq.${id}`
      : `${REST}/taller_costos_base`;
    const method = id ? "PATCH" : "POST";
    const r = await fetch(url, {
      method,
      headers: { ...HEADERS, Prefer: "return=representation" },
      body: JSON.stringify(id ? payload : { categoria, unidad, orden, ...payload }),
    });
    if (!r.ok) {
      const txt = await r.text().catch(() => "");
      console.warn("upsertCosto:", r.status, txt);
      return null;
    }
    const rows = await r.json();
    return Array.isArray(rows) ? rows[0] || null : rows;
  } catch (e) {
    console.warn("upsertCosto falló:", e.message);
    return null;
  }
}

// Borra un costo. No es soft-delete (la tabla no tiene deleted_at).
// Devuelve true si OK.
export async function borrarCosto(id) {
  try {
    const r = await fetch(`${REST}/taller_costos_base?id=eq.${id}`, {
      method: "DELETE",
      headers: { ...HEADERS, Prefer: "return=minimal" },
    });
    return r.ok;
  } catch (e) {
    console.warn("borrarCosto falló:", e.message);
    return false;
  }
}
