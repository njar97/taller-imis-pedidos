---
description: Corre el build de producción y reporta tamaño de bundle + errores.
---

Corre `npm run build` y reporta:

1. Si el build pasa: tamaños del `dist/index.html` y de cada chunk en `dist/assets/` (bytes raw + gzip).
2. Si el build falla: muestra el error de Vite/Rollup, identifica la línea de `src/main.js` que rompe, y propone fix si es obvio.
3. Si el build pasa pero hay warnings (chunks grandes, dependencias no encontradas, etc.), listalos en bullets.

Al final indica si está listo para `git push`.
