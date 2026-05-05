-- ─────────────────────────────────────────────────────────────────────────────
-- Braamfontein seed v2 — verified operational venues, May 2026
-- Step 1: deletes the bad seed data
-- Step 2: inserts 20 confirmed venues with correct addresses
-- Paste into Supabase SQL editor and click Run
-- ─────────────────────────────────────────────────────────────────────────────

-- Step 1: Remove all old Braamfontein venues
DELETE FROM venues WHERE location ILIKE '%Braamfontein%';

-- Step 2: Insert verified, currently-operating venues
INSERT INTO venues (
  name, slug, type, description, address, location,
  latitude, longitude, status, opening_hours,
  is_active, country_code,
  checkin_count, regulars_count,
  checkins_today, checkins_this_week, checkins_last_week,
  is_verified, created_at
) VALUES

-- ── Restaurants & Food ────────────────────────────────────────────────────────

(
  'The Smokehouse and Grill',
  'smokehouse-and-grill-braamfontein',
  'Shisanyama',
  'A proper American-style BBQ restaurant in the Juta Street complex. Slow-smoked meats, ribs and burgers done seriously. One of the better sit-down meals in Braamfontein and consistently busy from lunch through to the evening.',
  '73 Juta Street, Braamfontein',
  'Braamfontein, Johannesburg',
  -26.1968, 28.0444,
  'closed', 'Mon–Sat 11:30am – 10:30pm',
  true, 'ZA',
  287, 74, 0, 0, 0,
  true, now() - interval '55 days'
),

(
  'The Wing Republic',
  'wing-republic-braamfontein',
  'Café',
  'Chicken wings as the main event on De Beer Street. Multiple sauces, decent sides and a crowd that comes back regularly for the same order every time. Open late on weekends.',
  '6 De Beer Street, Braamfontein',
  'Braamfontein, Johannesburg',
  -26.1952, 28.0432,
  'closed', 'Daily 10am – 11pm (Fri–Sat until 1am)',
  true, 'ZA',
  198, 51, 0, 0, 0,
  true, now() - interval '41 days'
),

(
  'McDonald''s Braamfontein',
  'mcdonalds-braamfontein',
  'Café',
  'The 24-hour McDonald''s at the Jorissen and Melle corner. Serves the student population, late-night crowd and anyone in between at any hour of the day or night. Reliable in the way only a 24-hour fast food location can be.',
  'Corner Jorissen & Melle Street, Braamfontein',
  'Braamfontein, Johannesburg',
  -26.1975, 28.0461,
  'closed', 'Open 24 hours',
  true, 'ZA',
  412, 89, 0, 0, 0,
  true, now() - interval '80 days'
),

(
  'KFC Braamfontein',
  'kfc-braamfontein',
  'Café',
  'The Smit Street KFC that feeds a large portion of Braamfontein''s student and working population daily. Busy from lunch until well into the evening. The drive-through queue on a Friday tells you everything you need to know.',
  'Smit Street, Braamfontein',
  'Braamfontein, Johannesburg',
  -26.1962, 28.0452,
  'closed', 'Daily 8am – 10pm+',
  true, 'ZA',
  378, 83, 0, 0, 0,
  true, now() - interval '75 days'
),

(
  'Food Lover''s Eatery',
  'food-lovers-eatery-braamfontein',
  'Café',
  'A café and eatery on Ameshoff Street serving the Braamfontein working and student crowd. Freshly made food, decent coffee and a lunch counter that fills up fast. Reliable for a quick meal without the fast food experience.',
  '19 Ameshoff Street, Braamfontein',
  'Braamfontein, Johannesburg',
  -26.1948, 28.0438,
  'closed', 'Mon–Fri 7am – 5pm · Sat 8am – 3pm',
  true, 'ZA',
  167, 44, 0, 0, 0,
  false, now() - interval '28 days'
),

(
  'KFC PlayBraam',
  'kfc-playbraam-braamfontein',
  'Café',
  'The KFC inside the Play Braam complex on Juta Street. Serves the foot traffic from the market, events and weekend crowd that passes through the precinct. Busiest on Saturday mornings when the Playground Market is running.',
  'Play Braam, Juta Street, Braamfontein',
  'Braamfontein, Johannesburg',
  -26.1970, 28.0441,
  'closed', 'Daily — hours vary',
  true, 'ZA',
  143, 32, 0, 0, 0,
  true, now() - interval '18 days'
),

