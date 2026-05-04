-- ─────────────────────────────────────────────────────────────────────────────
-- Soweto seed — real places, real streets, real neighbourhood
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

-- ── Restaurants & Dining ─────────────────────────────────────────────────────

(
  'Wandie''s Place',
  'wandies-place-soweto',
  'Shisanyama',
  'The most famous restaurant in Soweto. An all-you-can-eat buffet of traditional South African food in Dube that has fed tourists, politicians and neighbourhood regulars for over thirty years. Wandie Ndaba built something real here.',
  '618 Makhalamele Street, Dube, Soweto',
  'Dube, Soweto',
  -26.2481, 27.8562,
  'closed', 'Mon–Sun 8am – 10pm',
  true, 'ZA',
  398, 97, 15, 51, 47,
  true, now() - interval '88 days'
),

(
  'Sakhumzi Restaurant',
  'sakhumzi-restaurant-soweto',
  'Shisanyama',
  'Right on Vilakazi Street, next door to Mandela House. The terrace fills up every day with people eating pap, mogodu and lamb chops while watching the street go by. One of the most visited spots in Soweto.',
  '6980 Vilakazi Street, Orlando West, Soweto',
  'Orlando West, Soweto',
  -26.2506, 27.8539,
  'closed', 'Mon–Sun 9am – 10pm',
  true, 'ZA',
  382, 91, 14, 48, 44,
  true, now() - interval '82 days'
),

(
  'Kwa-Zulu Mamas',
  'kwa-zulu-mamas-soweto',
  'Shisanyama',
  'A traditional Zulu restaurant in Orlando that focuses on dishes passed down through families — umngqusho, umleqwa, amasi and chakalaka done properly. Small, warm and worth the trip from anywhere in the city.',
  'Orlando West, Soweto',
  'Orlando West, Soweto',
  -26.2498, 27.8547,
  'closed', 'Tue–Sun 10am – 9pm',
  true, 'ZA',
  213, 58, 6, 23, 20,
  true, now() - interval '60 days'
),

(
  'Chaf Pozi',
  'chaf-pozi-soweto',
  'Shisanyama',
  'An outdoor shisanyama and entertainment spot near FNB Stadium. Real coals, real meat, loud music and a crowd that comes to eat and stay for hours. Massive on match days — quieter midweek but still worth it.',
  'Nasrec Road, near FNB Stadium, Soweto',
  'Nasrec, Soweto',
  -26.2370, 27.9083,
  'closed', 'Thu–Sun 11am – late',
  true, 'ZA',
  317, 84, 10, 37, 32,
  true, now() - interval '70 days'
),

(
  'The Shack Restaurant',
  'the-shack-soweto',
  'Shisanyama',
  'A laid-back spot in Orlando West that does grilled meat, chakalaka and cold beer in a no-fuss setting. Regulars come on Saturdays with family. The lamb chops are the reason most of them return.',
  'Orlando West, Soweto',
  'Orlando West, Soweto',
  -26.2511, 27.8531,
  'closed', 'Wed–Sun 12pm – 9pm',
  true, 'ZA',
  178, 51, 5, 22, 18,
  false, now() - interval '45 days'
),

-- ── Brewery & Live Music ──────────────────────────────────────────────────────

(
  'Ubuntu Kraal Brewery',
  'ubuntu-kraal-brewery-soweto',
  'Live Music Venue',
  'A Soweto-born craft brewery that brews and sells on-site in a space that also hosts live music and cultural events. The Soweto Gold lager was born here. Part bar, part community project, part institution.',
  'Vilakazi Street, Orlando West, Soweto',
  'Orlando West, Soweto',
  -26.2502, 27.8543,
  'closed', 'Wed–Sun 12pm – 10pm',
  true, 'ZA',
  256, 72, 8, 30, 27,
  true, now() - interval '65 days'
),

-- ── Cafés & Coffee ────────────────────────────────────────────────────────────

(
  'Hector Pieterson Memorial Café',
  'hector-pieterson-memorial-cafe-soweto',
  'Café',
  'A small café adjacent to the Hector Pieterson Museum in Orlando West. Simple coffee and light meals in a space that carries the weight of history. Visited daily by locals and people from around the world.',
  'Khumalo Street, Orlando West, Soweto',
  'Orlando West, Soweto',
  -26.2508, 27.8537,
  'closed', 'Tue–Sun 9am – 5pm',
  true, 'ZA',
  167, 44, 4, 16, 14,
  true, now() - interval '55 days'
),

