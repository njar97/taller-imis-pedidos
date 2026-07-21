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
import { detalleFactura } from "./dominio.js";

const PUENTE = "https://emisor-imis.duckdns.org";
const TOKEN_KEY = "taller_puente_token";

// Ambiente MH: "01" producción (default). Para probar contra apitest sin tocar
// código: localStorage.setItem("taller_dte_ambiente", "00").
export const ambienteDte = () =>
  localStorage.getItem("taller_dte_ambiente") === "00" ? "00" : "01";

// Perfil fiscal del emisor (Carymel) — plantilla validada por MH en la
// homologación. El NRC va sin guion; el NIT sin guiones lo normaliza el bridge.
const NIT_EMISOR = "03151202971040";
const EMISOR = {
  nit: NIT_EMISOR,
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
};

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

export async function facturasDePedido(pedidoId) {
  try {
    return await supa(`/taller_facturas?pedido_id=eq.${pedidoId}&nit_emisor=eq.${NIT_EMISOR}&order=id.desc`);
  } catch (e) {
    console.error("facturasDePedido:", e);
    return [];
  }
}

// La serie de correlativos es POR CONTRIBUYENTE: cada NIT lleva su propia
// numeración de DTE ante Hacienda, así que nunca se mezcla con otro emisor.
async function siguienteCorrelativo(tipo, ambiente) {
  const rows = await supa(
    `/taller_facturas?nit_emisor=eq.${NIT_EMISOR}&tipo_dte=eq.${tipo}&ambiente=eq.${ambiente}` +
    `&select=correlativo&order=correlativo.desc&limit=1`
  );
  return rows && rows.length ? Number(rows[0].correlativo) + 1 : 1;
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

// Decide tipo de DTE y valida que el pedido tenga lo necesario.
// Devuelve { ok, tipo, receptor, lineas, total, avisos[] } o { ok:false, error }.
export function prepararFacturaPedido(pedido) {
  const d = detalleFactura(pedido);
  if (!d.lineas.length) return { ok: false, error: "El pedido no tiene ítems para facturar." };
  if (d.lineas.some(l => l.precio == null))
    return { ok: false, error: "Hay ítems sin precio unitario — completá los precios en el pedido antes de facturar." };

  const esCcf = (pedido.tipoDocumento || "").startsWith("Crédito Fiscal");
  const nit = (pedido.nit || "").replace(/-/g, "").trim();
  const nrc = (pedido.nrc || "").replace(/-/g, "").trim();

  if (esCcf && (!nit || !nrc))
    return { ok: false, error: "El pedido pide Crédito Fiscal pero le faltan NIT y/o NRC del cliente." };

  const receptor = {
    nit: nit || "",
    nrc: nrc || "",
    nombre: (pedido.razonSocial || pedido.cliente || "").trim(),
  };
  if ((pedido.dirFiscal || "").trim()) receptor.direccion = { complemento: pedido.dirFiscal.trim() };

  const avisos = [];
  if (d.descuadre)
    avisos.push(
      `La factura saldrá por la suma de líneas ($${d.sumaLineas.toFixed(2)}), que NO coincide con el precio del pedido ($${d.total.toFixed(2)}).`
    );
  if (!esCcf && !nit) avisos.push("Sin NIT del cliente → va como consumidor final (sin receptor).");

  return {
    ok: true,
    tipo: esCcf ? "03" : "01",
    receptor,
    lineas: d.lineas,
    total: d.sumaLineas != null ? d.sumaLineas : d.total,
    avisos,
  };
}

// ── Emisión ──

function esErrorNumeroControlRepetido(data) {
  const txt = [data?.error, data?.descripcionMsg, ...(data?.observaciones || [])].join(" ").toLowerCase();
  return txt.includes("numero de control") || txt.includes("número de control") || txt.includes("numerocontrol");
}

// Emite el DTE del pedido. Devuelve el registro guardado en taller_facturas.
// Lanza Error con mensaje legible si algo falla.
export async function emitirFacturaPedido(pedido) {
  const prep = prepararFacturaPedido(pedido);
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
        nit: NIT_EMISOR,
        ambiente,
        tipoDte: prep.tipo,
        correlativo: corr,
        emisor: EMISOR,
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
        nit_emisor: NIT_EMISOR,
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
