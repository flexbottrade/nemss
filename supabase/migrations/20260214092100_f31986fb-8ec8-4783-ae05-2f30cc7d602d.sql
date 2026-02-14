
SELECT cron.schedule(
  'keep-alive-health-check',
  '0 0 * * *',
  $$
  SELECT net.http_post(
    url := 'https://ifftfzcyxkkduxnexdwm.supabase.co/functions/v1/health',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlmZnRmemN5eGtrZHV4bmV4ZHdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIwODIzMzAsImV4cCI6MjA3NzY1ODMzMH0.WpJCyOyD6ffzVn_ApZEFNPK1ZSxK3DTTeUfxPn1loJE"}'::jsonb,
    body := concat('{"time": "', now(), '"}')::jsonb
  ) AS request_id;
  $$
);
