// Edge Function — enviar-cotizacion.
//
// Toma un pedido (cotización) de la BD y manda un email al destinatario
// con la cotización formal en HTML. Las imágenes (firma + sello) van
// por URL (alojadas en Supabase Storage público).
//
// Body: { pedido_id: number, destinatarios: string[], asunto?: string,
//          mensaje_extra?: string }
//
// Secrets requeridos:
//   RESEND_API_KEY — API key de Resend para mandar el email
//   SUPABASE_URL — auto-set por Supabase
//   SUPABASE_SERVICE_ROLE_KEY — auto-set por Supabase

// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPA_URL = Deno.env.get("SUPABASE_URL");
const SUPA_SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const RESEND_KEY = Deno.env.get("RESEND_API_KEY");
const FROM = Deno.env.get("RESEND_FROM") || "Taller IMIS <onboarding@resend.dev>";

const supabase = createClient(SUPA_URL, SUPA_SERVICE, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const EMPRESA = {
  razonSocial: "UDP CONFECCIONES IMIS",
  nit: "0315-101011-101-2",
  nrc: "211590-0",
  actividad: "Fabricación de productos textiles",
  direccion: "Sonsonate, Col. Santa Marta, Av. Centroamericana, Casa N.° 5-A",
  telefonos: ["2451-1620", "7866-9963", "7957-0695"],
  email: "confecciones_imis@hotmail.com",
  rl: {
    nombre: "Imelda Del Carmen Mancía De Ramírez",
    dui: "0158-3577-9",
    cargo: "Representante Legal",
  },
};

// Reconstrucción de itemsResumen (lite — sin merge de personas porque
// las cotizaciones usan modoRegistro='tallas' con tallasItems planos)
function itemsResumen(p) {
  return Array.isArray(p.tallas_items) ? p.tallas_items : [];
}

function fmtFecha(d) {
  return d.toLocaleDateString("es-SV", { day: "2-digit", month: "long", year: "numeric" });
}

function armarHTML(p, cfg, mensajeExtra) {
  const num = String(p.id).padStart(4, "0");
  const hoy = new Date();
  const validez = p.validez_dias || 15;
  const vence = new Date(hoy.getTime() + validez * 86400000);
  const items = itemsResumen(p);
  const precioFinal = parseFloat(p.precio) || 0;
  const subtotal = precioFinal / 1.13;
  const iva = precioFinal - subtotal;
  const firma = cfg?.firma?.value?.url;
  const sello = cfg?.sello?.value?.url;

  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Cotización ${num}</title></head>
<body style="font-family:'Segoe UI',Arial,sans-serif;background:#fff;color:#222;padding:24px;font-size:13px;line-height:1.4;max-width:780px;margin:0 auto;">

<div style="border-bottom:3px solid #2C1654;padding-bottom:12px;margin-bottom:18px;display:flex;justify-content:space-between;align-items:flex-start;">
  <div style="flex:1;">
    <div style="font-size:22px;font-weight:900;color:#2C1654;font-family:Georgia,serif;line-height:1.1;">${EMPRESA.razonSocial}</div>
    <div style="font-size:10px;color:#666;margin-top:5px;line-height:1.5;">
      ${EMPRESA.actividad}<br>
      ${EMPRESA.direccion}<br>
      Tel: ${EMPRESA.telefonos.join(" · ")}<br>
      ${EMPRESA.email}<br>
      <strong>NIT:</strong> ${EMPRESA.nit} &nbsp; <strong>NRC:</strong> ${EMPRESA.nrc}
    </div>
  </div>
  <div style="text-align:right;border-left:3px solid #9B59B6;padding-left:14px;">
    <div style="font-size:10px;color:#aaa;text-transform:uppercase;letter-spacing:1.5px;font-weight:700;">Cotización</div>
    <div style="font-size:30px;font-weight:900;color:#9B59B6;line-height:1;">N° ${num}</div>
    <div style="font-size:10px;color:#666;margin-top:6px;">Fecha: <strong>${fmtFecha(hoy)}</strong></div>
  </div>
</div>

<div style="background:#f8f4ff;border-radius:8px;padding:12px 14px;margin-bottom:14px;">
  <div style="font-size:9px;font-weight:800;color:#666;text-transform:uppercase;letter-spacing:.6px;">Cotización dirigida a</div>
  <div style="font-size:15px;font-weight:800;color:#2C1654;margin-top:3px;">${p.cliente || "Cliente"}</div>
  ${p.nombre_contacto ? `<div style="font-size:11px;color:#555;margin-top:2px;">Atención: <strong>${p.nombre_contacto}</strong></div>` : ""}
  ${p.proceso_ref ? `<div style="font-size:11px;color:#9B59B6;margin-top:4px;font-weight:700;">Ref. proceso: ${p.proceso_ref}</div>` : ""}
</div>

${mensajeExtra ? `<div style="background:#F9F0FF;border-left:3px solid #9B59B6;padding:10px 14px;margin-bottom:14px;font-size:12px;color:#4A235A;line-height:1.5;">${mensajeExtra.replace(/\n/g, "<br>")}</div>` : ""}

<p style="font-size:11px;color:#555;margin-bottom:10px;">
  Por medio de la presente nos permitimos presentar la cotización de los productos solicitados con los siguientes detalles:
</p>

${items.length ? `
<table style="border:1.5px solid #2C1654;font-size:11px;margin-bottom:14px;border-collapse:collapse;width:100%;">
  <thead><tr style="background:#2C1654;color:#fff;">
    <th style="padding:7px 8px;text-align:center;width:36px;">N°</th>
    <th style="padding:7px 10px;text-align:left;">Descripción</th>
    <th style="padding:7px 8px;text-align:center;width:90px;">Medida</th>
    <th style="padding:7px 8px;text-align:center;width:60px;">Cant.</th>
    <th style="padding:7px 10px;text-align:right;width:90px;">Precio U.</th>
    <th style="padding:7px 10px;text-align:right;width:100px;">Subtotal</th>
  </tr></thead>
  <tbody>
    ${items.map((it, i) => {
      const pr = parseFloat(it.precio) || 0;
      const sub = pr * it.qty;
      const medida = it.talla || (it.spec && /[\dxm,.]/i.test(it.spec) ? it.spec : "") || "—";
      return `<tr style="background:${i % 2 === 0 ? "#fff" : "#f5f0fa"};border-bottom:1px solid #eee;">
        <td style="padding:8px;text-align:center;font-weight:700;color:#666;">${i + 1}</td>
        <td style="padding:8px 10px;color:#222;">${it.tipo || "—"}</td>
        <td style="padding:8px;text-align:center;font-weight:700;color:#2C1654;">${medida}</td>
        <td style="padding:8px;text-align:center;font-weight:800;">${it.qty}</td>
        <td style="padding:8px 10px;text-align:right;color:#27AE60;font-weight:700;">${pr > 0 ? "$" + pr.toFixed(2) : "—"}</td>
        <td style="padding:8px 10px;text-align:right;font-weight:800;color:#2C1654;">${pr > 0 ? "$" + sub.toFixed(2) : "—"}</td>
      </tr>`;
    }).join("")}
  </tbody>
</table>` : ""}

<div style="display:flex;justify-content:flex-end;margin-bottom:16px;">
  <table style="width:auto;min-width:280px;font-size:12px;border-collapse:collapse;">
    <tr>
      <td style="padding:5px 12px;text-align:right;color:#666;">SUBTOTAL:</td>
      <td style="padding:5px 12px;text-align:right;font-weight:700;color:#2C1654;width:110px;">$${subtotal.toFixed(2)}</td>
    </tr>
    <tr>
      <td style="padding:5px 12px;text-align:right;color:#666;">IVA (13%):</td>
      <td style="padding:5px 12px;text-align:right;font-weight:700;color:#2C1654;">$${iva.toFixed(2)}</td>
    </tr>
    <tr style="border-top:2px solid #2C1654;">
      <td style="padding:7px 12px;text-align:right;font-weight:900;font-size:13px;color:#2C1654;">TOTAL:</td>
      <td style="padding:7px 12px;text-align:right;font-weight:900;font-size:16px;color:#27AE60;">$${precioFinal.toFixed(2)}</td>
    </tr>
  </table>
</div>

${(p.plazo_entrega || p.lugar_entrega || p.forma_pago) ? `
<div style="background:#FAFAFA;border:1px solid #ddd;border-radius:8px;padding:12px 14px;margin-bottom:14px;font-size:11px;color:#333;line-height:1.5;">
  ${p.plazo_entrega ? `<div style="margin-bottom:6px;"><strong style="color:#2C1654;">📅 Plazo de entrega:</strong> ${p.plazo_entrega}</div>` : ""}
  ${p.lugar_entrega ? `<div style="margin-bottom:6px;"><strong style="color:#2C1654;">📍 Lugar de entrega:</strong> ${p.lugar_entrega}</div>` : ""}
  ${p.forma_pago ? `<div><strong style="color:#2C1654;">💳 Forma de pago:</strong> ${p.forma_pago}</div>` : ""}
</div>` : ""}

<div style="background:#FFF8E1;border:1px solid #FFE082;border-radius:6px;padding:10px 14px;margin-bottom:14px;font-size:11px;color:#856404;">
  <strong>⏱️ Validez:</strong> ${validez} días (vence el ${fmtFecha(vence)}).
</div>

<div style="font-size:10px;color:#666;line-height:1.6;margin-bottom:24px;border-top:1px dashed #ddd;padding-top:10px;">
  <strong>Condiciones generales:</strong><br>
  • Los precios incluyen IVA, mano de obra y materiales según especificación.<br>
  • Forma de pago: anticipo del 50% al confirmar pedido, saldo contra entrega.<br>
  • Fecha de entrega a coordinar al momento de la confirmación.<br>
  • Cambios al diseño o cantidades pueden modificar el precio final.<br>
  • Cotización emitida con base a especificaciones recibidas del cliente.
</div>

<div style="margin-top:40px;text-align:center;position:relative;">
  ${sello ? `<img src="${sello}" style="position:absolute;right:10%;top:-20px;max-width:90px;max-height:90px;opacity:0.85;" alt="sello" />` : ""}
  <div style="display:inline-block;text-align:center;max-width:340px;position:relative;">
    ${firma ? `<img src="${firma}" style="max-width:200px;max-height:60px;display:block;margin:0 auto -10px;position:relative;z-index:1;" alt="firma" />` : ""}
    <div style="border-top:1.5px solid #333;padding-top:8px;">
      <div style="font-size:12px;font-weight:800;color:#2C1654;">${EMPRESA.rl.nombre}</div>
      <div style="font-size:10px;color:#666;margin-top:2px;">${EMPRESA.rl.cargo} — ${EMPRESA.razonSocial}</div>
      <div style="font-size:10px;color:#666;">DUI: ${EMPRESA.rl.dui}</div>
    </div>
  </div>
</div>

<div style="margin-top:24px;text-align:center;font-size:9px;color:#bbb;border-top:1px solid #f0f0f0;padding-top:10px;">
  Cotización N° ${num} · ${EMPRESA.razonSocial} · ${fmtFecha(hoy)}
</div>

</body></html>`;
}

Deno.serve(async (req) => {
  // CORS
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  const corsHeaders = { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" };

  try {
    const body = await req.json();
    const { pedido_id, destinatarios, asunto, mensaje_extra } = body || {};
    if (!pedido_id || !Array.isArray(destinatarios) || destinatarios.length === 0) {
      return new Response(JSON.stringify({ error: "pedido_id y destinatarios[] son requeridos" }),
        { status: 400, headers: corsHeaders });
    }

    // 1) Pedido
    const { data: pedidos, error: errP } = await supabase
      .from("taller_pedidos").select("*").eq("id", pedido_id).limit(1);
    if (errP || !pedidos?.[0]) {
      return new Response(JSON.stringify({ error: "Pedido no encontrado", detail: errP?.message }),
        { status: 404, headers: corsHeaders });
    }
    const pedido = pedidos[0];

    // 2) Config (firma/sello)
    const { data: cfgRows } = await supabase.from("taller_config").select("*");
    const cfg = (cfgRows || []).reduce((acc, r) => ({ ...acc, [r.key]: r }), {});

    // 3) Armar HTML
    const html = armarHTML(pedido, cfg, mensaje_extra || "");

    // 4) Asunto por defecto
    const num = String(pedido.id).padStart(4, "0");
    const subject = asunto || `Cotización N° ${num} — ${EMPRESA.razonSocial}`;

    // 5) Mandar via Resend
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM,
        to: destinatarios,
        subject,
        html,
        reply_to: EMPRESA.email,
      }),
    });
    const data = await r.json();
    if (!r.ok) {
      return new Response(JSON.stringify({ error: "Resend rechazó el envío", detail: data }),
        { status: 502, headers: corsHeaders });
    }

    return new Response(JSON.stringify({
      ok: true,
      message_id: data.id,
      destinatarios,
      subject,
    }), { headers: corsHeaders });
  } catch (e) {
    return new Response(JSON.stringify({ error: e?.message || String(e) }),
      { status: 500, headers: corsHeaders });
  }
});
