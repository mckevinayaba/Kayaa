-- ─────────────────────────────────────────────────────────────────────────────
-- Kayaa — Seed Data
-- Run after schema.sql. Inserts the 6 mock venues + events + posts + check-ins.
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── Venues ──────────────────────────────────────────────────────────────────

INSERT INTO venues (id, name, type, slug, location, description, regulars_count, is_active, opening_hours, address, created_at) VALUES
  (
    'a1000000-0000-0000-0000-000000000001',
    'Uncle Dee''s Barbershop',
    'Barbershop',
    'uncle-dee-barber',
    'Orlando West, Soweto',
    'The freshest cuts in Soweto. Fades, lineups, and good vibes since 2009.',
    389,
    true,
    'Mon–Sat 8am–7pm',
    '14 Vilakazi Street',
    '2024-01-10T08:00:00Z'
  ),
  (
    'a1000000-0000-0000-0000-000000000002',
    'Mama Zulu''s Shisanyama',
    'Shisanyama',
    'mama-zulu-shisanyama',
    'Site B, Khayelitsha',
    'Wood-fired braai, cold quarts, and the best pap in Khayelitsha. Open every weekend.',
    754,
    true,
    'Fri–Sun 12pm–10pm',
    '3 Mew Way',
    '2024-02-15T10:00:00Z'
  ),
  (
    'a1000000-0000-0000-0000-000000000003',
    'Sipho Corner Spaza',
    'Spaza Shop',
    'corner-spaza-alex',
    'Wynberg, Alexandra',
    'Everything you need, open till late. Airtime, groceries, bread, and a cold Coke.',
    203,
    true,
    'Daily 6am–11pm',
    '78 London Road',
    '2024-01-05T06:00:00Z'
  ),
  (
    'a1000000-0000-0000-0000-000000000004',
    'Glow Up Hair & Beauty',
    'Salon',
    'glow-up-salon-mitchells',
    'Turfhall, Mitchell''s Plain',
    'Braids, locs, relaxers, and facials. Walk in looking regular, leave looking blessed.',
    461,
    true,
    'Tue–Sat 9am–6pm',
    '22 Turfhall Road',
    '2024-03-01T09:00:00Z'
  ),
  (
    'a1000000-0000-0000-0000-000000000005',
    'Faith Assembly Church',
    'Church',
    'faith-assembly-thokoza',
    'Thokoza, Ekurhuleni',
    'A community of believers in the heart of Thokoza. Sunday service, youth group, and prayer nights.',
    892,
    true,
    'Sun 9am–12pm | Wed 6pm–8pm',
    '5 Khumalo Street',
    '2023-11-20T07:00:00Z'
  ),
  (
    'a1000000-0000-0000-0000-000000000006',
    'Spark Tutoring Centre',
    'Tutoring',
    'spark-tutoring-mamelodi',
    'Mamelodi East, Pretoria',
    'Maths, Science, and English tutoring for Grades 8–12. Small groups, big results.',
    278,
    true,
    'Mon–Fri 3pm–7pm | Sat 9am–2pm',
    '11 Makgatho Drive',
    '2024-02-01T12:00:00Z'
  );


-- ─── Events ──────────────────────────────────────────────────────────────────

INSERT INTO events (id, venue_id, title, description, event_date, price, created_at) VALUES
  (
    'b1000000-0000-0000-0000-000000000001',
    'a1000000-0000-0000-0000-000000000002',
    'Heritage Day Mega Braai',
    'Celebrate Heritage Day with us. Live music, competitions, and the biggest fire of the year.',
    '2025-09-24T12:00:00Z',
    50,
    '2025-09-01T10:00:00Z'
  ),
  (
    'b1000000-0000-0000-0000-000000000002',
    'a1000000-0000-0000-0000-000000000001',
    'Back to School Cut Special',
    'R80 fades for kids under 16 all of January. Show your school schedule at the door.',
    '2025-01-06T08:00:00Z',
    80,
    '2025-01-01T08:00:00Z'
  ),
  (
    'b1000000-0000-0000-0000-000000000003',
    'a1000000-0000-0000-0000-000000000005',
    'Youth Night: Open Mic',
    'Speak, sing, rap, or just show up. A safe space for the youth to express.',
    '2025-07-19T18:00:00Z',
    0,
    '2025-07-10T10:00:00Z'
  ),
  (
    'b1000000-0000-0000-0000-000000000004',
    'a1000000-0000-0000-0000-000000000006',
    'Matric Exam Bootcamp',
    'Intensive 3-day Maths and Science prep. Limited to 15 learners.',
    '2025-10-20T09:00:00Z',
    350,
    '2025-09-15T08:00:00Z'
  );


-- ─── Posts ───────────────────────────────────────────────────────────────────

INSERT INTO posts (id, venue_id, content, created_at) VALUES
  (
    'c1000000-0000-0000-0000-000000000001',
    'a1000000-0000-0000-0000-000000000002',
    'Mama Zulu''s on a Saturday is not a vibe, it''s a lifestyle. Already on my third quart 😤🔥',
    '2025-04-12T15:30:00Z'
  ),
  (
    'c1000000-0000-0000-0000-000000000002',
    'a1000000-0000-0000-0000-000000000001',
    'Uncle Dee gave me the cleanest lineup I''ve ever had. No cap. R120 well spent 💈',
    '2025-04-10T11:00:00Z'
  ),
  (
    'c1000000-0000-0000-0000-000000000003',
    'a1000000-0000-0000-0000-000000000004',
    'Came in with a broken heart and bad hair. Left with box braids and confidence restored 💅',
    '2025-04-08T14:00:00Z'
  ),
  (
    'c1000000-0000-0000-0000-000000000004',
    'a1000000-0000-0000-0000-000000000006',
    'Failed Maths last term. After 3 months at Spark, I got 74% in my trial exam. These tutors are different 📚',
    '2025-04-05T09:00:00Z'
  ),
  (
    'c1000000-0000-0000-0000-000000000005',
    'a1000000-0000-0000-0000-000000000003',
    'Sipho at the corner has everything. Asked for Simba chips and a prepaid meter token at 10pm — delivered 💪',
    '2025-04-03T22:00:00Z'
  ),
  (
    'c1000000-0000-0000-0000-000000000006',
    'a1000000-0000-0000-0000-000000000005',
    'Sunday service was electric today. The youth choir brought the whole building to its feet. God is good 🙏',
    '2025-04-06T13:00:00Z'
  );


-- ─── Check-ins ───────────────────────────────────────────────────────────────

INSERT INTO check_ins (id, venue_id, visitor_name, is_ghost, is_first_visit, visit_number, created_at) VALUES
  (
    'd1000000-0000-0000-0000-000000000001',
    'a1000000-0000-0000-0000-000000000002',
    'Thabo M.',
    false,
    false,
    14,
    '2025-04-12T15:00:00Z'
  ),
  (
    'd1000000-0000-0000-0000-000000000002',
    'a1000000-0000-0000-0000-000000000001',
    'Lerato K.',
    false,
    false,
    7,
    '2025-04-10T10:30:00Z'
  ),
  (
    'd1000000-0000-0000-0000-000000000003',
    'a1000000-0000-0000-0000-000000000003',
    null,
    true,
    false,
    1,
    '2025-04-03T21:55:00Z'
  ),
  (
    'd1000000-0000-0000-0000-000000000004',
    'a1000000-0000-0000-0000-000000000005',
    'Pastor Bongani',
    false,
    false,
    52,
    '2025-04-06T09:00:00Z'
  );
