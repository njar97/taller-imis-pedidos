// Máquinas del taller (tablas taller_maquinas + taller_maquina_eventos).
// Mismo patrón REST que proveedores.js: camelCase en la app, snake_case en BD.

import { withRetry } from "./retry.js";

const SUPA_URL  = "https://kszdievqesveluzcnzsh.supabase.co";
const SUPA_ANON = "sb_publishable_XCwHC4aEI6g4_AFXLXbzIg_QpUL_FpX";
const REST = SUPA_URL + "/rest/v1";
const HEADERS = {
  apikey: SUPA_ANON,
  Authorization: "Bearer " + SUPA_ANON,
  "Content-Type": "application/json",
};

export const ESTADOS_MAQ = [
  { id: "ok",      label: "Trabaja",        icon: "🟢", color: "#27AE60" },
  { id: "falla",   label: "Con falla",      icon: "🟡", color: "#E6A100" },
  { id: "parada",  label: "Parada",         icon: "🔴", color: "#DC3545" },
  { id: "reserva", label: "De reserva",     icon: "⚪", color: "#95A5A6" },
];
export const estadoInfo = (id) => ESTADOS_MAQ.find(e => e.id === id) || ESTADOS_MAQ[0];

const CAMPOS = [
  ["codigo", "codigo"], ["tipo", "tipo"], ["marca", "marca"], ["modelo", "modelo"],
  ["serie", "serie"], ["voltaje", "voltaje"], ["motor", "motor"], ["aguja", "aguja"],
  ["operaria", "operaria"], ["uso", "uso"], ["estado", "estado"],
  ["fallaActual", "falla_actual"], ["fotoUrl", "foto_url"], ["fotoPlacaUrl", "foto_placa_url"],
  ["porConfirmar", "por_confirmar"], ["notas", "notas"],
];

export function rowToMaq(r) {
  const m = { id: r.id, activo: r.activo !== false };
  for (const [app, bd] of CAMPOS) m[app] = r[bd] ?? "";
  if (!m.estado) m.estado = "ok";
  return m;
}

export function maqToRow(m) {
  const row = {};
  for (const [app, bd] of CAMPOS) {
    const v = typeof m[app] === "string" ? m[app].trim() : m[app];
    row[bd] = v === "" || v === undefined ? null : v;
  }
  row.codigo = (m.codigo || "").trim().toUpperCase();
  row.tipo = (m.tipo || "").trim();
  row.estado = m.estado || "ok";
  if (m.id) row.id = m.id;
  row.updated_at = new Date().toISOString();
  return row;
}

export function rowToEvento(r) {
  return {
    id: r.id, maquinaId: r.maquina_id, fecha: r.fecha || "",
    falla: r.falla || "", trabajo: r.trabajo || "", repuestos: r.repuestos || "",
    costo: r.costo == null ? "" : Number(r.costo), mecanico: r.mecanico || "",
  };
}

// Orden natural por código: M2 antes que M10.
export function ordenarMaquinas(lista) {
  const num = (c) => parseInt(String(c).replace(/\D/g, ""), 10) || 0;
  return [...lista].sort((a, b) => num(a.codigo) - num(b.codigo) || String(a.codigo).localeCompare(String(b.codigo)));
}

export function filtrarMaquinas(lista, busq, estado) {
  const q = (busq || "").trim().toLowerCase();
  return (lista || []).filter(m => {
    if (estado && estado !== "todos" && m.estado !== estado) return false;
    if (!q) return true;
    return [m.codigo, m.tipo, m.marca, m.modelo, m.operaria, m.uso, m.fallaActual]
      .join(" ").toLowerCase().includes(q);
  });
}

// Siguiente código libre: M21 si la última es M20.
export function siguienteCodigo(lista) {
  const max = (lista || []).reduce((n, m) => Math.max(n, parseInt(String(m.codigo).replace(/\D/g, ""), 10) || 0), 0);
  return "M" + String(max + 1).padStart(2, "0");
}

