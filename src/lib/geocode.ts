export interface GeocodedLocation {
  lat: number;
  lng: number;
  displayName?: string;
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
