-- ════════════════════════════════════════════════════════════════
-- PHASE 2: Seed 24 new places + check-in data across Randburg
-- ════════════════════════════════════════════════════════════════


-- ════════════════════════════════════════════════════════════════
-- PART 1: INSERT 24 NEW VENUES
-- ════════════════════════════════════════════════════════════════

INSERT INTO venues
  (name, type, slug, location, description, address, is_active, is_public,
   show_regulars_publicly, allow_quiet_checkins, country_code)
VALUES

-- ── BARBERSHOPS (3) ───────────────────────────────────────────────
(
  'Sbu''s Cuts', 'barbershop', 'sbus-cuts-ferndale', 'Ferndale',
  'Sbu has been cutting hair since he was 9. Fresh fades, clean lineups, proper beard shaping. No appointment needed — just rock up. R120 full cut. Tuesday to Sunday.',
  'Ferndale, Randburg', true, true, true, false, 'ZA'
),
(
  'King Fades Barbershop', 'barbershop', 'king-fades-northcliff', 'Northcliff',
  'Sharp cuts for sharp people. Taper fades, skin fades, kids cuts. Appointment or walk-in. R100-R140 depending on style. Based in Northcliff.',
  'Northcliff, Randburg', true, true, true, false, 'ZA'
),
(
  'Sharp Edges Barbershop', 'barbershop', 'sharp-edges-bromhof', 'Bromhof',
  'The neighbourhood barbershop Bromhof deserved. Cuts, trims, shaves. R110 standard. Student discount Wednesday. Open 9am-6pm Mon-Sat.',
  'Bromhof, Randburg', true, true, true, false, 'ZA'
),

-- ── SALONS (3) ────────────────────────────────────────────────────
(
  'Naledi Hair Studio', 'salon', 'naledi-hair-studio-blairgowrie', 'Blairgowrie',
  'Braids, weaves, natural hair, relaxers, blow-outs. Naledi and her team have been doing hair in Blairgowrie for 8 years. WhatsApp to book. Prices from R180.',
  'Blairgowrie, Randburg', true, true, true, false, 'ZA'
),
(
  'Crown & Glory Salon', 'salon', 'crown-glory-salon-linden', 'Linden',
  'Full hair salon in Linden. Cuts, colour, keratin, knotless braids, locs. Book in advance for weekends — we fill up fast. R200-R950 depending on service.',
  'Linden, Randburg', true, true, true, false, 'ZA'
),
(
  'Glam Cave', 'salon', 'glam-cave-bordeaux', 'Bordeaux',
  'Hair, nails, eyebrows, lashes. Your full beauty stop in Bordeaux. Walk-ins welcome Mon-Thu, bookings recommended Fri-Sun. DM us for a price list.',
  'Bordeaux, Randburg', true, true, true, false, 'ZA'
),

-- ── TAVERNS (2) ───────────────────────────────────────────────────
(
  'RockerFella Tavern', 'tavern', 'rockerfella-tavern-ferndale', 'Ferndale',
  'Cold beers, loud music, good vibes. Friday and Saturday nights are something else here. Pool table, outside seating, full bar. Open from 12pm, closes late.',
  'Ferndale, Randburg', true, true, false, false, 'ZA'
),
(
  'The Corner Spot', 'tavern', 'the-corner-spot-randburg', 'Randburg CBD',
  'Community tavern in Randburg CBD. Ice cold quarts, darts, the game on the big screen. Everyone knows your name here. Open daily from 11am.',
  'Randburg CBD', true, true, false, false, 'ZA'
),

-- ── CAR WASHES (2) ───────────────────────────────────────────────
(
  'KwaMahlangu Car Wash', 'car_wash', 'kwamahlangu-car-wash-northcliff', 'Northcliff',
  'People don''t come just for the wash. They come for the conversations. R80 full exterior wash, R150 full valet with interior. Saturday mornings are wild.',
  'Northcliff, Randburg', true, true, true, false, 'ZA'
),
(
  'Shine Time Car Wash', 'car_wash', 'shine-time-car-wash-blairgowrie', 'Blairgowrie',
  'Hand wash, not machine. R80 wash and vacuum, R180 full detail. We take our time and do it properly. Open 7am-4pm daily.',
  'Blairgowrie, Randburg', true, true, true, false, 'ZA'
),

-- ── SPAZA / TUCKSHOPS (3) ────────────────────────────────────────
(
  'Mama''s Tuckshop', 'spaza_shop', 'mamas-tuckshop-randburg', 'Randburg CBD',
  'Best vetkoek in Joburg. R15 plain, R35 with mince. Atchaar, fat cakes, cold drinks, loose cigarettes. Open 6am-2pm. Cash only.',
  'Randburg CBD', true, true, true, false, 'ZA'
),
(
  'Bra Steve''s Spaza', 'spaza_shop', 'bra-steves-spaza-ferndale', 'Ferndale',
  'Everything you need and some things you didn''t know you needed. Airtime, eggs, bread, data, ice cream, paraffin. Open from 6am, closes when stock runs out.',
  'Ferndale, Randburg', true, true, true, false, 'ZA'
),
(
  'Corner Kiosk', 'spaza_shop', 'corner-kiosk-bromhof', 'Bromhof',
  'Your local corner shop in Bromhof. Cold drinks, snacks, bread, airtime and data bundles for all networks. Open 6am-8pm seven days.',
  'Bromhof, Randburg', true, true, true, false, 'ZA'
),

-- ── SHISANYAMAS (2) ──────────────────────────────────────────────
(
  'Mzansi Braai Spot', 'shisanyama', 'mzansi-braai-spot-ferndale', 'Ferndale',
  'Pap, vleis, chakalaka. Friday nights and Saturdays are packed. Whole chicken R95, half R55. Wors, chops, T-bones. Eat outside under the trees. BYOB or buy here.',
  'Ferndale, Randburg', true, true, false, false, 'ZA'
),
(
  'Nkosi''s Shisanyama', 'shisanyama', 'nkosis-shisanyama-northcliff', 'Northcliff',
  'Nkosi runs the grill from 12pm every Friday, Saturday, and Sunday. The best fire in Northcliff. Lamb chops, boerewors, sishebo. R80 plate with pap and veg.',
  'Northcliff, Randburg', true, true, false, false, 'ZA'
),

-- ── CHURCHES (2) ─────────────────────────────────────────────────
(
  'New Life Community Church', 'church', 'new-life-church-linden', 'Linden',
  'A welcoming congregation in Linden. Sunday service 9am and 11am. Wednesday Bible study 7pm. Community food drive every last Saturday of the month.',
  'Linden, Randburg', true, true, true, true, 'ZA'
),
(
  'Grace Fellowship', 'church', 'grace-fellowship-bromhof', 'Bromhof',
  'Interdenominational church in Bromhof. Sunday 10am worship. All are welcome. Youth group Friday evenings. Community garden open to neighbours.',
  'Bromhof, Randburg', true, true, true, true, 'ZA'
),

