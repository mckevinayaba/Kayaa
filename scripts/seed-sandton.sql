-- ─────────────────────────────────────────────────────────────────────────────
-- Sandton / Rosebank seed — real places, real streets, real neighbourhood
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

-- ── Restaurants & Grills ──────────────────────────────────────────────────────

(
  'Marble Restaurant',
  'marble-restaurant-rosebank',
  'Shisanyama',
  'Wood-fired grill on Keyes Ave that has become one of Johannesburg''s most talked-about restaurants. The open kitchen, the coal-fired meat and the terraced rooftop draw a consistent crowd. Bookings usually essential on weekends.',
  'Shop 1, The Trumpet, 21 Keyes Avenue, Rosebank',
  'Rosebank, Johannesburg',
  -26.1462, 28.0432,
  'closed', 'Mon–Sun 12pm – 10:30pm',
  true, 'ZA',
  487, 112, 19, 74, 68,
  true, now() - interval '80 days'
),

(
  'Tashas Sandton City',
  'tashas-sandton-city',
  'Café',
  'The Sandton City outpost of one of Johannesburg''s most consistent café groups. Reliable all-day menu, strong coffee and the kind of service that keeps regulars coming back every week.',
  'Sandton City Shopping Centre, Sandton Drive, Sandton',
  'Sandton, Johannesburg',
  -26.1072, 28.0564,
  'closed', 'Mon–Sun 7:30am – 9:30pm',
  true, 'ZA',
  412, 98, 17, 62, 57,
  true, now() - interval '65 days'
),

(
  'Tashas Rosebank',
  'tashas-rosebank',
  'Café',
  'Busy from the morning rush to the lunch crowd. Sits on the ground floor of The Zone. The eggs benedict and the flat white have their own regular following.',
  'The Zone @ Rosebank, Oxford Road, Rosebank',
  'Rosebank, Johannesburg',
  -26.1469, 28.0441,
  'closed', 'Mon–Sun 7am – 9pm',
  true, 'ZA',
  376, 91, 14, 54, 49,
  true, now() - interval '72 days'
),

-- ── Coffee ────────────────────────────────────────────────────────────────────

(
  'Doppio Zero Sandton',
  'doppio-zero-sandton',
  'Café',
  'A Johannesburg institution. The Sandton branch runs from breakfast through to dinner — open plan, noisy in a good way, and the kind of place where business lunches and family Sundays coexist comfortably.',
  'Sandton City, 5th Street, Sandton',
  'Sandton, Johannesburg',
  -26.1068, 28.0571,
  'closed', 'Mon–Sun 7am – 10pm',
  true, 'ZA',
  398, 104, 16, 59, 54,
  true, now() - interval '88 days'
),

(
  'Bootlegger Coffee Rosebank',
  'bootlegger-coffee-rosebank',
  'Café',
  'Specialty coffee in a no-nonsense space. Bootlegger takes sourcing and extraction seriously. This Rosebank branch is a regular stop for the area''s office workers and a weekend destination for the rest.',
  'Cradock Avenue, Rosebank',
  'Rosebank, Johannesburg',
  -26.1471, 28.0448,
  'closed', 'Mon–Fri 7am – 5pm · Sat–Sun 8am – 4pm',
  true, 'ZA',
  284, 76, 11, 41, 37,
  true, now() - interval '52 days'
),

(
  'Nosh Parkmore',
  'nosh-parkmore',
  'Café',
  'A Parkmore neighbourhood café that draws more than the immediate area. Good sandwiches, honest coffee and a lunch counter that fills up by noon. Popular with people who work nearby and don''t want to deal with the mall.',
  'Strathavon Road, Parkmore, Sandton',
  'Parkmore, Johannesburg',
  -26.1051, 28.0623,
  'closed', 'Mon–Fri 7am – 4pm · Sat 8am – 2pm',
  true, 'ZA',
  197, 58, 8, 30, 27,
  false, now() - interval '38 days'
),

-- ── Hotel / Boutique ──────────────────────────────────────────────────────────

(
  'The Peech Hotel',
  'the-peech-hotel-melrose',
  'Community Space',
  'A boutique hotel in Melrose that doubles as one of the area''s better event and dining spaces. The garden restaurant is genuinely good and the Sunday brunch draws a regular local crowd beyond just hotel guests.',
  '61 North Street, Melrose',
  'Melrose, Johannesburg',
  -26.1347, 28.0551,
  'closed', 'Open daily',
  true, 'ZA',
  168, 44, 5, 21, 18,
  true, now() - interval '47 days'
),

-- ── Gallery & Culture ─────────────────────────────────────────────────────────

