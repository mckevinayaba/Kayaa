-- ─── Board schema reconciliation + Randburg seed ─────────────────────────────
--
-- The production DB may have been created with a simpler schema:
--   category CHECK IN ('for_sale','free','services','jobs','lost_found','announcer')
--   contact_method + contact_value  (instead of contact_whatsapp)
--   status CHECK IN ('active','sold','expired','closed')  (instead of our 4-value set)
--
-- This migration:
--   1. Safely widens the category constraint to match the app
--   2. Adds contact_whatsapp as an alias (populated from contact_value where type=whatsapp)
--   3. Adds missing columns with safe IF NOT EXISTS guards
--   4. Seeds 45 Randburg posts that will show immediately

-- ════════════════════════════════════════════════════════════════
-- SCHEMA RECONCILIATION
-- ════════════════════════════════════════════════════════════════

-- 1. Add contact_whatsapp if not already present
ALTER TABLE board_posts ADD COLUMN IF NOT EXISTS contact_whatsapp text;

-- 2. Backfill contact_whatsapp from contact_value where method = whatsapp
UPDATE board_posts
SET contact_whatsapp = contact_value
WHERE contact_whatsapp IS NULL
  AND contact_method = 'whatsapp'
  AND contact_value IS NOT NULL;

-- 3. Add missing columns our app uses
ALTER TABLE board_posts ADD COLUMN IF NOT EXISTS images       jsonb    NOT NULL DEFAULT '[]';
ALTER TABLE board_posts ADD COLUMN IF NOT EXISTS expires_at   timestamptz;
ALTER TABLE board_posts ADD COLUMN IF NOT EXISTS country_code text     NOT NULL DEFAULT 'ZA';

