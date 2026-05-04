-- ─────────────────────────────────────────────────────────────────────────────
-- Braamfontein seed — real places, real streets, real neighbourhood
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

-- ── Markets & Community ───────────────────────────────────────────────────────

(
  'Neighbourgoods Market',
  'neighbourgoods-market-braamfontein',
  'Market',
  'The original Saturday market in Johannesburg. Fresh produce, local makers, street food and live music every Saturday morning on Juta Street. If Braamfontein has a heartbeat, this is it.',
  '73 Juta Street, Braamfontein',
  'Braamfontein, Johannesburg',
  -26.1958, 28.0451,
  'closed', 'Saturday 9am – 3pm',
  true, 'ZA',
  312, 87, 4, 18, 14,
  true, now() - interval '60 days'
),

-- ── Cafés & Coffee ────────────────────────────────────────────────────────────

(
  'Lucky Bean',
  'lucky-bean-braamfontein',
  'Café',
  'A neighbourhood favourite on Juta Street. Good coffee, real food, and the kind of vibe that makes you stay longer than you planned. Popular with Wits students and creatives.',
  'Neighbourgoods Square, Juta Street, Braamfontein',
  'Braamfontein, Johannesburg',
  -26.1952, 28.0453,
  'closed', 'Mon–Fri 7am – 5pm · Sat 8am – 3pm',
  true, 'ZA',
  189, 54, 6, 22, 19,
  false, now() - interval '45 days'
),

(
  'Thirdwave Coffee Roasters',
  'thirdwave-coffee-braamfontein',
  'Café',
  'Specialty coffee roasted in-house. One of the best cups in Johannesburg, served in a space that takes coffee seriously without taking itself too seriously.',
  '48 Hoofd Street, Braamfontein',
  'Braamfontein, Johannesburg',
  -26.1935, 28.0462,
  'closed', 'Mon–Fri 7am – 4pm · Sat 8am – 2pm',
  true, 'ZA',
  143, 41, 5, 17, 12,
  false, now() - interval '30 days'
),

(
  'Salvation Café',
  'salvation-cafe-braamfontein',
  'Café',
  'Tucked into the creative fabric of Braamfontein. Known for good coffee, homemade food and a crowd that ranges from architects to street vendors.',
  'De Korte Street, Braamfontein',
  'Braamfontein, Johannesburg',
  -26.1942, 28.0455,
  'closed', 'Mon–Sat 8am – 5pm',
  true, 'ZA',
  98, 29, 3, 11, 9,
  false, now() - interval '20 days'
),

-- ── Bars & Nightlife ──────────────────────────────────────────────────────────

(
  'Kitcheners Carvery Bar',
  'kitcheners-carvery-bar-braamfontein',
  'Tavern',
  'The kind of bar that feels like it has always been there. Craft beers, weekly specials, a rooftop that fills up on Friday evenings, and a regular crowd that actually knows each other.',
  'Corner De Beer & Juta Street, Braamfontein',
  'Braamfontein, Johannesburg',
  -26.1945, 28.0447,
  'closed', 'Tue–Sun 12pm – late',
  true, 'ZA',
  267, 73, 8, 31, 27,
  true, now() - interval '55 days'
),

(
  'The Orbit Jazz Club',
  'the-orbit-jazz-club-braamfontein',
  'Live Music Venue',
  'Johannesburg''s premier jazz venue. Live performances Thursday through Sunday, exceptional sound system, and a room that has hosted some of the best musicians in the country.',
  '81 De Korte Street, Braamfontein',
  'Braamfontein, Johannesburg',
  -26.1948, 28.0439,
  'closed', 'Thu–Sun from 8pm',
  true, 'ZA',
  201, 68, 2, 9, 12,
  true, now() - interval '40 days'
),

(
  'Assembly',
  'assembly-braamfontein',
  'Live Music Venue',
  'Underground live music and club nights in the heart of Braamfontein. Hosts everything from indie bands to deep house sets. One of the most important venues on the Joburg music scene.',
  'Goud Street, Braamfontein',
  'Braamfontein, Johannesburg',
  -26.1963, 28.0444,
  'closed', 'Fri–Sat from 9pm',
  true, 'ZA',
  178, 52, 0, 6, 8,
  false, now() - interval '35 days'
),

