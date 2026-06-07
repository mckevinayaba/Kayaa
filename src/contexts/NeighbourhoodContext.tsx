/**
 * NeighbourhoodContext — GPS-first neighbourhood detection for Kayaa.
 *
 * PRIORITY ORDER for displaySuburb / displayLabel:
 *   1. manualOverride       — user explicitly chose an area (persisted to localStorage)
 *   2. currentSuburb        — GPS-detected this session (any confidence)
 *   3. lastConfirmedSuburb  — last high/medium-confidence GPS result (localStorage cache)
 *   4. ''                   — while detecting or all sources empty
 *
 * PERSISTENCE:
 *   - Manual override is saved to localStorage (kayaa_area_override) so it
 *     survives page reloads. Cleared when user taps "Use GPS".
 *   - Last confirmed (high/medium GPS) saved to kayaa_last_confirmed for fallback.
 *   - Raw GPS coordinates are NEVER written to localStorage — always fresh.
 *
 * DISPLAY FORMAT:
 *   displayLabel = "Suburb, City" when suburb ≠ city, else "Suburb"
 *   Example: "Hillbrow, Johannesburg" / "Soweto" / "Khayelitsha, Cape Town"
 */

import {
  createContext, useContext, useState, useEffect,
  useCallback, type ReactNode,
} from 'react';
import { reverseGeocodeCoords } from '../lib/geocode';

// ─── LocalStorage helpers ─────────────────────────────────────────────────────

const LS_OVERRIDE      = 'kayaa_area_override';     // { suburb, city }
const LS_LAST_CONFIRMED = 'kayaa_last_confirmed';    // { suburb, city }

function readLS<T>(key: string): T | null {
  try { return JSON.parse(localStorage.getItem(key) ?? 'null') as T; }
  catch { return null; }
}
function writeLS(key: string, value: unknown): void {
  try { localStorage.setItem(key, JSON.stringify(value)); }
  catch { /* storage full — non-fatal */ }
}
function clearLS(key: string): void {
  try { localStorage.removeItem(key); }
  catch { /* non-fatal */ }
}

// ─── Label builder ────────────────────────────────────────────────────────────

/**
 * Build the human-readable area label.
 * "Hillbrow, Johannesburg" | "Soweto" | "Khayelitsha, Cape Town"
 * Returns '' when no area is known.
 */
