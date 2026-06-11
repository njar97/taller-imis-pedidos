# Plan Estratégico IMELTEX — Catálogo · Producción · Web · Marketing

> Documento de trabajo. Estado: borrador. Última actualización: junio 2026.

---

## Contexto

IMELTEX tiene tres productos diferenciadores que no todos los talleres ofrecen:
1. **Cuellos tejidos** — inversión importante en maquinaria, trabajo artesanal especializado
2. **Bordados computarizados** — equipo propio, diseños propios
3. **Confección con sublimación / DTF** — personalización completa de prendas

El sistema actual (app de pedidos) gestiona el trabajo interno bien, pero el conocimiento técnico vive en notas sueltas y en la cabeza. El sitio web existe pero no refleja la capacidad real del taller ni está posicionado para atraer clientes.

**Objetivo del plan:** convertir el catálogo en el activo central que conecta producción interna, sitio web y marketing — con los cuellos y bordados como productos estrella.

---

## I. Arquitectura de datos — Catálogo enriquecido

### Estado actual
- `taller_catalogo` existe pero está vacía (0 filas). La app usa `catalogoBase.js` como fallback con 8 productos básicos.
- Los pedidos no están vinculados al catálogo — cada uno se llena a mano.
- Las especificaciones técnicas de diseño viven en notas de texto libre.

### Estructura propuesta

```
taller_catalogo (enriquecida)
  ├── id, nombre, descripcion
  ├── categoria: "cuello" | "prenda" | "bordado"
  ├── imagen_principal (Supabase Storage)
  ├── imagenes_referencia[]       ← fotos reales del taller
  ├── telas_disponibles[]
  ├── tallas_disponibles[]
  ├── tecnicas[]
  │     ├── tipo: "bordado" | "sublimación" | "DTF" | "tejido"
  │     ├── precio_base
  │     ├── especificaciones: [{ ubicacion, ancho_cm, alto_cm, notas }]
  │     └── imagenes_referencia[]
  ├── visible_en_web: boolean
  ├── destacado: boolean          ← para cuellos y bordados
  └── orden_web: integer          ← control manual del orden en el sitio
```

```
taller_pedidos (agrega)
  ├── catalogo_ref                ← FK opcional a taller_catalogo
  ├── tecnica_seleccionada        ← cuál técnica del catálogo se usó
  └── disenos: jsonb              ← personalizaciones sobre la base del catálogo
        [{ ubicacion, tecnica, ancho_cm, alto_cm, notas }]
```

### Flujo bidireccional

```
CATÁLOGO ──────────────────→ PEDIDO
  aplica plantilla base          ajusta para el cliente
  (prenda + técnica + specs)     (colores, texto, medidas distintas)

PEDIDO ─────────────────────→ CATÁLOGO
  pedido exitoso y repetible     "Guardar como plantilla"
                                 el catálogo aprende del trabajo real
```

---

## II. App de gestión — Cambios

### SeccionCatalogo → Editor de fichas técnicas
- Agregar/editar técnicas disponibles por producto con sus specs
- Subir imágenes de referencia por técnica
- Toggle `visible_en_web` y `destacado`
- Botón "Promover desde pedido" — convierte un pedido exitoso en plantilla de catálogo

### FormPedido — cambio quirúrgico
- Selector opcional "Basado en catálogo" → auto-rellena prenda + técnica + specs
- Campo `disenos` editable: tabla de filas (ubicación / técnica / ancho / alto / nota)
- Solo visible cuando `tiene_bordado = true` o cuando viene del catálogo con técnica
- Sin catálogo seleccionado: funciona exactamente igual que hoy

### Hoja de producción — se enriquece sola
- Si el pedido viene del catálogo: hereda specs técnicas automáticamente
- Si tiene personalizaciones (`disenos`): las muestra como bloque "Especificaciones de diseño"
- Formato: tabla compacta — Ubicación · Técnica · Medidas · Nota

### DetallePedidoModal
- Bloque "Especificaciones de diseño" si `disenos` tiene datos
- Solo renderiza si hay datos, cero ruido en pedidos sin diseños

