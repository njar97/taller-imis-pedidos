// Emisión de DTE desde un pedido, vía el bridge Tlacuilo (emisor-dte).
//
// DISEÑO (acople flojo): esta app NO arma el JSON del DTE de Hacienda. Eso lo
// hace el bridge, que ya tiene los builders FC/CCF validados contra MH. Acá
// solo armamos un PAYLOAD SIMPLE (emisor, tipo, receptor, items con precio
// IVA-incluido) y se lo mandamos al bridge. Así las reglas finas de schema
// (ivaItem, tributos, ivaRete1, totalIva…) viven en un solo lugar.
//
// La firma con el certificado privado y las claves de MH ocurren SOLO en el
// bridge. Esta app es estática y pública: nunca toca secretos.
//
// Si el bridge no está configurado o no responde, la app sigue funcionando
// igual; la feature de facturar simplemente no está disponible.

import { detalleFactura, sumarAbonos } from "./dominio.js";

const LS_TOKEN = "taller_dte_token";   // token Bearer del bridge (localStorage)

// ── Configuración del bridge ─────────────────────────────────────────────
// La URL base es configurable y se guarda en taller_config (compartida entre
// dispositivos). El token vive en localStorage (por dispositivo/operador).
export function leerTokenDTE() {
  try { return localStorage.getItem(LS_TOKEN) || ""; } catch { return ""; }
}
export function guardarTokenDTE(token) {
  try { localStorage.setItem(LS_TOKEN, token || ""); } catch { /* noop */ }
}

/** Normaliza una URL base de bridge: sin slash final. */
export function normalizarBridgeUrl(url) {
  return (url || "").trim().replace(/\/+$/, "");
}

/** ¿Está la feature de facturar disponible? (hay URL de bridge configurada). */
export const facturacionDisponible = (bridgeUrl) => !!normalizarBridgeUrl(bridgeUrl);

// ── Mapeo pedido → tipo de DTE ───────────────────────────────────────────
// "Consumidor Final" → 01 (Factura). "Crédito Fiscal …" → 03 (CCF).
export function tipoDteDePedido(pedido) {
  const td = (pedido?.tipoDocumento || "").toLowerCase();
  if (td.includes("crédito") || td.includes("credito") || td.includes("ccf")) return "03";
  return "01";
}

export const ES_CCF = (tipoDte) => tipoDte === "03";

// ── Items del DTE (precio IVA-incluido, como los maneja el taller) ───────
// modo:
//   "total"    → factura el pedido completo (líneas de detalleFactura)
//   "anticipo" → un solo ítem por el anticipo (deja saldo pendiente)
//   "saldo"    → un solo ítem por el saldo restante
// opts.monto permite forzar el monto del anticipo/saldo; si no, se calcula.
export function construirItemsDTE(pedido, { modo = "total", monto } = {}) {
  const prenda = pedido?.tipoPrenda || "Confección";
  const num = pedido?.id != null ? ` (pedido #${pedido.id})` : "";

  if (modo === "anticipo") {
    const m = monto != null ? Number(monto) : Number(pedido?.anticipo || sumarAbonos(pedido) || 0);
    return [{ descripcion: `Anticipo — ${prenda}${num}`, cantidad: 1, precioUniConIva: round2(m) }];
  }
  if (modo === "saldo") {
    const m = monto != null ? Number(monto) : saldoPendiente(pedido);
    return [{ descripcion: `Saldo — ${prenda}${num}`, cantidad: 1, precioUniConIva: round2(m) }];
  }

  // modo "total": usamos el detalle ya agrupado por tipo+precio.
  const d = detalleFactura(pedido);
  const todasConPrecio = d.lineas.length > 0 && d.lineas.every(l => l.precio != null);
  if (todasConPrecio) {
    return d.lineas.map(l => ({
      descripcion: (l.tipo || prenda),
      cantidad: l.qty,
      precioUniConIva: round2(l.precio),
    }));
  }
  // Fallback: si alguna línea no tiene precio unitario, un solo ítem por el total.
  return [{ descripcion: prenda, cantidad: 1, precioUniConIva: round2(d.total) }];
}

// Monto ya facturado a este pedido sumando los DTE registrados (no anulados).
export function montoYaFacturado(pedido) {
  return (pedido?.dte_emitidos || pedido?.dteEmitidos || [])
    .filter(d => !d.anulado)
    .reduce((s, d) => s + Number(d.monto || 0), 0);
}

// Saldo pendiente de facturar = precio del pedido − lo ya facturado.
export function saldoPendiente(pedido) {
  return round2(Number(pedido?.precio || 0) - montoYaFacturado(pedido));
}

