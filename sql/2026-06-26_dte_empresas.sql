-- Registro de empresas emisoras de DTE (integración con Tlacuilo / emisor-dte)
-- + estado del trámite de homologación ante Hacienda.
--
-- Soporta MULTI-EMPRESA: cada empresa del grupo (u otra app que quiera emitir
-- por Tlacuilo) tiene su perfil fiscal público (bloque `emisor` del DTE), su
-- ambiente (00 pruebas / 01 producción) y el estado de la "solicitud de cambio
-- a producción" — para que ese paso quede registrado en la app y no solo en la
-- cabeza del operador.
--
-- IMPORTANTE: nada secreto vive acá. El certificado .crt y las claves de MH
-- viven SOLO en el bridge Tlacuilo. Esto es data fiscal pública (NIT, NRC,
-- nombre, dirección, actividad económica).
--
-- Project kszdievqesveluzcnzsh (taller IMIS). Prefijo dte_ para aislar de la
-- otra app del project compartido. Aplicar via dashboard SQL (el MCP es read-only).

CREATE TABLE IF NOT EXISTS public.dte_empresas (
  id                   BIGSERIAL PRIMARY KEY,
  nombre               TEXT NOT NULL,                       -- razón social del emisor
  nit                  TEXT NOT NULL,                       -- con o sin guiones; el front normaliza
  nrc                  TEXT,
  nombre_comercial     TEXT,
  cod_actividad        TEXT,                                -- catálogo MH de actividad económica
  desc_actividad       TEXT,
  tipo_establecimiento TEXT NOT NULL DEFAULT '02',
  departamento         TEXT NOT NULL DEFAULT '06',          -- ⚠ usar código de distrito (reforma territorial)
  municipio            TEXT NOT NULL DEFAULT '14',          -- ⚠ idem; setear con el catálogo oficial MH
  complemento_dir      TEXT,
  telefono             TEXT,
  correo               TEXT,
  cod_estable_mh       TEXT NOT NULL DEFAULT 'M001',
  cod_estable          TEXT NOT NULL DEFAULT '0001',
  cod_punto_venta_mh   TEXT NOT NULL DEFAULT 'P001',
  cod_punto_venta      TEXT NOT NULL DEFAULT '0001',
  ambiente             TEXT NOT NULL DEFAULT '00',          -- '00' pruebas | '01' producción
  estado_homologacion  TEXT NOT NULL DEFAULT 'no_iniciada',
    -- no_iniciada | solicitada | en_pruebas | aprobada | produccion
  fecha_solicitud      DATE,
  fecha_aprobacion     DATE,
  correlativos         JSONB NOT NULL DEFAULT '{}'::jsonb,  -- {"01": 12, "03": 4} — siguiente numeroControl por tipo
  activa               BOOLEAN NOT NULL DEFAULT true,
  predeterminada       BOOLEAN NOT NULL DEFAULT false,      -- la que usa la app por defecto
  notas                TEXT,
  creado_en            TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Un solo registro activo por NIT (permite dejar histórico inactivo).
CREATE UNIQUE INDEX IF NOT EXISTS idx_dte_empresas_nit
  ON public.dte_empresas (nit) WHERE activa;

ALTER TABLE public.dte_empresas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS dte_empresas_anon_all ON public.dte_empresas;
CREATE POLICY dte_empresas_anon_all ON public.dte_empresas
  FOR ALL TO anon USING (true) WITH CHECK (true);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dte_empresas TO anon;
GRANT USAGE ON SEQUENCE public.dte_empresas_id_seq TO anon;

-- Correlativo atómico por (empresa, tipoDte). Incrementa y devuelve el nuevo
-- número para armar el numeroControl. Evita huecos/colisiones entre dispositivos.
CREATE OR REPLACE FUNCTION public.dte_siguiente_correlativo(p_empresa_id BIGINT, p_tipo TEXT)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $body$
DECLARE
  nuevo BIGINT;
BEGIN
  UPDATE public.dte_empresas
     SET correlativos = jsonb_set(
           correlativos, ARRAY[p_tipo],
           to_jsonb(COALESCE((correlativos->>p_tipo)::BIGINT, 0) + 1), true),
         actualizado_en = now()
   WHERE id = p_empresa_id
   RETURNING (correlativos->>p_tipo)::BIGINT INTO nuevo;
  RETURN nuevo;
END;
$body$;

GRANT EXECUTE ON FUNCTION public.dte_siguiente_correlativo(BIGINT, TEXT) TO anon;

-- Historial de DTEs emitidos desde un pedido. Trazabilidad y para no re-emitir
-- por accidente. Array de objetos:
--   {tipo, modo, sello, numeroControl, codigoGeneracion, monto, ambiente, fecha}
ALTER TABLE public.taller_pedidos
  ADD COLUMN IF NOT EXISTS dte_emitidos JSONB NOT NULL DEFAULT '[]'::jsonb;
