# Taller IMIS — Sistema de Pedidos

App de gestión de pedidos para un taller de bordados y confección en El Salvador.

Producción: https://njar97.github.io/taller-imis-pedidos/

## Arquitectura real

- **Frontend:** React 18 cargado por **CDN** (no por npm). El código de la app vive principalmente en módulos `.jsx` decompilados, con `src/main.js` como orquestador (App + helpers de impresión/export).
- **Build:** Vite 5 con `vite-plugin-pwa`. `index.html` es el shell; Vite empaqueta `src/main.js` y los módulos JSX, reescribe paths.
- **Hosting:** GitHub Pages. El workflow `.github/workflows/deploy.yml` corre `npm ci && npm run build` y publica `dist/`.
- **PWA:** instalable, con service worker (workbox), manifest, e iconos. `registerType: 'autoUpdate'`. CDN libs cacheadas (`CacheFirst`), `script.google.com` y `api.anthropic.com` marcadas como `NetworkOnly`. Config en `vite.config.js`.

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

- **Google Apps Script:** existía como backend previo. Sigue importado vacío en `src/lib/api.js` (`SCRIPT_URL`, `fetchConTimeout`) por si alguna vez hay que rescatar data legacy. El único uso vivo es un link de diagnóstico en main.js (estado de error UI), no código que se ejecute en flujos normales.
- **El proyecto Supabase está compartido con otra app** del mismo cliente (sistema de producción/escuelas con tablas `pedido` singular, `alumno`, `escuela`, `tendido*`, `trazo*`, `bodega_movimiento`, vistas `vw_*`, bucket Storage `trazo-fotos`).
  - **Esa otra app SÍ está en producción con datos reales.**
  - **Nunca toques esas tablas/políticas/funciones/vistas sin permiso explícito.**

## Estructura del código

### Módulos JSX extraídos

Después de una sesión masiva de decompile (mayo 2026), `main.js` bajó de **15 330 → ~3 600 líneas**. Lo que queda en `main.js`: imports, helpers de impresión/exportación (`imprimirPedido`, `exportarExcelMes`, `exportarPedidoPDF`), y el componente `App` raíz que orquesta state global, lazy loading y realtime.

Módulos extraídos en `src/`:

- **Pantallas/secciones:** `PantallaLogin`, `SeccionEstadisticas`, `SeccionClientes`, `SeccionCatalogo`, `SeccionInventario`, `SeccionBordados` (+ `BordadoModal`), `SeccionCuellos` (+ `CuelloModal`), `SeccionPapelera` (lazy)
- **Formularios:** `FormPedido` (~700 líneas), `RegistroAbonos`, `ModalAsistenteIA`
- **Componentes reutilizables:** `CardPedido`, `ProximasEntregas`, `ListaPrendas` (+ `TablaPersonasInternas`), `SelectorTallas` (+ `TallasChips`), `BuscadorConfRef`
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
- `api.js` — vestigial del Apps Script, sólo helpers

### Componente App (en main.js)

Es lo único que sigue como `React.createElement(...)` compilado. ~2 800 líneas. Hace orquestación de:
- State global (pedidos, bordados, cuellos, clientes, catálogo, inventario)
- Auth/rol (PIN admin guardado en localStorage)
- Navegación entre secciones
- Suscripción realtime + reconexión
- Carga inicial + reintentos
- Renderizado de la shell (sidebar/bottomnav)

Decompilarlo es viable pero riesgoso (toca todo). Pendiente para futuro.

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

**16 may 2026 — Sesión masiva de decompile JSX (PRs #19-30)**
- 12 PRs en una sesión. `main.js`: 15 330 → ~3 600 líneas.
- 17 módulos JSX nuevos en `src/` y `src/lib/`.
- Bundle prácticamente igual (~311 KB raw / ~71 KB gzip).
- Lo único que queda compilado: el componente `App` (~2 800 líneas) y helpers de impresión/export.

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

- [ ] **Banner de "Instalar app"** — detectar `beforeinstallprompt` para Android/Chrome; modal con instrucciones manuales para iOS Safari. Sube conversión a instalada.
- [ ] **Indicador de modo offline + aviso de nueva versión** — banner cuando se pierde conexión; toast "hay nueva versión" cuando el SW detecta update (en vez de actualizar silenciosamente).
- [ ] **Reintento automático en saves a Supabase** — wrapper de retry con backoff exponencial para `db.js` y `supabaseStorage.js`. El wifi del taller es inestable.
- [ ] **Decompilar `App` a JSX** — ~2 800 líneas compiladas. Alto valor en mantenibilidad pero alto riesgo (toca todo). Postergado.
- [ ] **Auditar las queries del Apps Script vestigial** — el `SCRIPT_URL` sigue en `api.js`. Si hace `SELECT *` sobre Sheets enteros y nadie lo usa, vale la pena dropearlo o limpiarlo.
- [ ] **Update comentario "ALPHA" en `src/lib/db.js`** — ya no es alpha, es producción. Trivial.

## Secrets

- **Nunca** hardcodear API keys o tokens. La Claude API key se pide al usuario y vive en `localStorage`.
- La **publishable key de Supabase** (`sb_publishable_...`) está hardcodeada en `src/lib/db.js` y `src/supabaseStorage.js`. Es la key pública (RLS la protege). No es secreta.
- El `SCRIPT_URL` del Apps Script en `src/lib/api.js` es necesariamente público (corre con permisos del dueño del Apps Script). No es un secreto.
- Si necesitás un PAT de GitHub para pushear: generálo con permisos mínimos (`Contents: Read and write`, y `Workflows: Read and write` solo si vas a modificar `.github/workflows/`).