(
  'Circa Gallery Rosebank',
  'circa-gallery-rosebank',
  'Community Space',
  'One of Johannesburg''s most respected contemporary art galleries. Rotating exhibitions from established and emerging South African artists. Free to enter, worth visiting whenever it changes — which is often.',
  '2 North Street, Rosebank',
  'Rosebank, Johannesburg',
  -26.1452, 28.0461,
  'closed', 'Mon–Fri 9am – 5pm · Sat 10am – 3pm',
  true, 'ZA',
  134, 38, 3, 14, 11,
  true, now() - interval '44 days'
),

-- ── Kauai ─────────────────────────────────────────────────────────────────────

(
  'Kauai Sandton City',
  'kauai-sandton-city',
  'Café',
  'Health food that actually tastes like food. Sandton City branch runs through every lunch hour. The smoothie bowls and wraps have a regular rotation of office workers who don''t want to eat at a restaurant every day.',
  'Sandton City Shopping Centre, Sandton',
  'Sandton, Johannesburg',
  -26.1075, 28.0560,
  'closed', 'Mon–Sun 8am – 8pm',
  true, 'ZA',
  323, 84, 13, 49, 45,
  true, now() - interval '60 days'
),

-- ── Barbershops ───────────────────────────────────────────────────────────────

(
  'Headmaster Barbershop Sandton',
  'headmaster-barbershop-sandton',
  'Barbershop',
  'One of the better upscale barbershops in Sandton. Appointments preferred but walk-ins get seen when the schedule allows. Clean space, consistent cuts, and the barbers have been there long enough to know their regulars.',
  '5th Street, Sandton',
  'Sandton, Johannesburg',
  -26.1078, 28.0558,
  'closed', 'Mon–Sat 9am – 7pm',
  true, 'ZA',
  215, 63, 9, 34, 30,
  false, now() - interval '33 days'
),

(
  'Blade & Craft Rosebank',
  'blade-and-craft-rosebank',
  'Barbershop',
  'A proper barbershop on Cradock Avenue. Does fades, tapers and straight razor shaves. Walk-in friendly, no nonsense about the pricing, and the playlist is always worth hearing.',
  'Cradock Avenue, Rosebank',
  'Rosebank, Johannesburg',
  -26.1465, 28.0450,
  'closed', 'Mon–Sat 8am – 7pm',
  true, 'ZA',
  178, 52, 7, 27, 24,
  false, now() - interval '21 days'
),

-- ── Salon ─────────────────────────────────────────────────────────────────────

(
  'Salon Unique Rosebank',
  'salon-unique-rosebank',
  'Salon',
  'A full-service hair salon that has been operating in Rosebank long enough to have multiple generations of clients. Does braids, relaxers, colour and cuts. Booking ahead saves time.',
  'Bath Avenue, Rosebank',
  'Rosebank, Johannesburg',
  -26.1477, 28.0443,
  'closed', 'Mon–Sat 8am – 7pm',
  true, 'ZA',
  144, 46, 5, 20, 17,
  false, now() - interval '19 days'
),

-- ── Gym ───────────────────────────────────────────────────────────────────────

(
  'Virgin Active Sandton City',
  'virgin-active-sandton-city',
  'Gym',
  'The flagship Sandton gym inside Sandton City. Large floor, full equipment, pool, and a member base that treats 6am as a reasonable starting time. Consistently busy from opening.',
  'Sandton City, Sandton Drive, Sandton',
  'Sandton, Johannesburg',
  -26.1069, 28.0568,
  'closed', 'Mon–Fri 5:30am – 10pm · Sat–Sun 7am – 7pm',
  true, 'ZA',
  389, 117, 15, 57, 53,
  true, now() - interval '75 days'
),

-- ── Church ────────────────────────────────────────────────────────────────────

(
  'Sandton Methodist Church',
  'sandton-methodist-church',
  'Church',
  'A long-standing congregation in the heart of Sandton. Sunday services draw a mixed and loyal community. Runs several outreach programmes during the week that extend well beyond the Sunday crowd.',
  'Rivonia Road, Sandhurst, Sandton',
  'Sandton, Johannesburg',
  -26.1089, 28.0531,
  'closed', 'Sunday services 8am · 10am',
  true, 'ZA',
  112, 67, 0, 4, 6,
  true, now() - interval '82 days'
),

-- ── Carwash ───────────────────────────────────────────────────────────────────

(
  'Rosebank Hand Car Wash',
  'rosebank-hand-car-wash',
  'Carwash',
  'A hand car wash on Baker Street that the Rosebank regulars have been using for years. Does a thorough job, pricing is fair, and the wait is usually no more than 30 minutes. Queue is longest on Saturday mornings.',
  'Baker Street, Rosebank',
  'Rosebank, Johannesburg',
  -26.1480, 28.0437,
  'closed', 'Mon–Sat 8am – 5:30pm',
  true, 'ZA',
  98, 31, 4, 15, 13,
  false, now() - interval '14 days'
);
