/**
 * businessTemplates.ts — 8 premium page presets + business-type taxonomy.
 *
 * Templates are UI-only for now (stored in localStorage by venue slug).
 * They drive starter copy, section structure, and accent colour on the venue page.
 *
 * Business-type groups cover the full neighbourhood economy:
 * informal traders, township businesses, suburban services, and high-end venues.
 */

// ─── Template IDs ─────────────────────────────────────────────────────────────

export type TemplateId =
  | 'classic-barbershop'
  | 'community-spaza'
  | 'neighbourhood-kitchen'
  | 'local-tavern'
  | 'faith-community'
  | 'professional-service'
  | 'premium-dining'
  | 'nightclub-live';

// ─── Business Type Groups ─────────────────────────────────────────────────────

export interface BusinessTypeGroup {
  key: string;
  label: string;
  emoji: string;
  types: string[];
}

export const BUSINESS_TYPE_GROUPS: BusinessTypeGroup[] = [
  {
    key: 'retail',
    label: 'Retail',
    emoji: '🛒',
    types: [
      'Spaza shop', 'Tuckshop', 'Corner shop', 'Grocery store', 'Mini market',
      'Butchery', 'Green grocer', 'Liquor store', 'Bottle store', 'Hardware shop',
      'Furniture shop', 'Clothing boutique', 'Shoe shop', 'Cosmetics shop',
      'Convenience store', 'Pop-up shop', 'Street vendor',
    ],
  },
  {
    key: 'food',
    label: 'Food & Drink',
    emoji: '🍖',
    types: [
      'Shisanyama', 'Takeaway', 'Kota spot', 'Restaurant', 'Fine dining restaurant',
      'Café', 'Coffee shop', 'Bakery', 'Catering business', 'Dessert shop',
      'Ice cream shop', 'Food truck', 'Deli', 'Fast food spot',
    ],
  },
  {
    key: 'beauty',
    label: 'Beauty & Care',
    emoji: '💅',
    types: [
      'Barbershop', 'Hair salon', 'Braiding salon', 'Nail studio',
      'Beauty salon', 'Makeup artist', 'Massage / spa', 'Skincare studio',
    ],
  },
  {
    key: 'repairs',
    label: 'Repairs & Technical',
    emoji: '🔧',
    types: [
      'Phone repair', 'Computer repair', 'Appliance repair', 'TV / electronics repair',
      'Mechanic', 'Tyre repair', 'Panel beater', 'Locksmith',
    ],
  },
  {
    key: 'home',
    label: 'Home & Building',
    emoji: '🏠',
    types: [
      'Plumber', 'Electrician', 'Builder', 'Carpenter', 'Painter',
      'Welder', 'Roofer', 'Tiler', 'Aluminium / steel works',
    ],
  },
  {
    key: 'transport',
    label: 'Transport & Logistics',
    emoji: '🚗',
    types: [
      'Taxi service', 'Shuttle service', 'Delivery service', 'Courier',
      'Moving service', 'Car wash', 'Car hire', 'Logistics service',
    ],
  },
  {
    key: 'services',
    label: 'Services',
    emoji: '✂️',
    types: [
      'Tailor', 'Photographer', 'Videographer', 'Printing service',
      'Internet café', 'Laundry service', 'Cleaning service', 'Childcare',
      'Tutoring', 'Event planner', 'Funeral services',
    ],
  },
  {
    key: 'community',
    label: 'Community & Faith',
    emoji: '⛪',
    types: [
      'Church', 'Mosque', 'Community centre', 'NGO', 'Youth centre',
      'Crèche', 'Aftercare centre', 'Social support service',
    ],
  },
  {
    key: 'health',
    label: 'Health & Professional',
    emoji: '💊',
    types: [
      'Clinic', 'Pharmacy', 'Dentist', 'Optometrist', 'Lawyer',
      'Accountant', 'Consultant', 'Real estate agency', 'Insurance advisor',
    ],
  },
  {
    key: 'entertainment',
    label: 'Entertainment & Lifestyle',
    emoji: '🎶',
    types: [
      'Tavern', 'Shebeen', 'Nightclub', 'Cocktail bar', 'Lounge bar',
      'Rooftop bar', 'Sports bar', 'Wine bar', 'Jazz venue', 'Live music venue',
      'Event venue', 'Gaming lounge', 'Hookah lounge', 'Art gallery', 'Comedy club',
    ],
  },
  {
    key: 'agriculture',
    label: 'Agriculture & Local Production',
    emoji: '🌱',
    types: [
      'Poultry business', 'Fresh produce seller', 'Small farm shop',
      'Agro-processing', 'Recycling business', 'Local manufacturer',
    ],
  },
  {
    key: 'other',
    label: 'Other',
    emoji: '📍',
    types: ['Other'],
  },
];

