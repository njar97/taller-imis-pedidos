// Service Worker custom para Taller IMIS — combina:
//   • Precaching de assets (Workbox manifest inyectado por vite-plugin-pwa)
//   • Runtime caching de CDN externos y Supabase
//   • Handler de Push para web push notifications
//   • Handler de notificationclick para abrir la app al tocar la notif
//
// Este archivo reemplaza el SW generado automáticamente cuando
// usamos strategies: 'injectManifest' en vite.config.js.
//
// Referencias:
//   https://developer.mozilla.org/en-US/docs/Web/API/Push_API
//   https://web.dev/articles/push-notifications-handling-messages

import { precacheAndRoute } from "workbox-precaching";
import { registerRoute } from "workbox-routing";
import { CacheFirst, NetworkOnly } from "workbox-strategies";
import { ExpirationPlugin } from "workbox-expiration";
import { CacheableResponsePlugin } from "workbox-cacheable-response";

// ── Precache (manifest inyectado por el plugin en build) ──
precacheAndRoute(self.__WB_MANIFEST || []);

// ── Runtime caching de CDNs ──
registerRoute(
  ({ url }) =>
    url.origin === "https://cdn.sheetjs.com" ||
    url.origin === "https://cdnjs.cloudflare.com",
  new CacheFirst({
    cacheName: "cdn-libs",
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 30 }),
    ],
  })
);

// API de Anthropic: never cachear (cambios de respuesta cada llamada).
registerRoute(
  ({ url }) => url.hostname === "api.anthropic.com",
  new NetworkOnly()
);

// ── Activación inmediata (alineado con registerType: 'prompt') ──
self.addEventListener("message", event => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// ── Push handler ──
// El payload viene de la Edge Function de Supabase. Esperamos JSON
// con shape { title, body, url?, tag? }. Si no hay payload (push test
// vacío), mostramos un mensaje genérico.
self.addEventListener("push", event => {
  let data = { title: "Taller IMIS", body: "Nueva notificación", url: "/" };
  if (event.data) {
    try {
      const json = event.data.json();
      data = { ...data, ...json };
    } catch {
      data.body = event.data.text() || data.body;
    }
  }
  const options = {
    body: data.body,
    icon: "/pwa-icon.svg",
    badge: "/pwa-icon.svg",
    tag: data.tag || "taller-default",
    data: { url: data.url || "/" },
    requireInteraction: false,
  };
  event.waitUntil(self.registration.showNotification(data.title, options));
});

// Al tocar la notif, intenta enfocar una pestaña abierta de la app.
// Si no hay ninguna, abre una nueva en la URL del data.
self.addEventListener("notificationclick", event => {
  event.notification.close();
  const targetURL = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(clients => {
      for (const c of clients) {
        if (c.url.startsWith(self.registration.scope) && "focus" in c) return c.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetURL);
    })
  );
});
