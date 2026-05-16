// Cliente PostgREST de Supabase — sin dependencias, fetch directo.
// Espejo de api.js pero apuntando a Postgres en vez del Apps Script.
//
// Estado: ALPHA — no usar todavía como backend principal. Activar sólo cuando
// se haya aplicado docs/postgres-migration.sql en el proyecto Supabase
// y se haya migrado la data desde Google Sheets.
//
// La app sigue generando IDs client-side (Math.max(ids)+1), así que las
// tablas no necesitan IDENTITY — el INSERT trae el id en el payload.

import { pushToast } from "./feedback.js";

const SUPA_URL = "https://kszdievqesveluzcnzsh.supabase.co";
const SUPA_ANON = "sb_publishable_XCwHC4aEI6g4_AFXLXbzIg_QpUL_FpX";
const REST = SUPA_URL + "/rest/v1";

const HEADERS = {
  apikey: SUPA_ANON,
  Authorization: "Bearer " + SUPA_ANON,
  "Content-Type": "application/json",
};

// ── helpers de mapeo camelCase ↔ snake_case ──────────────────

const toSnake = s => s.replace(/[A-Z]/g, c => "_" + c.toLowerCase());
const toCamel = s => s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());

function keysToSnake(o) {
  if (Array.isArray(o)) return o;
  if (!o || typeof o !== "object") return o;
  const out = {};
  for (const k in o) out[toSnake(k)] = o[k];
  return out;
}

function keysToCamel(o) {
  if (!o || typeof o !== "object") return o;
  const out = {};
  for (const k in o) out[toCamel(k)] = o[k];
  return out;
}

// Campos jsonb que vienen del DB ya parseados — no tocar
const JSONB_KEYS = new Set([
  "tallasQty", "tallasItems", "imagenes", "abonos", "medidas", "personas", "piezas",
]);

// ── fetch wrapper ────────────────────────────────────────────

async function rest(path, opts = {}) {
  const r = await fetch(REST + path, {
    ...opts,
    headers: { ...HEADERS, ...(opts.headers || {}) },
  });
  if (!r.ok) {
    const txt = await r.text().catch(() => "");
    throw new Error(`PostgREST ${r.status}: ${txt.slice(0, 200)}`);
  }
  // DELETE devuelve vacío
  const ct = r.headers.get("content-type") || "";
  if (!ct.includes("application/json")) return null;
  return r.json();
}

async function leerTabla(tabla) {
  try {
    // Filtra borrados (soft-delete). Para ver la papelera, usar leerPapelera.
    const rows = await rest(`/${tabla}?select=*&deleted_at=is.null&order=id.desc&limit=10000`);
    return (rows || []).map(keysToCamel);
  } catch (e) {
    console.error(`db.leerTabla(${tabla}):`, e);
    return [];
  }
}

async function leerPapelera(tabla) {
  try {
    const rows = await rest(`/${tabla}?select=*&deleted_at=not.is.null&order=deleted_at.desc&limit=10000`);
    return (rows || []).map(keysToCamel);
  } catch (e) {
    console.error(`db.leerPapelera(${tabla}):`, e);
    return [];
  }
}

async function upsertTabla(tabla, obj) {
  try {
    const body = JSON.stringify([keysToSnake(obj)]);
    await rest(`/${tabla}?on_conflict=id`, {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body,
    });
    return true;
  } catch (e) {
    console.error(`db.upsertTabla(${tabla}):`, e);
    pushToast(`No pude guardar en ${tabla}`, "error");
    return false;
  }
}

// Soft-delete: marca deleted_at = now() en vez de DELETE.
// El registro queda recuperable hasta que se purgue manualmente.
async function borrarPorId(tabla, id) {
  try {
    await rest(`/${tabla}?id=eq.${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ deleted_at: new Date().toISOString() }),
    });
    return true;
  } catch (e) {
    console.error(`db.borrarPorId(${tabla}, ${id}):`, e);
    pushToast(`No pude borrar de ${tabla}`, "error");
    return false;
  }
}

async function restaurarPorId(tabla, id) {
  try {
    await rest(`/${tabla}?id=eq.${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ deleted_at: null }),
    });
    return true;
  } catch (e) {
    console.error(`db.restaurarPorId(${tabla}, ${id}):`, e);
    pushToast(`No pude restaurar de ${tabla}`, "error");
    return false;
  }
}

