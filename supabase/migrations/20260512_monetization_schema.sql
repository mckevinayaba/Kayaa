-- ── Phase 8: Monetisation-ready schema ───────────────────────────────────────
-- Adds plan tier, promotion, partner, and visibility fields to venues.
-- No paywalls introduced. All existing features remain free for all venues.
-- These columns are additive — defaults are safe, nothing breaks.

-- ── 1. Plan + promotion columns on venues ─────────────────────────────────────

ALTER TABLE venues
  ADD COLUMN IF NOT EXISTS plan_tier        text     NOT NULL DEFAULT 'free'
    CHECK(plan_tier IN ('free', 'starter', 'pro')),
  ADD COLUMN IF NOT EXISTS is_promoted      boolean  NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS promoted_until   timestamptz,
  ADD COLUMN IF NOT EXISTS visibility_score integer  NOT NULL DEFAULT 0;

-- Index for fast feed sorting by promotion rank
CREATE INDEX IF NOT EXISTS idx_venues_visibility
  ON venues(visibility_score DESC, is_promoted DESC, created_at DESC);

-- ── 2. venue_promotions — tracks active/historical promotion slots ─────────────

CREATE TABLE IF NOT EXISTS venue_promotions (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id       uuid        NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  promotion_type text        NOT NULL
    CHECK(promotion_type IN ('featured', 'spotlight', 'category_top', 'neighbourhood_pin')),
  starts_at      timestamptz NOT NULL DEFAULT now(),
  ends_at        timestamptz NOT NULL,
  is_active      boolean     NOT NULL DEFAULT true,
  -- who/what triggered this promotion slot
  source         text        NOT NULL DEFAULT 'admin'
    CHECK(source IN ('admin', 'purchase', 'partner', 'gift')),
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_venue_promotions_venue
  ON venue_promotions(venue_id);
CREATE INDEX IF NOT EXISTS idx_venue_promotions_active
  ON venue_promotions(is_active, ends_at) WHERE is_active = true;

-- RLS: anyone can read active, non-expired promotions; only service_role writes
ALTER TABLE venue_promotions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'venue_promotions' AND policyname = 'Public can read active promotions'
  ) THEN
    CREATE POLICY "Public can read active promotions"
      ON venue_promotions FOR SELECT
      USING (is_active = true AND ends_at > now());
  END IF;
END $$;

-- ── 3. venue_partners — partner/sponsor metadata per venue ───────────────────

CREATE TABLE IF NOT EXISTS venue_partners (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id     uuid        NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  partner_name text        NOT NULL,
  partner_type text        NOT NULL
    CHECK(partner_type IN ('sponsor', 'distributor', 'media_partner', 'service_provider', 'franchise')),
  -- optional external reference for partner-side lookups
  partner_ref  text,
  -- flexible metadata bag: logo_url, campaign_id, etc.
  metadata     jsonb       NOT NULL DEFAULT '{}'::jsonb,
  is_active    boolean     NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_venue_partners_venue
  ON venue_partners(venue_id);
CREATE INDEX IF NOT EXISTS idx_venue_partners_type
  ON venue_partners(partner_type) WHERE is_active = true;

ALTER TABLE venue_partners ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'venue_partners' AND policyname = 'Public can read active partners'
  ) THEN
    CREATE POLICY "Public can read active partners"
      ON venue_partners FOR SELECT
      USING (is_active = true);
  END IF;
END $$;
