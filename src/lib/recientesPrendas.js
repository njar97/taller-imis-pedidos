// Memoria de tipos de prenda "libres" (los que no están en el catálogo).
//
// Cuando un user escribe "Cortina bordada" o "Banner" en el input libre
// del FormPedido, marcarReciente() guarda el nombre en Supabase. Los
// próximos pedidos lo verán en la fila "⭐ Recientes" de chips para no
// tener que retipearlo.
//
// Backend: tabla taller_prendas_recientes + función taller_marcar_prenda
// (ver sql/2026-05-21_recientes_prendas.sql).

import { withRetry } from "./retry.js";

const SUPA_URL  = "https://kszdievqesveluzcnzsh.supabase.co";
const SUPA_ANON = "sb_publishable_XCwHC4aEI6g4_AFXLXbzIg_QpUL_FpX";
const REST = SUPA_URL + "/rest/v1";
const HEADERS = {
  apikey: SUPA_ANON,
  Authorization: "Bearer " + SUPA_ANON,
  "Content-Type": "application/json",
};

// Devuelve los N tipos más recientes (por fecha de último uso). Si la
// tabla no existe o falla la red, devolvemos [] silenciosamente — esto
// es UX best-effort, no debe romper el form.
export async function leerRecientes(limite = 3) {
  try {
    const url = `${REST}/taller_prendas_recientes?select=nombre,usado_at,uso_count&order=usado_at.desc&limit=${limite}`;
    const r = await withRetry(() => fetch(url, { headers: HEADERS }));
    if (!r.ok) return [];
    const rows = await r.json();
    return rows.map(x => x.nombre).filter(Boolean);
  } catch (e) {
    console.warn("leerRecientes falló:", e.message);
    return [];
  }
}

// Marca un nombre como usado. Si ya existe, bump uso_count + usado_at;
// si no, inserta. Fire-and-forget — el guardado del pedido no espera.
export function marcarReciente(nombre) {
  const limpio = (nombre || "").trim();
  if (!limpio) return;
  fetch(`${REST}/rpc/taller_marcar_prenda`, {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify({ p_nombre: limpio }),
    keepalive: true,
  }).catch(e => console.warn("marcarReciente falló:", e.message));
}
