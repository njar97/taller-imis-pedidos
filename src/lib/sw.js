// Registro del service worker con notificación al usuario cuando hay nueva
// versión disponible (en vez del autoUpdate silencioso del setup anterior).
//
// Patrón pub/sub: cualquier componente React puede `subscribirseUpdate()` para
// recibir `(needsRefresh: boolean) => void` y mostrar un prompt.
//
// Para aplicar la actualización, llamar `aplicarUpdate()` — recarga la página
// con el SW nuevo activo.

import { registerSW } from "virtual:pwa-register";

let needsRefresh = false;
const subs = new Set();

const updateSW = registerSW({
  onNeedRefresh() {
    needsRefresh = true;
    subs.forEach(fn => fn(true));
  },
  onOfflineReady() {
    // App lista para usarse offline. No mostramos prompt — es info de
    // fondo. El usuario ya verá el indicador de offline cuando pierda red.
  },
  onRegisterError(err) {
    console.warn("Service Worker no se pudo registrar:", err);
  },
});

export function subscribirseUpdate(fn) {
  subs.add(fn);
  if (needsRefresh) fn(true);
  return () => subs.delete(fn);
}

export function aplicarUpdate() {
  updateSW(true);
}
