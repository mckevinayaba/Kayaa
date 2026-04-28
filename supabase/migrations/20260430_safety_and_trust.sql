-- ─────────────────────────────────────────────────────────────────────────────
-- Phase 6: Safety & Trust — reports + place safety ratings
-- Uses visitor_id (TEXT, anonymous localStorage UUID) — no FK to auth users.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Reports ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS reports (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_id  TEXT        NOT NULL,                 -- visitor_id
  content_type TEXT        NOT NULL
                           CHECK (content_type IN ('place','post','comment','user','skill')),
  content_id   TEXT        NOT NULL,
  reason       TEXT        NOT NULL,
  description  TEXT,
  status       TEXT        NOT NULL DEFAULT 'pending'
                           CHECK (status IN ('pending','reviewed','resolved','dismissed')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS reports_content_idx   ON reports(content_type, content_id);
CREATE INDEX IF NOT EXISTS reports_status_idx    ON reports(status);
CREATE INDEX IF NOT EXISTS reports_created_at_idx ON reports(created_at DESC);

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "reports_select" ON reports FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "reports_insert" ON reports FOR INSERT WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 2. Place safety ratings ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS place_safety_ratings (
  place_id    TEXT NOT NULL,
  visitor_id  TEXT NOT NULL,
  score       SMALLINT NOT NULL CHECK (score BETWEEN 1 AND 5),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (place_id, visitor_id)
);

CREATE INDEX IF NOT EXISTS place_safety_ratings_place_id_idx ON place_safety_ratings(place_id);

ALTER TABLE place_safety_ratings ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "psr_select" ON place_safety_ratings FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "psr_insert" ON place_safety_ratings FOR INSERT WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "psr_update" ON place_safety_ratings FOR UPDATE USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 3. Convenience view: avg safety score per place ──────────────────────────

CREATE OR REPLACE VIEW place_safety_summary AS
SELECT
  place_id,
  ROUND(AVG(score)::NUMERIC, 2) AS avg_score,
  COUNT(*)                      AS review_count
FROM place_safety_ratings
GROUP BY place_id;

-- ── 4. Safety check-ins (anonymous "let family know I'm here") ────────────────

CREATE TABLE IF NOT EXISTS safety_checkins (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  visitor_id    TEXT        NOT NULL,
  place_id      TEXT        NOT NULL,
  place_name    TEXT        NOT NULL,
  contact_count INTEGER     NOT NULL DEFAULT 1,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS safety_checkins_visitor_id_idx ON safety_checkins(visitor_id);
CREATE INDEX IF NOT EXISTS safety_checkins_place_id_idx   ON safety_checkins(place_id);
CREATE INDEX IF NOT EXISTS safety_checkins_created_at_idx ON safety_checkins(created_at DESC);

ALTER TABLE safety_checkins ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "sc_select" ON safety_checkins FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "sc_insert" ON safety_checkins FOR INSERT WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
