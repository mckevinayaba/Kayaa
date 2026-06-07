// ─── Bounding-box suburb lookup ───────────────────────────────────────────────
//
// Layer 1: instant, zero-API-cost. Falls back to BigDataCloud when no match.
// Precise bounding boxes fix boundary bugs (e.g. Rosebank vs Parktown North
// which are separated only by Jan Smuts Avenue).

interface SuburbBounds {
  name:   string;
  city:   string;   // city paired with this suburb for display
  minLat: number; maxLat: number;
  minLon: number; maxLon: number;
}

const SUBURB_BOUNDS: SuburbBounds[] = [
  // ── Johannesburg — north ───────────────────────────────────────────────────
  { name: 'Rosebank',        city: 'Johannesburg', minLat: -26.1520, maxLat: -26.1380, minLon: 28.0380, maxLon: 28.0500 },
  { name: 'Parktown North',  city: 'Johannesburg', minLat: -26.1420, maxLat: -26.1300, minLon: 28.0280, maxLon: 28.0420 },
  { name: 'Sandton',         city: 'Sandton',      minLat: -26.1200, maxLat: -26.0900, minLon: 28.0450, maxLon: 28.0750 },
  { name: 'Bryanston',       city: 'Sandton',      minLat: -26.0850, maxLat: -26.0600, minLon: 28.0100, maxLon: 28.0450 },
  { name: 'Randburg',        city: 'Randburg',     minLat: -26.1050, maxLat: -26.0700, minLon: 27.9800, maxLon: 28.0200 },
  { name: 'Honeydew',        city: 'Randburg',     minLat: -26.0900, maxLat: -26.0500, minLon: 27.9400, maxLon: 27.9900 },
  { name: 'Randpark Ridge',  city: 'Randburg',     minLat: -26.1100, maxLat: -26.0800, minLon: 27.9500, maxLon: 27.9850 },
  { name: 'Alexandra',       city: 'Johannesburg', minLat: -26.1100, maxLat: -26.0900, minLon: 28.0950, maxLon: 28.1200 },
  { name: 'Tembisa',         city: 'Ekurhuleni',   minLat: -26.0200, maxLat: -25.9700, minLon: 28.1900, maxLon: 28.2500 },
  { name: 'Midrand',         city: 'Midrand',      minLat: -25.9950, maxLat: -25.9500, minLon: 28.1050, maxLon: 28.1550 },
  // ── Johannesburg — inner ──────────────────────────────────────────────────
  // Maboneng first so it wins over the broader Berea box
  { name: 'Maboneng',        city: 'Johannesburg', minLat: -26.2060, maxLat: -26.1980, minLon: 28.0530, maxLon: 28.0650 },
  // Hillbrow must be listed BEFORE Braamfontein and Berea (more specific)
  { name: 'Hillbrow',        city: 'Johannesburg', minLat: -26.2030, maxLat: -26.1870, minLon: 28.0390, maxLon: 28.0575 },
  { name: 'Braamfontein',    city: 'Johannesburg', minLat: -26.1940, maxLat: -26.1840, minLon: 28.0310, maxLon: 28.0460 },
  { name: 'Berea',           city: 'Johannesburg', minLat: -26.2160, maxLat: -26.1840, minLon: 28.0460, maxLon: 28.0820 },
  { name: 'Yeoville',        city: 'Johannesburg', minLat: -26.1970, maxLat: -26.1820, minLon: 28.0680, maxLon: 28.0900 },
  { name: 'Bellevue',        city: 'Johannesburg', minLat: -26.1920, maxLat: -26.1800, minLon: 28.0780, maxLon: 28.0940 },
  { name: 'Troyeville',      city: 'Johannesburg', minLat: -26.2050, maxLat: -26.1940, minLon: 28.0680, maxLon: 28.0850 },
  { name: 'Doornfontein',    city: 'Johannesburg', minLat: -26.2020, maxLat: -26.1890, minLon: 28.0540, maxLon: 28.0720 },
  { name: 'Bez Valley',      city: 'Johannesburg', minLat: -26.2000, maxLat: -26.1870, minLon: 28.0900, maxLon: 28.1100 },
  { name: 'Jeppestown',      city: 'Johannesburg', minLat: -26.2050, maxLat: -26.1960, minLon: 28.0560, maxLon: 28.0720 },
  { name: 'Newtown',         city: 'Johannesburg', minLat: -26.2040, maxLat: -26.1950, minLon: 28.0180, maxLon: 28.0350 },
  { name: 'Fordsburg',       city: 'Johannesburg', minLat: -26.2080, maxLat: -26.1960, minLon: 28.0080, maxLon: 28.0260 },
  // ── Johannesburg — south ──────────────────────────────────────────────────
  { name: 'Soweto',          city: 'Soweto',       minLat: -26.3200, maxLat: -26.2000, minLon: 27.8200, maxLon: 27.9800 },
  { name: 'Orlando West',    city: 'Soweto',       minLat: -26.2600, maxLat: -26.2300, minLon: 27.8900, maxLon: 27.9200 },
  { name: 'Diepkloof',       city: 'Soweto',       minLat: -26.2650, maxLat: -26.2350, minLon: 27.9000, maxLon: 27.9500 },
  { name: 'Meadowlands',     city: 'Soweto',       minLat: -26.2450, maxLat: -26.2100, minLon: 27.8800, maxLon: 27.9200 },
  // ── Pretoria / Tshwane ────────────────────────────────────────────────────
  { name: 'Sunnyside',       city: 'Pretoria',     minLat: -25.7480, maxLat: -25.7300, minLon: 28.2100, maxLon: 28.2350 },
  { name: 'Hatfield',        city: 'Pretoria',     minLat: -25.7520, maxLat: -25.7380, minLon: 28.2280, maxLon: 28.2500 },
  { name: 'Arcadia',         city: 'Pretoria',     minLat: -25.7450, maxLat: -25.7250, minLon: 28.2000, maxLon: 28.2280 },
  { name: 'Mamelodi',        city: 'Pretoria',     minLat: -25.7200, maxLat: -25.6900, minLon: 28.3700, maxLon: 28.4300 },
  // ── Cape Town ─────────────────────────────────────────────────────────────
  { name: 'Khayelitsha',     city: 'Cape Town',    minLat: -34.0400, maxLat: -33.9700, minLon: 18.6300, maxLon: 18.7200 },
  { name: "Mitchell's Plain", city: 'Cape Town',   minLat: -34.0600, maxLat: -34.0000, minLon: 18.6000, maxLon: 18.6800 },
  { name: 'Observatory',     city: 'Cape Town',    minLat: -33.9450, maxLat: -33.9300, minLon: 18.4650, maxLon: 18.4900 },
  { name: 'Woodstock',       city: 'Cape Town',    minLat: -33.9300, maxLat: -33.9180, minLon: 18.4450, maxLon: 18.4680 },
  { name: 'Gugulethu',       city: 'Cape Town',    minLat: -34.0050, maxLat: -33.9750, minLon: 18.5600, maxLon: 18.5980 },
  { name: 'Langa',           city: 'Cape Town',    minLat: -33.9550, maxLat: -33.9350, minLon: 18.5250, maxLon: 18.5600 },
  { name: 'Belhar',          city: 'Cape Town',    minLat: -33.9300, maxLat: -33.9000, minLon: 18.6250, maxLon: 18.6600 },
  { name: 'Atlantis',        city: 'Cape Town',    minLat: -33.5800, maxLat: -33.5400, minLon: 18.4700, maxLon: 18.5200 },
  // ── Durban / eThekwini ────────────────────────────────────────────────────
  // NOTE: Berea, Durban is separate from Berea, Johannesburg above.
  { name: 'Berea',           city: 'Durban',       minLat: -29.8700, maxLat: -29.8450, minLon: 31.0000, maxLon: 31.0280 },
  { name: 'Glenwood',        city: 'Durban',       minLat: -29.8820, maxLat: -29.8620, minLon: 30.9900, maxLon: 31.0150 },
  { name: 'Overport',        city: 'Durban',       minLat: -29.8620, maxLat: -29.8430, minLon: 31.0050, maxLon: 31.0300 },
  { name: 'Umlazi',          city: 'Durban',       minLat: -29.9900, maxLat: -29.9400, minLon: 30.8800, maxLon: 30.9400 },
  { name: 'Chatsworth',      city: 'Durban',       minLat: -29.9400, maxLat: -29.8900, minLon: 30.8900, maxLon: 30.9350 },
  { name: 'Phoenix',         city: 'Durban',       minLat: -29.7400, maxLat: -29.6900, minLon: 30.9800, maxLon: 31.0400 },
];

