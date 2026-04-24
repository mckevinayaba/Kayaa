import { useState, useEffect, useCallback } from 'react';

const LS_KEY = 'kayaa_location';
const STALE_MS = 30 * 60 * 1000; // 30 minutes

export interface LocationState {
  suburb: string;
  city: string;
  lat?: number;
  lon?: number;
  detectedAt?: number;
}

export interface UseLocationResult {
  suburb: string;
  city: string;
  lat: number | undefined;
  lon: number | undefined;
  loading: boolean;
  error: boolean;
  setManualSuburb: (suburb: string, city?: string) => void;
  refresh: () => void;
}

function readStorage(): LocationState | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? (JSON.parse(raw) as LocationState) : null;
  } catch {
    return null;
  }
}

function writeStorage(s: LocationState) {
  localStorage.setItem(LS_KEY, JSON.stringify(s));
  // Keep legacy keys in sync so older code paths still work
  localStorage.setItem('kayaa_suburb', s.suburb);
  localStorage.setItem('kayaa_city', s.city);
}

async function detectFromCoords(lat: number, lon: number): Promise<LocationState> {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1`,
    { headers: { 'User-Agent': 'kayaa-app/1.0', 'Accept-Language': 'en' } }
  );
  const data = await res.json();
  const addr = data.address ?? {};
  const suburb =
    addr.suburb ??
    addr.neighbourhood ??
    addr.quarter ??
    addr.city_district ??
    addr.town ??
    addr.city ??
    'Your area';
  const city = addr.city ?? addr.town ?? addr.county ?? suburb;
  return { suburb, city, lat, lon, detectedAt: Date.now() };
}

export default function useLocation(): UseLocationResult {
  const [state, setState] = useState<LocationState>(() => {
    const stored = readStorage();
    if (stored) return stored;
    // Legacy fallback: old code stored city directly
    const legacyCity = localStorage.getItem('kayaa_city') ?? '';
    return { suburb: legacyCity, city: legacyCity };
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const detect = useCallback(() => {
    if (!navigator.geolocation) {
      setError(true);
      return;
    }
    setLoading(true);
    setError(false);
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const loc = await detectFromCoords(coords.latitude, coords.longitude);
          setState(loc);
          writeStorage(loc);
        } catch {
          setError(true);
        } finally {
          setLoading(false);
        }
      },
      () => {
        setLoading(false);
        setError(true);
      },
      { timeout: 8000 }
    );
  }, []);

  useEffect(() => {
    const stored = readStorage();
    if (!stored || !stored.suburb) {
      // No location at all — try to detect
      detect();
      return;
    }
    // Refresh silently if stale
    const age = Date.now() - (stored.detectedAt ?? 0);
    if (age > STALE_MS && stored.lat && stored.lon) {
      detectFromCoords(stored.lat, stored.lon)
        .then(loc => { setState(loc); writeStorage(loc); })
        .catch(() => {/* keep existing */});
    }
  }, [detect]);

  const setManualSuburb = useCallback((suburb: string, city?: string) => {
    const loc: LocationState = { suburb, city: city ?? suburb, detectedAt: Date.now() };
    setState(loc);
    writeStorage(loc);
    setError(false);
  }, []);

  return {
    suburb: state.suburb || '',
    city: state.city || '',
    lat: state.lat,
    lon: state.lon,
    loading,
    error,
    setManualSuburb,
    refresh: detect,
  };
}