// ── Receptor ─────────────────────────────────────────────────────────────
// Empaqueta los datos del cliente que el pedido tiene. El bridge decide qué
// campos conservar/validar según el tipo de DTE (FC tolera receptor mínimo;
// CCF exige nit/nrc/actividad). No forzamos shape de schema acá.
export function construirReceptor(pedido) {
  const nit = (pedido?.nit || "").trim();
  return {
    nombre: (pedido?.razonSocial || pedido?.cliente || "").trim(),
    nit: nit.replace(/-/g, "") || null,
    nrc: (pedido?.nrc || "").replace(/-/g, "") || null,
    codActividad: pedido?.codActividad || null,
    descActividad: pedido?.descActividad || null,
    direccion: pedido?.dirFiscal ? { complemento: pedido.dirFiscal } : null,
    telefono: pedido?.telefono || null,
    correo: pedido?.correo || null,
  };
}

// Campos del receptor que el CCF exige y el pedido puede no tener. La UI los
// usa para avisar antes de emitir (no para bloquear silenciosamente).
export function faltantesReceptorCCF(pedido) {
  const faltan = [];
  if (!(pedido?.nit || "").trim()) faltan.push("NIT");
  if (!(pedido?.nrc || "").trim()) faltan.push("NRC");
  if (!(pedido?.razonSocial || "").trim()) faltan.push("razón social");
  if (!(pedido?.dirFiscal || "").trim()) faltan.push("dirección fiscal");
  return faltan;
}

// ── Preview de montos (para la UI) ───────────────────────────────────────
// El precio del taller incluye IVA. gravado = total/1.13, iva = total − gravado.
export function previewMontos(pedido, opts = {}) {
  const items = construirItemsDTE(pedido, opts);
  const total = round2(items.reduce((s, it) => s + it.cantidad * it.precioUniConIva, 0));
  const gravado = round2(total / 1.13);
  const iva = round2(total - gravado);
  return { items, total, gravado, iva };
}

// ── Payload para el bridge ───────────────────────────────────────────────
// Contrato POST {bridgeUrl}/emitir-pedido:
//   { nit, ambiente, tipoDte, correlativo, referencia, receptor, items }
// donde items[].precioUniConIva es el precio unitario CON IVA; el bridge deriva
// la base gravada según FC (incluye IVA) o CCF (la separa).
export function construirPayloadPedido({ pedido, empresa, modo = "total", monto, correlativo }) {
  if (!empresa) throw new Error("No hay empresa emisora configurada");
  const tipoDte = tipoDteDePedido(pedido);
  const items = construirItemsDTE(pedido, { modo, monto });
  return {
    nit: (empresa.nit || "").replace(/-/g, ""),
    ambiente: empresa.ambiente || "00",
    tipoDte,
    correlativo: correlativo ?? null,
    referencia: `pedido-${pedido?.id ?? "x"}-${modo}`,
    receptor: construirReceptor(pedido),
    items,
  };
}

// ── Llamadas al bridge ───────────────────────────────────────────────────

/** Health check del bridge. Devuelve {ok, info|error}. */
export async function probarBridge(bridgeUrl) {
  const base = normalizarBridgeUrl(bridgeUrl);
  if (!base) return { ok: false, error: "URL del bridge no configurada" };
  try {
    const r = await fetch(`${base}/estado`, { method: "GET" });
    if (!r.ok) return { ok: false, error: `El bridge respondió HTTP ${r.status}` };
    const info = await r.json();
    return { ok: true, info };
  } catch (e) {
    return { ok: false, error: `No se pudo conectar: ${e.message}` };
  }
}

// Emite el payload al bridge. Devuelve un resultado normalizado:
//   { ok, sello, numeroControl, codigoGeneracion, estado, observaciones, error, pasos }
export async function emitirPedidoDTE({ bridgeUrl, token, payload }) {
  const base = normalizarBridgeUrl(bridgeUrl);
  if (!base) return { ok: false, error: "URL del bridge no configurada" };
  try {
    const r = await fetch(`${base}/emitir-pedido`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: "Bearer " + token } : {}),
      },
      body: JSON.stringify(payload),
    });
    let data = {};
    try { data = await r.json(); } catch { /* respuesta no-JSON */ }
    if (!r.ok || !data.ok) {
      return {
        ok: false,
        error: data.error || `El bridge respondió HTTP ${r.status}`,
        pasos: data.pasos || null,
      };
    }
    return {
      ok: true,
      sello: data.selloRecibido || data.sello || null,
      numeroControl: data.numeroControl || null,
      codigoGeneracion: data.codigoGeneracion || null,
      estado: data.estado || null,
      observaciones: data.observaciones || [],
    };
  } catch (e) {
    return { ok: false, error: `No se pudo conectar con el bridge: ${e.message}` };
  }
}

function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}
