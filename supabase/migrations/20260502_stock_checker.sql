-- ─────────────────────────────────────────────────────────────────────────────
-- Phase 7 Task 1: "Is It In Stock?" — community stock tracking for spazas
-- Uses visitor_id (TEXT, anonymous) — no FK to auth users.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Stock items table ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS stock_items (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  place_id     TEXT        NOT NULL,
  place_name   TEXT        NOT NULL DEFAULT '',
  place_emoji  TEXT        NOT NULL DEFAULT '🏪',
  item_name    TEXT        NOT NULL,
  category     TEXT        NOT NULL DEFAULT 'other'
                           CHECK (category IN ('groceries','electricity','airtime','household','fresh','other')),
  in_stock     BOOLEAN     NOT NULL DEFAULT true,
  price        NUMERIC(8,2),
  updated_by   TEXT        NOT NULL,   -- visitor_id
  last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (place_id, item_name)
);

CREATE INDEX IF NOT EXISTS stock_items_place_id_idx     ON stock_items(place_id);
CREATE INDEX IF NOT EXISTS stock_items_item_name_idx    ON stock_items USING gin(to_tsvector('english', item_name));
CREATE INDEX IF NOT EXISTS stock_items_last_updated_idx ON stock_items(last_updated DESC);
CREATE INDEX IF NOT EXISTS stock_items_in_stock_idx     ON stock_items(in_stock);

ALTER TABLE stock_items ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "si_select" ON stock_items FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "si_insert" ON stock_items FOR INSERT WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "si_update" ON stock_items FOR UPDATE USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 2. Search analytics table ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS stock_searches (
  item_name TEXT NOT NULL,
  area      TEXT NOT NULL DEFAULT '',
  count     INTEGER NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (item_name, area)
);

ALTER TABLE stock_searches ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "ss_select" ON stock_searches FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "ss_insert" ON stock_searches FOR INSERT WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "ss_update" ON stock_searches FOR UPDATE USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 3. Nearby-stock search function ──────────────────────────────────────────
-- Returns stock items within max_distance_km using venue GPS coordinates.
-- Falls back gracefully if venues table has no lat/lon columns.

CREATE OR REPLACE FUNCTION search_nearby_stock(
  search_item     TEXT,
  user_lat        FLOAT,
  user_lng        FLOAT,
  max_distance_km FLOAT DEFAULT 5
)
RETURNS TABLE (
  id            UUID,
  place_id      TEXT,
  place_name    TEXT,
  place_emoji   TEXT,
  item_name     TEXT,
  category      TEXT,
  in_stock      BOOLEAN,
  price         NUMERIC,
  last_updated  TIMESTAMPTZ,
  updated_by    TEXT,
  distance_km   FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    si.id,
    si.place_id,
    si.place_name,
    si.place_emoji,
    si.item_name,
    si.category,
    si.in_stock,
    si.price,
    si.last_updated,
    si.updated_by,
    -- Haversine approximation
    ROUND((
      6371 * acos(
        LEAST(1.0, cos(radians(user_lat))
          * cos(radians(COALESCE(v.latitude, user_lat)))
          * cos(radians(COALESCE(v.longitude, user_lng)) - radians(user_lng))
          + sin(radians(user_lat))
          * sin(radians(COALESCE(v.latitude, user_lat)))
      )
    )::NUMERIC, 2)::FLOAT AS distance_km
  FROM stock_items si
  LEFT JOIN venues v ON v.id::TEXT = si.place_id
  WHERE si.item_name ILIKE '%' || search_item || '%'
    AND (
      v.id IS NULL   -- venue GPS unknown → include anyway
      OR (
        6371 * acos(
          LEAST(1.0, cos(radians(user_lat))
            * cos(radians(COALESCE(v.latitude, user_lat)))
            * cos(radians(COALESCE(v.longitude, user_lng)) - radians(user_lng))
            + sin(radians(user_lat))
            * sin(radians(COALESCE(v.latitude, user_lat)))
          )
        ) <= max_distance_km
      )
    )
  ORDER BY distance_km ASC, si.last_updated DESC
  LIMIT 20;
END;
$$;

-- ── 4. Seed popular items for demo venues ────────────────────────────────────

INSERT INTO stock_items (place_id, place_name, place_emoji, item_name, category, in_stock, price, updated_by)
SELECT
  v.id::TEXT,
  v.name,
  CASE v.category
    WHEN 'Spaza Shop'    THEN '🏪'
    WHEN 'Shisanyama'   THEN '🔥'
    WHEN 'Café'         THEN '☕'
    ELSE '🏬'
  END,
  items.item_name,
  items.category,
  (RANDOM() > 0.25),   -- 75% chance in stock
  CASE items.item_name
    WHEN 'Bread'              THEN ROUND((13 + RANDOM() * 5)::NUMERIC, 2)
    WHEN 'Milk'               THEN ROUND((18 + RANDOM() * 4)::NUMERIC, 2)
    WHEN 'Eggs'               THEN ROUND((35 + RANDOM() * 10)::NUMERIC, 2)
    WHEN 'Rice'               THEN ROUND((25 + RANDOM() * 15)::NUMERIC, 2)
    WHEN 'Cooking Oil'        THEN ROUND((45 + RANDOM() * 20)::NUMERIC, 2)
    WHEN 'Prepaid Electricity' THEN NULL
    ELSE NULL
  END,
  'seed'
FROM venues v
CROSS JOIN (
  VALUES
    ('Bread',              'groceries'),
    ('Milk',               'groceries'),
    ('Eggs',               'fresh'),
    ('Rice',               'groceries'),
    ('Cooking Oil',        'groceries'),
    ('Toilet Paper',       'household'),
    ('Prepaid Electricity','electricity'),
    ('Airtime',            'airtime')
) AS items(item_name, category)
WHERE v.category IN ('Spaza Shop','Shisanyama','Café','Home Business')
  AND RANDOM() < 0.6   -- 60% of matching venues get seeded
ON CONFLICT (place_id, item_name) DO NOTHING;
