# Apps Script — Code.gs · cambios aplicados

Pega `docs/apps-script-Code.gs` completo en el editor:
👉 https://script.google.com/d/12ad3-u2aeDnxv6CzuoZmdk7zmkBTdGYRIaFeYNbYDhmY9MJsV6_aL3Ut/edit

Después de pegar, hacé **Deploy → Manage deployments → Edit (lápiz) → New version → Deploy**. No cambies la URL del deployment para que el frontend siga apuntando al mismo endpoint.

## Cambios (P0 → P2)

### 🔴 P0 — Críticos

**1. Eliminada la `y` huérfana del inicio del archivo.**
La línea 1 antes era `y// TALLER IMIS — Code.gs`. La `y` no hacía nada — pero en runtime estricto V8 sería un `ReferenceError`. Mejor sacarla.

**2. `LockService` en `upsertRegistro`, `borrarRegistro` y `saveCatalogo`.**
Si dos usuarios guardan al mismo tiempo, antes uno sobrescribía al otro y se perdía un cambio. Ahora se serializa con `tryLock(10000)`. Si el lock falla después de 10s, devuelve `{error: "Servidor ocupado"}` al frontend.

**3. Validación en `subirImagen`:**
- MIME: sólo `image/jpeg`, `image/png`, `image/webp`, `application/octet-stream` (este último para `.emb/.dst/.pes` de bordado).
- Tamaño: máximo 5 MB después del decode base64. Si excede, devuelve error.

**4. `setSharing` por carpeta raíz, no por archivo.**
Antes cada upload hacía una llamada API extra para cambiar el sharing del archivo. Ahora la raíz `Taller IMIS — Imágenes` se crea con sharing público y los archivos heredan. Menos llamadas a Drive API.

### 🟠 P1 — Importantes

**5. Función `respError` con stack trace en logs.**
Antes `catch(err){ return jsonResp({error:err.message}); }` perdía el stack. Ahora se loggea con `Logger.log` y se devuelve también la `action` que falló para que el frontend sepa.

**6. Aviso de límite de celda.**
`escribirHoja` loggea un warning si el JSON pasa de 45 000 chars (cerca del límite de 50 000). Te avisa cuándo migrar a Postgres.

**7. `migrarArchivosExistentes` cachea pedidos.**
Antes `buscarClienteConf` releía toda la BD por cada bordado con `confRef`. Ahora se cachea una vez al inicio de la migración. Para 100 bordados pasa de 100 lecturas a 1.

### 🟢 P2 — Cosmético

**8. Eliminada `testLeerDatos`.**
Referenciaba la hoja `"Datos"` que no existe (la real es `pedidos`). Era código muerto.

**9. `testLeer` ahora también muestra Clientes y Catálogo.**
Más completo para debug.

**10. `leerHoja` loggea JSON inválido en vez de tragar silenciosamente.**
Si una hoja se corrompió, antes devolvía `[]` sin avisar. Ahora deja rastro en Logger.

## Lo que NO cambió

- La URL del deployment (sigue siendo `AKfycby...`).
- El esquema de datos (sigue siendo JSON en celda A1).
- El sharing público de las fotos (sigue ANYONE_WITH_LINK porque las URLs públicas ya están en Sheets — cambiar rompería las fotos viejas).
- `webapp.access: ANYONE_ANONYMOUS` — sigue público. Esto es parte del rediseño grande (migración a Postgres con anon key + RLS).

## Roadmap pendiente (próximas iteraciones)

- **Migración Sheets → Postgres.** Las tablas vacías ya existen en Supabase. Cuando se migre, este Apps Script queda sólo para subir fotos viejas — y eso también se va a Supabase Storage (PR #7 ya empezó).
- **Token compartido en lugar de `ANYONE_ANONYMOUS`.** El frontend manda un header `X-Token: ...` que el script valida. Filtra crawlers casuales.
