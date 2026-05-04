/**
 * LocationContext — singleton neighbourhood detection for Kayaa.
 *
 * Three-state model:
 *   current   = GPS-detected suburb (auto, refreshed every 30 min)
 *   home      = user's saved base area (explicit, persists forever)
 *   browsing  = manual override (expires after 2 h, cleared on GPS change)
 *
 *   active    = browsing ?? current ?? home ?? empty
 *
 * Move detection:
 *   If new GPS coords are >5 km from stored coords AND suburb differs,
 *   we set `movedTo` and ask the user whether to switch instead of
 *   silently swapping their area underneath them.
 */

import {
  createContext, useContext, useState, useEffect,
  useCallback, useRef, type ReactNode,
} from 'react';
import { haversineKm } from '../lib/geocode';

// ─── Constants ────────────────────────────────────────────────────────────────

const LS_CURRENT  = 'kayaa_location';
const LS_HOME     = 'kayaa_home';
const LS_BROWSE   = 'kayaa_browsing';
const STALE_MS    = 30 * 60 * 1000;   // 30 min before background refresh
const BROWSE_TTL  = 2 * 60 * 60 * 1000; // browsing overlay expires after 2 h
const MOVE_KM     = 5;                // significant-move threshold

// ─── Types ────────────────────────────────────────────────────────────────────

export interface NeighbourhoodInfo {
  suburb: string;
  city: string;
  lat?: number;
  lon?: number;
  savedAt?: number;
  confirmedAt?: number;
  source?: 'gps' | 'manual' | 'home' | 'legacy';
}

export interface LocationContextValue {
  /** The neighbourhood used for ALL queries — browsing ?? current ?? home */
  active:      NeighbourhoodInfo;
  activeLabel: string;   // human-readable: "Tembisa" | "Your area"
  isBrowsing:  boolean;  // user is looking at a different area from their GPS

  /** Individual states */
  current:  NeighbourhoodInfo | null;
  home:     NeighbourhoodInfo | null;
  browsing: NeighbourhoodInfo | null;

  /** Detection status */
  loading: boolean;
  error:   boolean;

  /** First-run gate: user hasn't confirmed their area yet */
  needsConfirmation: boolean;

  /**
   * Move detection: if GPS shows a new area >5 km away.
   * Cleared once user accepts or dismisses.
   */
  movedTo:     NeighbourhoodInfo | null;
  dismissMove: () => void;
  acceptMove:  () => void;

  /** Actions */
  detectNow:      () => void;
  confirm:        () => void;
  setManualSuburb:(suburb: string, city?: string) => void; // ← backward compat
  setBrowsing:    (suburb: string, city?: string) => void;
  clearBrowsing:  () => void;
  setHome:        (suburb: string, city?: string) => void;
  refresh:        () => void; // alias for detectNow

  /** Flat accessors — backward compat for pages that destructure directly */
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
    addr.suburb       ??
    addr.neighbourhood ??
    addr.quarter       ??
    addr.city_district ??
    addr.town          ??
    addr.city          ??
    'Your area';
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
  // ── Read persisted state once ───────────────────────────────────────────
  const [current, setCurrent] = useState<NeighbourhoodInfo | null>(() => {
    const stored = readLS<NeighbourhoodInfo>(LS_CURRENT);
    if (stored?.suburb) return stored;
    // Legacy fallback: pre-context code stored raw strings
    const legacyCity = localStorage.getItem('kayaa_city') ?? '';
    if (legacyCity) return { suburb: legacyCity, city: legacyCity, source: 'legacy' };
    return null;
  });

  const [home, setHomeState] = useState<NeighbourhoodInfo | null>(() =>
    readLS<NeighbourhoodInfo>(LS_HOME),
  );

  const [browsing, setBrowsingState] = useState<NeighbourhoodInfo | null>(() => {
    const b = readLS<NeighbourhoodInfo>(LS_BROWSE);
    // Browsing is session-scoped: expire after BROWSE_TTL
    if (b && b.savedAt && Date.now() - b.savedAt > BROWSE_TTL) {
      localStorage.removeItem(LS_BROWSE);
      return null;
    }
    return b;
  });

  const [confirmed, setConfirmed] = useState<boolean>(() => {
    const stored = readLS<NeighbourhoodInfo>(LS_CURRENT);
    return !!stored?.confirmedAt;
  });

  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(false);
  const [movedTo, setMovedTo] = useState<NeighbourhoodInfo | null>(null);

