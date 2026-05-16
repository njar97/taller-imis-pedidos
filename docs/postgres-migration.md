# Migración Google Sheets → Postgres

## Estado

**No aplicado aún.** Este documento + `postgres-migration.sql` + `src/lib/db.js` son la preparación. El backend por defecto sigue siendo Apps Script + Sheets.

## Por qué

Sheets como BD ya está apretando:

1. **Sin concurrencia segura**: el Apps Script genera IDs con `findLastRow + 1`. Si dos teléfonos guardan al mismo tiempo, el segundo pisa al primero. La migración cierra esto con `LockService` (ya documentada en `apps-script-Code.gs`), pero Postgres lo da gratis con un PK + sequence.
2. **Sin queries reales**: filtrar/ordenar/contar pedidos es scan completo del Sheet desde el cliente. En Postgres son índices y `WHERE`.
3. **Timeout de 30 s**: cada `gsLeer` baja todo el Sheet. Con ~2000 pedidos ya empieza a notarse.
4. **Sin tipos**: todo es texto. `precio = "12.50"`, `tiene_bordado = "TRUE"`. La normalización vive en el cliente.
5. **Costo de Apps Script**: cuotas diarias (UrlFetch, ExecutionTime) — no son infinitas.

Postgres + PostgREST resuelve las 5. La fricción es:
- Requiere DDL en Supabase (este SQL).
- Requiere mover los datos existentes (export Sheets → import Postgres).
- Sin auth, las RLS son permisivas — cualquiera con la anon key tiene CRUD total (igual que hoy con el Apps Script público).

## Arquitectura objetivo

```
┌────────────┐      ┌─────────────────┐      ┌──────────────┐
│ React app  │ ──→  │ Supabase REST   │ ──→  │ Postgres     │
│ (db.js)    │      │ (PostgREST)     │      │ public.*     │
└────────────┘      └─────────────────┘      └──────────────┘
       │
       └─→ Supabase Storage (taller-imis-fotos) — ya migrado.
```

El Apps Script queda como **fallback** durante el periodo de transición.

## Esquema

Las 5 tablas vestigiales (`pedidos`, `bordados`, `cuellos`, `clientes`, `catalogo`) ya existen con casi toda la forma necesaria. Solo falta:

- `pedidos.modo_registro` (text) — está en `PEDIDO_BASE` pero no en la tabla.
- Permisos a `anon`/`authenticated` (hoy están con `REVOKE ALL` por seguridad).
- Policies RLS abiertas (hoy hay `acceso_publico_*` con `using(false)` o no existen).
- Triggers para `updated_at`.
- Índices para queries frecuentes (`estatus`, `fecha`, `cliente`).

Los campos jsonb (`tallas_qty`, `tallas_items`, `imagenes`, `abonos`, `medidas`, `personas`, `piezas`) se quedan como están — la app ya trabaja con ellos como objetos JS.

**IDs**: la app sigue generándolos client-side (`Math.max(...ids) + 1`). No hace falta `IDENTITY` ni cambiar el tipo. El INSERT trae el `id`.

## Pasos para activar

### 1. Aplicar el DDL

1. Abrí el SQL editor: <https://supabase.com/dashboard/project/kszdievqesveluzcnzsh/sql/new>
2. Pegá `docs/postgres-migration.sql`.
3. Run.
4. Verificá con la query del final del archivo (debería listar 20 policies — 4 por tabla).

### 2. Migrar la data desde Sheets

Opciones (de menos a más automatizado):

**(a) Manual por tabla**

En el Apps Script, abrí cada Sheet, "Archivo → Descargar → CSV". Luego en Supabase:
- Table editor → Pedidos → Import data from CSV → mapear columnas.

Trabajoso pero seguro. Recomendado para la primera vez.

**(b) Endpoint `dumpAll` en el Apps Script**

Agregá esto al `Code.gs` (corre 1 vez, devuelve JSON con todo):

