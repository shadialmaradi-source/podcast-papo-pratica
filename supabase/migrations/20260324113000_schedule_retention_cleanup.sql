-- Run retention cleanup daily at 03:30 UTC.
-- This targets temporary/response/history data and explicitly does not touch shared library assets.
-- Secret source:
--   current_setting('app.settings.cron_secret', true)
-- Required setup (per environment):
--   ALTER DATABASE postgres SET app.settings.cron_secret = '<strong-random-secret>';
-- And set the same value in Edge Function env:
--   CRON_SECRET=<strong-random-secret>

DO $$
BEGIN
  PERFORM cron.unschedule('retention-cleanup-daily');
EXCEPTION
  WHEN others THEN NULL;
END $$;

SELECT cron.schedule(
  'retention-cleanup-daily',
  '30 3 * * *',
  $$
  SELECT net.http_post(
    url := 'https://fezpzihnvblzjrdzgioq.supabase.co/functions/v1/cleanup-retention',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', COALESCE(current_setting('app.settings.cron_secret', true), '')
    ),
    body := '{}'::jsonb
  );
  $$
);