  // Use a ref for `current` inside the detect callback so we never stale-close
  const currentRef = useRef(current);
  useEffect(() => { currentRef.current = current; }, [current]);
  const confirmedRef = useRef(confirmed);
  useEffect(() => { confirmedRef.current = confirmed; }, [confirmed]);

  // ── Computed active ─────────────────────────────────────────────────────
  const active = browsing ?? current ?? home ?? EMPTY;
  const activeLabel = active.suburb || active.city || 'Your area';
  const isBrowsing =
    !!browsing &&
    !!current &&
    browsing.suburb.toLowerCase() !== current.suburb.toLowerCase();

  // ── GPS detection ───────────────────────────────────────────────────────
  const detect = useCallback(() => {
    if (!navigator.geolocation) { setError(true); return; }
    setLoading(true);
    setError(false);

    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const loc = await reverseGeocode(coords.latitude, coords.longitude);
          const prev = currentRef.current;

          // Move detection: suburb changed AND distance > MOVE_KM
          if (prev?.lat && prev?.lon && prev.suburb && loc.suburb !== prev.suburb) {
            const km = haversineKm(prev.lat, prev.lon, coords.latitude, coords.longitude);
            if (km >= MOVE_KM) {
              setMovedTo(loc);   // prompt user — don't swap automatically
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
      { timeout: 8000, maximumAge: 60_000 },
    );
  }, []); // stable — uses refs for mutable values

  // ── Auto-detect on mount ─────────────────────────────────────────────────
  useEffect(() => {
    if (!current?.suburb) {
      // First visit: detect immediately
      detect();
      return;
    }
    // Background stale-refresh
    const age = Date.now() - (current.savedAt ?? 0);
    if (age > STALE_MS && current.lat && current.lon) {
      reverseGeocode(current.lat, current.lon)
        .then(loc => {
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

  // ── Actions ──────────────────────────────────────────────────────────────

  const confirm = useCallback(() => {
    setConfirmed(true);
    setCurrent(prev => {
      if (!prev) return prev;
      const updated: NeighbourhoodInfo = { ...prev, confirmedAt: Date.now() };
      writeLS(LS_CURRENT, updated);
      return updated;
    });
  }, []);

  /** Backward-compat: sets as the GPS/current area (used in first-run gate). */
  const setManualSuburb = useCallback((suburb: string, city?: string) => {
    const loc: NeighbourhoodInfo = {
      suburb,
      city: city ?? suburb,
      savedAt: Date.now(),
      confirmedAt: Date.now(),
      source: 'manual',
    };
    setCurrent(loc);
    setConfirmed(true);
    setError(false);
    writeLS(LS_CURRENT, loc);
    syncLegacy(loc);
    // Clear browsing when user explicitly sets a new area
    setBrowsingState(null);
    localStorage.removeItem(LS_BROWSE);
  }, []);

  /** Browse a different area without changing the GPS/home state. */
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
      savedAt: Date.now(),
      source: 'home',
    };
    setHomeState(loc);
    writeLS(LS_HOME, loc);
  }, []);

  const dismissMove = useCallback(() => setMovedTo(null), []);

  const acceptMove = useCallback(() => {
    if (!movedTo) return;
    const toWrite: NeighbourhoodInfo = { ...movedTo, confirmedAt: Date.now() };
    setCurrent(toWrite);
    setConfirmed(true);
    writeLS(LS_CURRENT, toWrite);
    syncLegacy(movedTo);
    // Clear browsing (new location is now active)
    setBrowsingState(null);
    localStorage.removeItem(LS_BROWSE);
    setMovedTo(null);
  }, [movedTo]);

  // ── Context value ────────────────────────────────────────────────────────
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

    // Flat compat: always reflects the active neighbourhood
    suburb: active.suburb,
    city:   active.city,
    lat:    active.lat,
    lon:    active.lon,
  };

  return <LocationCtx.Provider value={value}>{children}</LocationCtx.Provider>;
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

/** Full context — use when you need the three-state model or move detection. */
export function useLocationContext(): LocationContextValue {
  const ctx = useContext(LocationCtx);
  if (!ctx) throw new Error('useLocationContext must be used inside <LocationProvider>');
  return ctx;
}