/**
 * Check known bounding boxes FIRST before calling BigDataCloud.
 * Returns { name, city } when GPS point falls inside a known box, or null.
 */
export function detectSuburbFromBounds(lat: number, lon: number): { name: string; city: string } | null {
  for (const s of SUBURB_BOUNDS) {
    if (lat >= s.minLat && lat <= s.maxLat && lon >= s.minLon && lon <= s.maxLon) {
      return { name: s.name, city: s.city };
    }
  }
  return null;
}

// ─── BigDataCloud reverse geocoder ────────────────────────────────────────────
//
// Free, no API key needed. Better SA suburb accuracy than Nominatim because it
// returns structured locality data (suburb/locality, city) rather than raw OSM
// address fields which are inconsistent in dense African city contexts.

const BDC_BASE = 'https://api.bigdatacloud.net/data/reverse-geocode-client';

/** Safely read a string field from an unknown object */
function safeStr(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

/**
 * Extract suburb from BigDataCloud response.
 *
 * CRITICAL: For South Africa, `d.locality` often returns the city ("Johannesburg")
 * not the suburb ("Berea"). The actual suburb lives in d.localityInfo.administrative
 * at higher `order` values (adminLevel 8-10 = suburb level).
 *
 * Strategy: sort administrative entries by `order` descending (most precise first),
 * skip country / province / metro-city names, return the first meaningful suburb name.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractSuburbFromBDC(d: any): string {
  const countryName  = safeStr(d.countryName);
  const province     = safeStr(d.principalSubdivision);
  const cityName     = safeStr(d.city);
  // Some SA metros return very long official names (e.g. "City of Johannesburg Metropolitan Municipality")
  // Normalise to plain city for comparison
  const cityNorm     = cityName.toLowerCase().replace(/\s+(metropolitan\s+municipality|municipality|metro|city of)\s*/gi, '').trim();

  // 1. Try localityInfo.administrative — most reliable for SA suburbs
  if (Array.isArray(d.localityInfo?.administrative)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const levels = (d.localityInfo.administrative as any[])
      .slice()
      .sort((a, b) => (b.order ?? 0) - (a.order ?? 0));   // most precise first

    for (const level of levels) {
      const name = safeStr(level.name);
      if (!name) continue;
      if (/^\d+$/.test(name)) continue;                    // skip postcodes / wards that are numbers only
      const nameLower = name.toLowerCase();
      if (nameLower === countryName.toLowerCase()) continue;
      if (nameLower === province.toLowerCase()) continue;
      if (nameLower === cityName.toLowerCase()) continue;
      if (nameLower === cityNorm) continue;
      // Skip generic ward / region labels ("Region F", "Region E", "Ward 123")
      if (/^(region|ward)\s+\w+$/i.test(name)) continue;
      return name;
    }
  }

  // 2. Try localityInfo.informative for explicit suburb/neighbourhood entries
  if (Array.isArray(d.localityInfo?.informative)) {
    const SUBURB_DESCS = new Set(['suburb', 'neighbourhood', 'neighborhood', 'precinct', 'quarter']);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const entry = (d.localityInfo.informative as any[]).find(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (i: any) =>
        typeof i.description === 'string' &&
        SUBURB_DESCS.has(i.description.toLowerCase()),
    );
    if (entry) return safeStr(entry.name);
  }

  // 3. Use locality ONLY if it differs meaningfully from city (avoid "Johannesburg" → "Johannesburg")
  const locality = safeStr(d.locality);
  if (locality && locality.toLowerCase() !== cityName.toLowerCase() && locality.toLowerCase() !== cityNorm) {
    return locality;
  }

  return '';   // caller will use city as suburb fallback
}

