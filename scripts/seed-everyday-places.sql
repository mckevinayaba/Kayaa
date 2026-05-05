-- ─────────────────────────────────────────────────────────────────────────────
-- Kayaa: Everyday Places Seed
--
-- These are the places Kayaa is actually FOR.
-- Not coffee shops and museums. Barbershops, spazas, shisanyamas,
-- taverns, salons, carwashes, churches, mechanics.
-- The places people go to every week, every day.
--
-- Covers: Berea (JHB), Soweto, Alexandra, Tembisa, Khayelitsha, Umlazi
-- All status = 'closed' (community must verify activity through check-ins)
-- owner_claimed = false (owners can claim their listing)
--
-- Run in Supabase SQL editor.
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO venues (name, type, slug, location, description, status, owner_claimed, country_code)
VALUES

-- ── BEREA, JOHANNESBURG ──────────────────────────────────────────────────────

('City Cuts Barbershop',      'barbershop', 'city-cuts-berea',        'Berea, Johannesburg',      'Barbershop on Claim Street serving the Berea community.',                'closed', false, 'ZA'),
('Langa Hair Salon',          'salon',      'langa-hair-berea',       'Berea, Johannesburg',      'Natural hair, braiding, and relaxers. Walk-ins welcome.',                'closed', false, 'ZA'),
('Berea Spaza Corner',        'spaza',      'berea-spaza-corner',     'Berea, Johannesburg',      'Everyday essentials, airtime, and cold drinks in Berea.',                'closed', false, 'ZA'),
('Ekhaya Tavern',             'tavern',     'ekhaya-tavern-berea',    'Berea, Johannesburg',      'Neighbourhood tavern and gathering spot in Berea.',                      'closed', false, 'ZA'),
('Mama Noks Kitchen',         'food',       'mama-noks-berea',        'Berea, Johannesburg',      'Home-cooked meals, pap and stew, fresh daily.',                         'closed', false, 'ZA'),
('Berea Car Wash & Detail',   'carwash',    'berea-carwash',          'Berea, Johannesburg',      'Full valet and quick wash. Open most days.',                             'closed', false, 'ZA'),
('Grace Gospel Church',       'church',     'grace-gospel-berea',     'Berea, Johannesburg',      'Sunday services and community programmes in Berea.',                     'closed', false, 'ZA'),

-- ── SOWETO ───────────────────────────────────────────────────────────────────

('Zakes Barbershop Orlando',  'barbershop', 'zakes-barber-orlando',   'Orlando West, Soweto',     'Classic cuts and fades. One of the longest-running barbers in Orlando.',  'closed', false, 'ZA'),
('Diski Hair Studio',         'salon',      'diski-hair-soweto',      'Diepkloof, Soweto',        'Braids, weaves, and natural styles in Diepkloof.',                       'closed', false, 'ZA'),
('Thabo\'s Shisanyama',       'food',       'thabos-shisa-soweto',    'Meadowlands, Soweto',      'Wood-fired braai and cold beers. Weekends are packed.',                  'closed', false, 'ZA'),
('Vilakazi Tavern',           'tavern',     'vilakazi-tavern-soweto', 'Orlando West, Soweto',     'Community tavern near Vilakazi Street. Lively on weekends.',             'closed', false, 'ZA'),
('Soweto Spaza Express',      'spaza',      'soweto-spaza-express',   'Dobsonville, Soweto',      'Bread, milk, airtime, and household basics.',                            'closed', false, 'ZA'),
('Bra Tommy Auto Repair',     'mechanic',   'bra-tommy-mechanic',     'Protea North, Soweto',     'Panel beating, tyres, and general repairs.',                             'closed', false, 'ZA'),
('Soweto Gospel Tabernacle',  'church',     'soweto-gospel-tab',      'Naledi, Soweto',           'Community church with youth programmes and Sunday worship.',             'closed', false, 'ZA'),
('Corner Fresh Market',       'market',     'corner-fresh-soweto',    'Jabulani, Soweto',         'Fresh produce, vegetables, and seasonal fruit market.',                  'closed', false, 'ZA'),
('Fitness Junction Soweto',   'gym',        'fitness-junction-soweto','Rockville, Soweto',        'Affordable gym with weights and cardio. No contract needed.',            'closed', false, 'ZA'),

-- ── ALEXANDRA ────────────────────────────────────────────────────────────────

('Alex Cuts',                 'barbershop', 'alex-cuts-alexandra',    'Alexandra, Johannesburg',  'Barbershop on London Road. Walk-ins and appointments.',                  'closed', false, 'ZA'),
('Nandi\'s Beauty Parlour',   'salon',      'nandis-beauty-alex',     'Alexandra, Johannesburg',  'Hair and nails. Braids, weaves, acrylics.',                              'closed', false, 'ZA'),
('London Road Spaza',         'spaza',      'london-rd-spaza-alex',   'Alexandra, Johannesburg',  'Spaza on London Road. Open early mornings.',                             'closed', false, 'ZA'),
('Skhokho\'s Shisanyama',     'food',       'skhokho-shisa-alex',     'Alexandra, Johannesburg',  'Braai spot under the tree. Best wors in Alex.',                          'closed', false, 'ZA'),
('Phola Park Tavern',         'tavern',     'phola-park-tavern-alex', 'Alexandra, Johannesburg',  'Old-school Alex tavern. Always a crowd on Fridays.',                     'closed', false, 'ZA'),
('Alex Car Wash',             'carwash',    'alex-carwash',           'Alexandra, Johannesburg',  'Hand wash and vacuum. R60 full clean.',                                  'closed', false, 'ZA'),