```javascript
function doGet(e) {
  if (e.parameter.action === "dumpAll") {
    const ss = SpreadsheetApp.getActive();
    const dump = {};
    ["Pedidos","Bordados","Cuellos","Clientes","Catalogo"].forEach(n => {
      const sh = ss.getSheetByName(n);
      if (sh) dump[n] = sheetToObjects(sh);
    });
    return ContentService.createTextOutput(JSON.stringify(dump))
      .setMimeType(ContentService.MimeType.JSON);
  }
  // ... resto del dispatcher
}
```

Llamalo desde el navegador, guardá el JSON, y desde la consola del navegador (con la app abierta):

```javascript
const dump = JSON.parse(/* pega aquí el JSON */);
const { dbGuardar, dbBordGuardar, dbCuelGuardar, dbClientesGuardar, dbCatalogoGuardar } =
  await import("./lib/db.js");
for (const p of dump.Pedidos)   await dbGuardar(p);
for (const b of dump.Bordados)  await dbBordGuardar(b);
for (const c of dump.Cuellos)   await dbCuelGuardar(c);
for (const cl of dump.Clientes) await dbClientesGuardar(cl);
await dbCatalogoGuardar(dump.Catalogo || []);
```

### 3. Flip del backend en la app

En `src/main.js` (o vía un toggle visible — ver "Pendiente" más abajo), cambiá los imports:

```javascript
// Antes:
import { gsLeer, gsGuardar, gsBorrar, /* ... */ } from "./lib/api.js";

// Después:
import {
  dbLeer    as gsLeer,
  dbGuardar as gsGuardar,
  dbBorrar  as gsBorrar,
  dbBordLeer    as gsBordLeer,
  dbBordGuardar as gsBordGuardar,
  dbBordBorrar  as gsBordBorrar,
  dbCuelLeer    as gsCuelLeer,
  dbCuelGuardar as gsCuelGuardar,
  dbCuelBorrar  as gsCuelBorrar,
  dbClientesLeer    as gsClientesLeer,
  dbClientesGuardar as gsClientesGuardar,
  dbClientesBorrar  as gsClientesBorrar,
} from "./lib/db.js";
// ... y dbCatalogoLeer / dbCatalogoGuardar reemplazan las inline en main.js.
```

`subirImagenADrive` y `subirEmbADrive` se quedan con Apps Script (todavía hay fotos viejas en Drive y archivos `.emb` viven ahí).

### 4. Validación

Con la app abierta en producción:

1. Crear un pedido nuevo → confirmar que aparece en `select * from public.pedidos order by id desc limit 1` en Supabase.
2. Editar el pedido → confirmar `updated_at` cambia.
3. Borrar → confirmar que desaparece.
4. Repetir para bordados, cuellos, clientes.
5. Recargar la app → confirmar que todos los datos están.

### 5. Rollback

Si algo sale mal, revertí el cambio de imports en `src/main.js` y volvés a Apps Script. Los datos en Sheets siguen ahí intactos.

## Pendientes después de la migración

- [ ] **Auth real (Supabase Auth)**. Hoy las policies son `using(true)` — cualquiera con la anon key tiene CRUD total. Hay que agregar magic link / email-password, una tabla `app_user_role`, y reescribir las policies con `auth.uid()`.
- [ ] **Eliminar dependencia del Apps Script para fotos viejas**: migrar las URLs de Drive en `imagenes[].driveUrl` a Supabase Storage (o, más simple, declarar Drive como solo-lectura y dejar las viejas ahí).
- [ ] **Backup automático**: `pg_dump` semanal vía cron a Storage. Hoy el backup es "los Sheets aún existen".
- [ ] **Toggle de backend en runtime**: leer `localStorage.taller_backend === "postgres"` para elegir entre db.js y api.js, en vez de cambiar imports. Útil para A/B en dispositivos específicos durante la transición.
- [ ] **Borrar el Apps Script** cuando se confirme que Postgres es estable (1-2 semanas después del flip).

## Por qué no usé `supabase-js`

El SDK oficial pesa ~40 KB gzip y trae auth/realtime/storage que no necesitamos todavía. Para CRUD simple sobre PostgREST, `fetch` directo en `db.js` (~150 líneas) hace lo mismo con cero deps — mismo enfoque que `supabaseStorage.js`.

Cuando se agregue Supabase Auth, ahí sí conviene importar `@supabase/supabase-js` por la gestión de tokens y refresh.
