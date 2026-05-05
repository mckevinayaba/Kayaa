-- ─────────────────────────────────────────────────────────────────────────────
-- Kayaa: community_requests table
--
-- Purpose:
--   Track every user search for a community that does not exist yet.
--   This is demand intelligence — it tells us where to expand next.
--
--   Requested communities do NOT automatically become live.
--   They are reviewed for duplicates, spelling variants, and wrong province
--   assignments before being promoted to the communities data file.
--
-- Run this in the Supabase SQL editor.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS community_requests (
  id                  UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  community_name      TEXT        NOT NULL,
  province            TEXT,
  metro_or_city       TEXT,
  community_type      TEXT        DEFAULT 'suburb',
  status              TEXT        DEFAULT 'requested',   -- requested | reviewed | merged | rejected
  search_count        INTEGER     DEFAULT 1,
  requested_by_user   BOOLEAN     DEFAULT false,          -- true = explicit submit, false = passive search
  user_id             UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  last_requested_at   TIMESTAMPTZ DEFAULT now(),
  created_at          TIMESTAMPTZ DEFAULT now()
);

-- Index for admin queries: most wanted communities first
CREATE INDEX IF NOT EXISTS idx_community_requests_count
  ON community_requests (search_count DESC);

CREATE INDEX IF NOT EXISTS idx_community_requests_name
  ON community_requests (lower(community_name));

-- ── RLS ───────────────────────────────────────────────────────────────────────

ALTER TABLE community_requests ENABLE ROW LEVEL SECURITY;

-- Anyone (including anonymous) can insert a request
CREATE POLICY "Anyone can request a community"
  ON community_requests FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Authenticated users can see their own requests (for profile/history UI)
CREATE POLICY "Users can view their own requests"
  ON community_requests FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR user_id IS NULL);

-- Service role can read all (admin dashboard)
-- (service_role bypasses RLS by default)

-- ── Upsert helper function ────────────────────────────────────────────────────
-- Increments search_count if the same community_name already exists,
-- rather than creating a duplicate row.

CREATE OR REPLACE FUNCTION upsert_community_request(
  p_name        TEXT,
  p_province    TEXT DEFAULT NULL,
  p_metro       TEXT DEFAULT NULL,
  p_type        TEXT DEFAULT 'suburb',
  p_user_id     UUID DEFAULT NULL,
  p_explicit    BOOLEAN DEFAULT false
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO community_requests (
    community_name, province, metro_or_city, community_type,
    requested_by_user, user_id, last_requested_at, created_at
  )
  VALUES (
    p_name, p_province, p_metro, p_type,
    p_explicit, p_user_id, now(), now()
  )
  ON CONFLICT DO NOTHING;  -- fallback if unique constraint added later

  -- Increment count on any matching name (case-insensitive)
  UPDATE community_requests
  SET
    search_count       = search_count + 1,
    last_requested_at  = now(),
    requested_by_user  = requested_by_user OR p_explicit,
    user_id            = COALESCE(user_id, p_user_id)
  WHERE lower(community_name) = lower(p_name)
    AND id != (
      SELECT id FROM community_requests
      WHERE lower(community_name) = lower(p_name)
      ORDER BY created_at ASC
      LIMIT 1
    );
END;
$$;