/** Defensive BigDataCloud reverse geocode — returns null on any failure */
async function queryBigDataCloud(lat: number, lon: number): Promise<{ suburb: string; city: string } | null> {
  try {
    const url = `${BDC_BASE}?latitude=${lat}&longitude=${lon}&localityLanguage=en`;
    const res = await fetch(url);
    if (!res.ok) return null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const d: any = await res.json();

    // City: prefer top-level `city`; fall back to `locality`; fall back to adminLevel 6
    let city = safeStr(d.city);
    if (!city) city = safeStr(d.locality);
    if (!city && Array.isArray(d.localityInfo?.administrative)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const metroEntry = (d.localityInfo.administrative as any[]).find(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (a: any) => a.adminLevel === 6,
      );
      if (metroEntry) city = safeStr(metroEntry.name);
    }

    // Suburb: extracted from administrative levels (NOT d.locality for SA)
    const suburb = extractSuburbFromBDC(d);

    if (!suburb && !city) return null;
    return { suburb: suburb || city, city: city || suburb };
  } catch {
    return null;
  }
}

// ─── Public types ─────────────────────────────────────────────────────────────

export interface GeocodedLocation {
  lat: number;
  lng: number;
  displayName?: string;
}

export interface ReverseGeocodeResult {
  suburb: string;
  city:   string;
  lat:    number;
  lon:    number;
  /**
   * confidence reflects GPS accuracy:
   *   high   = real GPS hardware (< 100 m)
   *   medium = WiFi triangulation (~100–1000 m)
   *   low    = cell tower / IP-based (> 1 km) — suburb name unreliable
   */
  confidence: 'high' | 'medium' | 'low';
  raw: Record<string, string>;
}

