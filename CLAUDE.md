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

**31 jul 2026 — Pendientes INSO 1 y 2 + cierre USO (claude/inso-pendientes-idepum)**
- `detalleFactura` gana `qtySinPrecio` + `incompleto`; `DetallePedidoModal` y `CardPedido`
  alertan pedidos con abonos y sin precios (el caso del pedido 36) en vez de saldo negativo.
- Fallback de medidas por persona: índice por `normNombre` sobre `personas[].medidas` de
  otros pedidos, botón "Usar del N°X" y banner "Copiar todas" en `FormPedido`/`ListaPrendas`.
- Datos: USO dada de alta en `taller_clientes` (id 11), pedido 40 renombrado al nombre
  canónico, `origen_ref` 40→53 y 56/57/58→54 (kit, en papelera).
- Tests: 155 (7 nuevos sobre `detalleFactura` y `tieneMedidas`).
- Vista por beneficiario entre pedidos (pedido del dueño): `otrosPedidosPorPersona` en
  `dominio.js` cruza por `normNombre` dentro del mismo cliente o la cadena `origenRef`.
  En Beneficiarios, cada persona muestra badge "+N pedidos" y su acordeón lista qué pidió
  en cada uno (N°/COT, prendas, precio, abono) con link al otro pedido. Solo lectura: no
  separa los pedidos del cliente (el 36 y el 63 siguen siendo del INSO). Tests: 159.
- Lista unificada del grupo en la vista 🛒 Carrito: `listaUnificadaGrupo` (dominio.js) une
  el pedido abierto con los enlazados que comparten personas (excluye cotizaciones — se
  duplicaría el trabajo — y cancelados) y arma un renglón por persona con todo lo que
  pidió, total, abonado y saldo. Imprimible/PDF/WA con `imprimirListaGrupo` (imprimir.js).
  Cada pedido sigue facturándose por su lado. Tests: 161.

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

1. ~~**Precio en pedidos por persona.**~~ ✅ Hecho (31 jul 2026,
   `claude/inso-pendientes-idepum`). `detalleFactura` devuelve `qtySinPrecio` e
   `incompleto` (prendas sin precio + pedido sin precio acordado). El detalle del pedido y
   `CardPedido` usan el total real (precio del pedido o suma de líneas) y muestran "⚠ sin
   precio · $X abonado" en vez del saldo negativo callado.
2. ~~**Fallback de medidas por persona.**~~ ✅ Hecho (31 jul 2026, mismo branch).
   `FormPedido` indexa `personas[].medidas` de los demás pedidos por nombre normalizado
   (`normNombre`), priorizando la cadena `origenRef`. Botón por persona "📐 Usar del N°X"
   en `ListaPrendas` + banner "Copiar todas" cuando varias personas ya tienen medidas en
   otro pedido.
3. **Identidad de persona.** Hoy una persona es un string de nombre. Con una llave estable
   (carné del cadete, o nombre normalizado + cotejo al importar de Excel) las medidas,
   tallas y abonos seguirían a la persona entre pedidos.
4. ~~**Unificar cliente.**~~ ✅ Hecho (30 jul 2026). Los pedidos 27, 34 y 36 pasaron de
   `INSO` / `Banda INSO` / `Cadetes Cívicos INSO` a **`Instituto Nacional de Sonzacate
   (INSO)`** (ojo: Son**z**acate, no Sonsonate), con `tipo_cliente = escuela`, y se dio de
   alta el cliente id 10 en `taller_clientes`. Modelo copiado de la USO, que ya tenía sus
   12 pedidos bajo `Universidad de Sonsonate (USO)`. Los grupos se distinguen por
   `tipoPrenda` (uniforme de banda vs. uniforme cadete cívico).

   ✅ USO también hecha (31 jul 2026): alta como cliente id 11 (`tipo = empresa`, mismo
   modelo), y el pedido 40 pasó de `Universidad de Sonsonate (USO) - Educación Continua`
   al nombre canónico para que el historial lo incluya (el cruce es por igualdad exacta).
   Enlaces `origen_ref` puestos: 40 → 53 (delantales repetidos de 2022/2023) y 56/57/58 →
   54 (el kit chef). Ojo: 55–58 están en la **papelera** desde el 22 jul — el kit se
   consolidó en las notas del 54 (gabacha y gorro van dentro del 54; el bolso #56 quedó
   cotizado pero borrado). El enlace queda listo por si se restauran.

## Secrets

- **Nunca** hardcodear API keys o tokens. La Claude API key se pide al usuario y vive en `localStorage`.
- La **publishable key de Supabase** (`sb_publishable_...`) está hardcodeada en `src/lib/db.js` y `src/supabaseStorage.js`. Es la key pública (RLS la protege). No es secreta.
- Si necesitás un PAT de GitHub para pushear: generálo con permisos mínimos (`Contents: Read and write`, y `Workflows: Read and write` solo si vas a modificar `.github/workflows/`).
