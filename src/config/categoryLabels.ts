// ─── Primary category system ────────────────────────────────────────────────
// 10 primary categories covering every neighbourhood business type:
// formal, informal, township, suburban, franchise, independent.
//
// Kayaa is for every neighborhood business; it is especially powerful
// for the ones other platforms overlooked.
// ─────────────────────────────────────────────────────────────────────────────

export type PrimaryKey =
  | 'food' | 'beauty' | 'retail' | 'auto' | 'services'
  | 'health' | 'community' | 'professional' | 'stay' | 'other';

export interface PrimaryCategory {
  key: PrimaryKey;
  label: string;
  emoji: string;
  /** Subtypes shown as chips after primary is selected. Empty = free text. */
  subtypes: string[];
}

export const PRIMARY_CATEGORIES: PrimaryCategory[] = [
  {
    key: 'food',
    label: 'Food & Drink',
    emoji: '🍖',
    subtypes: ['Shisanyama', 'Restaurant', 'Café', 'Fast Food', 'Coffee Shop', 'Takeaway', 'Tavern'],
  },
  {
    key: 'beauty',
    label: 'Beauty & Grooming',
    emoji: '💅',
    subtypes: ['Barbershop', 'Salon', 'Beauty Studio', 'Nails'],
  },
  {
    key: 'retail',
    label: 'Retail & Shopping',
    emoji: '🛒',
    subtypes: ['Spaza Shop', 'Tuckshop', 'Boutique', 'General Retail', 'Small Shop'],
  },
  {
    key: 'auto',
    label: 'Auto & Repairs',
    emoji: '🔧',
    subtypes: ['Car Wash', 'Mechanic', 'Tyre Shop', 'Repair Shop'],
  },
  {
    key: 'services',
    label: 'Home & Local Services',
    emoji: '🏠',
    subtypes: ['Plumber', 'Electrician', 'Cleaner', 'Handyman', 'Moving Service'],
  },
  {
    key: 'health',
    label: 'Health & Wellness',
    emoji: '💊',
    subtypes: ['Pharmacy', 'Clinic', 'Gym', 'Wellness'],
  },
  {
    key: 'community',
    label: 'Community & Faith',
    emoji: '⛪',
    subtypes: ['Church', 'Faith Centre', 'Community Organisation'],
  },
  {
    key: 'professional',
    label: 'Professional & Business',
    emoji: '💼',
    subtypes: ['Insurance', 'Legal', 'Accounting', 'Startup', 'Agency', 'Office'],
  },
  {
    key: 'stay',
    label: 'Stay & Property',
    emoji: '🏨',
    subtypes: ['Room Rental', 'Short Stay', 'Guesthouse', 'Property'],
  },
  {
    key: 'other',
    label: 'Other',
    emoji: '📍',
    subtypes: [], // triggers free-text input
  },
];

// ─── Legacy category key type (kept for backwards compat) ───────────────────
// Old venues in DB store these as the `type` column value. New venues store
// a subtype label (e.g. "Shisanyama", "Barbershop") or primary label.
// The venueUtils.ts fuzzy emoji matcher handles all variations gracefully.

export type CategoryKey =
  | 'barbershop' | 'salon' | 'food' | 'tavern'
  | 'spaza' | 'church' | 'carwash' | 'cafe'
  | 'gym' | 'market' | 'mechanic'
  | 'restaurant' | 'nightclub' | 'park' | 'community' | 'lodge'
  // New keys introduced with the expanded category system:
  | 'beauty' | 'retail' | 'auto' | 'services' | 'health'
  | 'professional' | 'stay'
  | 'other';

export type CategoryConfig = {
  key: CategoryKey;
  label: string;
  emoji: string;
};

// ─── Legacy → primary mapping ─────────────────────────────────────────────────
// Maps any stored `type` value (old or new, case-folded) to a PrimaryKey.
// Used by filter chips to bucket venues into the right category.

