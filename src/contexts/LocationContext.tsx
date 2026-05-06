/**
 * LocationContext — thin compatibility layer over NeighbourhoodContext.
 *
 * This file exists purely for backward compatibility with components that
 * already call useLocation() or useLocationContext(). All actual location
 * detection now lives in NeighbourhoodContext (GPS-first, no localStorage).
 *
 * DO NOT add localStorage reads or writes for suburb / city / location here.
 * DO NOT restore a previous suburb from Supabase profiles here.
 * The ONLY source of truth for the current neighbourhood is GPS via NeighbourhoodContext.
 */

import {
  createContext, useContext, useCallback, type ReactNode,
} from 'react';
import { useNeighbourhood } from './NeighbourhoodContext';

// ─── Types (kept for backward compat) ────────────────────────────────────────

export interface NeighbourhoodInfo {
  suburb:      string;
  city:        string;
  lat?:        number;
  lon?:        number;
  savedAt?:    number;
  confirmedAt?: number;
  source?:     'gps' | 'manual' | 'home' | 'legacy' | 'profile';
}

export interface LocationContextValue {
  /** Active neighbourhood — GPS-detected or manually overridden. */
  active:      NeighbourhoodInfo;
  activeLabel: string;

  /** true when the user is manually browsing a different area than GPS. */
  isBrowsing: boolean;

  current:  NeighbourhoodInfo | null;
  home:     null;      // no longer persisted
  browsing: null;      // no longer persisted

  loading: boolean;
  error:   boolean;

  /**
   * true once GPS detection has completed (success or failure).
   * Use this to avoid showing the location gate before GPS has had a chance to run.
   */
  profileChecked: boolean;

  /** true when we have no suburb and GPS has finished (user needs to pick manually). */
  needsConfirmation: boolean;

  /** Legacy — no longer needed; always false. */
  reconfirmNeeded: boolean;
  dismissReconfirm: () => void;

  /** Legacy — no longer needed; always null. */
  movedTo:     null;
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

// ─── Context ──────────────────────────────────────────────────────────────────

const LocationCtx = createContext<LocationContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function LocationProvider({ children }: { children: ReactNode }) {
  const {
    displaySuburb, displayCity, displayLat, displayLon,
    currentSuburb, currentCity, currentLat, currentLon,
    isDetecting, detectionError,
    manualOverride, manualCity,
    setManualOverride, clearManualOverride,
    refetchLocation,
  } = useNeighbourhood();

  const noop = useCallback(() => {}, []);

  // Derived
  const suburb = displaySuburb;
  const city   = displayCity;
  const lat    = displayLat ?? undefined;
  const lon    = displayLon ?? undefined;

  const activeLabel = suburb || city || '';
  const isBrowsing  = !!(manualOverride && manualOverride !== currentSuburb);

  // GPS done + no suburb found → user needs to pick manually
  const needsConfirmation = !isDetecting && !displaySuburb && !manualOverride;

  // profileChecked: true once GPS has finished (no async Supabase wait)
  const profileChecked = !isDetecting;

  const current: NeighbourhoodInfo | null = currentSuburb
    ? { suburb: currentSuburb, city: currentCity, lat: currentLat ?? undefined, lon: currentLon ?? undefined, source: 'gps' }
    : null;

  const active: NeighbourhoodInfo = {
    suburb, city, lat, lon,
    source: manualOverride ? 'manual' : 'gps',
  };

  const setManualSuburb = useCallback((s: string, c?: string) => {
    setManualOverride(s, c);
  }, [setManualOverride]);

  const setBrowsing = useCallback((s: string, c?: string) => {
    setManualOverride(s, c);
  }, [setManualOverride]);

  const value: LocationContextValue = {
    active,
    activeLabel,
    isBrowsing,

    current,
    home:     null,
    browsing: null,

    loading: isDetecting,
    error:   !!detectionError && detectionError !== 'suburb-not-found',

    profileChecked,
    needsConfirmation,

    reconfirmNeeded:  false,
    dismissReconfirm: noop,

    movedTo:     null,
    dismissMove: noop,
    acceptMove:  noop,

    detectNow:       refetchLocation,
    confirm:         noop,
    setManualSuburb,
    setBrowsing,
    clearBrowsing:   clearManualOverride,
    setHome:         setManualSuburb,
    refresh:         refetchLocation,

    suburb, city, lat, lon,
  };

  return <LocationCtx.Provider value={value}>{children}</LocationCtx.Provider>;
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useLocationContext(): LocationContextValue {
  const ctx = useContext(LocationCtx);
  if (!ctx) throw new Error('useLocationContext must be used inside <LocationProvider>');
  return ctx;
}
