// ─── Neighbourhood cluster model ─────────────────────────────────────────────
//
// Each cluster groups suburbs that residents think of as "the same area."
//
//   local[]  — tight inner ring shown in the "nearby" feed scope
//   metro[]  — broader commuter zone shown in "city_wide" scope only
//
// DESIGN INTENT
// -------------
// This file is the single source of truth for text-based area grouping.
// It is intentionally separate from FeedPage so it can be extended without
// touching feed logic, and can later be supplemented or replaced by GPS
// distance once venue coordinates are populated at scale.
//
// HOW TO ADD A NEW AREA
// ---------------------
// Add a new AreaCluster entry. suburbs are lowercased for normalisation.
// The matching is bidirectional substring, so "site b" matches "site b, khayelitsha".
//
// ─────────────────────────────────────────────────────────────────────────────

export interface AreaCluster {
  id: string;
  label: string;
  local: string[];   // primary cluster — qualifies for "nearby" scope
  metro: string[];   // broader ring  — qualifies for "city_wide" scope only
}

/** Relationship tier between a venue and the user's suburb. */
export type AreaTier = 'exact' | 'cluster' | 'metro' | 'outside';

// ─── Cluster definitions ──────────────────────────────────────────────────────

export const CLUSTERS: AreaCluster[] = [

  // ── Johannesburg West / Northwest (Honeydew area) ─────────────────────────
  {
    id: 'jhb_west',
    label: 'Johannesburg West',
    local: [
      'honeydew', 'randpark ridge', 'weltevreden park', 'boskruin',
      'sundowner', 'bromhof', 'north riding', 'radiokop',
      'strubens valley', 'wilgeheuwel', 'northgate', 'laser park',
      'cosmo city', 'allens nek', 'little falls',
    ],
    metro: [
      'randburg', 'roodepoort', 'fourways', 'johannesburg north',
      'northcliff', 'linden', 'blackheath', 'robinhills',
      'craighall', 'craighall park', 'hurlingham',
    ],
  },

  // ── Soweto ────────────────────────────────────────────────────────────────
  {
    id: 'soweto',
    label: 'Soweto',
    local: [
      'soweto', 'orlando west', 'orlando east', 'diepkloof',
      'meadowlands', 'dobsonville', 'protea glen', 'tladi',
      'pimville', 'klipspruit', 'zondi', 'dlamini', 'phiri',
      'moletsane', 'naledi', 'jabulani', 'chiawelo', 'mapetla',
      'freedom park', 'zola', 'emdeni',
    ],
    metro: [
      'lenasia', 'eldorado park', 'ennerdale', 'naturena',
      'kibler park', 'johannesburg south', 'glenvista',
    ],
  },

  // ── Johannesburg Central / CBD ────────────────────────────────────────────
  {
    id: 'jhb_central',
    label: 'Johannesburg Central',
    local: [
      'johannesburg cbd', 'marshalltown', 'newtown', 'braamfontein',
      'doornfontein', 'jeppestown', 'troyeville', 'city and suburban',
      'johannesburg', 'jo\'burg', 'joburg',
    ],
    metro: [
      'parktown', 'milpark', 'mayfair', 'vrededorp',
      'fordsburg', 'ferreirasdorp', 'hillbrow',
    ],
  },

  // ── Maboneng / Inner East ─────────────────────────────────────────────────
  {
    id: 'jhb_maboneng',
    label: 'Maboneng & Inner East',
    local: [
      'maboneng', 'lorentzville', 'bertrams', 'arts on main',
    ],
    metro: [
      'johannesburg cbd', 'braamfontein', 'doornfontein', 'jeppestown',
    ],
  },

  // ── Sandton / North ───────────────────────────────────────────────────────
  {
    id: 'jhb_north',
    label: 'Sandton & Johannesburg North',
    local: [
      'sandton', 'rosebank', 'illovo', 'hyde park', 'dunkeld',
      'rivonia', 'morningside', 'kramerville', 'parkmore', 'parktown north',
    ],
    metro: [
      'midrand', 'sunninghill', 'woodmead', 'bryanston', 'paulshof',
      'lonehill', 'fourways', 'dainfern',
    ],
  },

  // ── Alexandra / JHB East ─────────────────────────────────────────────────
  {
    id: 'jhb_east',
    label: 'Alexandra & East Johannesburg',
    local: [
      'alexandra', 'wynberg', 'marlboro', 'kelvin', 'linbro park',
    ],
    metro: [
      'edenvale', 'bedfordview', 'germiston', 'boksburg', 'ekurhuleni',
    ],
  },

  // ── Ekurhuleni / East Rand ────────────────────────────────────────────────
  {
    id: 'ekurhuleni',
    label: 'Ekurhuleni',
    local: [
      'tembisa', 'kempton park', 'germiston', 'boksburg', 'benoni',
      'brakpan', 'springs', 'nigel', 'ekurhuleni',
    ],
    metro: [
      'edenvale', 'bedfordview', 'alberton', 'vosloorus',
      'thokoza', 'katlehong',
    ],
  },

  // ── Thokoza / Katlehong (Ekurhuleni South) ───────────────────────────────
  {
    id: 'ekurhuleni_south',
    label: 'Ekurhuleni South',
    local: [
      'thokoza', 'katlehong', 'vosloorus', 'tokoza',
    ],
    metro: [
      'alberton', 'germiston', 'boksburg', 'ekurhuleni',
    ],
  },

  // ── Pretoria / Tshwane ────────────────────────────────────────────────────
  {
    id: 'pretoria',
    label: 'Pretoria / Tshwane',
    local: [
      'pretoria', 'pretoria cbd', 'hatfield', 'arcadia', 'sunnyside',
      'brooklyn', 'waterkloof', 'centurion', 'lyttelton', 'menlyn',
    ],
    metro: [
      'mamelodi', 'mamelodi east', 'eersterust', 'atteridgeville',
      'soshanguve', 'ga-rankuwa',
    ],
  },

  // ── Cape Town City Bowl ───────────────────────────────────────────────────
  {
    id: 'cape_town_central',
    label: 'Cape Town Central',
    local: [
      'cape town cbd', 'city bowl', 'gardens', 'tamboerskloof',
      'de waterkant', 'bo-kaap', 'foreshore', 'salt river',
      'woodstock', 'observatory', 'mowbray',
    ],
    metro: [
      'bellville', 'parow', 'goodwood', 'milnerton', 'tableview',
      'bloubergstrand', 'durbanville',
    ],
  },

  // ── Cape Flats (Khayelitsha, Mitchell's Plain) ────────────────────────────
  {
    id: 'cape_flats',
    label: 'Cape Flats',
    local: [
      'khayelitsha', 'site b', 'site c', "mitchell's plain", 'mitchells plain',
      'turfhall', 'strandfontein', 'lavender hill', 'steenberg',
      'hanover park', 'manenberg', 'gugulethu', 'nyanga', 'philippi',
    ],
    metro: [
      'bellville', 'athlone', 'claremont', 'wynberg', 'plumstead',
      'lansdowne', 'ottery',
    ],
  },

  // ── Cape South Peninsula ──────────────────────────────────────────────────
  {
    id: 'cape_south',
    label: 'Cape South',
    local: [
      'wynberg', 'plumstead', 'diep river', 'kenilworth', 'claremont',
      'newlands', 'rondebosch', 'mowbray', 'tokai', 'lakeside',
    ],
    metro: [
      'muizenberg', 'fish hoek', "simon's town", 'constantia', 'hout bay',
    ],
  },

  // ── Durban Central ────────────────────────────────────────────────────────
  {
    id: 'durban_central',
    label: 'Durban Central',
    local: [
      'durban cbd', 'berea', 'glenwood', 'morningside', 'musgrave',
      'overport', 'greyville', 'stamford hill', 'durban',
    ],
    metro: [
      'pinetown', 'westville', 'new germany', 'queensburgh',
    ],
  },

  // ── Umlazi & South Durban ─────────────────────────────────────────────────
  {
    id: 'durban_south',
    label: 'Umlazi & South Durban',
    local: [
      'umlazi', 'isipingo', 'prospecton', 'merebank', 'wentworth',
      'bluff', 'montclair',
    ],
    metro: [
      'pinetown', 'chatsworth', 'phoenix', 'durban cbd',
    ],
  },

];