-- ── Food ─────────────────────────────────────────────────────────────────────

(
  'Fuze Chicken Braamfontein',
  'fuze-chicken-braamfontein',
  'Shisanyama',
  'Flame-grilled chicken done right. A go-to for the lunch crowd and late-night eaters. Quick, affordable and always busy. The kind of place that feeds the neighbourhood.',
  'Juta Street, Braamfontein',
  'Braamfontein, Johannesburg',
  -26.1953, 28.0458,
  'closed', 'Mon–Sun 10am – 10pm',
  true, 'ZA',
  224, 61, 12, 44, 38,
  false, now() - interval '25 days'
),

(
  'Nando''s Braamfontein',
  'nandos-braamfontein',
  'Shisanyama',
  'The Braamfontein Nando''s — consistently good, always open, and the place where Wits students have been eating between lectures for years.',
  'Juta Street, Braamfontein',
  'Braamfontein, Johannesburg',
  -26.1956, 28.0460,
  'closed', 'Mon–Sun 11am – 10pm',
  true, 'ZA',
  331, 89, 14, 51, 47,
  false, now() - interval '50 days'
),

-- ── Barbershops & Salons ──────────────────────────────────────────────────────

(
  'Conscious Barbershop',
  'conscious-barbershop-braamfontein',
  'Barbershop',
  'Not just a cut — a conversation. Known in the neighbourhood for clean fades, honest talk and a chair that feels like a community meeting point. Walk-ins welcome.',
  'Juta Street, Braamfontein',
  'Braamfontein, Johannesburg',
  -26.1950, 28.0465,
  'closed', 'Mon–Sat 8am – 7pm',
  true, 'ZA',
  156, 48, 7, 28, 24,
  false, now() - interval '18 days'
),

(
  'Juta Street Hair Studio',
  'juta-street-hair-studio-braamfontein',
  'Salon',
  'A full-service salon on Juta Street that has been doing hair in Braamfontein for years. From braids to colour, the team knows what they are doing and the pricing is fair.',
  'Juta Street, Braamfontein',
  'Braamfontein, Johannesburg',
  -26.1951, 28.0467,
  'closed', 'Mon–Sat 8am – 7pm',
  true, 'ZA',
  112, 34, 4, 16, 13,
  false, now() - interval '15 days'
),

-- ── Community & Culture ───────────────────────────────────────────────────────

(
  'Curiocity Backpackers',
  'curiocity-backpackers-braamfontein',
  'Community Space',
  'Braamfontein''s creative hostel and community hub. Art on every wall, events most weekends, a rooftop bar and a crowd that mixes locals with travellers from everywhere.',
  '36 Gerard Sekoto Street, Braamfontein',
  'Braamfontein, Johannesburg',
  -26.1937, 28.0461,
  'closed', 'Open daily',
  true, 'ZA',
  134, 37, 3, 14, 11,
  true, now() - interval '42 days'
),

(
  'The Living Room Joburg',
  'the-living-room-joburg-braamfontein',
  'Community Space',
  'A creative workspace, event space and gathering point for Johannesburg''s independent thinkers. Runs regular talks, workshops and pop-ups that feel genuinely worth attending.',
  'Juta Street, Braamfontein',
  'Braamfontein, Johannesburg',
  -26.1940, 28.0452,
  'closed', 'Mon–Fri 9am – 6pm',
  true, 'ZA',
  89, 27, 2, 9, 7,
  false, now() - interval '12 days'
),

-- ── Retail & Spaza ────────────────────────────────────────────────────────────

