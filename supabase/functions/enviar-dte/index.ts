// Edge Function — enviar-dte.
//
// Manda por correo un DTE ya emitido, con DOS adjuntos: el PDF de la factura
// y el JSON oficial. El cliente necesita los dos: el PDF para ver y archivar,
// el JSON porque es el documento que vale ante Hacienda.
//
// El PDF se arma acá, no en el navegador: así sale igual venga de donde venga
// (emisión automática, reenvío desde la ficha, o un reintento).
//
// Body: { factura_id?: number, codigo_generacion?: string,
//         destinatarios?: string[], mensaje_extra?: string,
//         solo_pdf?: boolean }   // solo_pdf devuelve el PDF en base64, sin enviar
//
// Si no vienen destinatarios usa el correo del receptor del propio DTE.
//
// Secrets: RESEND_API_KEY, RESEND_FROM, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { PDFDocument, StandardFonts, rgb } from "https://esm.sh/pdf-lib@1.17.1";
import qrcode from "https://esm.sh/qrcode-generator@1.4.4";

const SUPA_URL = Deno.env.get("SUPABASE_URL");
const SUPA_SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const RESEND_KEY = Deno.env.get("RESEND_API_KEY");
// Dirección verificada en Resend (dominio imeltex.com.sv). El NOMBRE que se
// muestra sale del emisor del propio DTE, así la factura de IMIS llega como
// "CONFECCIONES IMIS" y la de Javier como "Carymel": el cliente ve el mismo
// nombre que trae el documento.
const FROM_ADDR = Deno.env.get("RESEND_FROM") || "onboarding@resend.dev";
const remitente = (em) => {
  const addr = FROM_ADDR.includes("<") ? FROM_ADDR : `<${FROM_ADDR}>`;
  const nombre = (em?.nombreComercial || em?.nombre || "").replace(/["<>]/g, "").trim();
  return nombre && !FROM_ADDR.includes("<") ? `${nombre} ${addr}` : FROM_ADDR;
};

const supabase = createClient(SUPA_URL, SUPA_SERVICE, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const TIPOS = {
  "01": "FACTURA",
  "03": "COMPROBANTE DE CRÉDITO FISCAL",
  "05": "NOTA DE CRÉDITO",
  "06": "NOTA DE DÉBITO",
  "14": "FACTURA DE SUJETO EXCLUIDO",
};

const DEPTOS = {
  "01": "Ahuachapán", "02": "Santa Ana", "03": "Sonsonate", "04": "Chalatenango",
  "05": "La Libertad", "06": "San Salvador", "07": "Cuscatlán", "08": "La Paz",
  "09": "Cabañas", "10": "San Vicente", "11": "Usulután", "12": "San Miguel",
  "13": "Morazán", "14": "La Unión",
};

const $ = (n) => "$" + (Number(n) || 0).toFixed(2);

// ── PDF ──────────────────────────────────────────────────────
//
// Medidas en puntos, origen arriba-izquierda (pdf-lib mide desde abajo: la
// helper T() invierte). Fuentes base-14, sin embeber: el PDF pesa ~15 KB y
// entra sin problema como adjunto.

const ANCHO = 612, ALTO = 792, M = 36, W = ANCHO - 2 * M;
const GRIS = rgb(0.42, 0.45, 0.49);
const NEGRO = rgb(0.12, 0.14, 0.16);
const VERDE = rgb(0.11, 0.42, 0.29);
const AZUL = rgb(0.14, 0.44, 0.64);
const LINEA = rgb(0.79, 0.81, 0.84);
const FONDO = rgb(0.95, 0.956, 0.964);

async function armarPdf(dte, sello) {
  const ident = dte.identificacion || {};
  const em = dte.emisor || {};
  const rec = dte.receptor || dte.sujetoExcluido || {};
  const res = dte.resumen || {};
  const items = dte.cuerpoDocumento || [];

  const doc = await PDFDocument.create();
  const pg = doc.addPage([ANCHO, ALTO]);
  const helv = await doc.embedFont(StandardFonts.Helvetica);
  const hebo = await doc.embedFont(StandardFonts.HelveticaBold);
  const cour = await doc.embedFont(StandardFonts.Courier);

  const T = (y) => ALTO - y;
  const ancho = (s, f, t) => f.widthOfTextAtSize(s || "", t);
  const txt = (x, y, s, t = 8, f = helv, c = NEGRO) =>
    pg.drawText(String(s ?? ""), { x, y: T(y), size: t, font: f, color: c });
  const txtR = (x, y, s, t = 8, f = helv, c = NEGRO) =>
    txt(x - ancho(String(s ?? ""), f, t), y, s, t, f, c);
  const txtC = (x, y, s, t = 8, f = helv, c = NEGRO) =>
    txt(x - ancho(String(s ?? ""), f, t) / 2, y, s, t, f, c);
  const caja = (x, y, w, h, relleno) =>
    pg.drawRectangle({
      x, y: T(y + h), width: w, height: h,
      borderColor: LINEA, borderWidth: 0.6,
      ...(relleno ? { color: relleno } : {}),
    });

  const envolver = (s, max, t = 7.5, f = helv) => {
    const out = [];
    let linea = "";
    for (const p of String(s || "").split(/\s+/).filter(Boolean)) {
      const prueba = (linea + " " + p).trim();
      if (ancho(prueba, f, t) > max) { if (linea) out.push(linea); linea = p; }
      else linea = prueba;
    }
    if (linea) out.push(linea);
    return out;
  };

  const direc = (x) => {
    const d = x.direccion || {};
    return [d.complemento || "", DEPTOS[d.departamento] || ""];
  };

  // Encabezado
  txtC(306, M + 8, "DOCUMENTO TRIBUTARIO ELECTRÓNICO", 13, hebo);
  txtC(306, M + 22,
    `${TIPOS[ident.tipoDte] || "DTE"}  ·  ${ident.ambiente === "01" ? "PRODUCCIÓN" : "PRUEBAS"}` +
    `  ·  ${ident.fecEmi || ""} ${ident.horEmi || ""}  ·  USD`, 9, helv, GRIS);

  // Identificación + QR de la consulta pública
  let y = M + 34;
  caja(M, y, W * 0.63, 74);
  caja(M + W * 0.63 + 6, y, W * 0.37 - 6, 74);
  let iy = y;
  for (const [et, val] of [
    ["CÓDIGO DE GENERACIÓN", ident.codigoGeneracion],
    ["NÚMERO DE CONTROL", ident.numeroControl],
    ["SELLO DE RECEPCIÓN", sello],
  ]) {
    txt(M + 8, iy + 13, et, 6, helv, GRIS);
    txt(M + 8, iy + 22, val || "—", 7.5, cour);
    iy += 24;
  }

  const url = "https://admin.factura.gob.sv/consultaPublica?ambiente=" +
    `${ident.ambiente}&codGen=${ident.codigoGeneracion}&fechaEmi=${ident.fecEmi}`;
  const qr = qrcode(0, "M");
  qr.addData(url);
  qr.make();
  const n = qr.getModuleCount();
  const lado = 54, px = lado / n;
  const qx = M + W * 0.63 + 6 + (W * 0.37 - 6) / 2 - lado / 2;
  const qy = y + 6;
  for (let r = 0; r < n; r++)
    for (let c = 0; c < n; c++)
      if (qr.isDark(r, c))
        pg.drawRectangle({
          x: qx + c * px, y: T(qy + r * px + px),
          width: px + 0.2, height: px + 0.2, color: NEGRO,
        });
  txtC(qx + lado / 2, y + 69, "CONSULTA PÚBLICA MH", 6, helv, GRIS);

  // Emisor / receptor
  y += 82;
  const alto = 86, hw = (W - 6) / 2;
  caja(M, y, hw, alto);
  caja(M + hw + 6, y, hw, alto);
  const bloque = (x, titulo, color, datos) => {
    txt(x + 8, y + 13, titulo, 7.5, hebo, color);
    let yy = y + 25;
    for (const [s, f, t] of datos)
      for (const l of envolver(s, hw - 16, t, f)) { txt(x + 8, yy, l, t, f); yy += 9; }
  };
  const [dEm, dRec] = [direc(em), direc(rec)];
  bloque(M, "EMISOR", VERDE, [
    [em.nombreComercial || em.nombre, hebo, 8],
    [em.nombre, helv, 7.5],
    [`NIT: ${em.nit || ""}   NRC: ${em.nrc || ""}`, helv, 7.5],
    [`Act: ${em.codActividad || ""} — ${em.descActividad || ""}`, helv, 7.5],
    [dEm[0], helv, 7.5], [dEm[1], helv, 7.5],
    [`Tel: ${em.telefono || ""}  |  ${em.correo || ""}`, helv, 7.5],
  ]);
  bloque(M + hw + 6, "RECEPTOR", AZUL, [
    [rec.nombre, hebo, 8],
    [`NIT: ${rec.nit || rec.numDocumento || ""}   NRC: ${rec.nrc || ""}`, helv, 7.5],
    [`Act: ${rec.codActividad || ""} — ${rec.descActividad || ""}`, helv, 7.5],
    [dRec[0], helv, 7.5], [dRec[1], helv, 7.5],
    [rec.correo || "", helv, 7.5],
  ]);

  // Detalle
  y += alto + 10;
  const colCant = M + 8, colDesc = M + 52, colUni = M + W - 150, colTot = M + W - 8;
  pg.drawRectangle({ x: M, y: T(y + 16), width: W, height: 16, color: FONDO });
  txt(colCant, y + 11, "CANT.", 7, hebo, GRIS);
  txt(colDesc, y + 11, "DESCRIPCIÓN", 7, hebo, GRIS);
  txtR(colUni + 60, y + 11, "P. UNITARIO", 7, hebo, GRIS);
  txtR(colTot, y + 11, "VENTA GRAVADA", 7, hebo, GRIS);
  y += 16;

  for (const it of items) {
    const lineas = envolver(it.descripcion, colUni - colDesc - 12, 7.5);
    txt(colCant, y + 10, String(it.cantidad ?? ""), 7.5);
    lineas.forEach((l, i) => txt(colDesc, y + 10 + i * 9, l, 7.5));
    txtR(colUni + 60, y + 10, $(it.precioUni), 7.5);
    txtR(colTot, y + 10, $(it.ventaGravada ?? it.ventaExenta ?? 0), 7.5);
    y += Math.max(1, lineas.length) * 9 + 5;
    pg.drawLine({
      start: { x: M, y: T(y) }, end: { x: M + W, y: T(y) },
      thickness: 0.4, color: LINEA,
    });
  }

  // Totales
  y += 10;
  const iva = (res.tributos || []).reduce((s, t) => s + (Number(t.valor) || 0), 0);
  const filas = [
    ["Suma de operaciones", res.subTotalVentas ?? res.totalGravada],
    ["IVA 13%", iva],
    ...(Number(res.ivaRete1) ? [["IVA retenido 1%", -res.ivaRete1]] : []),
    ...(Number(res.reteRenta) ? [["Retención renta", -res.reteRenta]] : []),
  ];
  for (const [et, val] of filas) {
    txtR(colUni + 60, y + 8, et, 7.5, helv, GRIS);
    txtR(colTot, y + 8, $(val), 7.5);
    y += 12;
  }
  pg.drawRectangle({ x: colUni - 60, y: T(y + 20), width: M + W - (colUni - 60), height: 20, color: FONDO });
  txtR(colUni + 60, y + 14, "TOTAL A PAGAR", 9, hebo);
  txtR(colTot, y + 14, $(res.totalPagar ?? res.montoTotalOperacion), 10, hebo);
  y += 26;
  txt(M, y + 8, res.totalLetras || "", 7.5, helv, GRIS);

  // Pie
  txtC(306, ALTO - M - 14,
    "Este documento es una representación gráfica del DTE. Verificalo en la consulta pública del Ministerio de Hacienda.",
    6.5, helv, GRIS);

  return await doc.save();
}

const b64 = (bytes) => {
  let s = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk)
    s += String.fromCharCode(...bytes.subarray(i, i + chunk));
  return btoa(s);
};

function armarHTML(dte, factura, mensajeExtra) {
  const ident = dte.identificacion || {};
  const em = dte.emisor || {};
  const rec = dte.receptor || {};
  const res = dte.resumen || {};
  const tipo = TIPOS[ident.tipoDte] || "DTE";
  return `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#222;max-width:560px">
  <p>Estimados <b>${rec.nombre || ""}</b>:</p>
  <p>Adjunto encontrará su <b>${tipo}</b> por <b>${$(res.totalPagar ?? res.montoTotalOperacion)}</b>,
  emitido el ${ident.fecEmi || ""} por <b>${em.nombreComercial || em.nombre || ""}</b>.</p>
  ${mensajeExtra ? `<p>${String(mensajeExtra).replace(/</g, "&lt;")}</p>` : ""}
  <p>Van dos archivos: el <b>PDF</b> para ver e imprimir y el <b>JSON</b>, que es el documento
  con validez ante el Ministerio de Hacienda.</p>
  <table style="font-size:13px;border-collapse:collapse;margin:14px 0">
    <tr><td style="color:#666;padding:2px 10px 2px 0">Número de control</td><td><code>${ident.numeroControl || ""}</code></td></tr>
    <tr><td style="color:#666;padding:2px 10px 2px 0">Código de generación</td><td><code>${ident.codigoGeneracion || ""}</code></td></tr>
    <tr><td style="color:#666;padding:2px 10px 2px 0">Sello de recepción</td><td><code>${factura.sello || ""}</code></td></tr>
  </table>
  <p><a href="https://admin.factura.gob.sv/consultaPublica?ambiente=${ident.ambiente}&codGen=${ident.codigoGeneracion}&fechaEmi=${ident.fecEmi}"
   style="color:#1B6B4A">Verificar en la consulta pública del Ministerio de Hacienda</a></p>
  <p style="color:#666;font-size:12px">${em.nombre || ""} · NIT ${em.nit || ""}${em.telefono ? " · Tel. " + em.telefono : ""}</p>
</div>`;
}

Deno.serve(async (req) => {
  if (req.method !== "POST")
    return new Response(JSON.stringify({ error: "Usá POST" }), { status: 405 });

  try {
    const body = await req.json().catch(() => ({}));
    const { factura_id, codigo_generacion, destinatarios, mensaje_extra, solo_pdf } = body;

    if (!factura_id && !codigo_generacion)
      return new Response(JSON.stringify({ error: "Falta factura_id o codigo_generacion" }), { status: 400 });

    let q = supabase.from("taller_facturas").select("*").limit(1);
    q = factura_id ? q.eq("id", factura_id) : q.eq("codigo_generacion", codigo_generacion);
    const { data: filas, error } = await q;
    if (error) throw error;
    const factura = filas && filas[0];
    if (!factura)
      return new Response(JSON.stringify({ error: "No encontré esa factura" }), { status: 404 });

    const dte = factura.dte_json;
    if (!dte)
      return new Response(JSON.stringify({
        error: "Esa factura no guardó el JSON del DTE — no se puede armar el PDF ni adjuntar el oficial.",
      }), { status: 422 });

    const pdf = await armarPdf(dte, factura.sello);
    const nombre = dte.identificacion?.numeroControl || factura.codigo_generacion || "dte";

    if (solo_pdf)
      return new Response(JSON.stringify({ ok: true, pdf_base64: b64(pdf), nombre }), {
        headers: { "Content-Type": "application/json" },
      });

    // La función es pública (la app solo tiene la anon key). Para que nadie
    // pueda usarla de trampolín, solo se manda a correos que YA están en los
    // datos del cliente: el del DTE, el del pedido o el de su ficha.
    const permitidos = new Set([dte.receptor?.correo, dte.emisor?.correo].filter(Boolean)
      .map(c => c.toLowerCase().trim()));
    if (factura.pedido_id) {
      const { data: ped } = await supabase.from("taller_pedidos")
        .select("correo, cliente").eq("id", factura.pedido_id).limit(1);
      const correoPedido = ped && ped[0]?.correo;
      if (correoPedido) permitidos.add(correoPedido.toLowerCase().trim());
      if (ped && ped[0]?.cliente) {
        const { data: cli } = await supabase.from("taller_clientes")
          .select("correo").ilike("nombre", ped[0].cliente).limit(1);
        if (cli && cli[0]?.correo) permitidos.add(cli[0].correo.toLowerCase().trim());
      }
    }

    const pedidos_ = (destinatarios && destinatarios.length ? destinatarios : [dte.receptor?.correo])
      .filter(Boolean)
      .map(c => String(c).trim());
    const rechazados = pedidos_.filter(c => !permitidos.has(c.toLowerCase()));
    if (rechazados.length)
      return new Response(JSON.stringify({
        error: "Solo puedo mandarlo a los correos guardados del cliente. " +
               `No están en su ficha: ${rechazados.join(", ")}. Agregalos al cliente y reintentá.`,
      }), { status: 403 });
    const para = pedidos_;
    if (!para.length)
      return new Response(JSON.stringify({
        error: "No hay a quién mandarlo: el DTE no trae correo del receptor y no me pasaste destinatarios.",
      }), { status: 400 });

    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: remitente(dte.emisor),
        reply_to: dte.emisor?.correo || undefined,
        to: para,
        subject: `${TIPOS[dte.identificacion?.tipoDte] || "DTE"} ${nombre} — ` +
                 `${dte.emisor?.nombreComercial || dte.emisor?.nombre || ""}`,
        html: armarHTML(dte, factura, mensaje_extra),
        attachments: [
          { filename: `${nombre}.pdf`, content: b64(pdf) },
          { filename: `${nombre}.json`, content: btoa(unescape(encodeURIComponent(JSON.stringify(dte, null, 2)))) },
        ],
      }),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok)
      return new Response(JSON.stringify({ error: "Resend rechazó el envío", detail: data }), { status: 502 });

    await supabase.from("taller_facturas")
      .update({ enviado_a: para, enviado_en: new Date().toISOString() })
      .eq("id", factura.id);

    return new Response(JSON.stringify({ ok: true, id: data.id, destinatarios: para }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }), { status: 500 });
  }
});
