# Plan: emitir la primera factura DTE desde la app

Actualizado 11-ago-2026. Objetivo concreto: **emitir las dos facturas de la USO
desde la app**, sin romper nada de lo que ya funciona.

> ⚠️ **Antecedente**: una edición anterior en el editor de Pluma Libre rompió cosas
> que hubo que corregir después. Este plan está escrito para que eso no se repita:
> leé la sección «Reglas para no romper nada» ANTES de tocar el primer archivo.

---

## Estado de partida (verificado, no asumido)

- El botón «Emitir DTE» **existe y la cadena está completa**: `DetallePedidoModal.jsx:452`
  → `emitir` (`:355`) → `prepararFacturaPedido` (`facturacion.js:114`) →
  `emitirFacturaPedido` (`:160`) → `POST https://emisor-imis.duckdns.org/emitir-pedido`.
- **Nunca se ha emitido una factura real**: `taller_facturas` está vacía.
- **Los datos de la USO ya están cargados** (11-ago): razón social, NIT
  `0315-040382-002-5`, NRC `43359-4`, dirección y tipo `Crédito Fiscal`, tanto en los
  6 pedidos como en la ficha del cliente #11.
- **Los montos ya están cuadrados** contra los listados oficiales de Edgar:
  - **#40 Educación Continua — $800.00** (⚠️ precio a revisar, ver abajo)
  - **#54 Gastronomía — $742.00**: 11 kits cocinero ($374) + 6 kits pastelero ($204)
    + 11 bolsos grandes ($110) + 6 bolsos pequeños ($54)
  - **Aparte, NO facturable a la USO: $148** que pagan las personas
    (4 filipinas solas a $30 + Chef Kenia $28).

---

## 🔴 FASE 1 — Emisor correcto (bloqueante)

**El bug**: `src/lib/facturacion.js:27-47` tiene `NIT_EMISOR` y `EMISOR` hardcodeados
como **Carymel / Nelson Javier Ramírez Mancía, NIT `03151202971040` (=JAV)**, mientras
`src/lib/empresa.js:14-27` presenta la app como **UDP CONFECCIONES IMIS**.
Hoy los PDF dicen IMIS y el DTE saldría como JAV.

**Decisión de Javier**: los pedidos del taller facturan por **IMIS o por JAV** según
el caso. **Los de la USO van por IMIS.**

**Qué hacer**:
1. Mover el emisor a datos, leyéndolo de `taller_config` (mismo mecanismo que
   `empresa.js:32-53`). Dejar IMIS como default.
2. Selector de empresa emisora en el bloque de facturación, visible antes de emitir.
3. NO hace falta tocar el puente: los certificados de ambas empresas ya están
   cargados en Tlacuilo.
4. La infraestructura ya lo soporta: `taller_facturas.nit_emisor` está en la clave
   única y `siguienteCorrelativo` (`facturacion.js:82-88`) ya filtra por emisor.

---

## 🔴 FASE 2 — Que no se pueda emitir por accidente (bloqueante)

`ambienteDte()` (`facturacion.js:22-23`) devuelve **`"01"` = PRODUCCIÓN** por defecto
y solo cambia escribiendo a mano en localStorage. Un clic hoy transmite de verdad.

1. Cambiar el default a **`"00"` (pruebas)**.
2. Selector de ambiente **visible** en el bloque de facturación, con el ambiente
   actual siempre a la vista.
3. En producción: botón en rojo, texto «Emitir DTE REAL ante Hacienda», y una
   confirmación aparte que muestre **empresa emisora + tipo de DTE + total**.

---

## 🟠 FASE 3 — Emitir de verdad (con Javier presente)

1. **Prueba en `00`** con el pedido #40 (una sola línea, es el más simple).
   Verificar que vuelve sello y que se guarda la fila en `taller_facturas`.
2. Revisar el JSON generado contra lo que espera el MH.
3. **Recién ahí**, con luz verde explícita de Javier, emitir en `01`.
4. Verificar la factura en la consulta pública del MH:
   `https://admin.factura.gob.sv/consultaPublica?ambiente=01&codGen=<COD>&fechaEmi=<YYYY-MM-DD>`
5. Anotar en memoria el correlativo con que arrancó cada empresa.

### Antes de emitir el #40, resolver

