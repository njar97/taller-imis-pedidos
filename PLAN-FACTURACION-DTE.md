# Plan: dejar lista la facturación DTE desde la app de pedidos

Levantado el 11-ago-2026 leyendo el código y la base. **Ejecutar en orden**: las
fases 0 y 1 son bloqueantes, no se emite nada real hasta terminarlas.

Contexto en una línea: el botón «Emitir DTE» existe y la cadena está completa,
pero **emite como la empresa equivocada, directo a producción fiscal, sin red de
seguridad**. Nunca se ha emitido una factura real (`taller_facturas` está vacía).

---

## 🔴 FASE 0 — Seguros antes de tocar nada (bloqueante)

### 0.1 Selector de ambiente visible

`src/lib/facturacion.js:22-23` — `ambienteDte()` devuelve `"01"` (PRODUCCIÓN) por
defecto y solo cambia si alguien escribe a mano en localStorage.

- Cambiar el **default a `"00"` (pruebas)**.
- Poner un selector visible en el bloque de facturación de
  `src/DetallePedidoModal.jsx` (componente `FacturaElectronica`, líneas 344-466),
  con el ambiente actual **siempre a la vista**.
- En producción, que el botón se vea distinto (rojo) y el texto diga
  «Emitir DTE REAL ante Hacienda».

### 0.2 Confirmación explícita en producción

Hoy `emitir` (`DetallePedidoModal.jsx:355-389`) usa `pushConfirm` con el resumen,
pero no distingue ambiente. En `01` debe exigir una confirmación aparte que diga
qué **empresa emisora**, qué **tipo de DTE** y qué **total** se va a transmitir.

---

## 🔴 FASE 1 — El emisor correcto (bloqueante)

### 1.1 El bug de fondo

`src/lib/facturacion.js:27-47`: `NIT_EMISOR` y `EMISOR` están **hardcodeados como
Carymel Bazar y Confección / Nelson Javier Ramírez Mancía, NIT `03151202971040`
(=JAV)**, mientras que `src/lib/empresa.js:14-27` presenta la app como
**UDP CONFECCIONES IMIS, NIT `0315-101011-101-2`**.

→ Hoy los PDF dicen IMIS y el DTE saldría a nombre de JAV. **Hay que preguntarle
a Javier qué empresa factura cada pedido antes de decidir el default.**

### 1.2 Qué hacer

- Mover el emisor a datos, no a constante: leerlo de `taller_config` (mismo
  mecanismo que usa `empresa.js:32-53`).
- Permitir **elegir la empresa emisora al facturar** (IMIS / JAV / AME). El diseño
  ya lo prevé: `taller_facturas` tiene `nit_emisor` en la clave única y
  `siguienteCorrelativo` (`facturacion.js:82-88`) ya filtra por `nit_emisor`.
- Los certificados y claves de cada empresa **ya están en el puente** (Tlacuilo),
  así que del lado del bridge no hay nada que hacer.

---

## 🟠 FASE 2 — Datos que faltan en los pedidos

Verificado el 11-ago contra Supabase: **los 12 pedidos de USO tienen `nit`, `nrc`,
`razon_social` y `tipo_documento` en NULL**. Sin eso no se puede emitir CCF
(`facturacion.js:124-125` lo rechaza, correctamente).

- Conseguir los datos fiscales de la USO (NIT, NRC, razón social, dirección) y
  cargarlos. Como se repiten por cliente, evaluar guardarlos en `taller_clientes`
  y que el pedido los herede, en vez de teclearlos pedido por pedido.
- **Decidir qué pasa con los pedidos #55, #56, #57 y #58** (Cotización, 17 personas
  cada uno). La memoria decía que nunca se crearon porque se consolidaron en el
  #54, pero existen. Si son basura, a la papelera; si no, hay que distinguirlos.

---

## 🟡 FASE 3 — Robustez (antes de usarlo a diario)

Ordenadas por gravedad:

1. **Reconciliación de DTE huérfanos.** `facturacion.js:222-227`: si el INSERT en
   `taller_facturas` falla después de que el MH ya selló, se devuelve
   `_sinRegistro` y solo hay un toast pidiendo anotar el sello a mano. El
   correlativo queda huérfano y **el siguiente intento lo reutilizaría** → rechazo
   por número de control repetido. Falta: guardar el intento ANTES de emitir
   (estado `enviando`) y completarlo después, para que ningún correlativo se pierda.
2. **Corte de red durante el POST**: no hay reintento (correcto, evita doble
   emisión) pero tampoco forma de saber si se selló. Con lo del punto 1 se puede
   consultar después contra la consulta pública del MH
   (`admin.factura.gob.sv/consultaPublica`, ver memoria `jav_certificado_puente_vacio`).
3. **Sin anulación / nota de crédito** desde la app. Recordar la regla de la casa:
   invalidar el MISMO día es la ventana buena.
4. **Falta la migración de `taller_facturas` en el repo.** La tabla se creó a mano
   en Supabase; `sql/` no la tiene. Agregar el DDL para que quede versionado.
5. **La talla no va en la descripción del ítem**: `dominio.js:361-404` agrupa por
   `tipo|precio` y `facturacion.js:168-172` manda solo `l.tipo`. Para uniformes
   conviene que la factura diga la talla.
6. **Sin tests**: no existe `facturacion.test.js`. Hay 15 tests en `src/lib` y
   ninguno cubre `detalleFactura` ni el armado del payload. Cubrir al menos:
   agrupación de ítems, exclusión de `noFactura`, componentes con precio propio,
   y elección de tipo DTE.
7. **Anon key y URL de Supabase hardcodeadas y duplicadas** en `facturacion.js:51-52`
   y `dtePendientes.js:9-10` → mover a variables de entorno.

---

## ✅ FASE 4 — La primera emisión real (con Javier presente)

1. Emitir **en pruebas (`00`)** un pedido chico y verificar que vuelve sello.
2. Revisar el JSON contra lo que espera el MH.
3. Recién ahí, **una factura real** de un pedido pequeño y verificarla en la
   consulta pública del MH.
4. Anotar en memoria el resultado y el correlativo con que arrancó.

---

## Notas para quien ejecute

- **No emitir NADA en ambiente `01` sin luz verde explícita de Javier.** Un DTE
  transmitido no se borra: se invalida, y la ventana buena es el mismo día.
- El puente es `https://emisor-imis.duckdns.org` y pide token
  (`POST /api/api-token`, se guarda en `localStorage["taller_puente_token"]`).
- El botón vive enterrado en un `<details>` gateado a admin
  (`DetallePedidoModal.jsx:1581`); para probar hay que entrar como admin.
- Regla del repo: sesiones paralelas → mergear server-side con `gh pr merge`,
  nunca checkout local.
