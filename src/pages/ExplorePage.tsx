import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Map, List, SlidersHorizontal, X, Users } from 'lucide-react';
import { getAllVenues } from '../lib/api';
import { haversineKm } from '../lib/geocode';
import { useCountry } from '../contexts/CountryContext';
import useLocation from '../hooks/useLocation';
import SearchBar from '../components/search/SearchBar';
import VisualFilters from '../components/feed/VisualFilters';
import MapView from '../components/map/MapView';
import type { Venue } from '../types';
import type { FilterPill } from '../components/feed/VisualFilters';

// ─── Constants ────────────────────────────────────────────────────────────────

const CAT_EMOJI: Record<string, string> = {
  Barbershop: '✂️', Shisanyama: '🔥', Tavern: '🍺', Café: '☕',
  Church: '⛪', Carwash: '🚗', 'Spaza Shop': '🏪', Salon: '💅',
  Tutoring: '📚', 'Sports Ground': '⚽', 'Home Business': '🏠',
};
const CAT_COLOR: Record<string, string> = {
  Barbershop: '#39D98A', Shisanyama: '#F5A623', Tavern: '#60A5FA',
  Café: '#F59E0B', Church: '#A78BFA', Carwash: '#34D399',
  'Spaza Shop': '#60A5FA', Salon: '#F472B6', Tutoring: '#34D399',
  'Sports Ground': '#FB923C', 'Home Business': '#94A3B8',
};

const DISTANCE_OPTIONS = ['500m', '1 km', '2 km', '5 km', 'Any'];
const STATUS_OPTIONS    = ['Open now', 'Busy now', 'Any status'];
const VERIFIED_OPTIONS  = ['Verified only', 'All places'];

// ─── Skeleton row ─────────────────────────────────────────────────────────────

