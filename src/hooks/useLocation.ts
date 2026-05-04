/**
 * useLocation — backward-compatible hook that proxies to LocationContext.
 *
 * All pages that previously called `useLocation()` continue to work
 * without modification. The context provides a singleton GPS session
 * (no duplicate geolocation requests) and the three-state model.
 */

import { useLocationContext } from '../contexts/LocationContext';

// Keep the type export for anything that imported it from here
export interface LocationState {
  suburb: string;
  city: string;
  lat?: number;
  lon?: number;
  detectedAt?: number;
  confirmedAt?: number;
}

export interface UseLocationResult {
  suburb: string;
  city: string;
  lat: number | undefined;
  lon: number | undefined;
  loading: boolean;
  error: boolean;
  needsConfirmation: boolean;
  setManualSuburb: (suburb: string, city?: string) => void;
  confirm: () => void;
  refresh: () => void;
}

export default function useLocation(): UseLocationResult {
  const ctx = useLocationContext();
  return {
    suburb:            ctx.suburb,
    city:              ctx.city,
    lat:               ctx.lat,
    lon:               ctx.lon,
    loading:           ctx.loading,
    error:             ctx.error,
    needsConfirmation: ctx.needsConfirmation,
    setManualSuburb:   ctx.setManualSuburb,
    confirm:           ctx.confirm,
    refresh:           ctx.refresh,
  };
}
