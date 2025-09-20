-- Set up cron jobs for retention mechanics

-- Schedule daily reminders to run every day at 9 AM
SELECT cron.schedule(
  'daily-reminders',
  '0 9 * * *',
  $$
  SELECT net.http_post(
    url := 'https://fezpzihnvblzjrdzgioq.supabase.co/functions/v1/send-daily-reminders',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlenB6aWhudmJsempyZHpnaW9xIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjM4MTE2OSwiZXhwIjoyMDcxOTU3MTY5fQ.7SU6L9sOSyEGI5UUvPBxoWgfSKzR-tLCe6P89BQNDwE"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);

-- Schedule weekly recaps to run every Sunday at 6 PM
SELECT cron.schedule(
  'weekly-recaps',
  '0 18 * * 0',
  $$
  SELECT net.http_post(
    url := 'https://fezpzihnvblzjrdzgioq.supabase.co/functions/v1/send-weekly-recaps',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlenB6aWhudmJsempyZHpnaW9xIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjM4MTE2OSwiZXhwIjoyMDcxOTU3MTY5fQ.7SU6L9sOSyEGI5UUvPBxoWgfSKzR-tLCe6P89BQNDwE"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);

-- Schedule leaderboard alerts to run every 4 hours
SELECT cron.schedule(
  'leaderboard-alerts',
  '0 */4 * * *',
  $$
  SELECT net.http_post(
    url := 'https://fezpzihnvblzjrdzgioq.supabase.co/functions/v1/send-leaderboard-alerts',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlenB6aWhudmJsempyZHpnaW9xIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjM4MTE2OSwiZXhwIjoyMDcxOTU3MTY5fQ.7SU6L9sOSyEGI5UUvPBxoWgfSKzR-tLCe6P89BQNDwE"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);