// Directorio de proveedores del taller (tabla taller_proveedores).
// Mismo patrón REST que inventario.js: camelCase en la app, snake_case en BD.

import { withRetry } from "./retry.js";

const SUPA_URL  = "https://kszdievqesveluzcnzsh.supabase.co";
const SUPA_ANON = "sb_publishable_XCwHC4aEI6g4_AFXLXbzIg_QpUL_FpX";
const REST = SUPA_URL + "/rest/v1";
const HEADERS = {
  apikey: SUPA_ANON,
  Authorization: "Bearer " + SUPA_ANON,
  "Content-Type": "application/json",
};

export const RUBROS_PROV = [
  "Telas", "Avíos", "DTF", "Sublimación", "Bordado", "Tejido", "Hilos",
  "Impresión", "Maquinaria", "Repuestos", "Empaque", "Otro",
];

function rowToProv(r) {
  return {
    id: r.id,
    nombre: r.nombre || "",
    rubros: Array.isArray(r.rubros) ? r.rubros : [],
    whatsapp: r.whatsapp || "",
    telefono: r.telefono || "",
    correo: r.correo || "",
    direccion: r.direccion || "",
    ciudad: r.ciudad || "",
    precios: r.precios || "",
    notas: r.notas || "",
    ultimoContacto: r.ultimo_contacto || "",
    activo: r.activo !== false,
  };
}

function provToRow(p) {
  const t = (v) => (v || "").trim() || null;
  return {
    id: p.id,
    nombre: (p.nombre || "").trim(),
    rubros: (p.rubros || []).filter(Boolean),
    whatsapp: t(p.whatsapp),
    telefono: t(p.telefono),
    correo: t(p.correo),
    direccion: t(p.direccion),
    ciudad: t(p.ciudad),
    precios: t(p.precios),
    notas: t(p.notas),
    ultimo_contacto: t(p.ultimoContacto),
    activo: p.activo !== false,
  };
}

// Solo dígitos, con 503 adelante si viene un número local de 8 cifras.
export function normalizarWA(s) {
  const d = String(s || "").replace(/\D/g, "");
  if (!d) return "";
  return d.length === 8 ? "503" + d : d;
}

export function linkWA(s, texto = "") {
  const n = normalizarWA(s);
  if (!n) return "";
  return "https://wa.me/" + n + (texto ? "?text=" + encodeURIComponent(texto) : "");
}

export function filtrarProveedores(lista, busq, rubro) {
  const q = (busq || "").trim().toLowerCase();
  return (lista || []).filter(p => {
    if (rubro && rubro !== "todos" && !(p.rubros || []).includes(rubro)) return false;
    if (!q) return true;
    const blob = [p.nombre, p.ciudad, p.direccion, p.precios, p.notas, (p.rubros || []).join(" ")]
      .join(" ").toLowerCase();
    return blob.includes(q);
  });
}

export async function leerProveedores() {
  try {
    const r = await withRetry(() => fetch(
      `${REST}/taller_proveedores?select=*&activo=is.true&order=nombre`,
      { headers: HEADERS }
    ));
    if (!r.ok) return [];
    const rows = await r.json();
    return rows.map(rowToProv);
  } catch (e) {
    console.warn("leerProveedores fallo:", e.message);
    return [];
  }
}

export async function guardarProveedor(p) {
  const row = provToRow(p);
  if (!row.id) delete row.id;
  const r = await fetch(`${REST}/taller_proveedores${row.id ? "?on_conflict=id" : ""}`, {
    method: "POST",
    headers: { ...HEADERS, Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify(row),
  });
  if (!r.ok) throw new Error("No se pudo guardar el proveedor (" + r.status + ")");
  const [saved] = await r.json();
  return rowToProv(saved);
}

// Baja lógica: conserva el historial de precios.
export async function borrarProveedor(id) {
  const r = await fetch(`${REST}/taller_proveedores?id=eq.${id}`, {
    method: "PATCH",
    headers: HEADERS,
    body: JSON.stringify({ activo: false }),
  });
  if (!r.ok) throw new Error("No se pudo borrar el proveedor (" + r.status + ")");
}
