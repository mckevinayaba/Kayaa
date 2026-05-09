// ─── Bounding-box suburb lookup ───────────────────────────────────────────────
//
// Called BEFORE Nominatim to short-circuit the API call for known suburbs.
// Precise bounding boxes fix boundary bugs (e.g. Rosebank vs Parktown North
// which are separated only by Jan Smuts Avenue).
// If the user's GPS falls inside a box → use that name immediately.
// If no match → fall through to Nominatim as before.

interface SuburbBounds {
  name:   string;
  minLat: number; maxLat: number;
  minLon: number; maxLon: number;
}

const SUBURB_BOUNDS: SuburbBounds[] = [
  // Johannesburg — north
  { name: 'Rosebank',        minLat: -26.1520, maxLat: -26.1380, minLon: 28.0380, maxLon: 28.0500 },
  { name: 'Parktown North',  minLat: -26.1420, maxLat: -26.1300, minLon: 28.0280, maxLon: 28.0420 },
  { name: 'Sandton',         minLat: -26.1200, maxLat: -26.0900, minLon: 28.0450, maxLon: 28.0750 },
  { name: 'Bryanston',       minLat: -26.0850, maxLat: -26.0600, minLon: 28.0100, maxLon: 28.0450 },
  { name: 'Randburg',        minLat: -26.1050, maxLat: -26.0700, minLon: 27.9800, maxLon: 28.0200 },
  { name: 'Honeydew',        minLat: -26.0900, maxLat: -26.0500, minLon: 27.9400, maxLon: 27.9900 },
  { name: 'Alexandra',       minLat: -26.1100, maxLat: -26.0900, minLon: 28.0950, maxLon: 28.1200 },
  { name: 'Tembisa',         minLat: -26.0200, maxLat: -25.9700, minLon: 28.1900, maxLon: 28.2500 },
  // Johannesburg — south
  { name: 'Soweto',          minLat: -26.3200, maxLat: -26.2000, minLon: 27.8200, maxLon: 27.9800 },
  { name: 'Orlando West',    minLat: -26.2600, maxLat: -26.2300, minLon: 27.8900, maxLon: 27.9200 },
  // Cape Town
  { name: 'Khayelitsha',     minLat: -34.0400, maxLat: -33.9700, minLon: 18.6300, maxLon: 18.7200 },
  { name: 'Mitchells Plain', minLat: -34.0600, maxLat: -34.0000, minLon: 18.6000, maxLon: 18.6800 },
];

/**
 * Check known bounding boxes FIRST before calling Nominatim.
 * Returns a suburb name when the GPS point falls inside a known box,
 * or null to indicate "no match — fall through to API".
 */
export function detectSuburbFromBounds(lat: number, lon: number): string | null {
  for (const s of SUBURB_BOUNDS) {
    if (lat >= s.minLat && lat <= s.maxLat && lon >= s.minLon && lon <= s.maxLon) {
      return s.name;
    }
  }
  return null;
}

export interface GeocodedLocation {
  lat: number;
  lng: number;
  displayName?: string;
}

// ─── Reverse geocode result ───────────────────────────────────────────────────

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
 * Reverse geocode GPS coordinates to a suburb name via Nominatim (OSM).
 * Free, no API key. Rate-limited to ~1 req/s — use sparingly.
 * Returns null on network failure or when no suburb can be resolved.
 */
export async function reverseGeocodeCoords(
  lat: number,
  lon: number,
  accuracyMetres?: number,
): Promise<ReverseGeocodeResult | null> {
  // ── Step 1: try precise bounding-box lookup (instant, no API call) ────────
  const boxSuburb = detectSuburbFromBounds(lat, lon);
  if (boxSuburb) {
    const confidence: ReverseGeocodeResult['confidence'] =
      accuracyMetres == null   ? 'high'
      : accuracyMetres <= 100  ? 'high'
      : accuracyMetres <= 1000 ? 'medium'
      : 'low';
    // Still need a city — fetch from Nominatim but use our suburb name
    try {
      const cityRes = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1&zoom=10`,
        { headers: { 'User-Agent': 'kayaa-app/1.0', 'Accept-Language': 'en' } },
      );
      if (cityRes.ok) {
        const cityData = await cityRes.json();
        const addr: Record<string, string> = cityData.address ?? {};
        const city = addr.city ?? addr.town ?? addr.county ?? boxSuburb;
        return { suburb: boxSuburb, city, lat, lon, confidence, raw: addr };
      }
    } catch { /* ignore — use suburb as city fallback */ }
    return { suburb: boxSuburb, city: boxSuburb, lat, lon, confidence, raw: {} };
  }

  // ── Step 2: Nominatim fallback (no bounding-box match) ───────────────────
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1`,
      { headers: { 'User-Agent': 'kayaa-app/1.0', 'Accept-Language': 'en' } },
    );
    if (!res.ok) return null;

    const data = await res.json();
    const addr: Record<string, string> = data.address ?? {};

    // Prefer the most specific address component available
    const suburb =
      addr.suburb        ??
      addr.neighbourhood ??
      addr.quarter       ??
      addr.city_district ??
      addr.town          ??
      addr.city          ??
      '';

    if (!suburb) return null;

    const city = addr.city ?? addr.town ?? addr.county ?? suburb;

    const confidence: ReverseGeocodeResult['confidence'] =
      accuracyMetres == null  ? 'high'
      : accuracyMetres <= 100  ? 'high'
      : accuracyMetres <= 1000 ? 'medium'
      : 'low';

    return { suburb, city, lat, lon, confidence, raw: addr };
  } catch {
    return null;
  }
}

/**
 * Nominatim (OpenStreetMap) reverse geocoder.
 * Free, no API key. Rate-limited to 1 req/s.
 * SA-scoped via countrycodes=za for accuracy.
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