// Borrado definitivo (purge) — para uso administrativo en la papelera.
async function purgarPorId(tabla, id) {
  try {
    await rest(`/${tabla}?id=eq.${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: { Prefer: "return=minimal" },
    });
    return true;
  } catch (e) {
    console.error(`db.purgarPorId(${tabla}, ${id}):`, e);
    pushToast(`No pude purgar de ${tabla}`, "error");
    return false;
  }
}

// ── Pedidos ──────────────────────────────────────────────────

export const dbLeer        = () => leerTabla("pedidos");
export const dbGuardar     = p => upsertTabla("pedidos", limpiarPedido(p));
export const dbBorrar      = id => borrarPorId("pedidos", id);
export const dbPapelera    = () => leerPapelera("pedidos");
export const dbRestaurar   = id => restaurarPorId("pedidos", id);
export const dbPurgar      = id => purgarPorId("pedidos", id);

function limpiarPedido(p) {
  return {
    ...p,
    imagenes: (p.imagenes || []).map(img => ({
      nombre: img.nombre,
      tipo: img.tipo,
      driveUrl: img.driveUrl || null,
      driveId: img.driveId || null,
      supabaseUrl: img.supabaseUrl || null,
      supabasePath: img.supabasePath || null,
    })),
  };
}

// ── Bordados ─────────────────────────────────────────────────

export const dbBordLeer      = () => leerTabla("bordados");
export const dbBordGuardar   = b  => upsertTabla("bordados", b);
export const dbBordBorrar    = id => borrarPorId("bordados", id);
export const dbBordPapelera  = () => leerPapelera("bordados");
export const dbBordRestaurar = id => restaurarPorId("bordados", id);
export const dbBordPurgar    = id => purgarPorId("bordados", id);

// ── Cuellos ──────────────────────────────────────────────────

export const dbCuelLeer      = () => leerTabla("cuellos");
export const dbCuelGuardar   = c  => upsertTabla("cuellos", c);
export const dbCuelBorrar    = id => borrarPorId("cuellos", id);
export const dbCuelPapelera  = () => leerPapelera("cuellos");
export const dbCuelRestaurar = id => restaurarPorId("cuellos", id);
export const dbCuelPurgar    = id => purgarPorId("cuellos", id);

// ── Clientes ─────────────────────────────────────────────────

export const dbClientesLeer      = () => leerTabla("clientes");
export const dbClientesGuardar   = cli => upsertTabla("clientes", cli);
export const dbClientesBorrar    = id  => borrarPorId("clientes", id);
export const dbClientesPapelera  = () => leerPapelera("clientes");
export const dbClientesRestaurar = id  => restaurarPorId("clientes", id);
export const dbClientesPurgar    = id  => purgarPorId("clientes", id);

// ── Catálogo ─────────────────────────────────────────────────

export const dbCatalogoLeer    = () => leerTabla("catalogo");
export const dbCatalogoGuardar = async lista => {
  // El catálogo se guarda como lista completa (reemplaza todo).
  // Estrategia: borrar todo lo no incluido y upsert del resto.
  try {
    const ids = lista.map(i => i.id).filter(Boolean);
    if (ids.length) {
      await rest(`/catalogo?id=not.in.(${ids.join(",")})`, {
        method: "DELETE",
        headers: { Prefer: "return=minimal" },
      });
    } else {
      await rest("/catalogo?id=gte.0", {
        method: "DELETE",
        headers: { Prefer: "return=minimal" },
      });
    }
    if (lista.length) {
      await rest("/catalogo?on_conflict=id", {
        method: "POST",
        headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
        body: JSON.stringify(lista.map(keysToSnake)),
      });
    }
    return true;
  } catch (e) {
    console.error("db.dbCatalogoGuardar:", e);
    pushToast("No pude guardar el catálogo", "error");
    return false;
  }
};
