-- ─── Remaining seed content — items 26-30 + activity + venue posts ─────────────

-- ════════════════════════════════════════════════════════════════
-- BOARD POSTS — items 26-30 (completing the sprint spec)
-- ════════════════════════════════════════════════════════════════

INSERT INTO board_posts (neighbourhood, country_code, category, title, description, price, contact_whatsapp, status, created_at, expires_at)
VALUES
(
  'Meadowlands', 'ZA', 'events',
  'Open Mic Night — Corner Tavern, Friday 7pm',
  'Open mic night at Corner Tavern this Friday 7pm. Poetry, spoken word, singing. Free entry. First 10 performers get a free drink. Come perform or just come support.',
  NULL, '+27634567903', 'active',
  now() - interval '1 day',
  now() + interval '7 days'
),
(
  'Tembisa', 'ZA', 'accommodation',
  'Bachelor room available — Tembisa',
  'Clean bachelor room available in Tembisa. Own entrance, own bathroom. Pre-paid electricity. Water included. R1200 per month. Available from 1st of next month. Deposit required.',
  1200, '+27701234569', 'active',
  now() - interval '16 hours',
  now() + interval '14 days'
),
(
  'Rosebank', 'ZA', 'accommodation',
  'Flatmate needed — Rosebank 2-bed apartment',
  'Looking for a flatmate to share a 2-bedroom apartment in Rosebank. R3500 per month including electricity. Non-smoker preferred. Available from mid-month.',
  3500, '+27712345670', 'active',
  now() - interval '9 hours',
  now() + interval '14 days'
),
(
  'Khayelitsha', 'ZA', 'safety',
  '🚨 Street lights out — corner of Main & 5th',
  'All street lights at the corner of Main Road and 5th Avenue have been out for 3 days. Very dark at night. Walking home from the taxi rank feels unsafe. Can someone please report this to the municipality?',
  NULL, '+27723456781', 'active',
  now() - interval '3 hours',
  now() + interval '45 hours'
),
(
  'Soweto', 'ZA', 'safety',
  '🚨 Load shedding moved to Stage 5 from 8pm',
  'Eskom just announced Stage 5 load shedding from 8pm tonight. Tembisa, Soweto, Alexandra all affected. Charge your phones. Get cash if you need it — card machines will be down.',
  NULL, NULL, 'active',
  now() - interval '1 hour',
  now() + interval '23 hours'
);


-- ════════════════════════════════════════════════════════════════
-- SEED CHECK-IN ACTIVITY (visits + check_ins + regular_scores)
-- Uses slug lookup — gracefully skips if venues not in DB
-- ════════════════════════════════════════════════════════════════

DO $$
DECLARE
  v_faith   uuid;
  v_mama    uuid;
  v_glow    uuid;
  v_spark   uuid;

  -- Seed visitor IDs (realistic anonymous IDs)
  uid_thabo   text := 'v_seed_thabo_001';
  uid_nomsa   text := 'v_seed_nomsa_002';
  uid_sbu     text := 'v_seed_sbu_003';
  uid_lerato  text := 'v_seed_lerato_004';
  uid_mandla  text := 'v_seed_mandla_005';
  uid_zanele  text := 'v_seed_zanele_006';
  uid_sipho   text := 'v_seed_sipho_007';
  uid_anele   text := 'v_seed_anele_008';

