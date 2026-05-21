-- Tabla de costos base para el estimador de precio.
-- categoria: 'tela' | 'mano_obra' | 'extra'
-- unidad:    'yarda' | 'prenda' | 'hora' | 'unidad' | 'puntada' | 'mil_puntadas'
-- El seed son valores típicos del taller IMIS — editar desde Admin → Costos
-- o desde el dashboard de Supabase.

CREATE TABLE IF NOT EXISTS public.taller_costos_base (
  id BIGSERIAL PRIMARY KEY,
  categoria TEXT NOT NULL,
  nombre TEXT NOT NULL,
  unidad TEXT NOT NULL,
  costo NUMERIC(10,4) NOT NULL,
  activo BOOLEAN NOT NULL DEFAULT true,
  orden INT NOT NULL DEFAULT 0,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (categoria, nombre)
);

CREATE INDEX IF NOT EXISTS idx_taller_costos_base_cat_activo
  ON public.taller_costos_base (categoria, activo);

ALTER TABLE public.taller_costos_base ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS taller_costos_base_anon_all
  ON public.taller_costos_base;

CREATE POLICY taller_costos_base_anon_all
  ON public.taller_costos_base
  FOR ALL TO anon
  USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.taller_costos_base TO anon;
GRANT USAGE ON SEQUENCE public.taller_costos_base_id_seq TO anon;

-- Seed con valores típicos. ON CONFLICT DO NOTHING — solo inserta la
-- primera vez, no sobrescribe ediciones del user.
INSERT INTO public.taller_costos_base (categoria, nombre, unidad, costo, orden) VALUES
  ('tela',      'Dacrón',           'yarda',  4.00, 1),
  ('tela',      'Gabardina',        'yarda',  5.00, 2),
  ('tela',      'Satín',            'yarda',  6.00, 3),
  ('tela',      'Lino',             'yarda',  5.50, 4),
  ('tela',      'Tafeta',           'yarda',  4.50, 5),
  ('tela',      'Lycra',            'yarda',  5.00, 6),
  ('tela',      'Algodón',          'yarda',  4.50, 7),
  ('tela',      'Dril',             'yarda',  5.50, 8),
  ('mano_obra', 'Por prenda',       'prenda', 3.00, 1),
  ('mano_obra', 'Por hora',         'hora',   4.00, 2),
  ('extra',     'Botón',            'unidad', 0.10, 1),
  ('extra',     'Zíper',            'unidad', 1.50, 2),
  ('extra',     'Hilo (carrete)',   'unidad', 0.50, 3),
  ('extra',     'Etiqueta',         'unidad', 0.20, 4),
  ('extra',     'Cuello tejido',    'unidad', 3.50, 5)
ON CONFLICT (categoria, nombre) DO NOTHING;