// ─── Templates ────────────────────────────────────────────────────────────────

export interface BusinessTemplate {
  id: TemplateId;
  name: string;
  tagline: string;          // short punchy line shown on page
  description: string;      // describes who it's for (shown in picker)
  emoji: string;
  accentColor: string;
  heroBg: string;           // CSS gradient for placeholder/branded hero
  starterCopy: string;      // default welcome message
  sections: string[];       // ordered section keys
}

export const BUSINESS_TEMPLATES: BusinessTemplate[] = [
  {
    id: 'classic-barbershop',
    name: 'Classic Barbershop',
    tagline: 'Fresh cuts. Walk-ins welcome.',
    description: 'Barbershops, salons, braiding & beauty businesses',
    emoji: '💈',
    accentColor: '#39D98A',
    heroBg: 'linear-gradient(145deg, #0e2218 0%, #0D1117 100%)',
    starterCopy: 'Fresh cuts. Walk-ins welcome.',
    sections: ['hero', 'welcome', 'services', 'hours', 'book', 'regulars', 'photos'],
  },
  {
    id: 'community-spaza',
    name: 'Community Spaza',
    tagline: 'Your corner shop. Always close.',
    description: 'Spaza shops, tuckshops, mini markets & local retail',
    emoji: '🛒',
    accentColor: '#F5A623',
    heroBg: 'linear-gradient(145deg, #1e1200 0%, #0D1117 100%)',
    starterCopy: 'Your corner shop. Always close.',
    sections: ['hero', 'welcome', 'popular-items', 'stock', 'hours', 'trust', 'directions'],
  },
  {
    id: 'neighbourhood-kitchen',
    name: 'Neighbourhood Kitchen',
    tagline: 'Real food. Made here.',
    description: 'Shisanyamas, takeaways, restaurants, cafés & food spots',
    emoji: '🍖',
    accentColor: '#F97316',
    heroBg: 'linear-gradient(145deg, #1e0e00 0%, #0D1117 100%)',
    starterCopy: 'Real food. Made here.',
    sections: ['hero', 'welcome', 'menu', 'specials', 'order', 'hours', 'gallery'],
  },
  {
    id: 'local-tavern',
    name: 'Local Tavern',
    tagline: 'Where the neighbourhood comes together.',
    description: 'Taverns, shebeens, sports bars & local hangouts',
    emoji: '🍺',
    accentColor: '#60A5FA',
    heroBg: 'linear-gradient(145deg, #060e1e 0%, #0D1117 100%)',
    starterCopy: 'Where the neighbourhood comes together.',
    sections: ['hero', 'welcome', 'whats-on', 'hours', 'rules', 'vibe', 'events'],
  },
  {
    id: 'faith-community',
    name: 'Faith Community',
    tagline: 'All welcome. Come as you are.',
    description: 'Churches, mosques & faith community spaces',
    emoji: '⛪',
    accentColor: '#A78BFA',
    heroBg: 'linear-gradient(145deg, #0e0620 0%, #0D1117 100%)',
    starterCopy: 'All welcome. Come as you are.',
    sections: ['hero', 'welcome', 'service-times', 'programmes', 'notices', 'contact', 'gatherings'],
  },
  {
    id: 'professional-service',
    name: 'Professional Service',
    tagline: 'Professional. Reliable. Here.',
    description: 'Clinics, accountants, lawyers, consultancies & tradespeople',
    emoji: '💼',
    accentColor: '#34D399',
    heroBg: 'linear-gradient(145deg, #041410 0%, #0D1117 100%)',
    starterCopy: 'Professional. Reliable. Here.',
    sections: ['hero', 'welcome', 'services', 'appointments', 'credentials', 'hours', 'contact'],
  },
  {
    id: 'premium-dining',
    name: 'Premium Dining & Lounge',
    tagline: 'Good taste lives here.',
    description: 'Fine dining, cocktail bars, lounges, rooftops & wine bars',
    emoji: '🍷',
    accentColor: '#F59E0B',
    heroBg: 'linear-gradient(145deg, #180e00 0%, #0D1117 100%)',
    starterCopy: 'Good taste lives here.',
    sections: ['hero', 'signature', 'menu', 'reservations', 'events', 'dress-code', 'hours', 'gallery'],
  },
  {
    id: 'nightclub-live',
    name: 'Nightclub & Live Venue',
    tagline: 'Tonight starts here.',
    description: 'Nightclubs, live music, jazz venues & entertainment spaces',
    emoji: '🎶',
    accentColor: '#EC4899',
    heroBg: 'linear-gradient(145deg, #140020 0%, #0D1117 100%)',
    starterCopy: 'Tonight starts here.',
    sections: ['hero', 'tonight', 'events', 'entry', 'bookings', 'safety', 'hours', 'vibe'],
  },
];

