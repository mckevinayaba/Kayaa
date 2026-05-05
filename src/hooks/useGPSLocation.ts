/**
 * useGPSLocation — explicit GPS detection for the area picker.
 *
 * Design principles:
 * - User-triggered only (no silent background requests)
 * - Clear state machine: idle → requesting → geocoding → success / error
 * - Accuracy gate: readings > GPS_ACCURACY_MAX are IP-based (desktop)
 *   and cannot resolve a suburb — we surface that honestly instead of
 *   showing a wrong area like "Honeydew" or "Randburg"
 *
 * Used in AreaSelector's "Use my location" button.
 * LocationContext uses its own `detect()` for background / mount detection.
 */

import { useState, useCallback } from 'react';
import { reverseGeocodeCoords } from '../lib/geocode';

// ─── Constants ────────────────────────────────────────────────────────────────

/** GPS readings worse than this (in metres) are IP/cell-based — not suburb-accurate */
const GPS_ACCURACY_MAX = 5000;

// ─── Types ────────────────────────────────────────────────────────────────────

export type GPSState =
  | 'idle'        // button not yet pressed
  | 'requesting'  // waiting for browser permission prompt
  | 'geocoding'   // coords received, reverse-geocoding suburb name
  | 'success'     // suburb resolved
  | 'denied'      // user denied location permission
  | 'unavailable' // browser has no geolocation API
  | 'inaccurate'  // coords returned but accuracy > 5 km (IP-based, desktop)
  | 'failed';     // network error or unknown failure

export interface GPSLocationResult {
  state:      GPSState;
  suburb:     string;
  city:       string;
  lat:        number | undefined;
  lon:        number | undefined;
  accuracy:   number | undefined;
  confidence: 'high' | 'medium' | 'low' | undefined;
  /** Call this to start GPS detection (only fires once permission prompt) */
  trigger: () => void;
  /** Reset back to idle so the user can try again */
  reset:   () => void;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useGPSLocation(): GPSLocationResult {
  const [state,      setState]      = useState<GPSState>('idle');
  const [suburb,     setSuburb]     = useState('');
  const [city,       setCity]       = useState('');
  const [lat,        setLat]        = useState<number | undefined>(undefined);
  const [lon,        setLon]        = useState<number | undefined>(undefined);
  const [accuracy,   setAccuracy]   = useState<number | undefined>(undefined);
  const [confidence, setConfidence] = useState<'high' | 'medium' | 'low' | undefined>(undefined);

  const trigger = useCallback(() => {
    if (!navigator.geolocation) {
      setState('unavailable');
      return;
    }

    // Prevent double-trigger if already in progress
    setState(prev => {
      if (prev === 'requesting' || prev === 'geocoding') return prev;
      return 'requesting';
    });

    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        setAccuracy(coords.accuracy);

        // ── Accuracy gate ────────────────────────────────────────────────────
        // On desktop Chrome without real GPS hardware, the browser falls back
        // to IP-based geolocation. accuracy can be 5 000–50 000 m, which puts
        // you in completely the wrong suburb. We reject these readings and tell
        // the user to search manually instead.
        if (coords.accuracy > GPS_ACCURACY_MAX) {
          setState('inaccurate');
          return;
        }

        setState('geocoding');

        const result = await reverseGeocodeCoords(
          coords.latitude,
          coords.longitude,
          coords.accuracy,
        );

        if (!result) {
          setState('failed');
          return;
        }

        setSuburb(result.suburb);
        setCity(result.city);
        setLat(result.lat);
        setLon(result.lon);
        setConfidence(result.confidence);
        setState('success');
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setState('denied');
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          setState('unavailable');
        } else {
          setState('failed');
        }
      },
      {
        enableHighAccuracy: true, // request GPS, not IP fallback
        timeout:            10_000,
        maximumAge:         60_000,
      },
    );
  }, []);

  const reset = useCallback(() => {
    setState('idle');
    setSuburb('');
    setCity('');
    setLat(undefined);
    setLon(undefined);
    setAccuracy(undefined);
    setConfidence(undefined);
  }, []);

  return { state, suburb, city, lat, lon, accuracy, confidence, trigger, reset };
}
