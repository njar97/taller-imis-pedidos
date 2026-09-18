// Emisión de facturas electrónicas (DTE) desde un pedido, vía el puente MH
// (endpoint /emitir-pedido del bridge del emisor Tlacuilo). El bridge arma el
// JSON oficial del MH con los builders ya validados en homologación; acá solo
// mandamos un payload simple (receptor + ítems con precio IVA incluido).
//
// Autenticación: token Bearer de larga duración del bridge (/api/api-token),
// guardado en localStorage. El usuario lo obtiene una vez con su usuario y
// contraseña de Tlacuilo (rol admin o emisor).
//
// Correlativo: lo asigna el PUENTE (17-sep-2026). Él ve todo lo emitido desde
// cualquier app y corrige solo si el MH rechaza por número repetido. La app
// manda "auto" y guarda el número que vuelve sellado.

import { withRetry } from "./retry.js";
import { detalleFactura, fmt$ } from "./dominio.js";
import { enviarDteEmail } from "./email.js";
import { buscarClienteFiscal } from "./clientesFiscales.js";

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
    const filas = await supa(`/taller_facturas?pedido_id=eq.${pedidoId}&order=id.desc`);
    // El registro central (dte_emitidos, lo escribe el puente) es quien sabe
    // si un DTE fue invalidado, se haya hecho desde esta app o desde
    // Tlacuilo. Se cruza acá para que la ficha no muestre como vigente una
    // factura que Hacienda ya dio de baja.
    const cgs = (filas || []).map(f => f.codigo_generacion).filter(Boolean);
    if (!cgs.length) return filas || [];
    try {
      const central = await supa(
        `/dte_emitidos?codigo_generacion=in.(${cgs.map(encodeURIComponent).join(",")})` +
        `&select=codigo_generacion,estado,invalidado_en,cod_gen_reemplazo`
      );
      const porCg = new Map((central || []).map(c => [c.codigo_generacion, c]));
      return filas.map(f => {
        const c = porCg.get(f.codigo_generacion);
        if (!c || !/^INVALID/i.test(c.estado || "") || /^(ANULAD|INVALID)/i.test(f.estado || "")) return f;
        const fecha = (c.invalidado_en || "").slice(0, 10);
        return { ...f, estado: `INVALIDADO ${fecha}`.trim(), _reemplazo: c.cod_gen_reemplazo || null };
      });
    } catch {
      return filas || [];
    }
  } catch (e) {
    console.error("facturasDePedido:", e);
    return [];
  }
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

// Cuánto lleva facturado el pedido (sin contar lo anulado, invalidado ni rechazado) y cuánto falta.
// Sirve para no facturar dos veces lo mismo al dividir por partes o cobrar
// anticipos: sin este número, cada factura se arma "a ciegas".
export function totalFacturado(facturas, totalPedido) {
  const facturado = +(facturas || [])
    .filter(f => !/^(ANULAD|INVALID|RECHAZ)/.test((f.estado || "").toUpperCase()))
    .reduce((s, f) => s + (parseFloat(f.total) || 0), 0)
    .toFixed(2);
  const saldo = totalPedido != null ? +(totalPedido - facturado).toFixed(2) : null;
  return { facturado, saldo };
}

// Descripción del ítem para el DTE. La línea del carrito dice solo "Camisa";
// el cliente y Hacienda necesitan saber QUÉ camisa. El 17-sep-2026 un CCF a
// SEDAS salió con "Camisa" a secas y hubo que invalidarlo, así que la línea se
// completa con el tipo de prenda del pedido cuando aporta algo.
export function descripcionItem(linea, pedido) {
  const tipo = (linea?.tipo || "").trim();
  const prenda = (pedido?.tipoPrenda || "").trim();
  if (!prenda) return tipo || "Producto";
  if (!tipo) return prenda;
  return prenda.toLowerCase().includes(tipo.toLowerCase()) ? prenda : `${tipo} — ${prenda}`;
}

