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
