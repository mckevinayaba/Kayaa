-- ─────────────────────────────────────────────────────────────────────────────
-- Fourways seed — real places, real streets, real neighbourhood
-- Paste this into your Supabase SQL editor and click Run
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO venues (
  name, slug, type, description, address, location,
  latitude, longitude, status, opening_hours,
  is_active, country_code,
  checkin_count, regulars_count,
  checkins_today, checkins_this_week, checkins_last_week,
  is_verified, created_at
) VALUES

-- ── Entertainment & Landmarks ─────────────────────────────────────────────────

(
  'Montecasino',
  'montecasino-fourways',
  'Community Space',
  'The large entertainment complex on William Nicol that anchors northern Joburg''s leisure life. Casino, cinemas, restaurants, live performance venues and a market courtyard that draws foot traffic seven days a week. Whether or not you gamble, you end up here.',
  'Montecasino Boulevard, Fourways',
  'Fourways, Johannesburg',
  -26.0221, 28.0128,
  'closed', 'Open daily 24 hours',
  true, 'ZA',
  498, 120, 22, 85, 79,
  true, now() - interval '90 days'
),

-- ── Restaurants ───────────────────────────────────────────────────────────────

(
  'Tashas Fourways',
  'tashas-fourways',
  'Café',
  'The Fourways branch of the Tashas group inside Montecasino. Consistently busy from morning through to the dinner rush. The breakfast menu runs until mid-afternoon and gets used accordingly.',
  'Montecasino, Montecasino Boulevard, Fourways',
  'Fourways, Johannesburg',
  -26.0218, 28.0132,
  'closed', 'Mon–Sun 7am – 10pm',
  true, 'ZA',
  443, 107, 18, 67, 62,
  true, now() - interval '71 days'
),

(
  'The Braai Republic Fourways',
  'the-braai-republic-fourways',
  'Shisanyama',
  'An open-fire grill restaurant in Fourways that takes the braai seriously. Slow-cooked meats, proper sides and a relaxed atmosphere that makes it a regular choice for families and groups on weekends. The ribs have a dedicated following.',
  'Cranberry Street, Olivedale, Fourways',
  'Fourways, Johannesburg',
  -26.0192, 28.0111,
  'closed', 'Mon–Sun 12pm – 10pm',
  true, 'ZA',
  367, 92, 14, 54, 49,
  true, now() - interval '59 days'
),

(
  'Nando''s Fourways Mall',
  'nandos-fourways-mall',
  'Shisanyama',
  'The Fourways Mall Nando''s — always reliable, always open and always a queue at the counter between 12pm and 2pm. A fixture of the Fourways lunch circuit for the office parks nearby.',
  'Fourways Mall, Witkoppen Road, Fourways',
  'Fourways, Johannesburg',
  -26.0171, 28.0149,
  'closed', 'Mon–Sun 11am – 10pm',
  true, 'ZA',
  389, 95, 16, 61, 57,
  true, now() - interval '78 days'
),

(
  'Mugg & Bean Fourways Mall',
  'mugg-and-bean-fourways-mall',
  'Café',
  'A Fourways institution for long lunches and bottomless filter coffee. The Mugg & Bean inside Fourways Mall is where meetings happen that don''t need a boardroom, and where breakfast stretches into noon without anyone making a fuss.',
  'Fourways Mall, Witkoppen Road, Fourways',
  'Fourways, Johannesburg',
  -26.0169, 28.0151,
  'closed', 'Mon–Sun 7am – 9pm',
  true, 'ZA',
  314, 83, 12, 46, 41,
  true, now() - interval '66 days'
),

-- ── Sports Bar ────────────────────────────────────────────────────────────────

(
  'Buccaneers Sports Bar Fourways',
  'buccaneers-sports-bar-fourways',
  'Tavern',
  'A sports bar in the Montecasino area that draws a big crowd for big matches. Every screen counts, the beer is cold and the noise level tells you exactly how the game is going. Walk-in on match days at your own risk.',
  'Montecasino, Fourways',
  'Fourways, Johannesburg',
  -26.0224, 28.0121,
  'closed', 'Mon–Sun 11am – late',
  true, 'ZA',
  356, 98, 13, 50, 46,
  true, now() - interval '55 days'
),

-- ── Health Food ───────────────────────────────────────────────────────────────

(
  'Kauai Fourways Mall',
  'kauai-fourways-mall',
  'Café',
  'Health food for the Fourways lunch and gym crowd. The post-workout smoothie and the açaí bowl are two of the more consistently ordered items. Gets busiest between 12pm and 2pm on weekdays.',
  'Fourways Mall, Witkoppen Road, Fourways',
  'Fourways, Johannesburg',
  -26.0173, 28.0147,
  'closed', 'Mon–Sun 8am – 8pm',
  true, 'ZA',
  278, 71, 11, 42, 38,
  true, now() - interval '48 days'
),

-- ── Gym ───────────────────────────────────────────────────────────────────────

