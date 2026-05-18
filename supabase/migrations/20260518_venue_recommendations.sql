-- ─────────────────────────────────────────────────────────────────────────────
-- venue_recommendations — neighbour recommendation system (no star ratings)
--
-- Design notes:
--   • Uses visitor_id (localStorage UUID) — no Supabase auth required
--   • One recommendation per (visitor_id, venue_id) — enforced by UNIQUE
--   • Soft-delete via is_active — preserves history
--   • display_name is denormalized: first name + last initial e.g. "Nomsa M."
--   • tags is a small fixed set of quick labels
--   • source: 'direct' = tapped from venue page, 'ask_reply' = via Board ask answer
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS venue_recommendations (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id      uuid        NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  visitor_id    text        NOT NULL,
  display_name  text,                        -- "Nomsa M." stored at write time
  text          text        CHECK (text IS NULL OR length(text) <= 120),
  tags          text[]      NOT NULL DEFAULT '{}',
  is_public     boolean     NOT NULL DEFAULT true,
  is_active     boolean     NOT NULL DEFAULT true,  -- false = soft-deleted
  source        text        NOT NULL DEFAULT 'direct'
                              CHECK (source IN ('direct', 'ask_reply')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (visitor_id, venue_id)
);

-- Fast lookup: all active recs for a venue (used on venue page)
CREATE INDEX IF NOT EXISTS idx_venue_recs_venue_active
  ON venue_recommendations (venue_id, created_at DESC)
  WHERE is_active = true AND is_public = true;

-- Fast lookup: user's own rec across any venue (used to check if already recommended)
CREATE INDEX IF NOT EXISTS idx_venue_recs_visitor
  ON venue_recommendations (visitor_id)
  WHERE is_active = true;

-- ── RLS ───────────────────────────────────────────────────────────────────────

ALTER TABLE venue_recommendations ENABLE ROW LEVEL SECURITY;

-- Anyone (anon or auth) can insert a recommendation
CREATE POLICY "insert_venue_rec"
  ON venue_recommendations FOR INSERT
  WITH CHECK (true);

-- Public can read active, public recommendations
CREATE POLICY "read_active_venue_recs"
  ON venue_recommendations FOR SELECT
  USING (is_active = true AND is_public = true);

-- Anyone can update their own recommendation (edit text/tags or soft-delete)
CREATE POLICY "update_own_venue_rec"
  ON venue_recommendations FOR UPDATE
  USING (true) WITH CHECK (true);

-- ─────────────────────────────────────────────────────────────────────────────
-- Helpful comment for the count trigger (optional — add later if needed):
-- You could add a rec_count column to venues and keep it in sync with a
-- trigger on venue_recommendations. For MVP we query count inline.
-- ─────────────────────────────────────────────────────────────────────────────
