-- ─────────────────────────────────────────────────────────────────────────────
-- Phase 8: Venue Dashboard support columns & tables
--
-- Ownership model: venues ← venue_owners (venue_id, user_id) — already exists.
-- This migration adds optional convenience columns + venue_updates table.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Venues: optional dashboard columns ────────────────────────────────────

-- opening_hours is stored as a JSON string (structured week schedule)
ALTER TABLE venues
  ADD COLUMN IF NOT EXISTS opening_hours TEXT;

-- is_claimed: true once an owner has logged in and taken ownership
ALTER TABLE venues
  ADD COLUMN IF NOT EXISTS is_claimed BOOLEAN NOT NULL DEFAULT false;

-- boost_until: set when a venue has paid for feed boost
ALTER TABLE venues
  ADD COLUMN IF NOT EXISTS boost_until TIMESTAMPTZ;

-- ── 2. Venue updates (specials, news, announcements from owners) ─────────────

CREATE TABLE IF NOT EXISTS venue_updates (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  venue_id    UUID        NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  title       TEXT        NOT NULL,
  content     TEXT,
  type        TEXT        NOT NULL DEFAULT 'general'
                          CHECK (type IN ('general','special','menu','event','announcement')),
  image_url   TEXT,
  expires_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS venue_updates_venue_idx      ON venue_updates(venue_id);
CREATE INDEX IF NOT EXISTS venue_updates_created_idx    ON venue_updates(created_at DESC);
CREATE INDEX IF NOT EXISTS venue_updates_expires_idx    ON venue_updates(expires_at);

ALTER TABLE venue_updates ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "vu_public_select" ON venue_updates FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "vu_owner_insert" ON venue_updates FOR INSERT
    WITH CHECK (
      venue_id IN (
        SELECT venue_id FROM venue_owners WHERE user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "vu_owner_update" ON venue_updates FOR UPDATE
    USING (
      venue_id IN (
        SELECT venue_id FROM venue_owners WHERE user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "vu_owner_delete" ON venue_updates FOR DELETE
    USING (
      venue_id IN (
        SELECT venue_id FROM venue_owners WHERE user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 3. Index: boosted venues (feed ranking) ───────────────────────────────────

CREATE INDEX IF NOT EXISTS venues_boost_until_idx ON venues(boost_until)
  WHERE boost_until IS NOT NULL;

-- ── 4. Auto-mark claimed when owner links via venue_owners ───────────────────
-- Trigger: when a user_id is written to venue_owners, mark the venue as claimed.

CREATE OR REPLACE FUNCTION mark_venue_claimed()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.user_id IS NOT NULL THEN
    UPDATE venues SET is_claimed = true WHERE id = NEW.venue_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_mark_venue_claimed ON venue_owners;
CREATE TRIGGER trg_mark_venue_claimed
AFTER INSERT OR UPDATE OF user_id ON venue_owners
FOR EACH ROW EXECUTE FUNCTION mark_venue_claimed();
