// Capacidad instalada del taller — equipo propio + servicios
// subcontratados. Para declaraciones formales en licitaciones de
// gobierno (COMPRASAL) que evalúan con criterio CUMPLE/NO CUMPLE.

import { withRetry } from "./retry.js";

const SUPA_URL  = "https://kszdievqesveluzcnzsh.supabase.co";
const SUPA_ANON = "sb_publishable_XCwHC4aEI6g4_AFXLXbzIg_QpUL_FpX";
const REST = SUPA_URL + "/rest/v1";
const HEADERS = {
  apikey: SUPA_ANON,
  Authorization: "Bearer " + SUPA_ANON,
  "Content-Type": "application/json",
};

export async function leerEquipos() {
  try {
    const r = await withRetry(() => fetch(
      `${REST}/taller_equipos_capacidad?select=*&activo=is.true&order=tipo,orden,nombre`,
      { headers: HEADERS }
    ));
    if (!r.ok) return [];
    return await r.json();
  } catch (e) {
    console.warn("leerEquipos falló:", e.message);
    return [];
  }
}

export async function guardarEquipo(eq) {
  try {
    const body = {
      ...(eq.id ? {} : {}),
      nombre: (eq.nombre || "").trim(),
      tipo: eq.tipo || "propio",
      cantidad: parseInt(eq.cantidad) || 1,
      especificacion: (eq.especificacion || "").trim(),
      proposito: (eq.proposito || "").trim(),
      notas: (eq.notas || "").trim(),
      foto_url: eq.foto_url || null,
      orden: parseInt(eq.orden) || 0,
    };
    const url = eq.id
      ? `${REST}/taller_equipos_capacidad?id=eq.${eq.id}`
      : `${REST}/taller_equipos_capacidad`;
    const method = eq.id ? "PATCH" : "POST";
    const r = await fetch(url, {
      method,
      headers: { ...HEADERS, Prefer: "return=representation" },
      body: JSON.stringify(body),
    });
    if (!r.ok) {
      const txt = await r.text().catch(() => "");
      return { ok: false, error: txt };
    }
    const rows = await r.json();
    return { ok: true, equipo: Array.isArray(rows) ? rows[0] : rows };
  } catch (e) {
    return { ok: false, error: e?.message || String(e) };
  }
}

export async function borrarEquipo(id) {
  try {
    const r = await fetch(`${REST}/taller_equipos_capacidad?id=eq.${id}`, {
      method: "PATCH",
      headers: { ...HEADERS, Prefer: "return=minimal" },
      body: JSON.stringify({ activo: false }),
    });
    return r.ok;
  } catch {
    return false;
  }
}
