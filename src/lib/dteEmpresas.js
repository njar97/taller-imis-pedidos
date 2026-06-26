// Registro de empresas emisoras de DTE (integración con Tlacuilo / emisor-dte).
//
// Acá vive el perfil fiscal PÚBLICO de cada empresa que emite por Tlacuilo
// (NIT, NRC, nombre, dirección, actividad) + el estado del trámite de
// homologación ante Hacienda. Nada secreto: el certificado y las claves MH
// viven SOLO en el bridge.
//
// Es multi-empresa a propósito: el grupo tiene varias entidades, y otra app
// podría emitir por el mismo bridge. La app de pedidos usa la empresa marcada
// como `predeterminada` (o la primera activa).
//
// Tabla: dte_empresas — ver sql/2026-06-26_dte_empresas.sql.

import { withRetry } from "./retry.js";

const SUPA_URL  = "https://kszdievqesveluzcnzsh.supabase.co";
const SUPA_ANON = "sb_publishable_XCwHC4aEI6g4_AFXLXbzIg_QpUL_FpX";
const REST = SUPA_URL + "/rest/v1";
const HEADERS = {
  apikey: SUPA_ANON,
  Authorization: "Bearer " + SUPA_ANON,
  "Content-Type": "application/json",
};

// ── Workflow de la solicitud de cambio a producción ──────────────────────
// El trámite ante Hacienda es un camino de un solo sentido. Modelarlo como
// estados explícitos hace que el paso quede REGISTRADO en la app (con fechas),
// y permite bloquear la emisión real hasta que MH apruebe.
export const ESTADOS_HOMOLOGACION = [
  "no_iniciada",  // facturación gratuita / aún no se inició el trámite
  "solicitada",   // solicitud de cambio a producción enviada a MH
  "en_pruebas",   // homologación / pruebas dirigidas en apitest
  "aprobada",     // MH aprobó; falta cargar el .crt de producción / hacer el flip
  "produccion",   // emitiendo DTE reales en producción
];

export const ESTADO_LABEL = {
  no_iniciada: "No iniciada",
  solicitada:  "Solicitud enviada a Hacienda",
  en_pruebas:  "En pruebas (homologación)",
  aprobada:    "Aprobada — falta activar producción",
  produccion:  "Producción activa",
};

// Texto de ayuda para cada paso (se muestra en Configuración).
export const ESTADO_AYUDA = {
  no_iniciada: "Todavía estás en facturación gratuita. Iniciá la solicitud de cambio a producción en el portal de Hacienda.",
  solicitada:  "Ya enviaste la solicitud. Esperá que Hacienda habilite el ambiente de pruebas dirigidas.",
  en_pruebas:  "Emitiendo en apitest para completar la homologación. Las facturas NO son tributariamente válidas todavía.",
  aprobada:    "Hacienda aprobó. Cargá el certificado de producción en el bridge y cambiá el ambiente a Producción.",
  produccion:  "Estás emitiendo DTE reales. Cada factura tiene validez tributaria.",
};

/** Índice del estado en el flujo (para comparar avance). -1 si desconocido. */
export const ordenEstado = (estado) => ESTADOS_HOMOLOGACION.indexOf(estado);

/** Solo en "produccion" se permite el ambiente real "01". El resto → "00". */
export const ambientePermitido = (estado) =>
  estado === "produccion" ? "01" : "00";

/** ¿La empresa puede emitir DTE con validez tributaria (producción real)? */
export const puedeEmitirProduccion = (empresa) =>
  !!empresa && empresa.estadoHomologacion === "produccion" && empresa.ambiente === "01";

// Mapea fila de la BD (snake_case) → objeto de app (camelCase).
function rowToEmpresa(r) {
  return {
    id: r.id,
    nombre: r.nombre || "",
    nit: r.nit || "",
    nrc: r.nrc || "",
    nombreComercial: r.nombre_comercial || "",
    codActividad: r.cod_actividad || "",
    descActividad: r.desc_actividad || "",
    tipoEstablecimiento: r.tipo_establecimiento || "02",
    departamento: r.departamento || "",
    municipio: r.municipio || "",
    complementoDir: r.complemento_dir || "",
    telefono: r.telefono || "",
    correo: r.correo || "",
    codEstableMH: r.cod_estable_mh || "M001",
    codEstable: r.cod_estable || "0001",
    codPuntoVentaMH: r.cod_punto_venta_mh || "P001",
    codPuntoVenta: r.cod_punto_venta || "0001",
    ambiente: r.ambiente || "00",
    estadoHomologacion: r.estado_homologacion || "no_iniciada",
    fechaSolicitud: r.fecha_solicitud || null,
    fechaAprobacion: r.fecha_aprobacion || null,
    correlativos: r.correlativos || {},
    activa: r.activa !== false,
    predeterminada: !!r.predeterminada,
    notas: r.notas || "",
  };
}

