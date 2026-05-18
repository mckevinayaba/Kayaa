import type { Venue, OwnerHours, DayHours } from '../types';

// ─── Category emoji ──────────────────────────────────────────────────────────
// Fuzzy matching so DB variants (lowercase, slight spelling diffs) all map
// to the right emoji. Never falls back to 📍 (looks like a Leaflet pin).

const EXACT_EMOJI: Record<string, string> = {
  // Food & Drink
  Barbershop: '✂️', Shisanyama: '🔥', Tavern: '🍺', Café: '☕', Cafe: '☕',
  Restaurant: '🍽️', 'Fast Food': '🍟', 'Coffee Shop': '☕', Takeaway: '🍟',
  // Beauty & Grooming
  Salon: '💅', 'Beauty Studio': '💅', Nails: '💅',
  // Retail
  'Spaza Shop': '🏪', Tuckshop: '🏪', Boutique: '👗', 'General Retail': '🏪', 'Small Shop': '🏪',
  // Auto
  'Car Wash': '🚗', Carwash: '🚗', Mechanic: '🔧', 'Tyre Shop': '🔧', 'Repair Shop': '🔧',
  // Services
  Plumber: '🔩', Electrician: '⚡', Cleaner: '🧹', Handyman: '🛠️', 'Moving Service': '📦',
  // Health & Wellness
  Gym: '💪', Clinic: '🏥', Pharmacy: '💊', Wellness: '🧘',
  // Community & Faith
  Church: '⛪', 'Faith Centre': '⛪', 'Community Organisation': '🤝',
  // Professional & Business
  Insurance: '📋', Legal: '⚖️', Accounting: '📊', Startup: '🚀', Agency: '💼', Office: '🏢',
  // Stay & Property
  'Room Rental': '🏠', 'Short Stay': '🛏️', Guesthouse: '🏨', Property: '🏠',
  // Legacy / misc
  Tutoring: '📚', 'Sports Ground': '⚽', 'Home Business': '🏠',
  'Live Music Venue': '🎵', 'Community Space': '🤝', Market: '🛒',
  Bakery: '🥖',
};

const FUZZY_EMOJI: [string, RegExp][] = [
  ['✂️', /barb|kinyozi|coiff|hair.?cut|groom/i],
  ['💅', /salon|nywele|beaut|nail/i],
  ['🔥', /shisan|choma|buka|bukat|lishe|chop|maquis|grill|braai|shisa/i],
  ['🍺', /tavern|beer.?parlour|cabaret|drinking.?bar|pub|shebeen/i],
  ['☕', /caf[eé]|coffee|tea\s*room/i],
  ['⛪', /church|kanisa|[eé]glise|chapel|faith|fellowship|mosque|temple|prayer/i],
  ['🚗', /carwash|car.?wash|valet/i],
  ['🏪', /spaza|duka|kiosk|provision|corner.?shop|tuck.?shop/i],
  ['📚', /tutor|school|educat|class|learn/i],
  ['⚽', /sport.*ground|playing.*field|pitch|soccer/i],
  ['💪', /gym|fitness|yoga|crossfit|workout/i],
  ['🏠', /home.?bus|room.?rent|short.?stay/i],
  ['🎵', /music|live.*ven|concert|jazz|band/i],
  ['🤝', /community|social|centre|center|organisation/i],
  ['🛒', /market|bazaar|mall/i],
  ['🔧', /mechanic|auto.*repair|garage|workshop|tyre/i],
  ['🏥', /clinic|hospital|health|medical/i],
  ['💊', /pharmacy|chemist|drug/i],
  ['🍽️', /restaurant|diner|eatery/i],
  ['🍟', /fast.?food|takeaway|take.?out|takeout/i],
  ['🚀', /startup|tech|launch/i],
  ['💼', /insurance|legal|account|agenc|office|professional/i],
  ['👗', /boutique|fashion|cloth/i],
  ['⚡', /electric/i],
  ['🔩', /plumb/i],
  ['🧹', /clean/i],
  ['🛠️', /handyman|repair.*home/i],
  ['📦', /moving|remov/i],
  ['🏨', /lodge|guesthouse|hotel|hostel|b.*b/i],
];

export function getCategoryEmoji(category: string): string {
  if (!category) return '🏪';
  const exact = EXACT_EMOJI[category];
  if (exact) return exact;
  for (const [emoji, re] of FUZZY_EMOJI) {
    if (re.test(category)) return emoji;
  }
  return '🏪'; // neutral storefront, never 📍
}

// ─── Open / closed status ────────────────────────────────────────────────────

const DAY_KEYS: (keyof OwnerHours)[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

function minutesSinceMidnight(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

function parseMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + (m || 0);
}

export type VenueOpenStatus =
  | { state: 'no_hours' }
  | { state: 'closed_today' }
  | { state: 'before_open'; opensAt: string }
  | { state: 'closed';      closedAt: string }
  | { state: 'closing_soon'; closesAt: string }
  | { state: 'open' }
  | { state: 'open_active' }; // open + real activity in last 2 hours

export function getVenueOpenStatus(
  venue: Venue,
  hasRecentCheckin = false,
): VenueOpenStatus {
  const hours = venue.ownerHours as OwnerHours | undefined | null;
  if (!hours) return { state: 'no_hours' };

  const now     = new Date();
  const dayKey  = DAY_KEYS[now.getDay()];
  const todayH  = hours[dayKey] as DayHours | undefined;

  if (!todayH || todayH.closed) return { state: 'no_hours' };
  if (!todayH.open || !todayH.close) return { state: 'no_hours' };

  const nowMin   = minutesSinceMidnight(now);
  const openMin  = parseMinutes(todayH.open);
  const closeMin = parseMinutes(todayH.close);

  if (nowMin < openMin) {
    return { state: 'before_open', opensAt: todayH.open };
  }
  if (nowMin >= closeMin) {
    return { state: 'closed', closedAt: todayH.close };
  }

  const minsToClose = closeMin - nowMin;
  if (minsToClose <= 60) {
    return { state: 'closing_soon', closesAt: todayH.close };
  }

  return hasRecentCheckin
    ? { state: 'open_active' }
    : { state: 'open' };
}
