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

// ── Salida por el Gmail de cada empresa ──────────────────────
//
// Javier quiere ver las facturas enviadas en "Enviados" de Gmail. Resend no
// pasa por Gmail, así que el correo sale por el SMTP de la cuenta del emisor
// (contraseña de aplicación en secrets). Si la empresa no tiene cuenta
// configurada, o Gmail falla, se cae a Resend para que la factura salga igual.
//   GMAIL_USER_JAV / GMAIL_PASS_JAV   → NIT 03151202971040 (Nelson Javier)
//   GMAIL_USER_IMIS / GMAIL_PASS_IMIS → NIT 03151010111012 (UDP Confecciones IMIS)
const CUENTAS_GMAIL = {
  "03151202971040": { user: Deno.env.get("GMAIL_USER_JAV"), pass: Deno.env.get("GMAIL_PASS_JAV") },
  "03151010111012": { user: Deno.env.get("GMAIL_USER_IMIS"), pass: Deno.env.get("GMAIL_PASS_IMIS") },
};
const cuentaGmailDe = (nit) => {
  const c = CUENTAS_GMAIL[String(nit || "").replace(/-/g, "")];
  // Google muestra la contraseña de aplicación en 4 grupos; el SMTP la
  // quiere sin espacios.
  return c && c.user && c.pass ? { user: c.user.trim(), pass: c.pass.replace(/\s+/g, "") } : null;
};

// denomailer parte mal las cabeceras largas con acentos (el asunto quedaba
// cortado y el resto del mensaje aparecía como texto). Para Gmail se manda el
// asunto y el nombre sin acentos; el cuerpo HTML sí los conserva.
const soloAscii = (s) => String(s || "").normalize("NFD")
  .replace(/[̀-ͯ]/g, "")
  .replace(/[–—]/g, "-")
  .replace(/[^ -~]/g, "");

async function enviarPorGmail(cuenta, { nombre, to, bcc, replyTo, subject, html, adjuntos }) {
  const { SMTPClient } = await import("https://deno.land/x/denomailer@1.6.0/mod.ts");
  const client = new SMTPClient({
    connection: { hostname: "smtp.gmail.com", port: 465, tls: true, auth: { username: cuenta.user, password: cuenta.pass } },
  });
  try {
    // El remitente visible sigue siendo el del dominio (facturacion@imeltex…):
    // Gmail lo respeta si esa dirección está configurada como «Enviar como»
    // en la cuenta; si no lo está, Gmail pone la cuenta y avisa en el correo.
    const desde = FROM_ADDR.includes("@") && !FROM_ADDR.includes("resend.dev") ? FROM_ADDR : cuenta.user;
    await client.send({
      from: `"${soloAscii(nombre).replace(/"/g, "")}" <${desde}>`,
      to,
      bcc: bcc && bcc.length ? bcc : undefined,
      replyTo,
      subject: soloAscii(subject),
      content: "auto",
      html,
      attachments: adjuntos.map(a => ({ filename: a.filename, content: a.content, encoding: "base64", contentType: a.contentType })),
    });
  } finally {
    // close() no devuelve promesa en esta versión: envolver en try, no .catch()
    try { await client.close(); } catch { /* ya cerrado */ }
  }
}

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
// Diseño "Moderna" para imprimir en blanco y negro (elegido por Javier el
// 22-oct-2026; es el mismo de static/dte_pdf.js del puente). Sin cajas ni
// fondos: filetes negros y aire. Ocupa la hoja completa aunque haya un solo
// ítem: la tabla se estira con renglones vacíos y los totales quedan al pie.
// Medidas en puntos, origen arriba-izquierda (pdf-lib mide desde abajo: la
// helper T() invierte). Fuentes base-14, sin embeber: el PDF pesa ~15 KB.

const ANCHO = 612, ALTO = 792, M = 40, W = ANCHO - 2 * M;
const NEGRO = rgb(0, 0, 0);
const GRIS = rgb(0.3, 0.3, 0.3);
const GRIS_RENGLON = rgb(0.72, 0.72, 0.72);

