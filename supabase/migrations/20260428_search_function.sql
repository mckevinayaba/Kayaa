-- ============================================================
--  Full-text / fuzzy neighbourhood search
--  Paste this into Supabase → SQL Editor and run.
-- ============================================================

-- pg_trgm gives us similarity() and the % operator for fuzzy matching.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ── Helper: category → emoji ─────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION venue_category_emoji(cat TEXT)
RETURNS TEXT LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE cat
    WHEN 'Barbershop'    THEN '✂️'
    WHEN 'Shisanyama'    THEN '🔥'
    WHEN 'Tavern'        THEN '🍺'
    WHEN 'Café'          THEN '☕'
    WHEN 'Church'        THEN '⛪'
    WHEN 'Carwash'       THEN '🚗'
    WHEN 'Spaza Shop'    THEN '🏪'
    WHEN 'Salon'         THEN '💅'
    WHEN 'Tutoring'      THEN '📚'
    WHEN 'Sports Ground' THEN '⚽'
    WHEN 'Home Business' THEN '🏠'
    ELSE '📍'
  END;
$$;

-- ── Helper: pure-SQL haversine distance (km) ─────────────────────────────────
--  Avoids a hard PostGIS dependency while remaining accurate within ~0.1 %.
CREATE OR REPLACE FUNCTION haversine_km(
  lat1 FLOAT, lng1 FLOAT,
  lat2 FLOAT, lng2 FLOAT
)
RETURNS FLOAT LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  R    CONSTANT FLOAT := 6371;
  dlat FLOAT := radians(lat2 - lat1);
  dlng FLOAT := radians(lng2 - lng1);
  a    FLOAT;
BEGIN
  a := sin(dlat/2)^2
     + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlng/2)^2;
  RETURN R * 2 * atan2(sqrt(a), sqrt(1 - a));
END;
$$;

-- ── Main search function ──────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION search_neighbourhood(
  search_query    TEXT,
  user_lat        FLOAT   DEFAULT NULL,
  user_lng        FLOAT   DEFAULT NULL,
  max_distance_km FLOAT   DEFAULT 10
)
RETURNS TABLE (
  id        TEXT,
  type      TEXT,
  title     TEXT,
  subtitle  TEXT,
  icon      TEXT,
  badges    TEXT[],
  distance  TEXT,
  status    TEXT,
  relevance FLOAT
)
LANGUAGE plpgsql AS $$
BEGIN
  -- Lower the trigram threshold slightly for short / abbreviated words
  PERFORM set_limit(0.2);

  RETURN QUERY
  WITH scored AS (

    -- ── Venues ───────────────────────────────────────────────────────────────
    SELECT
      v.id::TEXT,
      'place'::TEXT                                             AS type,
      v.name                                                    AS title,
      (v.type || ' · ' || SPLIT_PART(v.location, ',', 1))      AS subtitle,
      venue_category_emoji(v.type)                              AS icon,
      CASE
        WHEN v.is_verified AND (v.checkins_today > 5)
          THEN ARRAY['✓ Verified', v.checkins_today::TEXT || ' today']
        WHEN v.is_verified
          THEN ARRAY['✓ Verified']
        WHEN v.checkins_today > 5
          THEN ARRAY[v.checkins_today::TEXT || ' today']
        ELSE ARRAY[]::TEXT[]
      END                                                       AS badges,
      CASE
        WHEN user_lat IS NOT NULL
         AND user_lng IS NOT NULL
         AND v.latitude  IS NOT NULL
         AND v.longitude IS NOT NULL
          THEN ROUND(
                 haversine_km(user_lat, user_lng, v.latitude, v.longitude)::NUMERIC,
                 1
               )::TEXT || ' km'
        ELSE NULL
      END                                                       AS distance,
      COALESCE(v.status, 'open')                                AS status,
      (
        similarity(v.name,                       search_query) * 4
      + similarity(v.type,                       search_query) * 2
      + similarity(COALESCE(v.description, ''), search_query)
      + similarity(SPLIT_PART(v.location,',',1), search_query)
      + CASE WHEN v.name  ILIKE '%' || search_query || '%' THEN 1.5 ELSE 0 END
      + CASE WHEN v.type  ILIKE '%' || search_query || '%' THEN 0.8 ELSE 0 END
      )::FLOAT                                                  AS relevance
    FROM venues v
    WHERE
      (     v.name        ILIKE '%' || search_query || '%'
        OR  v.type        ILIKE '%' || search_query || '%'
        OR  v.location    ILIKE '%' || search_query || '%'
        OR  v.description ILIKE '%' || search_query || '%'
        OR  v.name  % search_query
        OR  v.type  % search_query
      )
      AND LENGTH(COALESCE(v.description,'')) >= 10
      -- Geo filter: skip if user coords given but venue is too far
      AND (
            user_lat  IS NULL OR user_lng  IS NULL
         OR v.latitude IS NULL OR v.longitude IS NULL
         OR haversine_km(user_lat, user_lng, v.latitude, v.longitude)
              <= max_distance_km
      )

    UNION ALL

    -- ── Board posts (announcements, tips, events, lost & found …) ────────────
    SELECT
      bp.id::TEXT,
      'post'::TEXT                                                    AS type,
      bp.title                                                        AS title,
      (INITCAP(REPLACE(bp.category, '_', ' ')) || ' · ' || bp.neighbourhood)
                                                                      AS subtitle,
      CASE bp.category
        WHEN 'announcement'   THEN '📢'
        WHEN 'lost_found'     THEN '🔍'
        WHEN 'recommendation' THEN '💡'
        WHEN 'event'          THEN '📅'
        WHEN 'question'       THEN '❓'
        ELSE '💬'
      END                                                             AS icon,
      ARRAY[]::TEXT[]                                                 AS badges,
      NULL::TEXT                                                      AS distance,
      NULL::TEXT                                                      AS status,
      (
        similarity(bp.title,                      search_query) * 4
      + similarity(COALESCE(bp.content, ''),      search_query)
      + CASE WHEN bp.title ILIKE '%' || search_query || '%' THEN 1.5 ELSE 0 END
      )::FLOAT                                                        AS relevance
    FROM board_posts bp
    WHERE
      bp.status = 'active'
      AND (    bp.title   ILIKE '%' || search_query || '%'
           OR  bp.content ILIKE '%' || search_query || '%'
           OR  bp.title   % search_query
          )

  )
  SELECT *
  FROM   scored
  WHERE  relevance > 0.08
  ORDER  BY relevance DESC
  LIMIT  20;
END;
$$;

-- ── Trigram indexes (speeds up similarity + ILIKE queries) ───────────────────
CREATE INDEX IF NOT EXISTS idx_venues_name_trgm
  ON venues USING gin (name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_venues_type_trgm
  ON venues USING gin (type gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_venues_location_trgm
  ON venues USING gin (location gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_board_posts_title_trgm
  ON board_posts USING gin (title gin_trgm_ops);

-- ── Grant execute to authenticated + anon roles ───────────────────────────────
GRANT EXECUTE ON FUNCTION search_neighbourhood(TEXT, FLOAT, FLOAT, FLOAT)
  TO anon, authenticated;