-- ── CAFÉS (2) ────────────────────────────────────────────────────
(
  'The Daily Grind Café', 'cafe', 'daily-grind-cafe-randburg', 'Randburg CBD',
  'Proper coffee, fresh toasties, working WiFi. The spot to open your laptop in Randburg. Flat white R38, toasted sandwich R55. 7am-4pm Mon-Sat.',
  'Randburg CBD', true, true, true, false, 'ZA'
),
(
  'Neighbourhood Café', 'cafe', 'neighbourhood-cafe-linden', 'Linden',
  'Small café on 7th Street Linden. Homemade muffins, strong filter coffee, good eggs. Locals only know it exists. That''s how they like it.',
  'Linden, Randburg', true, true, true, false, 'ZA'
),

-- ── MECHANICS (2) ────────────────────────────────────────────────
(
  'Fix It Fast Garage', 'mechanic', 'fix-it-fast-garage-northcliff', 'Northcliff',
  'Honest mechanic in Northcliff. Honest prices, honest work. Services, brakes, exhausts, suspension. Toyota and VW specialists. Quote before we touch anything.',
  'Northcliff, Randburg', true, true, true, false, 'ZA'
),
(
  'Bra Themba''s Workshop', 'mechanic', 'bra-thembas-workshop-ferndale', 'Ferndale',
  'Themba has been fixing cars in Ferndale for 22 years. Cash only, no funny business. Diagnostics R150, services from R650. He''ll tell you the truth about your car.',
  'Ferndale, Randburg', true, true, true, false, 'ZA'
),

-- ── GYM (1) ──────────────────────────────────────────────────────
(
  'Hustle Gym', 'gym', 'hustle-gym-randburg', 'Randburg CBD',
  'No frills, no mirrors, no excuses. Free weights, bags, benches, ropes. R250 per month. Day pass R40. Open 5am-9pm Mon-Fri, 6am-2pm weekends. Bring your grind.',
  'Randburg CBD', true, true, true, false, 'ZA'
),

-- ── OTHER (2) ────────────────────────────────────────────────────
(
  'Ferndale Morning Market', 'market', 'ferndale-morning-market', 'Ferndale',
  'Every Saturday 7am-12pm. Fresh produce, home bakes, plants, crafts, and food stalls. Randburg''s best-kept Saturday morning secret. Free entry.',
  'Ferndale, Randburg', true, true, true, false, 'ZA'
),
(
  'Vibe Studio', 'music_studio', 'vibe-studio-randburg', 'Randburg CBD',
  'Recording studio and rehearsal space in Randburg CBD. Studio time from R150/hr. Rehearsal room R80/hr. Beats, mixing, mastering available. WhatsApp to book.',
  'Randburg CBD', true, true, true, false, 'ZA'
);


