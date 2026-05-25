# Integración dte_web → Taller IMIS (bandeja de inventario)

**Para el otro Claude Code de `dte_web`.** Este documento describe qué necesita agregar `dte_web` (Flask en PythonAnywhere) para que las facturas registradas aparezcan automáticamente en el inventario de Taller IMIS.

---

## Contexto

- **Taller IMIS** (este repo, React + Supabase) tiene una sección de Inventario.
- Hasta ahora el usuario importaba manualmente el archivo `.db` con SQL.js. Frágil y manual.
- Lo cambiamos a un flujo push: cada vez que `dte_web` registre un DTE recibido de la empresa IMIS (id=3), va a hacer un POST a Supabase con los ítems de la factura. Aparecen como banner naranja en Inventario y el usuario los clasifica e importa.

---

## Tabla destino en Supabase

Ya está creada. Schema:

```sql
CREATE TABLE public.taller_dte_pendientes (
  id BIGSERIAL PRIMARY KEY,
  doc_id INTEGER NOT NULL,           -- documentos.id de dte_web
  numero_item INTEGER NOT NULL,      -- items_documento.numero_item
  codigo_generacion TEXT,
  fecha_emision TEXT,
  proveedor TEXT,                    -- emisor_nombre
  proveedor_nit TEXT,                -- emisor_nit
  descripcion TEXT NOT NULL,
  cantidad NUMERIC,
  unidad TEXT,                       -- unidad_medida
  precio_unitario NUMERIC,
  total NUMERIC,                     -- venta_gravada + venta_exenta + venta_no_sujeta
  procesado BOOLEAN NOT NULL DEFAULT false,
  procesado_en TIMESTAMPTZ,
  inventario_id BIGINT,              -- enlace al item de inventario creado
  ignorado BOOLEAN NOT NULL DEFAULT false,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(doc_id, numero_item)
);
```

`UNIQUE(doc_id, numero_item)` garantiza idempotencia: si llamás el push dos veces para el mismo doc, no duplica.

---

## Endpoint

```
POST https://kszdievqesveluzcnzsh.supabase.co/rest/v1/taller_dte_pendientes
Headers:
  apikey: sb_publishable_XCwHC4aEI6g4_AFXLXbzIg_QpUL_FpX
  Authorization: Bearer sb_publishable_XCwHC4aEI6g4_AFXLXbzIg_QpUL_FpX
  Content-Type: application/json
  Prefer: resolution=ignore-duplicates,return=minimal

Body: lista de items (un row por ítem de la factura)
```

`Prefer: resolution=ignore-duplicates` hace que si el item ya existe (por el UNIQUE), no falle — simplemente lo ignora.

---

## Snippet Python para `dte_web/app.py`

Agregar este helper cerca de los otros helpers globales (después de `_log_event`):

```python
import requests

# Push de items de DTE a Taller IMIS (solo empresa IMIS, rol RECIBIDA)
SUPA_URL_TALLER = "https://kszdievqesveluzcnzsh.supabase.co"
SUPA_KEY_TALLER = "sb_publishable_XCwHC4aEI6g4_AFXLXbzIg_QpUL_FpX"
EMPRESA_ID_IMIS = 3  # IMIS — UDP Confecciones (la única empresa que usa Taller IMIS)

def _push_a_taller_imis(documento_id, db):
    """
    Empuja todos los items de un documento RECIBIDA de IMIS al inventario
    pendiente de Taller IMIS. Idempotente (UNIQUE doc_id+numero_item).
    Fire-and-forget: si falla, log pero no rompe el flujo de dte_web.
    """
    try:
        # Solo procesar docs RECIBIDA de IMIS
        doc = db.execute(
            "SELECT empresa_id, rol, codigo_generacion, fecha_emision, "
            "emisor_nombre, emisor_nit FROM documentos WHERE id=? AND estado='ACTIVO'",
            (documento_id,)
        ).fetchone()
        if not doc:
            return
        if doc["empresa_id"] != EMPRESA_ID_IMIS:
            return  # No es de IMIS, ignorar
        if doc["rol"] != "RECIBIDA":
            return  # Solo compras (no facturas que IMIS emitió)

        items = db.execute(
            "SELECT numero_item, descripcion, cantidad, unidad_medida, "
            "precio_unitario, venta_gravada, venta_exenta "
            "FROM items_documento WHERE documento_id=? ORDER BY numero_item",
            (documento_id,)
        ).fetchall()
        if not items:
            return

        payload = []
        for it in items:
            total = (it["venta_gravada"] or 0) + (it["venta_exenta"] or 0)
            payload.append({
                "doc_id": documento_id,
                "numero_item": it["numero_item"],
                "codigo_generacion": doc["codigo_generacion"],
                "fecha_emision": doc["fecha_emision"],
                "proveedor": doc["emisor_nombre"],
                "proveedor_nit": doc["emisor_nit"],
                "descripcion": it["descripcion"] or "(sin descripción)",
                "cantidad": float(it["cantidad"] or 0),
                "unidad": it["unidad_medida"] or "",
                "precio_unitario": float(it["precio_unitario"] or 0),
                "total": float(total),
            })

        r = requests.post(
            f"{SUPA_URL_TALLER}/rest/v1/taller_dte_pendientes",
            headers={
                "apikey": SUPA_KEY_TALLER,
                "Authorization": f"Bearer {SUPA_KEY_TALLER}",
                "Content-Type": "application/json",
                "Prefer": "resolution=ignore-duplicates,return=minimal",
            },
            json=payload,
            timeout=10,
        )
        if not r.ok:
            _log_silent("push_taller_imis", Exception(f"HTTP {r.status_code}: {r.text[:200]}"))
    except Exception as exc:
        _log_silent("push_taller_imis", exc)
```

