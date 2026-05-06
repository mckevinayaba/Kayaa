/**
 * NeighbourhoodContext — GPS-first neighbourhood detection for Kayaa.
 *
 * RULES (non-negotiable):
 *  - ALWAYS fires GPS on every app open (maximumAge: 0 = never use cached GPS)
 *  - NEVER reads from localStorage to seed the displayed suburb
 *  - NEVER writes detected suburb to localStorage
 *  - manualOverride wins over GPS (user explicitly typed a suburb)
 *  - Absolute fallback: city = "Johannesburg" (never a specific suburb)
 *
 * Priority order for displaySuburb:
 *   1. manualOverride        — user typed it explicitly
 *   2. GPS-detected suburb   — fresh, from this session
 *   3. ''                    — while detecting or on GPS failure
 *
 * Priority order for displayCity:
 *   1. manualCity (from manual override)
 *   2. GPS-detected city
 *   3. 'Johannesburg'        — absolute last resort
 */

import {
  createContext, useContext, useState, useEffect,
  useCallback, type ReactNode,
} from 'react';
import { reverseGeocodeCoords } from '../lib/geocode';

// ─── Types ────────────────────────────────────────────────────────────────────

export type DetectionError =
  | 'denied'           // user blocked GPS permission
  | 'timeout'          // GPS took too long
  | 'unavailable'      // device has no GPS
  | 'geocoding-failed' // GPS succeeded but Nominatim failed
  | 'suburb-not-found' // GPS + Nominatim succeeded but no suburb resolved
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
  manualOverride: string | null;   // suburb the user typed
  manualCity:     string | null;
  setManualOverride:  (suburb: string, city?: string) => void;
  clearManualOverride: () => void;

  // ── Derived display values (what to actually show in UI) ──────────────────
  displaySuburb: string;           // manualOverride || currentSuburb || ''
  displayCity:   string;           // fallback chain ending in 'Johannesburg'
  displayLat:    number | null;    // always from GPS (not from manual)
  displayLon:    number | null;

  // ── Actions ───────────────────────────────────────────────────────────────
  refetchLocation: () => void;     // re-fire GPS (e.g. on sign-in)
}

// ─── Context ──────────────────────────────────────────────────────────────────

const NeighbourhoodCtx = createContext<NeighbourhoodContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function NeighbourhoodProvider({ children }: { children: ReactNode }) {
  // GPS-detected values — in-memory only, never from localStorage
  const [currentSuburb, setCurrentSuburb] = useState('');
  const [currentCity,   setCurrentCity]   = useState('');
  const [currentLat,    setCurrentLat]    = useState<number | null>(null);
  const [currentLon,    setCurrentLon]    = useState<number | null>(null);

  // Detection state — starts detecting immediately on mount
  const [isDetecting,    setIsDetecting]    = useState(true);
  const [detectionError, setDetectionError] = useState<DetectionError>(null);

  // Manual override — user typed a suburb explicitly
  const [manualOverride, setManualOverrideState] = useState<string | null>(null);
  const [manualCity,     setManualCityState]     = useState<string | null>(null);

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

          // Always save the raw lat/lon regardless of suburb resolution
          setCurrentLat(coords.latitude);
          setCurrentLon(coords.longitude);

          if (result?.suburb) {
            setCurrentSuburb(result.suburb);
            setCurrentCity(result.city || result.suburb);
            setDetectionError(null);
          } else {
            // GPS succeeded but Nominatim couldn't resolve a specific suburb
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
        maximumAge: 0,           // NEVER use a cached GPS position — always fresh
        timeout: 12000,
        enableHighAccuracy: true,
      },
    );
  }, []);

  // Fire GPS on every app open — the one rule that must never change
  useEffect(() => {
    detect();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Manual override actions ───────────────────────────────────────────────

  const setManualOverride = useCallback((suburb: string, city?: string) => {
    setManualOverrideState(suburb || null);
    setManualCityState(city || suburb || null);
  }, []);

  const clearManualOverride = useCallback(() => {
    setManualOverrideState(null);
    setManualCityState(null);
  }, []);

  // ── Derived values ────────────────────────────────────────────────────────

  // What to show in the UI — manual wins over GPS, GPS wins over empty
  const displaySuburb = manualOverride ?? currentSuburb;
  const displayCity   = manualCity ?? (currentCity || 'Johannesburg');
  const displayLat    = currentLat;   // always from GPS
  const displayLon    = currentLon;

  // ── Context value ─────────────────────────────────────────────────────────

  const value: NeighbourhoodContextValue = {
    currentSuburb, currentCity, currentLat, currentLon,
    isDetecting, detectionError,
    manualOverride, manualCity,
    setManualOverride, clearManualOverride,
    displaySuburb, displayCity, displayLat, displayLon,
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