⚠️ **El precio de los delantales no tiene respaldo histórico.** Los $8.00 salieron de
la descripción escrita al crear el pedido. Lo único documentado es **$7.50** (pedido
#53, 2023, solo 24 unidades). Del pedido de 100 de may-2023 quedó anotado el bordado
($1.25 c/u), no la prenda. **Confirmar con la Lic. Evelin antes de facturar.**

---

## 🟠 FASE 3.5 — Vista previa antes de emitir + PDF con envío por WhatsApp

Pedido de Javier (11-ago): **ver los datos antes de transmitir**, y después de emitir
**ver el PDF con opción de mandarlo por WhatsApp**. La vista previa además sirve para
cachar un error ANTES de que el DTE sea irreversible.

### 3.5.1 Vista previa (antes de emitir)

Mostrar, con el mismo aspecto que tendrá la factura, lo que se va a transmitir:
emisor elegido, receptor (razón social, NIT, NRC, dirección), tipo de DTE, el detalle
de líneas con cantidad / precio unitario / subtotal, y los totales con IVA desglosado.
Recién debajo, el botón de emitir.

- El armado del payload ya existe: **`prepararFacturaPedido` (`facturacion.js:114`)**
  devuelve receptor, ítems y totales sin transmitir nada. **Reusar eso** — no duplicar
  la lógica de cálculo, o la vista previa y lo emitido se van a desincronizar.
- En la vista previa dejar claro el **ambiente** (pruebas / producción).

### 3.5.2 El PDF

⚠️ **El puente NO devuelve PDF.** De `/emitir-pedido` vuelven solo `numeroControl`,
`codigoGeneracion` y `selloRecibido` (`facturacion.js:208-210`). El PDF lo genera el
emisor, no Hacienda: **hay que armarlo en la app**.

- **Mecanismo que ya usa el repo**: `src/lib/documentosProducto.js` monta un iframe a
  pantalla completa y dispara `print()` (el usuario elige «Guardar como PDF»). Mismo
  patrón que `imprimirHojaTaller` y `imprimirPedido` (`src/lib/imprimir.js:91`).
  **Seguir ese patrón**, no meter una librería de PDF nueva.
- El documento debe llevar lo que exige el MH: datos del emisor y del receptor,
  detalle, totales, **número de control, código de generación, sello de recepción**
  y **QR** hacia la consulta pública
  (`https://admin.factura.gob.sv/consultaPublica?ambiente=<amb>&codGen=<cod>&fechaEmi=<fecha>`).
- Para el QR: generarlo sin dependencias externas si se puede (canvas), o confirmar
  con Javier antes de agregar una librería.

### 3.5.3 Mandar por WhatsApp

**Cómo se manda de verdad** (confirmado por Javier, que ya lo hace a diario):

- **`navigator.share()` con `files`** SÍ manda el PDF a WhatsApp en Android. Esa es
  la vía. Pero ⚠️ **WhatsApp adjunta el archivo y DESCARTA el texto** del share —
  el campo `text` no llega.
- **Consecuencia de diseño, no detalle menor**: todo lo que el cliente necesita leer
  tiene que estar **dentro del PDF**. Nada de información importante en el mensaje,
  porque no va a llegar. El PDF ya lleva número de control, código de generación,
  sello y QR — con eso basta y se verifica solo.
- **Además**, al tocar «Mandar por WhatsApp», copiar el texto de respaldo al
  portapapeles (con `copiarWA` de `src/lib/whatsapp.js`, que ya existe) y avisar
  «el PDF va adjunto; el texto quedó copiado por si querés pegarlo». Así Javier
  decide si además lo pega.
- **Fallback**: si `navigator.share` no está disponible (PC de escritorio), caer al
  patrón `https://wa.me/<solo-numeros>` con el texto — ahí sí viaja el texto, y el
  PDF se descarga aparte. El patrón `wa.me` ya se usa en `DetalleClienteModal.jsx:57`,
  `FormPedido.jsx:605` y `EstimadorPrecio.jsx:747`. **Reusar, no reinventar.**

### 3.5.4 Envío por correo electrónico

⚠️ **No es un extra: enviar el DTE al receptor es obligación del emisor.** Y el
receptor necesita el **JSON**, no solo el PDF — el JSON es el documento con validez
fiscal; el PDF es la representación gráfica.

**Lo que ya existe (no reinventar):** Tlacuilo (`emisor-dte`) ya resuelve las dos
cosas en `emisor_dte_v8.html`:
- **Genera el PDF con jsPDF + autotable** (cargados por CDN).
- **Manda por correo con `mailto:`** (`emisor_dte_v8.html:1550`).

**Las opciones, de menos a más trabajo:**

| Opción | Cómo | Adjunta archivos | Costo |
|---|---|---|---|
| **A. `mailto:`** | Abre el correo del teléfono con destinatario, asunto y cuerpo ya escritos | ❌ **NO** | cero |
| **B. `navigator.share()`** | El mismo botón de compartir; Javier elige Gmail | ✅ sí | cero |
| **C. Backend que envía** | Edge Function de Supabase o endpoint en el puente, con SMTP o Resend | ✅ sí, y automático | medio |

**Recomendación**: empezar por la **B**, que es el mismo mecanismo del botón de
WhatsApp — un solo botón «Compartir factura» y que Javier elija a dónde. Con Gmail el
texto **sí** viaja (a diferencia de WhatsApp), así que ahí conviene mandar PDF + JSON
juntos y el cuerpo con los datos.

La **A (`mailto:`)** sirve como fallback en escritorio, igual que `wa.me`, pero
**no puede adjuntar** — solo texto con el link de la consulta pública.

La **C** es la única que hace el envío *automático* al emitir (sin que Javier toque
nada) y la que corresponde a la obligación legal de mandarlo siempre. Dejarla para
después de que el flujo manual funcione, y decidir con Javier si vale la pena. Nota:
el puente ya tiene autenticación y sabe de empresas, así que sería el lugar natural
— pero **el `/enviar` que existe hoy es «enviar al MH», no enviar correo**; no
confundirlos.

**Falta un dato**: los pedidos y `taller_clientes` **no guardan correo del cliente**.
Si se quiere enviar, hay que agregar el campo. Pedirle a Javier el correo de la USO.

### 3.5.5 Y que no se pierda

Guardar el JSON del DTE en `taller_facturas` (ya hay columnas `receptor` e `items`
jsonb) para poder **regenerar el PDF después** sin volver a emitir. Hoy, si el usuario
cierra la pantalla, el PDF no se puede reconstruir.

---

## 🟡 FASE 4 — Robustez (después de la primera emisión, no antes)

1. **Reconciliación de DTE huérfanos** (lo más grave): `facturacion.js:222-227` — si
   el INSERT en `taller_facturas` falla después de que el MH ya selló, solo sale un
   toast pidiendo anotar el sello a mano; el correlativo queda huérfano y el siguiente
   intento lo reutilizaría → rechazo por número de control repetido. Falta guardar el
   intento ANTES de emitir (estado `enviando`) y completarlo después.
2. **Sin anulación / nota de crédito** desde la app. Regla de la casa: invalidar el
   mismo día es la ventana buena.
3. **Falta la migración de `taller_facturas`** en `sql/` (se creó a mano en Supabase).
4. **La talla no va en la descripción del ítem** (`dominio.js:361-404` agrupa por
   `tipo|precio`). Para uniformes conviene que la factura la muestre.
5. **Sin tests de facturación**: no existe `facturacion.test.js`.
6. **Anon key y URL de Supabase hardcodeadas** y duplicadas en `facturacion.js:51-52`
   y `dtePendientes.js:9-10`.

---

## 🛡 Reglas para no romper nada

**Archivos que se pueden tocar** (y ningún otro):
- `src/lib/facturacion.js`
- `src/DetallePedidoModal.jsx`, **solo** dentro del componente `FacturaElectronica`
  (líneas 344-466)
- `src/lib/empresa.js` si hace falta leer config
- Tests nuevos en `src/lib/`

**NO tocar**:
- `src/lib/dominio.js` — lo usan las hojas de producción, corte y entrega. Si algo
  del payload necesita cambiar, hacerlo en `facturacion.js` al mapear, no en el
  dominio compartido.
- Nada de hojas de impresión, moldes, medidas ni catálogo.
- Los datos de los pedidos: ya están cuadrados contra los listados oficiales.

**Antes de empezar**:
```bash
git checkout -b dte/emisor-y-ambiente
npm test          # anotá cuántos pasan ANTES de tocar nada
```

**Antes de dar por terminado**:
1. `npm test` → **el mismo número de tests que pasaban antes, o más**. Ninguno menos.
2. `npm run build` sin errores.
3. Abrir un pedido cualquiera y verificar **a ojo** que siguen funcionando: el detalle,
   las hojas de Producción, Corte y Entrega, y el Excel. Si algo de eso se rompió,
   el cambio se salió de su carril.
4. **NO emitir en ambiente `01`** — dejarlo listo y que Javier dé la luz verde.

**Si algo no cuadra**: preguntá antes de inventar. Este flujo toca Hacienda; un DTE
transmitido no se borra, se invalida.
