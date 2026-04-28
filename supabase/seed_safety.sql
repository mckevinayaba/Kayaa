-- ─────────────────────────────────────────────────────────────────────────────
-- Safety seed data — Phase 6
-- Run in Supabase SQL editor after migrations 20260430 and 20260501.
-- Uses `venues` table (not `places`) and anonymous visitor_ids.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Mark some venues as verified / recommended / trusted ──────────────────

-- Verified (blue ✓) — first 5 venues
UPDATE venues
SET
  verified          = true,
  verification_type = 'verified'
WHERE id IN (
  SELECT id FROM venues ORDER BY created_at ASC LIMIT 5
);

-- Recommended (gold 🏆) — next 3
UPDATE venues
SET
  verified          = true,
  verification_type = 'recommended'
WHERE id IN (
  SELECT id FROM venues
  WHERE verified IS NOT TRUE
  ORDER BY checkins_this_week DESC NULLS LAST
  LIMIT 3
);

-- Trusted (green 🛡) — next 2 (high-checkin community spots)
UPDATE venues
SET
  verified          = true,
  verification_type = 'trusted'
WHERE id IN (
  SELECT id FROM venues
  WHERE verified IS NOT TRUE
  ORDER BY regulars_count DESC NULLS LAST
  LIMIT 2
);

-- Sync place_verifications table from venues
INSERT INTO place_verifications (place_id, verification_type, verified_by)
SELECT
  id::TEXT,
  verification_type,
  'system'
FROM venues
WHERE verified = true
ON CONFLICT (place_id) DO UPDATE
  SET verification_type = EXCLUDED.verification_type;

-- ── 2. Sample safety ratings (anonymous visitor ids) ─────────────────────────

-- Use synthetic visitor UUIDs — real app uses localStorage-generated UUIDs
INSERT INTO place_safety_ratings (place_id, visitor_id, score)
SELECT
  v.id,
  'seed-visitor-' || ROW_NUMBER() OVER (ORDER BY v.id, s.n)::TEXT,
  (FLOOR(RANDOM() * 2) + 4)::SMALLINT  -- scores 4 or 5
FROM venues v
CROSS JOIN (VALUES (1),(2),(3)) AS s(n)
WHERE RANDOM() < 0.4                    -- ~40% of venues get seed ratings
ON CONFLICT (place_id, visitor_id) DO NOTHING;

-- Refresh safety_rating column on venues from the view
UPDATE venues v
SET safety_rating = sr.avg_score
FROM place_safety_summary sr
WHERE sr.place_id = v.id::TEXT;

-- ── 3. Sample load shedding schedules ────────────────────────────────────────

INSERT INTO loadshedding_schedules (stage, start_time, end_time, affected_areas)
VALUES
  (2,
   NOW() + INTERVAL '2 hours',
   NOW() + INTERVAL '4 hours 30 minutes',
   ARRAY['Randburg','Ferndale','Northcliff']),

  (2,
   NOW() + INTERVAL '8 hours',
   NOW() + INTERVAL '10 hours 30 minutes',
   ARRAY['Randburg CBD','Cresta','Bordeaux']),

  (3,
   NOW() + INTERVAL '1 day',
   NOW() + INTERVAL '1 day 2 hours 30 minutes',
   ARRAY['Randburg','Northcliff','Blackheath']),

  (1,
   NOW() + INTERVAL '2 days',
   NOW() + INTERVAL '2 days 2 hours',
   ARRAY['Soweto','Meadowlands','Dobsonville']),

  (4,
   NOW() + INTERVAL '3 days',
   NOW() + INTERVAL '3 days 2 hours 30 minutes',
   ARRAY['Johannesburg South','Eldorado Park','Ennerdale']);

-- ── 4. Verify counts ──────────────────────────────────────────────────────────

SELECT
  (SELECT COUNT(*) FROM venues WHERE verified = true)         AS verified_venues,
  (SELECT COUNT(*) FROM place_safety_ratings)                 AS safety_ratings,
  (SELECT COUNT(*) FROM loadshedding_schedules)               AS ls_schedules,
  (SELECT COUNT(*) FROM place_verifications)                  AS verifications;