const UM = { 59: "Unidad", 99: "Servicio", 58: "Docena", 36: "Yarda", 23: "Metro", 57: "Ciento", 55: "Par", 34: "Kilogramo", 13: "Libra" };
const PAGOS = { "01": "Billetes y monedas", "02": "Tarjeta débito", "03": "Tarjeta crédito", "04": "Cheque", "05": "Transferencia electrónica", "08": "Tarjeta prepago", "99": "Otros" };
const CONDICION = { 1: "Contado", 2: "A crédito", 3: "Otro" };
const TIPO_DOC = { "36": "NIT", "13": "DUI", "37": "Otro", "03": "Pasaporte", "02": "Carné residente" };

// Montos con separador de miles y el signo antes del $ (-$11.83).
const $m = (n) => { const v = Number(n) || 0; return (v < 0 ? "-$" : "$") + Math.abs(v).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); };
const fechaSV = (f) => { const [y, m, d] = String(f || "").split("-"); return d ? `${d}/${m}/${y}` : (f || ""); };
const nitFmt = (n) => String(n || "").replace(/^(\d{4})(\d{6})(\d{3})(\d)$/, "$1-$2-$3-$4");

// Un DTE invalidado sigue existiendo y el cliente tiene que poder distinguirlo
// de un vistazo: por eso la marca de agua cruzada, como la que ponen los otros
// emisores. El contenido no se toca — es el mismo documento que selló el MH.
const ROJO = rgb(0.72, 0.11, 0.15);
function marcaInvalidado(pg, helv, hebo, estado) {
  const texto = "INVALIDADO";
  const size = 76;
  const w = hebo.widthOfTextAtSize(texto, size);
  pg.drawText(texto, {
    x: (ANCHO - w * 0.71) / 2, y: ALTO / 2 - 120,
    size, font: hebo, color: ROJO, opacity: 0.18, rotate: { type: "degrees", angle: 45 },
  });
  const detalle = (estado || "").replace(/^(INVALIDAD|ANULAD)O\s*/i, "").trim();
  const pie = detalle ? `Documento invalidado ante el Ministerio de Hacienda el ${detalle}` : "Documento invalidado ante el Ministerio de Hacienda";
  const pw = helv.widthOfTextAtSize(pie, 8);
  pg.drawText(pie, { x: (ANCHO - pw) / 2, y: 64, size: 8, font: helv, color: ROJO });
}