export const LEGACY_TO_PRIMARY: Record<string, PrimaryKey> = {
  // Food
  food: 'food', shisanyama: 'food', tavern: 'food', cafe: 'food',
  restaurant: 'food', 'fast food': 'food', 'coffee shop': 'food', takeaway: 'food',
  nightclub: 'food', 'shisanyama / food': 'food', 'café': 'food',
  'live music venue': 'food', 'local bar': 'food', 'beer parlour': 'food',
  'mama lishe / nyama choma': 'food', 'buka / bukateria': 'food',
  'chop bar / spot': 'food', 'maquis / coin braisé': 'food',
  'chop house / maquis': 'food', 'cabaret / bar': 'food',
  // Beauty
  barbershop: 'beauty', salon: 'beauty', 'beauty studio': 'beauty', nails: 'beauty',
  'salon ya nywele': 'beauty', 'hair salon': 'beauty', 'kinyozi': 'beauty',
  'barbing saloon': 'beauty', 'salon de coiffure': 'beauty', 'salon de beauté': 'beauty',
  // Retail
  spaza: 'retail', 'spaza shop': 'retail', market: 'retail', 'market stall': 'retail',
  tuckshop: 'retail', boutique: 'retail', 'general retail': 'retail', 'small shop': 'retail',
  'duka': 'retail', 'kiosk / provisions': 'retail', 'provision store': 'retail',
  'boutique / alimentation': 'retail', 'boutique / shop': 'retail',
  // Auto
  carwash: 'auto', 'car wash': 'auto', mechanic: 'auto', 'tyre shop': 'auto',
  'repair shop': 'auto', 'mechanic / garage': 'auto', 'mechanic / vulcanizer': 'auto',
  'garage / mécanicien': 'auto', 'lavage auto': 'auto',
  // Services
  services: 'services', plumber: 'services', electrician: 'services',
  cleaner: 'services', handyman: 'services', 'moving service': 'services',
  // Health
  health: 'health', gym: 'health', clinic: 'health', pharmacy: 'health',
  wellness: 'health', 'gym / fitness': 'health', 'gym / fitness centre': 'health',
  'salle de sport': 'health',
  // Community
  church: 'community', 'faith centre': 'community', 'community organisation': 'community',
  community: 'community', 'community hall': 'community', 'community centre': 'community',
  'community space': 'community', park: 'community', 'park / playground': 'community',
  'church / faith': 'community', 'church / kanisa': 'community',
  'church / fellowship': 'community', 'église / fellowship': 'community',
  'kanisa': 'community', 'espace communautaire': 'community',
  // Professional
  professional: 'professional', insurance: 'professional', legal: 'professional',
  accounting: 'professional', startup: 'professional', agency: 'professional',
  office: 'professional',
  // Stay
  stay: 'stay', lodge: 'stay', guesthouse: 'stay', 'room rental': 'stay',
  'short stay': 'stay', property: 'stay', 'lodge / guesthouse': 'stay',
  'lodge / hotel': 'stay', 'lodge / auberge': 'stay',
  // Other
  other: 'other', 'other place': 'other', 'autre lieu': 'other',
};

/**
 * Returns the PrimaryKey for any stored venue type string.
 * Case-insensitive, falls back to 'other'.
 */
export function getPrimaryCategory(type: string): PrimaryKey {
  const key = (type ?? '').toLowerCase().trim();
  return LEGACY_TO_PRIMARY[key] ?? 'other';
}

// ─── Per-country category labels (kept for backwards compat) ─────────────────
// These are still valid stored values in the DB and continue to display
// correctly via the fuzzy emoji matcher in venueUtils.ts.

