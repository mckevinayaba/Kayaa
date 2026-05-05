/**
 * Kayaa Community Registry
 *
 * Data model: Province → Metro/City → Community
 *
 * This file is the single source of truth for all known communities.
 * It is intentionally LOCAL (no Supabase query) so the area picker
 * loads instantly on every device — no spinner, no network dependency.
 *
 * Adding a new community: append to COMMUNITIES and it appears in search.
 * Missing community searches are saved to the `community_requests` Supabase
 * table for admin review — they do NOT auto-create live communities.
 */

// ─── Types ─────────────────────────────────────────────────────────────────────

export type CommunityType =
  | 'suburb'
  | 'township'
  | 'cbd'
  | 'precinct'
  | 'informal_settlement'
  | 'village';

export type CommunityStatus = 'active' | 'seeded' | 'live';

export interface Community {
  slug:     string;          // unique, URL-safe: "gp-joburg-maboneng"
  name:     string;          // display name: "Maboneng"
  metro:    string;          // metro/city: "Johannesburg"
  province: string;          // full province: "Gauteng"
  type:     CommunityType;
  status:   CommunityStatus;
  featured?: boolean;        // show in quick-select chips
}

// ─── Province / Metro constants ────────────────────────────────────────────────

export const PROVINCES = [
  'Gauteng',
  'Western Cape',
  'KwaZulu-Natal',
  'Eastern Cape',
  'Limpopo',
  'Mpumalanga',
  'North West',
  'Free State',
  'Northern Cape',
] as const;

export type Province = typeof PROVINCES[number];

export const METROS: Record<Province, string[]> = {
  'Gauteng':        ['Johannesburg', 'Ekurhuleni', 'Tshwane'],
  'Western Cape':   ['Cape Town'],
  'KwaZulu-Natal':  ['eThekwini'],
  'Eastern Cape':   ['Buffalo City', 'Nelson Mandela Bay'],
  'Limpopo':        ['Polokwane'],
  'Mpumalanga':     ['Mbombela'],
  'North West':     ['Rustenburg', 'Mahikeng'],
  'Free State':     ['Mangaung'],
  'Northern Cape':  ['Sol Plaatje'],
};

// ─── Community registry ────────────────────────────────────────────────────────
//
// Format: { slug, name, metro, province, type, status, featured? }
//
// featured = true → shown as quick-pick chip when no search query
// Keep featured count per metro to ~4–6 max; represent the diversity
//

