// Historial de versiones genérico. Sirve para pedidos, bordados y
// cuellos — cada uno tiene su tabla de versiones y trigger BEFORE
// UPDATE en BD que guarda el OLD automático.
//
// Configuración de las 3 entidades en TABLAS abajo. Cada función
// recibe el "tipo" (pedido | bordado | cuello) o usa la específica.

import { withRetry } from "./retry.js";

const SUPA_URL  = "https://kszdievqesveluzcnzsh.supabase.co";
const SUPA_ANON = "sb_publishable_XCwHC4aEI6g4_AFXLXbzIg_QpUL_FpX";
const REST = SUPA_URL + "/rest/v1";
const HEADERS = {
  apikey: SUPA_ANON,
  Authorization: "Bearer " + SUPA_ANON,
  "Content-Type": "application/json",
};

const TABLAS = {
  pedido:  { tabla: "taller_pedidos",  versiones: "taller_pedido_versiones",  fkCol: "pedido_id"  },
  bordado: { tabla: "taller_bordados", versiones: "taller_bordado_versiones", fkCol: "bordado_id" },
  cuello:  { tabla: "taller_cuellos",  versiones: "taller_cuello_versiones",  fkCol: "cuello_id"  },
};

// Genérica
export async function leerVersionesDe(tipo, registroId) {
  const cfg = TABLAS[tipo];
  if (!cfg) return [];
  try {
    const url = `${REST}/${cfg.versiones}?${cfg.fkCol}=eq.${registroId}&order=creado_en.desc&limit=50`;
    const r = await withRetry(() => fetch(url, { headers: HEADERS }));
    if (!r.ok) return [];
    return await r.json();
  } catch (e) {
    console.warn("leerVersionesDe falló:", e.message);
    return [];
  }
}

export async function restaurarVersionDe(tipo, versionId, registroId) {
  const cfg = TABLAS[tipo];
  if (!cfg) return false;
  try {
    const rGet = await fetch(`${REST}/${cfg.versiones}?id=eq.${versionId}&select=snapshot`, { headers: HEADERS });
    if (!rGet.ok) return false;
    const rows = await rGet.json();
    if (!rows[0]?.snapshot) return false;
    const snap = rows[0].snapshot;
    delete snap.id;
    delete snap.deleted_at;
    const rPut = await fetch(`${REST}/${cfg.tabla}?id=eq.${registroId}`, {
      method: "PATCH",
      headers: { ...HEADERS, Prefer: "return=minimal" },
      body: JSON.stringify(snap),
    });
    return rPut.ok;
  } catch (e) {
    console.warn("restaurarVersionDe falló:", e.message);
    return false;
  }
}

// Backwards compat — los call-sites viejos asumen tipo='pedido'
export const leerVersiones = id => leerVersionesDe("pedido", id);
export const restaurarVersion = (vid, id) => restaurarVersionDe("pedido", vid, id);
