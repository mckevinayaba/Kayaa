-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: Connect check_ins to authenticated users
--
-- Before this: visitor_name was a random localStorage UUID — useless for
-- showing real people in Regulars or the owner dashboard.
--
-- After this: authenticated check-ins store the user's real name + user_id.
-- Anonymous check-ins still work (user_id = null, visitor_name = UUID).
--
-- Run in Supabase SQL editor.
-- Safe to run multiple times (IF NOT EXISTS guards).
-- ─────────────────────────────────────────────────────────────────────────────

-- Add user_id column (nullable — anonymous check-ins have no user_id)
ALTER TABLE check_ins
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add display_name so we can show a human-readable name even for anon check-ins
ALTER TABLE check_ins
  ADD COLUMN IF NOT EXISTS display_name TEXT;

-- Index: find all check-ins for a specific user (profile page, regulars)
CREATE INDEX IF NOT EXISTS idx_check_ins_user_id
  ON check_ins(user_id)
  WHERE user_id IS NOT NULL;

-- Index: find today's check-ins by user at a venue (duplicate guard)
CREATE INDEX IF NOT EXISTS idx_check_ins_venue_user
  ON check_ins(venue_id, user_id)
  WHERE user_id IS NOT NULL;

-- Backfill: set display_name = visitor_name for existing rows that are
-- real names (not UUIDs). UUIDs are 36 chars with dashes — skip those.
UPDATE check_ins
SET display_name = visitor_name
WHERE display_name IS NULL
  AND visitor_name IS NOT NULL
  AND length(visitor_name) < 30
  AND visitor_name NOT SIMILAR TO '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