export const COMMUNITIES: Community[] = [

  // ── GAUTENG — Johannesburg ─────────────────────────────────────────────────

  { slug: 'gp-joburg-cbd',          name: 'Johannesburg CBD',  metro: 'Johannesburg', province: 'Gauteng', type: 'cbd',      status: 'active' },
  { slug: 'gp-joburg-braamfontein', name: 'Braamfontein',      metro: 'Johannesburg', province: 'Gauteng', type: 'precinct', status: 'active', featured: true },
  { slug: 'gp-joburg-maboneng',     name: 'Maboneng',          metro: 'Johannesburg', province: 'Gauteng', type: 'precinct', status: 'active', featured: true },
  { slug: 'gp-joburg-newtown',      name: 'Newtown',            metro: 'Johannesburg', province: 'Gauteng', type: 'precinct', status: 'active' },
  { slug: 'gp-joburg-sandton',      name: 'Sandton',            metro: 'Johannesburg', province: 'Gauteng', type: 'suburb',   status: 'active', featured: true },
  { slug: 'gp-joburg-rosebank',     name: 'Rosebank',           metro: 'Johannesburg', province: 'Gauteng', type: 'suburb',   status: 'active', featured: true },
  { slug: 'gp-joburg-randburg',     name: 'Randburg',           metro: 'Johannesburg', province: 'Gauteng', type: 'suburb',   status: 'active' },
  { slug: 'gp-joburg-midrand',      name: 'Midrand',            metro: 'Johannesburg', province: 'Gauteng', type: 'suburb',   status: 'active' },
  { slug: 'gp-joburg-fourways',     name: 'Fourways',           metro: 'Johannesburg', province: 'Gauteng', type: 'suburb',   status: 'active' },
  { slug: 'gp-joburg-melville',     name: 'Melville',           metro: 'Johannesburg', province: 'Gauteng', type: 'suburb',   status: 'active' },
  { slug: 'gp-joburg-greenside',    name: 'Greenside',          metro: 'Johannesburg', province: 'Gauteng', type: 'suburb',   status: 'active' },
  { slug: 'gp-joburg-parkhurst',    name: 'Parkhurst',          metro: 'Johannesburg', province: 'Gauteng', type: 'suburb',   status: 'active' },
  { slug: 'gp-joburg-norwood',      name: 'Norwood',            metro: 'Johannesburg', province: 'Gauteng', type: 'suburb',   status: 'active' },
  { slug: 'gp-joburg-orange-grove', name: 'Orange Grove',       metro: 'Johannesburg', province: 'Gauteng', type: 'suburb',   status: 'active' },
  { slug: 'gp-joburg-yeoville',     name: 'Yeoville',           metro: 'Johannesburg', province: 'Gauteng', type: 'suburb',   status: 'active' },
  { slug: 'gp-joburg-berea',        name: 'Berea',              metro: 'Johannesburg', province: 'Gauteng', type: 'suburb',   status: 'active' },
  { slug: 'gp-joburg-hillbrow',     name: 'Hillbrow',           metro: 'Johannesburg', province: 'Gauteng', type: 'suburb',   status: 'active' },
  { slug: 'gp-joburg-joubert-park', name: 'Joubert Park',       metro: 'Johannesburg', province: 'Gauteng', type: 'suburb',   status: 'active' },
  { slug: 'gp-joburg-fordsburg',    name: 'Fordsburg',          metro: 'Johannesburg', province: 'Gauteng', type: 'suburb',   status: 'active' },
  { slug: 'gp-joburg-lenasia',      name: 'Lenasia',            metro: 'Johannesburg', province: 'Gauteng', type: 'suburb',   status: 'active' },
  { slug: 'gp-joburg-roodepoort',   name: 'Roodepoort',         metro: 'Johannesburg', province: 'Gauteng', type: 'suburb',   status: 'active' },
  { slug: 'gp-joburg-northgate',    name: 'Northgate',          metro: 'Johannesburg', province: 'Gauteng', type: 'suburb',   status: 'active' },
  { slug: 'gp-joburg-soweto',       name: 'Soweto',             metro: 'Johannesburg', province: 'Gauteng', type: 'township', status: 'active', featured: true },
  { slug: 'gp-joburg-alexandra',    name: 'Alexandra',          metro: 'Johannesburg', province: 'Gauteng', type: 'township', status: 'active', featured: true },
  { slug: 'gp-joburg-diepsloot',    name: 'Diepsloot',          metro: 'Johannesburg', province: 'Gauteng', type: 'township', status: 'active' },
  { slug: 'gp-joburg-orange-farm',  name: 'Orange Farm',        metro: 'Johannesburg', province: 'Gauteng', type: 'township', status: 'active' },
  { slug: 'gp-joburg-eldorado',     name: 'Eldorado Park',      metro: 'Johannesburg', province: 'Gauteng', type: 'township', status: 'active' },

  // ── GAUTENG — Ekurhuleni ───────────────────────────────────────────────────

  { slug: 'gp-eku-tembisa',         name: 'Tembisa',            metro: 'Ekurhuleni',   province: 'Gauteng', type: 'township', status: 'active', featured: true },
  { slug: 'gp-eku-germiston',       name: 'Germiston',          metro: 'Ekurhuleni',   province: 'Gauteng', type: 'suburb',   status: 'active', featured: true },
  { slug: 'gp-eku-kempton-park',    name: 'Kempton Park',       metro: 'Ekurhuleni',   province: 'Gauteng', type: 'suburb',   status: 'active' },
  { slug: 'gp-eku-boksburg',        name: 'Boksburg',           metro: 'Ekurhuleni',   province: 'Gauteng', type: 'suburb',   status: 'active' },
  { slug: 'gp-eku-benoni',          name: 'Benoni',             metro: 'Ekurhuleni',   province: 'Gauteng', type: 'suburb',   status: 'active' },
  { slug: 'gp-eku-springs',         name: 'Springs',            metro: 'Ekurhuleni',   province: 'Gauteng', type: 'suburb',   status: 'active' },
  { slug: 'gp-eku-thokoza',         name: 'Thokoza',            metro: 'Ekurhuleni',   province: 'Gauteng', type: 'township', status: 'active' },
  { slug: 'gp-eku-katlehong',       name: 'Katlehong',          metro: 'Ekurhuleni',   province: 'Gauteng', type: 'township', status: 'active' },
  { slug: 'gp-eku-daveyton',        name: 'Daveyton',           metro: 'Ekurhuleni',   province: 'Gauteng', type: 'township', status: 'active' },
  { slug: 'gp-eku-duduza',          name: 'Duduza',             metro: 'Ekurhuleni',   province: 'Gauteng', type: 'township', status: 'active' },

  // ── GAUTENG — Tshwane ─────────────────────────────────────────────────────

  { slug: 'gp-tsh-cbd',             name: 'Pretoria CBD',       metro: 'Tshwane',      province: 'Gauteng', type: 'cbd',      status: 'active', featured: true },
  { slug: 'gp-tsh-hatfield',        name: 'Hatfield',           metro: 'Tshwane',      province: 'Gauteng', type: 'suburb',   status: 'active', featured: true },
  { slug: 'gp-tsh-arcadia',         name: 'Arcadia',            metro: 'Tshwane',      province: 'Gauteng', type: 'suburb',   status: 'active' },
  { slug: 'gp-tsh-sunnyside',       name: 'Sunnyside',          metro: 'Tshwane',      province: 'Gauteng', type: 'suburb',   status: 'active' },
  { slug: 'gp-tsh-menlyn',          name: 'Menlyn',             metro: 'Tshwane',      province: 'Gauteng', type: 'precinct', status: 'active' },
  { slug: 'gp-tsh-centurion',       name: 'Centurion',          metro: 'Tshwane',      province: 'Gauteng', type: 'suburb',   status: 'active', featured: true },
  { slug: 'gp-tsh-mamelodi',        name: 'Mamelodi',           metro: 'Tshwane',      province: 'Gauteng', type: 'township', status: 'active', featured: true },
  { slug: 'gp-tsh-atteridgeville',  name: 'Atteridgeville',     metro: 'Tshwane',      province: 'Gauteng', type: 'township', status: 'active' },
  { slug: 'gp-tsh-soshanguve',      name: 'Soshanguve',         metro: 'Tshwane',      province: 'Gauteng', type: 'township', status: 'active' },
  { slug: 'gp-tsh-mabopane',        name: 'Mabopane',           metro: 'Tshwane',      province: 'Gauteng', type: 'township', status: 'active' },

  // ── WESTERN CAPE — Cape Town ───────────────────────────────────────────────

  { slug: 'wc-cpt-cbd',             name: 'Cape Town CBD',      metro: 'Cape Town',    province: 'Western Cape', type: 'cbd',      status: 'active', featured: true },
  { slug: 'wc-cpt-green-point',     name: 'Green Point',        metro: 'Cape Town',    province: 'Western Cape', type: 'suburb',   status: 'active' },
  { slug: 'wc-cpt-sea-point',       name: 'Sea Point',          metro: 'Cape Town',    province: 'Western Cape', type: 'suburb',   status: 'active', featured: true },
  { slug: 'wc-cpt-de-waterkant',    name: 'De Waterkant',       metro: 'Cape Town',    province: 'Western Cape', type: 'precinct', status: 'active' },
  { slug: 'wc-cpt-bo-kaap',         name: 'Bo-Kaap',            metro: 'Cape Town',    province: 'Western Cape', type: 'precinct', status: 'active' },
  { slug: 'wc-cpt-woodstock',       name: 'Woodstock',          metro: 'Cape Town',    province: 'Western Cape', type: 'suburb',   status: 'active', featured: true },
  { slug: 'wc-cpt-salt-river',      name: 'Salt River',         metro: 'Cape Town',    province: 'Western Cape', type: 'suburb',   status: 'active' },
  { slug: 'wc-cpt-observatory',     name: 'Observatory',        metro: 'Cape Town',    province: 'Western Cape', type: 'suburb',   status: 'active', featured: true },
  { slug: 'wc-cpt-rondebosch',      name: 'Rondebosch',         metro: 'Cape Town',    province: 'Western Cape', type: 'suburb',   status: 'active' },
  { slug: 'wc-cpt-claremont',       name: 'Claremont',          metro: 'Cape Town',    province: 'Western Cape', type: 'suburb',   status: 'active' },
  { slug: 'wc-cpt-wynberg',         name: 'Wynberg',            metro: 'Cape Town',    province: 'Western Cape', type: 'suburb',   status: 'active', featured: true },
  { slug: 'wc-cpt-athlone',         name: 'Athlone',            metro: 'Cape Town',    province: 'Western Cape', type: 'suburb',   status: 'active' },
  { slug: 'wc-cpt-bellville',       name: 'Bellville',          metro: 'Cape Town',    province: 'Western Cape', type: 'suburb',   status: 'active', featured: true },
  { slug: 'wc-cpt-parow',           name: 'Parow',              metro: 'Cape Town',    province: 'Western Cape', type: 'suburb',   status: 'active' },
  { slug: 'wc-cpt-mitchells-plain', name: "Mitchell's Plain",   metro: 'Cape Town',    province: 'Western Cape', type: 'township', status: 'active', featured: true },
  { slug: 'wc-cpt-khayelitsha',     name: 'Khayelitsha',        metro: 'Cape Town',    province: 'Western Cape', type: 'township', status: 'active', featured: true },
  { slug: 'wc-cpt-gugulethu',       name: 'Gugulethu',          metro: 'Cape Town',    province: 'Western Cape', type: 'township', status: 'active' },
  { slug: 'wc-cpt-langa',           name: 'Langa',              metro: 'Cape Town',    province: 'Western Cape', type: 'township', status: 'active' },
  { slug: 'wc-cpt-nyanga',          name: 'Nyanga',             metro: 'Cape Town',    province: 'Western Cape', type: 'township', status: 'active' },
  { slug: 'wc-cpt-philippi',        name: 'Philippi',           metro: 'Cape Town',    province: 'Western Cape', type: 'township', status: 'active' },

  // ── KWAZULU-NATAL — eThekwini ──────────────────────────────────────────────

  { slug: 'kzn-eth-cbd',            name: 'Durban CBD',         metro: 'eThekwini',    province: 'KwaZulu-Natal', type: 'cbd',      status: 'active', featured: true },
  { slug: 'kzn-eth-point',          name: 'The Point',          metro: 'eThekwini',    province: 'KwaZulu-Natal', type: 'precinct', status: 'active' },
  { slug: 'kzn-eth-morningside',    name: 'Morningside',        metro: 'eThekwini',    province: 'KwaZulu-Natal', type: 'suburb',   status: 'active' },
  { slug: 'kzn-eth-berea',          name: 'Berea',              metro: 'eThekwini',    province: 'KwaZulu-Natal', type: 'suburb',   status: 'active', featured: true },
  { slug: 'kzn-eth-umbilo',         name: 'Umbilo',             metro: 'eThekwini',    province: 'KwaZulu-Natal', type: 'suburb',   status: 'active' },
  { slug: 'kzn-eth-musgrave',       name: 'Musgrave',           metro: 'eThekwini',    province: 'KwaZulu-Natal', type: 'suburb',   status: 'active' },
  { slug: 'kzn-eth-overport',       name: 'Overport',           metro: 'eThekwini',    province: 'KwaZulu-Natal', type: 'suburb',   status: 'active' },
  { slug: 'kzn-eth-glenwood',       name: 'Glenwood',           metro: 'eThekwini',    province: 'KwaZulu-Natal', type: 'suburb',   status: 'active' },
  { slug: 'kzn-eth-westville',      name: 'Westville',          metro: 'eThekwini',    province: 'KwaZulu-Natal', type: 'suburb',   status: 'active' },
  { slug: 'kzn-eth-pinetown',       name: 'Pinetown',           metro: 'eThekwini',    province: 'KwaZulu-Natal', type: 'suburb',   status: 'active', featured: true },
  { slug: 'kzn-eth-chatsworth',     name: 'Chatsworth',         metro: 'eThekwini',    province: 'KwaZulu-Natal', type: 'suburb',   status: 'active', featured: true },
  { slug: 'kzn-eth-tongaat',        name: 'Tongaat',            metro: 'eThekwini',    province: 'KwaZulu-Natal', type: 'suburb',   status: 'active' },
  { slug: 'kzn-eth-isipingo',       name: 'Isipingo',           metro: 'eThekwini',    province: 'KwaZulu-Natal', type: 'suburb',   status: 'active' },
  { slug: 'kzn-eth-umlazi',         name: 'Umlazi',             metro: 'eThekwini',    province: 'KwaZulu-Natal', type: 'township', status: 'active', featured: true },
  { slug: 'kzn-eth-kwamashi',       name: 'KwaMashu',           metro: 'eThekwini',    province: 'KwaZulu-Natal', type: 'township', status: 'active', featured: true },
  { slug: 'kzn-eth-phoenix',        name: 'Phoenix',            metro: 'eThekwini',    province: 'KwaZulu-Natal', type: 'township', status: 'active' },
  { slug: 'kzn-eth-inanda',         name: 'Inanda',             metro: 'eThekwini',    province: 'KwaZulu-Natal', type: 'township', status: 'active' },

  // ── EASTERN CAPE — Buffalo City ────────────────────────────────────────────

  { slug: 'ec-bc-east-london-cbd',  name: 'East London CBD',    metro: 'Buffalo City', province: 'Eastern Cape', type: 'cbd',      status: 'active', featured: true },
  { slug: 'ec-bc-mdantsane',        name: 'Mdantsane',          metro: 'Buffalo City', province: 'Eastern Cape', type: 'township', status: 'active', featured: true },
  { slug: 'ec-bc-scenery-park',     name: 'Scenery Park',       metro: 'Buffalo City', province: 'Eastern Cape', type: 'suburb',   status: 'active' },
  { slug: 'ec-bc-king-williams',    name: 'King William\'s Town', metro: 'Buffalo City', province: 'Eastern Cape', type: 'suburb', status: 'active' },

  // ── EASTERN CAPE — Nelson Mandela Bay ──────────────────────────────────────

  { slug: 'ec-nmb-gqeberha-cbd',    name: 'Gqeberha CBD',       metro: 'Nelson Mandela Bay', province: 'Eastern Cape', type: 'cbd',      status: 'active', featured: true },
  { slug: 'ec-nmb-new-brighton',    name: 'New Brighton',       metro: 'Nelson Mandela Bay', province: 'Eastern Cape', type: 'township', status: 'active', featured: true },
  { slug: 'ec-nmb-motherwell',      name: 'Motherwell',         metro: 'Nelson Mandela Bay', province: 'Eastern Cape', type: 'township', status: 'active' },
  { slug: 'ec-nmb-uitenhage',       name: 'Uitenhage',          metro: 'Nelson Mandela Bay', province: 'Eastern Cape', type: 'suburb',   status: 'active' },

  // ── LIMPOPO — Polokwane ────────────────────────────────────────────────────

  { slug: 'lp-pol-cbd',             name: 'Polokwane CBD',      metro: 'Polokwane',    province: 'Limpopo', type: 'cbd',      status: 'active', featured: true },
  { slug: 'lp-pol-seshego',         name: 'Seshego',            metro: 'Polokwane',    province: 'Limpopo', type: 'township', status: 'active', featured: true },
  { slug: 'lp-pol-bendor',          name: 'Bendor',             metro: 'Polokwane',    province: 'Limpopo', type: 'suburb',   status: 'active' },
  { slug: 'lp-pol-fauna-park',      name: 'Fauna Park',         metro: 'Polokwane',    province: 'Limpopo', type: 'suburb',   status: 'active' },

  // ── MPUMALANGA — Mbombela ──────────────────────────────────────────────────

  { slug: 'mp-mbom-cbd',            name: 'Mbombela CBD',       metro: 'Mbombela',     province: 'Mpumalanga', type: 'cbd',      status: 'active', featured: true },
  { slug: 'mp-mbom-kanyamazane',    name: 'Kanyamazane',        metro: 'Mbombela',     province: 'Mpumalanga', type: 'township', status: 'active', featured: true },
  { slug: 'mp-mbom-matsulu',        name: 'Matsulu',            metro: 'Mbombela',     province: 'Mpumalanga', type: 'township', status: 'active' },

  // ── NORTH WEST — Rustenburg ────────────────────────────────────────────────

  { slug: 'nw-rus-cbd',             name: 'Rustenburg CBD',     metro: 'Rustenburg',   province: 'North West', type: 'cbd',      status: 'active', featured: true },
  { slug: 'nw-rus-phokeng',         name: 'Phokeng',            metro: 'Rustenburg',   province: 'North West', type: 'village',  status: 'active', featured: true },
  { slug: 'nw-rus-boitekong',       name: 'Boitekong',          metro: 'Rustenburg',   province: 'North West', type: 'township', status: 'active' },

  // ── NORTH WEST — Mahikeng ─────────────────────────────────────────────────

  { slug: 'nw-mah-cbd',             name: 'Mahikeng CBD',       metro: 'Mahikeng',     province: 'North West', type: 'cbd',      status: 'active', featured: true },
  { slug: 'nw-mah-montshiwa',       name: 'Montshiwa',          metro: 'Mahikeng',     province: 'North West', type: 'township', status: 'active', featured: true },

  // ── FREE STATE — Mangaung ──────────────────────────────────────────────────

  { slug: 'fs-mng-bloemfontein-cbd', name: 'Bloemfontein CBD',  metro: 'Mangaung',     province: 'Free State', type: 'cbd',      status: 'active', featured: true },
  { slug: 'fs-mng-mangaung',         name: 'Mangaung',          metro: 'Mangaung',     province: 'Free State', type: 'township', status: 'active', featured: true },
  { slug: 'fs-mng-botshabelo',       name: 'Botshabelo',        metro: 'Mangaung',     province: 'Free State', type: 'township', status: 'active' },
  { slug: 'fs-mng-heidedal',         name: 'Heidedal',          metro: 'Mangaung',     province: 'Free State', type: 'suburb',   status: 'active' },
  { slug: 'fs-mng-langenhoven',      name: 'Langenhoven Park',  metro: 'Mangaung',     province: 'Free State', type: 'suburb',   status: 'active' },

  // ── NORTHERN CAPE — Sol Plaatje ───────────────────────────────────────────

  { slug: 'nc-sp-kimberley-cbd',    name: 'Kimberley CBD',      metro: 'Sol Plaatje',  province: 'Northern Cape', type: 'cbd',      status: 'active', featured: true },
  { slug: 'nc-sp-galeshewe',        name: 'Galeshewe',          metro: 'Sol Plaatje',  province: 'Northern Cape', type: 'township', status: 'active', featured: true },
];

