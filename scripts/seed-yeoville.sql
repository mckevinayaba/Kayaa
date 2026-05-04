-- ─────────────────────────────────────────────────────────────────────────────
-- Yeoville seed — real places, real streets, real neighbourhood
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

-- ── Cafés & Ethiopian Food ────────────────────────────────────────────────────

(
  'Rocko''s Café',
  'rockos-cafe-yeoville',
  'Café',
  'The Ethiopian spot that put Yeoville on the map for serious food lovers. Injera, tibs and tej in a room that is always full of people who know exactly what they are ordering. Rocky Street landmark.',
  '31 Rocky Street, Yeoville',
  'Yeoville, Johannesburg',
  -26.1842, 28.0661,
  'closed', 'Mon–Sun 10am – 10pm',
  true, 'ZA',
  287, 81, 11, 38, 33,
  true, now() - interval '75 days'
),

(
  'Lalibela Ethiopian Restaurant',
  'lalibela-ethiopian-yeoville',
  'Café',
  'Family-run Ethiopian restaurant on Rocky Street with a loyal following. Communal dining, generous portions and the kind of slow-cooked stews that take all day to prepare. Cash only.',
  '18 Rocky Street, Yeoville',
  'Yeoville, Johannesburg',
  -26.1847, 28.0655,
  'closed', 'Tue–Sun 11am – 9pm',
  true, 'ZA',
  198, 57, 7, 24, 21,
  false, now() - interval '50 days'
),

(
  'Addis in Cape — Yeoville Branch',
  'addis-yeoville',
  'Café',
  'A Yeoville outpost of one of South Africa''s best-known Ethiopian restaurants. The combination platter feeds two comfortably. The tej is worth ordering. Quietly essential to this strip.',
  '44 Rocky Street, Yeoville',
  'Yeoville, Johannesburg',
  -26.1838, 28.0668,
  'closed', 'Mon–Sun 11am – 10pm',
  true, 'ZA',
  174, 49, 5, 19, 17,
  false, now() - interval '38 days'
),

-- ── Taverns & Nightlife ───────────────────────────────────────────────────────

(
  'Tandoor Tavern',
  'tandoor-tavern-yeoville',
  'Tavern',
  'A Rocky Street stalwart. Cold beer, loud conversation and a television that is always showing football. The crowd is mixed, the hours are long and the prices are what you expect in Yeoville.',
  '7 Rocky Street, Yeoville',
  'Yeoville, Johannesburg',
  -26.1851, 28.0648,
  'closed', 'Mon–Sun 11am – 1am',
  true, 'ZA',
  231, 64, 9, 33, 29,
  false, now() - interval '62 days'
),

(
  'The Highlander Bar',
  'the-highlander-bar-yeoville',
  'Tavern',
  'One of the longer-running taverns in Yeoville. Known for its weekend vibe, cheap jugs and a clientele that has been coming here for over a decade. The pool table rarely sits idle.',
  '22 Rockey Street, Yeoville',
  'Yeoville, Johannesburg',
  -26.1844, 28.0672,
  'closed', 'Wed–Sun 3pm – 2am',
  true, 'ZA',
  189, 53, 6, 27, 24,
  false, now() - interval '44 days'
),

-- ── Shisanyama & Street Food ──────────────────────────────────────────────────

(
  'Yeoville Braai Spot',
  'yeoville-braai-spot-yeoville',
  'Shisanyama',
  'An open-air shisanyama operating off Raleigh Street. Lamb chops, boerewors and chicken over real coals. The kind of braai you smell before you see it. Fills up on Friday afternoons.',
  'Raleigh Street, Yeoville',
  'Yeoville, Johannesburg',
  -26.1859, 28.0653,
  'closed', 'Fri–Sun 12pm – 10pm',
  true, 'ZA',
  143, 38, 4, 18, 15,
  false, now() - interval '28 days'
),

-- ── Barbershops ───────────────────────────────────────────────────────────────

(
  'Rocky Street Barbers',
  'rocky-street-barbers-yeoville',
  'Barbershop',
  'A straight-up barbershop with no frills and no nonsense. Clean fades, competitive pricing and a waiting bench that turns into a neighbourhood news desk most mornings. Walk-ins always welcome.',
  '11 Rocky Street, Yeoville',
  'Yeoville, Johannesburg',
  -26.1849, 28.0659,
  'closed', 'Mon–Sat 8am – 7pm',
  true, 'ZA',
  167, 47, 8, 29, 26,
  false, now() - interval '19 days'
),