-- ── TEMBISA ──────────────────────────────────────────────────────────────────

('Tembi\'s Barbershop',       'barbershop', 'tembis-barbershop-temb', 'Tembisa, Ekurhuleni',      'Sharp cuts, low fades, and beards. Known barber in Tembisa.',            'closed', false, 'ZA'),
('Nqobile Beauty Lounge',     'salon',      'nqobile-beauty-tembisa', 'Tembisa, Ekurhuleni',      'Braids, nails, and lashes in Tembisa.',                                  'closed', false, 'ZA'),
('Tembisa Spaza & More',      'spaza',      'tembisa-spaza-more',     'Tembisa, Ekurhuleni',      'Spaza with phone repairs and airtime sales.',                            'closed', false, 'ZA'),
('Ezase-Tembi Shisanyama',    'food',       'ezase-tembi-shisa',      'Tembisa, Ekurhuleni',      'Shisanyama and tavern combo. Popular weekend spot.',                     'closed', false, 'ZA'),
('Tembisa Community Church',  'church',     'tembisa-community-ch',   'Tembisa, Ekurhuleni',      'Weekly services, prayer groups, and community outreach.',                'closed', false, 'ZA'),
('Moeng\'s Mechanic',         'mechanic',   'moengs-mechanic-temb',   'Tembisa, Ekurhuleni',      'Brakes, exhausts, and full services. Honest pricing.',                   'closed', false, 'ZA'),

-- ── KHAYELITSHA ──────────────────────────────────────────────────────────────

('Khayelitsha Cutz',          'barbershop', 'khayelitsha-cutz',       'Khayelitsha, Cape Town',   'Popular barber in Site B. Known for clean fades.',                      'closed', false, 'ZA'),
('Sis Bongi Hair',            'salon',      'sis-bongi-hair-khay',    'Khayelitsha, Cape Town',   'Natural hair care and braiding. Warm community space.',                  'closed', false, 'ZA'),
('Khaya Spaza',               'spaza',      'khaya-spaza-khay',       'Khayelitsha, Cape Town',   'Corner spaza. Bread, milk, and household essentials.',                   'closed', false, 'ZA'),
('Mzoli\'s Type Braai',       'food',       'mzolis-type-braai-khay', 'Khayelitsha, Cape Town',   'Braai and meat spot inspired by the original. Weekend favourite.',       'closed', false, 'ZA'),
('Khay Tavern',               'tavern',     'khay-tavern',            'Khayelitsha, Cape Town',   'Neighbourhood tavern. Football on Saturdays.',                           'closed', false, 'ZA'),
('Ubuntu Car Wash Khay',      'carwash',    'ubuntu-carwash-khay',    'Khayelitsha, Cape Town',   'Community carwash. R50 full wash.',                                      'closed', false, 'ZA'),
('Zion Christian Church Khay','church',     'zcc-khayelitsha',        'Khayelitsha, Cape Town',   'ZCC congregation serving the Khayelitsha community.',                    'closed', false, 'ZA'),
('Khay Fresh Market',         'market',     'khay-fresh-market',      'Khayelitsha, Cape Town',   'Daily fresh produce and vegetables in Khayelitsha.',                     'closed', false, 'ZA'),

-- ── UMLAZI, DURBAN ───────────────────────────────────────────────────────────

('Zama\'s Barbershop Umlazi', 'barbershop', 'zamas-barber-umlazi',    'Umlazi, eThekwini',        'Neighbourhood barber in V Section. Kids welcome.',                      'closed', false, 'ZA'),
('Thandi\'s Hair Salon',      'salon',      'thandis-hair-umlazi',    'Umlazi, eThekwini',        'Weaves, braids, and relaxers. Walk-ins welcome most days.',              'closed', false, 'ZA'),
('Umlazi Corner Spaza',       'spaza',      'umlazi-corner-spaza',    'Umlazi, eThekwini',        'Corner spaza serving T Section and surrounding streets.',                'closed', false, 'ZA'),
('Indaba Shisanyama',         'food',       'indaba-shisa-umlazi',    'Umlazi, eThekwini',        'Braai and grill spot. Packed on Friday nights.',                         'closed', false, 'ZA'),
('V Section Tavern',          'tavern',     'v-section-tavern-uml',   'Umlazi, eThekwini',        'Established community tavern in V Section.',                             'closed', false, 'ZA'),
('Ntombi\'s Fresh Produce',   'market',     'ntombis-produce-uml',    'Umlazi, eThekwini',        'Fresh vegetables and fruit daily in Umlazi.',                            'closed', false, 'ZA'),
('Solid Rock Church Umlazi',  'church',     'solid-rock-umlazi',      'Umlazi, eThekwini',        'Sunday services and youth ministry in Umlazi.',                          'closed', false, 'ZA')

ON CONFLICT (slug) DO NOTHING;