async function armarPdf(dte, sello, estado) {
  const ident = dte.identificacion || {};
  const em = dte.emisor || {};
  const rec = dte.receptor || dte.sujetoExcluido || {};
  const res = dte.resumen || {};
  const items = Array.isArray(dte.cuerpoDocumento) ? dte.cuerpoDocumento : (dte.cuerpoDocumento ? [dte.cuerpoDocumento] : []);
  const esCCF = ["03", "05", "06"].includes(ident.tipoDte);

  const doc = await PDFDocument.create();
  const helv = await doc.embedFont(StandardFonts.Helvetica);
  const hebo = await doc.embedFont(StandardFonts.HelveticaBold);
  let pg = doc.addPage([ANCHO, ALTO]);
  const paginas = [pg];

  const T = (y) => ALTO - y;
  const ancho = (s, f, t) => f.widthOfTextAtSize(String(s ?? ""), t);
  const txt = (x, y, s, t = 9, f = helv, c = NEGRO) =>
    pg.drawText(String(s ?? ""), { x, y: T(y), size: t, font: f, color: c });
  const txtR = (x, y, s, t = 9, f = helv, c = NEGRO) => txt(x - ancho(s, f, t), y, s, t, f, c);
  const linea = (x1, y, x2, g = 0.6, c = NEGRO) =>
    pg.drawLine({ start: { x: x1, y: T(y) }, end: { x: x2, y: T(y) }, thickness: g, color: c });
  const envolver = (s, max, t, f = helv) => {
    const out = [];
    let l = "";
    for (let p of String(s || "").split(/\s+/).filter(Boolean)) {
      const prueba = (l + " " + p).trim();
      if (ancho(prueba, f, t) <= max) { l = prueba; continue; }
      if (l) { out.push(l); l = ""; }
      // Una sola palabra más ancha que la columna (el sello, un código): se
      // corta por letras para que no se monte sobre el QR.
      while (ancho(p, f, t) > max) {
        let k = p.length - 1;
        while (k > 1 && ancho(p.slice(0, k), f, t) > max) k--;
        out.push(p.slice(0, k)); p = p.slice(k);
      }
      l = p;
    }
    if (l) out.push(l);
    return out;
  };
  const dirTxt = (d) => {
    if (!d) return "";
    return [String(d.complemento || "").trim().replace(/,\s*$/, ""), DEPTOS[d.departamento] || ""].filter(Boolean).join(", ");
  };
  // Pares etiqueta/valor; devuelve la y siguiente.
  const pares = (x, y, filas, wEt, t, paso, wMax) => {
    for (const [et, val] of filas) {
      if (!val) continue;
      txt(x, y, et, t, hebo);
      const ls = envolver(val, wMax - wEt, t);
      ls.forEach((l, i) => txt(x + wEt, y + i * paso, l, t));
      y += paso * Math.max(1, ls.length);
    }
    return y;
  };

  // ── Encabezado ──
  let y = M + 16;
  const emNombre = em.nombreComercial || em.nombre || "";
  envolver(emNombre, 320, 20, hebo).forEach((l, i) => txt(M, y + i * 22, l, 20, hebo));
  const lineasEm = [
    [em.nombreComercial && em.nombre !== em.nombreComercial ? em.nombre : "", em.nit && "NIT " + nitFmt(em.nit), em.nrc && "NRC " + em.nrc].filter(Boolean).join("   |   "),
    em.descActividad || "",
    dirTxt(em.direccion),
    [em.telefono && "Tel. " + em.telefono, em.correo].filter(Boolean).join("   |   "),
  ].filter(Boolean);
  let ey = y + 18;
  for (const l of lineasEm) for (const s of envolver(l, 330, 8.5)) { txt(M, ey, s, 8.5, helv, GRIS); ey += 11.3; }
  const tt = envolver(TIPOS[ident.tipoDte] || "DOCUMENTO TRIBUTARIO", 210, 14, hebo);
  tt.forEach((l, i) => txtR(M + W, y + i * 16, l, 14, hebo));
  const ty0 = y + 16 * (tt.length - 1);
  txtR(M + W, ty0 + 17, "DOCUMENTO TRIBUTARIO ELECTRÓNICO", 8.5);
  txtR(M + W, ty0 + 34, `${fechaSV(ident.fecEmi)}   ${ident.horEmi || ""}`, 11, hebo);
  if (ident.ambiente && ident.ambiente !== "01") txtR(M + W, ty0 + 49, "AMBIENTE DE PRUEBAS — SIN VALIDEZ", 9, hebo);
  y = Math.max(ey, ty0 + 45) + 4;
  linea(M, y, M + W, 2);
  y += 22;

  // ── Receptor | datos del documento | QR ──
  const y0 = y, QR = 80;
  const docRec = rec.numDocumento
    ? `${TIPO_DOC[rec.tipoDocumento] || "Doc."} ${rec.tipoDocumento === "36" ? nitFmt(rec.numDocumento) : rec.numDocumento}`
    : (rec.nit ? "NIT " + nitFmt(rec.nit) : "");
  txt(M, y, "FACTURADO A", 8, hebo, GRIS);
  const ln = envolver(rec.nombre || "Consumidor final", 198, 13, hebo);
  ln.forEach((l, i) => txt(M, y + 18 + i * 16, l, 13, hebo));
  const ry = pares(M, y + 18 + 16 * ln.length + 2, [
    ["Documento", docRec], ["NRC", rec.nrc], ["Actividad", rec.descActividad],
    ["Dirección", dirTxt(rec.direccion)], ["Teléfono", rec.telefono], ["Correo", rec.correo],
  ], 54, 9, 13, 198);
  const dx = M + 212;
  txt(dx, y, "DATOS DEL DOCUMENTO", 8, hebo, GRIS);
  const pagos = (res.pagos || []).map((p) => PAGOS[p.codigo] || p.codigo).join(", ");
  const dy = pares(dx, y + 17, [
    ["Control", ident.numeroControl],
    ["Generación", ident.codigoGeneracion],
    ["Sello", sello],
    ["Condición", `${CONDICION[res.condicionOperacion] || "Contado"}${pagos ? " — " + pagos : ""}`],
    ["Modelo", `${ident.tipoModelo === 2 ? "Diferido" : "Previo"}, transmisión ${ident.tipoOperacion === 2 ? "contingencia" : "normal"}`],
  ], 48, 8, 13.6, W - 212 - QR - 14);
  const url = "https://admin.factura.gob.sv/consultaPublica?ambiente=" +
    `${ident.ambiente}&codGen=${ident.codigoGeneracion}&fechaEmi=${ident.fecEmi}`;
  const qr = qrcode(0, "M");
  qr.addData(url);
  qr.make();
  const n = qr.getModuleCount(), px = QR / n, qx = M + W - QR, qy = y0 - 8;
  for (let r = 0; r < n; r++)
    for (let c = 0; c < n; c++)
      if (qr.isDark(r, c))
        pg.drawRectangle({ x: qx + c * px, y: T(qy + r * px + px), width: px + 0.2, height: px + 0.2, color: NEGRO });
  y = Math.max(ry, dy, y0 + QR - 6) + 8;
  linea(M, y, M + W, 0.7);
  y += 20;

  // ── Totales: se calculan antes para anclarlos al pie ──
  const filasTot = [];
  if (Number(res.totalNoSuj)) filasTot.push(["Ventas no sujetas", res.totalNoSuj]);
  if (Number(res.totalExenta)) filasTot.push(["Ventas exentas", res.totalExenta]);
  if (res.totalGravada != null) filasTot.push([esCCF ? "Ventas gravadas" : "Ventas gravadas (IVA incluido)", res.totalGravada]);
  if (Number(res.totalDescu)) filasTot.push(["Descuentos", -res.totalDescu]);
  if (esCCF) for (const t of res.tributos || []) filasTot.push([t.descripcion || "IVA 13%", t.valor]);
  if (Number(res.ivaRete1)) filasTot.push(["(-) IVA retenido", -res.ivaRete1]);
  if (Number(res.ivaPerci1)) filasTot.push(["(+) IVA percibido", res.ivaPerci1]);
  if (Number(res.reteRenta)) filasTot.push(["(-) Retención de renta", -res.reteRenta]);
  const notaIva = !esCCF && Number(res.totalIva) ? `IVA incluido en el total: ${$m(res.totalIva)}` : "";
  const PIE = ALTO - 28;
  const altoTot = 17 + filasTot.length * 16 + (notaIva ? 14 : 0) + 51;
  const yTot = PIE - 23 - Math.max(altoTot, 100);

  // ── Tabla de ítems ──
  const hayDesc = items.some((i) => Number(i.montoDescu) > 0);
  const cTot = M + W - 6, cDesc = hayDesc ? cTot - 82 : cTot, cPU = cDesc - (hayDesc ? 62 : 82);
  const cUni = cPU - 128, cCant = cUni - 8, cDescr = M + 26;
  const anchoDescr = cCant - 44 - cDescr;
  const encabezado = () => {
    linea(M, y, M + W, 1.4);
    txt(M + 6, y + 14, "#", 8.5, hebo);
    txt(cDescr, y + 14, "Descripción", 8.5, hebo);
    txtR(cCant, y + 14, "Cant.", 8.5, hebo);
    txt(cUni, y + 14, "Unidad", 8.5, hebo);
    txtR(cPU, y + 14, "P. unitario", 8.5, hebo);
    if (hayDesc) txtR(cDesc, y + 14, "Descuento", 8.5, hebo);
    txtR(cTot, y + 14, esCCF ? "Venta gravada" : "Total", 8.5, hebo);
    linea(M, y + 21, M + W, 1.4);
    y += 21;
  };
  encabezado();
  items.forEach((it, i) => {
    const ls = envolver(it.descripcion, anchoDescr, 10);
    const alto = ls.length * 12.5 + 15;
    if (y + alto > PIE - 30) { pg = doc.addPage([ANCHO, ALTO]); paginas.push(pg); y = M; encabezado(); }
    const by = y + 15;
    txt(M + 6, by, String(i + 1), 10);
    ls.forEach((l, k) => txt(cDescr, by + k * 12.5, l, 10));
    txtR(cCant, by, Number(it.cantidad || 0).toLocaleString("en-US"), 10);
    txt(cUni, by, UM[it.uniMedida] || String(it.uniMedida ?? ""), 10);
    txtR(cPU, by, $m(it.precioUni), 10);
    if (hayDesc) txtR(cDesc, by, $m(it.montoDescu), 10);
    txtR(cTot, by, $m((Number(it.ventaGravada) || 0) + (Number(it.ventaExenta) || 0) + (Number(it.ventaNoSuj) || 0) + (Number(it.compra) || 0)), 10, hebo);
    y += alto;
    linea(M, y, M + W, 0.3, GRIS_RENGLON);
  });
  if (y > yTot - 28) { pg = doc.addPage([ANCHO, ALTO]); paginas.push(pg); y = M; }
  else for (let r = y + 25.5; r < yTot - 23; r += 25.5) linea(M, r, M + W, 0.3, GRIS_RENGLON);
  linea(M, yTot - 17, M + W, 1.4);

  // ── Totales (derecha) ──
  const tx0 = M + 306;
  let ty = yTot + 3;
  for (const [et, v] of filasTot) { txt(tx0, ty, et, 10); txtR(M + W, ty, $m(v), 10); ty += 16; }
  if (notaIva) { txt(tx0, ty, notaIva, 8, helv, GRIS); ty += 14; }
  ty += 3;
  linea(tx0, ty, M + W, 1.4);
  txt(tx0, ty + 21, "TOTAL A PAGAR", 15, hebo);
  txtR(M + W, ty + 21, $m(res.totalPagar ?? res.montoTotalOperacion ?? res.totalCompra), 15, hebo);
  linea(tx0, ty + 30, M + W, 0.85);
  linea(tx0, ty + 34, M + W, 2);

  // ── Letras y recibido (izquierda) ──
  txt(M, yTot + 3, "SON:", 8, hebo, GRIS);
  const lt = envolver(res.totalLetras || "", 278, 11, hebo);
  lt.forEach((l, i) => txt(M, yTot + 19 + i * 14, l, 11, hebo));
  const fy = Math.max(yTot + 19 + 14 * lt.length + 34, ty + 28);
  pg.drawLine({ start: { x: M, y: T(fy) }, end: { x: M + 255, y: T(fy) }, thickness: 0.7, color: NEGRO, dashArray: [3, 3] });
  txt(M, fy + 11, "Recibido por: nombre, firma y sello", 8);

  if (/^(INVALIDAD|ANULAD)/i.test(estado || "")) marcaInvalidado(pg, helv, hebo, estado);

  // ── Pie en todas las hojas ──
  paginas.forEach((p, i) => {
    pg = p;
    txt(M, PIE, "Representación gráfica del DTE. Verifíquelo en admin.factura.gob.sv/consultaPublica o con el código QR.", 7.5, helv, GRIS);
    txtR(M + W, PIE, `Pág. ${i + 1}/${paginas.length}`, 7.5, helv, GRIS);
  });

  return await doc.save();
}

