-- ═══════════════════════════════════════════════════════════════════════════
-- Phase 5b: Performance indexes + daily metrics precompute function
-- Run this in Supabase → SQL Editor
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Indexes on venues table
--    Column names match the actual prod schema (type, location, etc.)

CREATE INDEX IF NOT EXISTS idx_venues_status
  ON venues(status);

CREATE INDEX IF NOT EXISTS idx_venues_type_status
  ON venues(type, status);

CREATE INDEX IF NOT EXISTS idx_venues_regulars_count
  ON venues(regulars_count DESC);

CREATE INDEX IF NOT EXISTS idx_venues_checkins_today
  ON venues(checkins_today DESC);

CREATE INDEX IF NOT EXISTS idx_venues_last_checkin
  ON venues(last_checkin_at DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_venues_checkins_this_week
  ON venues(checkins_this_week DESC);

CREATE INDEX IF NOT EXISTS idx_venues_created_at
  ON venues(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_venues_is_active
  ON venues(is_active) WHERE is_active = true;

-- 2. Indexes on check_ins table

CREATE INDEX IF NOT EXISTS idx_check_ins_venue_created
  ON check_ins(venue_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_check_ins_recent
  ON check_ins(created_at DESC)
  WHERE created_at > NOW() - INTERVAL '7 days';

CREATE INDEX IF NOT EXISTS idx_check_ins_visitor
  ON check_ins(visitor_name, venue_id);

-- 3. Daily metrics precompute function
--    Call this from a scheduled job or run manually each day.
--    In Supabase: use pg_cron or call via Edge Function cron.
--
--    To schedule with pg_cron (if enabled):
--      SELECT cron.schedule('update-daily-metrics', '0 3 * * *', 'SELECT update_daily_metrics()');

CREATE OR REPLACE FUNCTION update_daily_metrics()
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  -- Refresh today's check-in count from actual rows
  UPDATE venues v
  SET checkins_today = (
    SELECT COUNT(*)
    FROM check_ins c
    WHERE c.venue_id = v.id
      AND c.created_at > CURRENT_DATE
  );

  -- Refresh this week's count
  UPDATE venues v
  SET checkins_this_week = (
    SELECT COUNT(*)
    FROM check_ins c
    WHERE c.venue_id = v.id
      AND c.created_at > NOW() - INTERVAL '7 days'
  );

  -- Refresh last week's count (7-14 days ago window)
  UPDATE venues v
  SET checkins_last_week = (
    SELECT COUNT(*)
    FROM check_ins c
    WHERE c.venue_id = v.id
      AND c.created_at > NOW() - INTERVAL '14 days'
      AND c.created_at <= NOW() - INTERVAL '7 days'
  );

  -- Refresh regulars count from user_place_regulars (if table exists)
  BEGIN
    UPDATE venues v
    SET regulars_count = (
      SELECT COUNT(*)
      FROM user_place_regulars upr
      WHERE upr.venue_id = v.id
        AND upr.is_regular = true
    );
  EXCEPTION WHEN undefined_table THEN
    -- user_place_regulars not yet created; skip
    NULL;
  END;

  -- Update status based on last 2-hour activity
  UPDATE venues v
  SET status = CASE
    WHEN (
      SELECT COUNT(*) FROM check_ins c
      WHERE c.venue_id = v.id
        AND c.created_at > NOW() - INTERVAL '2 hours'
    ) >= 10 THEN 'busy'
    WHEN (
      SELECT COUNT(*) FROM check_ins c
      WHERE c.venue_id = v.id
        AND c.created_at > NOW() - INTERVAL '2 hours'
    ) >= 3 THEN 'open'
    WHEN status != 'closed' THEN 'quiet'
    ELSE status
  END
  WHERE is_active = true;
END;
$$;
