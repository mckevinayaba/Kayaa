-- ─── Seed Content: Board Posts, User Posts, Neighbourhood Posts ──────────────
-- Realistic neighbourhood content across all categories and major SA areas.
-- user_id = NULL handled gracefully in UI (anonymous/community posts).

-- ════════════════════════════════════════════════════════════════
-- BOARD POSTS
-- ════════════════════════════════════════════════════════════════

INSERT INTO board_posts (neighbourhood, country_code, category, title, description, price, contact_whatsapp, status, created_at, expires_at)
VALUES

-- ── FOR SALE ─────────────────────────────────────────────────────
(
  'Soweto', 'ZA', 'for_sale',
  'Used PlayStation 5 with 3 controllers',
  'Selling my PS5, barely used. 3 controllers included. Collection from Orlando West. Serious buyers only.',
  5500, '+27612345678', 'active',
  now() - interval '4 hours',
  now() + interval '14 days'
),
(
  'Alexandra', 'ZA', 'for_sale',
  'Dining table set — 6 chairs',
  'Solid wood dining table with 6 chairs. Good condition. Moving to smaller place. Must go this week.',
  2200, '+27623456789', 'active',
  now() - interval '1 day',
  now() + interval '14 days'
),
(
  'Tembisa', 'ZA', 'for_sale',
  'Baby clothes bundle — size 0–6 months',
  'Bundle of baby clothes, newborn to 6 months. All washed and ironed. R300 for the whole lot. Collection from Tembisa.',
  300, '+27634567890', 'active',
  now() - interval '2 hours',
  now() + interval '14 days'
),
(
  'Khayelitsha', 'ZA', 'for_sale',
  'Gas stove — 4 burner, excellent condition',
  'Defy gas stove, 4 burner. Used for 2 years, works perfectly. Selling because we moved to electric. R850.',
  850, '+27645678901', 'active',
  now() - interval '6 hours',
  now() + interval '14 days'
),
(
  'Sandton', 'ZA', 'for_sale',
  'Mountain bike — Trek, barely used',
  'Trek Marlin 5 mountain bike. Bought 8 months ago, ridden maybe 10 times. Perfect condition. R4800 or nearest offer.',
  4800, '+27656789012', 'active',
  now() - interval '3 hours',
  now() + interval '14 days'
),

-- ── FREE ─────────────────────────────────────────────────────────
(
  'Rosebank', 'ZA', 'free',
  'Free — moving boxes, 20 available',
  'Moving boxes, all different sizes. Free if you can collect from Rosebank. First come first served.',
  NULL, '+27645678901', 'active',
  now() - interval '6 hours',
  now() + interval '14 days'
),
(
  'Khayelitsha', 'ZA', 'free',
  'Free — old school uniforms, various sizes',
  'My kids have outgrown their school uniforms. Available for free to anyone who needs them. Call to arrange collection.',
  NULL, '+27656789012', 'active',
  now() - interval '8 hours',
  now() + interval '14 days'
),
(
  'Mamelodi', 'ZA', 'free',
  'Free — single bed and mattress, good condition',
  'Moving next week. Single bed frame and mattress, both in good condition. Free to collect. WhatsApp to arrange.',
  NULL, '+27667890123', 'active',
  now() - interval '12 hours',
  now() + interval '14 days'
),
(
  'Meadowlands', 'ZA', 'free',
  'Free — bags of clothes, all sizes',
  'Clearing out wardrobe. Mixed adults and kids clothes. All clean and ironed. Free to anyone who needs them. Come between 10am–4pm weekdays.',
  NULL, '+27678901234', 'active',
  now() - interval '2 days',
  now() + interval '14 days'
),

