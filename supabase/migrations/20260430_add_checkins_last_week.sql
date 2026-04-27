-- ═══════════════════════════════════════════════════════════════════════════
-- Phase 5: Add checkins_last_week column for velocity calculation
-- Run this in Supabase → SQL Editor
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Add the column
ALTER TABLE venues ADD COLUMN IF NOT EXISTS checkins_last_week INTEGER DEFAULT 0;

-- 2. Back-fill from existing check_ins data
UPDATE venues v
SET checkins_last_week = (
  SELECT COUNT(*)
  FROM check_ins c
  WHERE c.venue_id = v.id
    AND c.created_at > now() - interval '14 days'
    AND c.created_at <= now() - interval '7 days'
);

-- 3. Update the increment trigger to also maintain checkins_last_week
CREATE OR REPLACE FUNCTION fn_venue_checkin_increment()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  v_today      BIGINT;
  v_week       BIGINT;
  v_last_week  BIGINT;
  v_two_h      BIGINT;
  v_status     text;
BEGIN
  SELECT COUNT(*) INTO v_today
    FROM check_ins
   WHERE venue_id = NEW.venue_id
     AND created_at > now() - interval '24 hours';

  SELECT COUNT(*) INTO v_week
    FROM check_ins
   WHERE venue_id = NEW.venue_id
     AND created_at > now() - interval '7 days';

  SELECT COUNT(*) INTO v_last_week
    FROM check_ins
   WHERE venue_id = NEW.venue_id
     AND created_at > now() - interval '14 days'
     AND created_at <= now() - interval '7 days';

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
    checkin_count       = checkin_count + 1,
    last_checkin_at     = NEW.created_at,
    checkins_today      = v_today,
    checkins_this_week  = v_week,
    checkins_last_week  = v_last_week,
    status              = v_status
  WHERE id = NEW.venue_id;

  RETURN NEW;
END;
$$;
