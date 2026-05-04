-- ─────────────────────────────────────────────────────────────────────────────
-- Maboneng Precinct seed — real places, real streets, real neighbourhood
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
  'Arts on Main',
  'arts-on-main-maboneng',
  'Market',
  'The anchor of Maboneng. A converted warehouse on Fox Street that houses galleries, studios, pop-up markets, restaurants and creative offices. The Sunday market is the busiest day — local food, art and craft vendors filling the courtyard from mid-morning.',
  '264 Fox Street, Maboneng',
  'Maboneng, Johannesburg',
  -26.2013, 28.0681,
  'closed', 'Tue–Sun 10am – 6pm · Sunday Market 10am – 3pm',
  true, 'ZA',
  498, 119, 21, 82, 75,
  true, now() - interval '85 days'
),

(
  'Post Office Market Maboneng',
  'post-office-market-maboneng',
  'Market',
  'A weekend market set up in and around the old post office building on Main Street. Local producers, secondhand goods, street food and an informal atmosphere that draws more of the neighbourhood than the tourist trade.',
  'Main Street, Maboneng',
  'Maboneng, Johannesburg',
  -26.2031, 28.0674,
  'closed', 'Saturday–Sunday 9am – 3pm',
  true, 'ZA',
  213, 57, 7, 29, 25,
  false, now() - interval '42 days'
),

-- ── Cinema ────────────────────────────────────────────────────────────────────

(
  'The Bioscope Independent Cinema',
  'the-bioscope-maboneng',
  'Live Music Venue',
  'Johannesburg''s independent cinema on Fox Street. Screens local and international films that don''t get mainstream distribution. Also hosts live events, Q&As with directors and occasional live performances. One of the most important cultural spaces in the city.',
  '286 Fox Street, Maboneng',
  'Maboneng, Johannesburg',
  -26.2017, 28.0678,
  'closed', 'Screenings vary — check programme',
  true, 'ZA',
  342, 94, 8, 33, 29,
  true, now() - interval '76 days'
),

-- ── Bars & Nightlife ──────────────────────────────────────────────────────────

(
  'Great Dane',
  'great-dane-maboneng',
  'Live Music Venue',
  'A bar and music venue on Fox Street that has been central to Johannesburg''s independent music scene for years. Live acts most weekends, a sound system that is taken seriously, and a regular crowd that comes for the music first and the drinks second.',
  '228 Fox Street, Maboneng',
  'Maboneng, Johannesburg',
  -26.2009, 28.0684,
  'closed', 'Wed–Sat 6pm – late',
  true, 'ZA',
  287, 79, 4, 19, 22,
  true, now() - interval '68 days'
),

(
  'House of Machines Johannesburg',
  'house-of-machines-maboneng',
  'Tavern',
  'A bar, coffee shop and culture space rolled into one on Fox Street. Motorcycles on the wall, cocktails on the counter, and a crowd that is hard to categorise. One of Maboneng''s most reliably atmospheric stops.',
  '249 Fox Street, Maboneng',
  'Maboneng, Johannesburg',
  -26.2022, 28.0677,
  'closed', 'Tue–Sat 10am – late · Sun 10am – 6pm',
  true, 'ZA',
  261, 71, 9, 36, 32,
  true, now() - interval '58 days'
),

(
  'Maxitendance Bar & Restaurant',
  'maxitendance-maboneng',
  'Tavern',
  'A long-running bar and restaurant in Maboneng that predates much of the precinct''s development. Busy on weekends, relaxed midweek. Serves food alongside a solid drinks selection. One of the spaces that has kept the neighbourhood''s original energy.',
  'Main Street, Maboneng',
  'Maboneng, Johannesburg',
  -26.2035, 28.0671,
  'closed', 'Mon–Sun 11am – late',
  true, 'ZA',
  234, 66, 10, 39, 35,
  false, now() - interval '51 days'
),

-- ── Cafés & Food ──────────────────────────────────────────────────────────────

(
  'Lekker Vegan',
  'lekker-vegan-maboneng',
  'Café',
  'One of the best-known plant-based spots in Johannesburg. Runs out of the Maboneng area and serves food that is genuinely good, not just acceptable for what it isn''t. The burgers and bao buns have a dedicated following. Gets busy fast at lunch.',
  'Arts on Main, 264 Fox Street, Maboneng',
  'Maboneng, Johannesburg',
  -26.2015, 28.0680,
  'closed', 'Tue–Sun 11am – 7pm',
  true, 'ZA',
  318, 88, 14, 53, 48,
  true, now() - interval '63 days'
),

