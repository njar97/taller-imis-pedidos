---
description: Convierte la app en PWA instalable con soporte offline básico.
---

Convertir la app en PWA. Pasos:

1. **Instalar `vite-plugin-pwa`** como devDependency:
   ```
   npm install -D vite-plugin-pwa
   ```

2. **Configurar el plugin en `vite.config.js`** con:
   - `registerType: 'autoUpdate'`
   - `manifest` con nombre, descripción, theme color, icons (192 y 512).
   - `workbox.runtimeCaching` para cachear:
     - El bundle JS y el HTML (cache-first).
     - Las llamadas a `script.google.com/macros/...` (network-first con fallback a cache, así si no hay red ve los pedidos en caché).
     - Las imágenes de Drive (cache-first, max 50 entries).

3. **Agregar iconos** `pwa-192x192.png` y `pwa-512x512.png` en `public/`. Si no tenemos icono propio, generar uno rápido con un emoji o el logo del taller en `<canvas>` y exportarlo (preguntar al usuario antes).

4. **Probar el build localmente**:
   - `npm run build`
   - `npm run preview` → abrir en navegador, abrir DevTools → Application → Manifest, verificar que el botón "Install" aparezca.

5. **Confirmar antes de pushear** que el service worker registra y cachea correctamente.

⚠️ Importante: el Apps Script es la única fuente de datos. Si cacheamos sus respuestas, los cambios concurrentes de otros operarios pueden no verse hasta que se invalide el cache. Conviene poner TTL corto (5-10 min) en el runtime caching de Apps Script.

Antes de empezar, preguntar al usuario:
- ¿Tiene un icono propio o generamos uno con un emoji?
- ¿Qué color usar como `theme_color`? (default sugerido: `#2C1654` que es el morado que se ve en el código).
