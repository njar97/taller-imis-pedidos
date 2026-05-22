-- Web Push Notifications — tabla de suscripciones de dispositivos.
--
-- Cada navegador que activa notificaciones se registra acá con su
-- endpoint único (provisto por el browser push service: FCM en Chrome,
-- Mozilla Push en Firefox, Apple en Safari). Cuando queremos mandar
-- una notification, la Edge Function lee esta tabla y manda un
-- mensaje a cada endpoint usando la VAPID privada.
--
-- Aplicado el 21-may-2026 via Management API.

CREATE TABLE IF NOT EXISTS public.taller_push_subs (
  id BIGSERIAL PRIMARY KEY,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT NOT NULL DEFAULT '',
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  ultimo_uso TIMESTAMPTZ,
  fallos_consecutivos INT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_push_subs_creado
  ON public.taller_push_subs (creado_en DESC);

ALTER TABLE public.taller_push_subs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS push_subs_anon_all ON public.taller_push_subs;

CREATE POLICY push_subs_anon_all
  ON public.taller_push_subs
  FOR ALL TO anon
  USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.taller_push_subs TO anon;
GRANT USAGE ON SEQUENCE public.taller_push_subs_id_seq TO anon;
