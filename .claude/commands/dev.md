---
description: Arranca el dev server de Vite en background y avisa cuando esté listo.
---

Arranca el dev server de Vite en background y avisa al usuario cuando esté listo.

1. Si ya hay un proceso de `vite` o un puerto 5173 ocupado, avisa antes de arrancar otro.
2. Si falta `node_modules/`, corre `npm install` primero.
3. Arranca `npm run dev` con `run_in_background: true`.
4. Espera hasta ver la línea con "Local:" o "ready in" en el log y reporta al usuario:
   - URL exacta (incluye el path `/taller-imis-pedidos/` por el `base` de Vite).
   - PID del proceso para que pueda matarlo después si quiere.
5. Recuérdale que los cambios en `src/main.js` y `index.html` recargan automáticamente.