(
  'FAFI Braamfontein',
  'fafi-braamfontein',
  'Spaza Shop',
  'Johannesburg streetwear and culture in one store. Supports local designers, stocks things you won''t find in the mall, and knows exactly what the neighbourhood is wearing.',
  'Juta Street, Braamfontein',
  'Braamfontein, Johannesburg',
  -26.1955, 28.0449,
  'closed', 'Mon–Sat 10am – 6pm',
  true, 'ZA',
  96, 28, 2, 10, 8,
  false, now() - interval '22 days'
),

(
  'Wits Corner Spaza',
  'wits-corner-spaza-braamfontein',
  'Spaza Shop',
  'The spaza that has fed generations of Wits students. Stock changes daily, pricing is honest, and the owner knows every regular by name. Essential to the daily life of this block.',
  'Yale Road, Braamfontein',
  'Braamfontein, Johannesburg',
  -26.1928, 28.0453,
  'closed', 'Mon–Sat 7am – 9pm · Sun 8am – 6pm',
  true, 'ZA',
  178, 52, 9, 34, 31,
  false, now() - interval '8 days'
),

-- ── Car Wash ─────────────────────────────────────────────────────────────────

(
  'Juta Street Car Wash',
  'juta-street-car-wash-braamfontein',
  'Carwash',
  'A proper hand wash on Juta Street. The kind of place where the football debate is as long as the queue, and the queue is worth it. Open six days a week, rain or shine.',
  'Juta Street, Braamfontein',
  'Braamfontein, Johannesburg',
  -26.1957, 28.0443,
  'closed', 'Mon–Sat 8am – 6pm',
  true, 'ZA',
  87, 24, 3, 12, 10,
  false, now() - interval '10 days'
),

-- ── Church ────────────────────────────────────────────────────────────────────

(
  'Central Methodist Mission',
  'central-methodist-mission-braamfontein',
  'Church',
  'One of the most historically significant churches in Johannesburg. Known not just for Sunday services but for its role in the community — housing, feeding and standing with the city through everything.',
  'Corner Smal & Wolf Street, Johannesburg CBD',
  'Braamfontein, Johannesburg',
  -26.2039, 28.0437,
  'closed', 'Sunday services 7am · 9am · 11am',
  true, 'ZA',
  145, 67, 0, 3, 5,
  true, now() - interval '70 days'
),

-- ── Gym / Fitness ─────────────────────────────────────────────────────────────

(
  'Planet Fitness Braamfontein',
  'planet-fitness-braamfontein',
  'Gym',
  'The gym that a large chunk of Braamfontein''s daily routine runs through. Open early, open late, equipment that works and a floor that fills up at 6am and again at 6pm.',
  'De Korte Street, Braamfontein',
  'Braamfontein, Johannesburg',
  -26.1933, 28.0470,
  'closed', 'Mon–Fri 5:30am – 10pm · Sat–Sun 7am – 6pm',
  true, 'ZA',
  203, 71, 11, 43, 39,
  false, now() - interval '28 days'
),

-- ── Tutoring / Education ──────────────────────────────────────────────────────

(
  'Wits Maths Connect',
  'wits-maths-connect-braamfontein',
  'Tutoring',
  'A tutoring and academic support space connected to the Wits community. Helps students from around Johannesburg with maths, science and access to university-level learning.',
  'Wits University Campus, Braamfontein',
  'Braamfontein, Johannesburg',
  -26.1927, 28.0304,
  'closed', 'Mon–Fri 8am – 5pm',
  true, 'ZA',
  76, 22, 2, 8, 6,
  false, now() - interval '14 days'
),

-- ── Mechanic ─────────────────────────────────────────────────────────────────

(
  'Braamfontein Auto & Panel',
  'braamfontein-auto-panel',
  'Mechanic',
  'The mechanic on De Beer Street that the neighbourhood actually trusts. No surprises on the bill, honest about what needs fixing and what can wait. Been here longer than most buildings on this block.',
  'De Beer Street, Braamfontein',
  'Braamfontein, Johannesburg',
  -26.1944, 28.0441,
  'closed', 'Mon–Fri 7:30am – 5:30pm · Sat 8am – 1pm',
  true, 'ZA',
  91, 31, 2, 8, 7,
  false, now() - interval '6 days'
);
