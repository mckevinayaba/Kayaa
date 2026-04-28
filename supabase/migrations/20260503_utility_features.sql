-- ─────────────────────────────────────────────────────────────────────────────
-- Phase 7 Tasks 6-9: Utility feature tables
--   • queue_status      (community wait-time reporting)
--   • water_outages     (scheduled / active water interruptions)
--   • community_events  (local happenings)
--   • event_attendees   (RSVP join table)
--   • taxi_routes       (informal route info)
--
-- NOTE: stock_items + stock_searches were created in 20260502_stock_checker.sql
--       This migration skips those to avoid duplicate-table errors.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Queue status ───────────────────────────────────────────────────────────
--   Updated by any visitor (visitor_id TEXT, no FK) — same pattern as stock_items.

CREATE TABLE IF NOT EXISTS queue_status (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  name         TEXT        NOT NULL,
  type         TEXT        NOT NULL
                           CHECK (type IN (
                             'home_affairs','clinic','police_station',
                             'atm','post_office','sassa','other'
                           )),
  location     TEXT,
  lat          FLOAT,
  lng          FLOAT,
  current_wait INTEGER     NOT NULL DEFAULT 0,   -- minutes
  queue_length INTEGER     NOT NULL DEFAULT 0,   -- people
  trend        TEXT        NOT NULL DEFAULT 'stable'
                           CHECK (trend IN ('increasing','decreasing','stable')),
  last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by   TEXT        NOT NULL DEFAULT 'unknown',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS queue_status_type_idx ON queue_status(type);
CREATE INDEX IF NOT EXISTS queue_status_updated_idx ON queue_status(last_updated DESC);

ALTER TABLE queue_status ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "qs_select" ON queue_status FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "qs_insert" ON queue_status FOR INSERT WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "qs_update" ON queue_status FOR UPDATE USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 2. Water outages ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS water_outages (
  id             UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  affected_areas TEXT[]      NOT NULL,
  start_time     TIMESTAMPTZ NOT NULL,
  end_time       TIMESTAMPTZ NOT NULL,
  reason         TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS water_outages_time_idx  ON water_outages(start_time, end_time);
CREATE INDEX IF NOT EXISTS water_outages_areas_idx ON water_outages USING gin(affected_areas);

ALTER TABLE water_outages ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "wo_select" ON water_outages FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "wo_insert" ON water_outages FOR INSERT WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 3. Community events ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS community_events (
  id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  title            TEXT        NOT NULL,
  description      TEXT,
  type             TEXT        NOT NULL DEFAULT 'other'
                               CHECK (type IN ('church','sports','community','stokvels','kids','other')),
  location         TEXT        NOT NULL,
  lat              FLOAT,
  lng              FLOAT,
  start_time       TIMESTAMPTZ NOT NULL,
  end_time         TIMESTAMPTZ NOT NULL,
  organizer_id     TEXT,                    -- visitor_id or user UUID as text
  attendees_count  INTEGER     NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS community_events_time_idx ON community_events(start_time);
CREATE INDEX IF NOT EXISTS community_events_type_idx ON community_events(type);

ALTER TABLE community_events ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "ce_select" ON community_events FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "ce_insert" ON community_events FOR INSERT WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "ce_update" ON community_events FOR UPDATE USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 4. Event attendees (RSVP join table) ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS event_attendees (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id   UUID        NOT NULL REFERENCES community_events(id) ON DELETE CASCADE,
  visitor_id TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (event_id, visitor_id)
);

CREATE INDEX IF NOT EXISTS event_attendees_event_idx ON event_attendees(event_id);

ALTER TABLE event_attendees ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "ea_select" ON event_attendees FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "ea_insert" ON event_attendees FOR INSERT WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "ea_delete" ON event_attendees FOR DELETE USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 5. Attendees count trigger ────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_event_attendees_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE community_events
    SET attendees_count = attendees_count + 1
    WHERE id = NEW.event_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE community_events
    SET attendees_count = GREATEST(attendees_count - 1, 0)
    WHERE id = OLD.event_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_event_attendees_count ON event_attendees;
CREATE TRIGGER trg_event_attendees_count
AFTER INSERT OR DELETE ON event_attendees
FOR EACH ROW EXECUTE FUNCTION update_event_attendees_count();

-- ── 6. Taxi routes ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS taxi_routes (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  route_name    TEXT        NOT NULL,
  from_location TEXT        NOT NULL,
  to_location   TEXT        NOT NULL,
  fare          NUMERIC(8,2),
  active        BOOLEAN     NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE taxi_routes ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "tr_select" ON taxi_routes FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 7. Board posts quick-question flag ───────────────────────────────────────

ALTER TABLE board_posts
  ADD COLUMN IF NOT EXISTS is_quick_question BOOLEAN NOT NULL DEFAULT false;

-- ── 8. Seed: queue status ──────────────────────────────────────────────────────

INSERT INTO queue_status (name, type, location, current_wait, queue_length, trend, updated_by)
VALUES
  ('Randburg Home Affairs',       'home_affairs',    'Randburg CBD',      45, 23, 'stable',     'seed'),
  ('Ferndale Clinic',             'clinic',          'Ferndale',          25, 12, 'decreasing', 'seed'),
  ('Northcliff Police Station',   'police_station',  'Northcliff',        15,  5, 'stable',     'seed'),
  ('FNB ATM – Malibongwe Drive',  'atm',             'Malibongwe Drive',   5,  2, 'stable',     'seed'),
  ('Randburg SASSA Office',       'sassa',           'Randburg',          60, 34, 'increasing', 'seed'),
  ('Randburg Post Office',        'post_office',     'Randburg CBD',      20,  8, 'stable',     'seed')
ON CONFLICT DO NOTHING;

-- ── 9. Seed: water outages ────────────────────────────────────────────────────

INSERT INTO water_outages (affected_areas, start_time, end_time, reason)
VALUES (
  ARRAY['Northcliff', 'Fairland'],
  NOW() + INTERVAL '2 days',
  NOW() + INTERVAL '2 days 4 hours',
  'Scheduled maintenance on main pipeline'
)
ON CONFLICT DO NOTHING;

-- ── 10. Seed: community events ────────────────────────────────────────────────

INSERT INTO community_events (title, description, type, location, start_time, end_time, attendees_count)
VALUES
  (
    'Sunday Service',
    'Join us for worship and fellowship',
    'church',
    'Grace Community Church, Ferndale',
    DATE_TRUNC('day', NOW() + INTERVAL '3 days') + TIME '09:00',
    DATE_TRUNC('day', NOW() + INTERVAL '3 days') + TIME '11:00',
    45
  ),
  (
    'Community Cleanup',
    'Let''s clean up our neighbourhood together',
    'community',
    'Northcliff Ridge Park',
    DATE_TRUNC('day', NOW() + INTERVAL '5 days') + TIME '08:00',
    DATE_TRUNC('day', NOW() + INTERVAL '5 days') + TIME '12:00',
    12
  ),
  (
    'Youth Soccer Tournament',
    'Under-15 tournament — all teams welcome',
    'sports',
    'Randburg Sports Ground',
    DATE_TRUNC('day', NOW() + INTERVAL '1 day') + TIME '14:00',
    DATE_TRUNC('day', NOW() + INTERVAL '1 day') + TIME '18:00',
    67
  ),
  (
    'Stokvel Monthly Meeting',
    'Malibongwe Stokvel members meeting and payout',
    'stokvels',
    'Mama Joyce''s House, Ferndale',
    DATE_TRUNC('day', NOW() + INTERVAL '7 days') + TIME '18:00',
    DATE_TRUNC('day', NOW() + INTERVAL '7 days') + TIME '20:00',
    15
  ),
  (
    'Kids Story Time',
    'Free storytime session for children under 10',
    'kids',
    'Randburg Public Library',
    DATE_TRUNC('day', NOW() + INTERVAL '2 days') + TIME '10:00',
    DATE_TRUNC('day', NOW() + INTERVAL '2 days') + TIME '11:30',
    22
  )
ON CONFLICT DO NOTHING;

-- ── 11. Seed: taxi routes ─────────────────────────────────────────────────────

INSERT INTO taxi_routes (route_name, from_location, to_location, fare)
VALUES
  ('Randburg → Sandton',     'Randburg Taxi Rank',  'Sandton City',          15.00),
  ('Randburg → Joburg CBD',  'Randburg Taxi Rank',  'Park Station',          20.00),
  ('Ferndale → Northcliff',  'Ferndale Mall',       'Northcliff Corner',      8.00),
  ('Randburg → Soweto',      'Randburg Taxi Rank',  'Baragwanath Terminus',  25.00),
  ('Randburg → Midrand',     'Randburg Taxi Rank',  'Midrand Taxi Rank',     20.00)
ON CONFLICT DO NOTHING;