// Dirección fiscal completa del cliente, tomada del último DTE que se le
// emitió. El pedido solo guarda la dirección como texto, y el puente rellena
// departamento y municipio con San Salvador si no se los mandan: a SEDAS, que
// es de Sonsonate, le salió así en el CCF del 17-sep-2026.
async function receptorConocido(nit) {
  if (!nit) return null;
  // Primero la base única de clientes fiscales (la alimenta el puente con
  // cada DTE sellado, desde cualquier app). Si tiene departamento, alcanza.
  const cf = await buscarClienteFiscal(nit);
  if (cf && cf.departamento) {
    return {
      direccion: { departamento: cf.departamento, municipio: cf.municipio, complemento: cf.complemento || "" },
      codActividad: cf.cod_actividad || undefined, descActividad: cf.desc_actividad || undefined,
      telefono: cf.telefono || undefined, correo: cf.correo || undefined,
    };
  }
  try {
    const rows = await supa(
      `/taller_facturas?receptor->>nit=eq.${encodeURIComponent(nit)}` +
      `&dte_json=not.is.null&select=dte_json&order=id.desc&limit=5`
    );
    for (const r of rows || []) {
      const rec = r?.dte_json?.receptor;
      if (rec?.direccion?.departamento) return rec;
    }
  } catch (e) {
    console.warn("receptorConocido:", e);
  }
  return null;
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
  // El correo va DENTRO del DTE (el MH lo pide) y además es a donde se manda
  // la factura. Sin esto el puente rellena "cliente@ejemplo.com".
  const correo = (base.correo || pedido.correo || "").trim();
  if (correo) receptor.correo = correo;
  const telReceptor = (base.telefono || pedido.telefono || "").trim();
  if (telReceptor) receptor.telefono = telReceptor;

  const avisos = [];
  if (!esCcf && !nit) avisos.push("Sin NIT del cliente → va como consumidor final (sin receptor).");
  if (tipo !== sugerido)
    avisos.push(
      sugerido === "03"
        ? "El pedido pide Crédito Fiscal y vas a emitir Factura de consumidor final: el cliente NO podrá usar el crédito fiscal."
        : "El pedido pide Factura de consumidor final y vas a emitir Crédito Fiscal."
    );

  const d = detalleFactura(pedido);

  // ── Modo anticipo: una sola línea por el monto libre, no toca el carrito.
  // También sirve de FALLBACK cuando el pedido no tiene ni un ítem cargado
  // (solo el precio final, sin desglose) — ahí el monto cubre el total y no
  // es realmente "un anticipo", así que la nota no lo llama así.
  if (anticipo && Number(anticipo.monto) > 0) {
    const monto = +Number(anticipo.monto).toFixed(2);
    const saldo = +(d.total - monto).toFixed(2);
    const esPagoCompleto = saldo <= 0.01;
    const nota = (anticipo.nota || "").trim() || (esPagoCompleto
      ? (pedido.tipoPrenda || pedido.cliente || `Pedido #${pedido.id}`)
      : `Anticipo. Total pedido ${fmt$(d.total)} · Saldo pendiente ${fmt$(saldo)}`);
    return {
      ok: true, tipo, receptor,
      lineas: [{ tipo: nota, precio: monto, qty: 1, subtotal: monto }],
      total: monto,
      avisos,
      esAnticipo: true,
    };
  }

  // Si vino una selección explícita (modo "elegir": ítems del carrito, del
  // pago aparte, o líneas escritas a mano) se usa esa, aunque la canasta
  // principal esté vacía — es justo el caso que antes quedaba sin salida
  // (pedido con precio pero sin ítems cargados, o con todo marcado "aparte").
  const lineas = (lineasElegidas && lineasElegidas.length) ? lineasElegidas : d.lineas;
  const usandoTodo = lineas === d.lineas;

  if (!lineas.length) {
    return {
      ok: false,
      error: lineasElegidas
        ? "Elegí al menos un ítem para facturar (o escribile un precio a los que les falta)."
        : "El pedido no tiene ítems para facturar.",
    };
  }
  if (usandoTodo && d.lineas.some(l => l.precio == null))
    return { ok: false, error: "Hay ítems sin precio unitario — completá los precios en el pedido antes de facturar." };

  const esParcial = !usandoTodo;
  const total = +lineas.reduce((s, l) => s + l.precio * l.qty, 0).toFixed(2);

  if (usandoTodo && d.descuadre)
    avisos.push(
      `La factura saldrá por la suma de líneas (${fmt$(d.sumaLineas)}), que NO coincide con el precio del pedido (${fmt$(d.total)}).`
    );
  if (esParcial) {
    if (total < d.total - 0.01)
      avisos.push(`Factura por ${fmt$(total)} de ${fmt$(d.total)} del pedido — quedan ítems sin facturar.`);
    else if (total > d.total + 0.01)
      avisos.push(`Factura por ${fmt$(total)}, más que el precio base del pedido (${fmt$(d.total)}) — incluye ítems fuera del carrito principal.`);
  }

  return { ok: true, tipo, receptor, lineas, total, avisos };
}

