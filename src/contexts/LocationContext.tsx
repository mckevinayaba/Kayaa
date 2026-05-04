/**
 * LocationContext — singleton neighbourhood detection for Kayaa.
 *
 * Source-of-truth priority (highest → lowest):
 *   1. Supabase profiles.home_suburb  (authenticated user, cross-device)
 *   2. GPS detection                  (high-accuracy only, ≤ 5 km radius)
 *   3. Manual picker                  (user explicitly chose)
 *   4. "Set your area"                (neutral fallback — never a hardcoded suburb)
 *
 * Three-state model:
 *   current   = GPS-detected suburb (auto, refreshed every 30 min)
 *   home      = user's saved base area (explicit, persists forever)
 *   browsing  = manual override (expires after 2 h, cleared on GPS change)
 *   active    = browsing ?? current ?? home ?? empty
 *
 * Move detection:
 *   If new GPS coords are >5 km from stored coords AND suburb differs,
 *   we set `movedTo` and ask the user whether to switch.
 *
 * Desktop / IP-geolocation defence:
 *   If coords.accuracy > GPS_ACCURACY_MAX (5 km), the reading is IP-based
 *   and unreliable at suburb level. We reject it and set error=true so the
 *   manual picker is shown instead of a wrong suburb like Honeydew.
 */

import {
  createContext, useContext, useState, useEffect,
  useCallback, useRef, type ReactNode,
} from 'react';
import { haversineKm } from '../lib/geocode';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

// ─── Constants ────────────────────────────────────────────────────────────────

const LS_CURRENT  = 'kayaa_location';
const LS_HOME     = 'kayaa_home';
const LS_BROWSE   = 'kayaa_browsing';
const STALE_MS    = 30 * 60 * 1000;       // 30 min before background refresh
const BROWSE_TTL  = 2 * 60 * 60 * 1000;  // browsing overlay expires after 2 h
const MOVE_KM     = 5;                    // significant-move threshold

/**
 * GPS accuracy gate: readings worse than this are IP/cell-tower based
 * and are NOT suburb-accurate. 5000 m = 5 km.
 * A real phone GPS is typically 5–50 m; WiFi ~100 m; cell ~1000 m.
 */
const GPS_ACCURACY_MAX = 5000;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface NeighbourhoodInfo {
  suburb: string;
  city: string;
  lat?: number;
  lon?: number;
  savedAt?: number;
  confirmedAt?: number;
  source?: 'gps' | 'manual' | 'home' | 'legacy' | 'profile';
}

export interface LocationContextValue {
  /** The neighbourhood used for ALL queries — browsing ?? current ?? home */
  active:      NeighbourhoodInfo;
  activeLabel: string;
  isBrowsing:  boolean;

  current:  NeighbourhoodInfo | null;
  home:     NeighbourhoodInfo | null;
  browsing: NeighbourhoodInfo | null;

  loading: boolean;
  error:   boolean;

  /** First-run gate: user hasn't confirmed their area yet */
  needsConfirmation: boolean;

  movedTo:     NeighbourhoodInfo | null;
  dismissMove: () => void;
  acceptMove:  () => void;

  detectNow:       () => void;
  confirm:         () => void;
  setManualSuburb: (suburb: string, city?: string) => void;
  setBrowsing:     (suburb: string, city?: string) => void;
  clearBrowsing:   () => void;
  setHome:         (suburb: string, city?: string) => void;
  refresh:         () => void;

  /** Flat accessors — backward compat */
  suburb: string;
  city:   string;
  lat:    number | undefined;
  lon:    number | undefined;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const EMPTY: NeighbourhoodInfo = { suburb: '', city: '', source: 'legacy' };

function readLS<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch { return null; }
}

function writeLS(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* quota */ }
}

