-- Contornos reales de los moldes (pendiente 0).
--
-- Hasta ahora `taller_moldes` solo guardaba la CAJA de cada pieza
-- (ancho_cm x alto_cm). Un trazo dibujado con eso son rectangulos y el metraje
-- sale sobreestimado: seguro para comprar, inservible para optimizar el tendido.
--
-- `contorno` guarda el poligono real en cm, relativo a la esquina superior
-- izquierda de la caja, con y hacia abajo:
--   {"puntos": [[x,y], ...], "forma": "curva"|"rectangulo", "area_cm2": 1668.4}
--
-- Lo llena `scripts/moldes/extraer_contornos.py` a partir de los PDF por pieza.
-- Medido sobre las 125 piezas de camiseta: el area real es 15.0% menor que la
-- suma de las cajas (269 389 -> 228 909 cm2).

alter table public.taller_moldes
  add column if not exists contorno jsonb;

comment on column public.taller_moldes.contorno is
  'Poligono real de la pieza en cm, relativo a la caja (origen arriba-izquierda, y hacia abajo). Lo genera scripts/moldes/extraer_contornos.py. NULL = solo se conoce la caja.';

-- perimetro_cm / ancho_25 / ancho_50 / ancho_75 ya existen y estaban NULL en
-- las 125 filas de camiseta y las 89 de polo; se llenan en la misma pasada.

-- Indice parcial: casi todas las consultas piden las que YA tienen contorno.
create index if not exists taller_moldes_con_contorno
  on public.taller_moldes (prenda, talla)
  where contorno is not null;
