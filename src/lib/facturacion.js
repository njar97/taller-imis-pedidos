// Emisión de facturas electrónicas (DTE) desde un pedido, vía el puente MH
// (endpoint /emitir-pedido del bridge del emisor Tlacuilo). El bridge arma el
// JSON oficial del MH con los builders ya validados en homologación; acá solo
// mandamos un payload simple (receptor + ítems con precio IVA incluido).
//
// Autenticación: token Bearer de larga duración del bridge (/api/api-token),
// guardado en localStorage. El usuario lo obtiene una vez con su usuario y
// contraseña de Tlacuilo (rol admin o emisor).
//
// Correlativo: vive en la tabla `taller_facturas` (UNIQUE tipo+ambiente+corr).
// Si el MH rechaza por número de control repetido (p.ej. se emitió algo desde
// Tlacuilo directo), se reintenta con el siguiente correlativo.

import { withRetry } from "./retry.js";
import { detalleFactura, fmt$ } from "./dominio.js";

const PUENTE = "https://emisor-imis.duckdns.org";
const TOKEN_KEY = "taller_puente_token";

// Ambiente MH: "00" PRUEBAS por defecto. Producción se elige a propósito, con
// el selector del bloque de facturación (o localStorage "taller_dte_ambiente").
// Antes el default era "01": un clic accidental transmitía de verdad.
export const ambienteDte = () =>
  localStorage.getItem("taller_dte_ambiente") === "01" ? "01" : "00";

export const setAmbienteDte = (amb) =>
  localStorage.setItem("taller_dte_ambiente", amb === "01" ? "01" : "00");

// ── Perfiles fiscales de los emisores ──
// Los dos están validados por el MH y sus certificados ya están cargados en el
// puente (Tlacuilo). El NRC va sin guion; el NIT sin guiones lo normaliza el
// bridge. Los pedidos del taller facturan por IMIS o por JAV según el caso.
export const EMISORES = {
  imis: {
    etiqueta: "UDP Confecciones IMIS",
    nit: "03151010111012",
    nrc: "2115900",
    nombre: "UDP CONFECCIONES IMIS",
    codActividad: "13999",
    descActividad: "Fabricación de productos textiles ncp",
    nombreComercial: "CONFECCIONES IMIS",
    tipoEstablecimiento: "02",
    direccion: {
      departamento: "03",
      municipio: "15",
      complemento: "AV. CENTROAMERICANA, COL. SANTA MARTA, # 5-A,",
    },
    telefono: "24511620",
    correo: "confecciones_imis@hotmail.com",
    codEstableMH: "M001",
    codEstable: "0001",
    codPuntoVentaMH: "P001",
    codPuntoVenta: "0001",
  },
  jav: {
    etiqueta: "Carymel Bazar y Confección (Nelson Javier)",
    nit: "03151202971040",
    nrc: "3155220",
    nombre: "Nelson Javier Ramirez Mancia",
    codActividad: "14103",
    descActividad: "Fabricación de Prendas de vestir para ambos sexos",
    nombreComercial: "Carymel Bazar y Confección",
    tipoEstablecimiento: "02",
    direccion: {
      departamento: "03",
      municipio: "15",
      complemento: "Colonia Santa Marta Avenida Centroamericana Casa #9-A",
    },
    telefono: "78669963",
    correo: "njrmancia@gmail.com",
    codEstableMH: "M001",
    codEstable: "0001",
    codPuntoVentaMH: "P001",
    codPuntoVenta: "0001",
  },
};

const EMISOR_KEY = "taller_dte_emisor";

// Cuál emite. Default IMIS: es la empresa que la app representa en todos los
// PDFs. Antes estaba fijo en JAV y los DTE habrían salido a nombre equivocado.
export const emisorActivo = () =>
  localStorage.getItem(EMISOR_KEY) === "jav" ? "jav" : "imis";

export const setEmisorActivo = (k) =>
  localStorage.setItem(EMISOR_KEY, k === "jav" ? "jav" : "imis");

const emisorDatos = () => EMISORES[emisorActivo()];

// ── Supabase (registro de facturas emitidas + correlativo) ──

