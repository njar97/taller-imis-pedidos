// Bandeja de entrada de facturas DTE empujadas por dte_web.
// Cada item de cada factura llega como una fila. El usuario las
// revisa, clasifica (material/herramienta/equipo) y las importa
// al inventario. Al importar, se marca procesado y se enlaza el
// inventario_id resultante para auditoria.

import { withRetry } from "./retry.js";

const SUPA_URL  = "https://kszdievqesveluzcnzsh.supabase.co";
const SUPA_ANON = "sb_publishable_XCwHC4aEI6g4_AFXLXbzIg_QpUL_FpX";
const REST = SUPA_URL + "/rest/v1";
const HEADERS = {
  apikey: SUPA_ANON,
  Authorization: "Bearer " + SUPA_ANON,
  "Content-Type": "application/json",
};

// Adapta la fila de la BD al shape que espera el ModalSeleccion
// (descripcion, proveedor, cantidad, unidad, total, fecha, doc_id).
function rowToItem(r) {
  return {
    id: `dte-${r.doc_id}-${r.numero_item}`,  // composite id estable
    pendiente_id: r.id,                        // para marcarProcesado despues
    doc_id: r.doc_id,
    numero_item: r.numero_item,
    fecha: r.fecha_emision || "",
    proveedor: r.proveedor || "Desconocido",
    descripcion: r.descripcion || "(sin descripción)",
    cantidad: parseFloat(r.cantidad) || 0,
    unidad: r.unidad || "",
    precio_unitario: parseFloat(r.precio_unitario) || 0,
    total: parseFloat(r.total) || 0,
  };
}

export async function leerPendientes() {
  try {
    const r = await withRetry(() => fetch(
      `${REST}/taller_dte_pendientes?select=*&procesado=is.false&ignorado=is.false&order=fecha_emision.desc,doc_id.desc,numero_item.asc`,
      { headers: HEADERS }
    ));
    if (!r.ok) return [];
    const rows = await r.json();
    return rows.map(rowToItem);
  } catch (e) {
    console.warn("leerPendientes fallo:", e.message);
    return [];
  }
}

export async function contarPendientes() {
  try {
    const r = await fetch(
      `${REST}/taller_dte_pendientes?select=id&procesado=is.false&ignorado=is.false`,
      { headers: { ...HEADERS, Prefer: "count=exact" } }
    );
    const header = r.headers.get("content-range") || "";
    const m = header.match(/\/(\d+)$/);
    return m ? parseInt(m[1]) : 0;
  } catch {
    return 0;
  }
}

// Marca una lista de pendientes como procesados, enlazando el inventario_id
// que se creo a partir de cada uno. ids: lista de pendiente_id.
export async function marcarProcesados(idsConInventario) {
  if (!idsConInventario || idsConInventario.length === 0) return { ok: true };
  // PATCH bulk no es trivial en PostgREST cuando cada row tiene un
  // inventario_id distinto. Hacemos un PATCH por chunk pero con la misma
  // lista de ids cuando comparten el inventario_id, o uno por uno si
  // todos son distintos. Para mantenerlo simple: PATCH paralelo por id.
  const ahora = new Date().toISOString();
  const results = await Promise.all(idsConInventario.map(({ pendiente_id, inventario_id }) =>
    fetch(`${REST}/taller_dte_pendientes?id=eq.${pendiente_id}`, {
      method: "PATCH",
      headers: { ...HEADERS, Prefer: "return=minimal" },
      body: JSON.stringify({
        procesado: true,
        procesado_en: ahora,
        inventario_id: inventario_id || null,
      }),
    })
  ));
  const ok = results.every(r => r.ok);
  return { ok };
}

// Marca como ignorado (no se va a importar). Soft-delete de la bandeja.
export async function marcarIgnorado(pendiente_id) {
  try {
    const r = await fetch(`${REST}/taller_dte_pendientes?id=eq.${pendiente_id}`, {
      method: "PATCH",
      headers: { ...HEADERS, Prefer: "return=minimal" },
      body: JSON.stringify({ ignorado: true }),
    });
    return r.ok;
  } catch { return false; }
}