// ─── Search ────────────────────────────────────────────────────────────────────

/**
 * Search communities by name, metro, or province.
 * Returns results grouped by metro for display.
 */
export function searchCommunities(query: string): Community[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  return COMMUNITIES.filter(c =>
    c.name.toLowerCase().includes(q) ||
    c.metro.toLowerCase().includes(q) ||
    c.province.toLowerCase().includes(q)
  ).sort((a, b) => {
    // Exact name match first
    const aExact = a.name.toLowerCase() === q;
    const bExact = b.name.toLowerCase() === q;
    if (aExact && !bExact) return -1;
    if (!aExact && bExact) return 1;
    // Name starts-with next
    const aStarts = a.name.toLowerCase().startsWith(q);
    const bStarts = b.name.toLowerCase().startsWith(q);
    if (aStarts && !bStarts) return -1;
    if (!aStarts && bStarts) return 1;
    // CBD and precinct before suburb before township
    const typeOrder: Record<CommunityType, number> = {
      cbd: 0, precinct: 1, suburb: 2, village: 3, township: 4, informal_settlement: 5,
    };
    return typeOrder[a.type] - typeOrder[b.type];
  });
}

/**
 * Group a flat community list by metro for display.
 * Returns ordered array of { metro, province, communities }.
 */
export function groupByMetro(
  communities: Community[]
): { metro: string; province: string; communities: Community[] }[] {
  const map = new Map<string, { metro: string; province: string; communities: Community[] }>();
  for (const c of communities) {
    if (!map.has(c.metro)) {
      map.set(c.metro, { metro: c.metro, province: c.province, communities: [] });
    }
    map.get(c.metro)!.communities.push(c);
  }
  return Array.from(map.values());
}

/**
 * Featured communities shown as quick-pick chips when no search query.
 * Balanced across provinces: ~4 Gauteng, ~4 WC, ~4 KZN, a few others.
 */
export function getFeaturedCommunities(): Community[] {
  return COMMUNITIES.filter(c => c.featured);
}

/**
 * Infer the most likely province and metro for a free-text community name.
 * Used when saving a community request to pre-populate province/metro.
 * Simple heuristic: check if query appears near any known metro name.
 */
export function inferLocation(query: string): { province?: string; metro?: string } {
  const q = query.toLowerCase();
  // Check for metro keywords in the query
  for (const [province, metros] of Object.entries(METROS)) {
    for (const metro of metros) {
      if (q.includes(metro.toLowerCase())) {
        return { province, metro };
      }
    }
  }
  return {};
}

/** Human-readable label for a community type */
export const COMMUNITY_TYPE_LABEL: Record<CommunityType, string> = {
  suburb:              'Suburb',
  township:            'Township',
  cbd:                 'CBD',
  precinct:            'Precinct',
  informal_settlement: 'Informal settlement',
  village:             'Village',
};
