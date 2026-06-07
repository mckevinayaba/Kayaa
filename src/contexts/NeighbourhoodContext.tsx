/**
 * NeighbourhoodContext — GPS-first neighbourhood detection for Kayaa.
 *
 * PRIORITY ORDER for displaySuburb / displayLabel:
 *   1. manualOverride       — user explicitly chose an area (persisted to localStorage)
 *   2. currentSuburb        — suburb-level GPS result this session (resolution != 'city')
 *   3. lastConfirmedSuburb  — last suburb-level result (localStorage cache)
 *   4. ''                   — while detecting or all sources empty
 *
 * ANTI-DOWNGRADE RULE (enforced here):
 *   A weaker location result must never overwrite a stronger confirmed suburb.
 *   Specifically:
 *   - City-only results (resolution = 'city') never set currentSuburb.
 *     Display falls through to lastConfirmedSuburb, preserving the better value.
 *   - lastConfirmedSuburb is only updated from suburb-level or bounds results.
 *   - A low-confidence suburb result does not update lastConfirmed unless it is
 *     a bounding-box match (bounds geometry beats accuracy number).
 *
 * PERSISTENCE:
 *   - Manual override saved to kayaa_area_override  ({ suburb, city })
 *   - Last confirmed saved to kayaa_last_confirmed  ({ suburb, city, confidence, resolution, updatedAt })
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
import { reverseGeocodeCoords, clearBadLocationCache } from '../lib/geocode';

// ─── LocalStorage helpers ─────────────────────────────────────────────────────

const LS_OVERRIDE       = 'kayaa_area_override';    // { suburb, city }
const LS_LAST_CONFIRMED = 'kayaa_last_confirmed';   // LastConfirmed

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

// ─── LastConfirmed schema ─────────────────────────────────────────────────────
//
// Stored in kayaa_last_confirmed. Richer than the old { suburb, city } format —
// includes confidence + resolution so we can make better anti-downgrade decisions.
// Backwards compatible: old format fields (suburb, city) are preserved.

interface LastConfirmed {
  suburb:     string;
  city:       string;
  confidence: 'high' | 'medium' | 'low';
  resolution: 'bounds' | 'suburb' | 'city';
  updatedAt:  string;   // ISO timestamp
}

// ─── Label builder ────────────────────────────────────────────────────────────

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
  | 'geocoding-failed' // GPS succeeded but reverse geocode failed entirely
  | 'suburb-not-found' // GPS + geocode succeeded but no suburb resolved anywhere
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

  // ── Location precision & confidence ───────────────────────────────────────
  /**
   * Confidence of the current GPS session result.
   * null = not yet detected this session (still loading or no GPS attempt).
   */
  locationConfidence: 'high' | 'medium' | 'low' | null;
  /**
   * Resolution of the current GPS session result.
   * null = not yet detected. 'city' = only city-level, no suburb resolved.
   */
  locationResolution: 'bounds' | 'suburb' | 'city' | null;
  /**
   * True when displaySuburb is a real suburb name, not just the city name.
   * "Berea" (suburb) vs "Johannesburg" (city) → true.
   * "Soweto" vs "Soweto" → false (same name, still a valid area label).
   */
  isSuburbLevel: boolean;
  /**
   * True when no suburb could be resolved and no manual override is set.
   * The app should surface an easy path to set the suburb manually.
   * Typically happens on desktop where GPS only resolves the city.
   */
  isWeakLocation: boolean;

  // ── Actions ───────────────────────────────────────────────────────────────
  refetchLocation: () => void;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const NeighbourhoodCtx = createContext<NeighbourhoodContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function NeighbourhoodProvider({ children }: { children: ReactNode }) {
  // Clear any stale municipality names from cache BEFORE reading stored values.
  // This runs once per provider mount (once per app open) and is a no-op when clean.
  clearBadLocationCache();

  // ── GPS-detected values — in-memory, refreshed every session ─────────────
  const [currentSuburb, setCurrentSuburb] = useState('');
  const [currentCity,   setCurrentCity]   = useState('');
  const [currentLat,    setCurrentLat]    = useState<number | null>(null);
  const [currentLon,    setCurrentLon]    = useState<number | null>(null);

  // ── Location precision metadata ───────────────────────────────────────────
  const [currentConfidence, setCurrentConfidence] = useState<'high' | 'medium' | 'low' | null>(null);
  const [currentResolution, setCurrentResolution] = useState<'bounds' | 'suburb' | 'city' | null>(null);

  // ── Detection state ───────────────────────────────────────────────────────
  const [isDetecting,    setIsDetecting]    = useState(true);
  const [detectionError, setDetectionError] = useState<DetectionError>(null);

  // ── Manual override — seeded from localStorage on mount ──────────────────
  const [manualOverride, setManualOverrideState] = useState<string | null>(() => {
    return readLS<{ suburb: string; city: string }>(LS_OVERRIDE)?.suburb ?? null;
  });
  const [manualCity, setManualCityState] = useState<string | null>(() => {
    const saved = readLS<{ suburb: string; city: string }>(LS_OVERRIDE);
    return saved?.city ?? null;
  });

  // ── Last confirmed — seeded from localStorage (supports old + new schema) ─
  const [lastConfirmedSuburb, setLastConfirmedSuburb] = useState<string>(() => {
    return readLS<Partial<LastConfirmed>>(LS_LAST_CONFIRMED)?.suburb ?? '';
  });
  const [lastConfirmedCity, setLastConfirmedCity] = useState<string>(() => {
    return readLS<Partial<LastConfirmed>>(LS_LAST_CONFIRMED)?.city ?? '';
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

          // Always save raw coordinates (used for distance calculations, map pin)
          setCurrentLat(coords.latitude);
          setCurrentLon(coords.longitude);

          if (!result) {
            setCurrentSuburb('');
            setCurrentCity('');
            setCurrentConfidence(null);
            setCurrentResolution(null);
            setDetectionError('geocoding-failed');
            return;
          }

          setCurrentConfidence(result.confidence);
          setCurrentResolution(result.resolution);

          if (result.resolution !== 'city' && result.suburb) {
            // ── Suburb-level result (bounding box or real BDC suburb) ────────
            // This is a trustworthy suburb — set currentSuburb.
            setCurrentSuburb(result.suburb);
            setCurrentCity(result.city);
            setDetectionError(null);

            // Anti-downgrade: decide whether this result is good enough to
            // update lastConfirmedSuburb (which is the cross-session fallback).
            //
            // Rules:
            //   bounds  → always update (geometry is reliable regardless of accuracy number)
            //   suburb  → update only if confidence is high or medium (low = too coarse)
            //   city    → never update (caught by the `resolution !== 'city'` guard above)
            const shouldUpdateLastConfirmed =
              result.resolution === 'bounds' ||
              (result.resolution === 'suburb' && result.confidence !== 'low');

            if (shouldUpdateLastConfirmed) {
              const confirmed: LastConfirmed = {
                suburb:     result.suburb,
                city:       result.city,
                confidence: result.confidence,
                resolution: result.resolution,
                updatedAt:  new Date().toISOString(),
              };
              writeLS(LS_LAST_CONFIRMED, confirmed);
              setLastConfirmedSuburb(result.suburb);
              setLastConfirmedCity(result.city);
            }

            if (import.meta.env.DEV) {
              const isMobile =
                navigator.maxTouchPoints > 0 || /Mobi|Android/i.test(navigator.userAgent);
              console.group('%c[Kayaa Location ✓ suburb]', 'color:#39D98A;font-weight:bold');
              console.table({
                device:              isMobile ? 'mobile' : 'desktop',
                accuracy:            `${Math.round(coords.accuracy)}m`,
                resolution:          result.resolution,
                confidence:          result.confidence,
                suburb:              result.suburb,
                city:                result.city,
                updatedLastConfirmed: shouldUpdateLastConfirmed,
                overwriteBlocked:    false,
              });
              console.groupEnd();
            }
          } else {
            // ── City-only result ─────────────────────────────────────────────
            // BDC could not resolve a suburb for these coordinates.
            // This is the primary cause of desktop showing "Johannesburg" instead
            // of "Berea" — because the GPS coords are too coarse for BDC to
            // return suburb-level data.
            //
            // CRITICAL: do NOT set currentSuburb here. Leave it as '' so the
            // display derivation falls through to lastConfirmedSuburb, which
            // may contain a better suburb from a previous mobile GPS session.
            setCurrentSuburb('');   // intentionally empty — no suburb downgrade
            setCurrentCity(result.city);
            setDetectionError(null);

            if (import.meta.env.DEV) {
              const isMobile =
                navigator.maxTouchPoints > 0 || /Mobi|Android/i.test(navigator.userAgent);
              console.group('%c[Kayaa Location ⚠ city-only]', 'color:#F59E0B;font-weight:bold');
              console.table({
                device:          isMobile ? 'mobile' : 'desktop',
                accuracy:        `${Math.round(coords.accuracy)}m`,
                resolution:      result.resolution,
                confidence:      result.confidence,
                suburbCandidate: '(none — city-only result from BDC)',
                city:            result.city,
                overwriteBlocked: true,
                reason:          'City-only result; currentSuburb left empty so display falls back to lastConfirmedSuburb',
              });
              console.groupEnd();
            }
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

          if (import.meta.env.DEV) {
            const isMobile =
              navigator.maxTouchPoints > 0 || /Mobi|Android/i.test(navigator.userAgent);
            console.group('%c[Kayaa Location ✗ permission denied]', 'color:#F87171;font-weight:bold');
            console.log({ device: isMobile ? 'mobile' : 'desktop' });
            console.groupEnd();
          }
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
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
  //   1. Manual override   — user explicit, persisted
  //   2. currentSuburb     — suburb-level GPS this session (city-only results leave this as '')
  //   3. lastConfirmedSuburb — stored from a previous session with suburb resolution
  //   4. ''               — show "Set your neighbourhood" in UI
  //
  // When desktop produces a city-only result:
  //   currentSuburb = '' → falls through to lastConfirmedSuburb = 'Berea' ✓
  // When no lastConfirmed exists:
  //   displaySuburb = '' → isWeakLocation = true → chip shows "{city} · Set suburb"

  const displaySuburb =
    manualOverride          ??
    (currentSuburb || null) ??   // '' is falsy — city-only results fall through
    lastConfirmedSuburb          ??
    '';

  const displayCity =
    manualCity              ??
    (currentCity || null)   ??
    lastConfirmedCity       ??
    '';

  const displayLat = currentLat;
  const displayLon = currentLon;

  const displayLabel = buildAreaLabel(displaySuburb, displayCity);

  // True when displaySuburb is a genuine suburb (not equal to the city name)
  const isSuburbLevel = !!(
    displaySuburb &&
    displaySuburb.toLowerCase() !== displayCity.toLowerCase()
  );

  // True when we have no usable suburb at all and no manual override.
  // Typically happens on desktop where GPS only resolves city-level.
  const isWeakLocation = !manualOverride && !displaySuburb;

  // ── Context value ─────────────────────────────────────────────────────────

  const value: NeighbourhoodContextValue = {
    currentSuburb, currentCity, currentLat, currentLon,
    isDetecting, detectionError,
    manualOverride, manualCity,
    setManualOverride, clearManualOverride,
    lastConfirmedSuburb, lastConfirmedCity,
    displaySuburb, displayCity, displayLat, displayLon, displayLabel,
    locationConfidence: currentConfidence,
    locationResolution: currentResolution,
    isSuburbLevel,
    isWeakLocation,
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