// ── Emisión ──

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
    descripcion: prep.esAnticipo ? l.tipo : descripcionItem(l, pedido),
    cantidad: l.qty,
    precioUniConIva: l.precio,
  }));

  // Completa la dirección fiscal (y la actividad) con lo que ya se le facturó
  // antes a ese NIT, para no mandar solo el complemento y que el puente
  // invente el departamento.
  const receptor = { ...prep.receptor };
  if (!receptor.direccion?.departamento) {
    const prev = await receptorConocido(receptor.nit);
    if (prev) {
      receptor.direccion = {
        ...prev.direccion,
        ...(receptor.direccion?.complemento ? { complemento: receptor.direccion.complemento } : {}),
      };
      if (!receptor.codActividad && prev.codActividad) {
        receptor.codActividad = prev.codActividad;
        receptor.descActividad = prev.descActividad;
      }
      if (!receptor.telefono && prev.telefono) receptor.telefono = prev.telefono;
      if (!receptor.correo && prev.correo) receptor.correo = prev.correo;
    }
  }

  // Una sola llamada: el puente numera, firma, manda y —si el MH rechaza por
  // número repetido— reintenta él con el siguiente. Acá ya no hay bucle.
  const r = await fetch(PUENTE + "/emitir-pedido", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
    body: JSON.stringify({
      nit: emisorDatos().nit,
      ambiente,
      tipoDte: prep.tipo,
      correlativo: "auto",
      emisor: emisorDatos(),
      receptor,
      items,
    }),
  });
  const data = await r.json().catch(() => ({}));

  if (r.status === 401) {
    olvidarTokenPuente();
    throw new Error("El puente rechazó el token (vencido o revocado) — volvé a conectarte.");
  }
  if (!data.ok) {
    const obs = (data.observaciones || []).slice(0, 3).join("; ");
    throw new Error((data.error || `Error HTTP ${r.status}`) + (obs ? ` — ${obs}` : ""));
  }

  const mCorr = /(\d{15})$/.exec(data.numeroControl || "");
  const registro = {
    pedido_id: pedido.id,
    nit_emisor: emisorDatos().nit,
    tipo_dte: prep.tipo,
    ambiente,
    correlativo: mCorr ? Number(mCorr[1]) : null,
    numero_control: data.numeroControl || null,
    codigo_generacion: data.codigoGeneracion || null,
    sello: data.selloRecibido || null,
    estado: data.estado || null,
    receptor,
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

  // Envío automático al cliente (PDF + JSON). No se aborta la emisión si
  // falla el correo: el DTE ya está sellado y se puede reenviar a mano
  // desde la ficha de la factura.
  const correoCliente = (receptor.correo || pedido.correo || "").trim();
  if (correoCliente && registro.codigo_generacion && !registro._sinRegistro) {
    const env = await enviarDteEmail({
      codigoGeneracion: registro.codigo_generacion,
      destinatarios: [correoCliente],
    });
    registro._correoEnviadoA = env.ok ? correoCliente : null;
    registro._correoError = env.ok ? null : env.error;
  }
  return registro;
}
