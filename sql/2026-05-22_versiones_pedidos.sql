-- Historial automático de versiones de pedidos.
-- Cada UPDATE sobre taller_pedidos guarda el estado anterior (OLD)
-- como snapshot JSONB en taller_pedido_versiones.
--
-- Aplicado el 22-may-2026 via Management API.

CREATE TABLE IF NOT EXISTS public.taller_pedido_versiones (
  id BIGSERIAL PRIMARY KEY,
  pedido_id INT NOT NULL,
  snapshot JSONB NOT NULL,
  motivo TEXT NOT NULL DEFAULT 'auto',
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pedido_versiones
  ON public.taller_pedido_versiones (pedido_id, creado_en DESC);

ALTER TABLE public.taller_pedido_versiones ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS versiones_anon_all ON public.taller_pedido_versiones;
CREATE POLICY versiones_anon_all ON public.taller_pedido_versiones
  FOR ALL TO anon USING (true) WITH CHECK (true);
GRANT SELECT, INSERT, DELETE ON public.taller_pedido_versiones TO anon;
GRANT USAGE ON SEQUENCE public.taller_pedido_versiones_id_seq TO anon;

-- Trigger BEFORE UPDATE que guarda el estado OLD como nueva versión
CREATE OR REPLACE FUNCTION public.taller_pedidos_versionar()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $body$
BEGIN
  IF OLD IS DISTINCT FROM NEW THEN
    INSERT INTO public.taller_pedido_versiones (pedido_id, snapshot, motivo)
    VALUES (OLD.id, to_jsonb(OLD), 'auto-update');
  END IF;
  RETURN NEW;
END;
$body$;

DROP TRIGGER IF EXISTS taller_pedidos_versionar_trg ON public.taller_pedidos;
CREATE TRIGGER taller_pedidos_versionar_trg
  BEFORE UPDATE ON public.taller_pedidos
  FOR EACH ROW EXECUTE FUNCTION public.taller_pedidos_versionar();