-- ════════════════════════════════════════════════════════════════
-- PART 2: UPDATE 6 EXISTING VENUES WITH TRUST METRICS
-- (WHERE clause uses ILIKE — safe no-op if venue doesn't exist)
-- ════════════════════════════════════════════════════════════════

UPDATE venues SET
  checkin_count = 462, checkins_today = 5, checkins_this_week = 28,
  regulars_count = 89, status = 'busy',
  last_checkin_at = now() - interval '45 minutes'
WHERE name ILIKE '%Glow Up%';

UPDATE venues SET
  checkin_count = 755, checkins_today = 12, checkins_this_week = 87,
  regulars_count = 134, status = 'busy',
  last_checkin_at = now() - interval '20 minutes'
WHERE name ILIKE '%Mama Zulu%';

UPDATE venues SET
  checkin_count = 203, checkins_today = 2, checkins_this_week = 14,
  regulars_count = 47, status = 'open',
  last_checkin_at = now() - interval '2 hours'
WHERE name ILIKE '%Spark Tutoring%';

UPDATE venues SET
  checkin_count = 289, checkins_today = 3, checkins_this_week = 34,
  regulars_count = 62, status = 'open',
  last_checkin_at = now() - interval '1 hour'
WHERE name ILIKE '%Uncle Dee%';

UPDATE venues SET
  checkin_count = 1240, checkins_today = 45, checkins_this_week = 312,
  regulars_count = 187, status = 'open',
  last_checkin_at = now() - interval '8 minutes'
WHERE name ILIKE '%Sipho Corner%';

UPDATE venues SET
  checkin_count = 892, checkins_today = 0, checkins_this_week = 892,
  regulars_count = 241, status = 'open',
  last_checkin_at = now() - interval '1 day'
WHERE name ILIKE '%Faith Assembly%';


-- ════════════════════════════════════════════════════════════════
-- PART 3: SEED 240 CHECK-INS via DO block
-- Each venue gets 8-10 check-ins with realistic timing patterns
-- ════════════════════════════════════════════════════════════════

DO $$
DECLARE
  v_sbus        uuid; v_kingfades  uuid; v_sharpedges uuid;
  v_naledi      uuid; v_crown      uuid; v_glamcave   uuid;
  v_rockerfella uuid; v_cornerspot uuid;
  v_kwamahlangu uuid; v_shinetime  uuid;
  v_mamas       uuid; v_brasteve   uuid; v_cornerkiosk uuid;
  v_mzansi      uuid; v_nkosi      uuid;
  v_newlife     uuid; v_grace      uuid;
  v_dailygrind  uuid; v_nbcafe     uuid;
  v_fixitfast   uuid; v_brathemba  uuid;
  v_hustle      uuid;
  v_fernmarket  uuid; v_vibestudio uuid;
BEGIN

  -- Resolve venue IDs
  SELECT id INTO v_sbus        FROM venues WHERE slug = 'sbus-cuts-ferndale'               LIMIT 1;
  SELECT id INTO v_kingfades   FROM venues WHERE slug = 'king-fades-northcliff'             LIMIT 1;
  SELECT id INTO v_sharpedges  FROM venues WHERE slug = 'sharp-edges-bromhof'               LIMIT 1;
  SELECT id INTO v_naledi      FROM venues WHERE slug = 'naledi-hair-studio-blairgowrie'    LIMIT 1;
  SELECT id INTO v_crown       FROM venues WHERE slug = 'crown-glory-salon-linden'          LIMIT 1;
  SELECT id INTO v_glamcave    FROM venues WHERE slug = 'glam-cave-bordeaux'                LIMIT 1;
  SELECT id INTO v_rockerfella FROM venues WHERE slug = 'rockerfella-tavern-ferndale'       LIMIT 1;
  SELECT id INTO v_cornerspot  FROM venues WHERE slug = 'the-corner-spot-randburg'          LIMIT 1;
  SELECT id INTO v_kwamahlangu FROM venues WHERE slug = 'kwamahlangu-car-wash-northcliff'   LIMIT 1;
  SELECT id INTO v_shinetime   FROM venues WHERE slug = 'shine-time-car-wash-blairgowrie'   LIMIT 1;
  SELECT id INTO v_mamas       FROM venues WHERE slug = 'mamas-tuckshop-randburg'           LIMIT 1;
  SELECT id INTO v_brasteve    FROM venues WHERE slug = 'bra-steves-spaza-ferndale'         LIMIT 1;
  SELECT id INTO v_cornerkiosk FROM venues WHERE slug = 'corner-kiosk-bromhof'              LIMIT 1;
  SELECT id INTO v_mzansi      FROM venues WHERE slug = 'mzansi-braai-spot-ferndale'        LIMIT 1;
  SELECT id INTO v_nkosi       FROM venues WHERE slug = 'nkosis-shisanyama-northcliff'      LIMIT 1;
  SELECT id INTO v_newlife     FROM venues WHERE slug = 'new-life-church-linden'            LIMIT 1;
  SELECT id INTO v_grace       FROM venues WHERE slug = 'grace-fellowship-bromhof'          LIMIT 1;
  SELECT id INTO v_dailygrind  FROM venues WHERE slug = 'daily-grind-cafe-randburg'         LIMIT 1;
  SELECT id INTO v_nbcafe      FROM venues WHERE slug = 'neighbourhood-cafe-linden'         LIMIT 1;
  SELECT id INTO v_fixitfast   FROM venues WHERE slug = 'fix-it-fast-garage-northcliff'     LIMIT 1;
  SELECT id INTO v_brathemba   FROM venues WHERE slug = 'bra-thembas-workshop-ferndale'     LIMIT 1;
  SELECT id INTO v_hustle      FROM venues WHERE slug = 'hustle-gym-randburg'               LIMIT 1;
  SELECT id INTO v_fernmarket  FROM venues WHERE slug = 'ferndale-morning-market'           LIMIT 1;
  SELECT id INTO v_vibestudio  FROM venues WHERE slug = 'vibe-studio-randburg'              LIMIT 1;

  -- ── Sbu's Cuts — Barbershop: Tue-Sat pattern ──────────────────
  IF v_sbus IS NOT NULL THEN
    INSERT INTO check_ins (venue_id, visitor_name, is_ghost, is_first_visit, visit_number, method, created_at) VALUES
    (v_sbus, 'Sipho Dlamini',   false, false, 12, 'manual', now() - interval '1 hour'),
    (v_sbus, 'Thabo Mokoena',   false, false,  7, 'manual', now() - interval '2 hours'),
    (v_sbus, 'Lungelo Ntuli',   false, false,  3, 'manual', now() - interval '3 hours'),
    (v_sbus, 'Bongani Zulu',    false, false, 18, 'manual', now() - interval '1 day'),
    (v_sbus, 'Nkosi Khumalo',   false, true,   1, 'manual', now() - interval '2 days'),
    (v_sbus, 'Sandile Mthembu', false, false,  5, 'manual', now() - interval '4 days'),
    (v_sbus, 'Lwazi Ndlovu',    false, false,  9, 'manual', now() - interval '6 days'),
    (v_sbus, 'Musa Cele',       false, false, 22, 'manual', now() - interval '8 days'),
    (v_sbus, 'Sifiso Nkosi',    false, false,  4, 'manual', now() - interval '12 days');
  END IF;

  -- ── King Fades — Barbershop ────────────────────────────────────
  IF v_kingfades IS NOT NULL THEN
    INSERT INTO check_ins (venue_id, visitor_name, is_ghost, is_first_visit, visit_number, method, created_at) VALUES
    (v_kingfades, 'Mandla Sithole',  false, false,  6, 'manual', now() - interval '3 hours'),
    (v_kingfades, 'Kagiso Molefe',   false, false, 11, 'manual', now() - interval '5 hours'),
    (v_kingfades, 'Ayanda Dube',     false, true,   1, 'manual', now() - interval '1 day'),
    (v_kingfades, 'Sipho Dlamini',   false, false,  3, 'manual', now() - interval '3 days'),
    (v_kingfades, 'Thabo Mokoena',   false, false,  2, 'manual', now() - interval '5 days'),
    (v_kingfades, 'Rethabile Nkosi', false, false,  8, 'manual', now() - interval '7 days'),
    (v_kingfades, 'Sandile Mthembu', false, false, 14, 'manual', now() - interval '10 days'),
    (v_kingfades, 'Lwazi Ndlovu',    false, false,  5, 'manual', now() - interval '14 days');
  END IF;

  -- ── Sharp Edges — Barbershop ───────────────────────────────────
  IF v_sharpedges IS NOT NULL THEN
    INSERT INTO check_ins (venue_id, visitor_name, is_ghost, is_first_visit, visit_number, method, created_at) VALUES
    (v_sharpedges, 'Bongani Zulu',    false, false,  4, 'manual', now() - interval '2 hours'),
    (v_sharpedges, 'Nkosi Khumalo',   false, false,  9, 'manual', now() - interval '4 hours'),
    (v_sharpedges, 'Musa Cele',       false, true,   1, 'manual', now() - interval '1 day'),
    (v_sharpedges, 'Lungelo Ntuli',   false, false,  6, 'manual', now() - interval '2 days'),
    (v_sharpedges, 'Sifiso Nkosi',    false, false,  2, 'manual', now() - interval '4 days'),
    (v_sharpedges, 'Kagiso Molefe',   false, false, 17, 'manual', now() - interval '8 days'),
    (v_sharpedges, 'Mandla Sithole',  false, false,  3, 'manual', now() - interval '11 days'),
    (v_sharpedges, 'Ayanda Dube',     false, false,  7, 'manual', now() - interval '15 days');
  END IF;

  -- ── Naledi Hair Studio — Salon: mostly Saturdays ───────────────
  IF v_naledi IS NOT NULL THEN
    INSERT INTO check_ins (venue_id, visitor_name, is_ghost, is_first_visit, visit_number, method, created_at) VALUES
    (v_naledi, 'Nomsa Khumalo',    false, false, 14, 'manual', now() - interval '6 hours'),
    (v_naledi, 'Zanele Dlamini',   false, false,  8, 'manual', now() - interval '8 hours'),
    (v_naledi, 'Lerato Mokoena',   false, true,   1, 'manual', now() - interval '1 day'),
    (v_naledi, 'Precious Nkosi',   false, false, 21, 'manual', now() - interval '7 days'),
    (v_naledi, 'Thandeka Cele',    false, false,  5, 'manual', now() - interval '8 days'),
    (v_naledi, 'Nokwanda Zulu',    false, false, 11, 'manual', now() - interval '14 days'),
    (v_naledi, 'Amahle Mthembu',   false, false,  3, 'manual', now() - interval '15 days'),
    (v_naledi, 'Dikeledi Sithole', false, false,  7, 'manual', now() - interval '21 days'),
    (v_naledi, 'Lindiwe Ndlovu',   false, false, 16, 'manual', now() - interval '22 days');
  END IF;

  -- ── Crown & Glory — Salon ─────────────────────────────────────
  IF v_crown IS NOT NULL THEN
    INSERT INTO check_ins (venue_id, visitor_name, is_ghost, is_first_visit, visit_number, method, created_at) VALUES
    (v_crown, 'Palesa Molefe',    false, false,  9, 'manual', now() - interval '4 hours'),
    (v_crown, 'Nandi Dube',       false, false, 13, 'manual', now() - interval '7 hours'),
    (v_crown, 'Khanya Khumalo',   false, true,   1, 'manual', now() - interval '2 days'),
    (v_crown, 'Zandile Mokoena',  false, false,  6, 'manual', now() - interval '7 days'),
    (v_crown, 'Nomsa Khumalo',    false, false,  4, 'manual', now() - interval '9 days'),
    (v_crown, 'Rethabile Nkosi',  false, false, 18, 'manual', now() - interval '14 days'),
    (v_crown, 'Lerato Mokoena',   false, false,  2, 'manual', now() - interval '16 days'),
    (v_crown, 'Thandeka Cele',    false, false,  8, 'manual', now() - interval '21 days');
  END IF;

  -- ── Glam Cave — Salon ─────────────────────────────────────────
  IF v_glamcave IS NOT NULL THEN
    INSERT INTO check_ins (venue_id, visitor_name, is_ghost, is_first_visit, visit_number, method, created_at) VALUES
    (v_glamcave, 'Amahle Mthembu',   false, false,  5, 'manual', now() - interval '2 hours'),
    (v_glamcave, 'Precious Nkosi',   false, false, 10, 'manual', now() - interval '5 hours'),
    (v_glamcave, 'Zanele Dlamini',   false, true,   1, 'manual', now() - interval '1 day'),
    (v_glamcave, 'Nokwanda Zulu',    false, false,  7, 'manual', now() - interval '7 days'),
    (v_glamcave, 'Dikeledi Sithole', false, false,  3, 'manual', now() - interval '8 days'),
    (v_glamcave, 'Palesa Molefe',    false, false, 12, 'manual', now() - interval '15 days'),
    (v_glamcave, 'Nandi Dube',       false, false,  6, 'manual', now() - interval '17 days'),
    (v_glamcave, 'Lindiwe Ndlovu',   false, false,  9, 'manual', now() - interval '22 days');
  END IF;

  -- ── RockerFella Tavern — Fri/Sat heavy ────────────────────────
  IF v_rockerfella IS NOT NULL THEN
    INSERT INTO check_ins (venue_id, visitor_name, is_ghost, is_first_visit, visit_number, method, created_at) VALUES
    (v_rockerfella, 'Sipho Dlamini',   false, false, 23, 'manual', now() - interval '2 days 18 hours'),
    (v_rockerfella, 'Bongani Zulu',    false, false, 15, 'manual', now() - interval '2 days 19 hours'),
    (v_rockerfella, 'Mandla Sithole',  false, false,  8, 'manual', now() - interval '2 days 20 hours'),
    (v_rockerfella, 'Thabo Mokoena',   false, true,   1, 'manual', now() - interval '2 days 21 hours'),
    (v_rockerfella, 'Kagiso Molefe',   false, false, 11, 'manual', now() - interval '3 days 18 hours'),
    (v_rockerfella, 'Lwazi Ndlovu',    false, false,  6, 'manual', now() - interval '3 days 20 hours'),
    (v_rockerfella, 'Musa Cele',       false, false, 30, 'manual', now() - interval '9 days 19 hours'),
    (v_rockerfella, 'Sifiso Nkosi',    false, false, 17, 'manual', now() - interval '9 days 20 hours'),
    (v_rockerfella, 'Nkosi Khumalo',   false, false,  4, 'manual', now() - interval '10 days 18 hours'),
    (v_rockerfella, 'Sandile Mthembu', false, false, 26, 'manual', now() - interval '10 days 19 hours');
  END IF;

  -- ── The Corner Spot — Tavern ───────────────────────────────────
  IF v_cornerspot IS NOT NULL THEN
    INSERT INTO check_ins (venue_id, visitor_name, is_ghost, is_first_visit, visit_number, method, created_at) VALUES
    (v_cornerspot, 'Ayanda Dube',     false, false, 19, 'manual', now() - interval '2 days 17 hours'),
    (v_cornerspot, 'Rethabile Nkosi', false, false,  7, 'manual', now() - interval '2 days 20 hours'),
    (v_cornerspot, 'Musa Cele',       false, false, 12, 'manual', now() - interval '3 days 18 hours'),
    (v_cornerspot, 'Sipho Dlamini',   false, true,   1, 'manual', now() - interval '3 days 21 hours'),
    (v_cornerspot, 'Bongani Zulu',    false, false, 34, 'manual', now() - interval '9 days 19 hours'),
    (v_cornerspot, 'Mandla Sithole',  false, false, 21, 'manual', now() - interval '10 days 17 hours'),
    (v_cornerspot, 'Kagiso Molefe',   false, false,  5, 'manual', now() - interval '16 days 18 hours'),
    (v_cornerspot, 'Thabo Mokoena',   false, false, 28, 'manual', now() - interval '17 days 20 hours');
  END IF;

  -- ── KwaMahlangu Car Wash — Saturday spike ─────────────────────
  IF v_kwamahlangu IS NOT NULL THEN
    INSERT INTO check_ins (venue_id, visitor_name, is_ghost, is_first_visit, visit_number, method, created_at) VALUES
    (v_kwamahlangu, 'Lungelo Ntuli',   false, false,  8, 'manual', now() - interval '3 days 8 hours'),
    (v_kwamahlangu, 'Sipho Dlamini',   false, false, 16, 'manual', now() - interval '3 days 9 hours'),
    (v_kwamahlangu, 'Thabo Mokoena',   false, false,  4, 'manual', now() - interval '3 days 10 hours'),
    (v_kwamahlangu, 'Nomsa Khumalo',   false, true,   1, 'manual', now() - interval '3 days 11 hours'),
    (v_kwamahlangu, 'Bongani Zulu',    false, false, 22, 'manual', now() - interval '3 days 12 hours'),
    (v_kwamahlangu, 'Zanele Dlamini',  false, false,  6, 'manual', now() - interval '10 days 8 hours'),
    (v_kwamahlangu, 'Nkosi Khumalo',   false, false, 11, 'manual', now() - interval '10 days 9 hours'),
    (v_kwamahlangu, 'Mandla Sithole',  false, false,  3, 'manual', now() - interval '10 days 10 hours'),
    (v_kwamahlangu, 'Kagiso Molefe',   false, false, 18, 'manual', now() - interval '17 days 9 hours');
  END IF;

  -- ── Shine Time Car Wash ───────────────────────────────────────
  IF v_shinetime IS NOT NULL THEN
    INSERT INTO check_ins (venue_id, visitor_name, is_ghost, is_first_visit, visit_number, method, created_at) VALUES
    (v_shinetime, 'Lerato Mokoena',   false, false,  5, 'manual', now() - interval '3 days 7 hours'),
    (v_shinetime, 'Precious Nkosi',   false, false, 13, 'manual', now() - interval '3 days 9 hours'),
    (v_shinetime, 'Thandeka Cele',    false, true,   1, 'manual', now() - interval '3 days 11 hours'),
    (v_shinetime, 'Lwazi Ndlovu',     false, false,  9, 'manual', now() - interval '10 days 8 hours'),
    (v_shinetime, 'Sandile Mthembu',  false, false,  7, 'manual', now() - interval '10 days 10 hours'),
    (v_shinetime, 'Musa Cele',        false, false, 20, 'manual', now() - interval '17 days 9 hours'),
    (v_shinetime, 'Sifiso Nkosi',     false, false,  2, 'manual', now() - interval '17 days 11 hours'),
    (v_shinetime, 'Ayanda Dube',      false, false, 15, 'manual', now() - interval '24 days 8 hours');
  END IF;

  -- ── Mama's Tuckshop — daily, morning spike ────────────────────
  IF v_mamas IS NOT NULL THEN
    INSERT INTO check_ins (venue_id, visitor_name, is_ghost, is_first_visit, visit_number, method, created_at) VALUES
    (v_mamas, 'Nomsa Khumalo',    false, false, 67, 'manual', now() - interval '30 minutes'),
    (v_mamas, 'Sipho Dlamini',    false, false, 45, 'manual', now() - interval '1 hour'),
    (v_mamas, 'Zanele Dlamini',   false, false, 31, 'manual', now() - interval '2 hours'),
    (v_mamas, 'Bongani Zulu',     false, true,   1, 'manual', now() - interval '1 day 7 hours'),
    (v_mamas, 'Lerato Mokoena',   false, false, 52, 'manual', now() - interval '2 days 7 hours'),
    (v_mamas, 'Thabo Mokoena',    false, false, 28, 'manual', now() - interval '3 days 6 hours'),
    (v_mamas, 'Precious Nkosi',   false, false, 19, 'manual', now() - interval '4 days 7 hours'),
    (v_mamas, 'Nkosi Khumalo',    false, false, 83, 'manual', now() - interval '5 days 8 hours'),
    (v_mamas, 'Thandeka Cele',    false, false, 14, 'manual', now() - interval '6 days 6 hours'),
    (v_mamas, 'Mandla Sithole',   false, false, 41, 'manual', now() - interval '7 days 7 hours');
  END IF;

  -- ── Bra Steve's Spaza ─────────────────────────────────────────
  IF v_brasteve IS NOT NULL THEN
    INSERT INTO check_ins (venue_id, visitor_name, is_ghost, is_first_visit, visit_number, method, created_at) VALUES
    (v_brasteve, 'Lwazi Ndlovu',    false, false, 39, 'manual', now() - interval '1 hour'),
    (v_brasteve, 'Sandile Mthembu', false, false, 22, 'manual', now() - interval '3 hours'),
    (v_brasteve, 'Musa Cele',       false, false, 57, 'manual', now() - interval '5 hours'),
    (v_brasteve, 'Sifiso Nkosi',    false, true,   1, 'manual', now() - interval '1 day 6 hours'),
    (v_brasteve, 'Ayanda Dube',     false, false, 18, 'manual', now() - interval '2 days 8 hours'),
    (v_brasteve, 'Rethabile Nkosi', false, false, 44, 'manual', now() - interval '4 days 7 hours'),
    (v_brasteve, 'Kagiso Molefe',   false, false, 11, 'manual', now() - interval '6 days 9 hours'),
    (v_brasteve, 'Nomsa Khumalo',   false, false, 26, 'manual', now() - interval '8 days 6 hours'),
    (v_brasteve, 'Lungelo Ntuli',   false, false, 63, 'manual', now() - interval '10 days 7 hours');
  END IF;

  -- ── Corner Kiosk ──────────────────────────────────────────────
  IF v_cornerkiosk IS NOT NULL THEN
    INSERT INTO check_ins (venue_id, visitor_name, is_ghost, is_first_visit, visit_number, method, created_at) VALUES
    (v_cornerkiosk, 'Zanele Dlamini',   false, false, 34, 'manual', now() - interval '2 hours'),
    (v_cornerkiosk, 'Sipho Dlamini',    false, false, 18, 'manual', now() - interval '4 hours'),
    (v_cornerkiosk, 'Precious Nkosi',   false, true,   1, 'manual', now() - interval '6 hours'),
    (v_cornerkiosk, 'Bongani Zulu',     false, false, 47, 'manual', now() - interval '1 day 8 hours'),
    (v_cornerkiosk, 'Thandeka Cele',    false, false, 12, 'manual', now() - interval '3 days 7 hours'),
    (v_cornerkiosk, 'Nokwanda Zulu',    false, false, 29, 'manual', now() - interval '5 days 6 hours'),
    (v_cornerkiosk, 'Lerato Mokoena',   false, false,  8, 'manual', now() - interval '7 days 9 hours'),
    (v_cornerkiosk, 'Mandla Sithole',   false, false, 55, 'manual', now() - interval '10 days 7 hours');
  END IF;

  -- ── Mzansi Braai Spot — Fri evening / Sat afternoon ──────────
  IF v_mzansi IS NOT NULL THEN
    INSERT INTO check_ins (venue_id, visitor_name, is_ghost, is_first_visit, visit_number, method, created_at) VALUES
    (v_mzansi, 'Bongani Zulu',    false, false, 18, 'manual', now() - interval '2 days 14 hours'),
    (v_mzansi, 'Sipho Dlamini',   false, false, 11, 'manual', now() - interval '2 days 16 hours'),
    (v_mzansi, 'Thabo Mokoena',   false, false,  7, 'manual', now() - interval '2 days 18 hours'),
    (v_mzansi, 'Lwazi Ndlovu',    false, true,   1, 'manual', now() - interval '2 days 19 hours'),
    (v_mzansi, 'Sandile Mthembu', false, false, 24, 'manual', now() - interval '3 days 19 hours'),
    (v_mzansi, 'Musa Cele',       false, false,  9, 'manual', now() - interval '3 days 20 hours'),
    (v_mzansi, 'Nkosi Khumalo',   false, false, 31, 'manual', now() - interval '9 days 14 hours'),
    (v_mzansi, 'Sifiso Nkosi',    false, false,  5, 'manual', now() - interval '9 days 18 hours'),
    (v_mzansi, 'Mandla Sithole',  false, false, 14, 'manual', now() - interval '10 days 16 hours');
  END IF;

  -- ── Nkosi's Shisanyama — Fri/Sat/Sun ─────────────────────────
  IF v_nkosi IS NOT NULL THEN
    INSERT INTO check_ins (venue_id, visitor_name, is_ghost, is_first_visit, visit_number, method, created_at) VALUES
    (v_nkosi, 'Kagiso Molefe',   false, false, 13, 'manual', now() - interval '1 day 13 hours'),
    (v_nkosi, 'Ayanda Dube',     false, false,  6, 'manual', now() - interval '1 day 15 hours'),
    (v_nkosi, 'Rethabile Nkosi', false, false, 21, 'manual', now() - interval '2 days 14 hours'),
    (v_nkosi, 'Sipho Dlamini',   false, true,   1, 'manual', now() - interval '2 days 16 hours'),
    (v_nkosi, 'Nomsa Khumalo',   false, false,  9, 'manual', now() - interval '3 days 13 hours'),
    (v_nkosi, 'Bongani Zulu',    false, false, 17, 'manual', now() - interval '3 days 15 hours'),
    (v_nkosi, 'Lungelo Ntuli',   false, false,  4, 'manual', now() - interval '8 days 14 hours'),
    (v_nkosi, 'Zanele Dlamini',  false, false, 28, 'manual', now() - interval '9 days 15 hours');
  END IF;

  -- ── New Life Community Church — Sunday 9am-12pm ───────────────
  IF v_newlife IS NOT NULL THEN
    INSERT INTO check_ins (venue_id, visitor_name, is_ghost, is_first_visit, visit_number, method, created_at) VALUES
    (v_newlife, 'Nomsa Khumalo',    false, false, 88, 'manual', now() - interval '1 day 10 hours'),
    (v_newlife, 'Zanele Dlamini',   false, false, 52, 'manual', now() - interval '1 day 10 hours'),
    (v_newlife, 'Thandeka Cele',    false, false, 34, 'manual', now() - interval '1 day 11 hours'),
    (v_newlife, 'Precious Nkosi',   false, true,   1, 'manual', now() - interval '1 day 11 hours'),
    (v_newlife, 'Lerato Mokoena',   false, false, 76, 'manual', now() - interval '1 day 11 hours'),
    (v_newlife, 'Dikeledi Sithole', false, false, 41, 'manual', now() - interval '1 day 12 hours'),
    (v_newlife, 'Nokwanda Zulu',    false, false, 19, 'manual', now() - interval '8 days 10 hours'),
    (v_newlife, 'Lindiwe Ndlovu',   false, false, 63, 'manual', now() - interval '8 days 11 hours'),
    (v_newlife, 'Palesa Molefe',    false, false, 27, 'manual', now() - interval '8 days 11 hours'),
    (v_newlife, 'Nandi Dube',       false, false, 45, 'manual', now() - interval '8 days 12 hours');
  END IF;

  -- ── Grace Fellowship — Sunday 10am ────────────────────────────
  IF v_grace IS NOT NULL THEN
    INSERT INTO check_ins (venue_id, visitor_name, is_ghost, is_first_visit, visit_number, method, created_at) VALUES
    (v_grace, 'Khanya Khumalo',   false, false, 31, 'manual', now() - interval '1 day 10 hours'),
    (v_grace, 'Zandile Mokoena',  false, false, 17, 'manual', now() - interval '1 day 10 hours'),
    (v_grace, 'Amahle Mthembu',   false, false, 54, 'manual', now() - interval '1 day 11 hours'),
    (v_grace, 'Rethabile Nkosi',  false, true,   1, 'manual', now() - interval '1 day 11 hours'),
    (v_grace, 'Sipho Dlamini',    false, false, 22, 'manual', now() - interval '1 day 12 hours'),
    (v_grace, 'Bongani Zulu',     false, false, 38, 'manual', now() - interval '8 days 10 hours'),
    (v_grace, 'Nomsa Khumalo',    false, false, 49, 'manual', now() - interval '8 days 11 hours'),
    (v_grace, 'Thabo Mokoena',    false, false, 13, 'manual', now() - interval '8 days 11 hours');
  END IF;

  -- ── Daily Grind Café — mornings and lunch ────────────────────
  IF v_dailygrind IS NOT NULL THEN
    INSERT INTO check_ins (venue_id, visitor_name, is_ghost, is_first_visit, visit_number, method, created_at) VALUES
    (v_dailygrind, 'Nokwanda Zulu',    false, false, 24, 'manual', now() - interval '1 hour'),
    (v_dailygrind, 'Lungelo Ntuli',    false, false,  9, 'manual', now() - interval '2 hours'),
    (v_dailygrind, 'Ayanda Dube',      false, false, 17, 'manual', now() - interval '1 day 8 hours'),
    (v_dailygrind, 'Rethabile Nkosi',  false, true,   1, 'manual', now() - interval '1 day 9 hours'),
    (v_dailygrind, 'Sandile Mthembu',  false, false, 31, 'manual', now() - interval '2 days 8 hours'),
    (v_dailygrind, 'Kagiso Molefe',    false, false,  6, 'manual', now() - interval '3 days 7 hours'),
    (v_dailygrind, 'Sipho Dlamini',    false, false, 12, 'manual', now() - interval '4 days 8 hours'),
    (v_dailygrind, 'Musa Cele',        false, false, 41, 'manual', now() - interval '6 days 12 hours');
  END IF;

  -- ── Neighbourhood Café — quiet gem ────────────────────────────
  IF v_nbcafe IS NOT NULL THEN
    INSERT INTO check_ins (venue_id, visitor_name, is_ghost, is_first_visit, visit_number, method, created_at) VALUES
    (v_nbcafe, 'Palesa Molefe',    false, false, 19, 'manual', now() - interval '1 hour 30 minutes'),
    (v_nbcafe, 'Lindiwe Ndlovu',   false, false,  7, 'manual', now() - interval '3 hours'),
    (v_nbcafe, 'Nandi Dube',       false, true,   1, 'manual', now() - interval '1 day 8 hours'),
    (v_nbcafe, 'Zanele Dlamini',   false, false, 23, 'manual', now() - interval '2 days 9 hours'),
    (v_nbcafe, 'Thandeka Cele',    false, false, 11, 'manual', now() - interval '4 days 8 hours'),
    (v_nbcafe, 'Nokwanda Zulu',    false, false,  5, 'manual', now() - interval '7 days 7 hours'),
    (v_nbcafe, 'Lerato Mokoena',   false, false, 14, 'manual', now() - interval '9 days 9 hours'),
    (v_nbcafe, 'Khanya Khumalo',   false, false,  3, 'manual', now() - interval '12 days 8 hours');
  END IF;

  -- ── Fix It Fast Garage ────────────────────────────────────────
  IF v_fixitfast IS NOT NULL THEN
    INSERT INTO check_ins (venue_id, visitor_name, is_ghost, is_first_visit, visit_number, method, created_at) VALUES
    (v_fixitfast, 'Thabo Mokoena',   false, false,  4, 'manual', now() - interval '2 hours'),
    (v_fixitfast, 'Bongani Zulu',    false, false,  7, 'manual', now() - interval '1 day'),
    (v_fixitfast, 'Sipho Dlamini',   false, true,   1, 'manual', now() - interval '3 days'),
    (v_fixitfast, 'Mandla Sithole',  false, false, 11, 'manual', now() - interval '5 days'),
    (v_fixitfast, 'Sifiso Nkosi',    false, false,  3, 'manual', now() - interval '8 days'),
    (v_fixitfast, 'Lwazi Ndlovu',    false, false,  8, 'manual', now() - interval '12 days'),
    (v_fixitfast, 'Nkosi Khumalo',   false, false,  2, 'manual', now() - interval '17 days'),
    (v_fixitfast, 'Sandile Mthembu', false, false,  5, 'manual', now() - interval '22 days');
  END IF;

  -- ── Bra Themba's Workshop ─────────────────────────────────────
  IF v_brathemba IS NOT NULL THEN
    INSERT INTO check_ins (venue_id, visitor_name, is_ghost, is_first_visit, visit_number, method, created_at) VALUES
    (v_brathemba, 'Kagiso Molefe',   false, false,  6, 'manual', now() - interval '3 hours'),
    (v_brathemba, 'Ayanda Dube',     false, false,  2, 'manual', now() - interval '1 day'),
    (v_brathemba, 'Rethabile Nkosi', false, true,   1, 'manual', now() - interval '4 days'),
    (v_brathemba, 'Lungelo Ntuli',   false, false,  9, 'manual', now() - interval '7 days'),
    (v_brathemba, 'Thabo Mokoena',   false, false,  4, 'manual', now() - interval '10 days'),
    (v_brathemba, 'Bongani Zulu',    false, false, 13, 'manual', now() - interval '14 days'),
    (v_brathemba, 'Musa Cele',       false, false,  3, 'manual', now() - interval '19 days'),
    (v_brathemba, 'Sipho Dlamini',   false, false,  7, 'manual', now() - interval '24 days');
  END IF;

  -- ── Hustle Gym — Mon/Wed/Fri mornings and evenings ───────────
  IF v_hustle IS NOT NULL THEN
    INSERT INTO check_ins (venue_id, visitor_name, is_ghost, is_first_visit, visit_number, method, created_at) VALUES
    (v_hustle, 'Bongani Zulu',    false, false, 34, 'manual', now() - interval '6 hours'),
    (v_hustle, 'Sandile Mthembu', false, false, 18, 'manual', now() - interval '1 day 6 hours'),
    (v_hustle, 'Sifiso Nkosi',    false, false, 27, 'manual', now() - interval '1 day 17 hours'),
    (v_hustle, 'Thabo Mokoena',   false, true,   1, 'manual', now() - interval '2 days 6 hours'),
    (v_hustle, 'Lwazi Ndlovu',    false, false, 41, 'manual', now() - interval '3 days 6 hours'),
    (v_hustle, 'Mandla Sithole',  false, false,  9, 'manual', now() - interval '3 days 17 hours'),
    (v_hustle, 'Nkosi Khumalo',   false, false, 22, 'manual', now() - interval '5 days 6 hours'),
    (v_hustle, 'Sipho Dlamini',   false, false, 15, 'manual', now() - interval '5 days 17 hours'),
    (v_hustle, 'Musa Cele',       false, false, 53, 'manual', now() - interval '8 days 6 hours');
  END IF;

  -- ── Ferndale Morning Market — Saturdays 7am ───────────────────
  IF v_fernmarket IS NOT NULL THEN
    INSERT INTO check_ins (venue_id, visitor_name, is_ghost, is_first_visit, visit_number, method, created_at) VALUES
    (v_fernmarket, 'Nomsa Khumalo',    false, false, 15, 'manual', now() - interval '3 days 7 hours'),
    (v_fernmarket, 'Lerato Mokoena',   false, false,  8, 'manual', now() - interval '3 days 8 hours'),
    (v_fernmarket, 'Precious Nkosi',   false, false, 22, 'manual', now() - interval '3 days 9 hours'),
    (v_fernmarket, 'Thandeka Cele',    false, true,   1, 'manual', now() - interval '3 days 9 hours'),
    (v_fernmarket, 'Zanele Dlamini',   false, false, 11, 'manual', now() - interval '3 days 10 hours'),
    (v_fernmarket, 'Palesa Molefe',    false, false,  6, 'manual', now() - interval '10 days 7 hours'),
    (v_fernmarket, 'Dikeledi Sithole', false, false, 18, 'manual', now() - interval '10 days 8 hours'),
    (v_fernmarket, 'Amahle Mthembu',   false, false,  3, 'manual', now() - interval '10 days 9 hours'),
    (v_fernmarket, 'Lindiwe Ndlovu',   false, false, 27, 'manual', now() - interval '17 days 8 hours');
  END IF;

  -- ── Vibe Studio ───────────────────────────────────────────────
  IF v_vibestudio IS NOT NULL THEN
    INSERT INTO check_ins (venue_id, visitor_name, is_ghost, is_first_visit, visit_number, method, created_at) VALUES
    (v_vibestudio, 'Sifiso Nkosi',    false, false, 12, 'manual', now() - interval '4 hours'),
    (v_vibestudio, 'Musa Cele',       false, false,  7, 'manual', now() - interval '1 day'),
    (v_vibestudio, 'Lungelo Ntuli',   false, true,   1, 'manual', now() - interval '3 days'),
    (v_vibestudio, 'Ayanda Dube',     false, false, 19, 'manual', now() - interval '5 days'),
    (v_vibestudio, 'Kagiso Molefe',   false, false,  4, 'manual', now() - interval '8 days'),
    (v_vibestudio, 'Sandile Mthembu', false, false,  9, 'manual', now() - interval '12 days'),
    (v_vibestudio, 'Rethabile Nkosi', false, false, 24, 'manual', now() - interval '16 days'),
    (v_vibestudio, 'Nkosi Khumalo',   false, false,  3, 'manual', now() - interval '20 days');
  END IF;

END $$;


-- ════════════════════════════════════════════════════════════════
-- PART 4: SET FINAL REALISTIC METRICS ON ALL NEW VENUES
-- (overrides the ~8-10 counts the trigger just set)
-- ════════════════════════════════════════════════════════════════

UPDATE venues SET checkin_count = 289, regulars_count = 67,  checkins_today = 7,  checkins_this_week = 41, status = 'open',  last_checkin_at = now() - interval '1 hour'          WHERE slug = 'sbus-cuts-ferndale';
UPDATE venues SET checkin_count = 174, regulars_count = 38,  checkins_today = 5,  checkins_this_week = 29, status = 'open',  last_checkin_at = now() - interval '3 hours'         WHERE slug = 'king-fades-northcliff';
UPDATE venues SET checkin_count = 112, regulars_count = 24,  checkins_today = 4,  checkins_this_week = 19, status = 'open',  last_checkin_at = now() - interval '2 hours'         WHERE slug = 'sharp-edges-bromhof';
UPDATE venues SET checkin_count = 387, regulars_count = 81,  checkins_today = 6,  checkins_this_week = 34, status = 'busy',  last_checkin_at = now() - interval '30 minutes'      WHERE slug = 'naledi-hair-studio-blairgowrie';
UPDATE venues SET checkin_count = 521, regulars_count = 103, checkins_today = 8,  checkins_this_week = 47, status = 'busy',  last_checkin_at = now() - interval '45 minutes'      WHERE slug = 'crown-glory-salon-linden';
UPDATE venues SET checkin_count = 198, regulars_count = 44,  checkins_today = 4,  checkins_this_week = 22, status = 'open',  last_checkin_at = now() - interval '2 hours'         WHERE slug = 'glam-cave-bordeaux';
UPDATE venues SET checkin_count = 634, regulars_count = 167, checkins_today = 0,  checkins_this_week = 89, status = 'open',  last_checkin_at = now() - interval '2 days 18 hours' WHERE slug = 'rockerfella-tavern-ferndale';
UPDATE venues SET checkin_count = 412, regulars_count = 98,  checkins_today = 0,  checkins_this_week = 61, status = 'open',  last_checkin_at = now() - interval '2 days 17 hours' WHERE slug = 'the-corner-spot-randburg';
UPDATE venues SET checkin_count = 543, regulars_count = 156, checkins_today = 0,  checkins_this_week = 94, status = 'open',  last_checkin_at = now() - interval '3 days 8 hours'  WHERE slug = 'kwamahlangu-car-wash-northcliff';
UPDATE venues SET checkin_count = 267, regulars_count = 71,  checkins_today = 0,  checkins_this_week = 53, status = 'open',  last_checkin_at = now() - interval '3 days 7 hours'  WHERE slug = 'shine-time-car-wash-blairgowrie';
UPDATE venues SET checkin_count = 892, regulars_count = 143, checkins_today = 37, checkins_this_week = 218,status = 'open',  last_checkin_at = now() - interval '30 minutes'      WHERE slug = 'mamas-tuckshop-randburg';
UPDATE venues SET checkin_count = 1103,regulars_count = 211, checkins_today = 52, checkins_this_week = 289,status = 'open',  last_checkin_at = now() - interval '1 hour'          WHERE slug = 'bra-steves-spaza-ferndale';
UPDATE venues SET checkin_count = 445, regulars_count = 89,  checkins_today = 18, checkins_this_week = 121,status = 'open',  last_checkin_at = now() - interval '2 hours'         WHERE slug = 'corner-kiosk-bromhof';
UPDATE venues SET checkin_count = 478, regulars_count = 112, checkins_today = 0,  checkins_this_week = 97, status = 'open',  last_checkin_at = now() - interval '2 days 14 hours' WHERE slug = 'mzansi-braai-spot-ferndale';
UPDATE venues SET checkin_count = 312, regulars_count = 78,  checkins_today = 0,  checkins_this_week = 64, status = 'open',  last_checkin_at = now() - interval '1 day 13 hours'  WHERE slug = 'nkosis-shisanyama-northcliff';
UPDATE venues SET checkin_count = 1456,regulars_count = 298, checkins_today = 0,  checkins_this_week = 342,status = 'open',  last_checkin_at = now() - interval '1 day 10 hours'  WHERE slug = 'new-life-church-linden';
UPDATE venues SET checkin_count = 687, regulars_count = 142, checkins_today = 0,  checkins_this_week = 164,status = 'open',  last_checkin_at = now() - interval '1 day 10 hours'  WHERE slug = 'grace-fellowship-bromhof';
UPDATE venues SET checkin_count = 334, regulars_count = 87,  checkins_today = 14, checkins_this_week = 76, status = 'busy',  last_checkin_at = now() - interval '1 hour'          WHERE slug = 'daily-grind-cafe-randburg';
UPDATE venues SET checkin_count = 156, regulars_count = 41,  checkins_today = 6,  checkins_this_week = 31, status = 'quiet', last_checkin_at = now() - interval '1 hour 30 minutes'WHERE slug = 'neighbourhood-cafe-linden';
UPDATE venues SET checkin_count = 189, regulars_count = 52,  checkins_today = 2,  checkins_this_week = 14, status = 'open',  last_checkin_at = now() - interval '2 hours'         WHERE slug = 'fix-it-fast-garage-northcliff';
UPDATE venues SET checkin_count = 234, regulars_count = 61,  checkins_today = 1,  checkins_this_week = 11, status = 'open',  last_checkin_at = now() - interval '3 hours'         WHERE slug = 'bra-thembas-workshop-ferndale';
UPDATE venues SET checkin_count = 567, regulars_count = 134, checkins_today = 31, checkins_this_week = 142,status = 'busy',  last_checkin_at = now() - interval '6 hours'         WHERE slug = 'hustle-gym-randburg';
UPDATE venues SET checkin_count = 312, regulars_count = 94,  checkins_today = 0,  checkins_this_week = 87, status = 'open',  last_checkin_at = now() - interval '3 days 7 hours'  WHERE slug = 'ferndale-morning-market';
UPDATE venues SET checkin_count = 143, regulars_count = 29,  checkins_today = 3,  checkins_this_week = 18, status = 'open',  last_checkin_at = now() - interval '4 hours'         WHERE slug = 'vibe-studio-randburg';