-- 4. Widen category constraint to include all app categories
--    Drop old constraint if it exists, add the full set
DO $$
BEGIN
  -- Drop whatever the existing constraint is called (common names)
  BEGIN ALTER TABLE board_posts DROP CONSTRAINT IF EXISTS board_posts_category_check; EXCEPTION WHEN others THEN NULL; END;
  BEGIN ALTER TABLE board_posts DROP CONSTRAINT IF EXISTS board_posts_category_fkey;  EXCEPTION WHEN others THEN NULL; END;
  -- Re-add with full category set
  ALTER TABLE board_posts ADD CONSTRAINT board_posts_category_check
    CHECK (category IN (
      'for_sale','free','services','jobs','lost_found',
      'announcements','announcer',
      'ask','events','accommodation','safety'
    ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 5. Widen status constraint
DO $$
BEGIN
  BEGIN ALTER TABLE board_posts DROP CONSTRAINT IF EXISTS board_posts_status_check; EXCEPTION WHEN others THEN NULL; END;
  ALTER TABLE board_posts ADD CONSTRAINT board_posts_status_check
    CHECK (status IN ('active','resolved','taken','expired','sold','closed'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 6. Ensure RLS is on (no-op if already enabled)
ALTER TABLE board_posts ENABLE ROW LEVEL SECURITY;

-- Read policy — safe to re-create
DO $$
BEGIN
  CREATE POLICY "board_posts_public_select" ON board_posts FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Insert policy
DO $$
BEGIN
  CREATE POLICY "board_posts_auth_insert" ON board_posts FOR INSERT
    WITH CHECK (true);  -- Allow seeded (NULL user_id) inserts
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ════════════════════════════════════════════════════════════════
-- RANDBURG SEED — 45 posts across all categories
-- ════════════════════════════════════════════════════════════════

INSERT INTO board_posts
  (neighbourhood, country_code, category, title, description, price, contact_whatsapp, status, created_at, expires_at)
VALUES

-- ── FOR SALE (14 posts) ───────────────────────────────────────────

(
  'Randburg', 'ZA', 'for_sale',
  '3-seater leather couch for sale',
  'Brown leather 3-seater couch in good condition, few small scratches. Moving house next week, need it gone ASAP. You collect from Randburg CBD. Negotiable. WhatsApp for pics.',
  1500, '+27823456789', 'active',
  now() - interval '2 hours', now() + interval '14 days'
),
(
  'Randburg', 'ZA', 'for_sale',
  'Samsung 55" Smart TV — barely used',
  'Samsung 55 inch 4K smart TV. Bought 8 months ago. Moving overseas, cannot take it. Original box, all cables included. R4200 or nearest offer. Cash only. You collect, Linden.',
  4200, '+27834567890', 'active',
  now() - interval '5 hours', now() + interval '14 days'
),
(
  'Randburg', 'ZA', 'for_sale',
  'LG double door fridge — excellent condition',
  'LG 450L double door fridge, 3 years old. Works perfectly. R3800. Can help arrange delivery at extra cost. Serious buyers only — WhatsApp to view.',
  3800, '+27845678901', 'active',
  now() - interval '1 day', now() + interval '14 days'
),
(
  'Randburg', 'ZA', 'for_sale',
  'Toyota Corolla 2014 — full service history',
  '2014 Toyota Corolla 1.6 Prestige, silver. 148 000km. Full Kayaa service history, never been in an accident. R105 000 negotiable. WhatsApp for viewing — Bordeaux.',
  105000, '+27856789012', 'active',
  now() - interval '3 hours', now() + interval '14 days'
),
(
  'Randburg', 'ZA', 'for_sale',
  'iPhone 13 — 128GB, midnight black',
  'iPhone 13, midnight black, 128GB. Screen replaced 2 months ago (genuine screen). Battery health 91%. Comes with charger and case. R7800 firm. WhatsApp only.',
  7800, '+27867890123', 'active',
  now() - interval '4 hours', now() + interval '14 days'
),
(
  'Randburg', 'ZA', 'for_sale',
  'Defy 6kg washing machine — good condition',
  'Defy 6kg top loader washing machine. Works well. Selling because upgrading. R1400 negotiable. You collect from Northcliff. WhatsApp me.',
  1400, '+27878901234', 'active',
  now() - interval '6 hours', now() + interval '14 days'
),
(
  'Randburg', 'ZA', 'for_sale',
  'Queen bed + mattress — 2 years old',
  'Queen size bed frame with mattress. Black headboard, good condition. Moving and cannot take it. R2200 for both. Collection from Randburg. Must go this weekend.',
  2200, '+27889012345', 'active',
  now() - interval '8 hours', now() + interval '14 days'
),
(
  'Randburg', 'ZA', 'for_sale',
  'Gym equipment bundle — home gym setup',
  'Selling full home gym: barbell + weights (100kg total), adjustable bench, pull-up bar, resistance bands. Paid R12000 new, selling for R5500 all in. Collect Linden.',
  5500, '+27890123456', 'active',
  now() - interval '10 hours', now() + interval '14 days'
),
(
  'Randburg', 'ZA', 'for_sale',
  'Baby cot + mattress + changing table',
  'Baby cot with mattress, drop-side. Includes changing table and storage. Used for 1 year, excellent condition. Neutral colours. R1800 for the set. WhatsApp for pics.',
  1800, '+27801234567', 'active',
  now() - interval '12 hours', now() + interval '14 days'
),
(
  'Randburg', 'ZA', 'for_sale',
  'PlayStation 4 Pro + 5 games',
  'PS4 Pro, 1TB, black. Comes with 2 controllers and 5 games (FIFA 23, GTA V, COD, Spider-Man, God of War). Everything works perfect. R4000 negotiable. Randburg.',
  4000, '+27812345678', 'active',
  now() - interval '14 hours', now() + interval '14 days'
),
(
  'Randburg', 'ZA', 'for_sale',
  'Dining table + 4 chairs — solid wood',
  'Solid wood dining table, seats 4 comfortably. 3 years old. Minor scratches on top. R1600 for the set. You collect, Greenside. Cash only.',
  1600, '+27823456780', 'active',
  now() - interval '16 hours', now() + interval '14 days'
),
(
  'Randburg', 'ZA', 'for_sale',
  'Hair salon equipment — 3 chairs, mirrors, basins',
  'Selling full salon setup: 3 styling chairs, 3 mirrors with vanity units, 2 wash basins, steamer. All working. R8500 for the lot. Ideal for someone starting a salon. Randburg.',
  8500, '+27834567891', 'active',
  now() - interval '2 days', now() + interval '14 days'
),
(
  'Randburg', 'ZA', 'for_sale',
  'MacBook Air M1 — 8GB/256GB',
  'MacBook Air M1, 2020, silver. 8GB RAM, 256GB SSD. Minor scratch on lid, everything works perfectly. Battery life still excellent. R12500. Randpark Ridge.',
  12500, '+27845678902', 'active',
  now() - interval '18 hours', now() + interval '14 days'
),
(
  'Randburg', 'ZA', 'for_sale',
  'Gas stove — 4 burner + gas cylinder',
  '4-burner gas stove with half-full 9kg cylinder. Both in good working condition. Selling because moving to electric hob. R1200 for both. Collect from Ferndale.',
  1200, '+27856789013', 'active',
  now() - interval '20 hours', now() + interval '14 days'
),

-- ── FREE (7 posts) ────────────────────────────────────────────────

(
  'Randburg', 'ZA', 'free',
  'Free — 3 kittens to a good home',
  'Three kittens, 8 weeks old. 2 grey and white, 1 ginger. Healthy, playful, litter trained. Giving away to good home only. Based in Northcliff. WhatsApp to arrange viewing.',
  NULL, '+27867890124', 'active',
  now() - interval '3 hours', now() + interval '14 days'
),
(
  'Randburg', 'ZA', 'free',
  'Free — moving boxes, various sizes (15+)',
  'Cleared out my storage. Have 15+ moving boxes in various sizes, some double-walled. Free to collect from Bordeaux this week only.',
  NULL, '+27878901235', 'active',
  now() - interval '7 hours', now() + interval '14 days'
),
(
  'Randburg', 'ZA', 'free',
  'Free — kids clothes, ages 2–8, bags full',
  'Three bags of kids clothes, ages 2 to 8. Boys and girls. All washed and in good condition. Come collect from Linden any day this week from 9am–5pm.',
  NULL, '+27889012346', 'active',
  now() - interval '1 day', now() + interval '14 days'
),
(
  'Randburg', 'ZA', 'free',
  'Free — old books and magazines',
  'Clearing out my bookshelf. Novels, magazines (Top Gear, Drum, True Love, Car), old textbooks. At least 50 items. First to collect gets the lot. Randburg.',
  NULL, '+27890123457', 'active',
  now() - interval '9 hours', now() + interval '14 days'
),
(
  'Randburg', 'ZA', 'free',
  'Free — garden plants (clivias, aloes, succulents)',
  'Dividing my garden. Have clivias, aloes, various succulents, and some indigenous shrubs. You dig and collect from Blairgowrie. Weekends only.',
  NULL, '+27801234568', 'active',
  now() - interval '2 days', now() + interval '14 days'
),
(
  'Randburg', 'ZA', 'free',
  'Free — office chair, slightly broken armrest',
  'Black office chair, one armrest cracked but still usable. Otherwise in good condition. You collect from Randburg this week. First to WhatsApp.',
  NULL, '+27812345679', 'active',
  now() - interval '11 hours', now() + interval '14 days'
),
(
  'Randburg', 'ZA', 'free',
  'Free — old Macbook parts (not working)',
  'Old MacBook Pro 2015, logic board dead. Screen still good, battery holds charge. Free to someone who can repair or use for parts. Greenside.',
  NULL, '+27823456781', 'active',
  now() - interval '3 days', now() + interval '14 days'
),

-- ── SERVICES (11 posts) ───────────────────────────────────────────

(
  'Randburg', 'ZA', 'services',
  '💈 Mobile Barber — I come to you, Randburg area',
  'Qualified barber with 9 years experience. I come to your home or office. Fades, taper cuts, lineups, beard trims and shaping. R120 for a full cut. Available Tuesday to Sunday from 8am. Book early for weekends.',
  120, '+27834567892', 'active',
  now() - interval '4 hours', now() + interval '30 days'
),
(
  'Randburg', 'ZA', 'services',
  '🔌 Electrician — faults, certificates, geysers',
  'Registered electrician covering Randburg and surrounds. COC certificates, geyser repairs and replacements, fault finding, DB board upgrades. R350 call-out, work quoted separately. 7 days a week, emergencies welcome.',
  350, '+27845678903', 'active',
  now() - interval '6 hours', now() + interval '30 days'
),
(
  'Randburg', 'ZA', 'services',
  '🧹 Reliable domestic worker — 10+ years exp',
  'I have 10 years experience working as a domestic worker in Randburg and Northcliff. I have excellent references. Available for full time or part time. Honest, hardworking, trustworthy. WhatsApp to discuss.',
  NULL, '+27856789014', 'active',
  now() - interval '1 day', now() + interval '30 days'
),
(
  'Randburg', 'ZA', 'services',
  '🔧 Plumber — leaks, blocked drains, geysers',
  'Experienced plumber, 15 years in the trade. Randburg, Linden, Northcliff, Bordeaux. All plumbing work: burst pipes, blocked drains, geyser installation, tap repairs. R280 call-out. WhatsApp for quote.',
  280, '+27867890125', 'active',
  now() - interval '8 hours', now() + interval '30 days'
),
(
  'Randburg', 'ZA', 'services',
  '✂️ Hair braiding — box braids, cornrows, knotless',
  'I do box braids, knotless braids, cornrows, Ghana braids, faux locs. Working from home in Linden. R500–R950 depending on length and style. Bookings open for weekends. WhatsApp for pics of my work.',
  500, '+27878901236', 'active',
  now() - interval '3 hours', now() + interval '30 days'
),
(
  'Randburg', 'ZA', 'services',
  '🚗 Car wash — I come to your home or office',
  'Mobile car wash covering Randburg, Northcliff, Blairgowrie, and Linden. Full exterior wash and interior vacuum R95. Full detail including tyre shine R160. I bring my own equipment and water. 7 days.',
  95, '+27889012347', 'active',
  now() - interval '5 hours', now() + interval '30 days'
),
(
  'Randburg', 'ZA', 'services',
  '📚 Private tutor — Grade 8-12 Maths & Science',
  'Qualified teacher offering tutoring for Grade 8 to 12. Maths, Physical Science, Life Sciences. R130 per hour. I can come to your home or you can come to me in Ferndale. Group sessions (3 learners) R80 each.',
  130, '+27890123458', 'active',
  now() - interval '2 days', now() + interval '30 days'
),
(
  'Randburg', 'ZA', 'services',
  '📸 Event photographer — weddings, parties, matric',
  'Professional photographer available for weddings, birthday parties, matric formals, corporate events. Edited gallery delivered within 5 days. Packages from R2500. WhatsApp for portfolio and packages.',
  2500, '+27801234569', 'active',
  now() - interval '12 hours', now() + interval '30 days'
),
(
  'Randburg', 'ZA', 'services',
  '🍳 Home catering — events, meetings, celebrations',
  'I cater for home events, corporate lunches, birthday parties, funerals. Traditional and modern food. Pap and meat, chicken dishes, salads, desserts. R90 per head, minimum 15 people. Based in Randburg, deliver in Joburg North.',
  90, '+27812345680', 'active',
  now() - interval '16 hours', now() + interval '30 days'
),
(
  'Randburg', 'ZA', 'services',
  '🎵 DJ for hire — any event, own sound system',
  'Professional DJ, 11 years experience. I have my own sound system — 2x 15" powered speakers, subwoofer, full lighting setup. Weddings, birthday parties, year-end functions. R2000 for 4 hours. Randburg based.',
  2000, '+27823456782', 'active',
  now() - interval '1 day', now() + interval '30 days'
),
(
  'Randburg', 'ZA', 'services',
  '👗 Tailor and dressmaker — formal and traditional',
  'Qualified tailor offering dressmaking and alterations. I specialise in traditional African attire, formal dresses, and suit alterations. R180 for basic alterations, dressmaking quoted per item. Randburg, appointments preferred.',
  180, '+27834567893', 'active',
  now() - interval '18 hours', now() + interval '30 days'
),

-- ── JOBS (9 posts) ────────────────────────────────────────────────

(
  'Randburg', 'ZA', 'jobs',
  'Domestic worker wanted — 3 days per week',
  'Family in Northcliff looking for a reliable domestic worker for Mondays, Wednesdays, and Fridays. Must be honest, hardworking, and have references. R220 per day. WhatsApp CV or references.',
  NULL, '+27845678904', 'active',
  now() - interval '4 hours', now() + interval '30 days'
),
(
  'Randburg', 'ZA', 'jobs',
  'Driver wanted — code 10 — FMCG deliveries',
  'Distribution company in Randburg needs a code 10 driver for local FMCG deliveries. Must have clean record and PDP. R8500 per month. WhatsApp CV to apply. Start ASAP.',
  NULL, '+27856789015', 'active',
  now() - interval '6 hours', now() + interval '30 days'
),
(
  'Randburg', 'ZA', 'jobs',
  'Hairdresser wanted — experience required',
  'Busy salon in Bordeaux looking for an experienced hairdresser. Must be able to do cuts, colour, relaxers, and blow-dries. Commission-based. WhatsApp us with a portfolio. Start Monday.',
  NULL, '+27867890126', 'active',
  now() - interval '1 day', now() + interval '30 days'
),
(
  'Randburg', 'ZA', 'jobs',
  'Security guard needed — PSIRA registered',
  'Security company looking for PSIRA-registered guards for a Randburg retail client. Day and night shift rotation. R7200 per month. WhatsApp your PSIRA number and ID.',
  NULL, '+27878901237', 'active',
  now() - interval '8 hours', now() + interval '30 days'
),
(
  'Randburg', 'ZA', 'jobs',
  'Shop assistant — hardware store, Randburg CBD',
  'Hardware store in Randburg CBD looking for a shop assistant. Must be reliable and good with customers. R4500 per month. Monday to Saturday. WhatsApp CV — no phone calls please.',
  NULL, '+27889012348', 'active',
  now() - interval '2 days', now() + interval '30 days'
),
(
  'Randburg', 'ZA', 'jobs',
  'Casual waiters needed — weekend events',
  'Events company looking for experienced waiters for weekend corporate events and weddings in Joburg North. R350 per event. Must have own transport. WhatsApp your experience.',
  NULL, '+27890123459', 'active',
  now() - interval '10 hours', now() + interval '30 days'
),
(
  'Randburg', 'ZA', 'jobs',
  'Painter needed — interior and exterior',
  'Small construction company looking for an experienced painter for a 3-week job in Linden. Must supply own tools. R850 per day. Start Monday. Reliable people only. WhatsApp.',
  NULL, '+27801234570', 'active',
  now() - interval '14 hours', now() + interval '30 days'
),
(
  'Randburg', 'ZA', 'jobs',
  'Part-time cashier — tuckshop, Ferndale',
  'Tuckshop in Ferndale looking for a part-time cashier for afternoons and weekends. R3200 per month. Must be honest, good with money. Live nearby preferred. WhatsApp.',
  NULL, '+27812345681', 'active',
  now() - interval '16 hours', now() + interval '30 days'
),
(
  'Randburg', 'ZA', 'jobs',
  'Garden service worker — weekly rounds',
  'Garden service company looking for an experienced garden worker. Own transport is a plus. R230 per day, 4 days per week. Covering Randburg, Northcliff, Linden. WhatsApp CV.',
  NULL, '+27823456783', 'active',
  now() - interval '3 days', now() + interval '30 days'
),

-- ── LOST & FOUND (5 posts) ────────────────────────────────────────

(
  'Randburg', 'ZA', 'lost_found',
  'Lost — brown Staffie dog, Northcliff area',
  'My brown Staffordshire bull terrier "Rocky" went missing from Northcliff on Thursday evening. He is friendly, wearing a red collar with a tag. Please call or WhatsApp if you see him. Reward offered.',
  NULL, '+27834567894', 'active',
  now() - interval '2 hours', NULL
),
(
  'Randburg', 'ZA', 'lost_found',
  'Found — green ID book, near Randburg taxi rank',
  'Found a green ID book near the Randburg taxi rank on Wednesday morning. WhatsApp me to describe the book and I will return it to the owner. Keeping it safe.',
  NULL, '+27845678905', 'active',
  now() - interval '8 hours', NULL
),
(
  'Randburg', 'ZA', 'lost_found',
  'Lost — black handbag, Randburg Shoprite',
  'I left my black leather handbag in or near Shoprite Randburg on Tuesday afternoon. It has my phone, wallet, and keys inside. If found please WhatsApp urgently. Reward.',
  NULL, '+27856789016', 'active',
  now() - interval '1 day', NULL
),
(
  'Randburg', 'ZA', 'lost_found',
  'Found — child''s blue school bag, Linden Road',
  'Found a blue school bag on Linden Road on Monday afternoon. Has Gr4 books inside. Please describe to identify and collect from me in Linden.',
  NULL, '+27867890127', 'active',
  now() - interval '3 days', NULL
),
(
  'Randburg', 'ZA', 'lost_found',
  'Lost — car keys with red key ring, Randburg Park',
  'Lost a set of car keys with a red key ring somewhere in Randburg Park on Saturday. VW key fob. If found please WhatsApp — I am stranded.',
  NULL, '+27878901238', 'active',
  now() - interval '5 hours', NULL
),

-- ── ANNOUNCEMENTS (6 posts) ───────────────────────────────────────

(
  'Randburg', 'ZA', 'announcements',
  'Community stokvel meeting — Sunday 3pm',
  'All Malvern Stokvel members: monthly meeting this Sunday at 3pm at Mama Joyce''s house in Ferndale. Please bring your contributions and December draw nominations. Refreshments provided.',
  NULL, '+27889012349', 'active',
  now() - interval '1 hour', now() + interval '7 days'
),
(
  'Randburg', 'ZA', 'announcements',
  'Northcliff Community Watch meeting — Tuesday 7pm',
  'Community Watch meeting this Tuesday at 7pm at the Northcliff community hall. We will discuss the recent break-ins in the area and our new patrol rota. All residents welcome.',
  NULL, NULL, 'active',
  now() - interval '3 hours', now() + interval '7 days'
),
(
  'Randburg', 'ZA', 'announcements',
  'Load shedding — Stage 3 this week, Randburg schedule',
  'Eskom has confirmed Stage 3 load shedding for the week. Randburg areas are mostly on schedule 6. Get the app for your exact times. The community centre on Jan Smuts has charging stations 8am–4pm.',
  NULL, NULL, 'active',
  now() - interval '2 hours', now() + interval '7 days'
),
(
  'Randburg', 'ZA', 'announcements',
  'Street repair notice — Boundary Road, Thursday',
  'The City of Joburg will be repairing potholes on Boundary Road between Jan Smuts and Barry Hertzog on Thursday. Expect lane closures from 9am–3pm. Use Bram Fischer as alternative.',
  NULL, NULL, 'active',
  now() - interval '6 hours', now() + interval '7 days'
),
(
  'Randburg', 'ZA', 'announcements',
  'Annual Ferndale Flea Market — this Saturday',
  'The Ferndale flea market is back this Saturday from 9am at the Ferndale Village parking lot. 80+ stalls. Food, clothes, crafts, plants. Free entry. Rain or shine.',
  NULL, '+27890123460', 'active',
  now() - interval '1 day', now() + interval '7 days'
),
(
  'Randburg', 'ZA', 'announcements',
  '5-a-side soccer tournament — Northcliff Stadium',
  'Annual Northcliff 5-a-side soccer tournament next Saturday. Open to all ages. R200 entry per team of 5. WhatsApp to register by Thursday. Prizes for top 3. Braai and cold drinks on site.',
  NULL, '+27801234571', 'active',
  now() - interval '2 days', now() + interval '7 days'
);


-- ════════════════════════════════════════════════════════════════
-- ALSO SEED ADJACENT JOHANNESBURG NEIGHBOURHOODS
-- (App expands to city-wide if local results are sparse)
-- ════════════════════════════════════════════════════════════════

INSERT INTO board_posts
  (neighbourhood, country_code, category, title, description, price, contact_whatsapp, status, created_at, expires_at)
VALUES
(
  'Johannesburg', 'ZA', 'services',
  '🔌 Electrician — Joburg North coverage',
  'Registered electrician covering all of Joburg North including Randburg, Northcliff, Linden, Dunkeld, Melville. COC certificates, DB upgrades, geyser work. R350 call-out. Available 7 days.',
  350, '+27812345682', 'active',
  now() - interval '5 hours', now() + interval '30 days'
),
(
  'Northcliff', 'ZA', 'for_sale',
  'Trek mountain bike — excellent condition',
  'Trek Marlin 7 mountain bike, 2022. Ridden about 15 times, still like new. Hydraulic disc brakes, 29" wheels. R9500 negotiable. Northcliff. WhatsApp for pics.',
  9500, '+27823456784', 'active',
  now() - interval '7 hours', now() + interval '14 days'
),
(
  'Linden', 'ZA', 'announcements',
  'New clinic opening — Linden Medical Centre',
  'Linden Medical Centre is opening on 1 May. Offering GP consultations, chronic medication management, and basic blood tests. Open Monday to Saturday. Medical aid and cash accepted. On 7th Street.',
  NULL, NULL, 'active',
  now() - interval '4 hours', now() + interval '7 days'
),
(
  'Northcliff', 'ZA', 'jobs',
  'Nanny wanted — infant care, Northcliff',
  'Young professional family in Northcliff looking for a nanny for a 6-month-old baby. Monday to Friday, 7am–5pm. R5500 per month. Must have experience with infants and references. WhatsApp.',
  NULL, '+27834567895', 'active',
  now() - interval '9 hours', now() + interval '30 days'
),
(
  'Greenside', 'ZA', 'lost_found',
  'Found — black labrador, Greenside',
  'Found a black labrador near Barry Hertzog Ave on Sunday evening. Friendly, well-fed, no collar. Keeping him safe. WhatsApp to identify and collect from Greenside.',
  NULL, '+27845678906', 'active',
  now() - interval '18 hours', NULL
),
(
  'Linden', 'ZA', 'free',
  'Free — outdoor garden furniture (plastic, faded)',
  'Old white plastic garden table and 4 chairs. Faded and scratched but functional. Free if you collect from Linden this week. WhatsApp first.',
  NULL, '+27856789017', 'active',
  now() - interval '1 day', now() + interval '14 days'
),
(
  'Northcliff', 'ZA', 'services',
  '🧹 Professional cleaning service — residential',
  'Professional deep cleaning service for homes in Randburg, Northcliff, and Linden. We supply all equipment and products. Spring clean R850, monthly maintenance R450. WhatsApp for availability.',
  450, '+27867890128', 'active',
  now() - interval '11 hours', now() + interval '30 days'
),
(
  'Linden', 'ZA', 'for_sale',
  'Piano — upright, Yamaha, needs light tuning',
  'Yamaha upright piano, 1990s. Plays well, needs a tune (about R600). Solid wood cabinet. R6500 including delivery in Joburg North. Serious inquiries only — WhatsApp.',
  6500, '+27878901239', 'active',
  now() - interval '2 days', now() + interval '14 days'
);


-- ════════════════════════════════════════════════════════════════
-- UPDATE INDEXES for fast neighbourhood lookups
-- ════════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS board_posts_neighbourhood_idx ON board_posts (neighbourhood);
CREATE INDEX IF NOT EXISTS board_posts_category_idx      ON board_posts (category);
CREATE INDEX IF NOT EXISTS board_posts_status_idx        ON board_posts (status);
CREATE INDEX IF NOT EXISTS board_posts_created_at_idx    ON board_posts (created_at DESC);