(
  'Urbanologi',
  'urbanologi-maboneng',
  'Café',
  'A café and bistro inside the Arts on Main complex. Good coffee, a menu that changes with what is available and a space that fills up on weekend mornings without becoming unbearable. Popular with the gallery crowd and studio tenants.',
  '264 Fox Street, Maboneng',
  'Maboneng, Johannesburg',
  -26.2014, 28.0682,
  'closed', 'Tue–Sun 8am – 5pm',
  true, 'ZA',
  176, 49, 7, 27, 23,
  false, now() - interval '37 days'
),

-- ── Tattoo & Ink ──────────────────────────────────────────────────────────────

(
  'Tribal Ink Tattoo',
  'tribal-ink-maboneng',
  'Community Space',
  'A tattoo studio that has been part of the Maboneng scene since the precinct''s early days. The artists do quality work across styles. Walk-ins are accommodated but booking for bigger pieces is strongly advised.',
  'Main Street, Maboneng',
  'Maboneng, Johannesburg',
  -26.2028, 28.0675,
  'closed', 'Tue–Sat 10am – 7pm',
  true, 'ZA',
  143, 39, 3, 13, 11,
  false, now() - interval '29 days'
),

-- ── Barbershop ────────────────────────────────────────────────────────────────

(
  'Main Street Barbershop Maboneng',
  'main-street-barbershop-maboneng',
  'Barbershop',
  'A barbershop on Main Street that serves the neighbourhood — not the visitor trade. Walk-in only, pricing is fair and the wait on weekends is the cost of going to the only spot the regulars trust.',
  'Main Street, Maboneng',
  'Maboneng, Johannesburg',
  -26.2033, 28.0668,
  'closed', 'Mon–Sat 8am – 7pm',
  true, 'ZA',
  167, 51, 8, 31, 28,
  false, now() - interval '16 days'
),

-- ── Community Spaces ──────────────────────────────────────────────────────────

(
  'Hallmark House Rooftop',
  'hallmark-house-rooftop-maboneng',
  'Community Space',
  'The rooftop space at Hallmark House is one of Johannesburg''s better elevated spots — views across the inner city, a bar that operates on weekends and a flexible event space used for art shows, markets and music nights.',
  'Hallmark House, 20 Selby Street, Maboneng',
  'Maboneng, Johannesburg',
  -26.2021, 28.0669,
  'closed', 'Fri–Sun evenings and event nights',
  true, 'ZA',
  192, 53, 5, 22, 19,
  true, now() - interval '54 days'
),

(
  'Maboneng Community Studio',
  'maboneng-community-studio',
  'Community Space',
  'A shared creative studio and rehearsal space used by musicians, dancers, photographers and community groups throughout the week. Hosts open sessions on Saturdays. Low-cost access is the whole point.',
  'Fox Street, Maboneng',
  'Maboneng, Johannesburg',
  -26.2019, 28.0686,
  'closed', 'Mon–Sat 9am – 8pm',
  true, 'ZA',
  89, 28, 2, 9, 8,
  false, now() - interval '23 days'
),

-- ── Salon ─────────────────────────────────────────────────────────────────────

(
  'Fox Street Beauty Salon',
  'fox-street-beauty-salon-maboneng',
  'Salon',
  'A salon serving the residential and working community of Maboneng. Does braids, extensions, treatments and nails. Straightforward pricing and a team that has built up a loyal client base without needing to advertise.',
  'Fox Street, Maboneng',
  'Maboneng, Johannesburg',
  -26.2025, 28.0683,
  'closed', 'Mon–Sat 8am – 7pm',
  true, 'ZA',
  121, 37, 4, 17, 14,
  false, now() - interval '11 days'
),

-- ── Shisanyama ────────────────────────────────────────────────────────────────

(
  'The Shisanyama at Arts on Main',
  'shisanyama-arts-on-main-maboneng',
  'Shisanyama',
  'An open-fire grill set up in the Arts on Main courtyard. Weekend afternoons only. Pap, vleis and chakalaka the way it should be — smoke, noise and a queue that tells you it''s worth the wait.',
  '264 Fox Street, Maboneng',
  'Maboneng, Johannesburg',
  -26.2012, 28.0679,
  'closed', 'Saturday–Sunday 12pm – 6pm',
  true, 'ZA',
  204, 62, 11, 43, 39,
  false, now() - interval '32 days'
),

-- ── Spaza ─────────────────────────────────────────────────────────────────────

(
  'Main Street Corner Spaza',
  'main-street-corner-spaza-maboneng',
  'Spaza Shop',
  'The spaza at the corner of Main and Fox that stocks what the residential part of Maboneng runs on. Airtime, cold drinks, bread, snacks and a few things you didn''t know you needed. Open later than anyone else on the block.',
  'Corner Main Street & Fox Street, Maboneng',
  'Maboneng, Johannesburg',
  -26.2029, 28.0672,
  'closed', 'Mon–Sun 7am – 10pm',
  true, 'ZA',
  158, 46, 9, 35, 32,
  false, now() - interval '9 days'
);
