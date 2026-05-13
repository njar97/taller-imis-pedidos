# Taller IMIS — Sistema de Pedidos

App de gestión de pedidos para un taller de bordados y confección en El Salvador.

Producción: https://njar97.github.io/taller-imis-pedidos/

## Arquitectura real

> ⚠️ El `README.md` dice que la BD es Supabase. **Eso no es lo que está en producción hoy.** Lee esto antes de cualquier cambio relacionado con persistencia.

- **Frontend:** React 18 cargado por **CDN** (no por npm). El código de la app vive en `src/main.js`.
- **Build:** Vite 5. `index.html` es el shell; Vite empaqueta `src/main.js` y reescribe los paths.
- **Hosting:** GitHub Pages. El workflow `.github/workflows/deploy.yml` corre `npm ci && npm run build` y publica `dist/`.
- **Persistencia (real):** **Google Apps Script web app** que escribe a Google Sheets. Endpoint en `src/main.js`:
  ```
  const SCRIPT_URL = "https://script.google.com/macros/s/AKfycby.../exec";
  ```
  La app hace POST con `{action: "...", ...}` para todas las operaciones (pedidos, bordados, cuellos, clientes, catálogo).
- **Fotos:** Google Drive vía el mismo Apps Script (`action: "uploadImage"`). Se comprimen en el cliente antes de enviar (canvas → JPEG max 900px, calidad 0.82).
- **Supabase (vestigial):** Existe el proyecto `taller-imis-produccion` (`kszdievqesveluzcnzsh.supabase.co`) con tablas `pedidos`, `bordados`, `cuellos`, `clientes`, `catalogo`. Están **vacías y bloqueadas** (RLS deny-all, grants revocados a anon/authenticated). Quedaron de un diseño inicial nunca implementado. Si en el futuro se migra de Sheets → Supabase, hay que crear políticas RLS con auth real.
- **Asistente IA (Chat):** La app llama a la API de Claude desde el navegador. La key la pega el usuario y se guarda en `localStorage` (`taller_ia_key`). Usa header `anthropic-dangerous-direct-browser-access: true` y modelo `claude-haiku-4-5-20251001`.

## Cosas importantes a saber sobre el código

- **`src/main.js` (~15 330 líneas) es JSX ya compilado a `React.createElement(...)`.** No existe el JSX original. Editarlo es viable pero feo. Una decompilación manual a JSX es una tarea grande y pendiente.
- **React, ReactDOM y XLSX se cargan por CDN** en `<head>` de `index.html`. No están en `package.json`. Si los importas con `import` también funciona pero duplica el bundle.
- El proyecto Supabase está **compartido con otra app** del mismo cliente (sistema de producción/escuelas con tablas `pedido` singular, `alumno`, `escuela`, `tendido*`, `trazo*`, `bodega_movimiento`, vistas `vw_*`, bucket Storage `trazo-fotos`).
  - **Esa otra app SÍ está en producción con datos reales (1212 pedidos, etc.).**
  - **Nunca toques esas tablas/políticas/funciones/vistas sin permiso explícito.**

## Comandos

```bash
npm install        # instalar deps (solo Vite)
npm run dev        # dev server en http://localhost:5173/taller-imis-pedidos/
npm run build      # genera dist/
npm run preview    # sirve dist/ como en prod
```

## Slash commands (Claude Code)

- `/dev` — arranca el dev server en background y avisa cuando esté listo.
- `/build` — corre `npm run build`, reporta tamaños y errores.
- `/pwa` — inicia la conversión a PWA (instala `vite-plugin-pwa`, configura workbox, etc.).

Las definiciones están en `.claude/commands/`. Para agregar más, dropea un `.md` ahí con frontmatter `description: ...` y el cuerpo es el prompt que se ejecuta.

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

- Branches: `feature/<nombre>` o `fix/<nombre>`; mergear a `main` por PR.
- Commits: conventional (`feat:`, `fix:`, `refactor:`, `ci:`, `docs:`).
- Antes de pushear cambios en `src/`, correr `npm run build` localmente para detectar errores temprano.
- No commitear `node_modules/`, `dist/`, ni archivos con secretos.

## Historial reciente

**13 may 2026 — Migración a Vite (PR #1, commit `50ccf74`)**
- Extraído el `<script>` inline de `index.html` (15 330 líneas) a `src/main.js`.
- Agregado `package.json`, `vite.config.js`, `.gitignore`.
- Workflow ahora corre `npm ci && npm run build` y publica `dist/`.
- Bundle: 482 KB raw → 297 KB minificado (66 KB gzip).

**13 may 2026 — Audit y lockdown de Supabase**
- `DROP FUNCTION public.exec_sql(text)` — era un RCE accesible por `anon` desde la anon key.
- `REVOKE EXECUTE ON public.handle_new_auth_user()` para `anon`/`authenticated`.
- `DROP POLICY acceso_publico_*` en las 5 tablas del taller (eran `USING(true) WITH CHECK(true)`).
- `REVOKE ALL` en esas tablas para `anon`/`authenticated`.

## Pendientes ordenados por valor/riesgo

- [ ] **PWA / offline básico**: service worker + manifest. La app pasaría a ser instalable y resistente a la conexión inestable del taller.
- [ ] **Lazy-loading del lector de archivos de bordado** (`.dst` / `.pes`): ese código solo se usa en una pantalla, podría salir del bundle inicial.
- [ ] **Decompile JSX**: convertir `React.createElement(...)` a JSX en `src/main.js`. Mucho trabajo manual, alto beneficio en mantenibilidad.
- [ ] **Migrar fotos de Drive → Supabase Storage**: eliminaría la dependencia del Apps Script para fotos. Cuidado: el bucket actual `trazo-fotos` pertenece al otro sistema, hay que crear uno nuevo (ej. `taller-imis-fotos`).
- [ ] **Auditar las queries del Apps Script**: nunca lo hemos leído. Si hace `SELECT *` sobre Sheets enteros, hay margen de optimización.

## Secrets

- **Nunca** hardcodear API keys o tokens. La Claude API key se pide al usuario y vive en `localStorage`.
- El `SCRIPT_URL` del Apps Script está en `src/main.js` y es necesariamente público (corre con permisos del dueño del Apps Script). No es un secreto.
- Si necesitás un PAT de GitHub para pushear: generálo con permisos mínimos (`Contents: Read and write`, y `Workflows: Read and write` solo si vas a modificar `.github/workflows/`).
