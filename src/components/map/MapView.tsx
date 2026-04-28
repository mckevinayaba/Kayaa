import { useEffect, useRef } from 'react';
import type { Map as LeafletMap, Marker } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Venue } from '../../types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface MapViewProps {
  venues: Venue[];
  userLat?: number;
  userLon?: number;
  onSelect?: (venue: Venue) => void;
  /** CSS height for the map container (default '100%') */
  height?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CAT_EMOJI: Record<string, string> = {
  Barbershop: '✂️', Shisanyama: '🔥', Tavern: '🍺', Café: '☕',
  Church: '⛪', Carwash: '🚗', 'Spaza Shop': '🏪', Salon: '💅',
  Tutoring: '📚', 'Sports Ground': '⚽', 'Home Business': '🏠',
};

function statusRing(status: string): string {
  switch (status) {
    case 'busy':   return '#F97316';
    case 'quiet':  return '#60A5FA';
    case 'closed': return '#4B5563';
    default:       return '#39D98A'; // open
  }
}

// Joburg city centre as default fallback
const DEFAULT_CENTER: [number, number] = [-26.2041, 28.0473];

// ─── Component ────────────────────────────────────────────────────────────────

export default function MapView({
  venues,
  userLat,
  userLon,
  onSelect,
  height = '100%',
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<LeafletMap | null>(null);
  const markersRef   = useRef<Marker[]>([]);

  // ── Initialise map once ────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // Dynamic import so Leaflet only runs in the browser
    import('leaflet').then(L => {
      if (!containerRef.current || mapRef.current) return;

      const center: [number, number] =
        userLat != null && userLon != null ? [userLat, userLon] : DEFAULT_CENTER;

      mapRef.current = L.map(containerRef.current, {
        center,
        zoom: 14,
        zoomControl: false,
        attributionControl: true,
      });

      // CartoDB Dark Matter — free, no token required
      L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
        {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> ' +
            '&copy; <a href="https://carto.com/attributions">CARTO</a>',
          subdomains: 'abcd',
          maxZoom: 19,
        },
      ).addTo(mapRef.current);

      // Zoom control — bottom right so it doesn't clash with the header
      L.control.zoom({ position: 'bottomright' }).addTo(mapRef.current);

      // User location dot
      if (userLat != null && userLon != null) {
        const userIcon = L.divIcon({
          html: `<div style="
            width:14px;height:14px;border-radius:50%;
            background:#39D98A;border:3px solid #fff;
            box-shadow:0 0 0 4px rgba(57,217,138,0.3);
          "></div>`,
          className: '',
          iconSize: [14, 14],
          iconAnchor: [7, 7],
        });
        L.marker([userLat, userLon], { icon: userIcon })
          .bindTooltip('You are here', { permanent: false, direction: 'top' })
          .addTo(mapRef.current);
      }
    });

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Update markers when venues change ──────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current) return;

    import('leaflet').then(L => {
      if (!mapRef.current) return;

      // Clear old markers
      markersRef.current.forEach(m => m.remove());
      markersRef.current = [];

      // Add a marker for every venue that has coordinates
      venues.forEach(v => {
        if (v.latitude == null || v.longitude == null) return;

        const emoji = CAT_EMOJI[v.category] ?? '📍';
        const ring  = statusRing(v.venueStatus ?? 'open');

        const icon = L.divIcon({
          html: `<div style="
            width:40px;height:40px;border-radius:50%;
            background:#161B22;
            border:3px solid ${ring};
            display:flex;align-items:center;justify-content:center;
            font-size:18px;
            box-shadow:0 3px 10px rgba(0,0,0,0.5);
            cursor:pointer;
            transition:transform 0.1s;
          " title="${v.name}">${emoji}</div>`,
          className: '',
          iconSize:   [40, 40],
          iconAnchor: [20, 20],
          popupAnchor:[0, -22],
        });

        const popup = L.popup({
          className: 'kayaa-popup',
          closeButton: false,
          maxWidth: 200,
        }).setContent(`
          <div style="
            background:#161B22;color:#fff;
            padding:10px 12px;border-radius:10px;
            border:1px solid rgba(255,255,255,0.08);
            font-family:'DM Sans',sans-serif;
            min-width:140px;
          ">
            <div style="font-family:'Syne',sans-serif;font-weight:700;font-size:13px;margin-bottom:3px">
              ${emoji} ${v.name}
            </div>
            <div style="font-size:11px;color:rgba(255,255,255,0.5);margin-bottom:4px">
              ${v.category} · ${v.neighborhood}
            </div>
            <div style="display:inline-block;font-size:10px;font-weight:700;
              color:${ring};background:${ring}20;
              border-radius:20px;padding:2px 8px">
              ${(v.venueStatus ?? 'open').toUpperCase()}
            </div>
          </div>
        `);

        const marker = L.marker([v.latitude, v.longitude], { icon })
          .bindPopup(popup)
          .addTo(mapRef.current!);

        if (onSelect) {
          marker.on('click', () => onSelect(v));
        }

        markersRef.current.push(marker);
      });
    });
  }, [venues, onSelect]);

  return (
    <>
      {/* Override Leaflet popup background — must live in DOM near the map */}
      <style>{`
        .leaflet-popup-content-wrapper,
        .leaflet-popup-tip {
          background: transparent !important;
          box-shadow: none !important;
          padding: 0 !important;
        }
        .leaflet-popup-content { margin: 0 !important; }
        .leaflet-container { background: #0D1117; }
        .leaflet-control-attribution {
          background: rgba(13,17,23,0.7) !important;
          color: rgba(255,255,255,0.3) !important;
          font-size: 9px !important;
        }
        .leaflet-control-attribution a { color: rgba(255,255,255,0.4) !important; }
      `}</style>

      <div
        ref={containerRef}
        style={{ width: '100%', height, borderRadius: '16px', overflow: 'hidden' }}
        aria-label="Map of nearby places"
        role="img"
      />
    </>
  );
}