const b64 = (bytes) => {
  let s = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk)
    s += String.fromCharCode(...bytes.subarray(i, i + chunk));
  return btoa(s);
};

function armarHTML(dte, factura, mensajeExtra, anulada) {
  const ident = dte.identificacion || {};
  const em = dte.emisor || {};
  const rec = dte.receptor || {};
  const res = dte.resumen || {};
  const tipo = TIPOS[ident.tipoDte] || "DTE";
  if (anulada)
    return `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#222;max-width:560px">
  <p>Estimados <b>${rec.nombre || ""}</b>:</p>
  <p style="background:#fdecee;border-left:4px solid #b81c26;padding:10px 12px">
  El <b>${tipo} ${ident.numeroControl || ""}</b> por <b>${$(res.totalPagar ?? res.montoTotalOperacion)}</b>,
  emitido el ${ident.fecEmi || ""}, fue <b>INVALIDADO</b> ante el Ministerio de Hacienda.
  Le pedimos no tomarlo en cuenta para su declaración.</p>
  ${mensajeExtra ? `<p>${String(mensajeExtra).replace(/</g, "&lt;")}</p>` : ""}
  <p>Se adjunta el documento con la marca de invalidación y su JSON, para su archivo.</p>
  <p><a href="https://admin.factura.gob.sv/consultaPublica?ambiente=${ident.ambiente}&codGen=${ident.codigoGeneracion}&fechaEmi=${ident.fecEmi}"
   style="color:#b81c26">Verificar el estado en la consulta pública del Ministerio de Hacienda</a></p>
  <p style="color:#666;font-size:12px">${em.nombre || ""} · NIT ${em.nit || ""}${em.telefono ? " · Tel. " + em.telefono : ""}</p>
</div>`;

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

    const anulada = /^(INVALIDAD|ANULAD)/i.test(factura.estado || "");
    const pdf = await armarPdf(dte, factura.sello, factura.estado);
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

    const subject = (anulada ? "INVALIDADO — " : "") +
                    `${TIPOS[dte.identificacion?.tipoDte] || "DTE"} ${nombre} — ` +
                    `${dte.emisor?.nombreComercial || dte.emisor?.nombre || ""}`;
    const html = armarHTML(dte, factura, mensaje_extra, anulada);
    const adjuntos = [
      { filename: `${nombre}.pdf`, content: b64(pdf), contentType: "application/pdf" },
      { filename: `${nombre}.json`, content: btoa(unescape(encodeURIComponent(JSON.stringify(dte, null, 2)))), contentType: "application/json" },
    ];
    // Copia oculta al buzón del emisor: de ahí levanta dte_web (contabilidad)
    // el DTE por el JSON adjunto, además del registro central.
    const bcc = dte.emisor?.correo && !para.includes(dte.emisor.correo) ? [dte.emisor.correo] : [];
    const nombreEmisor = dte.emisor?.nombreComercial || dte.emisor?.nombre || "";

    let via = "resend", idEnvio = null, gmailError = null;
    const cuenta = cuentaGmailDe(dte.emisor?.nit);
    if (cuenta) {
      try {
        // Sale por el Gmail del emisor: queda en su carpeta de Enviados. La
        // copia oculta ya no hace falta (el propio Gmail guarda el enviado).
        await enviarPorGmail(cuenta, { nombre: nombreEmisor, to: para, bcc: bcc.filter(b => b !== cuenta.user), replyTo: dte.emisor?.correo, subject, html, adjuntos });
        via = "gmail:" + cuenta.user;
      } catch (e) {
        gmailError = String(e?.message || e).slice(0, 300);
        console.error("Gmail falló, se manda por Resend:", gmailError);
      }
    }
    if (via === "resend") {
      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${RESEND_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: remitente(dte.emisor),
          reply_to: dte.emisor?.correo || undefined,
          bcc: bcc.length ? bcc : undefined,
          to: para,
          subject,
          html,
          attachments: adjuntos.map(a => ({ filename: a.filename, content: a.content })),
        }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok)
        return new Response(JSON.stringify({ error: "Resend rechazó el envío", detail: data }), { status: 502 });
      idEnvio = data.id;
    }

    await supabase.from("taller_facturas")
      .update({ enviado_a: para, enviado_en: new Date().toISOString() })
      .eq("id", factura.id);

    return new Response(JSON.stringify({ ok: true, id: idEnvio, via, gmailError, destinatarios: para }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }), { status: 500 });
  }
});