-- ── Taverns ───────────────────────────────────────────────────────────────────

(
  'Vilakazi Street Tavern',
  'vilakazi-street-tavern-soweto',
  'Tavern',
  'A neighbourhood tavern that has been running alongside the tourist trade on Vilakazi without becoming a tourist trap. The regulars drink here every evening. Local pricing, local energy.',
  'Vilakazi Street, Orlando West, Soweto',
  'Orlando West, Soweto',
  -26.2514, 27.8526,
  'closed', 'Mon–Sun 2pm – 1am',
  true, 'ZA',
  194, 55, 7, 28, 25,
  false, now() - interval '48 days'
),

(
  'Mzoli''s Place',
  'mzolis-place-soweto',
  'Tavern',
  'An Orlando institution that doubles as a social event every weekend. Bring your cooler box, order your meat from the butcher counter, have it braaied for you and eat with a few hundred other people. Always a vibe.',
  'Orlando East, Soweto',
  'Orlando East, Soweto',
  -26.2458, 27.8601,
  'closed', 'Sat–Sun 10am – late · Fri from 3pm',
  true, 'ZA',
  341, 88, 12, 43, 39,
  true, now() - interval '78 days'
),

-- ── Churches ──────────────────────────────────────────────────────────────────

(
  'Regina Mundi Catholic Church',
  'regina-mundi-church-soweto',
  'Church',
  'The largest Catholic church in South Africa and one of the most historically significant in the country. Shot at by police during apartheid, it became a sanctuary. Sunday Mass still fills every pew. A living monument.',
  '1149 Khumalo Street, Rockville, Soweto',
  'Rockville, Soweto',
  -26.2437, 27.8714,
  'closed', 'Sunday Mass 7am · 9am · 11am · 5pm',
  true, 'ZA',
  278, 89, 2, 10, 12,
  true, now() - interval '90 days'
),

-- ── Barbershops ───────────────────────────────────────────────────────────────

(
  'Vilakazi Cuts',
  'vilakazi-cuts-soweto',
  'Barbershop',
  'A barbershop on Vilakazi Street that has been doing fades and lineups for the neighbourhood long before the street became famous. The barbers here have regulars who have been coming since they were teenagers.',
  'Vilakazi Street, Orlando West, Soweto',
  'Orlando West, Soweto',
  -26.2503, 27.8541,
  'closed', 'Mon–Sat 8am – 7pm',
  true, 'ZA',
  182, 53, 9, 32, 28,
  false, now() - interval '35 days'
),

(
  'Dube Sharp Cuts',
  'dube-sharp-cuts-soweto',
  'Barbershop',
  'A Dube barbershop that keeps it straightforward — good fades, low prices and a waiting area where the conversation is usually about football or neighbourhood news. Walk-ins all day.',
  'Dube, Soweto',
  'Dube, Soweto',
  -26.2476, 27.8571,
  'closed', 'Tue–Sun 8:30am – 7pm',
  true, 'ZA',
  136, 39, 6, 22, 19,
  false, now() - interval '21 days'
),

-- ── Salons ────────────────────────────────────────────────────────────────────

(
  'Queens Beauty Salon Soweto',
  'queens-beauty-salon-soweto',
  'Salon',
  'A full salon in Orlando West that does natural hair, braids, locs and extensions alongside facials and nail treatments. Has a loyal base of regulars who book weeks in advance for peak weekends.',
  'Orlando West, Soweto',
  'Orlando West, Soweto',
  -26.2496, 27.8552,
  'closed', 'Mon–Sat 8am – 7pm',
  true, 'ZA',
  148, 43, 5, 19, 16,
  false, now() - interval '29 days'
),

-- ── Spaza Shops ───────────────────────────────────────────────────────────────