(
  'Planet Fitness Fourways',
  'planet-fitness-fourways',
  'Gym',
  'The Fourways branch of Planet Fitness off William Nicol. Large floor, full cardio and weights area, and a membership base that takes early morning seriously. The 6am rush is real and the 6pm rush is bigger.',
  'William Nicol Drive, Fourways',
  'Fourways, Johannesburg',
  -26.0198, 28.0105,
  'closed', 'Mon–Fri 5:30am – 10pm · Sat–Sun 7am – 6pm',
  true, 'ZA',
  412, 118, 17, 65, 60,
  true, now() - interval '83 days'
),

-- ── Church ────────────────────────────────────────────────────────────────────

(
  'Graceland Assembly of God',
  'graceland-assembly-fourways',
  'Church',
  'One of the largest and most established churches in the Fourways area. Sunday services run across multiple sessions and draw a congregation that comes from well beyond the immediate neighbourhood. Midweek programmes are consistently attended.',
  'Witkoppen Road, Fourways',
  'Fourways, Johannesburg',
  -26.0181, 28.0162,
  'closed', 'Sunday services 7am · 9am · 11am · Wed evening 6:30pm',
  true, 'ZA',
  287, 114, 0, 6, 9,
  true, now() - interval '87 days'
),

-- ── Barbershop ────────────────────────────────────────────────────────────────

(
  'The Cut Room Barbershop Fourways',
  'the-cut-room-barbershop-fourways',
  'Barbershop',
  'A barbershop in the Fourways residential area that serves the neighbourhood, not the mall crowd. Walk-ins are welcome, the prices have not moved unreasonably, and the barbers have been here long enough that the regulars book by WhatsApp.',
  'Cnr Uranium & Nickel Streets, Lonehill, Fourways',
  'Fourways, Johannesburg',
  -26.0163, 28.0178,
  'closed', 'Mon–Sat 8am – 7pm',
  true, 'ZA',
  189, 57, 8, 31, 27,
  false, now() - interval '27 days'
),

-- ── Salon ─────────────────────────────────────────────────────────────────────

(
  'Glam Hair Studio Fourways',
  'glam-hair-studio-fourways',
  'Salon',
  'A full-service hair salon in the Fourways area catering to the residential community. Does braids, weaves, relaxers and treatments. Consistent results, good pricing for the area and a regular client base that books weeks ahead.',
  'Fourways, Johannesburg',
  'Fourways, Johannesburg',
  -26.0189, 28.0139,
  'closed', 'Mon–Sat 8am – 7pm',
  true, 'ZA',
  156, 48, 6, 23, 20,
  false, now() - interval '24 days'
),

-- ── Carwash ───────────────────────────────────────────────────────────────────

(
  'Witkoppen Hand Car Wash',
  'witkoppen-hand-car-wash-fourways',
  'Carwash',
  'A hand car wash on Witkoppen Road that the Fourways residential community relies on. Thorough interior and exterior clean, fair pricing and a Saturday morning queue that tells you word has spread. Valet standard for a reasonable price.',
  'Witkoppen Road, Fourways',
  'Fourways, Johannesburg',
  -26.0177, 28.0155,
  'closed', 'Mon–Sat 7:30am – 5:30pm',
  true, 'ZA',
  134, 42, 5, 20, 17,
  false, now() - interval '18 days'
),

-- ── Mechanic ─────────────────────────────────────────────────────────────────

(
  'Fourways Auto Clinic',
  'fourways-auto-clinic',
  'Mechanic',
  'A mechanic workshop off William Nicol that the area''s residents trust to tell them what actually needs fixing. Does services, diagnostics, brakes and tyres. Pricing is transparent and the turnaround on a standard service is usually same-day.',
  'William Nicol Drive, Fourways',
  'Fourways, Johannesburg',
  -26.0204, 28.0098,
  'closed', 'Mon–Fri 7:30am – 5:30pm · Sat 8am – 1pm',
  true, 'ZA',
  112, 38, 3, 12, 10,
  false, now() - interval '15 days'
),

-- ── Spaza ─────────────────────────────────────────────────────────────────────

(
  'Lonehill Corner Spaza',
  'lonehill-corner-spaza-fourways',
  'Spaza Shop',
  'The spaza serving the Lonehill residential pocket of Fourways. Stocks the basics — bread, airtime, cold drinks, eggs, snacks — and stays open longer than any of the chains nearby. A neighbourhood essential that fills the gaps the mall cannot.',
  'Lonehill, Fourways',
  'Fourways, Johannesburg',
  -26.0158, 28.0183,
  'closed', 'Mon–Sun 7am – 9pm',
  true, 'ZA',
  143, 44, 7, 27, 24,
  false, now() - interval '12 days'
),

-- ── Tutoring ──────────────────────────────────────────────────────────────────

(
  'Fourways Tutoring Centre',
  'fourways-tutoring-centre',
  'Tutoring',
  'An after-school tutoring centre serving Fourways and the surrounding suburbs. Covers maths, science, English and accounting from Grade 8 through to matric. Small groups, consistent tutors and a pass rate the centre is prepared to stand behind.',
  'Fourways, Johannesburg',
  'Fourways, Johannesburg',
  -26.0185, 28.0141,
  'closed', 'Mon–Fri 2pm – 7pm · Sat 8am – 1pm',
  true, 'ZA',
  97, 34, 4, 16, 13,
  false, now() - interval '7 days'
);
