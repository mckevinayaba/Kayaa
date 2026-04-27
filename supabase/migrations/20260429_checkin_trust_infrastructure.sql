-- ════════════════════════════════════════════════════════════════
-- PHASE 1: Check-in and Trust Infrastructure
-- Venues table uses: location (not neighbourhood), regulars_count already exists
-- Check_ins table uses: venue_id (not place_id), no user_id originally
-- ════════════════════════════════════════════════════════════════

-- 1. Add missing columns to venues
ALTER TABLE venues ADD COLUMN IF NOT EXISTS checkin_count       integer     NOT NULL DEFAULT 0;
ALTER TABLE venues ADD COLUMN IF NOT EXISTS checkins_today      integer     NOT NULL DEFAULT 0;
ALTER TABLE venues ADD COLUMN IF NOT EXISTS checkins_this_week  integer     NOT NULL DEFAULT 0;
ALTER TABLE venues ADD COLUMN IF NOT EXISTS last_checkin_at     timestamptz;
ALTER TABLE venues ADD COLUMN IF NOT EXISTS status              text        NOT NULL DEFAULT 'open';

-- 2. Add missing columns to existing check_ins table
ALTER TABLE check_ins ADD COLUMN IF NOT EXISTS user_id      uuid    REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE check_ins ADD COLUMN IF NOT EXISTS method       text    NOT NULL DEFAULT 'manual';
ALTER TABLE check_ins ADD COLUMN IF NOT EXISTS trust_weight decimal NOT NULL DEFAULT 1.0;

-- 3. Create user_place_regulars table
CREATE TABLE IF NOT EXISTS user_place_regulars (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  venue_id       uuid        NOT NULL REFERENCES venues(id)     ON DELETE CASCADE,
  visit_count    integer     NOT NULL DEFAULT 0,
  first_visit_at timestamptz,
  last_visit_at  timestamptz,
  is_regular     boolean     NOT NULL DEFAULT false,
  UNIQUE (user_id, venue_id)
);

ALTER TABLE user_place_regulars ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "regulars_select" ON user_place_regulars FOR SELECT USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "regulars_insert" ON user_place_regulars FOR INSERT WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "regulars_update" ON user_place_regulars FOR UPDATE USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 4. Indexes
CREATE INDEX IF NOT EXISTS idx_checkins_venue_id   ON check_ins (venue_id);
CREATE INDEX IF NOT EXISTS idx_checkins_created_at ON check_ins (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_regulars_venue ON user_place_regulars (venue_id);
CREATE INDEX IF NOT EXISTS idx_venues_location     ON venues (location);

-- 5. Trigger: increment venues.checkin_count on each new check-in
CREATE OR REPLACE FUNCTION fn_venue_checkin_increment() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  UPDATE venues SET
    checkin_count   = checkin_count + 1,
    last_checkin_at = NEW.created_at
  WHERE id = NEW.venue_id;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_venue_checkin_increment ON check_ins;
CREATE TRIGGER trg_venue_checkin_increment
  AFTER INSERT ON check_ins
  FOR EACH ROW EXECUTE FUNCTION fn_venue_checkin_increment();

-- 6. Trigger: track regulars when user_id is present
CREATE OR REPLACE FUNCTION fn_track_regular() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO user_place_regulars (user_id, venue_id, visit_count, first_visit_at, last_visit_at)
  VALUES (NEW.user_id, NEW.venue_id, 1, NEW.created_at, NEW.created_at)
  ON CONFLICT (user_id, venue_id) DO UPDATE SET
    visit_count   = user_place_regulars.visit_count + 1,
    last_visit_at = NEW.created_at,
    is_regular    = (user_place_regulars.visit_count + 1) >= 5;

  UPDATE venues SET
    regulars_count = (
      SELECT COUNT(*) FROM user_place_regulars
      WHERE venue_id = NEW.venue_id AND is_regular = true
    )
  WHERE id = NEW.venue_id;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_track_regular ON check_ins;
CREATE TRIGGER trg_track_regular
  AFTER INSERT ON check_ins
  FOR EACH ROW
  WHEN (NEW.user_id IS NOT NULL)
  EXECUTE FUNCTION fn_track_regular();