// Mapea objeto de app (camelCase) → fila de la BD (snake_case), solo las
// columnas editables (no toca id/correlativos/timestamps).
function empresaToRow(e) {
  const row = {
    nombre: e.nombre,
    nit: e.nit,
    nrc: e.nrc || null,
    nombre_comercial: e.nombreComercial || null,
    cod_actividad: e.codActividad || null,
    desc_actividad: e.descActividad || null,
    tipo_establecimiento: e.tipoEstablecimiento || "02",
    departamento: e.departamento || "06",
    municipio: e.municipio || "14",
    complemento_dir: e.complementoDir || null,
    telefono: e.telefono || null,
    correo: e.correo || null,
    cod_estable_mh: e.codEstableMH || "M001",
    cod_estable: e.codEstable || "0001",
    cod_punto_venta_mh: e.codPuntoVentaMH || "P001",
    cod_punto_venta: e.codPuntoVenta || "0001",
    ambiente: e.ambiente || "00",
    estado_homologacion: e.estadoHomologacion || "no_iniciada",
    fecha_solicitud: e.fechaSolicitud || null,
    fecha_aprobacion: e.fechaAprobacion || null,
    activa: e.activa !== false,
    predeterminada: !!e.predeterminada,
    notas: e.notas || null,
    actualizado_en: new Date().toISOString(),
  };
  return row;
}

/** Lee todas las empresas emisoras (activas primero, predeterminada arriba). */
export async function leerEmpresas() {
  try {
    const r = await withRetry(() => fetch(
      `${REST}/dte_empresas?select=*&order=predeterminada.desc,activa.desc,nombre.asc`,
      { headers: HEADERS }
    ));
    if (!r.ok) return [];
    const rows = await r.json();
    return rows.map(rowToEmpresa);
  } catch (e) {
    console.warn("leerEmpresas falló:", e.message);
    return [];
  }
}

/** La empresa que la app usa por defecto: la predeterminada, o la primera activa. */
export function empresaPredeterminada(empresas) {
  if (!empresas || !empresas.length) return null;
  return empresas.find(e => e.predeterminada && e.activa)
      || empresas.find(e => e.activa)
      || null;
}

/** Crea (POST) o actualiza (PATCH si trae id) una empresa. Devuelve {ok, id}. */
export async function guardarEmpresa(empresa) {
  const row = empresaToRow(empresa);
  try {
    if (empresa.id) {
      const r = await fetch(`${REST}/dte_empresas?id=eq.${empresa.id}`, {
        method: "PATCH",
        headers: { ...HEADERS, Prefer: "return=minimal" },
        body: JSON.stringify(row),
      });
      return { ok: r.ok, id: empresa.id };
    }
    const r = await fetch(`${REST}/dte_empresas`, {
      method: "POST",
      headers: { ...HEADERS, Prefer: "return=representation" },
      body: JSON.stringify(row),
    });
    if (!r.ok) return { ok: false };
    const [creada] = await r.json();
    return { ok: true, id: creada?.id };
  } catch (e) {
    console.warn("guardarEmpresa falló:", e.message);
    return { ok: false };
  }
}

// Avanza/ajusta el estado del trámite y deja registrada la fecha del paso.
// Aplica la regla de ambiente: si no está en producción, fuerza ambiente "00".
export async function actualizarEstado(id, estado, extra = {}) {
  const patch = {
    estado_homologacion: estado,
    ambiente: ambientePermitido(estado),
    actualizado_en: new Date().toISOString(),
  };
  if (estado === "solicitada" && !extra.fechaSolicitud) {
    patch.fecha_solicitud = new Date().toISOString().slice(0, 10);
  }
  if (estado === "aprobada" && !extra.fechaAprobacion) {
    patch.fecha_aprobacion = new Date().toISOString().slice(0, 10);
  }
  if (extra.fechaSolicitud) patch.fecha_solicitud = extra.fechaSolicitud;
  if (extra.fechaAprobacion) patch.fecha_aprobacion = extra.fechaAprobacion;
  if (extra.notas != null) patch.notas = extra.notas;
  try {
    const r = await fetch(`${REST}/dte_empresas?id=eq.${id}`, {
      method: "PATCH",
      headers: { ...HEADERS, Prefer: "return=minimal" },
      body: JSON.stringify(patch),
    });
    return r.ok;
  } catch (e) {
    console.warn("actualizarEstado falló:", e.message);
    return false;
  }
}

/** Pide el siguiente correlativo atómico para (empresa, tipoDte) via RPC. */
export async function siguienteCorrelativo(empresaId, tipo) {
  try {
    const r = await fetch(`${REST}/rpc/dte_siguiente_correlativo`, {
      method: "POST",
      headers: HEADERS,
      body: JSON.stringify({ p_empresa_id: empresaId, p_tipo: tipo }),
    });
    if (!r.ok) return null;
    return await r.json(); // un entero
  } catch (e) {
    console.warn("siguienteCorrelativo falló:", e.message);
    return null;
  }
}

// Agrega un DTE al historial del pedido (taller_pedidos.dte_emitidos). Recibe
// la lista actual (la app la tiene en memoria) y le hace append — evita un
// read-modify-write con condición de carrera para el caso de un solo operador.
export async function registrarDTEEmitido(pedidoId, listaActual, dteInfo) {
  const nueva = [...(listaActual || []), dteInfo];
  try {
    const r = await fetch(`${REST}/taller_pedidos?id=eq.${pedidoId}`, {
      method: "PATCH",
      headers: { ...HEADERS, Prefer: "return=minimal" },
      body: JSON.stringify({ dte_emitidos: nueva }),
    });
    return { ok: r.ok, lista: nueva };
  } catch (e) {
    console.warn("registrarDTEEmitido falló:", e.message);
    return { ok: false, lista: listaActual || [] };
  }
}
