# Taller IMIS — Sistema de Pedidos

App de gestión de pedidos para un taller de bordados y confección en El Salvador.

Producción: https://njar97.github.io/taller-imis-pedidos/

## Arquitectura real

- **Frontend:** React 18 cargado por **CDN** (no por npm). El código de la app vive principalmente en módulos `.jsx` decompilados, con `src/main.js` como orquestador (App + helpers de impresión/export).
- **Build:** Vite 5 con `vite-plugin-pwa`. `index.html` es el shell; Vite empaqueta `src/main.js` y los módulos JSX, reescribe paths.
- **Hosting:** GitHub Pages. El workflow `.github/workflows/deploy.yml` corre `npm ci && npm run build` y publica `dist/`.
- **PWA:** instalable, con service worker (workbox), manifest, e iconos. `registerType: 'prompt'` — cuando hay nueva versión se avisa al usuario con un banner en vez de actualizar silenciosamente (ver `ConexionStatus.jsx`). CDN libs cacheadas (`CacheFirst`), `api.anthropic.com` marcado como `NetworkOnly`. Config en `vite.config.js`.
- **Resiliencia de red:** `src/lib/retry.js` envuelve fetches con backoff exponencial (300/800/2000ms) para errores transitorios (TypeError "Failed to fetch", 5xx, 408, 429). Usado en `lib/db.js` y `supabaseStorage.js`. Los 4xx no reintentan.

### Backend (datos)

- **Persistencia:** **Supabase Postgres**, via PostgREST. Cliente liviano sin SDK en `src/lib/db.js` (fetch directo, headers con `apikey` + `Authorization`). El módulo expone aliases `dbLeer / dbGuardar / dbBorrar` (pedidos), `dbBord*` (bordados), `dbCuel*` (cuellos), `dbClientes*` y `dbCatalogo*`.
- **Soft-delete:** los borrados se marcan con `deleted_at`, no se eliminan físicamente. La papelera (admin) los recupera. Ver `SeccionPapelera.jsx`.
- **Realtime:** suscripción WebSocket directa a Postgres para sincronizar cambios entre dispositivos. Sin SDK, ver `src/lib/realtime.js`.
- **Project ID:** `kszdievqesveluzcnzsh` (`taller-imis-produccion`). Tablas relevantes: `pedidos`, `bordados`, `cuellos`, `clientes`, `catalogo`.

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

Después de tres sesiones de decompile (mayo 2026), `main.js` bajó de **15 330 → ~2 570 líneas**. Lo que queda en `main.js`: imports, helpers de impresión/exportación (`imprimirPedido`, `exportarExcelMes`, `exportarPedidoPDF`), y el componente `App` raíz que orquesta state global, lazy loading y realtime — la mayor parte de su JSX ya está extraído, lo que queda es el cuerpo del return + handlers + la sección "pedidos" inline.

Módulos extraídos en `src/`:

- **Pantallas/secciones:** `PantallaLogin`, `SeccionEstadisticas`, `SeccionClientes`, `SeccionCatalogo`, `SeccionInventario`, `SeccionBordados` (+ `BordadoModal`), `SeccionCuellos` (+ `CuelloModal`), `SeccionPapelera` (lazy)
- **Formularios:** `FormPedido` (~700 líneas), `RegistroAbonos`, `ModalAsistenteIA`
- **Componentes reutilizables:** `CardPedido`, `ProximasEntregas`, `ListaPrendas` (+ `TablaPersonasInternas`), `SelectorTallas` (+ `TallasChips`), `BuscadorConfRef`
- **Shell / PWA / Nav:** `ErrorBoundary`, `ConexionStatus` (offline + new-version), `InstallPrompt`, `SidebarDesktop`, `TopbarMobile`, `BottomNav`, `MasOpenSheet` (+ `lib/navItems.js`)
- **Modales globales:** `VisorImagenes` (lightbox), `ModalArchivar` (pedido vencido), `ModalActMedidas`, `ModalErrorFotos`, `ModalConfirmarBorrar`
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
- `sw.js` — registro del service worker + bus de "nueva versión disponible"
- `navItems.js` — `getNavItems(rol, esAdmin)` + `NAV_IDS_VISIBLES`, compartido por Sidebar/BottomNav/MasOpenSheet

### Componente App (en main.js)

Sigue como `React.createElement(...)` compilado pero ya bastante adelgazado (~2 570 líneas, antes 3 521). Hace orquestación de:
- State global (pedidos, bordados, cuellos, clientes, catálogo, inventario)
- Auth/rol (PIN admin guardado en localStorage)
- Navegación entre secciones
- Suscripción realtime + reconexión
- Carga inicial + reintentos
- Renderizado de la shell (compone SidebarDesktop/TopbarMobile/BottomNav/MasOpenSheet)

Lo que queda compilado por decompilar: el return principal del cuerpo (que ya solo arma la composición) y todo el contenido inline de la sección "pedidos" (toolbar + cards + tabla). Detalle y formularios ya están extraídos.

## Comandos

