# Taller IMIS — Sistema de Pedidos

App de gestión de pedidos para un taller de bordados y confección en El Salvador.

Producción: https://pedidos.imeltex.com.sv

## Arquitectura real

- **Frontend:** React 18 via **npm** (PR #50, mayo 2026 — antes era CDN unpkg). Vite usa `jsx: 'automatic'` así que no hace falta `import React` en cada `.jsx`; sí hay que importar named (`useState`, `Component`, etc.) lo que se use. El código de la app vive principalmente en módulos `.jsx` decompilados, con `src/main.jsx` como orquestador (App + helpers de impresión/export).
- **Build:** Vite 5 con `vite-plugin-pwa`. `index.html` es el shell; Vite empaqueta `src/main.jsx` y los módulos JSX, reescribe paths. Único CDN externo que queda: `cdn.sheetjs.com` (XLSX para exportar Excel — chunky y de uso esporádico).
- **Hosting:** GitHub Pages. El workflow `.github/workflows/deploy.yml` corre `npm ci && npm run build` y publica `dist/`.
- **PWA:** instalable, con service worker (workbox), manifest, e iconos. `registerType: 'prompt'` — cuando hay nueva versión se avisa al usuario con un banner en vez de actualizar silenciosamente (ver `ConexionStatus.jsx`). CDN libs cacheadas (`CacheFirst`), `api.anthropic.com` marcado como `NetworkOnly`. Config en `vite.config.js`.
- **Resiliencia de red:** `src/lib/retry.js` envuelve fetches con backoff exponencial (300/800/2000ms) para errores transitorios (TypeError "Failed to fetch", 5xx, 408, 429). Usado en `lib/db.js` y `supabaseStorage.js`. Los 4xx no reintentan.

### Backend (datos)

- **Persistencia:** **Supabase Postgres**, via PostgREST. Cliente liviano sin SDK en `src/lib/db.js` (fetch directo, headers con `apikey` + `Authorization`). El módulo expone aliases `dbLeer / dbGuardar / dbBorrar` (pedidos), `dbBord*` (bordados), `dbCuel*` (cuellos), `dbClientes*` y `dbCatalogo*`.
- **Soft-delete:** los borrados se marcan con `deleted_at`, no se eliminan físicamente. La papelera (admin) los recupera. Ver `SeccionPapelera.jsx`.
- **Realtime:** suscripción WebSocket directa a Postgres para sincronizar cambios entre dispositivos. Sin SDK, ver `src/lib/realtime.js`.
- **Project ID:** `kszdievqesveluzcnzsh` (`taller-imis-produccion`). Tablas relevantes: `pedidos`, `bordados`, `cuellos`, `clientes`, `catalogo`.
- **Enlaces entre registros:** no hay FKs; las relaciones son texto con el id, resueltas en el cliente.
  - `taller_bordados.conf_ref` / `taller_cuellos.conf_ref` → `taller_pedidos.id` (el bordado/cuello cuelga de una confección).
  - `taller_pedidos.origen_ref` → `taller_pedidos.id` (de qué cotización/pedido sale este). Lo pinta `CadenaPedido` en el modal de detalle, en ambos sentidos.
  - `personas[]` NO tiene identidad estable: se cruzan por nombre normalizado. Ojo que "Lindsay Romero" y "Lindsay Clarisa Romero" son la misma cadete y hoy no matchean.

### Fotos y archivos

- **Storage:** **Supabase Storage**, bucket `taller-imis-fotos` (público). Cliente sin deps en `src/supabaseStorage.js`. Funciones `subirFotoSupabase` (data URL → JPEG), `subirArchivoSupabase` (File binario), `borrarFotoSupabase`.
- **Compresión:** las fotos se comprimen en el cliente antes de subir (canvas → JPEG max 900px, calidad 0.82). Ver `src/lib/imagenes.js`.
- **Compatibilidad:** fotos viejas en Google Drive siguen mostrándose (campo `driveUrl`). Las nuevas van a `supabaseUrl`. El helper `imgSrc` resuelve cualquiera de las tres fuentes (`data` local, `supabaseUrl`, `driveUrl`).
- **Tipos de archivo de bordado:** `.emb` y `.dst/.pes/.jef` (diseños Wilcom) también se suben a Supabase Storage. Ver `BordadoModal` en `SeccionBordados.jsx`.

### Asistente IA

- La app llama a la API de Anthropic (Claude) **desde el navegador**. La key la pega el usuario y se guarda en `localStorage` (`taller_ia_key`).
- Header `anthropic-dangerous-direct-browser-access: true`, modelo `claude-haiku-4-5-20251001`.
- Implementación: `src/ModalAsistenteIA.jsx` con chat + entrada por voz (Web Speech API) + TTS de respuestas.
- CORS: usa `https://corsproxy.io/?https://api.anthropic.com/...` como fallback si la llamada directa falla.

### Vestigios

- **Google Apps Script:** existía como backend previo. **Eliminado por completo** (PR #35, mayo 2026). El módulo `src/lib/api.js` ya no existe. Si en el futuro hay que rescatar data legacy, está en git history.
- **El proyecto Supabase está compartido con otra app** del mismo cliente (sistema de producción/escuelas con tablas `pedido` singular, `alumno`, `escuela`, `tendido*`, `trazo*`, `bodega_movimiento`, vistas `vw_*`, bucket Storage `trazo-fotos`).
  - **Esa otra app SÍ está en producción con datos reales.**
  - **Nunca toques esas tablas/políticas/funciones/vistas sin permiso explícito.**

## Estructura del código

### Módulos JSX extraídos

Después de cuatro sesiones de decompile (mayo 2026), el código que originalmente era un `<script>` inline de 15 330 líneas quedó como `main.jsx` (~1 745 líneas) más ~30 módulos JSX en `src/`. Lo que queda en `main.jsx`: imports, helpers de impresión/exportación (`imprimirPedido`, `exportarExcelMes`, `exportarPedidoPDF`), y el componente `App` raíz que orquesta state global, lazy loading y realtime — su return ahora es JSX legible que compone los módulos extraídos.

Módulos extraídos en `src/`:

- **Pantallas/secciones:** `PantallaLogin`, `SeccionEstadisticas`, `SeccionClientes`, `SeccionCatalogo`, `SeccionInventario`, `SeccionBordados` (+ `BordadoModal`), `SeccionCuellos` (+ `CuelloModal`), `SeccionPedidos`, `SeccionPapelera` (lazy)
- **Formularios:** `FormPedido` (~700 líneas), `RegistroAbonos`, `ModalAsistenteIA`
- **Componentes reutilizables:** `CardPedido`, `ProximasEntregas`, `ListaPrendas` (+ `TablaPersonasInternas`), `SelectorTallas` (+ `TallasChips`), `BuscadorConfRef`
- **Shell / PWA / Nav:** `ErrorBoundary`, `ConexionStatus` (offline + new-version), `InstallPrompt`, `SidebarDesktop`, `TopbarMobile`, `BottomNav`, `MasOpenSheet` (+ `lib/navItems.js`)
- **Modales globales:** `DetallePedidoModal` (vista "ver pedido"), `VisorImagenes` (lightbox), `ModalArchivar` (pedido vencido), `ModalActMedidas`, `ModalErrorFotos`, `ModalConfirmarBorrar`
- **Helpers UI (`src/lib/ui.jsx`):** `Toaster`, `ConfirmDialog`, `Check`, `UploaderImagenes`, `BarraProgreso`, `Chips`, `FechasRapidas`, `SeccionOpcional`, `BannerMedidas`, `WABtn`

### Módulos de soporte en `src/lib/`

- `constants.js` — estados, opciones, tallas, medidas
- `dominio.js` — `fmt$`, `hoy`, `resumenTallas`, `PEDIDO_BASE`, etc.
- `feedback.js` — bus `pushToast`/`pushConfirm` (accesible desde cualquier módulo)
- `db.js` — backend Postgres (PostgREST)
- `realtime.js` — suscripción WebSocket
- `imagenes.js` — `imgSrc`, `comprimirImagen`, helpers Drive
- `idb.js` — cache local de imágenes (IndexedDB)
- `whatsapp.js` — `mensajeWA`, `copiarWA`
- `hooks.js` — `useDebouncedCallback`
- `Modal.jsx` — modal genérico (bottom-sheet con header + close)
- `catalogoBase.js` — catálogo de 8 productos default (fallback cuando la BD está vacía)
- `leerDB.js` — lector SQLite para archivos DTE (`.db`)
- `retry.js` — `withRetry` con backoff exponencial para errores transitorios
- `reportError.js` — fire-and-forget POST de excepciones a la tabla `taller_errores` en Supabase (lo invoca `ErrorBoundary.componentDidCatch`)
- `sw.js` — registro del service worker + bus de "nueva versión disponible"
- `navItems.js` — `getNavItems(rol, esAdmin)` + `NAV_IDS_VISIBLES`, compartido por Sidebar/BottomNav/MasOpenSheet

### Componente App (en main.jsx)

JSX 100% legible (PR #54, mayo 2026 — antes era `createElement` compilado). ~1 745 líneas. Hace:
- State global (pedidos, bordados, cuellos, clientes, catálogo, inventario)
- Auth/rol (PIN admin guardado en localStorage)
- Navegación entre secciones
- Suscripción realtime + reconexión
- Carga inicial + reintentos
- Composición de la shell (SidebarDesktop/TopbarMobile/BottomNav/MasOpenSheet) y de los modales globales (DetallePedidoModal, ModalArchivar, VisorImagenes, etc.)

**Estructura del return:** un `<div root>` contiene `BarraProgreso?`, `SidebarDesktop`, `<main>`, y todos los modales globales como siblings. Dentro de `<main>` viven `TopbarMobile`, las secciones condicionales (`seccion === "..." && <SeccionX />`), `BottomNav`, y `MasOpenSheet`. Los modales (`ModalArchivar`, `ModalAsistenteIA`, `DetallePedidoModal`, `VisorImagenes`, `ModalErrorFotos`, `ModalActMedidas`, `ModalConfirmarBorrar`) y los helpers PWA (`Toaster`, `ConfirmDialog`, `ConexionStatus`, `InstallPrompt`) son siblings del `<main>`, no hijos.

## Comandos

```bash
npm install        # instalar deps (Vite + vite-plugin-pwa + react + react-dom + vitest)
npm run dev        # dev server en http://localhost:5173/
npm run build      # genera dist/ con PWA assets
npm run preview    # sirve dist/ como en prod
npm run test:run   # corre la suite de vitest una vez (39 tests sobre lib/)
npm test           # vitest en watch mode
```

## Slash commands (Claude Code)

Las definiciones están en `.claude/commands/`. Para agregar más, dropear un `.md` ahí con frontmatter `description: ...` y el cuerpo es el prompt que se ejecuta.

- `/dev` — arranca el dev server en background y avisa cuando esté listo.
- `/build` — corre `npm run build`, reporta tamaños y errores.
- `/pwa` — (legacy) define cómo se hizo la conversión a PWA. La PWA ya está instalada.

## MCP de Supabase

Configurado en `.mcp.json` (modo read-only, scope al proyecto `kszdievqesveluzcnzsh`). Para activarlo en local, exportá tu personal access token de Supabase:

```powershell
# Windows PowerShell — persiste entre sesiones
[Environment]::SetEnvironmentVariable("SUPABASE_ACCESS_TOKEN", "sbp_...", "User")
```

```bash
# macOS / Linux — agregalo a tu ~/.bashrc o ~/.zshrc
export SUPABASE_ACCESS_TOKEN="sbp_..."
```

Generá el token en https://supabase.com/dashboard/account/tokens. Con eso, Claude Code puede listar tablas, hacer queries, mirar advisors, etc., sin tener que pasar por mí.

Modo read-only: el MCP no puede ejecutar `apply_migration` ni `execute_sql` con DDL. Si necesitás hacer cambios en la BD, quitá el `--read-only` de `.mcp.json` temporalmente o ejecutá el SQL desde el dashboard de Supabase.

## Deploy

Push a `main` dispara GitHub Actions → `npm ci && npm run build` → publica `dist/` en Pages. La URL queda viva en ~1 min.

## Convenciones

- Branches: `feature/<nombre>`, `fix/<nombre>`, `refactor/<nombre>`, `docs/<nombre>`; mergear a `main` por PR.
- Commits: conventional (`feat:`, `fix:`, `refactor:`, `ci:`, `docs:`).
- Antes de pushear cambios en `src/`, correr `npm run build` localmente para detectar errores temprano.
- No commitear `node_modules/`, `dist/`, ni archivos con secretos.

## Historial reciente

**4-5 ago 2026 — Cotización de uniformes Mizata + camisetas EPAL (PRs #178, #179, #180)**

Código, todo en `main` y desplegado:
- **#178** — `imprimirCotizacion` no renderizaba `p.imagenes` (solo `imprimirPedido` lo hacía).
  Sección "Referencia visual" después de los totales.
- **#179** — `conjuntos` en el pedido: agrupa las prendas en uniformes por puesto
  (`{id, nombre, piezas:[{nombre, qty}]}`; cada pieza cruza por nombre con el `tipo` de los
  items para resolver el precio). Sale en la cotización impresa, en `FormPedido` y en
  `DetallePedidoModal`. **No suma al total del pedido**, solo agrupa.
  ALTER: `taller_pedidos.conjuntos jsonb not null default '[]'`.
- **#180** — código por renglón (`P-01`, `P-02`…) en la columna "Cód." del detalle y debajo
  de cada foto; el cruce foto↔renglón es por contención de nombre con respaldo por palabras
  compartidas (70%). El `page-break-inside:avoid` pasó del contenedor de la galería a cada
  foto: antes una galería larga empujaba media página en blanco.

Datos en producción:
- **Cliente 12 Mizata Native Resort** · **COT-0064** (polos $16) · **COT-0065** (uniformes por
  área): 17 prendas, 13 conjuntos, 17 fotos, costos en `desglose_estimador`. Total $403.41
  ($357.00 + IVA).
- **Catálogo ids 9-25**: las 17 prendas de uniforme con precio, costo verificado, telas,
  colores y tiempo. **Sin imágenes** — se van a generar con Gemini (ghost mannequin, fondo
  gris claro; ya está cargada la id 9). Las fotos viejas de Mizata NO se reusan: llevan su
  logo bordado.
- **Pedido 60 EPAL**: 58 camisetas cargadas en `personas[]` con nombre, talla y color en
  `prendas[].spec`. Verde 22 · Celeste 18 · Amarillo 18.

Decisiones de negocio que valen para futuras cotizaciones:
- **Costeo:** `(tela $/yd × yardas) + (pago del día ÷ prendas por día) + bordado + insumos`,
  por margen. Confundir la hechura con la ganancia fue lo que inflaba los precios.
- **IVA aparte, no incluido.** El cliente empresa recupera el crédito fiscal, así que no le
  encarece; absorberlo cuesta ~13 puntos de margen. La app asume que `precio` YA lleva IVA
  (`imprimirCotizacion` hace `subtotal = precio / 1.13`), así que se guarda el total con IVA
  y los precios unitarios netos.

**31 jul 2026 — Verificación de la hoja física INSO + camisetas (solo datos, sin código)**
- Pedido 36 (cadetes): los 16 tienen medidas completas — se copiaron las 10 de la cotización 27
  y se cargaron de la hoja del cuaderno las de los 6 nuevos. `fecha_entrega = 2026-08-20`.
- Corrección aplicada en 27 y 36: cintura de pantalón de Adonay Alemán 91→83 (corrección en
  morado en la hoja).
- Pedido 63 nuevo: **Camiseta negra** ($4 c/u), 7 cadetes del mismo grupo, `origen_ref = 36`.
  Total $28, cobrado $14 (Isaac 4, Carlos 4, Marvin 4, Adonay Rivera 2).
- Guantes: $1.50 extra por cadete, sin lista aún — anotado en notas del 36.
- **POR CONFIRMAR con el dueño** (quedó también en las notas del pedido 36): muslo de Franklin
  Arévalo (¿74 o 78?) y su camisa pecho/cintura (¿100/100 o 108/104?); hombro de Adonay Rivera
  (¿43 o 47?); si los $2 de camiseta de Rivera son abono parcial o precio especial; columnas
  finales de camisa de Sofía y Karina (ilegibles en la hoja).
- ⚠️ Contexto: la sesión sufrió un bug de la UI de preguntas (AskUserQuestion no enviaba y
  reaparecía). El usuario avisó que las respuestas dadas por esos cuadros NO son confiables.
  Todo lo listado arriba salió de la hoja física y de la BD, no de esos cuadros — pero
  reconfirmar los pendientes por mensaje de texto normal, sin usar preguntas emergentes.

**30 jul 2026 — Enlace entre pedidos + detalle por beneficiario (claude/cotizacion-prendas-u5q011)**
- ALTER: `taller_pedidos.origen_ref text` (nullable, sin FK). `PEDIDO_BASE.origenRef = ""`.
- `CadenaPedido` en `DetallePedidoModal`: tarjetas "📋 Viene de COT-XXXX" y "➡️ Derivó en N°XXXX",
  con resumen (personas, cuántas con medidas, cuánto abonado) y botón "Ver →" que abre el otro
  pedido en el mismo modal. Se resuelve en el cliente sobre el array `pedidos`.
- `FormPedido`: sección "Viene de otra cotización o pedido" reusando `BuscadorConfRef`
  (que ahora acepta `labelVacio`).
- El modal de detalle listaba a la misma gente hasta tres veces (Abonos → Beneficiarios →
  Medidas por persona). Ahora cada fila de Beneficiarios es un acordeón con sus prendas,
  medidas y abono; se agrega columna "Abonado" (admin); "Abonos registrados" se colapsa a un
  resumen cuando cada abono ya está atribuido a un beneficiario. Se eliminó `MedidasPersonas`.
- Enlazado en producción: pedido 36 (Cadetes Cívicos INSO) → cotización 27 (INSO).

**18 may 2026 — Captura de errores async (PR #60)**
- `installGlobalErrorHandlers()` instala listeners de `window.error` y `unhandledrejection` que postean a la misma tabla `taller_errores` con `tipo='window.error'` o `'unhandledrejection'`.
- Se llama desde `main.jsx` antes de `createRoot` para no perder errores del primer render.
- Filtra errores de carga de recursos (img.onerror sin `.error`) para no llenar la tabla de ruido.
- ALTER: `taller_errores` ahora tiene columna `tipo text not null default 'render'`.

**18 may 2026 — Reporte de errores a Supabase (PR #58)**
- Tabla nueva `taller_errores` (sólo INSERT desde `anon`, sin SELECT/UPDATE/DELETE — se lee desde el dashboard).
- `src/lib/reportError.js`: fire-and-forget POST con mensaje, stack, component_stack, url, user_agent, app_version. Sin retry, sin toasts, sin throws — vive en `componentDidCatch`. `keepalive: true` para sobrevivir al botón "Recargar app".
- `vite.config.js` inyecta `__APP_VERSION__` = commit SHA corto en build time.

**17 may 2026 — Decompile del return de App (PR #54)**
- `src/main.js` → `src/main.jsx`. Vite procesa JSX en `.jsx` por defecto.
- El return de App pasa de cadena de `createElement(...)` a JSX legible.
- Cierra el ciclo del decompile: el código de App es ahora React contemporáneo.

**17 may 2026 — Tests con vitest (PR #52)**
- 39 tests sobre `lib/dominio.js`, `lib/retry.js`, `lib/db.js`. Cobertura de las funciones puras + comportamiento de retry + mocks de fetch para verificar conversión camelCase ↔ snake_case y soft-delete.
- `npm run test:run` para correr una vez, `npm test` en watch mode.

**17 may 2026 — npm React (PR #50)**
- react@18 + react-dom@18 ahora vienen de `package.json`, no del CDN de unpkg.
- Vite usa `jsx: 'automatic'` (esbuild auto-importa `jsx-runtime`).
- 22 archivos JSX convertidos: `const { useState } = React;` → `import { useState } from "react";`.
- Bundle total cold-load similar (~120 KB gzip vs ~116 KB antes con React CDN). Ganamos versión pinned, resiliencia y upgrade vía `npm`.

**4 jun 2026 — Hooks de carga e imprimir.js (claude/video-review-FAsOo)**
- `src/lib/useCargarDatos.js` — hook que encapsula el useEffect de carga inicial (Promise.all con gsLeer/gsBordLeer/gsCuelLeer/gsClientesLeer/gsCatalogoLeer, normFecha, parseCampo, merge IDB, fallback clientes). `main.jsx`: 1472 → 1353 líneas (-119).
- `src/lib/useRealtime.js` — hook de suscripción WebSocket a Postgres. Extracción anterior en la misma sesión.
- `src/lib/imprimir.js` — 8 funciones de impresión/export extraídas de main.jsx (tablaPorPersonaHTML, imprimirPedido, nuevaVentanaImpresion, imprimirCotizacion, imprimirRecibo, imprimirProduccion, exportarExcelMes, exportarPedidoPDF). ~800 líneas movidas.
- main.jsx acumulado: 2545 → 1353 líneas (-47% en la sesión).

**4 jun 2026 — Tests y JSDoc (claude/video-review-FAsOo)**
- `src/lib/feedback.test.js` — 16 tests para el bus de toasts y confirm (el nodo más conectado del grafo, 41 edges, antes sin cobertura). Cubre pushToast, pushUndo (idempotencia, expiración, undo que lanza), pushConfirm (Promise, resolve, clear).
- `src/lib/whatsapp.test.js` — 35 tests para mensajeWA (padding, íconos, días/venció, admin/no-admin, privacidad de notas internas), mensajeCotizacionWA (vencimiento), mensajeComparativoWA (opciones, precio/unidad), compartirTextoImagenes (share/clipboard/AbortError).
- `src/lib/dominio.js` — JSDoc para `fmt$`: `"$" + parseFloat(n || 0).toFixed(2)`.
- Fix `src/lib/dominio.test.js` — `PEDIDO_BASE.estatus` corregido de "Tomado" → "Corte".
- Total suite: 90/90 tests pasando.

**17 may 2026 — Decompile total del cuerpo del App (PRs #38-48)**
- #38: `BottomNav` + `lib/navItems.js` (NAV compartido entre sidebar / bottom / sheet).
- #39: `MasOpenSheet` (bottom-sheet "Más" con items que no caben en la barra).
- #40: `SidebarDesktop` (header + nav + métricas + cerrar sesión).
- #41: `TopbarMobile` (barra superior mobile).
- #42: `ModalArchivar` (pedido vencido — ¿fue entregado?).
- #43: `ModalActMedidas` (¿actualizar medidas del cliente?).
- #44: `VisorImagenes` (lightbox fullscreen con swipe + thumbnails).
- #45: `ModalErrorFotos` + `ModalConfirmarBorrar`.
- #47: `DetallePedidoModal` (vista "ver pedido", −500 líneas).
- #48: `SeccionPedidos` (toolbar + tabs + tabla/cards, −430 líneas).

main.js: 3 521 → ~1 640 líneas (-53% en una sesión, -89% acumulado). El App ya casi no tiene JSX inline.

**17 may 2026 — Cierre de mantenimiento + features (PRs #31-36)**
- #31: actualización completa de `CLAUDE.md` al estado real.
- #32: banner offline + prompt "nueva versión disponible" (`registerType: 'prompt'`).
- #33: banner "Instalar como app" (Android/Chrome + iOS Safari).
- #34: reintento automático con backoff (`lib/retry.js`) — `db.js` + `supabaseStorage.js`.
- #35: eliminación del módulo `lib/api.js` (Apps Script vestigial) + arreglo de enlace `SCRIPT_URL` que era ReferenceError latente.
- #36: extracción de `ErrorBoundary` a `src/ErrorBoundary.jsx`.

**16 may 2026 — Sesión masiva de decompile JSX (PRs #19-30)**
- 12 PRs en una sesión. `main.jsx`: 15 330 → ~3 600 líneas.
- 17 módulos JSX nuevos en `src/` y `src/lib/`.
- Bundle prácticamente igual (~317 KB raw / ~73 KB gzip).
- Lo único que queda compilado: el componente `App` (~2 700 líneas) y helpers de impresión/export.

**Mayo 2026 — Migración backend (PRs #11-14)**
- #11: flip backend de Apps Script → Postgres (PostgREST de Supabase).
- #12: cerrar dependencia del Apps Script (los CRUD reales pasan por Supabase).
- #13: soft-delete (deleted_at) en backend.
- #14: papelera UI + sync realtime entre dispositivos.

**13 may 2026 — Migración a Vite (PR #1, commit `50ccf74`)**
- Extraído el `<script>` inline de `index.html` (15 330 líneas) a `src/main.jsx`.
- Agregado `package.json`, `vite.config.js`, `.gitignore`.
- Workflow ahora corre `npm ci && npm run build` y publica `dist/`.

**13 may 2026 — Audit y lockdown de Supabase**
- `DROP FUNCTION public.exec_sql(text)` — era un RCE accesible por `anon` desde la anon key.
- `REVOKE EXECUTE ON public.handle_new_auth_user()` para `anon`/`authenticated`.
- `DROP POLICY acceso_publico_*` en las 5 tablas del taller (eran `USING(true) WITH CHECK(true)`).
- `REVOKE ALL` en esas tablas para `anon`/`authenticated`. (Nota: cuando se flipeó el backend a Supabase, hubo que crear políticas nuevas con grants adecuados — están en producción.)

## Pendientes ordenados por valor/riesgo

Salen de auditar el caso INSO (cotización 27 + pedido 36 = el mismo grupo de cadetes,
partido en dos filas que no se conocían). El enlace `origen_ref` ya está; falta lo demás.

0. **Contornos reales de los moldes (lo que sigue ahora mismo, se retoma desde la PC).**
   `taller_moldes` guarda solo la **caja** de cada pieza: `ancho_cm` × `alto_cm`. Las columnas
   `perimetro_cm`, `ancho_25`, `ancho_50` y `ancho_75` están **NULL en las 125 filas de
   camiseta**, así que no hay silueta: un trazo dibujado con estos datos son rectángulos, y
   el metraje sale sobreestimado (seguro para comprar, malo para optimizar).

   Los contornos están en los PDF de cada pieza (`taller_moldes.archivo_pdf`, ej.
   `camiseta-T6-cuerpo-fila5-36.9x50.2.pdf`), todos extraídos de
   **`Camisetas Masculinas en COREL.pdf`**. Esos archivos viven en la PC
   (`My Embroidery\...`), NO en Supabase Storage — se verificó, el bucket no los tiene.

   Plan: (a) extraer el path vectorial de cada PDF; (b) `ALTER TABLE taller_moldes ADD COLUMN
   contorno jsonb` con el polígono en cm relativo a la caja; (c) redibujar el trazo encajando
   la manga en el hueco de la sisa. Se espera recuperar 8-15% de tela contra el cálculo por
   cajas.

   Sin bloquear: **la compra de EPAL ya se puede hacer** con el cálculo por cajas —
   a 180 cm de ancho, 13 yd verde · 11 celeste · 10 amarillo (58 camisetas, 10% de merma
   incluido). A 150 cm son 14.5 / 13 / 11; en tubular de 90 se dispara a 22.5 / 19.5 / 17.5.

   Pendientes de datos del pedido 60 (EPAL): confirmar la lectura de cinco nombres para los
   transfers de manga (**Salehk, Daviela, Reinita, Anggely, Kadir**); el pack de moldes trae
   **seis variantes de cuerpo por talla sin marcar cuál es delantera y cuál espalda**;
   **Alisson** va a la medida (hombro 37 · busto 96 · largo 52 · cadera 101 · sisa 45 ·
   escote 40 · LMD 16 · puño 34) y no entra en el conteo de tela; la maestra **Carmen va sin
   nombre** en la manga → 57 transfers, no 58. Sigue sin definirse quién pone la camiseta y
   el precio de venta.

   Mizata (COT-0065): el **saco forrado quedó en $77 como supuesto** — el resumen de precios
   traía solo "Saco $52", que se tomó como la sacola sin forro. Falta confirmarlo.

1. **Precio en pedidos por persona.** Cuando `personas[].prendas[].precio` viene vacío y el
   pedido tampoco tiene `precio`, `detalleFactura` da **total $0.00** y el saldo sale
   negativo (pedido 36: $0.00 de precio contra $675.00 abonado = saldo −$675.00). Peor:
   `descuadre` no salta, porque exige `sumaLineas != null` y sin precios es `null`. O sea,
   el caso que más necesita alerta es justo el que pasa callado.
2. **Fallback de medidas por persona.** `FormPedido` busca medidas en `p.medidas` (el juego
   único a nivel de pedido, para órdenes de una sola persona) y nunca mira
   `personas[].medidas`. En pedidos de grupo las medidas ya tomadas quedan invisibles aunque
   los registros estén enlazados por `origen_ref`.
3. **Identidad de persona.** Hoy una persona es un string de nombre. Con una llave estable
   (carné del cadete, o nombre normalizado + cotejo al importar de Excel) las medidas,
   tallas y abonos seguirían a la persona entre pedidos.
4. ~~**Unificar cliente.**~~ ✅ Hecho (30 jul 2026). Los pedidos 27, 34 y 36 pasaron de
   `INSO` / `Banda INSO` / `Cadetes Cívicos INSO` a **`Instituto Nacional de Sonzacate
   (INSO)`** (ojo: Son**z**acate, no Sonsonate), con `tipo_cliente = escuela`, y se dio de
   alta el cliente id 10 en `taller_clientes`. Modelo copiado de la USO, que ya tenía sus
   12 pedidos bajo `Universidad de Sonsonate (USO)`. Los grupos se distinguen por
   `tipoPrenda` (uniforme de banda vs. uniforme cadete cívico).

   Queda pendiente lo mismo para la USO: sus pedidos comparten nombre pero **tampoco está
   en `taller_clientes`**, así que su historial no se abre desde la sección Clientes.
   Y el kit USO (filipina #54 · bolso #56 · gabacha #57 · gorro #58) declara su parentesco
   sólo como texto en `notas` — es candidato natural para `origenRef`.

## Secrets

- **Nunca** hardcodear API keys o tokens. La Claude API key se pide al usuario y vive en `localStorage`.
- La **publishable key de Supabase** (`sb_publishable_...`) está hardcodeada en `src/lib/db.js` y `src/supabaseStorage.js`. Es la key pública (RLS la protege). No es secreta.
- Si necesitás un PAT de GitHub para pushear: generálo con permisos mínimos (`Contents: Read and write`, y `Workflows: Read and write` solo si vas a modificar `.github/workflows/`).