-- ── Bars & Nightlife ──────────────────────────────────────────────────────────

(
  'Great Dane Braamfontein',
  'great-dane-braamfontein',
  'Live Music Venue',
  'A bar and live music venue on De Beer Street that has been central to Braamfontein''s nightlife for years. Open until 4am, the Great Dane draws a mix of students, creatives and music fans. The sound system is taken seriously.',
  '5 De Beer Street, Braamfontein',
  'Braamfontein, Johannesburg',
  -26.1951, 28.0431,
  'closed', 'Daily 12pm – 4am',
  true, 'ZA',
  342, 91, 0, 0, 0,
  true, now() - interval '70 days'
),

(
  'Randlords',
  'randlords-braamfontein',
  'Tavern',
  'A rooftop bar on the 22nd floor of a De Korte Street building with one of the best elevated views of the Joburg skyline. Events, sundowners and a bar that attracts people willing to make the trip for the view alone.',
  '22nd Floor, 41 De Korte Street, Braamfontein',
  'Braamfontein, Johannesburg',
  -26.1942, 28.0428,
  'closed', 'Hours vary — enquire directly',
  true, 'ZA',
  218, 57, 0, 0, 0,
  true, now() - interval '62 days'
),

-- ── Live Music & Entertainment ─────────────────────────────────────────────────

(
  'Hugh''s Jazz Club',
  'hughs-jazz-club-braamfontein',
  'Live Music Venue',
  'A new jazz club that opened in 2026 on the 13th floor of the Juta Street building. Thursday nights only — live jazz from 6pm to midnight. Small capacity, serious music and a crowd that comes specifically for the performances.',
  'Level 13, 73 Juta Street, Braamfontein',
  'Braamfontein, Johannesburg',
  -26.1968, 28.0444,
  'closed', 'Thursday only 6pm – midnight',
  true, 'ZA',
  87, 29, 0, 0, 0,
  true, now() - interval '14 days'
),

(
  'Joburg Theatre',
  'joburg-theatre-braamfontein',
  'Community Space',
  'The main civic theatre in Johannesburg on Civic Boulevard. Runs professional theatre productions, dance performances and musical events across multiple auditoriums. One of the most important performance venues in the city.',
  '163 Civic Boulevard, Braamfontein',
  'Braamfontein, Johannesburg',
  -26.2001, 28.0440,
  'closed', 'Show times vary — check programme',
  true, 'ZA',
  276, 68, 0, 0, 0,
  true, now() - interval '88 days'
),

-- ── Markets ───────────────────────────────────────────────────────────────────

(
  'The Playground Market',
  'playground-market-braamfontein',
  'Market',
  'A Saturday market in the Play Braam complex on Juta Street. Local vendors, street food, craft goods and live music from 11am to 7pm. One of the most reliably enjoyable Saturday afternoons in Braamfontein.',
  '73 Juta Street, Braamfontein',
  'Braamfontein, Johannesburg',
  -26.1967, 28.0443,
  'closed', 'Saturday only 11am – 7pm',
  true, 'ZA',
  389, 97, 0, 0, 0,
  true, now() - interval '50 days'
),

-- ── Cultural & Educational ─────────────────────────────────────────────────────

(
  'Origins Centre',
  'origins-centre-braamfontein',
  'Community Space',
  'A museum on the Wits campus dedicated to the origins of humankind and the cultural heritage of southern Africa. Houses one of the world''s finest collections of rock art. Worth a visit from anywhere in the city.',
  'Yale Road, Wits Campus, Braamfontein',
  'Braamfontein, Johannesburg',
  -26.1929, 28.0310,
  'closed', 'Mon–Fri 9am – 5pm · Sat 9am – 4pm',
  true, 'ZA',
  143, 38, 0, 0, 0,
  true, now() - interval '66 days'
),

(
  'Wits Art Museum',
  'wits-art-museum-braamfontein',
  'Community Space',
  'The University of the Witwatersrand''s art museum at the corner of Senate and Jorissen Streets. A significant collection of African art and rotating contemporary exhibitions. Free entry. One of the more undervisited cultural spaces in Joburg.',
  'Corner Senate & Jorissen Street, Braamfontein',
  'Braamfontein, Johannesburg',
  -26.1946, 28.0458,
  'closed', 'Tue–Fri 10am – 4:30pm · Sat 10am – 3pm',
  true, 'ZA',
  112, 31, 0, 0, 0,
  true, now() - interval '44 days'
),