// ─── Matching helpers ─────────────────────────────────────────────────────────

function normalise(s: string): string {
  return s.toLowerCase().trim();
}

/** Bidirectional substring match (case-insensitive). */
function suburbMatch(a: string, b: string): boolean {
  if (!a || !b) return false;
  const na = normalise(a);
  const nb = normalise(b);
  return na === nb || na.includes(nb) || nb.includes(na);
}

/**
 * Find the cluster that owns a given suburb name.
 * Checks both local and metro lists.
 */
export function findCluster(suburb: string): AreaCluster | null {
  if (!suburb) return null;
  const n = normalise(suburb);
  return CLUSTERS.find(c =>
    c.local.some(s => suburbMatch(s, n)) ||
    c.metro.some(s => suburbMatch(s, n))
  ) ?? null;
}

/**
 * Returns the tier relationship between a venue and the user's location.
 *
 * exact   — venue.neighborhood directly matches user suburb
 * cluster — venue is in the same tight local cluster
 * metro   — venue is in the broader metro/commuter fallback ring
 * outside — no known proximity; excluded from default local/nearby feed
 *
 * When no cluster data exists for the user's suburb, falls back to
 * city-level text matching (returns 'cluster' on match, 'outside' otherwise).
 */
export function getAreaTier(
  venueNeighborhood: string,
  venueCity: string,
  userSuburb: string,
  userCity = '',
): AreaTier {
  // ── 1. Exact suburb match ───────────────────────────────────────────────
  if (userSuburb && suburbMatch(venueNeighborhood, userSuburb)) return 'exact';
  // Venues where the city field IS the suburb (e.g. city: "Soweto")
  if (userSuburb && suburbMatch(venueCity, userSuburb)) return 'exact';

  // ── 2. Cluster-based lookup ─────────────────────────────────────────────
  const userCluster = findCluster(userSuburb) ?? findCluster(userCity);

  if (userCluster) {
    const vn = normalise(venueNeighborhood);
    const vc = normalise(venueCity);
    if (userCluster.local.some(s => suburbMatch(s, vn) || suburbMatch(s, vc))) return 'cluster';
    if (userCluster.metro.some(s => suburbMatch(s, vn) || suburbMatch(s, vc))) return 'metro';
    // Cluster data exists but venue is not in it → definitively outside
    return 'outside';
  }

  // ── 3. No cluster data — city text fallback ──────────────────────────────
  // Used for suburbs not yet mapped in CLUSTERS.
  if (userCity) {
    const ucn = normalise(userCity);
    const vcn = normalise(venueCity);
    if (vcn.includes(ucn) || ucn.includes(vcn)) return 'cluster';
  }

  return 'outside';
}

/** Numeric score for sorting: higher = closer to user. */
export function tierScore(tier: AreaTier): number {
  switch (tier) {
    case 'exact':   return 100;
    case 'cluster': return 60;
    case 'metro':   return 25;
    case 'outside': return 0;
  }
}