export function buildAreaLabel(suburb: string, city: string): string {
  if (!suburb && !city) return '';
  if (!suburb) return city;
  if (!city || city.toLowerCase() === suburb.toLowerCase()) return suburb;
  return `${suburb}, ${city}`;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type DetectionError =
  | 'denied'           // user blocked GPS permission
  | 'timeout'          // GPS took too long
  | 'unavailable'      // device has no GPS
  | 'geocoding-failed' // GPS succeeded but reverse geocode failed
  | 'suburb-not-found' // GPS + geocode succeeded but no suburb resolved
  | null;

export interface NeighbourhoodContextValue {
  // ── GPS-detected (fresh every open) ──────────────────────────────────────
  currentSuburb: string;
  currentCity:   string;
  currentLat:    number | null;
  currentLon:    number | null;

  // ── Detection state ───────────────────────────────────────────────────────
  isDetecting:    boolean;
  detectionError: DetectionError;

  // ── Manual override ───────────────────────────────────────────────────────
  manualOverride: string | null;
  manualCity:     string | null;
  setManualOverride:   (suburb: string, city?: string) => void;
  clearManualOverride: () => void;

  // ── Last confirmed (fallback when GPS this session produced nothing) ──────
  lastConfirmedSuburb: string;
  lastConfirmedCity:   string;

  // ── Derived display values (what to actually show in UI) ──────────────────
  displaySuburb: string;
  displayCity:   string;
  displayLat:    number | null;
  displayLon:    number | null;
  /** Pre-formatted "Suburb, City" label (or just "Suburb" / "City" when identical) */
  displayLabel:  string;

  // ── Actions ───────────────────────────────────────────────────────────────
  refetchLocation: () => void;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const NeighbourhoodCtx = createContext<NeighbourhoodContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function NeighbourhoodProvider({ children }: { children: ReactNode }) {
  // GPS-detected values — in-memory, refreshed every session
  const [currentSuburb, setCurrentSuburb] = useState('');
  const [currentCity,   setCurrentCity]   = useState('');
  const [currentLat,    setCurrentLat]    = useState<number | null>(null);
  const [currentLon,    setCurrentLon]    = useState<number | null>(null);

  // Detection state
  const [isDetecting,    setIsDetecting]    = useState(true);
  const [detectionError, setDetectionError] = useState<DetectionError>(null);

  // Manual override — seeded from localStorage on mount
  const [manualOverride, setManualOverrideState] = useState<string | null>(() => {
    return readLS<{ suburb: string; city: string }>(LS_OVERRIDE)?.suburb ?? null;
  });
  const [manualCity, setManualCityState] = useState<string | null>(() => {
    const saved = readLS<{ suburb: string; city: string }>(LS_OVERRIDE);
    return saved?.city ?? null;
  });

  // Last confirmed — seeded from localStorage for fallback
  const [lastConfirmedSuburb, setLastConfirmedSuburb] = useState<string>(() => {
    return readLS<{ suburb: string; city: string }>(LS_LAST_CONFIRMED)?.suburb ?? '';
  });
  const [lastConfirmedCity, setLastConfirmedCity] = useState<string>(() => {
    return readLS<{ suburb: string; city: string }>(LS_LAST_CONFIRMED)?.city ?? '';
  });

  // ── GPS detection ─────────────────────────────────────────────────────────

  const detect = useCallback(() => {
    if (!navigator.geolocation) {
      setIsDetecting(false);
      setDetectionError('unavailable');
      return;
    }

    setIsDetecting(true);
    setDetectionError(null);

    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const result = await reverseGeocodeCoords(
            coords.latitude,
            coords.longitude,
            coords.accuracy,
          );

          // Always save the raw lat/lon
          setCurrentLat(coords.latitude);
          setCurrentLon(coords.longitude);

          if (result?.suburb) {
            setCurrentSuburb(result.suburb);
            setCurrentCity(result.city || result.suburb);
            setDetectionError(null);

            // Persist high/medium confidence results as the new last-confirmed
            if (result.confidence !== 'low') {
              const confirmed = { suburb: result.suburb, city: result.city };
              setLastConfirmedSuburb(result.suburb);
              setLastConfirmedCity(result.city);
              writeLS(LS_LAST_CONFIRMED, confirmed);
            }
          } else {
            // GPS succeeded but geocoder could not resolve a suburb
            setCurrentSuburb('');
            setCurrentCity(result?.city || '');
            setDetectionError('suburb-not-found');
          }
        } catch {
          setDetectionError('geocoding-failed');
        } finally {
          setIsDetecting(false);
        }
      },
      (err) => {
        setIsDetecting(false);
        if (err.code === 1 /* PERMISSION_DENIED */) {
          setDetectionError('denied');
        } else if (err.code === 3 /* TIMEOUT */) {
          setDetectionError('timeout');
        } else {
          setDetectionError('unavailable');
        }
      },
      {
        maximumAge:          0,       // always fresh GPS — never cached coords
        timeout:             12_000,
        enableHighAccuracy:  true,
      },
    );
  }, []);

  // Fire GPS on every app open
  useEffect(() => { detect(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Manual override actions ───────────────────────────────────────────────

  const setManualOverride = useCallback((suburb: string, city?: string) => {
    const resolvedCity = city || suburb || '';
    setManualOverrideState(suburb || null);
    setManualCityState(resolvedCity || null);
    if (suburb) {
      writeLS(LS_OVERRIDE, { suburb, city: resolvedCity });
    } else {
      clearLS(LS_OVERRIDE);
    }
  }, []);

  const clearManualOverride = useCallback(() => {
    setManualOverrideState(null);
    setManualCityState(null);
    clearLS(LS_OVERRIDE);
  }, []);

  // ── Derived display values ────────────────────────────────────────────────
  //
  // Priority:
  //   1. Manual override   (user explicit, persisted)
  //   2. GPS this session  (currentSuburb from reverseGeocode)
  //   3. Last confirmed    (stored from a previous reliable GPS read)
  //   4. ''               (show "Set your area" in UI)

  const displaySuburb =
    manualOverride    ??
    (currentSuburb || null) ??
    lastConfirmedSuburb     ??
    '';

  const displayCity =
    manualCity      ??
    (currentCity || null)   ??
    lastConfirmedCity       ??
    '';

  const displayLat = currentLat;
  const displayLon = currentLon;

  const displayLabel = buildAreaLabel(displaySuburb, displayCity);

  // ── Context value ─────────────────────────────────────────────────────────

  const value: NeighbourhoodContextValue = {
    currentSuburb, currentCity, currentLat, currentLon,
    isDetecting, detectionError,
    manualOverride, manualCity,
    setManualOverride, clearManualOverride,
    lastConfirmedSuburb, lastConfirmedCity,
    displaySuburb, displayCity, displayLat, displayLon, displayLabel,
    refetchLocation: detect,
  };

  return (
    <NeighbourhoodCtx.Provider value={value}>
      {children}
    </NeighbourhoodCtx.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useNeighbourhood(): NeighbourhoodContextValue {
  const ctx = useContext(NeighbourhoodCtx);
  if (!ctx) throw new Error('useNeighbourhood must be used within <NeighbourhoodProvider>');
  return ctx;
}