BEGIN
  -- Resolve venue IDs by slug (NULL if not in DB)
  SELECT id INTO v_faith FROM venues WHERE slug = 'faith-assembly-thokoza' LIMIT 1;
  SELECT id INTO v_mama  FROM venues WHERE slug = 'mama-zulu-shisanyama'   LIMIT 1;
  SELECT id INTO v_glow  FROM venues WHERE slug = 'glow-up-salon-mitchells' LIMIT 1;
  SELECT id INTO v_spark FROM venues WHERE slug = 'spark-tutoring-mamelodi' LIMIT 1;

  -- ── Faith Assembly check-ins ────────────────────────────────
  IF v_faith IS NOT NULL THEN
    INSERT INTO check_ins (venue_id, visitor_name, is_ghost, is_first_visit, visit_number, created_at)
    VALUES
      (v_faith, 'Thabo',  false, false, 8, now() - interval '2 hours'),
      (v_faith, 'Nomsa',  false, false, 5, now() - interval '5 hours'),
      (v_faith, 'Lerato', false, true,  1, now() - interval '12 hours'),
      (v_faith, 'Sipho',  false, false, 3, now() - interval '1 day'),
      (v_faith, 'Anele',  false, false, 2, now() - interval '2 days')
    ON CONFLICT DO NOTHING;

    INSERT INTO visits (venue_id, user_id, checked_in_at, method)
    VALUES
      (v_faith, uid_thabo,  now() - interval '2 hours',  'gps'),
      (v_faith, uid_nomsa,  now() - interval '5 hours',  'qr'),
      (v_faith, uid_lerato, now() - interval '12 hours', 'gps'),
      (v_faith, uid_sipho,  now() - interval '1 day',    'gps'),
      (v_faith, uid_anele,  now() - interval '2 days',   'qr')
    ON CONFLICT DO NOTHING;

    INSERT INTO regular_scores (venue_id, user_id, visit_count, last_visit, streak_days, badge_tier)
    VALUES
      (v_faith, uid_thabo,  8, now() - interval '2 hours',  3, 'loyal'),
      (v_faith, uid_nomsa,  5, now() - interval '5 hours',  2, 'regular'),
      (v_faith, uid_lerato, 1, now() - interval '12 hours', 1, 'newcomer'),
      (v_faith, uid_sipho,  3, now() - interval '1 day',    1, 'regular'),
      (v_faith, uid_anele,  2, now() - interval '2 days',   1, 'newcomer')
    ON CONFLICT (venue_id, user_id) DO UPDATE
      SET visit_count = EXCLUDED.visit_count,
          last_visit  = EXCLUDED.last_visit,
          streak_days = EXCLUDED.streak_days,
          badge_tier  = EXCLUDED.badge_tier;

    -- Bump regulars_count
    UPDATE venues SET regulars_count = 5 WHERE id = v_faith;
  END IF;

  -- ── Mama Zulu's check-ins ────────────────────────────────────
  IF v_mama IS NOT NULL THEN
    INSERT INTO check_ins (venue_id, visitor_name, is_ghost, is_first_visit, visit_number, created_at)
    VALUES
      (v_mama, 'Mandla', false, false, 15, now() - interval '1 hour'),
      (v_mama, 'Sipho',  false, false, 6,  now() - interval '3 hours'),
      (v_mama, 'Anele',  false, false, 12, now() - interval '6 hours'),
      (v_mama, 'Thabo',  false, false, 9,  now() - interval '10 hours'),
      (v_mama, 'Sbu',    false, true,  1,  now() - interval '1 day')
    ON CONFLICT DO NOTHING;

    INSERT INTO visits (venue_id, user_id, checked_in_at, method)
    VALUES
      (v_mama, uid_mandla, now() - interval '1 hour',   'gps'),
      (v_mama, uid_sipho,  now() - interval '3 hours',  'gps'),
      (v_mama, uid_anele,  now() - interval '6 hours',  'qr'),
      (v_mama, uid_thabo,  now() - interval '10 hours', 'gps'),
      (v_mama, uid_sbu,    now() - interval '1 day',    'manual')
    ON CONFLICT DO NOTHING;

    INSERT INTO regular_scores (venue_id, user_id, visit_count, last_visit, streak_days, badge_tier)
    VALUES
      (v_mama, uid_mandla, 15, now() - interval '1 hour',   5, 'legend'),
      (v_mama, uid_sipho,  6,  now() - interval '3 hours',  2, 'loyal'),
      (v_mama, uid_anele,  12, now() - interval '6 hours',  4, 'loyal'),
      (v_mama, uid_thabo,  9,  now() - interval '10 hours', 3, 'loyal'),
      (v_mama, uid_sbu,    1,  now() - interval '1 day',    1, 'newcomer')
    ON CONFLICT (venue_id, user_id) DO UPDATE
      SET visit_count = EXCLUDED.visit_count,
          last_visit  = EXCLUDED.last_visit,
          streak_days = EXCLUDED.streak_days,
          badge_tier  = EXCLUDED.badge_tier;

    UPDATE venues SET regulars_count = 5 WHERE id = v_mama;
  END IF;

  -- ── Glow Up Hair & Beauty check-ins ─────────────────────────
  IF v_glow IS NOT NULL THEN
    INSERT INTO check_ins (venue_id, visitor_name, is_ghost, is_first_visit, visit_number, created_at)
    VALUES
      (v_glow, 'Zanele',  false, false, 7,  now() - interval '4 hours'),
      (v_glow, 'Lerato',  false, false, 4,  now() - interval '8 hours'),
      (v_glow, 'Nomsa',   false, false, 11, now() - interval '1 day'),
      (v_glow, 'Keabetswe', false, true, 1, now() - interval '2 days')
    ON CONFLICT DO NOTHING;

    INSERT INTO visits (venue_id, user_id, checked_in_at, method)
    VALUES
      (v_glow, uid_zanele,  now() - interval '4 hours', 'gps'),
      (v_glow, uid_lerato,  now() - interval '8 hours', 'gps'),
      (v_glow, uid_nomsa,   now() - interval '1 day',   'qr'),
      (v_glow, 'v_seed_keabetswe_010', now() - interval '2 days', 'gps')
    ON CONFLICT DO NOTHING;

    INSERT INTO regular_scores (venue_id, user_id, visit_count, last_visit, streak_days, badge_tier)
    VALUES
      (v_glow, uid_zanele,  7,  now() - interval '4 hours', 3, 'loyal'),
      (v_glow, uid_lerato,  4,  now() - interval '8 hours', 2, 'regular'),
      (v_glow, uid_nomsa,   11, now() - interval '1 day',   4, 'loyal'),
      (v_glow, 'v_seed_keabetswe_010', 1, now() - interval '2 days', 1, 'newcomer')
    ON CONFLICT (venue_id, user_id) DO UPDATE
      SET visit_count = EXCLUDED.visit_count,
          last_visit  = EXCLUDED.last_visit,
          streak_days = EXCLUDED.streak_days,
          badge_tier  = EXCLUDED.badge_tier;

    UPDATE venues SET regulars_count = 4 WHERE id = v_glow;
  END IF;

  -- ── Spark Tutoring check-ins ─────────────────────────────────
  IF v_spark IS NOT NULL THEN
    INSERT INTO check_ins (venue_id, visitor_name, is_ghost, is_first_visit, visit_number, created_at)
    VALUES
      (v_spark, 'Bongani', false, false, 6, now() - interval '3 hours'),
      (v_spark, 'Nomsa',   false, true,  1, now() - interval '6 hours')
    ON CONFLICT DO NOTHING;

    INSERT INTO visits (venue_id, user_id, checked_in_at, method)
    VALUES
      (v_spark, uid_nomsa,  now() - interval '3 hours', 'gps'),
      (v_spark, 'v_seed_bongani_009', now() - interval '6 hours', 'qr')
    ON CONFLICT DO NOTHING;

    INSERT INTO regular_scores (venue_id, user_id, visit_count, last_visit, streak_days, badge_tier)
    VALUES
      (v_spark, uid_nomsa,  1, now() - interval '3 hours', 1, 'newcomer'),
      (v_spark, 'v_seed_bongani_009', 6, now() - interval '6 hours', 2, 'loyal')
    ON CONFLICT (venue_id, user_id) DO UPDATE
      SET visit_count = EXCLUDED.visit_count,
          last_visit  = EXCLUDED.last_visit,
          streak_days = EXCLUDED.streak_days,
          badge_tier  = EXCLUDED.badge_tier;

    UPDATE venues SET regulars_count = 2 WHERE id = v_spark;
  END IF;

