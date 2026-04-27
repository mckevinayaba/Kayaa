-- ═══════════════════════════════════════════════════════════════════════════
-- Phase 4: Update check-in trigger to calculate venue status dynamically
-- Run this in Supabase → SQL Editor
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Add method column to check_ins if it doesn't already exist
--    (Phase 1 migration may have added it; guard with IF NOT EXISTS)
DO $$ BEGIN
  ALTER TABLE check_ins ADD COLUMN IF NOT EXISTS method text DEFAULT 'manual';
EXCEPTION WHEN others THEN NULL;
END $$;

-- 2. Update increment trigger: recalculates today/week counts + status
--    Status = busy (≥10 check-ins in last 2h) | open (≥3) | quiet (else)
CREATE OR REPLACE FUNCTION fn_venue_checkin_increment()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  v_today   BIGINT;
  v_week    BIGINT;
  v_two_h   BIGINT;
  v_status  text;
BEGIN
  -- Count check-ins in windows (include the new row via +1 offset)
  SELECT COUNT(*) INTO v_today
    FROM check_ins
   WHERE venue_id = NEW.venue_id
     AND created_at > now() - interval '24 hours';

  SELECT COUNT(*) INTO v_week
    FROM check_ins
   WHERE venue_id = NEW.venue_id
     AND created_at > now() - interval '7 days';

  SELECT COUNT(*) INTO v_two_h
    FROM check_ins
   WHERE venue_id = NEW.venue_id
     AND created_at > now() - interval '2 hours';

  v_status := CASE
    WHEN v_two_h >= 10 THEN 'busy'
    WHEN v_two_h >= 3  THEN 'open'
    ELSE                    'quiet'
  END;

  UPDATE venues SET
    checkin_count      = checkin_count + 1,
    last_checkin_at    = NEW.created_at,
    checkins_today     = v_today,
    checkins_this_week = v_week,
    status             = v_status
  WHERE id = NEW.venue_id;

  RETURN NEW;
END;
$$;

-- 3. Update track_regular: safe for anonymous check-ins (NULL user_id)
--    Marks user as regular at 5+ visits; updates venues.regulars_count
CREATE OR REPLACE FUNCTION fn_track_regular()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  v_count INT;
BEGIN
  -- Anonymous check-ins (no user_id) still update venue metrics via
  -- fn_venue_checkin_increment; skip the regulars table.
  IF NEW.user_id IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO user_place_regulars (user_id, venue_id, visit_count, first_visit_at, last_visit_at)
  VALUES (NEW.user_id, NEW.venue_id, 1, now(), now())
  ON CONFLICT (user_id, venue_id) DO UPDATE SET
    visit_count   = user_place_regulars.visit_count + 1,
    last_visit_at = now();

  SELECT visit_count INTO v_count
    FROM user_place_regulars
   WHERE user_id = NEW.user_id AND venue_id = NEW.venue_id;

  -- At exactly 5 visits: flip is_regular and recalculate venue total
  IF v_count >= 5 THEN
    UPDATE user_place_regulars
       SET is_regular = true
     WHERE user_id = NEW.user_id
       AND venue_id = NEW.venue_id
       AND is_regular = false;

    UPDATE venues
       SET regulars_count = (
         SELECT COUNT(*) FROM user_place_regulars
          WHERE venue_id = NEW.venue_id AND is_regular = true
       )
     WHERE id = NEW.venue_id;
  END IF;

  RETURN NEW;
END;
$$;

-- 4. Ensure triggers exist on check_ins (idempotent)
DROP TRIGGER IF EXISTS trg_venue_checkin_increment ON check_ins;
CREATE TRIGGER trg_venue_checkin_increment
  AFTER INSERT ON check_ins
  FOR EACH ROW EXECUTE FUNCTION fn_venue_checkin_increment();

DROP TRIGGER IF EXISTS trg_track_regular ON check_ins;
CREATE TRIGGER trg_track_regular
  AFTER INSERT ON check_ins
  FOR EACH ROW EXECUTE FUNCTION fn_track_regular();
