// Plantillas de cotización — para reusar condiciones formales típicas
// con clientes recurrentes (ministerios, escuelas, etc.).
//
// Cada plantilla guarda: nombre, proceso_ref, plazo_entrega,
// lugar_entrega, forma_pago, validez_dias, notas. Cuando armás un
// pedido/cotización, podés "cargar" una plantilla y precarga esos
// campos en el form.

import { withRetry } from "./retry.js";

const SUPA_URL  = "https://kszdievqesveluzcnzsh.supabase.co";
const SUPA_ANON = "sb_publishable_XCwHC4aEI6g4_AFXLXbzIg_QpUL_FpX";
const REST = SUPA_URL + "/rest/v1";
const HEADERS = {
  apikey: SUPA_ANON,
  Authorization: "Bearer " + SUPA_ANON,
  "Content-Type": "application/json",
};

export async function leerPlantillas() {
  try {
    const r = await withRetry(() => fetch(`${REST}/taller_plantillas_cotizacion?select=*&order=nombre`, { headers: HEADERS }));
    if (!r.ok) return [];
    return await r.json();
  } catch (e) {
    console.warn("leerPlantillas falló:", e.message);
    return [];
  }
}

// Upsert por nombre. Si ya existe con ese nombre, reemplaza.
export async function guardarPlantilla(p) {
  try {
    const body = {
      nombre: (p.nombre || "").trim(),
      proceso_ref: p.procesoRef || p.proceso_ref || "",
      plazo_entrega: p.plazoEntrega || p.plazo_entrega || "",
      lugar_entrega: p.lugarEntrega || p.lugar_entrega || "",
      forma_pago: p.formaPago || p.forma_pago || "",
      validez_dias: parseInt(p.validezDias || p.validez_dias) || 15,
      notas: p.notas || "",
    };
    if (!body.nombre) return { ok: false, error: "El nombre es requerido" };
    const r = await fetch(`${REST}/taller_plantillas_cotizacion?on_conflict=nombre`, {
      method: "POST",
      headers: { ...HEADERS, Prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify(body),
    });
    if (!r.ok) {
      const txt = await r.text().catch(() => "");
      return { ok: false, error: txt };
    }
    const rows = await r.json();
    return { ok: true, plantilla: rows[0] };
  } catch (e) {
    return { ok: false, error: e?.message || String(e) };
  }
}

export async function borrarPlantilla(id) {
  try {
    const r = await fetch(`${REST}/taller_plantillas_cotizacion?id=eq.${id}`, {
      method: "DELETE",
      headers: { ...HEADERS, Prefer: "return=minimal" },
    });
    return r.ok;
  } catch {
    return false;
  }
}