END $$;


-- ════════════════════════════════════════════════════════════════
-- SEED VIBE REPORTS
-- ════════════════════════════════════════════════════════════════

DO $$
DECLARE
  v_faith uuid;
  v_mama  uuid;
BEGIN
  SELECT id INTO v_faith FROM venues WHERE slug = 'faith-assembly-thokoza'  LIMIT 1;
  SELECT id INTO v_mama  FROM venues WHERE slug = 'mama-zulu-shisanyama'    LIMIT 1;

  IF v_faith IS NOT NULL THEN
    INSERT INTO vibe_reports (venue_id, user_id, vibe, expires_at)
    VALUES
      (v_faith, 'v_seed_thabo_001',  'happening', now() + interval '2 hours'),
      (v_faith, 'v_seed_nomsa_002',  'happening', now() + interval '1 hour'),
      (v_faith, 'v_seed_sipho_007',  'busy',      now() + interval '90 minutes')
    ON CONFLICT (user_id, venue_id) DO UPDATE SET vibe = EXCLUDED.vibe, expires_at = EXCLUDED.expires_at;
  END IF;

  IF v_mama IS NOT NULL THEN
    INSERT INTO vibe_reports (venue_id, user_id, vibe, expires_at)
    VALUES
      (v_mama, 'v_seed_mandla_005', 'busy',      now() + interval '2 hours'),
      (v_mama, 'v_seed_sipho_007',  'busy',      now() + interval '1 hour'),
      (v_mama, 'v_seed_anele_008',  'busy',      now() + interval '90 minutes'),
      (v_mama, 'v_seed_thabo_001',  'happening', now() + interval '2 hours'),
      (v_mama, 'v_seed_zanele_006', 'happening', now() + interval '45 minutes')
    ON CONFLICT (user_id, venue_id) DO UPDATE SET vibe = EXCLUDED.vibe, expires_at = EXCLUDED.expires_at;
  END IF;
