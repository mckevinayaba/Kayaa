-- ─────────────────────────────────────────────────────────────────────────────
-- Phase 6 extended: place verifications, blocked visitors,
-- load shedding schedules/subscriptions
-- Uses visitor_id (TEXT, anonymous) — no FK to auth users or places table.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Place verifications ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS place_verifications (
  id                UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  place_id          TEXT        NOT NULL UNIQUE,   -- venue id (TEXT, matches venues.id cast)
  verification_type TEXT        NOT NULL
                                CHECK (verification_type IN ('verified','recommended','trusted')),
  verified_by       TEXT,                          -- admin visitor_id or 'system'
  verified_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes             TEXT
);

CREATE INDEX IF NOT EXISTS place_verifications_place_id_idx ON place_verifications(place_id);

ALTER TABLE place_verifications ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "pv_select" ON place_verifications FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "pv_insert" ON place_verifications FOR INSERT WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 2. Blocked visitors (anonymous block list) ────────────────────────────────

CREATE TABLE IF NOT EXISTS blocked_visitors (
  blocker_id TEXT NOT NULL,
  blocked_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (blocker_id, blocked_id)
);

CREATE INDEX IF NOT EXISTS blocked_visitors_blocker_idx ON blocked_visitors(blocker_id);

ALTER TABLE blocked_visitors ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "bv_select" ON blocked_visitors FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "bv_insert" ON blocked_visitors FOR INSERT WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "bv_delete" ON blocked_visitors FOR DELETE USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 3. Load shedding schedules (admin-populated or API-synced) ────────────────

CREATE TABLE IF NOT EXISTS loadshedding_schedules (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  stage           SMALLINT    NOT NULL CHECK (stage BETWEEN 1 AND 8),
  start_time      TIMESTAMPTZ NOT NULL,
  end_time        TIMESTAMPTZ NOT NULL,
  affected_areas  TEXT[]      NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ls_schedules_time_idx  ON loadshedding_schedules(start_time, end_time);
CREATE INDEX IF NOT EXISTS ls_schedules_stage_idx ON loadshedding_schedules(stage);

ALTER TABLE loadshedding_schedules ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "ls_sched_select" ON loadshedding_schedules FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 4. Load shedding alert subscriptions (anonymous) ─────────────────────────

CREATE TABLE IF NOT EXISTS loadshedding_subscriptions (
  visitor_id    TEXT    NOT NULL,
  area          TEXT    NOT NULL,
  alert_30min   BOOLEAN NOT NULL DEFAULT true,
  alert_2hours  BOOLEAN NOT NULL DEFAULT true,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (visitor_id, area)
);

ALTER TABLE loadshedding_subscriptions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "ls_sub_select" ON loadshedding_subscriptions FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "ls_sub_insert" ON loadshedding_subscriptions FOR INSERT WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "ls_sub_update" ON loadshedding_subscriptions FOR UPDATE USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 5. Add verification columns to venues (if not already present) ────────────

ALTER TABLE venues ADD COLUMN IF NOT EXISTS verified          BOOLEAN DEFAULT false;
ALTER TABLE venues ADD COLUMN IF NOT EXISTS verification_type TEXT;
ALTER TABLE venues ADD COLUMN IF NOT EXISTS safety_rating     FLOAT   DEFAULT 0;