(
  'Makhalamele Street Spaza',
  'makhalamele-street-spaza-soweto',
  'Spaza Shop',
  'A busy spaza in Dube that services the block around Wandie''s Place. Airtime, cold drinks, bread and basics. Open from before sunrise and the owner knows every face on the street.',
  'Makhalamele Street, Dube, Soweto',
  'Dube, Soweto',
  -26.2479, 27.8565,
  'closed', 'Mon–Sun 6am – 10pm',
  true, 'ZA',
  219, 62, 14, 47, 43,
  false, now() - interval '57 days'
),

(
  'Vilakazi Corner Spaza',
  'vilakazi-corner-spaza-soweto',
  'Spaza Shop',
  'A corner spaza at the busy end of Vilakazi Street. Stocks cold drinks, snacks and household basics. Gets a lot of foot traffic from the restaurant strip and the museum visitors who need something quick.',
  'Vilakazi Street, Orlando West, Soweto',
  'Orlando West, Soweto',
  -26.2507, 27.8534,
  'closed', 'Mon–Sun 7am – 9pm',
  true, 'ZA',
  173, 48, 11, 39, 35,
  false, now() - interval '41 days'
),

-- ── Market ────────────────────────────────────────────────────────────────────

(
  'Maponya Mall Traders Market',
  'maponya-mall-traders-market-soweto',
  'Market',
  'The informal trader market that operates in and around Maponya Mall in Klipspruit. Clothing, food, household goods and produce. A busy Saturday market that feels like the real commercial heartbeat of this part of Soweto.',
  'Chris Hani Road, Klipspruit, Soweto',
  'Klipspruit, Soweto',
  -26.2539, 27.8716,
  'closed', 'Mon–Sat 8am – 6pm · Sun 9am – 4pm',
  true, 'ZA',
  246, 67, 13, 45, 41,
  false, now() - interval '52 days'
),

-- ── Carwash ───────────────────────────────────────────────────────────────────

(
  'Orlando West Hand Wash',
  'orlando-west-hand-wash-soweto',
  'Carwash',
  'A reliable hand wash near the Vilakazi Street junction. Saturday queues start early and the guys work fast. Does a full interior and exterior for a fair price. Good place to kill time between visits on the strip.',
  'Orlando West, Soweto',
  'Orlando West, Soweto',
  -26.2516, 27.8527,
  'closed', 'Mon–Sat 7:30am – 5:30pm',
  true, 'ZA',
  102, 27, 4, 14, 11,
  false, now() - interval '16 days'
),

-- ── Mechanic ─────────────────────────────────────────────────────────────────

(
  'Dube Auto Repairs',
  'dube-auto-repairs-soweto',
  'Mechanic',
  'A mechanic in Dube that the neighbourhood has relied on for years. Honest diagnostics, fair labour rates and the kind of reputation built only by people who do not overcharge or make up problems. Weekday bookings recommended.',
  'Dube, Soweto',
  'Dube, Soweto',
  -26.2471, 27.8574,
  'closed', 'Mon–Fri 7:30am – 5pm · Sat 8am – 12pm',
  true, 'ZA',
  97, 33, 2, 9, 8,
  false, now() - interval '9 days'
),

-- ── Gym ───────────────────────────────────────────────────────────────────────

(
  'Soweto Gym & Fitness Centre',
  'soweto-gym-fitness-centre',
  'Gym',
  'A community gym in Orlando that has been running fitness classes and open floor sessions for years. Not fancy — proper iron, proper trainers and a crowd that shows up consistently because it works.',
  'Orlando, Soweto',
  'Orlando, Soweto',
  -26.2463, 27.8589,
  'closed', 'Mon–Fri 5:30am – 9pm · Sat–Sun 7am – 5pm',
  true, 'ZA',
  211, 69, 10, 37, 33,
  false, now() - interval '37 days'
),

-- ── Community Space ───────────────────────────────────────────────────────────

(
  'Soweto Theatre',
  'soweto-theatre-soweto',
  'Community Space',
  'A professional theatre venue in Jabulani that hosts productions ranging from student performances to national touring shows. Has become a cultural anchor for the southern part of Soweto since it opened.',
  'Bolani Road, Jabulani, Soweto',
  'Jabulani, Soweto',
  -26.2553, 27.8608,
  'closed', 'Tue–Sun 9am – 9pm',
  true, 'ZA',
  158, 46, 3, 13, 11,
  true, now() - interval '66 days'
);