(
  'Constitution Hill',
  'constitution-hill-braamfontein',
  'Community Space',
  'A living museum and human rights precinct at the site of the Old Fort Prison on Kotze Street. Houses the Constitutional Court, Number Four prison museum and Women''s Jail. One of the most historically significant public spaces in South Africa.',
  '11 Kotze Street, Braamfontein',
  'Braamfontein, Johannesburg',
  -26.1893, 28.0423,
  'closed', 'Mon–Fri 9am – 5pm · Sat 9am – 3pm',
  true, 'ZA',
  198, 54, 0, 0, 0,
  true, now() - interval '82 days'
),

(
  'Play Africa',
  'play-africa-braamfontein',
  'Community Space',
  'An interactive children''s museum at Constitution Hill designed around African play and storytelling traditions. Aimed at children from 2 to 12 years old. One of the better children''s attractions in the Joburg inner city.',
  'Constitution Hill, Kotze Street, Braamfontein',
  'Braamfontein, Johannesburg',
  -26.1891, 28.0421,
  'closed', 'Tue–Fri 9:30am – 3:30pm · Sat 9:30am – 12:30pm',
  true, 'ZA',
  89, 26, 0, 0, 0,
  true, now() - interval '33 days'
),

(
  'Wits University Main Campus',
  'wits-university-braamfontein',
  'Community Space',
  'The main Wits campus on Jan Smuts Avenue — one of Africa''s leading research universities. The east campus is the heartbeat of Braamfontein''s student population. Open to visitors for the museums, food spots and public events.',
  '1 Jan Smuts Avenue, Braamfontein',
  'Braamfontein, Johannesburg',
  -26.1928, 28.0310,
  'closed', 'Campus open daily',
  true, 'ZA',
  534, 148, 0, 0, 0,
  true, now() - interval '90 days'
),

-- ── Retail & Services ─────────────────────────────────────────────────────────

(
  'Checkers Braamfontein',
  'checkers-braamfontein',
  'Spaza Shop',
  'The Checkers on Smit Street serving the Braamfontein residential and student community. Stocks a full grocery range. The busiest hours are weekday evenings and Saturday mornings when the market crowd spills over.',
  'Smit Street, Braamfontein',
  'Braamfontein, Johannesburg',
  -26.1959, 28.0453,
  'closed', 'Mon–Fri 7am – 8pm · Sat 7am – 7pm · Sun 9am – 5pm',
  true, 'ZA',
  312, 84, 0, 0, 0,
  true, now() - interval '77 days'
),

(
  'Exclusive Books Braamfontein',
  'exclusive-books-braamfontein',
  'Community Space',
  'The Exclusive Books branch on the Wits campus. Stocks academic titles, fiction, local literature and a strong South African non-fiction section. A staple of the campus community and anyone in Braamfontein who still buys physical books.',
  'Wits Campus, Braamfontein',
  'Braamfontein, Johannesburg',
  -26.1932, 28.0318,
  'closed', 'Mon–Fri 8:30am – 5pm · Sat 9am – 1pm',
  true, 'ZA',
  134, 39, 0, 0, 0,
  true, now() - interval '48 days'
),

-- ── Accommodation ─────────────────────────────────────────────────────────────

(
  'South Point Braamfontein',
  'south-point-braamfontein',
  'Community Space',
  'Purpose-built student accommodation at 41 De Korte Street. Houses a large portion of Braamfontein''s student population and acts as a social hub for the area — the ground-floor retail and common spaces see constant foot traffic.',
  '41 De Korte Street, Braamfontein',
  'Braamfontein, Johannesburg',
  -26.1943, 28.0429,
  'closed', 'Open daily',
  true, 'ZA',
  167, 112, 0, 0, 0,
  false, now() - interval '60 days'
),

-- ── Services ──────────────────────────────────────────────────────────────────

(
  'Joburg Central Police Station',
  'joburg-central-police-station',
  'Community Space',
  'The central police station serving the Braamfontein and inner-city area on Twist Street. Open 24 hours for emergency services, case reporting and community liaison. A practical neighbourhood anchor for the area.',
  'Twist Street, Braamfontein',
  'Braamfontein, Johannesburg',
  -26.1975, 28.0468,
  'closed', 'Open 24 hours',
  true, 'ZA',
  43, 8, 0, 0, 0,
  true, now() - interval '90 days'
);
