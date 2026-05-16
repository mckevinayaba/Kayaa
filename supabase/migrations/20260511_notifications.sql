-- ─────────────────────────────────────────────────────────────────────────────
-- notifications — schema additions for Kayaa zero-cost notification stack
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. venue_owners: ensure whatsapp_number column exists ────────────────────

ALTER TABLE venue_owners
  ADD COLUMN IF NOT EXISTS whatsapp_number text;

-- ── 2. neighbourhood_alert_opts ──────────────────────────────────────────────
-- Tracks which users have opted in to safety/alert emails for their suburb.
-- One row per (user, suburb) pair — upserted when user toggles the switch.

CREATE TABLE IF NOT EXISTS neighbourhood_alert_opts (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  suburb     text        NOT NULL,
  email      text        NOT NULL,
  opted_in   boolean     NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, suburb)
);

CREATE INDEX IF NOT EXISTS idx_alert_opts_suburb
  ON neighbourhood_alert_opts (lower(suburb))
  WHERE opted_in = true;

ALTER TABLE neighbourhood_alert_opts ENABLE ROW LEVEL SECURITY;

-- Users can read and manage their own rows
CREATE POLICY "alert_opts_select_own" ON neighbourhood_alert_opts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "alert_opts_upsert_own" ON neighbourhood_alert_opts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "alert_opts_update_own" ON neighbourhood_alert_opts
  FOR UPDATE USING (auth.uid() = user_id);

-- ── 3. notification_log ───────────────────────────────────────────────────────
-- Simple dedup log — prevents sending the same email twice (e.g. milestone).
-- Edge functions check here before sending.

CREATE TABLE IF NOT EXISTS notification_log (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type  text        NOT NULL,  -- 'checkin', 'milestone_10', 'safety_alert', 'board_reply'
  entity_id   text        NOT NULL,  -- venue_id, post_id, or comment_id
  sent_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_type, entity_id)
);

-- Auto-clean logs older than 30 days (keep table small)
CREATE INDEX IF NOT EXISTS idx_notif_log_sent_at ON notification_log (sent_at);

-- Service role bypasses RLS — edge functions write here with service key
ALTER TABLE notification_log ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────────────────────
-- DATABASE WEBHOOK SETUP (do this in Supabase Dashboard → Database → Webhooks)
-- ─────────────────────────────────────────────────────────────────────────────
-- Webhook 1: "on_checkin"
--   Table:   check_ins
--   Events:  INSERT
--   URL:     https://<project-ref>.functions.supabase.co/notify-checkin
--   Headers: Authorization: Bearer <SERVICE_ROLE_KEY>
--
-- Webhook 2: "on_user_post"
--   Table:   user_posts
--   Events:  INSERT
--   URL:     https://<project-ref>.functions.supabase.co/notify-safety-alert
--   Headers: Authorization: Bearer <SERVICE_ROLE_KEY>
--
-- Webhook 3: "on_board_comment"
--   Table:   board_post_comments
--   Events:  INSERT
--   URL:     https://<project-ref>.functions.supabase.co/notify-board-reply
--   Headers: Authorization: Bearer <SERVICE_ROLE_KEY>
--
-- Required Supabase secrets (Dashboard → Settings → Edge Functions → Secrets):
--   RESEND_API_KEY      — from resend.com
--   KAYAA_FROM_EMAIL    — e.g. hello@kayaa.co.za (must be verified in Resend)
--   KAYAA_BASE_URL      — e.g. https://kayaa.co.za
--   KAYAA_WA_NUMBER     — e.g. 27831234567 (digits only, no +)
--   WEBHOOK_SECRET      — random string, add as header in dashboard webhook config
-- ─────────────────────────────────────────────────────────────────────────────
