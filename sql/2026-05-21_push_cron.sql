-- Cron diario para Web Push de vencimientos.
-- Aplicado el 21-may-2026 via Management API.
--
-- Pasos:
--   1. pg_cron y pg_net deben estar habilitados (Supabase los soporta
--      en schema 'extensions' ya configurado).
--   2. Schedule diario a las 14:00 UTC = 8:00 AM El Salvador (UTC-6).
--   3. El job hace HTTP POST a la Edge Function notificar-vencimientos.
--      Como la función fue deployada con --no-verify-jwt, no requiere
--      Authorization header.
--
-- Para cambiar la hora, editá el cron expression (formato UTC):
--   '0 12 * * *' = 6 AM SV
--   '0 13 * * *' = 7 AM SV
--   '0 14 * * *' = 8 AM SV (configurado)
--   '0 15 * * *' = 9 AM SV
--
-- Para verificar último run:
--   SELECT * FROM cron.job_run_details
--   WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'taller-notificar-vencimientos')
--   ORDER BY start_time DESC LIMIT 5;

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Idempotente: desprogramar el job anterior si existe
SELECT cron.unschedule('taller-notificar-vencimientos')
 WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'taller-notificar-vencimientos');

SELECT cron.schedule(
  'taller-notificar-vencimientos',
  '0 14 * * *',
  $$
  SELECT net.http_post(
    url := 'https://kszdievqesveluzcnzsh.supabase.co/functions/v1/notificar-vencimientos',
    headers := '{"Content-Type": "application/json"}'::jsonb
  )
  $$
);