-- ── SERVICES (Post Your Skills) ───────────────────────────────────
(
  'Soweto', 'ZA', 'services',
  '💈 Mobile Barber — I come to you',
  'I am a qualified barber with 8 years experience. I come to your home or office. Fades, lineups, beard trims. R100 for a standard cut. Book for weekends or after work. WhatsApp me.',
  100, '+27667890123', 'active',
  now() - interval '3 hours',
  now() + interval '30 days'
),
(
  'Randburg', 'ZA', 'services',
  '🔌 Electrician — home repairs, geyser issues',
  'Certified electrician available for home repairs, geyser problems, light fittings, and emergency work. R350 call-out fee, work quoted separately. Available weekdays and Saturdays.',
  350, '+27678901234', 'active',
  now() - interval '5 hours',
  now() + interval '30 days'
),
(
  'Sandton', 'ZA', 'services',
  '🧹 Domestic Worker — full time or part time',
  'Experienced domestic worker available full time or part time. I have 10 years experience and references. Honest, reliable, and thorough. Available immediately.',
  NULL, '+27689012345', 'active',
  now() - interval '1 day',
  now() + interval '30 days'
),
(
  'Meadowlands', 'ZA', 'services',
  '🚗 Mobile Car Wash — I come to your home',
  'I run a mobile car wash service. I come to your house with my own water and cleaning supplies. R80 for a full wash. Available 7 days a week. Book via WhatsApp.',
  80, '+27690123456', 'active',
  now() - interval '7 hours',
  now() + interval '30 days'
),
(
  'Khayelitsha', 'ZA', 'services',
  '✂️ Hair Braiding — box braids, cornrows',
  'I do box braids, cornrows, twists and natural hair styling. I work from home in Site B. R450–R800 depending on length and style. Bookings open for Saturdays.',
  450, '+27601234567', 'active',
  now() - interval '2 hours',
  now() + interval '30 days'
),
(
  'Tembisa', 'ZA', 'services',
  '👗 Tailor — dressmaking and alterations',
  'Qualified tailor available for dressmaking, alterations, and repairs. I have been working in Tembisa for 15 years. R150 for basic alterations, dressmaking quoted separately. Visit me in Rabie Street.',
  150, '+27612345679', 'active',
  now() - interval '10 hours',
  now() + interval '30 days'
),
(
  'Mamelodi', 'ZA', 'services',
  '🎵 DJ — weddings, parties, church events',
  'Professional DJ with 8 years experience. I have my own sound system. Available for weddings, birthday parties, church events, and corporate functions. R1500 for 4 hours. Book early — weekends fill up fast.',
  1500, '+27623456790', 'active',
  now() - interval '12 hours',
  now() + interval '30 days'
),
(
  'Midrand', 'ZA', 'services',
  '📚 Private Tutor — Maths and Science',
  'I am a qualified teacher offering private tutoring for Grade 10–12. Maths, Physical Science, Life Sciences. R120 per hour. Available weekday evenings and Saturdays. I can come to your home or you can come to me in Midrand.',
  120, '+27634567901', 'active',
  now() - interval '1 day',
  now() + interval '30 days'
),
(
  'Soweto', 'ZA', 'services',
  '🍳 Home Caterer — events of any size',
  'I cater for events of any size. Specialising in pap and meat, chicken dishes, salads and traditional food. R80 per head, minimum 20 people. I have been catering for Soweto events for 12 years. Available weekends and holidays.',
  80, '+27645678902', 'active',
  now() - interval '14 hours',
  now() + interval '30 days'
),
(
  'Alexandra', 'ZA', 'services',
  '🔧 Mechanic — home visits and garage work',
  'Qualified mechanic with 15 years experience. I do home visits or you can bring your car to my garage. R250 call-out fee, parts quoted separately. I do all makes and models. Available 7 days a week.',
  250, '+27656789013', 'active',
  now() - interval '9 hours',
  now() + interval '30 days'
),
(
  'Johannesburg', 'ZA', 'services',
  '🎨 House Painter — interior and exterior',
  'Experienced house painter available for interior and exterior work. I supply materials or use yours. Reasonable rates, neat work. Free quote. Available for jobs of any size. WhatsApp for a quote.',
  NULL, '+27667890124', 'active',
  now() - interval '16 hours',
  now() + interval '30 days'
),
(
  'Pretoria', 'ZA', 'services',
  '👶 Childminder — experienced and loving',
  'I am an experienced childminder available full time or part time. I have 8 years experience with children of all ages, including infants. I have first aid training. References available. WhatsApp me.',
  NULL, '+27678901235', 'active',
  now() - interval '20 hours',
  now() + interval '30 days'
),
(
  'Roodepoort', 'ZA', 'services',
  '🪟 Plumber — leaks, burst pipes, geysers',
  'Registered plumber covering Roodepoort and surrounding areas. Emergency call-outs welcome. R300 call-out, work quoted on site. Geysers, leaks, burst pipes, new installations. Available 7 days.',
  300, '+27689012346', 'active',
  now() - interval '4 hours',
  now() + interval '30 days'
),

