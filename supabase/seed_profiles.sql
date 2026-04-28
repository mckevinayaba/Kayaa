-- ─────────────────────────────────────────────────────────────────────────────
-- Seed visitor profile defaults (Phase 4 testing)
-- Adapted for Kayaa's anonymous visitor_id schema (no users auth table).
-- Run AFTER 20260429_profile_tables.sql has been applied.
-- ─────────────────────────────────────────────────────────────────────────────

-- Seed default privacy prefs for any existing visitor check-ins
-- (visitor_id derived from the distinct visitor_ids in check_ins)
INSERT INTO visitor_privacy (visitor_id, show_checkins, show_regulars, show_posts, allow_messages)
SELECT DISTINCT visitor_id, true, true, true, true
FROM check_ins
WHERE visitor_id IS NOT NULL
ON CONFLICT (visitor_id) DO NOTHING;

-- Seed default notification prefs
INSERT INTO visitor_notifications (
  visitor_id,
  checkin_alerts, post_replies, new_places,
  nearby_activity, load_shedding, safety_alerts
)
SELECT DISTINCT visitor_id, true, true, true, false, true, true
FROM check_ins
WHERE visitor_id IS NOT NULL
ON CONFLICT (visitor_id) DO NOTHING;

-- Seed sample visitor profiles for test visitor IDs
-- (these are the same test IDs seeded in earlier migrations)
INSERT INTO visitor_profiles (visitor_id, name, neighborhood, city, bio)
VALUES
  ('test-visitor-001', 'Thabo', 'Ferndale', 'Johannesburg', 'Love finding hidden gems in my hood 🔥'),
  ('test-visitor-002', 'Nomsa', 'Randburg CBD', 'Johannesburg', 'Regular at the local spot ⭐'),
  ('test-visitor-003', 'Sipho', 'Northcliff', 'Johannesburg', 'Always heading somewhere new 🗺️')
ON CONFLICT (visitor_id) DO NOTHING;