---

## III. Sitio web — Rediseño

### Estado actual
El sitio existe (`taller-imis-web`), tiene SEO básico configurado (Schema.org, Open Graph, sitemap), páginas separadas para cuellos y bordados, pero visualmente genérico y sin conexión con los datos reales del catálogo.

### Problema a resolver
El 95% de los sitios hechos con IA se ven iguales: hero genérico → cards de servicios → formulario de contacto. Son olvidables. IMELTEX tiene algo que no se puede generar: oficio real, maquinaria propia, 15 años de trabajo.

### Dirección de diseño: "El taller como espacio"

El sitio debe sentirse como entrar al taller — no como una landing de SaaS.

**Visual:**
- Fondo oscuro texturizado (tela lona / denim, no negro plano)
- Tipografía editorial con peso: títulos grandes, contraste extremo entre display y cuerpo
- Los cuellos y bordados como protagonistas visuales — fotografía real de proceso y producto
- Fichas de catálogo con estética de etiqueta textil: fondo crema, bordes definidos, especificaciones técnicas visibles
- Paleta: crema / casi-negro / acento dorado (hilo metálico — el diferenciador de los cuellos)
- Sin stock photos. Sin íconos genéricos. Sin gradientes de startup.

**Fotografía necesaria (prioridad):**
- Cuello tejido de cerca — textura del hilo, terminaciones
- Máquina de tejido en operación
- Bordado computarizado en proceso
- Resultado final en prenda (camisa con bordado, uniforme con cuello)
- El taller — espacio, manos trabajando

### Estructura de páginas

```
/                   Hero — cuellos tejidos como protagonista
                    Servicios en 3 bloques: Cuellos · Bordados · Confección
                    Por qué IMELTEX (15 años, maquinaria propia, licitaciones)
                    CTA: cotizar

/cuellos            Landing dedicada — la inversión grande merece su espacio
                    Tipos de cuello disponibles (del catálogo)
                    Especificaciones: materiales, tallas, tiempos
                    Galería de trabajos reales
                    Formulario de cotización específico

/bordados           Landing dedicada
                    Técnicas: bordado computarizado, sublimación, DTF
                    Del catálogo: productos disponibles con cada técnica
                    Galería + especificaciones
                    Formulario de cotización

/catalogo           Todos los productos con visible_en_web=true
                    Filtro por categoría
                    Cada card muestra: producto + técnicas disponibles + precio desde $X

/catalogo/:slug     Ficha del producto
                    Imágenes del trabajo real
                    Técnicas disponibles con specs y precios
                    Botón "Solicitar cotización" → lleva datos al formulario

/cotizar            Flujo conversacional en pasos (no formulario plano):
                    1. ¿Qué necesitás? (elige del catálogo o describe)
                    2. ¿Cuántas unidades?
                    3. ¿Cuándo lo necesitás?
                    4. Imagen de referencia (opcional)
                    5. Tus datos
                    → Al enviar: crea cotización en taller_pedidos automáticamente
                    → Notificación inmediata en la app

/nosotros           Historia, personas, maquinaria, ubicación
```

### Conexión web → sistema

```
Cliente llena /cotizar
      ↓
POST a Supabase → nueva fila en taller_pedidos (es_cotizacion=true)
      ↓
Notificación en la app de pedidos
      ↓
Admin responde desde la app con cotización formal → envía por WA
```

---

## IV. Marketing — Pista paralela

> Gestionado desde la PC del taller vía PowerShell.

### SEO (sin costo)

El sitio ya tiene Schema.org y sitemap. Lo que falta:

**Palabras clave prioritarias para El Salvador:**
- "cuellos tejidos El Salvador" / "cuellos tejidos Sonsonate"
- "bordados computarizados uniformes El Salvador"
- "confección uniformes escolares Sonsonate"
- "sublimación camisas El Salvador"
- "licitaciones uniformes COMPRASAL"

