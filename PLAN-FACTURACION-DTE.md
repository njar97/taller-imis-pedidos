# Plan: facturación DTE desde la app + ordenar los pedidos de la USO

Levantado el 11-ago-2026 leyendo el código y la base, con datos confirmados por
Javier. **Ejecutar en orden**: las fases 0 y 1 son bloqueantes, no se emite nada
real hasta terminarlas.

Resumen en una línea: el botón «Emitir DTE» existe y la cadena está completa,
pero **emite como la empresa equivocada, directo a producción fiscal, sin red de
seguridad**. Nunca se ha emitido una factura real (`taller_facturas` está vacía).

---

## 🔴 FASE 0 — Seguros antes de tocar nada (bloqueante)

### 0.1 Selector de ambiente visible

`src/lib/facturacion.js:22-23` — `ambienteDte()` devuelve `"01"` (PRODUCCIÓN) por
defecto y solo cambia si alguien escribe a mano en localStorage.

- Cambiar el **default a `"00"` (pruebas)**.
- Selector visible en el bloque de facturación de `src/DetallePedidoModal.jsx`
  (componente `FacturaElectronica`, líneas 344-466), con el ambiente **siempre a
  la vista**.
- En producción, botón rojo y texto «Emitir DTE REAL ante Hacienda».

### 0.2 Confirmación explícita en producción

`emitir` (`DetallePedidoModal.jsx:355-389`) usa `pushConfirm` pero no distingue
ambiente. En `01` debe exigir confirmación aparte mostrando **empresa emisora,
tipo de DTE y total**.

---

## 🔴 FASE 1 — El emisor correcto (bloqueante)

### 1.1 El bug

`src/lib/facturacion.js:27-47`: `NIT_EMISOR` y `EMISOR` están hardcodeados como
**Carymel Bazar y Confección / Nelson Javier Ramírez Mancía, NIT `03151202971040`
(=JAV)**, mientras `src/lib/empresa.js:14-27` presenta la app como
**UDP CONFECCIONES IMIS, NIT `0315-101011-101-2`**.

→ Los PDF dicen IMIS y el DTE saldría como JAV.

### 1.2 Decisión de Javier (11-ago-2026)

**Los pedidos del taller pueden facturarse por IMIS o por JAV (él), según el
pedido. Los de la USO van por IMIS.**

### 1.3 Qué hacer

- Mover el emisor a datos: leerlo de `taller_config` (mismo mecanismo que
  `empresa.js:32-53`), **no** dejarlo como constante.
- **Selector de empresa emisora al facturar** (IMIS / JAV), con IMIS por defecto.
- Guardar la empresa elegida en el pedido, para que la próxima factura del mismo
  cliente la sugiera.
- La infraestructura ya está lista: `taller_facturas` tiene `nit_emisor` en la
  clave única y `siguienteCorrelativo` (`facturacion.js:82-88`) ya filtra por él.
  Los certificados de ambas empresas ya están cargados en el puente (Tlacuilo).

---

## 🟠 FASE 2 — Ordenar los pedidos de la USO

### 2.1 🔴 Duplicación que puede cobrar doble

El kit **#54** lleva adentro los componentes `gabacha ×17`, `gorro ×17`,
`bolso grande ×11`, `bolso pequeño ×6` — y **los mismos existen como pedidos
aparte**: #57 (gabachas 17), #58 (gorros 17), #56 (bolsos 11+6).
Igual, **#55 duplica al #40** (delantales de Educación Continua).

**La USO pidió separar los delantales del resto**, así que la separación se queda
y hay que quitar la duplicación. Decidir con Javier cuál de las dos formas:

- **A (recomendada)**: #54 se queda **solo con las filipinas** (se le vacían los
  `componentes[]`) y gabachas/gorros/bolsos viven en #57/#58/#56. Cuatro pedidos,
  facturas separables.
- **B**: #54 conserva el kit completo y se borran #56/#57/#58 (a la papelera, con
  `deleted_at`, no DELETE).

En cualquier caso: **#55 se borra** (lo cubre el #40).

### 2.2 Precios confirmados por Javier (11-ago-2026)

- **Kit completo de filipina = $34** — incluye filipina + delantal(gabacha) + gorro.
- **Bolsos**: Javier recordaba ~$8 el pequeño y ~$9 el grande, **pero el histórico
  dice más**: el pedido **#48 (feb-2024)** registra *«15 bolsos pasteleros a $9.00»*
  y *«34 bolsos cocinero a $10.00»*. ⚠️ **Confirmar con Javier antes de cargar**:
  cobrar lo que recordaba sería **$1 menos por bolso** que en 2024.
- Histórico del **#42 (feb-2024)** para referencia: Kit $33 · Filipina sola $35 ·
  Gorro $8 · Delantal $5. El kit subió de $33 a $34 desde 2024.