(
  'King Cuts Barbershop',
  'king-cuts-barbershop-yeoville',
  'Barbershop',
  'Tucked into a side street off Rockey, King Cuts is where the regulars go. The barber has been cutting in Yeoville for over eight years and knows his clients well. Appointments preferred on weekends.',
  'Cavendish Street, Yeoville',
  'Yeoville, Johannesburg',
  -26.1856, 28.0641,
  'closed', 'Tue–Sun 9am – 6pm',
  true, 'ZA',
  118, 36, 5, 20, 17,
  false, now() - interval '14 days'
),

-- ── Salons ────────────────────────────────────────────────────────────────────

(
  'Nadia''s Hair & Nails',
  'nadias-hair-nails-yeoville',
  'Salon',
  'A full-service salon on Raleigh Street that does braids, weaves, relaxers and nails. Long hours, reasonable prices and a social atmosphere that means appointments often run over.',
  'Raleigh Street, Yeoville',
  'Yeoville, Johannesburg',
  -26.1861, 28.0649,
  'closed', 'Mon–Sat 8am – 8pm',
  true, 'ZA',
  134, 41, 6, 23, 20,
  false, now() - interval '22 days'
),

-- ── Spaza Shops ───────────────────────────────────────────────────────────────

(
  'Abe''s Yeoville Spaza',
  'abes-yeoville-spaza',
  'Spaza Shop',
  'A well-stocked spaza at the corner of Rockey and Fortesque. Open before most of the street wakes up and still going when the bars close. The owner knows the neighbourhood block by block.',
  'Corner Rockey & Fortesque Streets, Yeoville',
  'Yeoville, Johannesburg',
  -26.1853, 28.0663,
  'closed', 'Mon–Sun 6am – 11pm',
  true, 'ZA',
  201, 58, 13, 44, 40,
  false, now() - interval '55 days'
),

(
  'Sunrise General Store',
  'sunrise-general-store-yeoville',
  'Spaza Shop',
  'General dealer on Cavendish Street that stocks everything from airtime to cooking oil to cold drinks. A daily stop for half the street. Has been in the same family for years.',
  'Cavendish Street, Yeoville',
  'Yeoville, Johannesburg',
  -26.1858, 28.0644,
  'closed', 'Mon–Sun 7am – 10pm',
  true, 'ZA',
  156, 45, 10, 35, 31,
  false, now() - interval '33 days'
),

-- ── Carwash ───────────────────────────────────────────────────────────────────

(
  'Raleigh Street Hand Wash',
  'raleigh-street-hand-wash-yeoville',
  'Carwash',
  'A busy hand wash on Raleigh Street with a short wait and a fair price. Popular with Saturday morning traffic. The guys do a proper interior vacuum if you ask and tip accordingly.',
  'Raleigh Street, Yeoville',
  'Yeoville, Johannesburg',
  -26.1863, 28.0651,
  'closed', 'Mon–Sat 8am – 5pm',
  true, 'ZA',
  88, 22, 3, 12, 10,
  false, now() - interval '11 days'
),

-- ── Church ────────────────────────────────────────────────────────────────────

(
  'St Anthony of Padua Catholic Church',
  'st-anthony-padua-yeoville',
  'Church',
  'A long-standing Catholic parish in Yeoville that has served the neighbourhood through decades of change. Sunday Mass draws a congregation that reflects the full diversity of this part of Johannesburg.',
  'Hunter Street, Yeoville',
  'Yeoville, Johannesburg',
  -26.1833, 28.0658,
  'closed', 'Sunday Mass 8am · 10am · 6pm',
  true, 'ZA',
  112, 54, 0, 4, 5,
  true, now() - interval '80 days'
),

-- ── Community Space ───────────────────────────────────────────────────────────

(
  'Yeoville Community Centre',
  'yeoville-community-centre',
  'Community Space',
  'The neighbourhood''s main community hall on Rockey Street. Used for civic meetings, youth programmes, weekend events and the occasional pop-up market. Run by residents, for residents.',
  'Rockey Street, Yeoville',
  'Yeoville, Johannesburg',
  -26.1845, 28.0657,
  'closed', 'Mon–Fri 9am – 5pm · Sat 9am – 1pm',
  true, 'ZA',
  96, 31, 2, 9, 7,
  false, now() - interval '40 days'
),

-- ── Live Music ────────────────────────────────────────────────────────────────

(
  'Tandoor Live Stage',
  'tandoor-live-stage-yeoville',
  'Live Music Venue',
  'The back room of a Rocky Street bar that doubles as Yeoville''s unofficial live music stage on weekends. Afrobeat, mbaqanga, soul and whatever the neighbourhood feels like that night. No cover most Fridays.',
  '9 Rocky Street, Yeoville',
  'Yeoville, Johannesburg',
  -26.1850, 28.0650,
  'closed', 'Fri–Sat from 8pm',
  true, 'ZA',
  122, 40, 0, 7, 9,
  false, now() - interval '17 days'
);
