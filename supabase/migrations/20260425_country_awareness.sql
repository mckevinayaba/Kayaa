-- Country awareness: add country_code to core tables
-- Default 'ZA' for all existing rows

ALTER TABLE venues      ADD COLUMN IF NOT EXISTS country_code text NOT NULL DEFAULT 'ZA';
ALTER TABLE profiles    ADD COLUMN IF NOT EXISTS country_code text NOT NULL DEFAULT 'ZA';
ALTER TABLE board_posts ADD COLUMN IF NOT EXISTS country_code text NOT NULL DEFAULT 'ZA';
ALTER TABLE visits      ADD COLUMN IF NOT EXISTS country_code text NOT NULL DEFAULT 'ZA';

-- Indexes for country-scoped queries
CREATE INDEX IF NOT EXISTS idx_venues_country      ON venues(country_code);
CREATE INDEX IF NOT EXISTS idx_board_posts_country ON board_posts(country_code);
CREATE INDEX IF NOT EXISTS idx_visits_country      ON visits(country_code);

-- Waitlist for coming-soon countries
CREATE TABLE IF NOT EXISTS country_waitlist (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code text NOT NULL,
  contact     text NOT NULL,
  contact_type text NOT NULL CHECK (contact_type IN ('email', 'phone')),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_country_waitlist_country ON country_waitlist(country_code);

-- RLS: anyone can insert; only service role can read
ALTER TABLE country_waitlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone can join waitlist"
  ON country_waitlist FOR INSERT
  WITH CHECK (true);