---

## Dónde llamar al helper

Hay 2 lugares en `app.py` que crean docs RECIBIDA con items:

1. **Línea ~3865** (procesamiento de XML adjunto en correos): después del bloque que termina con el último `INSERT INTO items_documento (...)`, agregar:
   ```python
   _push_a_taller_imis(doc_id_recien_creado, dbc)
   ```

2. **Línea ~6771** y **línea ~7535** (otros flujos de creación de documentos): mismo patrón al final del bloque que inserta los items.

**Pista:** buscá los lugares donde se hace `dbc.commit()` después de insertar items_documento de un documento RECIBIDA. Justo ahí, antes (o después) del commit:

```python
dbc.commit()
_push_a_taller_imis(doc_id, dbc)  # ← agregar esta línea
```

---

## Test manual

1. Después de aplicar los cambios, registrar un DTE de compra para IMIS en dte_web.
2. Verificar en Supabase Studio:
   ```sql
   SELECT * FROM taller_dte_pendientes ORDER BY creado_en DESC LIMIT 5;
   ```
   Deben aparecer las filas con `procesado=false`.
3. Abrir Taller IMIS → Inventario → debe aparecer el banner naranja "📥 N ítems nuevos".
4. Importar desde ahí → los items quedan en `taller_inventario` y los pendientes se marcan `procesado=true`.

---

## Backfill opcional (una sola vez)

Si querés empujar todas las facturas RECIBIDA de IMIS que ya existen en dte_web a la bandeja:

```python
# Correr una sola vez, en una ruta debug o en consola:
docs = db.execute(
    "SELECT id FROM documentos WHERE empresa_id=3 AND rol='RECIBIDA' "
    "AND estado='ACTIVO' ORDER BY fecha_emision DESC"
).fetchall()
for d in docs:
    _push_a_taller_imis(d["id"], db)
```

Idempotente (UNIQUE), así que es seguro correrlo más de una vez.

---

## Notas de seguridad

- La key `sb_publishable_...` es pública (RLS la protege). No hace falta secretearla en el repo, pero **idealmente** ponela en una env var de PythonAnywhere por higiene.
- La tabla `taller_dte_pendientes` tiene RLS con policy `FOR ALL TO anon USING (true)` — cualquiera con la key puede INSERT/SELECT. Cuando Taller IMIS pase a Fase 2 (cerrar RLS), habrá que crear un usuario de servicio dedicado para este flujo y darle solo INSERT a esta tabla.

---

## Resumen del contrato

| Quién | Qué hace | Cuándo |
|---|---|---|
| `dte_web` (Python) | POST con items de un DTE RECIBIDA de IMIS | Al registrar un DTE nuevo (o reprocesar uno viejo) |
| Supabase | Guarda en `taller_dte_pendientes` (rechaza duplicados) | Atómico, sin acoplamiento |
| Taller IMIS (React) | Lee pendientes, muestra banner, abre modal de clasificación | Al cargar Inventario |
| Taller IMIS | Importa elegidos a `taller_inventario`, marca `procesado=true` | Cuando el usuario hace click "Importar" |