const SUPA_URL = "https://kszdievqesveluzcnzsh.supabase.co";
const SUPA_ANON = "sb_publishable_XCwHC4aEI6g4_AFXLXbzIg_QpUL_FpX";
const SUPA_HEADERS = {
  apikey: SUPA_ANON,
  Authorization: "Bearer " + SUPA_ANON,
  "Content-Type": "application/json",
};

async function supa(path, opts = {}) {
  return withRetry(async () => {
    const r = await fetch(SUPA_URL + "/rest/v1" + path, {
      ...opts,
      headers: { ...SUPA_HEADERS, ...(opts.headers || {}) },
    });
    if (!r.ok) throw new Error(`PostgREST ${r.status}: ${(await r.text().catch(() => "")).slice(0, 200)}`);
    const ct = r.headers.get("content-type") || "";
    return ct.includes("application/json") ? r.json() : null;
  });
}

// TODAS las facturas del pedido, sin filtrar por el emisor activo: si no, al
// cambiar de emisor en el selector las facturas ya emitidas desaparecían de la
// vista y parecía que se habían perdido.
export async function facturasDePedido(pedidoId) {
  try {
    return await supa(`/taller_facturas?pedido_id=eq.${pedidoId}&order=id.desc`);
  } catch (e) {
    console.error("facturasDePedido:", e);
    return [];
  }
}

// Dónde arranca la numeración cuando esta app todavía no emitió nada por ese
// NIT. NO puede ser 1: el numeroControl tiene que ser único ante Hacienda y
// IMIS ya gastó la serie M001P001 emitiendo desde el portal gratuito del MH
// (12-ago-2026: FC hasta la 22 y CCF hasta la 6, y la base de correos puede no
// tenerlas todas). Arrancar en 1 hizo que el MH rechazara con
// "[identificacion.numeroControl] YA EXISTE UN REGISTRO CON ESE VALOR".
// Un bloque alto y redondo evita el choque y además deja a simple vista qué
// DTE salió de esta app y cuál del portal viejo.
const CORR_INICIAL = {
  "03151010111012": 1000, // UDP Confecciones IMIS
};

// La serie de correlativos es POR CONTRIBUYENTE: cada NIT lleva su propia
// numeración de DTE ante Hacienda, así que nunca se mezcla con otro emisor.
async function siguienteCorrelativo(tipo, ambiente) {
  const nit = emisorDatos().nit;
  const rows = await supa(
    `/taller_facturas?nit_emisor=eq.${nit}&tipo_dte=eq.${tipo}&ambiente=eq.${ambiente}` +
    `&select=correlativo&order=correlativo.desc&limit=1`
  );
  if (rows && rows.length) return Number(rows[0].correlativo) + 1;
  // En pruebas (00) no hay serie que respetar: ahí sí se empieza en 1.
  return ambiente === "01" ? (CORR_INICIAL[nit] || 1) : 1;
}

// ── Token del puente ──

export const tieneTokenPuente = () => !!localStorage.getItem(TOKEN_KEY);