```bash
npm install        # instalar deps (solo Vite + vite-plugin-pwa)
npm run dev        # dev server en http://localhost:5173/taller-imis-pedidos/
npm run build      # genera dist/ con PWA assets
npm run preview    # sirve dist/ como en prod
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

**17 may 2026 — Decompile de shell + modales del App (PRs #38-45)**
- #38: `BottomNav` + `lib/navItems.js` (NAV compartido entre sidebar / bottom / sheet).
- #39: `MasOpenSheet` (bottom-sheet "Más" con items que no caben en la barra).
- #40: `SidebarDesktop` (header + nav + métricas + cerrar sesión).
- #41: `TopbarMobile` (barra superior mobile).
- #42: `ModalArchivar` (pedido vencido — ¿fue entregado?).
- #43: `ModalActMedidas` (¿actualizar medidas del cliente?).
- #44: `VisorImagenes` (lightbox fullscreen con swipe + thumbnails).
- #45: `ModalErrorFotos` + `ModalConfirmarBorrar`.

main.js: 3 521 → ~2 570 líneas (-27%). Lo que queda compilado en App es el return principal (orquestación + sección "pedidos" inline).

**17 may 2026 — Cierre de mantenimiento + features (PRs #31-36)**
- #31: actualización completa de `CLAUDE.md` al estado real.
- #32: banner offline + prompt "nueva versión disponible" (`registerType: 'prompt'`).
- #33: banner "Instalar como app" (Android/Chrome + iOS Safari).
- #34: reintento automático con backoff (`lib/retry.js`) — `db.js` + `supabaseStorage.js`.
- #35: eliminación del módulo `lib/api.js` (Apps Script vestigial) + arreglo de enlace `SCRIPT_URL` que era ReferenceError latente.
- #36: extracción de `ErrorBoundary` a `src/ErrorBoundary.jsx`.

**16 may 2026 — Sesión masiva de decompile JSX (PRs #19-30)**
- 12 PRs en una sesión. `main.js`: 15 330 → ~3 600 líneas.
- 17 módulos JSX nuevos en `src/` y `src/lib/`.
- Bundle prácticamente igual (~317 KB raw / ~73 KB gzip).
- Lo único que queda compilado: el componente `App` (~2 700 líneas) y helpers de impresión/export.

**Mayo 2026 — Migración backend (PRs #11-14)**
- #11: flip backend de Apps Script → Postgres (PostgREST de Supabase).
- #12: cerrar dependencia del Apps Script (los CRUD reales pasan por Supabase).
- #13: soft-delete (deleted_at) en backend.
- #14: papelera UI + sync realtime entre dispositivos.

**13 may 2026 — Migración a Vite (PR #1, commit `50ccf74`)**
- Extraído el `<script>` inline de `index.html` (15 330 líneas) a `src/main.js`.
- Agregado `package.json`, `vite.config.js`, `.gitignore`.
- Workflow ahora corre `npm ci && npm run build` y publica `dist/`.

**13 may 2026 — Audit y lockdown de Supabase**
- `DROP FUNCTION public.exec_sql(text)` — era un RCE accesible por `anon` desde la anon key.
- `REVOKE EXECUTE ON public.handle_new_auth_user()` para `anon`/`authenticated`.
- `DROP POLICY acceso_publico_*` en las 5 tablas del taller (eran `USING(true) WITH CHECK(true)`).
- `REVOKE ALL` en esas tablas para `anon`/`authenticated`. (Nota: cuando se flipeó el backend a Supabase, hubo que crear políticas nuevas con grants adecuados — están en producción.)

## Pendientes ordenados por valor/riesgo

- [ ] **Terminar el decompile del cuerpo de `App`** — la shell (sidebar/topbar/bottom/sheet) y los modales globales ya están extraídos (PRs #38-45). Queda el return principal compilado y la sección "pedidos" inline (~700 líneas compiladas con toolbar/filtros/cards/tabla). Próximo paso natural: extraer `SeccionPedidos.jsx` y el `DetallePedidoModal`.
- [ ] **Eliminar dependencia de React por CDN** — instalarlo vía npm para tener tree-shaking real. Bundle actual ~317 KB raw, podría bajar bastante.
- [ ] **Tests** — el proyecto no tiene tests. Cualquier suite (vitest) sobre `lib/db.js`, `lib/retry.js`, `lib/dominio.js` ayudaría a moverse más rápido en futuros refactors.
- [ ] **Diagnóstico de errores** — hoy `ErrorBoundary` muestra el mensaje al usuario pero no lo reporta. Plug a Sentry o un endpoint propio sería barato.

## Secrets

- **Nunca** hardcodear API keys o tokens. La Claude API key se pide al usuario y vive en `localStorage`.
- La **publishable key de Supabase** (`sb_publishable_...`) está hardcodeada en `src/lib/db.js` y `src/supabaseStorage.js`. Es la key pública (RLS la protege). No es secreta.
- Si necesitás un PAT de GitHub para pushear: generálo con permisos mínimos (`Contents: Read and write`, y `Workflows: Read and write` solo si vas a modificar `.github/workflows/`).