-- ── JOBS ──────────────────────────────────────────────────────────
(
  'Rosebank', 'ZA', 'jobs',
  'Part-time barista needed — Rosebank café',
  'Small café in Rosebank looking for a part-time barista. Must have own transport. 3 shifts per week. Training provided. R30 per hour. Start immediately.',
  NULL, '+27667890124', 'active',
  now() - interval '5 hours',
  now() + interval '30 days'
),
(
  'Soweto', 'ZA', 'jobs',
  'General worker needed — construction site',
  'Construction company in Orlando West needs 3 general workers. R200 per day, paid weekly. Start Monday. Must have own boots. No experience needed but must be reliable and hardworking.',
  NULL, '+27678901235', 'active',
  now() - interval '1 day',
  now() + interval '30 days'
),
(
  'Tembisa', 'ZA', 'jobs',
  'Cashier wanted — spaza shop',
  'Spaza shop in Tembisa looking for a cashier. R3500 per month. Must be available Saturdays and Sundays. Must be good with money and honest. Start next week.',
  NULL, '+27689012346', 'active',
  now() - interval '8 hours',
  now() + interval '30 days'
),
(
  'Khayelitsha', 'ZA', 'jobs',
  'Delivery driver needed — local courier',
  'Small courier company looking for a driver. Must have valid license and reliable vehicle. R6500 per month, fuel allowance included. Monday to Saturday. WhatsApp CV.',
  NULL, '+27690123457', 'active',
  now() - interval '2 days',
  now() + interval '30 days'
),
(
  'Johannesburg', 'ZA', 'jobs',
  'Security guard — shopping centre',
  'Security company seeking PSIRA-registered guards for a Joburg shopping centre. Day and night shifts. R7000–R8500 per month depending on experience. WhatsApp your CV.',
  NULL, '+27601234568', 'active',
  now() - interval '3 days',
  now() + interval '30 days'
),

-- ── LOST & FOUND ──────────────────────────────────────────────────
(
  'Sandton', 'ZA', 'lost_found',
  'Lost — grey cat, responds to Milo',
  'My grey cat Milo went missing from Sandton on Saturday. He is friendly and has a blue collar. Please call or WhatsApp if you see him. There is a reward.',
  NULL, '+27690123457', 'active',
  now() - interval '18 hours',
  NULL
),
(
  'Meadowlands', 'ZA', 'lost_found',
  'Found — Samsung phone, black',
  'I found a black Samsung phone near the taxi rank on Sunday morning. The owner can collect it from the spaza on Mooki Street. Please describe the phone to prove it is yours.',
  NULL, '+27601234568', 'active',
  now() - interval '12 hours',
  NULL
),
(
  'Soweto', 'ZA', 'lost_found',
  'Lost — brown leather wallet in Orlando',
  'Lost my brown leather wallet somewhere in Orlando West on Friday afternoon. Has my ID and bank cards inside. If found please WhatsApp me. There is a reward.',
  NULL, '+27612345680', 'active',
  now() - interval '2 days',
  NULL
),
(
  'Alexandra', 'ZA', 'lost_found',
  'Found — kid''s school bag, London Road',
  'Found a blue school bag on London Road this morning. Has books inside. Please contact me to identify and collect. Keeping at the corner spaza until claimed.',
  NULL, '+27623456791', 'active',
  now() - interval '6 hours',
  NULL
),

