// CRUD del inventario persistido en Supabase.
// Items vienen del DTE (.db) o se crean a mano. Asignaciones ligan
// materiales a pedidos.
//
// Conversion camelCase (JS) <-> snake_case (BD) en los helpers
// itemToRow / rowToItem para que el resto del codigo siga usando los
// nombres existentes.

import { withRetry } from "./retry.js";

const SUPA_URL  = "https://kszdievqesveluzcnzsh.supabase.co";
const SUPA_ANON = "sb_publishable_XCwHC4aEI6g4_AFXLXbzIg_QpUL_FpX";
const REST = SUPA_URL + "/rest/v1";
const HEADERS = {
  apikey: SUPA_ANON,
  Authorization: "Bearer " + SUPA_ANON,
  "Content-Type": "application/json",
};

// ── conversiones ──

function rowToItem(r) {
  return {
    id: r.id,
    fuente: r.fuente,
    categoria: r.categoria,
    descripcion: r.descripcion,
    proveedor: r.proveedor || "",
    cantidad: parseFloat(r.cantidad) || 0,
    unidad: r.unidad || "",
    precio_unitario: parseFloat(r.precio_unitario) || 0,
    total: parseFloat(r.total) || 0,
    doc_id: r.doc_id,
    fecha: r.fecha,
    foto_url: r.foto_url,
    especificacion: r.especificacion || "",
    estado: r.estado || "funcionando",
    notas_mantenimiento: r.notas_mantenimiento || "",
    ubicacion: r.ubicacion || "",
  };
}

function itemToRow(it) {
  return {
    id: it.id,
    fuente: it.fuente || "manual",
    categoria: it.categoria || "material",
    descripcion: (it.descripcion || "").trim(),
    proveedor: (it.proveedor || "").trim() || null,
    cantidad: parseFloat(it.cantidad) || 0,
    unidad: (it.unidad || "").trim() || null,
    precio_unitario: parseFloat(it.precio_unitario) || 0,
    total: parseFloat(it.total) || 0,
    doc_id: it.doc_id || null,
    fecha: it.fecha || null,
    foto_url: it.foto_url || null,
    especificacion: (it.especificacion || "").trim() || null,
    estado: it.estado || "funcionando",
    notas_mantenimiento: (it.notas_mantenimiento || "").trim() || null,
    ubicacion: (it.ubicacion || "").trim() || null,
  };
}

function rowToAsig(r) {
  return {
    id: r.id,
    materialId: r.material_id,
    pedidoId: r.pedido_id,
    cantidad: parseFloat(r.cantidad) || 0,
    nota: r.nota || "",
    costo: parseFloat(r.costo) || 0,
  };
}

function asigToRow(a) {
  return {
    id: a.id,
    material_id: a.materialId,
    pedido_id: String(a.pedidoId),
    cantidad: parseFloat(a.cantidad) || 0,
    nota: a.nota || null,
    costo: parseFloat(a.costo) || 0,
  };
}

// ── inventario ──

export async function leerItems() {
  try {
    const r = await withRetry(() => fetch(
      `${REST}/taller_inventario?select=*&activo=is.true&order=categoria,descripcion`,
      { headers: HEADERS }
    ));
    if (!r.ok) return [];
    const rows = await r.json();
    return rows.map(rowToItem);
  } catch (e) {
    console.warn("leerItems fallo:", e.message);
    return [];
  }
}

// Upsert: si existe el id ya lo conservamos; merge-duplicates evita
// duplicados pero pisa la categoria (lo cual queremos: si el usuario
// re-clasifica en una nueva importacion, se respeta).
export async function guardarItem(it) {
  try {
    const row = itemToRow(it);
    const r = await fetch(`${REST}/taller_inventario?on_conflict=id`, {
      method: "POST",
      headers: { ...HEADERS, Prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify(row),
    });
    if (!r.ok) {
      const txt = await r.text().catch(() => "");
      return { ok: false, error: txt };
    }
    const rows = await r.json();
    return { ok: true, item: rowToItem(rows[0] || rows) };
  } catch (e) {
    return { ok: false, error: e?.message || String(e) };
  }
}

// Bulk para cuando se importa el DTE — un solo round-trip.
export async function guardarItemsBulk(items) {
  if (!items || items.length === 0) return { ok: true, count: 0 };
  try {
    const rows = items.map(itemToRow);
    const r = await fetch(`${REST}/taller_inventario?on_conflict=id`, {
      method: "POST",
      headers: { ...HEADERS, Prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify(rows),
    });
    if (!r.ok) {
      const txt = await r.text().catch(() => "");
      return { ok: false, error: txt };
    }
    const data = await r.json();
    return { ok: true, count: data.length, items: data.map(rowToItem) };
  } catch (e) {
    return { ok: false, error: e?.message || String(e) };
  }
}

export async function borrarItem(id) {
  try {
    const r = await fetch(`${REST}/taller_inventario?id=eq.${id}`, {
      method: "PATCH",
      headers: { ...HEADERS, Prefer: "return=minimal" },
      body: JSON.stringify({ activo: false }),
    });
    return r.ok;
  } catch { return false; }
}

// ── asignaciones ──

export async function leerAsignaciones() {
  try {
    const r = await withRetry(() => fetch(
      `${REST}/taller_asignaciones?select=*&activo=is.true&order=creado_en.desc`,
      { headers: HEADERS }
    ));
    if (!r.ok) return [];
    const rows = await r.json();
    return rows.map(rowToAsig);
  } catch (e) {
    console.warn("leerAsignaciones fallo:", e.message);
    return [];
  }
}

export async function guardarAsignacion(a) {
  try {
    const row = asigToRow({ ...a, id: a.id || Date.now() });
    const r = await fetch(`${REST}/taller_asignaciones?on_conflict=id`, {
      method: "POST",
      headers: { ...HEADERS, Prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify(row),
    });
    if (!r.ok) {
      const txt = await r.text().catch(() => "");
      return { ok: false, error: txt };
    }
    const rows = await r.json();
    return { ok: true, asignacion: rowToAsig(rows[0] || rows) };
  } catch (e) {
    return { ok: false, error: e?.message || String(e) };
  }
}

export async function borrarAsignacion(id) {
  try {
    const r = await fetch(`${REST}/taller_asignaciones?id=eq.${id}`, {
      method: "PATCH",
      headers: { ...HEADERS, Prefer: "return=minimal" },
      body: JSON.stringify({ activo: false }),
    });
    return r.ok;
  } catch { return false; }
}
