// Stock de prendas independientes — piezas que cortaste/preparaste
// sin estar atadas a un pedido específico. Se descuentan cuando las
// asignás a un pedido (en este PR todavía no hay UI de asignación, solo
// se muestra el conteo).

import { withRetry } from "./retry.js";

const SUPA_URL  = "https://kszdievqesveluzcnzsh.supabase.co";
const SUPA_ANON = "sb_publishable_XCwHC4aEI6g4_AFXLXbzIg_QpUL_FpX";
const REST = SUPA_URL + "/rest/v1";
const HEADERS = {
  apikey: SUPA_ANON,
  Authorization: "Bearer " + SUPA_ANON,
  "Content-Type": "application/json",
};

export async function leerStock() {
  try {
    const url = `${REST}/taller_stock_prendas?select=*&deleted_at=is.null&order=tipo,talla`;
    const r = await withRetry(() => fetch(url, { headers: HEADERS }));
    if (!r.ok) return [];
    return await r.json();
  } catch (e) {
    console.warn("leerStock falló:", e.message);
    return [];
  }
}

export async function agregarStock({ tipo, talla = "", qty, notas = "" }) {
  try {
    const r = await fetch(`${REST}/taller_stock_prendas`, {
      method: "POST",
      headers: { ...HEADERS, Prefer: "return=representation" },
      body: JSON.stringify({
        tipo: String(tipo || "").trim(),
        talla: String(talla || "").trim(),
        qty: Number(qty) || 0,
        notas: String(notas || "").trim(),
        fecha: new Date().toISOString().split("T")[0],
      }),
    });
    if (!r.ok) return null;
    const rows = await r.json();
    return Array.isArray(rows) ? rows[0] : rows;
  } catch (e) {
    console.warn("agregarStock falló:", e.message);
    return null;
  }
}

export async function borrarStock(id) {
  try {
    const r = await fetch(`${REST}/taller_stock_prendas?id=eq.${id}`, {
      method: "PATCH",
      headers: { ...HEADERS, Prefer: "return=minimal" },
      body: JSON.stringify({ deleted_at: new Date().toISOString() }),
    });
    return r.ok;
  } catch (e) {
    console.warn("borrarStock falló:", e.message);
    return false;
  }
}