-- ── ANNOUNCEMENTS ─────────────────────────────────────────────────
(
  'Meadowlands', 'ZA', 'announcements',
  'Road closure — Main Road Meadowlands, Wednesday 7am–3pm',
  'Eskom will be working on the Main Road on Wednesday. The road will be closed from 7am to 3pm. Please find alternative routes. Sorry for the inconvenience.',
  NULL, '+27612345680', 'active',
  now() - interval '1 day',
  now() + interval '7 days'
),
(
  'Khayelitsha', 'ZA', 'announcements',
  'Free COVID booster clinic — Saturday 9am–4pm',
  'Free COVID booster clinic at Site B community hall this Saturday from 9am to 4pm. Open to everyone, no booking needed. Bring your ID.',
  NULL, NULL, 'active',
  now() - interval '6 hours',
  now() + interval '7 days'
),
(
  'Tembisa', 'ZA', 'announcements',
  'Water outage — Rabie Street area, Thursday',
  'Rand Water will be doing maintenance on Thursday from 8am. Water supply to Rabie Street and surrounding areas will be interrupted until approximately 5pm. Please store water in advance.',
  NULL, NULL, 'active',
  now() - interval '3 hours',
  now() + interval '7 days'
),
(
  'Mamelodi', 'ZA', 'announcements',
  'Load shedding notice — Stage 4 this week',
  'Eskom has confirmed Stage 4 load shedding for the rest of this week. Check the Eskom app for your schedule. The local community centre will have charging stations available from 9am–5pm daily.',
  NULL, NULL, 'active',
  now() - interval '5 hours',
  now() + interval '7 days'
),

-- ── ASK ───────────────────────────────────────────────────────────
(
  'Soweto', 'ZA', 'ask',
  'Anyone know a good plumber in Soweto?',
  'My geyser burst this morning. I need a plumber who is available today in Orlando West or nearby. Please recommend someone good. Thank you.',
  NULL, '+27623456791', 'active',
  now() - interval '2 hours',
  now() + interval '7 days'
),
(
  'Tembisa', 'ZA', 'ask',
  'Best shisanyama in Tembisa for a birthday?',
  'I am planning a birthday for 30 people on Saturday. Which shisanyama in Tembisa would you recommend for good food and a space to sit? Budget R5000. Thanks.',
  NULL, '+27634567902', 'active',
  now() - interval '10 hours',
  now() + interval '7 days'
),
(
  'Rosebank', 'ZA', 'ask',
  'Good mechanic in or near Rosebank?',
  'My car is making a noise when I brake. Looking for a trustworthy mechanic nearby. Preferably someone who has been recommended. Thanks.',
  NULL, '+27645678903', 'active',
  now() - interval '4 hours',
  now() + interval '7 days'
),
(
  'Khayelitsha', 'ZA', 'ask',
  'Where to register a small business in Site B?',
  'I want to register my spaza shop formally. Does anyone know where to go in Site B or Khayelitsha to register a small business? Is there a SARS or CIPC office nearby?',
  NULL, NULL, 'active',
  now() - interval '1 day',
  now() + interval '7 days'
),

-- ── EVENTS ────────────────────────────────────────────────────────
(
  'Alexandra', 'ZA', 'events',
  'Community Braai — Free Entry',
  'Community braai at the community hall on Saturday from 1pm. Free entry. Music, food stalls, activities for kids. Bring your family.',
  NULL, NULL, 'active',
  now() - interval '8 hours',
  now() + interval '7 days'
),
(
  'Meadowlands', 'ZA', 'events',
  'Open Mic Night — Mooki Street Hall',
  'Open mic night at the community hall on Friday from 7pm. All genres welcome — poetry, music, comedy. Free entry. Bar open. Come support local talent.',
  NULL, '+27634567903', 'active',
  now() - interval '1 day',
  now() + interval '7 days'
),
(
  'Soweto', 'ZA', 'events',
  'Heritage Day celebration — Orlando Stadium',
  'Join us for Heritage Day at Orlando Stadium. Traditional food, cultural performances, and music from local artists. Family-friendly event. Free entry before 12pm.',
  NULL, NULL, 'active',
  now() - interval '2 days',
  now() + interval '7 days'
),
(
  'Khayelitsha', 'ZA', 'events',
  'Youth soccer tournament — Site B ground',
  'Under-17 and Under-20 teams wanted for our annual youth soccer tournament at the Site B grounds. R200 entry per team. WhatsApp to register. Prizes for top 3 teams.',
  NULL, '+27645678904', 'active',
  now() - interval '3 days',
  now() + interval '7 days'
),

