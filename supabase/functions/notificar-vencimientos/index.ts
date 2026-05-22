// Edge Function de Supabase — notificar-vencimientos.
//
// Lee taller_pedidos para encontrar pedidos que:
//   • Vencen hoy o mañana, o ya vencieron
//   • No están entregados ni cancelados
//   • No son cotizaciones ni están en papelera
//
// Por cada dispositivo suscrito en taller_push_subs envía una push
// notification con un resumen del día. Si la subscripción dispara error
// 410 (Gone) o 404, se borra de la tabla.
//
// Invocada por pg_cron diariamente. Ver supabase/sql/cron-push.sql.
//
// Secrets requeridos (configurar con `supabase secrets set`):
//   VAPID_PUBLIC_KEY  = clave pública (igual que en pushSubs.js)
//   VAPID_PRIVATE_KEY = clave privada (NO en el repo)
//   VAPID_SUBJECT     = mailto:tu-email@ejemplo.com

// @ts-nocheck — esta función corre en Deno (runtime de Edge Functions),
// no en Node. Sin tipos especiales el tsserver de Node se queja.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "https://esm.sh/web-push@3.6.7";

const SUPA_URL = Deno.env.get("SUPABASE_URL");
const SUPA_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const VAPID_PUBLIC = Deno.env.get("VAPID_PUBLIC_KEY");
const VAPID_PRIVATE = Deno.env.get("VAPID_PRIVATE_KEY");
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") || "mailto:njrmancia@gmail.com";

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);

const supabase = createClient(SUPA_URL, SUPA_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function diasHasta(fechaStr) {
  if (!fechaStr) return null;
  const ms = new Date(fechaStr + "T12:00:00Z") - new Date();
  return Math.ceil(ms / 86400000);
}

function armarMensaje(pedidos) {
  const vencidos = pedidos.filter(p => diasHasta(p.fecha_entrega) < 0);
  const hoy = pedidos.filter(p => diasHasta(p.fecha_entrega) === 0);
  const manana = pedidos.filter(p => diasHasta(p.fecha_entrega) === 1);

  if (vencidos.length === 0 && hoy.length === 0 && manana.length === 0) return null;

  const partes = [];
  if (vencidos.length > 0) partes.push(`${vencidos.length} vencido${vencidos.length === 1 ? "" : "s"}`);
  if (hoy.length > 0) partes.push(`${hoy.length} hoy`);
  if (manana.length > 0) partes.push(`${manana.length} mañana`);

  return {
    title: vencidos.length > 0 ? "⏰ Pedidos vencidos en Taller IMIS" : "📌 Entregas próximas",
    body: partes.join(" · ") + ". Tocá para revisar.",
    url: "/taller-imis-pedidos/",
    tag: "taller-vencimientos-" + new Date().toISOString().slice(0, 10),
  };
}

Deno.serve(async (req) => {
  // Permite invocación HTTP simple para testing. Aceptamos cualquier
  // método, pero solo POST trigger logueado.
  const hoyStr = new Date().toISOString().slice(0, 10);
  const finVentana = new Date();
  finVentana.setDate(finVentana.getDate() + 1);
  const finStr = finVentana.toISOString().slice(0, 10);

  // 1) Buscar pedidos relevantes
  const { data: pedidos, error: errPedidos } = await supabase
    .from("taller_pedidos")
    .select("id, cliente, fecha_entrega, estatus")
    .is("deleted_at", null)
    .neq("estatus", "Entregado")
    .neq("estatus", "Cancelado")
    .eq("es_cotizacion", false)
    .not("fecha_entrega", "is", null)
    .lte("fecha_entrega", finStr);

  if (errPedidos) {
    return new Response(JSON.stringify({ error: errPedidos.message }), { status: 500 });
  }

  const mensaje = armarMensaje(pedidos || []);
  if (!mensaje) {
    return new Response(JSON.stringify({ ok: true, sent: 0, reason: "nada que notificar hoy" }));
  }

  // 2) Cargar suscripciones
  const { data: subs, error: errSubs } = await supabase
    .from("taller_push_subs")
    .select("id, endpoint, p256dh, auth");

  if (errSubs) {
    return new Response(JSON.stringify({ error: errSubs.message }), { status: 500 });
  }

  // 3) Enviar a cada sub
  const payload = JSON.stringify(mensaje);
  const resultados = await Promise.allSettled(
    (subs || []).map(async (s) => {
      const sub = { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } };
      try {
        await webpush.sendNotification(sub, payload);
        await supabase
          .from("taller_push_subs")
          .update({ ultimo_uso: new Date().toISOString(), fallos_consecutivos: 0 })
          .eq("id", s.id);
        return { ok: true, id: s.id };
      } catch (e) {
        const code = e?.statusCode;
        if (code === 410 || code === 404) {
          await supabase.from("taller_push_subs").delete().eq("id", s.id);
          return { ok: false, id: s.id, deleted: true };
        }
        await supabase
          .from("taller_push_subs")
          .update({ fallos_consecutivos: ((s.fallos_consecutivos || 0) + 1) })
          .eq("id", s.id);
        return { ok: false, id: s.id, error: e?.message || String(e) };
      }
    })
  );

  const okCount = resultados.filter(r => r.status === "fulfilled" && r.value.ok).length;
  const failCount = resultados.length - okCount;

  return new Response(JSON.stringify({
    ok: true,
    pedidos_revisados: pedidos.length,
    mensaje,
    subs_total: subs.length,
    enviadas: okCount,
    fallidas: failCount,
  }), { headers: { "Content-Type": "application/json" } });
});
