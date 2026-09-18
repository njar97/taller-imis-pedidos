// Base ÚNICA de clientes fiscales (tabla `clientes_fiscales` en Supabase).
//
// Un cliente fiscal es un receptor de DTE: NIT, NRC, razón social, dirección
// con departamento y municipio, actividad, correo. Antes cada app tenía la
// suya (SEDAS estaba lleno en contabilidad y vacío acá). Ahora la alimenta
// el puente con cada DTE sellado, esta app cuando captura datos fiscales, y
// de acá leen todas.

const SUPA_URL = "https://kszdievqesveluzcnzsh.supabase.co";
const SUPA_ANON = "sb_publishable_XCwHC4aEI6g4_AFXLXbzIg_QpUL_FpX";
const H = { apikey: SUPA_ANON, Authorization: "Bearer " + SUPA_ANON, "Content-Type": "application/json" };

export const nitLimpio = (v) => String(v || "").replace(/[^0-9]/g, "");

// Formato con guiones para mostrar: 0315-280396-101-3
export const nitConGuiones = (v) => {
  const n = nitLimpio(v);
  return n.length === 14 ? `${n.slice(0, 4)}-${n.slice(4, 10)}-${n.slice(10, 13)}-${n.slice(13)}` : v || "";
};

export async function buscarClienteFiscal(nit) {
  const n = nitLimpio(nit);
  if (n.length < 9) return null;
  try {
    const r = await fetch(`${SUPA_URL}/rest/v1/clientes_fiscales?nit=eq.${n}&select=*&limit=1`, { headers: H });
    const rows = r.ok ? await r.json() : [];
    return rows[0] || null;
  } catch (e) {
    console.warn("buscarClienteFiscal:", e);
    return null;
  }
}

// Sugerencias por nombre (para el buscador del formulario).
export async function buscarClientesFiscalesPorNombre(q) {
  const t = String(q || "").trim();
  if (t.length < 2) return [];
  try {
    const r = await fetch(
      `${SUPA_URL}/rest/v1/clientes_fiscales?select=nit,nrc,nombre,nombre_comercial,complemento,telefono,correo` +
      `&or=(nombre.ilike.*${encodeURIComponent(t)}*,nombre_comercial.ilike.*${encodeURIComponent(t)}*)&limit=5`,
      { headers: H });
    return r.ok ? await r.json() : [];
  } catch {
    return [];
  }
}

// Guarda lo que el usuario capturó en un pedido. NO pisa lo que ya hay: lo
// que trae un DTE sellado vale más que lo tecleado; solo completa huecos.
export async function guardarClienteFiscal({ nit, nrc, razonSocial, nombreComercial, dirFiscal, telefono, correo }) {
  const n = nitLimpio(nit);
  if (n.length < 9 || !(razonSocial || nombreComercial)) return false;
  try {
    const actual = await buscarClienteFiscal(n);
    const fila = {
      nit: n,
      tipo_documento: n.length === 9 ? "13" : "36",
      nombre: actual?.nombre || String(razonSocial || nombreComercial).trim(),
      nrc: actual?.nrc || nitLimpio(nrc) || null,
      nombre_comercial: actual?.nombre_comercial || nombreComercial || null,
      complemento: actual?.complemento || (dirFiscal || "").trim() || null,
      telefono: actual?.telefono || (telefono || "").trim() || null,
      correo: actual?.correo || (correo || "").trim() || null,
      origen: actual?.origen || "pedidos",
      actualizado_en: new Date().toISOString(),
    };
    const r = await fetch(`${SUPA_URL}/rest/v1/clientes_fiscales?on_conflict=nit`, {
      method: "POST",
      headers: { ...H, Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify([fila]),
    });
    return r.ok;
  } catch (e) {
    console.warn("guardarClienteFiscal:", e);
    return false;
  }
}
