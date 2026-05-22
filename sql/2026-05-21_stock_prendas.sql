-- Stock libre de prendas — piezas cortadas/preparadas que no están
-- atadas a un pedido específico. Bodega independiente.
--
-- La sección 📋 Resumen por talla muestra estas piezas junto al
-- desglose de pedidos activos (en corte, producción, listo) para que
-- el admin sepa cuánto le falta producir por talla.
--
-- Aplicado en producción el 21-may-2026 via Management API.

CREATE TABLE IF NOT EXISTS public.taller_stock_prendas (
  id BIGSERIAL PRIMARY KEY,
  tipo TEXT NOT NULL,
  talla TEXT NOT NULL DEFAULT '',
  qty INT NOT NULL CHECK (qty > 0),
  notas TEXT NOT NULL DEFAULT '',
  fecha TEXT NOT NULL,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_stock_prendas_tipo_talla
  ON public.taller_stock_prendas (tipo, talla)
  WHERE deleted_at IS NULL;

ALTER TABLE public.taller_stock_prendas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS stock_prendas_anon_all ON public.taller_stock_prendas;

CREATE POLICY stock_prendas_anon_all
  ON public.taller_stock_prendas
  FOR ALL TO anon
  USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.taller_stock_prendas TO anon;
GRANT USAGE ON SEQUENCE public.taller_stock_prendas_id_seq TO anon;