-- ── ACCOMMODATION ─────────────────────────────────────────────────
(
  'Tembisa', 'ZA', 'accommodation',
  'Bachelor flat to rent — Rabie Street',
  'Clean bachelor flat available to rent in Tembisa. R2800 per month including water. No electricity included. Own entrance. Quiet area. WhatsApp for viewing.',
  2800, '+27656789014', 'active',
  now() - interval '2 days',
  now() + interval '14 days'
),
(
  'Soweto', 'ZA', 'accommodation',
  'Room to rent — Orlando West, near transport',
  'Furnished room available in a 3-bedroom house in Orlando West. R1800 per month. Includes WiFi and water. 5 minutes walk from taxi rank. Professional or student preferred.',
  1800, '+27667890125', 'active',
  now() - interval '1 day',
  now() + interval '14 days'
),

-- ── SAFETY ────────────────────────────────────────────────────────
(
  'Alexandra', 'ZA', 'safety',
  '🚨 Armed robbery reported near London Road',
  'Two men on foot attempted a robbery near the London Road filling station at approximately 9pm last night. They were chased off. Please be cautious in that area at night and keep your phone out of sight.',
  NULL, NULL, 'active',
  now() - interval '5 hours',
  now() + interval '2 days'
),
(
  'Mamelodi', 'ZA', 'safety',
  '🚨 Avoid Denneboom Road — police activity',
  'There is a large police presence on Denneboom Road near the taxi rank. Road is partially blocked. Avoid the area until further notice. Not sure of the cause yet.',
  NULL, NULL, 'active',
  now() - interval '2 hours',
  now() + interval '2 days'
);


-- ════════════════════════════════════════════════════════════════
-- USER POSTS (extending the initial 8 seeds)
-- ════════════════════════════════════════════════════════════════

INSERT INTO user_posts (neighbourhood, country_code, category, content, created_at)
VALUES
  (
    'Tembisa', 'ZA', 'question',
    'Is there anyone who can recommend a good mechanic in Tembisa? I have been going to a place in Rabie Street for years but they recently closed down. My car needs a service and I do not want to take chances with someone I do not know.',
    now() - interval '1 hour'
  ),
  (
    'Sandton', 'ZA', 'news',
    'The coffee shop that used to be on Rivonia Road has reopened under a new name. Same owners, different branding. Still the best flat white in Sandton if you ask me. Check it out before the crowds find it.',
    now() - interval '3 hours'
  ),
  (
    'Meadowlands', 'ZA', 'event',
    'Youth soccer trials this Saturday at the community ground. Under-17s and Under-20s. Bring your boots. Selection committee from a Joburg club will be watching. Free to enter. Pass this on.',
    now() - interval '5 hours'
  ),
  (
    'Rosebank', 'ZA', 'spotted',
    'The small record shop that opened in the alley behind the Zone has the best selection of local music I have seen in years. Kwaito, Afrobeats, old school jazz. The owner knows his stuff. Worth a visit.',
    now() - interval '7 hours'
  ),
  (
    'Alexandra', 'ZA', 'story',
    'My uncle has been repairing shoes on the corner of London Road and 1st Avenue for 31 years. He knows every family in the area. He refuses to raise his prices. Last week he fixed a child''s school shoe for free because the mother could not afford it. That is what neighbourhood is.',
    now() - interval '9 hours'
  ),
  (
    'Khayelitsha', 'ZA', 'recommendation',
    'There is a lady in Site B who makes the best umngqusho you will ever taste. She cooks from home, sells by the pot. R80 for a medium pot. She only makes it on Fridays and Saturdays. Ask around for uMama uNomsa. Trust me.',
    now() - interval '11 hours'
  ),
  (
    'Johannesburg', 'ZA', 'alert',
    '🚨 Warning: There is a scam going around where someone calls pretending to be from your bank. They know your name and the last 4 digits of your card. Do NOT give them any information. Hang up and call your bank directly. Two people in Joburg Central have lost money this week.',
    now() - interval '30 minutes'
  ),
  (
    'Soweto', 'ZA', 'story',
    'Mama Zulu''s in Orlando East has been serving the same braai on the same fire for 18 years. She was there during load shedding, during COVID, during everything. Three generations of families come to her. That is not a business, that is a pillar.',
    now() - interval '15 hours'
  ),
  (
    'Pretoria', 'ZA', 'news',
    'The new taxi rank in Mamelodi is finally open. Cleaner than the old one, proper seating, proper signage for routes. Still learning the layout but it is a massive improvement. Well done to whoever pushed for this.',
    now() - interval '18 hours'
  ),
  (
    'Midrand', 'ZA', 'event',
    'Small business expo this Saturday at the Midrand community centre. Free entry. 40 local vendors. Good opportunity to support neighbourhood businesses and also show your own. WhatsApp 071 234 5678 to book a table.',
    now() - interval '20 hours'
  ),
  (
    'Tembisa', 'ZA', 'spotted',
    'Just spotted the most beautiful mural going up on the wall outside the taxi rank on Rabie Street. A local artist called Sipho has been working on it for 3 weeks. It shows the history of Tembisa. Check it out.',
    now() - interval '22 hours'
  ),
  (
    'Khayelitsha', 'ZA', 'recommendation',
    'If you need a seamstress in Khayelitsha, ask for uMama Bhengu in Site B near the school. She does school uniforms, traditional dresses, alterations. Fast, cheap, and her work is beautiful. My family has used her for years.',
    now() - interval '1 day'
  );