// Texto para mandarle al mecánico: solo las que fallan o están paradas.
export function textoListaMecanico(lista) {
  const malas = ordenarMaquinas((lista || []).filter(m => m.estado === "falla" || m.estado === "parada"));
  if (malas.length === 0) return "";
  const lineas = malas.map(m => {
    const nombre = [m.tipo, m.marca, m.modelo].filter(Boolean).join(" ");
    const det = [m.voltaje, m.aguja && "aguja " + m.aguja].filter(Boolean).join(" · ");
    return `*${m.codigo}* ${nombre}${det ? " (" + det + ")" : ""}\n` +
      `${m.estado === "parada" ? "🔴 Parada" : "🟡 Trabaja con falla"}: ${m.fallaActual || "(falta describir la falla)"}`;
  });
  return "Máquinas para revisar en el taller:\n\n" + lineas.join("\n\n");
}

export function totalCosto(eventos) {
  return (eventos || []).reduce((s, e) => s + (Number(e.costo) || 0), 0);
}

export async function leerMaquinas() {
  try {
    const r = await withRetry(() => fetch(`${REST}/taller_maquinas?select=*&activo=is.true`, { headers: HEADERS }));
    if (!r.ok) return [];
    return ordenarMaquinas((await r.json()).map(rowToMaq));
  } catch (e) {
    console.warn("leerMaquinas fallo:", e.message);
    return [];
  }
}

export async function guardarMaquina(m) {
  const row = maqToRow(m);
  const url = row.id ? `${REST}/taller_maquinas?id=eq.${row.id}` : `${REST}/taller_maquinas`;
  const r = await fetch(url, {
    method: row.id ? "PATCH" : "POST",
    headers: { ...HEADERS, Prefer: "return=representation" },
    body: JSON.stringify(row),
  });
  if (!r.ok) {
    const t = await r.text().catch(() => "");
    throw new Error(t.includes("duplicate") ? "Ese código ya existe" : "No se pudo guardar la máquina (" + r.status + ")");
  }
  const [saved] = await r.json();
  return rowToMaq(saved);
}

// Baja lógica: se conserva el historial.
export async function borrarMaquina(id) {
  const r = await fetch(`${REST}/taller_maquinas?id=eq.${id}`, {
    method: "PATCH", headers: HEADERS, body: JSON.stringify({ activo: false }),
  });
  if (!r.ok) throw new Error("No se pudo quitar la máquina (" + r.status + ")");
}

export async function leerEventos(maquinaId) {
  try {
    const r = await withRetry(() => fetch(
      `${REST}/taller_maquina_eventos?select=*&maquina_id=eq.${maquinaId}&order=fecha.desc,id.desc`,
      { headers: HEADERS }
    ));
    if (!r.ok) return [];
    return (await r.json()).map(rowToEvento);
  } catch {
    return [];
  }
}

export async function guardarEvento(ev) {
  const t = (v) => (v || "").trim() || null;
  const row = {
    maquina_id: ev.maquinaId, fecha: ev.fecha || null,
    falla: t(ev.falla), trabajo: t(ev.trabajo), repuestos: t(ev.repuestos),
    costo: ev.costo === "" || ev.costo == null ? null : Number(ev.costo),
    mecanico: t(ev.mecanico),
  };
  const r = await fetch(`${REST}/taller_maquina_eventos`, {
    method: "POST", headers: { ...HEADERS, Prefer: "return=representation" }, body: JSON.stringify(row),
  });
  if (!r.ok) throw new Error("No se pudo guardar la reparación (" + r.status + ")");
  const [saved] = await r.json();
  return rowToEvento(saved);
}

export async function borrarEvento(id) {
  const r = await fetch(`${REST}/taller_maquina_eventos?id=eq.${id}`, { method: "DELETE", headers: HEADERS });
  if (!r.ok) throw new Error("No se pudo borrar (" + r.status + ")");
}
