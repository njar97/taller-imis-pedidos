-- Memoria compartida de tipos de prenda "libres" (los que no están en
-- el catálogo). Cuando un user escribe "Cortina bordada" o "Banner" en
-- el input libre de FormPedido, este registro guarda el nombre para que
-- los próximos pedidos lo vean como chip rápido en "⭐ Recientes".
--
-- Diseñado para taller IMIS (project kszdievqesveluzcnzsh).
-- Prefijo taller_ para aislar de la otra app del project compartido.

CREATE TABLE IF NOT EXISTS public.taller_prendas_recientes (
  id        BIGSERIAL PRIMARY KEY,
  nombre    TEXT NOT NULL UNIQUE,
  usado_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  uso_count INT NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_taller_prendas_recientes_usado
  ON public.taller_prendas_recientes (usado_at DESC);

ALTER TABLE public.taller_prendas_recientes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS taller_prendas_recientes_anon_all
  ON public.taller_prendas_recientes;

CREATE POLICY taller_prendas_recientes_anon_all
  ON public.taller_prendas_recientes
  FOR ALL TO anon
  USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE ON public.taller_prendas_recientes TO anon;
GRANT USAGE ON SEQUENCE public.taller_prendas_recientes_id_seq TO anon;

-- Upsert atómico: si el nombre ya existe, bump uso_count + usado_at;
-- si no, inserta con count=1. Llamada desde el front al guardar pedido.
CREATE OR REPLACE FUNCTION public.taller_marcar_prenda(p_nombre TEXT)
RETURNS VOID
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.taller_prendas_recientes (nombre, usado_at, uso_count)
  VALUES (trim(p_nombre), now(), 1)
  ON CONFLICT (nombre) DO UPDATE
    SET usado_at  = now(),
        uso_count = public.taller_prendas_recientes.uso_count + 1
$$;

GRANT EXECUTE ON FUNCTION public.taller_marcar_prenda(TEXT) TO anon;
