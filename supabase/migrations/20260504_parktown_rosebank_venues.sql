-- ════════════════════════════════════════════════════════════════
-- Seed: 15 verified venues in Parktown North & Rosebank
-- All descriptions are original — written for Kayaa, not copied
-- from any website, review platform, or external source.
-- ════════════════════════════════════════════════════════════════

INSERT INTO venues
  (name, type, slug, location, description, address,
   latitude, longitude, is_active, is_public,
   show_regulars_publicly, allow_quiet_checkins, country_code)
VALUES

-- ── CAFÉS ─────────────────────────────────────────────────────────────────

(
  'Craft Coffee',
  'cafe',
  'craft-coffee-parktown-north',
  'Parktown North',
  'A no-fuss specialty coffee bar on 7th Ave where the beans are sourced with care and every cup is made to order — no syrups, no shortcuts.',
  '15 7th Avenue, Parktown North',
  -26.1387, 28.0369,
  true, true, true, false, 'ZA'
),

(
  'Motherland Coffee',
  'cafe',
  'motherland-coffee-parktown-north',
  'Parktown North',
  'The Parktown North outpost of Motherland brings its signature single-origin filter brews and relaxed all-day vibe to the heart of 7th Ave.',
  '38 7th Avenue, Parktown North',
  -26.1383, 28.0368,
  true, true, true, false, 'ZA'
),

(
  'Dough and Co',
  'cafe',
  'dough-and-co-parktown-north',
  'Parktown North',
  'Neighbourhood bakery-café baking fresh sourdough and pastries every morning — the kind of place where regulars have a usual order and a usual seat.',
  '40 7th Avenue, Parktown North',
  -26.1384, 28.0366,
  true, true, true, false, 'ZA'
),

-- ── RESTAURANTS ───────────────────────────────────────────────────────────

(
  'Glory Restaurant',
  'restaurant',
  'glory-restaurant-parktown-north',
  'Parktown North',
  'A warm, unpretentious neighbourhood restaurant on 4th Ave serving generous plates of honest food — the kind of place families come back to every Sunday.',
  '17 4th Avenue, Parktown North',
  -26.1391, 28.0355,
  true, true, true, false, 'ZA'
),

(
  'Il Contadino',
  'restaurant',
  'il-contadino-parktown-north',
  'Parktown North',
  'Italian trattoria tucked into the corner of 4th and 7th — rustic pasta, wood-fired pizza, and a wine list that leans Italian without apologising for it.',
  'Cnr 4th and 7th Avenue, Parktown North',
  -26.1385, 28.0362,
  true, true, true, false, 'ZA'
),

(
  'La Boqueria',
  'restaurant',
  'la-boqueria-parktown-north',
  'Parktown North',
  'Spanish-inspired tapas bar on 3rd Ave where small plates and good Iberian wine have made it one of the most reliable dinner spots in the neighbourhood.',
  '17 3rd Avenue, Parktown North',
  -26.1395, 28.0350,
  true, true, true, false, 'ZA'
),

(
  'Turn n Tender',
  'restaurant',
  'turn-n-tender-parktown-north',
  'Parktown North',
  'A proper steakhouse institution where the aged cuts are the main event and a busy Friday night queue is a badge of honour they wear proudly.',
  'Cnr 3rd and 7th Avenue, Parktown North',
  -26.1393, 28.0358,
  true, true, true, false, 'ZA'
),

(
  'The Codfather',
  'restaurant',
  'the-codfather-parktown-north',
  'Parktown North',
  'Fresh-fish restaurant where you pick your catch from the display counter and the kitchen gets to work — a Joburg institution that still packs out on weeknights.',
  '55 7th Avenue, Parktown North',
  -26.1376, 28.0378,
  true, true, true, false, 'ZA'
),

(
  'Soul Souvlaki',
  'restaurant',
  'soul-souvlaki-parktown-north',
  'Parktown North',
  'Greek fast-casual spot serving generous souvlaki wraps and pita loaded with proper tzatziki — quick, affordable, and genuinely good.',
  'Cnr 3rd and 7th Avenue, Parktown North',
  -26.1392, 28.0357,
  true, true, true, false, 'ZA'
),

(
  'Narang',
  'restaurant',
  'narang-parktown-north',
  'Parktown North',
  'Persian restaurant bringing slow-cooked stews, fragrant rice dishes, and Middle Eastern hospitality to the Parktown North dining strip.',
  '40 7th Avenue, Parktown North',
  -26.1383, 28.0365,
  true, true, true, false, 'ZA'
),

-- ── BAR ───────────────────────────────────────────────────────────────────

(
  'Neighbarhood',
  'bar',
  'neighbarhood-parktown-north',
  'Parktown North',
  'A relaxed neighbourhood bar that does exactly what it says — cold drinks, good company, and enough space on the pavement to spill out onto 7th Ave on a Friday.',
  '32 7th Avenue, Parktown North',
  -26.1382, 28.0371,
  true, true, false, false, 'ZA'
),

-- ── GALLERIES ─────────────────────────────────────────────────────────────

(
  'Gallery MOMO',
  'gallery',
  'gallery-momo-parktown-north',
  'Parktown North',
  'One of Johannesburg''s leading contemporary art galleries representing established and emerging African artists across painting, sculpture, and new media.',
  '52 7th Avenue, Parktown North',
  -26.1378, 28.0376,
  true, true, true, false, 'ZA'
),

(
  'Stevenson Gallery',
  'gallery',
  'stevenson-gallery-parktown-north',
  'Parktown North',
  'A heavyweight in the South African art market, Stevenson presents rigorous exhibitions from artists whose work consistently travels to international fairs.',
  '46 7th Avenue, Parktown North',
  -26.1380, 28.0374,
  true, true, true, false, 'ZA'
),

-- ── MUSIC / CULTURE ───────────────────────────────────────────────────────

(
  'Bantu Records',
  'music',
  'bantu-records-parktown-north',
  'Parktown North',
  'Independent record store and label focusing on South African jazz, Afrobeat, and township soul — the kind of place where a five-minute browse turns into two hours.',
  '32 7th Avenue, Parktown North',
  -26.1382, 28.0370,
  true, true, true, false, 'ZA'
),

-- ── SHOP ──────────────────────────────────────────────────────────────────

(
  'Toc H Charity Shop',
  'shop',
  'toc-h-charity-shop-parktown-north',
  'Parktown North',
  'A well-curated charity shop where regular donations from the neighbourhood mean the shelves always have something worth finding — proceeds go back into local community projects.',
  '17 4th Avenue, Parktown North',
  -26.1391, 28.0356,
  true, true, true, false, 'ZA'
);