- **Falta definir el precio de la filipina SOLA** (las 3 excepciones de abajo).
  En 2024 la filipina sola costaba $35, más que el kit.

### 2.3 Quién lleva kit completo y quién no

Cruzado por nombre entre #54 (filipinas) y #57 (gabachas): **17 de 20 llevan kit
completo**. Las **3 excepciones** —solo filipina, sin gabacha ni gorro— son, las
tres Pasteleras:

| Nombre | Talla |
|---|---|
| Ilsia Johana Arévalo Clemente | 17 |
| Josselyn Veralis Escalante Salazar | S |
| Lesly Michell Hernández Campos | 14 |

Cuadra con los cargos: #54 tiene 9 pasteleros y #57/#58 solo 6.
Los bolsos (#56) van 11 grandes (10 cocineros + 1 chef) y 6 pequeños (pasteleros).

### 2.4 Datos fiscales — bloqueante para facturar

**Los 12 pedidos de la USO tienen `nit`, `nrc`, `razon_social` y `tipo_documento`
en NULL** (verificado el 11-ago). Sin eso el código rechaza el CCF
(`facturacion.js:124-125`, correctamente).

- Conseguir NIT, NRC, razón social y dirección fiscal de la USO y cargarlos.
- Como se repiten por cliente, **guardarlos en `taller_clientes`** y que el pedido
  los herede, en vez de teclearlos pedido por pedido.

### 2.5 Sin registro de avance de producción

Las personas solo guardan `cargo, talla, nombre, medidas, prendas`. **No hay
ningún campo de avance**: nadie puede saber desde la app qué está cortado, cosido
o entregado. Además `prendas[]` viene **vacío** en el #54, y la hoja de producción
lee justamente `personas[].prendas[]` (ver memoria `taller_hojas_impresion`)
→ **verificar que las hojas del #54 no salgan en blanco**.

Las entregas de #40, #54, #56, #57 y #58 estaban fechadas para el **10-ago-2026**
(ya vencidas al 11-ago).

---

## 🟡 FASE 3 — Robustez (antes de usarlo a diario)

Por gravedad:

1. **Reconciliación de DTE huérfanos.** `facturacion.js:222-227`: si el INSERT en
   `taller_facturas` falla después de que el MH ya selló, solo hay un toast
   pidiendo anotar el sello a mano; el correlativo queda huérfano y **el siguiente
   intento lo reutilizaría** → rechazo por número de control repetido. Falta:
   guardar el intento ANTES de emitir (estado `enviando`) y completarlo después.
2. **Corte de red durante el POST**: no hay reintento (correcto, evita doble
   emisión) pero tampoco forma de saber si se selló. Con el punto 1 se puede
   verificar después en la consulta pública del MH
   (`admin.factura.gob.sv/consultaPublica`, ver memoria `jav_certificado_puente_vacio`).
3. **Sin anulación / nota de crédito** desde la app. Regla de la casa: invalidar el
   MISMO día es la ventana buena (ver `feedback_nota_credito_toca_al_cliente`).
4. **Falta la migración de `taller_facturas`**: la tabla se creó a mano en Supabase
   y `sql/` no la tiene. Agregar el DDL para que quede versionado.
5. **La talla no va en la descripción del ítem**: `dominio.js:361-404` agrupa por
   `tipo|precio` y `facturacion.js:168-172` manda solo `l.tipo`. Para uniformes
   conviene que la factura diga la talla.
6. **Sin tests**: no existe `facturacion.test.js` (hay 15 en `src/lib`, ninguno
   cubre facturación). Cubrir: agrupación de ítems, exclusión de `noFactura`,
   componentes con precio propio, elección de tipo DTE.
7. **Anon key y URL de Supabase hardcodeadas y duplicadas** en `facturacion.js:51-52`
   y `dtePendientes.js:9-10` → variables de entorno.

---

## ✅ FASE 4 — La primera emisión real (con Javier presente)

1. Emitir **en pruebas (`00`)** un pedido chico y verificar que vuelve sello.
2. Revisar el JSON contra lo que espera el MH.
3. Recién ahí, **una factura real** de un pedido pequeño, y verificarla en la
   consulta pública del MH.
4. Anotar en memoria el resultado y el correlativo con que arrancó.

---

## Notas para quien ejecute

- **No emitir NADA en ambiente `01` sin luz verde explícita de Javier.** Un DTE
  transmitido no se borra: se invalida, y la ventana buena es el mismo día.
- El puente es `https://emisor-imis.duckdns.org` y pide token
  (`POST /api/api-token`, se guarda en `localStorage["taller_puente_token"]`).
- El botón vive en un `<details>` gateado a admin (`DetallePedidoModal.jsx:1581`).
- Regla del repo: sesiones paralelas → mergear server-side con `gh pr merge`,
  nunca checkout local.
- Antes de tocar datos de pedidos, respaldo en `respaldos/` (gitignored).