export const CATEGORY_LABELS: Record<string, CategoryConfig[]> = {
  ZA: [
    { key: 'barbershop', label: 'Barbershop',          emoji: '💈' },
    { key: 'salon',      label: 'Salon',               emoji: '💅' },
    { key: 'food',       label: 'Shisanyama / Food',   emoji: '🍖' },
    { key: 'tavern',     label: 'Tavern',               emoji: '🍺' },
    { key: 'spaza',      label: 'Spaza Shop',           emoji: '🛒' },
    { key: 'church',     label: 'Church / Faith',       emoji: '⛪' },
    { key: 'carwash',    label: 'Car Wash',             emoji: '🚗' },
    { key: 'cafe',       label: 'Café',                 emoji: '☕' },
    { key: 'gym',        label: 'Gym / Fitness',        emoji: '💪' },
    { key: 'market',     label: 'Market Stall',         emoji: '🏪' },
    { key: 'mechanic',    label: 'Mechanic / Garage',    emoji: '🔧' },
    { key: 'restaurant',  label: 'Restaurant',           emoji: '🍽️' },
    { key: 'nightclub',   label: 'Nightclub / Club',     emoji: '🎶' },
    { key: 'park',        label: 'Park / Playground',    emoji: '🌳' },
    { key: 'community',   label: 'Community Hall',       emoji: '🤝' },
    { key: 'lodge',       label: 'Lodge / Guesthouse',   emoji: '🏨' },
    { key: 'other',       label: 'Other Place',          emoji: '📍' },
  ],
  KE: [
    { key: 'barbershop', label: 'Kinyozi',                    emoji: '💈' },
    { key: 'salon',      label: 'Salon ya Nywele',            emoji: '💅' },
    { key: 'food',       label: 'Mama Lishe / Nyama Choma',  emoji: '🍖' },
    { key: 'tavern',     label: 'Local Bar',                  emoji: '🍺' },
    { key: 'spaza',      label: 'Duka',                       emoji: '🛒' },
    { key: 'church',     label: 'Church / Kanisa',            emoji: '⛪' },
    { key: 'carwash',    label: 'Car Wash',                   emoji: '🚗' },
    { key: 'cafe',       label: 'Café / Coffee Shop',         emoji: '☕' },
    { key: 'gym',        label: 'Gym / Fitness',              emoji: '💪' },
    { key: 'market',     label: 'Market / Soko',              emoji: '🏪' },
    { key: 'mechanic',    label: 'Mechanic / Garage',          emoji: '🔧' },
    { key: 'restaurant',  label: 'Restaurant',               emoji: '🍽️' },
    { key: 'nightclub',   label: 'Nightclub / Club',         emoji: '🎶' },
    { key: 'park',        label: 'Park / Playground',        emoji: '🌳' },
    { key: 'community',   label: 'Community Centre',         emoji: '🤝' },
    { key: 'lodge',       label: 'Lodge / Hotel',            emoji: '🏨' },
    { key: 'other',       label: 'Other Place',              emoji: '📍' },
  ],
  NG: [
    { key: 'barbershop', label: 'Barbing Saloon',         emoji: '💈' },
    { key: 'salon',      label: 'Hair Salon',             emoji: '💅' },
    { key: 'food',       label: 'Buka / Bukateria',       emoji: '🍖' },
    { key: 'tavern',     label: 'Beer Parlour',           emoji: '🍺' },
    { key: 'spaza',      label: 'Provision Store',        emoji: '🛒' },
    { key: 'church',     label: 'Church / Fellowship',    emoji: '⛪' },
    { key: 'carwash',    label: 'Car Wash',               emoji: '🚗' },
    { key: 'cafe',       label: 'Café / Eatery',          emoji: '☕' },
    { key: 'gym',        label: 'Gym / Fitness Centre',   emoji: '💪' },
    { key: 'market',     label: 'Market Stall',           emoji: '🏪' },
    { key: 'mechanic',    label: 'Mechanic / Vulcanizer',  emoji: '🔧' },
    { key: 'restaurant',  label: 'Restaurant',            emoji: '🍽️' },
    { key: 'nightclub',   label: 'Nightclub / Club',      emoji: '🎶' },
    { key: 'park',        label: 'Park / Playground',     emoji: '🌳' },
    { key: 'community',   label: 'Community Space',       emoji: '🤝' },
    { key: 'lodge',       label: 'Lodge / Hotel',         emoji: '🏨' },
    { key: 'other',       label: 'Other Place',           emoji: '📍' },
  ],
  GH: [
    { key: 'barbershop', label: 'Barbershop',            emoji: '💈' },
    { key: 'salon',      label: 'Hair Salon',            emoji: '💅' },
    { key: 'food',       label: 'Chop Bar / Spot',       emoji: '🍖' },
    { key: 'tavern',     label: 'Drinking Bar / Spot',   emoji: '🍺' },
    { key: 'spaza',      label: 'Kiosk / Provisions',    emoji: '🛒' },
    { key: 'church',     label: 'Church / Fellowship',   emoji: '⛪' },
    { key: 'carwash',    label: 'Car Wash',              emoji: '🚗' },
    { key: 'cafe',       label: 'Café / Coffee Shop',    emoji: '☕' },
    { key: 'gym',        label: 'Gym / Fitness',         emoji: '💪' },
    { key: 'market',     label: 'Market Stall',          emoji: '🏪' },
    { key: 'mechanic',    label: 'Mechanic / Garage',     emoji: '🔧' },
    { key: 'restaurant',  label: 'Restaurant',           emoji: '🍽️' },
    { key: 'nightclub',   label: 'Nightclub / Spot',     emoji: '🎶' },
    { key: 'park',        label: 'Park / Playground',    emoji: '🌳' },
    { key: 'community',   label: 'Community Centre',     emoji: '🤝' },
    { key: 'lodge',       label: 'Lodge / Guesthouse',   emoji: '🏨' },
    { key: 'other',       label: 'Other Place',          emoji: '📍' },
  ],
  CM: [
    { key: 'barbershop', label: 'Salon de Coiffure',        emoji: '💈' },
    { key: 'salon',      label: 'Salon de Beauté',          emoji: '💅' },
    { key: 'food',       label: 'Maquis / Coin Braisé',    emoji: '🍖' },
    { key: 'tavern',     label: 'Cabaret / Bar',            emoji: '🍺' },
    { key: 'spaza',      label: 'Boutique / Alimentation',  emoji: '🛒' },
    { key: 'church',     label: 'Église / Fellowship',      emoji: '⛪' },
    { key: 'carwash',    label: 'Lavage Auto',              emoji: '🚗' },
    { key: 'cafe',       label: 'Café / Boulangerie',       emoji: '☕' },
    { key: 'gym',        label: 'Salle de Sport',           emoji: '💪' },
    { key: 'market',     label: 'Marché / Tablier',         emoji: '🏪' },
    { key: 'mechanic',    label: 'Garage / Mécanicien',      emoji: '🔧' },
    { key: 'restaurant',  label: 'Restaurant',              emoji: '🍽️' },
    { key: 'nightclub',   label: 'Boîte de Nuit / Bar',    emoji: '🎶' },
    { key: 'park',        label: 'Parc / Jardin',           emoji: '🌳' },
    { key: 'community',   label: 'Espace Communautaire',    emoji: '🤝' },
    { key: 'lodge',       label: 'Lodge / Auberge',         emoji: '🏨' },
    { key: 'other',       label: 'Autre Lieu',              emoji: '📍' },
  ],
  CM_EN: [
    { key: 'barbershop', label: 'Barbershop',          emoji: '💈' },
    { key: 'salon',      label: 'Hair Salon',          emoji: '💅' },
    { key: 'food',       label: 'Chop House / Maquis', emoji: '🍖' },
    { key: 'tavern',     label: 'Bar / Cabaret',       emoji: '🍺' },
    { key: 'spaza',      label: 'Boutique / Shop',     emoji: '🛒' },
    { key: 'church',     label: 'Church / Fellowship', emoji: '⛪' },
    { key: 'carwash',    label: 'Car Wash',            emoji: '🚗' },
    { key: 'cafe',       label: 'Café / Bakery',       emoji: '☕' },
    { key: 'gym',        label: 'Gym / Fitness',       emoji: '💪' },
    { key: 'market',     label: 'Market Stall',        emoji: '🏪' },
    { key: 'mechanic',    label: 'Mechanic / Garage',   emoji: '🔧' },
    { key: 'restaurant',  label: 'Restaurant',         emoji: '🍽️' },
    { key: 'nightclub',   label: 'Nightclub / Club',   emoji: '🎶' },
    { key: 'park',        label: 'Park / Playground',  emoji: '🌳' },
    { key: 'community',   label: 'Community Space',    emoji: '🤝' },
    { key: 'lodge',       label: 'Lodge / Guesthouse', emoji: '🏨' },
    { key: 'other',       label: 'Other Place',        emoji: '📍' },
  ],
};

export const getCategoryLabels = (
  countryCode: string,
  language?: 'en' | 'fr',
): CategoryConfig[] => {
  if (countryCode === 'CM' && language === 'en') return CATEGORY_LABELS['CM_EN'];
  return CATEGORY_LABELS[countryCode] ?? CATEGORY_LABELS['ZA'];
};