**Acciones:**
- Google Search Console: verificar y monitorear posicionamiento
- Cada página de servicio necesita H1 y meta description con las keywords exactas
- Las fichas de catálogo generan páginas indexables automáticamente
- Blog/noticias: casos de trabajo (ej. "Camisas para MDJ Sensunapan — 35 unidades con sublimación dorado mate") — contenido real que Google valora

### Google Business Profile
- Perfil de empresa en Google Maps (crítico para búsquedas locales)
- Fotos del taller, productos, equipo
- Categorías: "Servicio de bordado" + "Fabricante de ropa" + "Tienda de uniformes"
- Solicitar reseñas a clientes actuales

### Google Ads (paid)
- Campañas pequeñas y específicas: cuellos tejidos y bordados (los diferenciadores)
- Segmentación geográfica: El Salvador, prioridad Sonsonate / San Salvador
- Keywords exactas: "cuellos tejidos uniforme" — poco volumen, alta intención de compra
- El formulario de cotización es el destino de los anuncios → medir conversiones

### Redes sociales
- Instagram / Facebook: fotografía del proceso y resultado final
- Reels cortos: máquina tejiendo un cuello, bordado computarizado en tiempo real
- Los pedidos exitosos (con permiso del cliente) son contenido: antes/después
- Meta Ads: retargeting a quienes visitaron /cuellos o /bordados sin cotizar

### PowerShell — herramientas a configurar
```powershell
# Google Ads API — campañas, reportes de conversión
# Meta Graph API — publicar desde scripts, reportes de alcance
# Google Search Console API — posicionamiento de keywords
# Automatizar reportes semanales a Excel/CSV
```

---

## V. Orden de construcción

### Fase 1 — Catálogo técnico (semana 1-2)
- [ ] Campo `disenos` en `taller_pedidos` (BD)
- [ ] Editor de `disenos` en `FormPedido`
- [ ] Bloque de specs en hoja de producción
- [ ] Enriquecer `taller_catalogo` con técnicas y specs en `SeccionCatalogo`

### Fase 2 — Vínculo pedidos↔catálogo (semana 2-3)
- [ ] Campo `catalogo_ref` y `tecnica_seleccionada` en `taller_pedidos`
- [ ] Selector de catálogo en `FormPedido` (opcional, auto-rellena)
- [ ] Botón "Promover como plantilla" en pedidos

### Fase 3 — Web con datos reales (semana 3-4)
- [ ] Rediseño visual — identidad "taller como espacio"
- [ ] Landing de cuellos tejidos (página estrella)
- [ ] Landing de bordados
- [ ] Catálogo público conectado a Supabase (solo `visible_en_web=true`)
- [ ] Ficha de producto por ítem del catálogo

### Fase 4 — Flujo de cotización web→sistema (semana 4-5)
- [ ] Formulario conversacional `/cotizar`
- [ ] POST a Supabase → crea cotización en `taller_pedidos`
- [ ] Notificación en la app
- [ ] Respuesta desde la app → envío por WA al cliente

### Fase 5 — Marketing (paralelo desde semana 2)
- [ ] Google Business Profile completo con fotos reales
- [ ] Google Search Console verificado
- [ ] Palabras clave en todas las páginas del sitio
- [ ] Primera campaña Google Ads: cuellos tejidos
- [ ] Script PowerShell para reportes semanales de posicionamiento

---

## VI. Qué necesitamos antes de empezar el rediseño

Lo más importante para que el sitio funcione como herramienta de ventas:

**Fotografía real (prioritario):**
- Cuellos tejidos: texturas de cerca, variedad de colores, en uso
- Proceso de bordado: máquina bordando, resultado final
- El taller: espacio, personas trabajando
- Prenda terminada representativa de cada servicio

Sin esto, el diseño más caro del mundo no convierte. La fotografía real es lo que diferencia a IMELTEX de cualquier taller genérico.

---

*Este documento vive en `docs/PLAN_ESTRATEGICO.md` del repo `taller-imis-pedidos`.*
*Actualizar conforme avance el trabajo.*