// ─── Type → Template mapping ──────────────────────────────────────────────────

const TYPE_TO_TEMPLATES: Record<string, TemplateId[]> = {
  // Beauty & Care
  'Barbershop': ['classic-barbershop'],
  'Hair salon': ['classic-barbershop'],
  'Braiding salon': ['classic-barbershop'],
  'Nail studio': ['classic-barbershop'],
  'Beauty salon': ['classic-barbershop'],
  'Makeup artist': ['classic-barbershop', 'professional-service'],
  'Massage / spa': ['classic-barbershop', 'professional-service'],
  'Skincare studio': ['classic-barbershop', 'professional-service'],
  // Retail
  'Spaza shop': ['community-spaza'],
  'Tuckshop': ['community-spaza'],
  'Corner shop': ['community-spaza'],
  'Grocery store': ['community-spaza'],
  'Mini market': ['community-spaza'],
  'Butchery': ['community-spaza', 'neighbourhood-kitchen'],
  'Green grocer': ['community-spaza'],
  'Liquor store': ['community-spaza', 'local-tavern'],
  'Bottle store': ['community-spaza', 'local-tavern'],
  'Hardware shop': ['community-spaza', 'professional-service'],
  'Furniture shop': ['community-spaza', 'professional-service'],
  'Clothing boutique': ['community-spaza', 'classic-barbershop'],
  'Shoe shop': ['community-spaza'],
  'Cosmetics shop': ['community-spaza', 'classic-barbershop'],
  'Convenience store': ['community-spaza'],
  'Pop-up shop': ['community-spaza'],
  'Street vendor': ['community-spaza'],
  // Food & Drink
  'Shisanyama': ['neighbourhood-kitchen'],
  'Takeaway': ['neighbourhood-kitchen'],
  'Kota spot': ['neighbourhood-kitchen'],
  'Restaurant': ['neighbourhood-kitchen', 'premium-dining'],
  'Fine dining restaurant': ['premium-dining', 'neighbourhood-kitchen'],
  'Café': ['neighbourhood-kitchen', 'premium-dining'],
  'Coffee shop': ['neighbourhood-kitchen', 'premium-dining'],
  'Bakery': ['neighbourhood-kitchen'],
  'Catering business': ['neighbourhood-kitchen', 'professional-service'],
  'Dessert shop': ['neighbourhood-kitchen', 'premium-dining'],
  'Ice cream shop': ['neighbourhood-kitchen'],
  'Food truck': ['neighbourhood-kitchen'],
  'Deli': ['neighbourhood-kitchen', 'premium-dining'],
  'Fast food spot': ['neighbourhood-kitchen'],
  // Entertainment
  'Tavern': ['local-tavern'],
  'Shebeen': ['local-tavern'],
  'Nightclub': ['nightclub-live', 'local-tavern'],
  'Cocktail bar': ['premium-dining', 'nightclub-live'],
  'Lounge bar': ['premium-dining', 'local-tavern'],
  'Rooftop bar': ['premium-dining', 'nightclub-live'],
  'Sports bar': ['local-tavern'],
  'Wine bar': ['premium-dining', 'local-tavern'],
  'Jazz venue': ['nightclub-live', 'premium-dining'],
  'Live music venue': ['nightclub-live', 'local-tavern'],
  'Event venue': ['nightclub-live', 'premium-dining'],
  'Gaming lounge': ['local-tavern', 'nightclub-live'],
  'Hookah lounge': ['premium-dining', 'local-tavern'],
  'Art gallery': ['premium-dining', 'professional-service'],
  'Comedy club': ['nightclub-live', 'local-tavern'],
  // Faith & Community
  'Church': ['faith-community'],
  'Mosque': ['faith-community'],
  'Community centre': ['faith-community', 'professional-service'],
  'NGO': ['faith-community', 'professional-service'],
  'Youth centre': ['faith-community'],
  'Crèche': ['faith-community', 'professional-service'],
  'Aftercare centre': ['faith-community', 'professional-service'],
  'Social support service': ['faith-community', 'professional-service'],
  // Health & Professional
  'Clinic': ['professional-service'],
  'Pharmacy': ['professional-service', 'community-spaza'],
  'Dentist': ['professional-service'],
  'Optometrist': ['professional-service'],
  'Lawyer': ['professional-service'],
  'Accountant': ['professional-service'],
  'Consultant': ['professional-service'],
  'Real estate agency': ['professional-service'],
  'Insurance advisor': ['professional-service'],
  // Repairs
  'Phone repair': ['professional-service'],
  'Computer repair': ['professional-service'],
  'Appliance repair': ['professional-service'],
  'TV / electronics repair': ['professional-service'],
  'Mechanic': ['professional-service'],
  'Tyre repair': ['professional-service'],
  'Panel beater': ['professional-service'],
  'Locksmith': ['professional-service'],
  // Home & Building
  'Plumber': ['professional-service'],
  'Electrician': ['professional-service'],
  'Builder': ['professional-service'],
  'Carpenter': ['professional-service'],
  'Painter': ['professional-service'],
  'Welder': ['professional-service'],
  'Roofer': ['professional-service'],
  'Tiler': ['professional-service'],
  'Aluminium / steel works': ['professional-service'],
  // Transport
  'Taxi service': ['professional-service'],
  'Shuttle service': ['professional-service'],
  'Delivery service': ['professional-service'],
  'Courier': ['professional-service'],
  'Moving service': ['professional-service'],
  'Car wash': ['professional-service', 'community-spaza'],
  'Car hire': ['professional-service'],
  'Logistics service': ['professional-service'],
  // Services
  'Tailor': ['classic-barbershop', 'professional-service'],
  'Photographer': ['professional-service'],
  'Videographer': ['professional-service'],
  'Printing service': ['professional-service'],
  'Internet café': ['community-spaza', 'neighbourhood-kitchen'],
  'Laundry service': ['community-spaza', 'professional-service'],
  'Cleaning service': ['professional-service'],
  'Childcare': ['faith-community', 'professional-service'],
  'Tutoring': ['professional-service', 'faith-community'],
  'Event planner': ['nightclub-live', 'professional-service'],
  'Funeral services': ['professional-service', 'faith-community'],
  // Agriculture
  'Poultry business': ['community-spaza', 'neighbourhood-kitchen'],
  'Fresh produce seller': ['community-spaza', 'neighbourhood-kitchen'],
  'Small farm shop': ['community-spaza'],
  'Agro-processing': ['professional-service', 'community-spaza'],
  'Recycling business': ['professional-service'],
  'Local manufacturer': ['professional-service'],
};

/**
 * Returns up to 2 recommended template IDs for a given business type.
 * Falls back sensibly when no match is found.
 */
export function getRecommendedTemplates(businessType: string): TemplateId[] {
  const matches = TYPE_TO_TEMPLATES[businessType] ?? [];
  if (matches.length === 0) return ['professional-service', 'community-spaza'];
  return [...new Set(matches)].slice(0, 2) as TemplateId[];
}

/** Looks up a full template by ID. Safe fallback to professional-service. */
export function getTemplate(id: TemplateId | string): BusinessTemplate {
  return BUSINESS_TEMPLATES.find(t => t.id === id) ?? BUSINESS_TEMPLATES[5];
}

/**
 * Best-guess template from a venue's stored type string.
 * Used to apply template colours/style to existing venues that have no explicit template.
 */
export function deriveTemplateFromType(venueType: string): BusinessTemplate {
  const recs = getRecommendedTemplates(venueType);
  return getTemplate(recs[0] ?? 'professional-service');
}

/** localStorage key for persisting a venue's chosen template. */
export function templateStorageKey(slug: string): string {
  return `kayaa_template_${slug}`;
}
