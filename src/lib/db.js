// Cliente PostgREST de Supabase — sin dependencias, fetch directo.
//
// La app genera IDs client-side (Math.max(ids)+1), así que las tablas no
// necesitan IDENTITY — el INSERT trae el id en el payload.
//
// Las operaciones reintentan automáticamente en errores transitorios
// (red caída, 5xx, 429) con backoff exponencial. Ver withRetry.

import { pushToast } from "./feedback.js";
import { withRetry } from "./retry.js";

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
  "archivos",
]);

// ── fetch wrapper ────────────────────────────────────────────

async function rest(path, opts = {}) {
  return withRetry(
    async () => {
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
    },
    {
      onRetry: (err, intento) =>
        console.warn(`db.rest(${path}) reintento ${intento}:`, err.message),
    }
  );
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

// ── Crear una fila NUEVA sin pisar a nadie ───────────────────
//
// upsertTabla sirve para editar, pero es peligroso para crear: los ids se
// calculan en el dispositivo (max(ids)+1) y el refresco en vivo no los
// avanza, así que dos aparatos abiertos a la vez calculan el MISMO id. Con
// `merge-duplicates` el segundo en guardar reemplaza al primero y nadie se
// entera: un pedido registrado desaparece.
//
// Acá el INSERT va sin on_conflict: si el id está tomado, Postgres devuelve
// 23505 y en vez de pisar buscamos el siguiente id libre y reintentamos.

const esIdTomado = e =>
  /\b23505\b|duplicate key|llave duplicada/i.test(String((e && e.message) || ""));

async function maxIdRemoto(tabla) {
  const rows = await rest(`/${tabla}?select=id&order=id.desc&limit=1`);
  return Array.isArray(rows) && rows.length ? Number(rows[0].id) || 0 : 0;
}

// Devuelve el id con el que realmente quedó guardada la fila — puede NO ser
// el que traía el objeto. Quien llama debe usar el devuelto.
// Lanza si falla por red, para que el llamador conserve su manejo de offline.
async function crearFila(tabla, obj, maxIntentos = 6) {
  let id = Number(obj.id) || 1;
  for (let intento = 0; intento < maxIntentos; intento++) {
    try {
      await rest(`/${tabla}`, {
        method: "POST",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify([keysToSnake({ ...obj, id })]),
      });
      return id;
    } catch (e) {
      if (!esIdTomado(e)) throw e;
      // Otro dispositivo se adelantó: preguntamos cuál es el último de verdad.
      const max = await maxIdRemoto(tabla).catch(() => id);
      const siguiente = Math.max(id + 1, max + 1);
      console.warn(`db.crearFila(${tabla}): id ${id} ya estaba tomado, voy con ${siguiente}`);
      id = siguiente;
    }
  }
  throw new Error(`No encontré un id libre en ${tabla} tras ${maxIntentos} intentos`);
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

export const dbLeer        = () => leerTabla("taller_pedidos");
export const dbGuardar     = p => upsertTabla("taller_pedidos", limpiarPedido(p));
// Para pedidos NUEVOS. Devuelve el id real con el que quedó (ver crearFila).
export const dbCrear       = p => crearFila("taller_pedidos", limpiarPedido(p));
export const dbBorrar      = id => borrarPorId("taller_pedidos", id);
export const dbPapelera    = () => leerPapelera("taller_pedidos");
export const dbRestaurar   = id => restaurarPorId("taller_pedidos", id);
export const dbPurgar      = id => purgarPorId("taller_pedidos", id);

function limpiarPedido(p) {
  const { _medCliente, ...rest } = p;
  return {
    ...rest,
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

export const dbBordLeer      = () => leerTabla("taller_bordados");
export const dbBordGuardar   = b  => upsertTabla("taller_bordados", b);
export const dbBordCrear     = b  => crearFila("taller_bordados", b);
export const dbBordBorrar    = id => borrarPorId("taller_bordados", id);
export const dbBordPapelera  = () => leerPapelera("taller_bordados");
export const dbBordRestaurar = id => restaurarPorId("taller_bordados", id);
export const dbBordPurgar    = id => purgarPorId("taller_bordados", id);

// ── Catálogo de diseños de bordado (solo lectura desde la app;
//    se alimenta con el script de carga desde C:\Bordados_UDP) ──

export const dbDisenosLeer   = () => leerTabla("taller_disenos");
export const dbDisenoGuardar = d  => upsertTabla("taller_disenos", d);
export const dbDisenoBorrar  = id => borrarPorId("taller_disenos", id);

// ── Catálogo de diseños de tejido (cuellos/puños) — solo lectura desde
//    la app; se alimenta desde D:\TEJIDOS con el pipeline de análisis .pds ──

export const dbTejidosLeer   = () => leerTabla("taller_tejidos");

// ── Impresos (recuerdos fúnebres, palancas, invitaciones) ────
//    Línea de trabajo aparte de la confección: la app solo los archiva
//    para poder reimprimir cuando el cliente pide más. Los PDF viven en
//    el bucket público "impresos".

export const dbImpresosLeer     = () => leerTabla("taller_impresos");
export const dbImpresoGuardar   = i  => upsertTabla("taller_impresos", i);
export const dbImpresoBorrar    = id => borrarPorId("taller_impresos", id);
export const dbImpresosPapelera = () => leerPapelera("taller_impresos");
export const dbImpresoRestaurar = id => restaurarPorId("taller_impresos", id);

// ── Medidas estándar (tabla maestra) ─────────────────────────
//    taller_medidas_estandar = qué mide la PRENDA TERMINADA en cada talla.
//    taller_moldes           = qué mide cada PIEZA de molde.
//    taller_medidas_dicc     = el vocabulario (un nombre por medida).
//    Las dos primeras no llevan deleted_at, así que no pasan por leerTabla.

async function leerSimple(tabla, orden) {
  try {
    const rows = await rest(`/${tabla}?select=*&order=${orden}&limit=5000`);
    return (rows || []).map(keysToCamel);
  } catch (e) {
    console.error(`db.leerSimple(${tabla}):`, e);
    return [];
  }
}

export const dbMedidasEstandarLeer = () => leerSimple("taller_medidas_estandar", "prenda.asc,talla.asc");
export const dbMedidasDiccLeer     = () => leerSimple("taller_medidas_dicc", "orden.asc");
export const dbMoldesLeer          = () => leerTabla("taller_moldes");

// ── Cuellos ──────────────────────────────────────────────────

export const dbCuelLeer      = () => leerTabla("taller_cuellos");
export const dbCuelGuardar   = c  => upsertTabla("taller_cuellos", c);
export const dbCuelCrear     = c  => crearFila("taller_cuellos", c);
export const dbCuelBorrar    = id => borrarPorId("taller_cuellos", id);
export const dbCuelPapelera  = () => leerPapelera("taller_cuellos");
export const dbCuelRestaurar = id => restaurarPorId("taller_cuellos", id);
export const dbCuelPurgar    = id => purgarPorId("taller_cuellos", id);

// ── Clientes ─────────────────────────────────────────────────

export const dbClientesLeer      = () => leerTabla("taller_clientes");
export const dbClientesGuardar   = cli => upsertTabla("taller_clientes", cli);
export const dbClientesBorrar    = id  => borrarPorId("taller_clientes", id);
export const dbClientesPapelera  = () => leerPapelera("taller_clientes");
export const dbClientesRestaurar = id  => restaurarPorId("taller_clientes", id);
export const dbClientesPurgar    = id  => purgarPorId("taller_clientes", id);

// ── Catálogo ─────────────────────────────────────────────────

export const dbCatalogoLeer    = () => leerTabla("taller_catalogo");
export const dbCatalogoGuardar = async lista => {
  // El catálogo se guarda como lista completa (reemplaza todo).
  // Estrategia: borrar todo lo no incluido y upsert del resto.
  try {
    const ids = lista.map(i => i.id).filter(Boolean);
    if (ids.length) {
      await rest(`/taller_catalogo?id=not.in.(${ids.join(",")})`, {
        method: "DELETE",
        headers: { Prefer: "return=minimal" },
      });
    } else {
      await rest("/taller_catalogo?id=gte.0", {
        method: "DELETE",
        headers: { Prefer: "return=minimal" },
      });
    }
    if (lista.length) {
      await rest("/taller_catalogo?on_conflict=id", {
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