/** Reverse-geocode via Nominatim (OSM). */
async function reverseGeocode(lat: number, lon: number): Promise<NeighbourhoodInfo> {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1`,
    { headers: { 'User-Agent': 'kayaa-app/1.0', 'Accept-Language': 'en' } },
  );
  const data = await res.json();
  const addr = data.address ?? {};
  const suburb =
    addr.suburb        ??
    addr.neighbourhood ??
    addr.quarter       ??
    addr.city_district ??
    addr.town          ??
    addr.city          ??
    '';
  const city = addr.city ?? addr.town ?? addr.county ?? suburb;
  return { suburb, city, lat, lon, savedAt: Date.now(), source: 'gps' };
}

/** Sync legacy keys so old code paths still work. */
function syncLegacy(loc: NeighbourhoodInfo) {
  localStorage.setItem('kayaa_suburb', loc.suburb);
  localStorage.setItem('kayaa_city', loc.city);
}

// ─── Context ──────────────────────────────────────────────────────────────────

const LocationCtx = createContext<LocationContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function LocationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  // ── Read persisted state once ─────────────────────────────────────────────
  const [current, setCurrent] = useState<NeighbourhoodInfo | null>(() => {
    const stored = readLS<NeighbourhoodInfo>(LS_CURRENT);
    if (stored?.suburb) return stored;
    return null;
    // NOTE: No legacy fallback here on purpose.
    // Legacy kayaa_city/kayaa_suburb may have been set by IP-based geocoding
    // (Honeydew / Randburg). We no longer trust them silently.
  });

  const [home, setHomeState] = useState<NeighbourhoodInfo | null>(() =>
    readLS<NeighbourhoodInfo>(LS_HOME),
  );

  const [browsing, setBrowsingState] = useState<NeighbourhoodInfo | null>(() => {
    const b = readLS<NeighbourhoodInfo>(LS_BROWSE);
    if (b && b.savedAt && Date.now() - b.savedAt > BROWSE_TTL) {
      localStorage.removeItem(LS_BROWSE);
      return null;
    }
    return b;
  });

  const [confirmed, setConfirmed] = useState<boolean>(() => {
    const stored = readLS<NeighbourhoodInfo>(LS_CURRENT);
    // Only treat as confirmed if it was explicitly confirmed (not auto-detected from IP)
    if (stored?.confirmedAt && stored?.suburb) return true;
    return false;
  });

  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(false);
  const [movedTo, setMovedTo] = useState<NeighbourhoodInfo | null>(null);

  const currentRef   = useRef(current);
  const confirmedRef = useRef(confirmed);
  useEffect(() => { currentRef.current   = current;   }, [current]);
  useEffect(() => { confirmedRef.current = confirmed; }, [confirmed]);

  // ── Supabase helpers ──────────────────────────────────────────────────────

  /** Save a confirmed location to the user's Supabase profile. */
  async function persistToProfile(loc: NeighbourhoodInfo) {
    if (!user) return;
    try {
      await supabase.from('profiles').upsert({
        id:                    user.id,
        home_suburb:           loc.suburb,
        home_city:             loc.city,
        latitude:              loc.lat  ?? null,
        longitude:             loc.lon  ?? null,
        location_source:       loc.source === 'gps' ? 'gps' : 'manual',
        location_confirmed_at: new Date().toISOString(),
        updated_at:            new Date().toISOString(),
      });
    } catch {
      // Non-fatal — localStorage still works
    }
  }

  // ── Load profile from Supabase on login ───────────────────────────────────
  useEffect(() => {
    if (!user) return;

    async function loadProfile() {
      const { data } = await supabase
        .from('profiles')
        .select('home_suburb, home_city, latitude, longitude, location_source, location_confirmed_at')
        .eq('id', user!.id)
        .single();

      if (data?.home_suburb) {
        const loc: NeighbourhoodInfo = {
          suburb:      data.home_suburb,
          city:        data.home_city ?? data.home_suburb,
          lat:         data.latitude  ?? undefined,
          lon:         data.longitude ?? undefined,
          savedAt:     data.location_confirmed_at
                         ? new Date(data.location_confirmed_at).getTime()
                         : Date.now(),
          confirmedAt: data.location_confirmed_at
                         ? new Date(data.location_confirmed_at).getTime()
                         : Date.now(),
          source: 'profile',
        };
        // Profile always wins — it's the user's intentional home suburb
        setCurrent(loc);
        setConfirmed(true);
        writeLS(LS_CURRENT, loc);
        syncLegacy(loc);
      }
    }

    loadProfile();
  }, [user?.id]); // re-run only when the logged-in user changes

  // ── Computed active ───────────────────────────────────────────────────────
  const active = browsing ?? current ?? home ?? EMPTY;
  const activeLabel = active.suburb || active.city || '';
  const isBrowsing =
    !!browsing &&
    !!current &&
    browsing.suburb.toLowerCase() !== current.suburb.toLowerCase();

  // ── GPS detection ─────────────────────────────────────────────────────────
  const detect = useCallback(() => {
    if (!navigator.geolocation) { setError(true); return; }
    setLoading(true);
    setError(false);

    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          // ── Accuracy gate ─────────────────────────────────────────────────
          // coords.accuracy is in metres. Readings worse than GPS_ACCURACY_MAX
          // are IP-based or cell-tower-based and are NOT suburb-accurate.
          // They cause the "Honeydew / Randburg" problem on desktop browsers.
          if (coords.accuracy > GPS_ACCURACY_MAX) {
            // Don't silently show a wrong suburb — surface the manual picker.
            setLoading(false);
            setError(true);
            return;
          }

          const loc = await reverseGeocode(coords.latitude, coords.longitude);

          // If geocoding couldn't resolve a suburb, surface the picker
          if (!loc.suburb) {
            setLoading(false);
            setError(true);
            return;
          }

          const prev = currentRef.current;

          // Move detection
          if (prev?.lat && prev?.lon && prev.suburb && loc.suburb !== prev.suburb) {
            const km = haversineKm(prev.lat, prev.lon, coords.latitude, coords.longitude);
            if (km >= MOVE_KM) {
              setMovedTo(loc);
              setLoading(false);
              return;
            }
          }

          // Normal update
          const toWrite: NeighbourhoodInfo = confirmedRef.current
            ? { ...loc, confirmedAt: Date.now() }
            : loc;
          setCurrent(toWrite);
          writeLS(LS_CURRENT, toWrite);
          syncLegacy(loc);
        } catch {
          setError(true);
        } finally {
          setLoading(false);
        }
      },
      () => { setLoading(false); setError(true); },
      {
        timeout: 10000,
        maximumAge: 60_000,
        // Request high-accuracy GPS — prevents the browser falling back to
        // IP-based geolocation which gives wrong city-level locations.
        enableHighAccuracy: true,
      },
    );
  }, []);

  // ── Auto-detect on mount ──────────────────────────────────────────────────
  useEffect(() => {
    // If we already have a confirmed location (from Supabase or manual), don't
    // fire GPS immediately — let the profile load effect run first.
    const stored = readLS<NeighbourhoodInfo>(LS_CURRENT);
    if (stored?.confirmedAt && stored?.suburb) return;

    if (!current?.suburb) {
      detect();
      return;
    }
    // Background stale-refresh
    const age = Date.now() - (current.savedAt ?? 0);
    if (age > STALE_MS && current.lat && current.lon) {
      reverseGeocode(current.lat, current.lon)
        .then(loc => {
          if (!loc.suburb) return;
          const prev = currentRef.current;
          if (prev?.lat && prev?.lon && loc.suburb !== prev.suburb) {
            const km = haversineKm(prev.lat, prev.lon, loc.lat!, loc.lon!);
            if (km >= MOVE_KM) { setMovedTo(loc); return; }
          }
          const toWrite: NeighbourhoodInfo = confirmedRef.current
            ? { ...loc, confirmedAt: Date.now() }
            : loc;
          setCurrent(toWrite);
          writeLS(LS_CURRENT, toWrite);
          syncLegacy(loc);
        })
        .catch(() => {/* keep existing */});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally run once on mount

  // ── Actions ───────────────────────────────────────────────────────────────

  const confirm = useCallback(() => {
    setConfirmed(true);
    setCurrent(prev => {
      if (!prev) return prev;
      const updated: NeighbourhoodInfo = { ...prev, confirmedAt: Date.now() };
      writeLS(LS_CURRENT, updated);
      persistToProfile(updated);
      return updated;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const setManualSuburb = useCallback((suburb: string, city?: string) => {
    const loc: NeighbourhoodInfo = {
      suburb,
      city: city ?? suburb,
      savedAt:     Date.now(),
      confirmedAt: Date.now(),
      source: 'manual',
    };
    setCurrent(loc);
    setConfirmed(true);
    setError(false);
    writeLS(LS_CURRENT, loc);
    syncLegacy(loc);
    setBrowsingState(null);
    localStorage.removeItem(LS_BROWSE);
    persistToProfile(loc);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const setBrowsingFn = useCallback((suburb: string, city?: string) => {
    const loc: NeighbourhoodInfo = {
      suburb,
      city: city ?? suburb,
      savedAt: Date.now(),
      source: 'manual',
    };
    setBrowsingState(loc);
    writeLS(LS_BROWSE, loc);
  }, []);

  const clearBrowsing = useCallback(() => {
    setBrowsingState(null);
    localStorage.removeItem(LS_BROWSE);
  }, []);

  const setHome = useCallback((suburb: string, city?: string) => {
    const loc: NeighbourhoodInfo = {
      suburb,
      city: city ?? suburb,
      savedAt:     Date.now(),
      confirmedAt: Date.now(),
      source: 'home',
    };
    setHomeState(loc);
    writeLS(LS_HOME, loc);
    persistToProfile(loc);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const dismissMove = useCallback(() => setMovedTo(null), []);

  const acceptMove = useCallback(() => {
    if (!movedTo) return;
    const toWrite: NeighbourhoodInfo = { ...movedTo, confirmedAt: Date.now() };
    setCurrent(toWrite);
    setConfirmed(true);
    writeLS(LS_CURRENT, toWrite);
    syncLegacy(movedTo);
    setBrowsingState(null);
    localStorage.removeItem(LS_BROWSE);
    setMovedTo(null);
    persistToProfile(toWrite);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [movedTo, user?.id]);

  // ── Context value ─────────────────────────────────────────────────────────
  const value: LocationContextValue = {
    active,
    activeLabel,
    isBrowsing,

    current,
    home,
    browsing,

    loading,
    error,
    needsConfirmation: !confirmed,

    movedTo,
    dismissMove,
    acceptMove,

    detectNow: detect,
    confirm,
    setManualSuburb,
    setBrowsing: setBrowsingFn,
    clearBrowsing,
    setHome,
    refresh: detect,

    suburb: active.suburb,
    city:   active.city,
    lat:    active.lat,
    lon:    active.lon,
  };

  return <LocationCtx.Provider value={value}>{children}</LocationCtx.Provider>;
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useLocationContext(): LocationContextValue {
  const ctx = useContext(LocationCtx);
  if (!ctx) throw new Error('useLocationContext must be used inside <LocationProvider>');
  return ctx;
}
