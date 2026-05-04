-- ─────────────────────────────────────────────────────────────────────────────
-- Owner claim + structured hours migration
-- Paste into Supabase SQL editor and click Run
-- ─────────────────────────────────────────────────────────────────────────────

-- Step 1: Add owner columns to venues table
ALTER TABLE venues
  ADD COLUMN IF NOT EXISTS owner_claimed   BOOLEAN   DEFAULT false,
  ADD COLUMN IF NOT EXISTS owner_user_id   UUID      REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS owner_hours     JSONB;

-- Step 2: Create claimed_requests table
-- You review these manually and flip owner_claimed = true when approved
CREATE TABLE IF NOT EXISTS claimed_requests (
  id           UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  venue_id     UUID        REFERENCES venues(id) NOT NULL,
  venue_name   TEXT        NOT NULL,
  name         TEXT        NOT NULL,
  email        TEXT        NOT NULL,
  phone        TEXT,
  is_owner_confirmed BOOLEAN DEFAULT false,
  status       TEXT        DEFAULT 'pending', -- pending | approved | rejected
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- Step 3: Enable RLS on claimed_requests
ALTER TABLE claimed_requests ENABLE ROW LEVEL SECURITY;

-- Anyone can insert a claim request (no auth required)
CREATE POLICY "Anyone can submit a claim"
  ON claimed_requests FOR INSERT
  WITH CHECK (true);

-- Only service role can read/update (you manage this in Supabase dashboard)
CREATE POLICY "Service role manages claims"
  ON claimed_requests FOR SELECT
  USING (auth.role() = 'service_role');

-- Verify
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'venues'
  AND column_name IN ('owner_claimed', 'owner_user_id', 'owner_hours')
ORDER BY column_name;