END $$;


-- ════════════════════════════════════════════════════════════════
-- SEED VENUE POSTS + EVENTS
-- ════════════════════════════════════════════════════════════════

DO $$
DECLARE
  v_faith uuid;
  v_mama  uuid;
  v_glow  uuid;
  friday_6pm  timestamptz := date_trunc('week', now()) + interval '5 days 18 hours';
  saturday_1pm timestamptz := date_trunc('week', now()) + interval '6 days 13 hours';
BEGIN
  SELECT id INTO v_faith FROM venues WHERE slug = 'faith-assembly-thokoza'   LIMIT 1;
  SELECT id INTO v_mama  FROM venues WHERE slug = 'mama-zulu-shisanyama'     LIMIT 1;
  SELECT id INTO v_glow  FROM venues WHERE slug = 'glow-up-salon-mitchells'  LIMIT 1;

  -- Venue posts
  IF v_faith IS NOT NULL THEN
    INSERT INTO posts (venue_id, content, created_at)
    VALUES (v_faith, 'Youth night this Friday at 6pm. Bring your friends. Worship, games, and food. Everyone welcome. See you there. 🙏', now() - interval '1 day')
    ON CONFLICT DO NOTHING;
  END IF;

  IF v_mama IS NOT NULL THEN
    INSERT INTO posts (venue_id, content, created_at)
    VALUES (v_mama, 'Special this week — R60 for pap and two pieces of meat. Friday and Saturday only. Come early, we get busy after 7pm. 🔥', now() - interval '8 hours')
    ON CONFLICT DO NOTHING;
  END IF;

  IF v_glow IS NOT NULL THEN
    INSERT INTO posts (venue_id, content, created_at)
    VALUES (v_glow, 'New braiding styles available! Book for this weekend. R500–R900 depending on length. Photos on our page. WhatsApp to book. 💅', now() - interval '12 hours')
    ON CONFLICT DO NOTHING;
  END IF;

  -- Adjust friday_6pm: if already past this Friday, use next week
  IF friday_6pm < now() THEN
    friday_6pm  := friday_6pm  + interval '7 days';
    saturday_1pm := saturday_1pm + interval '7 days';
  END IF;

  -- Events
  IF v_faith IS NOT NULL THEN
    INSERT INTO events (venue_id, title, description, event_date, price, created_at)
    VALUES (
      v_faith,
      'Youth Night — Worship & Games',
      'Friday night at 6pm. Worship session, games, and food. Free entry. Everyone ages 15–30 welcome.',
      friday_6pm,
      0,
      now() - interval '1 day'
    ) ON CONFLICT DO NOTHING;
  END IF;

  IF v_mama IS NOT NULL THEN
    INSERT INTO events (venue_id, title, description, event_date, price, created_at)
    VALUES (
      v_mama,
      'Heritage Day Mega Braai',
      'Saturday afternoon from 1pm. Live music, meat on special, traditional food, and cold drinks. Bring your appetite.',
      saturday_1pm,
      0,
      now() - interval '2 days'
    ) ON CONFLICT DO NOTHING;
  END IF;
END $$;
