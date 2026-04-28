import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, SlidersHorizontal, Zap } from 'lucide-react';
import { getAllVenues } from '../lib/api';
import { haversineKm } from '../lib/geocode';
import { useCountry } from '../contexts/CountryContext';
import useLocation from '../hooks/useLocation';
import SearchBar from '../components/search/SearchBar';
import type { Venue } from '../types';

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

const CATEGORIES = [
  'All', 'Barbershop', 'Shisanyama', 'Tavern', 'Café', 'Salon',
  'Spaza Shop', 'Carwash', 'Church', 'Tutoring', 'Sports Ground', 'Home Business',
];

type SortKey = 'active' | 'nearest' | 'az';
const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'active',  label: '⚡ Most active' },
  { key: 'nearest', label: '📍 Nearest'     },
  { key: 'az',      label: '🔤 A–Z'         },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function statusDot(status: string): { color: string; label: string } {
  switch (status) {
    case 'busy':   return { color: '#F97316', label: 'Busy'   };
    case 'open':   return { color: '#39D98A', label: 'Open'   };
    case 'quiet':  return { color: '#60A5FA', label: 'Quiet'  };
    default:       return { color: '#4B5563', label: 'Closed' };
  }
}

function fmtDist(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)}m` : `${km.toFixed(1)}km`;
}

// ─── Skeletons ────────────────────────────────────────────────────────────────

function RowSkeleton() {
  return (
    <div style={{
      background: 'var(--color-surface)', border: '1px solid var(--color-border)',
      borderRadius: '14px', padding: '14px', marginBottom: '8px',
      display: 'flex', gap: '12px', alignItems: 'center',
    }}>
      <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'var(--color-surface2)', flexShrink: 0,
        backgroundImage: 'linear-gradient(90deg,var(--color-surface2) 25%,rgba(255,255,255,0.04) 50%,var(--color-surface2) 75%)',
        backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite' }} />
      <div style={{ flex: 1 }}>
        <div style={{ height: '14px', width: '50%', background: 'var(--color-surface2)', borderRadius: '6px', marginBottom: '8px' }} />
        <div style={{ height: '11px', width: '34%', background: 'var(--color-surface2)', borderRadius: '6px' }} />
      </div>
      <div style={{ width: '78px', height: '32px', background: 'var(--color-surface2)', borderRadius: '20px' }} />
    </div>
  );
}

// ─── Active-now rail ──────────────────────────────────────────────────────────

function ActiveNowRail({ venues, onSelect }: { venues: Venue[]; onSelect: (slug: string) => void }) {
  if (venues.length === 0) return null;
  return (
    <div style={{ marginBottom: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
        <Zap size={14} color="#39D98A" />
        <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '14px', color: 'var(--color-text)', margin: 0 }}>
          Active right now
        </h2>
        <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: 'var(--color-muted)' }}>
          · {venues.length} place{venues.length !== 1 ? 's' : ''}
        </span>
      </div>
      <div style={{
        display: 'flex', gap: '8px', overflowX: 'auto', scrollbarWidth: 'none',
        marginLeft: '-16px', paddingLeft: '16px',
        marginRight: '-16px', paddingRight: '16px',
        paddingBottom: '4px', WebkitOverflowScrolling: 'touch',
      } as React.CSSProperties}>
        {venues.map(v => {
          const emoji = CAT_EMOJI[v.category] ?? '📍';
          const color = CAT_COLOR[v.category] ?? '#39D98A';
          const dot = statusDot(v.venueStatus ?? 'open');
          return (
            <button
              key={v.id}
              onClick={() => onSelect(v.slug)}
              style={{
                flexShrink: 0, background: 'var(--color-surface)',
                border: `1px solid ${color}28`,
                borderRadius: '14px', padding: '10px 12px',
                cursor: 'pointer', textAlign: 'left', minWidth: '130px', maxWidth: '160px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '18px' }}>{emoji}</span>
                <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: dot.color, display: 'inline-block' }} />
              </div>
              <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '12px', color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: '3px' }}>
                {v.name}
              </div>
              {(v.checkinsToday ?? 0) > 0 && (
                <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '10px', color: color, fontWeight: 600 }}>
                  {v.checkinsToday} check-in{v.checkinsToday !== 1 ? 's' : ''} today
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Venue row ────────────────────────────────────────────────────────────────

function VenueRow({ venue, userLat, userLon, onCheckin }: {
  venue: Venue;
  userLat?: number;
  userLon?: number;
  onCheckin: () => void;
}) {
  const navigate = useNavigate();
  const emoji = CAT_EMOJI[venue.category] ?? '📍';
  const color = CAT_COLOR[venue.category] ?? '#39D98A';
  const dot = statusDot(venue.venueStatus ?? (venue.isOpen ? 'open' : 'closed'));
  const dist =
    userLat != null && userLon != null && venue.latitude != null && venue.longitude != null
      ? haversineKm(userLat, userLon, venue.latitude, venue.longitude)
      : undefined;

  return (
    <div
      onClick={() => navigate(`/venue/${venue.slug}`)}
      style={{
        background: 'var(--color-surface)', border: '1px solid var(--color-border)',
        borderRadius: '14px', padding: '14px',
        marginBottom: '8px', display: 'flex', gap: '12px', alignItems: 'center',
        cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
      }}
    >
      {/* Emoji icon */}
      <div style={{
        width: '44px', height: '44px', borderRadius: '12px',
        background: `${color}12`, border: `1px solid ${color}22`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '20px', flexShrink: 0,
      }}>
        {emoji}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
          <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '14px', color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {venue.name}
          </span>
          {venue.isVerified && <span title="Verified" style={{ fontSize: '11px', color: '#39D98A', flexShrink: 0 }}>✓</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          {/* Status */}
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
            <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: dot.color, display: 'inline-block' }} />
            <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: dot.color, fontWeight: 600 }}>{dot.label}</span>
          </span>
          <span style={{ color: 'var(--color-border)', fontSize: '10px' }}>·</span>
          {/* Area */}
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
            <MapPin size={10} color="var(--color-muted)" />
            <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: 'var(--color-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '120px' }}>
              {venue.neighborhood || venue.city}
            </span>
          </span>
          {/* Distance */}
          {dist != null && (
            <>
              <span style={{ color: 'var(--color-border)', fontSize: '10px' }}>·</span>
              <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: 'var(--color-muted)' }}>{fmtDist(dist)}</span>
            </>
          )}
        </div>
      </div>

      {/* CTA */}
      <button
        onClick={e => { e.stopPropagation(); onCheckin(); }}
        style={{
          background: '#39D98A', color: '#0D1117',
          border: 'none', borderRadius: '20px',
          padding: '8px 14px',
          fontFamily: 'DM Sans, sans-serif', fontWeight: 700, fontSize: '12px',
          cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
        }}
      >
        Check in →
      </button>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function CheckInBrowsePage() {
  const navigate = useNavigate();
  const { selectedCountry } = useCountry();
  const { suburb, lat: userLat, lon: userLon } = useLocation();

  const [venues,  setVenues]  = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCat, setActiveCat] = useState('All');
  const [sortBy, setSortBy]   = useState<SortKey>('active');
  const [showSort, setShowSort] = useState(false);

  useEffect(() => {
    getAllVenues(selectedCountry.code).then(v => {
      setVenues(v.filter(x => x.description.trim().length >= 10));
      setLoading(false);
    });
  }, [selectedCountry.code]);

  // Active-now rail: busy status OR check-ins today
  const activeNow = useMemo(
    () => venues
      .filter(v => v.venueStatus === 'busy' || (v.checkinsToday ?? 0) > 0)
      .sort((a, b) => (b.checkinsToday ?? 0) - (a.checkinsToday ?? 0))
      .slice(0, 10),
    [venues],
  );

  // Filtered + sorted main list
  const filtered = useMemo(() => {
    let list = activeCat === 'All' ? venues : venues.filter(v => v.category === activeCat);

    switch (sortBy) {
      case 'active':
        list = [...list].sort((a, b) => (b.checkinsToday ?? 0) - (a.checkinsToday ?? 0));
        break;
      case 'nearest':
        if (userLat != null && userLon != null) {
          list = [...list].sort((a, b) => {
            const aOk = a.latitude != null && a.longitude != null;
            const bOk = b.latitude != null && b.longitude != null;
            if (aOk && bOk) return haversineKm(userLat!, userLon!, a.latitude!, a.longitude!) - haversineKm(userLat!, userLon!, b.latitude!, b.longitude!);
            if (aOk) return -1;
            if (bOk) return 1;
            return 0;
          });
        }
        break;
      case 'az':
        list = [...list].sort((a, b) => a.name.localeCompare(b.name));
        break;
    }
    return list;
  }, [venues, activeCat, sortBy, userLat, userLon]);

  const areaLabel = suburb || 'your area';

  return (
    <div style={{ padding: '16px' }}>

      {/* Header */}
      <div style={{ marginBottom: '16px' }}>
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '22px', color: 'var(--color-text)', margin: '0 0 3px' }}>
          Explore
        </h1>
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: 'var(--color-muted)', margin: 0 }}>
          Find places to check in near {areaLabel}
        </p>
      </div>

      {/* Smart search bar */}
      <div style={{ marginBottom: '18px' }}>
        <SearchBar
          venues={venues}
          userLat={userLat}
          userLon={userLon}
          placeholder="Search places, areas, categories…"
        />
      </div>

      {/* Active-now rail */}
      {!loading && (
        <ActiveNowRail venues={activeNow} onSelect={slug => navigate(`/venue/${slug}`)} />
      )}

      {/* Category chips + sort toggle */}
      <div style={{ marginBottom: '12px' }}>
        {/* Category strip */}
        <div style={{
          display: 'flex', gap: '6px', overflowX: 'auto', scrollbarWidth: 'none',
          marginLeft: '-16px', paddingLeft: '16px',
          marginRight: '-16px', paddingRight: '16px',
          paddingBottom: '4px', WebkitOverflowScrolling: 'touch',
        } as React.CSSProperties}>
          {CATEGORIES.map(cat => {
            const active = activeCat === cat;
            const emoji = cat === 'All' ? null : (CAT_EMOJI[cat] ?? '📍');
            return (
              <button
                key={cat}
                onClick={() => setActiveCat(cat)}
                style={{
                  flexShrink: 0,
                  padding: '6px 12px',
                  borderRadius: '20px',
                  border: active ? 'none' : '1px solid var(--color-border)',
                  background: active ? 'rgba(57,217,138,0.15)' : 'var(--color-surface)',
                  color: active ? '#39D98A' : 'var(--color-muted)',
                  fontSize: '12px', fontWeight: 600,
                  fontFamily: 'DM Sans, sans-serif',
                  cursor: 'pointer', whiteSpace: 'nowrap',
                  transition: 'all 0.15s',
                }}
              >
                {emoji && <span style={{ marginRight: '4px' }}>{emoji}</span>}
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Sort + result count row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: 'var(--color-muted)' }}>
          {loading ? '…' : `${filtered.length} place${filtered.length !== 1 ? 's' : ''}`}
        </span>

        {/* Sort toggle */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowSort(s => !s)}
            style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              background: showSort ? 'rgba(57,217,138,0.1)' : 'var(--color-surface)',
              border: `1px solid ${showSort ? 'rgba(57,217,138,0.3)' : 'var(--color-border)'}`,
              borderRadius: '10px', padding: '6px 10px',
              color: showSort ? '#39D98A' : 'var(--color-muted)',
              fontSize: '12px', fontWeight: 600,
              fontFamily: 'DM Sans, sans-serif', cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            <SlidersHorizontal size={13} />
            {SORT_OPTIONS.find(o => o.key === sortBy)?.label}
          </button>

          {/* Dropdown */}
          {showSort && (
            <div style={{
              position: 'absolute', right: 0, top: 'calc(100% + 4px)',
              background: 'var(--color-surface2)',
              border: '1px solid var(--color-border)',
              borderRadius: '12px', overflow: 'hidden',
              boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
              zIndex: 100, minWidth: '160px',
            }}>
              {SORT_OPTIONS.map(opt => (
                <button
                  key={opt.key}
                  onClick={() => { setSortBy(opt.key); setShowSort(false); }}
                  style={{
                    display: 'block', width: '100%',
                    background: sortBy === opt.key ? 'rgba(57,217,138,0.1)' : 'none',
                    border: 'none',
                    padding: '10px 14px',
                    textAlign: 'left',
                    fontFamily: 'DM Sans, sans-serif', fontSize: '13px', fontWeight: 600,
                    color: sortBy === opt.key ? '#39D98A' : 'var(--color-text)',
                    cursor: 'pointer',
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Venue list */}
      {loading ? (
        <div>{[0, 1, 2, 3, 4].map(i => <RowSkeleton key={i} />)}</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 24px' }}>
          <div style={{ fontSize: '36px', marginBottom: '12px' }}>
            {activeCat !== 'All' ? (CAT_EMOJI[activeCat] ?? '📍') : '🔍'}
          </div>
          <h3 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '15px', color: 'var(--color-text)', marginBottom: '8px' }}>
            {activeCat !== 'All' ? `No ${activeCat.toLowerCase()} places yet` : 'No places found'}
          </h3>
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: 'var(--color-muted)', lineHeight: 1.5, marginBottom: '20px' }}>
            {activeCat !== 'All'
              ? `Be the first to add a ${activeCat.toLowerCase()} near ${areaLabel}.`
              : `Nothing in this area yet. Want to add your place?`}
          </p>
          <button
            onClick={() => navigate('/onboarding')}
            style={{
              background: '#39D98A', color: '#0D1117',
              border: 'none', borderRadius: '12px',
              padding: '12px 24px',
              fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '14px',
              cursor: 'pointer',
            }}
          >
            Add a place →
          </button>
        </div>
      ) : (
        <div>
          {filtered.map(v => (
            <VenueRow
              key={v.id}
              venue={v}
              userLat={userLat}
              userLon={userLon}
              onCheckin={() => navigate(`/venue/${v.slug}/checkin`)}
            />
          ))}
          {/* Footer CTA */}
          <div style={{
            textAlign: 'center', padding: '24px 0 8px',
            borderTop: '1px solid var(--color-border)', marginTop: '8px',
          }}>
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: 'var(--color-muted)', margin: '0 0 12px' }}>
              Don't see your place?
            </p>
            <button
              onClick={() => navigate('/onboarding')}
              style={{
                background: 'transparent', border: '1px solid rgba(57,217,138,0.3)',
                borderRadius: '12px', padding: '10px 22px',
                color: '#39D98A', fontFamily: 'DM Sans, sans-serif',
                fontWeight: 600, fontSize: '13px', cursor: 'pointer',
              }}
            >
              ➕ Add it to Kayaa
            </button>
          </div>
        </div>
      )}

      <div style={{ height: '16px' }} />
    </div>
  );
}
