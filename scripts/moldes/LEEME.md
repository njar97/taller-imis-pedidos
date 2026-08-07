# Contornos reales de los moldes

Resuelve el **pendiente 0** de `CLAUDE.md`: `taller_moldes` guardaba solo la
**caja** de cada pieza (`ancho_cm` × `alto_cm`), así que cualquier trazo dibujado
con esos datos eran rectángulos y el metraje salía sobreestimado.

Ahora cada fila de camiseta tiene su polígono real en `contorno` (jsonb), más
`perimetro_cm` y `ancho_25/50/75`.

## Orden de ejecución

```
python extraer_contornos.py            # PDFs -> contornos_camiseta.json
python cargar_contornos.py             # ensayo
python cargar_contornos.py --aplicar   # escribe en taller_moldes
python clasificar_cuerpos.py --aplicar # etiqueta que es cada cuerpo-filaN
python tela_por_camiseta.py            # caja vs contorno real, por talla
```

Requiere `pip install pymupdf`. Los PDF están en OneDrive,
`UDP Confecciones\Uniformes Escolares\Patrones_Tallas\_Pack_Comprado_camiseta`.

El DDL está en `sql/2026-08-06_moldes_contorno.sql` (ya aplicado).

## Las tres trampas de este pack

**1. Los PDF por pieza no están recortados, están encuadrados.** Cada archivo
trae los **107 trazos de la hoja de plóter completa** y lo único que cambia es
el mediabox. Agarrar "el path más grande" —la regla que sirvió para los moldes
trazados del taller— devuelve una pieza de otra talla **sin dar ningún error**.
La regla que funciona: emparejar el bbox contra el `ancho×alto` del nombre del
archivo (tolerancia 0.45 cm) y, entre los que calzan, **la curva le gana al
rectángulo** — con el mismo bbox conviven el molde y el marco de la hoja.
La `tira-cuello` es la excepción legítima: ES un rectángulo de 4 puntos.

**2. `manga-1` de las tallas numéricas no es una manga, es un marco.** En T4,
T6, T8, T10, T12 y T14 no existe ni un trazo con curvas en ese bbox. Esas 6
filas se mandaron a la papelera (`deleted_at`, reversible). En las tallas de
letra `manga-1` sí es la manga buena.

**3. La numeración de las filas NO significa lo mismo en las dos familias.**

| | delantera redonda | cuello en V | trasera | no es cuerpo |
|---|---|---|---|---|
| numéricas 2-14 | fila1 = fila2 | fila3 | fila4 = fila5 | fila6 (manga larga) |
| letra XS-XXL | fila1 | fila2 | fila3 | fila4 (manga larga) |

Por eso `clasificar_cuerpos.py` **mide** en vez de confiar en el nombre: si el
área está muy por debajo del cuerpo más grande de la talla no es un cuerpo, y
entre los cuerpos el escote más hondo es el V y el más somero es la trasera.

## Qué se gana

El área real es **11.7% menor** que la suma de las cajas, parejo en todas las
tallas. Eso es el piso teórico, **no el metraje**: el desperdicio entre piezas
se calcula al acomodarlas en el ancho de la tela.

Falta la parte (c) del pendiente: **acomodar el trazo** encajando la manga en el
hueco de la sisa. El contorno ya está en la base, que era lo que lo bloqueaba.