-- ════════════════════════════════════════════════════════════════
-- NEIGHBOURHOOD POSTS (Board feed teaser content)
-- ════════════════════════════════════════════════════════════════

INSERT INTO neighbourhood_posts (author_name, content, neighbourhood, category, is_anonymous, created_at)
VALUES
  (
    'Thabo M.',
    'The Saturday morning market at the community hall is back. Local vegetables, homemade food, crafts. 7am–noon. Support your neighbours.',
    'Soweto', 'announcement', false,
    now() - interval '3 hours'
  ),
  (
    'Community',
    'Reminder: The streetlights on Main Street have been reported. Municipality says repairs within 7 days. Stay safe at night until then.',
    'Alexandra', 'announcement', true,
    now() - interval '6 hours'
  ),
  (
    'Nomsa K.',
    'Does anyone know where I can find a good seamstress near Tembisa? I need a dress altered for a wedding next month.',
    'Tembisa', 'question', false,
    now() - interval '4 hours'
  ),
  (
    'Lerato S.',
    'The new coffee shop on William Nicol is actually really good. Quiet enough to work, great music. Finally a spot in the area that feels like it belongs here.',
    'Sandton', 'recommendation', false,
    now() - interval '8 hours'
  ),
  (
    'Mandla N.',
    'Our car wash is back open after the pipes were fixed. We are offering R60 special this weekend only. Come through.',
    'Khayelitsha', 'announcement', false,
    now() - interval '2 hours'
  ),
  (
    'Zanele M.',
    'Anyone know if there is a community meeting about the water issue this week? I saw something about it but missed the details.',
    'Rosebank', 'question', false,
    now() - interval '5 hours'
  ),
  (
    'Sipho R.',
    'Load shedding schedule for this week has changed again. Stage 4 from Monday. The hardware shop on Denneboom Road has inverters and batteries in stock.',
    'Mamelodi', 'announcement', false,
    now() - interval '1 hour'
  ),
  (
    'Anele Z.',
    'The tavern will be hosting a ladies night on Friday from 8pm. Free entry for women before 9pm. Good music, good vibes.',
    'Meadowlands', 'event', false,
    now() - interval '10 hours'
  ),
  (
    'Bongani M.',
    'I do mobile mechanic work in Khayelitsha and surrounds. If your car won''t start or you have any other problem, WhatsApp me and I will come to you. 0712345678.',
    'Khayelitsha', 'recommendation', false,
    now() - interval '7 hours'
  ),
  (
    'Community',
    'RIP to a true local legend. uMkhize from the spaza on Mooki Street passed away on Sunday. He was part of this neighbourhood for 30 years. Rest well.',
    'Meadowlands', 'general', true,
    now() - interval '2 days'
  );
