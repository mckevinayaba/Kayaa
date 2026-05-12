-- ─── Place Claiming Requests ────────────────────────────────────────────────
-- Stores owner / manager claim submissions for admin review.
-- status: 'pending' → 'approved' | 'rejected'

CREATE TABLE IF NOT EXISTS claimed_requests (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id            uuid NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  venue_name          text NOT NULL,
  name                text NOT NULL,
  email               text NOT NULL,
  phone               text,
  role                text NOT NULL DEFAULT 'owner'
                        CHECK (role IN ('owner', 'manager', 'representative')),
  message             text,
  is_owner_confirmed  boolean NOT NULL DEFAULT false,
  status              text NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at          timestamptz NOT NULL DEFAULT now()
);

-- Index for per-venue lookups (checking pending state on place pages)
CREATE INDEX IF NOT EXISTS idx_claimed_requests_venue_id
  ON claimed_requests(venue_id);

-- Index for admin review queue
CREATE INDEX IF NOT EXISTS idx_claimed_requests_status
  ON claimed_requests(status, created_at DESC);

-- ── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE claimed_requests ENABLE ROW LEVEL SECURITY;

-- Anyone (including anonymous visitors) can submit a claim
CREATE POLICY "Anyone can insert a claim request"
  ON claimed_requests FOR INSERT
  WITH CHECK (true);

-- Public can read pending/approved status for their own venue (for the CTA state)
CREATE POLICY "Public can read claim status by venue"
  ON claimed_requests FOR SELECT
  USING (true);