function RowSkeleton() {
  return (
    <div style={{
      background: 'var(--color-surface)', border: '1px solid var(--color-border)',
      borderRadius: '14px', padding: '14px', marginBottom: '8px',
      display: 'flex', gap: '12px', alignItems: 'center',
    }}>
      <div style={{ width: '44px', height: '44px', borderRadius: '12px',
        backgroundImage: 'linear-gradient(90deg,var(--color-surface2) 25%,rgba(255,255,255,0.04) 50%,var(--color-surface2) 75%)',
        backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite', flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <div style={{ height: '14px', width: '50%', background: 'var(--color-surface2)', borderRadius: '6px', marginBottom: '8px' }} />
        <div style={{ height: '11px', width: '34%', background: 'var(--color-surface2)', borderRadius: '6px' }} />
      </div>
      <div style={{ width: '78px', height: '32px', background: 'var(--color-surface2)', borderRadius: '20px' }} />
    </div>
  );
}

// ─── Compact venue row (list view) ────────────────────────────────────────────

function VenueRow({ venue, userLat, userLon }: { venue: Venue; userLat?: number; userLon?: number }) {
  const navigate = useNavigate();
  const emoji = CAT_EMOJI[venue.category] ?? '📍';
  const color = CAT_COLOR[venue.category] ?? '#39D98A';
  const st    = venue.venueStatus ?? (venue.isOpen ? 'open' : 'closed');
  const stColor = st === 'busy' ? '#F97316' : st === 'open' ? '#39D98A' : st === 'quiet' ? '#60A5FA' : '#4B5563';
  const stLabel = st === 'busy' ? 'Busy' : st === 'open' ? 'Open' : st === 'quiet' ? 'Quiet' : 'Closed';
  const dist =
    userLat != null && userLon != null && venue.latitude != null && venue.longitude != null
      ? haversineKm(userLat, userLon, venue.latitude, venue.longitude)
      : undefined;

  return (
    <div
      onClick={() => navigate(`/venue/${venue.slug}`)}
      style={{
        background: 'var(--color-surface)', border: '1px solid var(--color-border)',
        borderRadius: '14px', padding: '14px', marginBottom: '8px',
        display: 'flex', gap: '12px', alignItems: 'center',
        cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
      }}
    >
      <div style={{
        width: '44px', height: '44px', borderRadius: '12px', flexShrink: 0,
        background: `${color}12`, border: `1px solid ${color}22`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px',
      }}>
        {emoji}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '14px', color: 'var(--color-text)', marginBottom: '3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {venue.name}
          {venue.isVerified && <span style={{ color: '#39D98A', fontSize: '11px', marginLeft: '5px' }}>✓</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
            <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: stColor, display: 'inline-block' }} />
            <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: stColor, fontWeight: 600 }}>{stLabel}</span>
          </span>
          <span style={{ color: 'var(--color-border)', fontSize: '10px' }}>·</span>
          <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: 'var(--color-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '130px' }}>
            {venue.neighborhood || venue.city}
          </span>
          {dist != null && (
            <>
              <span style={{ color: 'var(--color-border)', fontSize: '10px' }}>·</span>
              <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: 'var(--color-muted)' }}>
                {dist < 1 ? `${Math.round(dist * 1000)}m` : `${dist.toFixed(1)}km`}
              </span>
            </>
          )}
        </div>
      </div>
      <button
        onClick={e => { e.stopPropagation(); navigate(`/venue/${venue.slug}/checkin`); }}
        style={{
          background: '#39D98A', color: '#0D1117', border: 'none',
          borderRadius: '20px', padding: '8px 14px', flexShrink: 0,
          fontFamily: 'DM Sans, sans-serif', fontWeight: 700, fontSize: '12px', cursor: 'pointer',
        }}
      >
        Check in →
      </button>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ExplorePage() {
  const navigate = useNavigate();
  const { selectedCountry } = useCountry();
  const { suburb, lat: userLat, lon: userLon } = useLocation();

  const [venues,       setVenues]       = useState<Venue[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [view,         setView]         = useState<'map' | 'list'>('list');
  const [filterCat,    setFilterCat]    = useState('all');
  const [showAdv,      setShowAdv]      = useState(false);
  const [distFilter,   setDistFilter]   = useState('Any');
  const [statusFilter, setStatusFilter] = useState('Any status');
  const [verifiedOnly, setVerifiedOnly] = useState(false);

  useEffect(() => {
    getAllVenues(selectedCountry.code).then(v => {
      setVenues(v.filter(x => x.description.trim().length >= 10));
      setLoading(false);
    });
  }, [selectedCountry.code]);

  // ── Filter pills ─────────────────────────────────────────────────────────────

  const filterPills = useMemo((): FilterPill[] => {
    const active  = venues.filter(v => v.venueStatus === 'busy' || (v.checkinsToday ?? 0) > 0);
    const now     = Date.now();
    const newCutoff = now - 30 * 24 * 60 * 60 * 1000;
    const newPlaces = venues.filter(v => new Date(v.createdAt).getTime() > newCutoff);
    return [
      { id: 'all',      label: 'All',      emoji: '🏘️', count: venues.length   },
      { id: 'active',   label: 'Active',   emoji: '⚡',  count: active.length   },
      { id: 'new',      label: 'New',      emoji: '✨',  count: newPlaces.length },
      { id: 'loved',    label: 'Most Loved',emoji: '💛', count: venues.filter(v => v.regularsCount > 50).length },
      { id: 'events',   label: 'Events',   emoji: '📅',  count: 0               },
    ];
  }, [venues]);

  // ── Advanced filter application ──────────────────────────────────────────────

  const filtered = useMemo(() => {
    let list = [...venues];

    // Category pill filter
    switch (filterCat) {
      case 'active':  list = list.filter(v => v.venueStatus === 'busy' || (v.checkinsToday ?? 0) > 0); break;
      case 'new': {
        const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
        list = list.filter(v => new Date(v.createdAt).getTime() > cutoff);
        break;
      }
      case 'loved':   list = list.filter(v => v.regularsCount > 50); break;
    }

    // Status filter
    if (statusFilter === 'Open now')  list = list.filter(v => v.venueStatus !== 'closed');
    if (statusFilter === 'Busy now')  list = list.filter(v => v.venueStatus === 'busy');

    // Verified filter
    if (verifiedOnly) list = list.filter(v => v.isVerified);

    // Distance filter (requires GPS)
    if (distFilter !== 'Any' && userLat != null && userLon != null) {
      const km = parseFloat(distFilter.replace(/[^0-9.]/g, '')) * (distFilter.includes('m') && !distFilter.includes('km') ? 0.001 : 1);
      list = list.filter(v =>
        v.latitude != null && v.longitude != null &&
        haversineKm(userLat!, userLon!, v.latitude, v.longitude) <= km
      );
    }

    // Sort active first, then by check-ins
    return list.sort((a, b) => (b.checkinsToday ?? 0) - (a.checkinsToday ?? 0));
  }, [venues, filterCat, statusFilter, verifiedOnly, distFilter, userLat, userLon]);

  const activeNowCount = useMemo(
    () => venues.filter(v => v.venueStatus === 'busy' || (v.checkinsToday ?? 0) > 0).length,
    [venues],
  );

  const areaLabel = suburb || 'your area';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px)' }}>

      {/* ── Sticky header ───────────────────────────────────────────────────── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'var(--color-bg)',
        borderBottom: '1px solid var(--color-border)',
        padding: '12px 16px 0',
      }}>
        {/* Title row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div>
            <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '20px', color: 'var(--color-text)', margin: 0, lineHeight: 1.2 }}>
              Explore
            </h1>
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: 'var(--color-muted)', margin: '2px 0 0' }}>
              {loading ? '…' : `${filtered.length} places near ${areaLabel}`}
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Advanced filter toggle */}
            <button
              onClick={() => setShowAdv(s => !s)}
              aria-expanded={showAdv}
              aria-label="Toggle advanced filters"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: '36px', height: '36px', borderRadius: '10px',
                background: showAdv ? 'rgba(57,217,138,0.15)' : 'var(--color-surface)',
                border: `1px solid ${showAdv ? 'rgba(57,217,138,0.35)' : 'var(--color-border)'}`,
                color: showAdv ? '#39D98A' : 'var(--color-muted)',
                cursor: 'pointer', transition: 'all 0.15s',
              }}
            >
              <SlidersHorizontal size={16} />
            </button>

            {/* Map / List toggle */}
            <div style={{ display: 'flex', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '10px', padding: '3px', gap: '2px' }}>
              {(['list', 'map'] as const).map(v => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  aria-pressed={view === v}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: '30px', height: '30px', borderRadius: '8px', border: 'none',
                    background: view === v ? '#39D98A' : 'transparent',
                    color: view === v ? '#000' : 'var(--color-muted)',
                    cursor: 'pointer', transition: 'all 0.15s',
                  }}
                >
                  {v === 'list' ? <List size={15} /> : <Map size={15} />}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Search bar */}
        <div style={{ marginBottom: '12px' }}>
          <SearchBar venues={venues} userLat={userLat} userLon={userLon} />
        </div>

        {/* Category filter pills */}
        <div style={{ paddingBottom: '12px' }}>
          <VisualFilters
            filters={filterPills}
            activeFilter={filterCat}
            onSelect={setFilterCat}
          />
        </div>

        {/* Advanced filters panel */}
        {showAdv && (
          <div style={{
            background: 'var(--color-surface)', borderTop: '1px solid var(--color-border)',
            padding: '12px 0',
          }}>
            {[
              { label: 'Distance', options: DISTANCE_OPTIONS, value: distFilter,   set: setDistFilter   },
              { label: 'Status',   options: STATUS_OPTIONS,   value: statusFilter, set: setStatusFilter },
              { label: 'Trust',    options: VERIFIED_OPTIONS, value: verifiedOnly ? 'Verified only' : 'All places', set: (v: string) => setVerifiedOnly(v === 'Verified only') },
            ].map(({ label, options, value, set }) => (
              <div key={label} style={{ marginBottom: '10px' }}>
                <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>
                  {label}
                </div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {options.map(opt => {
                    const active = value === opt;
                    return (
                      <button
                        key={opt}
                        onClick={() => set(opt)}
                        style={{
                          padding: '5px 12px', borderRadius: '20px',
                          border: active ? 'none' : '1px solid var(--color-border)',
                          background: active ? 'rgba(57,217,138,0.15)' : 'var(--color-surface2)',
                          color: active ? '#39D98A' : 'var(--color-muted)',
                          fontFamily: 'DM Sans, sans-serif', fontSize: '12px', fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            <button
              onClick={() => { setDistFilter('Any'); setStatusFilter('Any status'); setVerifiedOnly(false); setShowAdv(false); }}
              style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'none', border: 'none', color: 'rgba(255,255,255,0.35)', fontSize: '12px', fontFamily: 'DM Sans, sans-serif', cursor: 'pointer', padding: 0, marginTop: '4px' }}
            >
              <X size={12} /> Clear filters
            </button>
          </div>
        )}
      </div>

      {/* ── Content area ────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: view === 'list' ? 'auto' : 'hidden', position: 'relative' }}>

        {/* Map view */}
        {view === 'map' && (
          <div style={{ height: '100%', padding: '12px 16px' }}>
            <MapView
              venues={filtered}
              userLat={userLat}
              userLon={userLon}
              height="100%"
              onSelect={venue => navigate(`/venue/${venue.slug}`)}
            />
          </div>
        )}

        {/* List view */}
        {view === 'list' && (
          <div style={{ padding: '12px 16px' }}>
            {loading ? (
              <div>{[0,1,2,3,4].map(i => <RowSkeleton key={i} />)}</div>
            ) : filtered.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 24px' }}>
                <div style={{ fontSize: '36px', marginBottom: '12px' }}>🔍</div>
                <h3 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '15px', color: 'var(--color-text)', marginBottom: '8px' }}>No places match these filters</h3>
                <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: 'var(--color-muted)', marginBottom: '16px' }}>Try widening the distance or status filter.</p>
                <button
                  onClick={() => { setDistFilter('Any'); setStatusFilter('Any status'); setVerifiedOnly(false); setFilterCat('all'); }}
                  style={{ background: 'rgba(57,217,138,0.1)', border: '1px solid rgba(57,217,138,0.3)', color: '#39D98A', borderRadius: '10px', padding: '9px 20px', fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}
                >
                  Reset filters
                </button>
              </div>
            ) : (
              <>
                {filtered.map(v => <VenueRow key={v.id} venue={v} userLat={userLat} userLon={userLon} />)}
                <button
                  onClick={() => navigate('/onboarding')}
                  style={{ width: '100%', background: 'none', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '12px', padding: '12px', color: 'rgba(255,255,255,0.3)', fontFamily: 'DM Sans, sans-serif', fontSize: '12px', cursor: 'pointer', marginTop: '4px' }}
                >
                  ➕ Add your place to Kayaa
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* ── Floating "active now" badge ──────────────────────────────────────── */}
      {!loading && activeNowCount > 0 && (
        <div style={{
          position: 'fixed', bottom: '80px', right: '16px', zIndex: 50,
          background: 'var(--color-surface)', border: '1px solid var(--color-border)',
          borderRadius: '14px', padding: '8px 12px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          display: 'flex', alignItems: 'center', gap: '6px',
          pointerEvents: 'none',
        }}>
          <Users size={13} color="#39D98A" />
          <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', fontWeight: 700, color: '#39D98A' }}>
            {activeNowCount}
          </span>
          <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: 'var(--color-muted)' }}>
            active now
          </span>
        </div>
      )}
    </div>
  );
}