export async function loginPuente(username, password) {
  const r = await fetch(PUENTE + "/api/api-token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok || !data.ok) throw new Error(data.error || `Error ${r.status} del puente`);
  localStorage.setItem(TOKEN_KEY, data.token);
  return data.usuario;
}

export function olvidarTokenPuente() {
  localStorage.removeItem(TOKEN_KEY);
}

// ── Validación previa ──

// Qué tipo de DTE pide el pedido por su ficha (lo que el cliente acordó).
// Es solo la sugerencia: al facturar se puede elegir otro en el selector.
export const tipoSugerido = (pedido) =>
  (pedido?.tipoDocumento || "").startsWith("Crédito Fiscal") ? "03" : "01";

// Cuánto lleva facturado el pedido (sin contar lo anulado) y cuánto falta.
// Sirve para no facturar dos veces lo mismo al dividir por partes o cobrar
// anticipos: sin este número, cada factura se arma "a ciegas".
export function totalFacturado(facturas, totalPedido) {
  const facturado = +(facturas || [])
    .filter(f => !(f.estado || "").toUpperCase().startsWith("ANULAD"))
    .reduce((s, f) => s + (parseFloat(f.total) || 0), 0)
    .toFixed(2);
  const saldo = totalPedido != null ? +(totalPedido - facturado).toFixed(2) : null;
  return { facturado, saldo };
}

// Decide tipo de DTE y valida que el pedido tenga lo necesario.
//
// `opciones`:
//   tipo:      "01" | "03" — si no viene, manda lo que dice la ficha del pedido.
//   receptor:  { nit, nrc, razonSocial, dirFiscal } editado en el momento de
//              facturar. Si no viene, se usan los datos guardados en el pedido.
//   lineas:    subconjunto (o cantidades editadas) de detalleFactura(pedido).lineas
//              — para facturar solo parte del carrito. Si no viene, va TODO.
//   anticipo:  { monto, nota? } — factura por un monto libre en vez del carrito,
//              con una sola línea de texto. Ignora `lineas` si viene.
//
// Devuelve { ok, tipo, receptor, lineas, total, avisos[], esAnticipo } o
// { ok:false, error }.
export function prepararFacturaPedido(pedido, opciones = {}) {
  const { tipo: tipoForzado, receptor: receptorEditado, lineas: lineasElegidas, anticipo } = opciones;

  const sugerido = tipoSugerido(pedido);
  const tipo = tipoForzado === "01" || tipoForzado === "03" ? tipoForzado : sugerido;
  const esCcf = tipo === "03";

  // Los datos editados en el momento pisan a los guardados en el pedido —
  // así se puede corregir un NIT mal tecleado sin ir al formulario del pedido.
  const base = receptorEditado || pedido;
  const nit = (base.nit || "").replace(/-/g, "").trim();
  const nrc = (base.nrc || "").replace(/-/g, "").trim();
  const dirFiscal = (base.dirFiscal || "").trim();
  const nombreFiscal = (
    (receptorEditado && receptorEditado.razonSocial) || pedido.razonSocial || pedido.cliente || ""
  ).trim();

  if (esCcf && (!nit || !nrc))
    return {
      ok: false,
      error: "Para Crédito Fiscal hacen falta el NIT y el NRC del cliente — completalos acá mismo, o emití Factura de consumidor final.",
    };

  const receptor = { nit: nit || "", nrc: nrc || "", nombre: nombreFiscal };
  if (dirFiscal) receptor.direccion = { complemento: dirFiscal };

  const avisos = [];
  if (!esCcf && !nit) avisos.push("Sin NIT del cliente → va como consumidor final (sin receptor).");
  if (tipo !== sugerido)
    avisos.push(
      sugerido === "03"
        ? "El pedido pide Crédito Fiscal y vas a emitir Factura de consumidor final: el cliente NO podrá usar el crédito fiscal."
        : "El pedido pide Factura de consumidor final y vas a emitir Crédito Fiscal."
    );

  const d = detalleFactura(pedido);

  // ── Modo anticipo: una sola línea por el monto libre, no toca el carrito ──
  if (anticipo && Number(anticipo.monto) > 0) {
    const monto = +Number(anticipo.monto).toFixed(2);
    const saldo = +(d.total - monto).toFixed(2);
    const nota = (anticipo.nota || "").trim() ||
      `Anticipo. Total pedido ${fmt$(d.total)} · Saldo pendiente ${fmt$(saldo)}`;
    return {
      ok: true, tipo, receptor,
      lineas: [{ tipo: nota, precio: monto, qty: 1, subtotal: monto }],
      total: monto,
      avisos,
      esAnticipo: true,
    };
  }

  if (!d.lineas.length) return { ok: false, error: "El pedido no tiene ítems para facturar." };
  if (d.lineas.some(l => l.precio == null))
    return { ok: false, error: "Hay ítems sin precio unitario — completá los precios en el pedido antes de facturar." };

  const lineas = (lineasElegidas && lineasElegidas.length) ? lineasElegidas : d.lineas;
  if (!lineas.length) return { ok: false, error: "Elegí al menos un ítem para facturar." };

  const esParcial = lineas !== d.lineas;
  const total = +lineas.reduce((s, l) => s + l.precio * l.qty, 0).toFixed(2);

  if (!esParcial && d.descuadre)
    avisos.push(
      `La factura saldrá por la suma de líneas (${fmt$(d.sumaLineas)}), que NO coincide con el precio del pedido (${fmt$(d.total)}).`
    );
  if (esParcial) avisos.push(`Factura PARCIAL del carrito — no incluye todos los ítems del pedido.`);

  return { ok: true, tipo, receptor, lineas, total, avisos };
}

// ── Emisión ──

function esErrorNumeroControlRepetido(data) {
  const txt = [data?.error, data?.descripcionMsg, ...(data?.observaciones || [])].join(" ").toLowerCase();
  return txt.includes("numero de control") || txt.includes("número de control") || txt.includes("numerocontrol");
}

// Emite el DTE del pedido. Devuelve el registro guardado en taller_facturas.
// `opciones` es lo mismo que recibe prepararFacturaPedido (tipo, receptor,
// lineas, anticipo). Lanza Error con mensaje legible si algo falla.
export async function emitirFacturaPedido(pedido, opciones = {}) {
  const prep = prepararFacturaPedido(pedido, opciones);
  if (!prep.ok) throw new Error(prep.error);

  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) throw new Error("Sin token del puente — conectate primero.");

  const ambiente = ambienteDte();
  const items = prep.lineas.map(l => ({
    descripcion: l.tipo,
    cantidad: l.qty,
    precioUniConIva: l.precio,
  }));

  let corr = await siguienteCorrelativo(prep.tipo, ambiente);
  let ultimoError = null;

  // Hasta 3 intentos SOLO si el rechazo es por número de control repetido
  // (correlativo ya usado por otra vía, p.ej. Tlacuilo). Otros errores no
  // reintentan: un rechazo de MH no se resuelve reenviando lo mismo.
  for (let intento = 0; intento < 3; intento++) {
    const r = await fetch(PUENTE + "/emitir-pedido", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
      body: JSON.stringify({
        nit: emisorDatos().nit,
        ambiente,
        tipoDte: prep.tipo,
        correlativo: corr,
        emisor: emisorDatos(),
        receptor: prep.receptor,
        items,
      }),
    });
    const data = await r.json().catch(() => ({}));

    if (r.status === 401) {
      olvidarTokenPuente();
      throw new Error("El puente rechazó el token (vencido o revocado) — volvé a conectarte.");
    }

    if (data.ok) {
      const registro = {
        pedido_id: pedido.id,
        nit_emisor: emisorDatos().nit,
        tipo_dte: prep.tipo,
        ambiente,
        correlativo: corr,
        numero_control: data.numeroControl || null,
        codigo_generacion: data.codigoGeneracion || null,
        sello: data.selloRecibido || null,
        estado: data.estado || null,
        receptor: prep.receptor,
        items,
        total: prep.total,
        // El DTE oficial tal cual lo selló Hacienda: de acá sale el PDF que ve
        // el cliente y el reenvío. Con el Sistema de Transmisión el MH ya no
        // genera el PDF — lo genera el emisor, así que este JSON es el original.
        dte_json: data.dte || null,
      };
      try {
        await supa("/taller_facturas", {
          method: "POST",
          headers: { Prefer: "return=minimal" },
          body: JSON.stringify([registro]),
        });
      } catch (e) {
        // El DTE YA está sellado por MH aunque falle el registro local —
        // avisar fuerte para anotarlo a mano (sello en el objeto devuelto).
        console.error("Factura SELLADA pero no se pudo registrar en taller_facturas:", e, registro);
        registro._sinRegistro = true;
      }
      return registro;
    }

    if (esErrorNumeroControlRepetido(data)) {
      ultimoError = data.error || "Número de control repetido";
      corr += 1;
      continue;
    }

    const obs = (data.observaciones || []).slice(0, 3).join("; ");
    throw new Error((data.error || `Error HTTP ${r.status}`) + (obs ? ` — ${obs}` : ""));
  }

  throw new Error(`MH rechazó 3 correlativos seguidos por número de control repetido (último: ${ultimoError}). Revisar correlativos usados en Tlacuilo.`);
}
