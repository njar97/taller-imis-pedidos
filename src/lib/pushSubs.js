// Manejo de Web Push Notifications — Paso 1.
//
// Esta lib se encarga del lado del browser: pedir permiso al user,
// suscribirse al servicio de push del navegador, y guardar la
// suscripción en taller_push_subs.
//
// Más adelante (Paso 3) habrá una Edge Function en Supabase que lea
// esta tabla y mande las notificaciones reales cuando un pedido vence.
//
// Flujo:
//   1. usuario toca 'Activar notificaciones'
//   2. browser pide permiso (system prompt)
//   3. si OK: subscribe() con la VAPID public key
//   4. guardamos endpoint + keys en BD
//   5. cuando la Edge Function quiera notificar, lee de la BD y manda
//      mensaje a cada endpoint

import { withRetry } from "./retry.js";

const SUPA_URL  = "https://kszdievqesveluzcnzsh.supabase.co";
const SUPA_ANON = "sb_publishable_XCwHC4aEI6g4_AFXLXbzIg_QpUL_FpX";
const REST = SUPA_URL + "/rest/v1";

// VAPID public key — generada el 21-may-2026 con `npx web-push
// generate-vapid-keys`. La privada vive en la Edge Function (Paso 3).
// Esta pública NO es secreta, sirve solo para identificar al servicio
// que está mandando los push.
export const VAPID_PUBLIC = "BKZ50J8VzKkTWUH0N_776OMYPW1Pm5cyZwiO0u8cTFfTJkv-mqUHa4z2hNHA9I4waF2onMElx7qHDCJFrsZyBc8";

const HEADERS = {
  apikey: SUPA_ANON,
  Authorization: "Bearer " + SUPA_ANON,
  "Content-Type": "application/json",
};

// La API de PushManager requiere la VAPID en formato Uint8Array.
function urlBase64ToUint8Array(b64) {
  const padding = "=".repeat((4 - b64.length % 4) % 4);
  const base64 = (b64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

// Soporte: requiere Service Worker + Push API. iOS Safari soporta
// desde 16.4 SOLO para PWAs instaladas. Android Chrome desde siempre.
export const pushSoportado =
  typeof window !== "undefined" &&
  "serviceWorker" in navigator &&
  "PushManager" in window &&
  "Notification" in window;

// Devuelve el estado actual: 'granted' | 'denied' | 'default' | 'unsupported'
export function estadoPermiso() {
  if (!pushSoportado) return "unsupported";
  return Notification.permission;
}

// Pide permiso al user y se suscribe al servicio de push. Guarda la
// suscripción en taller_push_subs. Devuelve la PushSubscription en
// caso de éxito, null si el user negó o falló algo.
export async function activarPush() {
  if (!pushSoportado) {
    console.warn("Push no soportado en este navegador");
    return null;
  }
  try {
    const permiso = await Notification.requestPermission();
    if (permiso !== "granted") {
      console.info("Permiso de notificaciones:", permiso);
      return null;
    }
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC),
      });
    }
    const ok = await guardarSubEnBD(sub);
    return ok ? sub : null;
  } catch (e) {
    console.warn("activarPush falló:", e?.message || e);
    return null;
  }
}

// Cancela la suscripción local y la borra de la BD.
export async function desactivarPush() {
  if (!pushSoportado) return false;
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      await borrarSubDeBD(sub.endpoint);
      await sub.unsubscribe();
    }
    return true;
  } catch (e) {
    console.warn("desactivarPush falló:", e?.message || e);
    return false;
  }
}

// ¿Hay una suscripción activa en este dispositivo?
export async function suscripcionActiva() {
  if (!pushSoportado) return null;
  try {
    const reg = await navigator.serviceWorker.ready;
    return await reg.pushManager.getSubscription();
  } catch {
    return null;
  }
}

// ── Persistencia en BD ──────────────────────────────────────

function subToPayload(sub) {
  const json = sub.toJSON();
  return {
    endpoint: sub.endpoint,
    p256dh: json.keys?.p256dh || "",
    auth: json.keys?.auth || "",
    user_agent: typeof navigator !== "undefined" ? (navigator.userAgent || "").slice(0, 200) : "",
    ultimo_uso: new Date().toISOString(),
    fallos_consecutivos: 0,
  };
}

async function guardarSubEnBD(sub) {
  try {
    const r = await withRetry(() => fetch(`${REST}/taller_push_subs?on_conflict=endpoint`, {
      method: "POST",
      headers: { ...HEADERS, Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify(subToPayload(sub)),
    }));
    return r.ok;
  } catch (e) {
    console.warn("guardarSubEnBD falló:", e.message);
    return false;
  }
}

async function borrarSubDeBD(endpoint) {
  try {
    const url = `${REST}/taller_push_subs?endpoint=eq.${encodeURIComponent(endpoint)}`;
    const r = await fetch(url, {
      method: "DELETE",
      headers: { ...HEADERS, Prefer: "return=minimal" },
    });
    return r.ok;
  } catch (e) {
    console.warn("borrarSubDeBD falló:", e.message);
    return false;
  }
}
