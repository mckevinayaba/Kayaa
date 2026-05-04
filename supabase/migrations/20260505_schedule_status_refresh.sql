-- ─────────────────────────────────────────────────────────────────────────────
-- Schedule the refresh-place-status edge function to run daily at 7AM SAST
-- (05:00 UTC). Requires pg_cron extension (enabled by default on Supabase).
-- Paste into Supabase SQL Editor and run once.
-- ─────────────────────────────────────────────────────────────────────────────

-- Enable pg_cron if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule daily 7AM SAST refresh (05:00 UTC)
SELECT cron.schedule(
  'refresh-place-status-daily',     -- job name (unique)
  '0 5 * * *',                      -- cron: every day at 05:00 UTC = 07:00 SAST
  $$
    SELECT net.http_post(
      url    := current_setting('app.supabase_url') || '/functions/v1/refresh-place-status',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.service_role_key'),
        'Content-Type',  'application/json'
      ),
      body   := '{}'::jsonb
    );
  $$
);
