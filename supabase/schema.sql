-- ─────────────────────────────────────────────────────────────────────────────
-- Kayaa — Supabase Schema
-- Run this in the Supabase SQL editor to set up all tables, RLS, and helpers.
-- ─────────────────────────────────────────────────────────────────────────────

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- ─── 1. venues ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS venues (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            TEXT NOT NULL,
  type            TEXT NOT NULL,
  slug            TEXT UNIQUE NOT NULL,
  location        TEXT NOT NULL,
  description     TEXT,
  owner_id        UUID,
  regulars_count  INTEGER DEFAULT 0,
  is_active       BOOLEAN DEFAULT true,
  opening_hours   TEXT,
  address         TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE venues ENABLE ROW LEVEL SECURITY;

-- Anyone can read active venues
CREATE POLICY "Public venues are visible"
  ON venues FOR SELECT
  USING (is_active = true);

-- Only the venue owner can update their venue
CREATE POLICY "Owner can update their venue"
  ON venues FOR UPDATE
  USING (auth.uid() = owner_id);


-- ─── 2. venue_owners ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS venue_owners (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID REFERENCES auth.users(id),
  name        TEXT NOT NULL,
  phone       TEXT NOT NULL,
  email       TEXT,
  venue_id    UUID REFERENCES venues(id),
  created_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE venue_owners ENABLE ROW LEVEL SECURITY;

-- Owners can read and update only their own record
CREATE POLICY "Owner can read own record"
  ON venue_owners FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Owner can update own record"
  ON venue_owners FOR UPDATE
  USING (auth.uid() = user_id);

-- Allow insert during onboarding (before user_id is linked)
CREATE POLICY "Anyone can register as owner"
  ON venue_owners FOR INSERT
  WITH CHECK (true);


-- ─── 3. check_ins ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS check_ins (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  venue_id        UUID REFERENCES venues(id) ON DELETE CASCADE,
  visitor_name    TEXT,
  is_ghost        BOOLEAN DEFAULT false,
  is_first_visit  BOOLEAN DEFAULT false,
  visit_number    INTEGER DEFAULT 1,
  created_at      TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE check_ins ENABLE ROW LEVEL SECURITY;

-- Anyone can check in
CREATE POLICY "Anyone can check in"
  ON check_ins FOR INSERT
  WITH CHECK (true);

-- Only venue owner can read check-ins for their venue
CREATE POLICY "Owner can read their venue check-ins"
  ON check_ins FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM venues
      WHERE venues.id = check_ins.venue_id
        AND venues.owner_id = auth.uid()
    )
  );


-- ─── 4. events ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS events (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  venue_id     UUID REFERENCES venues(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  description  TEXT,
  event_date   TIMESTAMPTZ NOT NULL,
  price        INTEGER DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Anyone can read events
CREATE POLICY "Public can read events"
  ON events FOR SELECT
  USING (true);

-- Only venue owner can insert events
CREATE POLICY "Owner can insert events"
  ON events FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM venues
      WHERE venues.id = events.venue_id
        AND venues.owner_id = auth.uid()
    )
  );

-- Only venue owner can update events
CREATE POLICY "Owner can update events"
  ON events FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM venues
      WHERE venues.id = events.venue_id
        AND venues.owner_id = auth.uid()
    )
  );

-- Only venue owner can delete events
CREATE POLICY "Owner can delete events"
  ON events FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM venues
      WHERE venues.id = events.venue_id
        AND venues.owner_id = auth.uid()
    )
  );


-- ─── 5. posts ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS posts (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  venue_id    UUID REFERENCES venues(id) ON DELETE CASCADE,
  content     TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- Anyone can read posts
CREATE POLICY "Public can read posts"
  ON posts FOR SELECT
  USING (true);

-- Only venue owner can insert posts
CREATE POLICY "Owner can insert posts"
  ON posts FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM venues
      WHERE venues.id = posts.venue_id
        AND venues.owner_id = auth.uid()
    )
  );

-- Only venue owner can update posts
CREATE POLICY "Owner can update posts"
  ON posts FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM venues
      WHERE venues.id = posts.venue_id
        AND venues.owner_id = auth.uid()
    )
  );

-- Only venue owner can delete posts
CREATE POLICY "Owner can delete posts"
  ON posts FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM venues
      WHERE venues.id = posts.venue_id
        AND venues.owner_id = auth.uid()
    )
  );


-- ─── Helper function: increment regulars count ────────────────────────────────

CREATE OR REPLACE FUNCTION increment_regulars_count(venue_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE venues
  SET regulars_count = regulars_count + 1
  WHERE id = venue_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
