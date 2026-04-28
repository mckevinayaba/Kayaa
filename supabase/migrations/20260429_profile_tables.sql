-- ─────────────────────────────────────────────────────────────────────────────
-- Phase 4: Profile tables
-- Adapted for Kayaa schema (anonymous visitors, no `users` auth table).
-- These tables use visitor_id (TEXT, localStorage UUID) not a FK to users.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Visitor profiles (optional display name / bio) ─────────────────────────

CREATE TABLE IF NOT EXISTS visitor_profiles (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  visitor_id    TEXT        NOT NULL UNIQUE,
  name          TEXT,
  bio           TEXT,
  neighborhood  TEXT,
  city          TEXT,
  phone         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_visitor_profiles_visitor_id ON visitor_profiles(visitor_id);

ALTER TABLE visitor_profiles ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'visitor_profiles' AND policyname = 'Anyone can upsert own profile'
  ) THEN
    CREATE POLICY "Anyone can upsert own profile"
      ON visitor_profiles FOR ALL TO anon, authenticated
      USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ── 2. Visitor privacy preferences ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS visitor_privacy (
  id              UUID  PRIMARY KEY DEFAULT uuid_generate_v4(),
  visitor_id      TEXT  NOT NULL UNIQUE,
  show_checkins   BOOL  NOT NULL DEFAULT true,
  show_regulars   BOOL  NOT NULL DEFAULT true,
  show_posts      BOOL  NOT NULL DEFAULT true,
  allow_messages  BOOL  NOT NULL DEFAULT true,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_visitor_privacy_visitor_id ON visitor_privacy(visitor_id);

ALTER TABLE visitor_privacy ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'visitor_privacy' AND policyname = 'Anyone can upsert own privacy'
  ) THEN
    CREATE POLICY "Anyone can upsert own privacy"
      ON visitor_privacy FOR ALL TO anon, authenticated
      USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ── 3. Visitor notification preferences ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS visitor_notifications (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  visitor_id       TEXT NOT NULL UNIQUE,
  checkin_alerts   BOOL NOT NULL DEFAULT true,
  post_replies     BOOL NOT NULL DEFAULT true,
  new_places       BOOL NOT NULL DEFAULT true,
  nearby_activity  BOOL NOT NULL DEFAULT false,
  load_shedding    BOOL NOT NULL DEFAULT true,
  safety_alerts    BOOL NOT NULL DEFAULT true,
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_visitor_notifications_visitor_id ON visitor_notifications(visitor_id);

ALTER TABLE visitor_notifications ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'visitor_notifications' AND policyname = 'Anyone can upsert own notifications'
  ) THEN
    CREATE POLICY "Anyone can upsert own notifications"
      ON visitor_notifications FOR ALL TO anon, authenticated
      USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ── 4. board_posts — add counts columns if missing ────────────────────────────

ALTER TABLE board_posts ADD COLUMN IF NOT EXISTS likes_count    INTEGER NOT NULL DEFAULT 0;
ALTER TABLE board_posts ADD COLUMN IF NOT EXISTS comments_count INTEGER NOT NULL DEFAULT 0;

-- ── 5. skills — add views counter if missing ──────────────────────────────────

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'skills') THEN
    ALTER TABLE skills ADD COLUMN IF NOT EXISTS views INTEGER NOT NULL DEFAULT 0;
  END IF;
END $$;
