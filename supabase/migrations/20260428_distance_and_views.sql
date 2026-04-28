-- ─────────────────────────────────────────────────────────────────────────────
-- Distance helper + venue_views tracking
-- Adapted for the `venues` table (Kayaa uses "venues", not "places")
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Haversine distance function ───────────────────────────────────────────
-- Returns distance in kilometres between two WGS-84 coordinate pairs.

CREATE OR REPLACE FUNCTION calculate_distance(
  lat1 FLOAT,
  lng1 FLOAT,
  lat2 FLOAT,
  lng2 FLOAT
)
RETURNS FLOAT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN 6371.0 * acos(
    LEAST(1.0,
      cos(radians(lat1)) *
      cos(radians(lat2)) *
      cos(radians(lng2) - radians(lng1)) +
      sin(radians(lat1)) *
      sin(radians(lat2))
    )
  );
END;
$$;

-- ── 2. Increment check-in counters on venues row ──────────────────────────────

CREATE OR REPLACE FUNCTION increment_checkin_count(p_venue_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE venues
  SET
    checkin_count      = COALESCE(checkin_count, 0) + 1,
    checkins_today     = COALESCE(checkins_today, 0) + 1,
    updated_at         = NOW()
  WHERE id = p_venue_id;
END;
$$;

-- ── 3. venue_views table — tracks page impressions ───────────────────────────

CREATE TABLE IF NOT EXISTS venue_views (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  venue_id   UUID        NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  -- visitor_id is the anonymous UUID stored in localStorage (no auth required)
  visitor_id TEXT,
  viewed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_venue_views_venue_id  ON venue_views(venue_id);
CREATE INDEX IF NOT EXISTS idx_venue_views_viewed_at ON venue_views(viewed_at DESC);

-- RLS: public insert (anonymous page views); no select needed by app
ALTER TABLE venue_views ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'venue_views' AND policyname = 'Anyone can log a view'
  ) THEN
    CREATE POLICY "Anyone can log a view"
      ON venue_views
      FOR INSERT
      TO anon, authenticated
      WITH CHECK (true);
  END IF;
END $$;