/**
 * Structured area type used across the geolocation pipeline.
 * `display` is pre-formatted for UI rendering ("Suburb, City" or "Suburb").
 */
export type DetectedArea = {
  suburb:     string;
  city:       string;
  /** Pre-formatted label: "Hillbrow, Johannesburg" or "Soweto" */
  display:    string;
  confidence: 'high' | 'medium' | 'low';
  source:     'gps' | 'override' | 'fallback';
};

// ─── Core reverse geocode function ────────────────────────────────────────────

/**
 * Reverse geocode GPS coordinates to suburb + city.
 *
 * Layer order:
 *   1. Bounding-box lookup  — instant, zero network, highest accuracy for known suburbs
 *   2. BigDataCloud API     — structured locality/city fields, better than Nominatim for SA
 *
 * Returns null on network failure. Never throws.
 */
export async function reverseGeocodeCoords(
  lat: number,
  lon: number,
  accuracyMetres?: number,
): Promise<ReverseGeocodeResult | null> {
  const confidence: ReverseGeocodeResult['confidence'] =
    accuracyMetres == null    ? 'high'
    : accuracyMetres <= 100   ? 'high'
    : accuracyMetres <= 1000  ? 'medium'
    : 'low';

  // ── Layer 1: bounding box (instant, no API call) ───────────────────────────
  const box = detectSuburbFromBounds(lat, lon);
  if (box) {
    // Bounding box gives us the suburb name with high accuracy.
    // Still call BigDataCloud for the city in case our hardcoded city is wrong
    // for an edge case — but trust our suburb name completely.
    try {
      const bdc = await queryBigDataCloud(lat, lon);
      const city = bdc?.city || box.city;
      return { suburb: box.name, city, lat, lon, confidence, raw: {} };
    } catch {
      return { suburb: box.name, city: box.city, lat, lon, confidence, raw: {} };
    }
  }

  // ── Layer 2: BigDataCloud reverse geocode ──────────────────────────────────
  const bdc = await queryBigDataCloud(lat, lon);
  if (bdc?.suburb) {
    return { suburb: bdc.suburb, city: bdc.city, lat, lon, confidence, raw: {} };
  }

  return null;
}

/**
 * High-level neighbourhood detection — wraps reverseGeocodeCoords and returns
 * a pre-formatted DetectedArea suitable for direct context/UI use.
 *
 * Use this from NeighbourhoodContext; use reverseGeocodeCoords elsewhere when
 * you need raw suburb/city strings.
 */
export async function detectNeighbourhood(
  lat: number,
  lng: number,
  accuracy?: number,
): Promise<DetectedArea | null> {
  const result = await reverseGeocodeCoords(lat, lng, accuracy);
  if (!result) return null;

  const { suburb, city } = result;
  const display =
    suburb && city && suburb.toLowerCase() !== city.toLowerCase()
      ? `${suburb}, ${city}`
      : suburb || city;

  return {
    suburb,
    city,
    display,
    confidence: result.confidence,
    source: 'gps',
  };
}

// ─── Forward geocode ──────────────────────────────────────────────────────────

/**
 * Forward geocode a text address via Nominatim (SA-scoped).
 * Free, no API key. Rate-limited to 1 req/s.
 * Returns null on any failure — callers must treat geocoding as best-effort.
 */
export async function geocodeAddress(address: string): Promise<GeocodedLocation | null> {
  try {
    const url =
      `https://nominatim.openstreetmap.org/search` +
      `?q=${encodeURIComponent(address)}` +
      `&format=json&limit=1&countrycodes=za`;

    const res = await fetch(url, {
      headers: {
        'User-Agent': 'kayaa-app/1.0',
        'Accept-Language': 'en',
      },
    });

    if (!res.ok) return null;

    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return null;

    const { lat, lon, display_name } = data[0];
    return {
      lat: parseFloat(lat),
      lng: parseFloat(lon),
      displayName: display_name,
    };
  } catch {
    return null;
  }
}

// ─── Distance ─────────────────────────────────────────────────────────────────

/**
 * Haversine formula — great-circle distance in kilometres.
 */
export function haversineKm(
  lat1: number, lon1: number,
  lat2: number, lon2: number,
): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
