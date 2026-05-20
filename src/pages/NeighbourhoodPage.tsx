import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, MapPin, ChevronDown, X } from 'lucide-react'; // MapPin used in header + cluster list view
import { getAllVenues } from '../lib/api';
import { getCategoryEmoji, getVenueOpenStatus } from '../lib/venueUtils';
import { useNeighbourhood } from '../contexts/NeighbourhoodContext';
import { useCountry } from '../contexts/CountryContext';
import { haversineKm } from '../lib/geocode';
import type { Venue } from '../types';
import HonouredPlacesRail from '../components/HonouredPlacesRail';

// ── Category cluster definitions ──────────────────────────────────────────────
// Groups all DB category variants into human-readable neighbourhood clusters.
// Regex patterns reuse the same logic as FeedPage's CAT_KEY_MATCH.

interface Cluster {
  key:   string;
  label: string;
  emoji: string;
  color: string;
  match: RegExp;
}

const CLUSTERS: Cluster[] = [
  { key: 'barbers',   label: 'Barbers',          emoji: '✂️', color: '#39D98A', match: /barb|kinyozi|coiff|hair.?cut|groom/i },
  { key: 'beauty',    label: 'Hair & Beauty',     emoji: '💅', color: '#F472B6', match: /salon|nywele|beaut|nail/i },
  { key: 'food',      label: 'Food & Drink',      emoji: '🍖', color: '#F5A623', match: /shisan|choma|buka|bukat|tavern|pub|shebeen|restaurant|diner|fast.?food|caf[eé]|coffee|bakery|braai/i },
  { key: 'spaza',     label: 'Spaza & Market',    emoji: '🛒', color: '#60A5FA', match: /spaza|duka|kiosk|provision|market|boutique|corner.?shop|tuck.?shop/i },
  { key: 'auto',      label: 'Mechanics & Auto',  emoji: '🔧', color: '#34D399', match: /mechanic|garage|carwash|car.?wash|vulcan|auto.?repair/i },
  { key: 'faith',     label: 'Churches & Faith',  emoji: '⛪', color: '#A78BFA', match: /church|kanisa|chapel|mosque|temple|faith|prayer|fellowship/i },
  { key: 'fitness',   label: 'Fitness',           emoji: '💪', color: '#FB923C', match: /gym|fitness|yoga|crossfit|workout|sport.*ground|playing.*field/i },
  { key: 'lodging',   label: 'Lodging & Stay',    emoji: '🏨', color: '#94A3B8', match: /lodge|guesthouse|hotel|hostel|stay|airbnb|bed.*break/i },
  { key: 'health',    label: 'Health & Clinics',  emoji: '🏥', color: '#F87171', match: /clinic|hospital|health|pharmacy|chemist|medical/i },
  { key: 'community', label: 'Community',         emoji: '🤝', color: '#6EE7B7', match: /community|social|centre|center|tutor|educat|learn|class/i },
];

// ── Constants ────────────────────────────────────────────────────────────────

const NEW_PLACE_MS = 14 * 24 * 60 * 60 * 1000;

// ── Helpers ───────────────────────────────────────────────────────────────────

function matchCluster(venue: Venue): string | null {
  for (const c of CLUSTERS) {
    if (c.match.test(venue.category)) return c.key;
  }
  return null;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ── PlaceRow — compact venue card ─────────────────────────────────────────────
// Design reuses the VenueRow pattern from ExplorePage.
// All trust signals come from real data on the Venue object.

function PlaceRow({ venue, userLat, userLon }: {
  venue: Venue;
  userLat?: number;
  userLon?: number;
}) {
  const navigate = useNavigate();
  const emoji  = getCategoryEmoji(venue.category);
  const today  = venue.checkinsToday ?? 0;
  const isNew  = Date.now() - new Date(venue.createdAt).getTime() < NEW_PLACE_MS;
  const hasRecentCheckin = !!(
    venue.lastCheckinAt &&
    Date.now() - new Date(venue.lastCheckinAt).getTime() < 2 * 60 * 60 * 1000
  );
  const openStatus = getVenueOpenStatus(venue, hasRecentCheckin);

  const actColor = today >= 3 ? '#39D98A' : today >= 1 ? '#FBBF24' : 'rgba(255,255,255,0.15)';
  const actLabel = today >= 3
    ? `${today} here today`
    : today >= 1
      ? 'Active today'
      : null;

  const dist = userLat != null && userLon != null &&
               venue.latitude != null && venue.longitude != null
    ? haversineKm(userLat, userLon, venue.latitude, venue.longitude)
    : undefined;

  const openLabel =
    openStatus.state === 'open' || openStatus.state === 'open_active' ? 'Open'
    : openStatus.state === 'closing_soon'                             ? 'Closing soon'
    : openStatus.state === 'before_open'                              ? 'Opens soon'
    : null;

  return (
    <div
      onClick={() => navigate(`/venue/${venue.slug}`)}
      role="link"
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: '14px', padding: '14px', marginBottom: '8px',
        display: 'flex', gap: '12px', alignItems: 'center',
        cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
        transition: 'background 0.15s',
      }}
    >
      {/* Emoji avatar */}
      <div style={{
        width: '44px', height: '44px', borderRadius: '12px', flexShrink: 0,
        background: 'rgba(255,255,255,0.04)', border: '1px solid var(--color-border)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px',
      }}>
        {emoji}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Name + trust badges */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '4px', flexWrap: 'nowrap' }}>
          <span style={{
            fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '14px',
            color: 'var(--color-text)',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            maxWidth: '160px',
          }}>
            {venue.name}
          </span>
          {venue.isVerified && (
            <span style={{ color: '#39D98A', fontSize: '11px', flexShrink: 0 }}>✓</span>
          )}
          {venue.ownerClaimed && (
            <span style={{
              fontSize: '9px', fontWeight: 700, flexShrink: 0,
              color: '#FBBF24',
              background: 'rgba(251,191,36,0.1)',
              border: '1px solid rgba(251,191,36,0.2)',
              borderRadius: '4px', padding: '1px 5px',
            }}>
              CLAIMED
            </span>
          )}
          {isNew && (
            <span style={{
              fontSize: '9px', fontWeight: 700, flexShrink: 0,
              color: '#39D98A',
              background: 'rgba(57,217,138,0.1)',
              border: '1px solid rgba(57,217,138,0.18)',
              borderRadius: '4px', padding: '1px 5px',
            }}>
              NEW
            </span>
          )}
        </div>

        {/* Activity signals — all community-verified, never hardcoded */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {actLabel && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
              <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: actColor, display: 'inline-block' }} />
              <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: actColor, fontWeight: 600 }}>
                {actLabel}
              </span>
            </span>
          )}
          {openLabel && (
            <span style={{
              fontFamily: 'Inter, sans-serif', fontSize: '11px', fontWeight: 600,
              color: openStatus.state === 'closing_soon' ? '#FBBF24' : '#39D98A',
            }}>
              {openLabel}
            </span>
          )}
          {dist != null && (
            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: 'var(--color-muted)' }}>
              {dist < 1 ? `${Math.round(dist * 1000)}m` : `${dist.toFixed(1)}km`} away
            </span>
          )}
          {venue.lastCheckinAt && !actLabel && (
            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: 'var(--color-muted)' }}>
              Last visit {timeAgo(venue.lastCheckinAt)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── ClusterTile — 2-up grid tile ──────────────────────────────────────────────

function ClusterTile({ cluster, count, hasActive, onClick }: {
  cluster:   Cluster;
  count:     number;
  hasActive: boolean;
  onClick:   () => void;
}) {
  const empty = count === 0;
  return (
    <div
      onClick={onClick}
      role="button"
      style={{
        background: empty ? 'rgba(255,255,255,0.02)' : 'var(--color-surface)',
        border: `1px solid ${empty ? 'var(--color-border)' : cluster.color + '28'}`,
        borderRadius: '16px', padding: '14px',
        cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
        opacity: empty ? 0.55 : 1,
        transition: 'opacity 0.15s',
        minHeight: '88px',
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '22px', lineHeight: 1 }}>{cluster.emoji}</span>
        {hasActive && (
          <span style={{
            width: '7px', height: '7px', borderRadius: '50%',
            background: '#39D98A', display: 'block', marginTop: '3px', flexShrink: 0,
          }} />
        )}
      </div>
      <div>
        <div style={{
          fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '13px',
          color: empty ? 'rgba(255,255,255,0.35)' : 'var(--color-text)',
          marginBottom: '3px', lineHeight: 1.3,
        }}>
          {cluster.label}
        </div>
        <div style={{
          fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 600,
          color: empty ? 'rgba(255,255,255,0.2)' : cluster.color,
        }}>
          {count === 0 ? 'None listed' : count === 1 ? '1 place' : `${count} places`}
        </div>
      </div>
    </div>
  );
}

// ── Loading skeleton ──────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div style={{ padding: '16px' }}>
      <div style={{ height: '26px', width: '55%', background: 'rgba(255,255,255,0.06)', borderRadius: '6px', marginBottom: '6px' }} />
      <div style={{ height: '14px', width: '38%', background: 'rgba(255,255,255,0.04)', borderRadius: '6px', marginBottom: '24px' }} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} style={{ height: '88px', background: 'rgba(255,255,255,0.04)', borderRadius: '16px' }} />
        ))}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function NeighbourhoodPage() {
  const navigate = useNavigate();
  const { displaySuburb: suburb, displayCity: city, displayLat, displayLon, setManualOverride } = useNeighbourhood();
  const { selectedCountry } = useCountry();
  const userLat = displayLat ?? undefined;
  const userLon = displayLon ?? undefined;
  const areaLabel = suburb || city || 'your area';

  const [venues,        setVenues]        = useState<Venue[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [activeCluster, setActiveCluster] = useState<string | null>(null);
  const [showAreaSearch, setShowAreaSearch] = useState(false);
  const [areaInput,      setAreaInput]      = useState('');

  useEffect(() => {
    setLoading(true);
    getAllVenues({
      countryCode: selectedCountry.code,
      suburb: suburb || undefined,
      city:   city   || undefined,
    }).then(v => {
      setVenues(v);
      setLoading(false);
    });
  }, [suburb, city, selectedCountry.code]);

  // ── Derived: venue counts and activity per cluster ────────────────────────

  const { clusterCounts, clusterActive } = useMemo(() => {
    const counts: Record<string, number>  = {};
    const active: Record<string, boolean> = {};
    for (const c of CLUSTERS) { counts[c.key] = 0; active[c.key] = false; }
    for (const v of venues) {
      const key = matchCluster(v);
      if (key) {
        counts[key]++;
        if ((v.checkinsToday ?? 0) >= 1) active[key] = true;
      }
    }
    return { clusterCounts: counts, clusterActive: active };
  }, [venues]);

  // ── Derived: venues for the active cluster (sorted by activity) ───────────

  const drillVenues = useMemo(() => {
    if (!activeCluster) return [];
    const c = CLUSTERS.find(x => x.key === activeCluster);
    if (!c) return [];
    return [...venues]
      .filter(v => c.match.test(v.category))
      .sort((a, b) => (b.checkinsToday ?? 0) - (a.checkinsToday ?? 0));
  }, [venues, activeCluster]);

  // ── Derived: missing categories (gaps) ───────────────────────────────────

  const gaps = useMemo(
    () => CLUSTERS.filter(c => clusterCounts[c.key] === 0),
    [clusterCounts],
  );

  const totalPlaces    = venues.length;
  const totalPresent   = CLUSTERS.filter(c => clusterCounts[c.key] > 0).length;

  // ── No neighbourhood set ─────────────────────────────────────────────────

  if (!loading && !suburb && !city) {
    return (
      <div style={{ padding: '40px 24px', textAlign: 'center' }}>
        <MapPin size={28} color="rgba(255,255,255,0.25)" style={{ marginBottom: '12px' }} />
        <p style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '16px', color: 'var(--color-text)', margin: '0 0 8px' }}>
          Set your neighbourhood
        </p>
        <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: 'var(--color-muted)', margin: '0 0 24px', lineHeight: 1.6 }}>
          Tap the neighbourhood chip at the top to set your area and see what's nearby.
        </p>
        <button
          onClick={() => setManualOverride('Berea', 'Durban')}
          style={{
            background: 'rgba(57,217,138,0.12)', color: '#39D98A',
            border: '1px solid rgba(57,217,138,0.25)',
            borderRadius: '12px', padding: '10px 20px',
            fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '13px',
            cursor: 'pointer',
          }}
        >
          Try Berea
        </button>
      </div>
    );
  }

  if (loading) return <Skeleton />;

  // ── Cluster drill-down ────────────────────────────────────────────────────

  if (activeCluster) {
    const cluster = CLUSTERS.find(c => c.key === activeCluster)!;
    const count   = drillVenues.length;

    return (
      <div style={{ paddingBottom: '80px' }}>

        {/* Sticky header */}
        <div style={{
          position: 'sticky', top: 0, zIndex: 40,
          background: 'rgba(13,17,23,0.95)', backdropFilter: 'blur(12px)',
          borderBottom: '1px solid var(--color-border)',
          padding: '12px 16px',
          display: 'flex', alignItems: 'center', gap: '12px',
        }}>
          <button
            onClick={() => setActiveCluster(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex', flexShrink: 0 }}
            aria-label="Back to overview"
          >
            <ArrowLeft size={20} color="rgba(255,255,255,0.6)" />
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{
              fontFamily: 'Inter, sans-serif', fontWeight: 800, fontSize: '16px',
              color: 'var(--color-text)', margin: 0, lineHeight: 1.2,
            }}>
              {cluster.emoji} {cluster.label}
            </h1>
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: 'var(--color-muted)', margin: '2px 0 0' }}>
              {areaLabel}
            </p>
          </div>
          <span style={{
            fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '13px',
            color: count > 0 ? cluster.color : 'rgba(255,255,255,0.25)',
            flexShrink: 0,
          }}>
            {count} {count === 1 ? 'place' : 'places'}
          </span>
        </div>

        <div style={{ padding: '16px' }}>

          {count === 0 ? (
            // ── Empty cluster — strong CTA ──────────────────────────────────
            <div style={{
              textAlign: 'center', padding: '48px 24px 40px',
              background: 'var(--color-surface)',
              border: '1px dashed rgba(255,255,255,0.08)',
              borderRadius: '20px',
            }}>
              <div style={{ fontSize: '44px', marginBottom: '14px', lineHeight: 1 }}>
                {cluster.emoji}
              </div>
              <p style={{
                fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '17px',
                color: 'var(--color-text)', margin: '0 0 8px',
              }}>
                No {cluster.label.toLowerCase()} in {areaLabel} yet
              </p>
              <p style={{
                fontFamily: 'Inter, sans-serif', fontSize: '13px',
                color: 'var(--color-muted)', margin: '0 0 24px', lineHeight: 1.65,
              }}>
                Be the first to add a {cluster.label.toLowerCase()} here
                and help build the {areaLabel} map.
              </p>
              <button
                onClick={() => navigate('/onboarding')}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '7px',
                  background: '#39D98A', color: '#0D1117',
                  border: 'none', borderRadius: '12px',
                  padding: '12px 24px',
                  fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '14px',
                  cursor: 'pointer',
                }}
              >
                <Plus size={15} />
                Add a place
              </button>
            </div>

          ) : (
            <>
              {/* Venue list */}
              {drillVenues.map(v => (
                <PlaceRow key={v.id} venue={v} userLat={userLat} userLon={userLon} />
              ))}

              {/* Add more CTA */}
              <div
                onClick={() => navigate('/onboarding')}
                role="button"
                style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '12px 16px', marginTop: '4px',
                  background: 'rgba(57,217,138,0.04)',
                  border: '1px dashed rgba(57,217,138,0.18)',
                  borderRadius: '14px', cursor: 'pointer',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                <Plus size={15} color="#39D98A" />
                <span style={{
                  fontFamily: 'Inter, sans-serif', fontSize: '13px',
                  color: 'rgba(255,255,255,0.4)',
                }}>
                  Know another {cluster.label.toLowerCase()} in {areaLabel}?
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // ── Overview mode ─────────────────────────────────────────────────────────

  return (
    <div style={{ padding: '16px 16px calc(80px + env(safe-area-inset-bottom, 0px))' }}>

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: '22px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
          <h1 style={{
            fontFamily: 'Inter, sans-serif', fontWeight: 800, fontSize: '22px',
            color: '#F0F6FC', margin: 0, lineHeight: 1.2,
          }}>
            Discover
          </h1>
          {/* Neighbourhood switcher pill */}
          <button
            onClick={() => { setShowAreaSearch(s => !s); setAreaInput(''); }}
            style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              background: 'var(--color-surface)', border: '1px solid var(--color-border)',
              borderRadius: '20px', padding: '6px 11px',
              cursor: 'pointer',
              fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 600,
              color: 'var(--color-muted)',
              WebkitTapHighlightColor: 'transparent',
            } as React.CSSProperties}
            aria-label="Change neighbourhood"
          >
            <MapPin size={11} color="rgba(255,255,255,0.4)" />
            {areaLabel}
            <ChevronDown size={11} />
          </button>
        </div>

        {/* Inline area search */}
        {showAreaSearch && (
          <div style={{ display: 'flex', gap: '8px', margin: '10px 0' }}>
            <input
              autoFocus
              value={areaInput}
              onChange={e => setAreaInput(e.target.value)}
              placeholder="e.g. Berea, Soweto, Sandton…"
              style={{
                flex: 1, padding: '9px 13px', borderRadius: '10px',
                background: 'var(--color-surface)', border: '1px solid rgba(57,217,138,0.3)',
                color: 'var(--color-text)', fontFamily: 'Inter, sans-serif', fontSize: '14px',
                outline: 'none',
              }}
              onKeyDown={e => {
                if (e.key === 'Enter' && areaInput.trim()) {
                  setManualOverride(areaInput.trim());
                  setShowAreaSearch(false);
                  setActiveCluster(null);
                }
                if (e.key === 'Escape') setShowAreaSearch(false);
              }}
            />
            <button
              onClick={() => {
                if (areaInput.trim()) {
                  setManualOverride(areaInput.trim());
                  setShowAreaSearch(false);
                  setActiveCluster(null);
                }
              }}
              style={{
                padding: '9px 14px', borderRadius: '10px', border: 'none',
                background: '#39D98A', color: '#0D1117',
                fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '13px',
                cursor: 'pointer', flexShrink: 0,
              }}
            >
              Go
            </button>
            <button
              onClick={() => setShowAreaSearch(false)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: '40px', borderRadius: '10px', border: '1px solid var(--color-border)',
                background: 'transparent', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', flexShrink: 0,
              }}
              aria-label="Close"
            >
              <X size={14} />
            </button>
          </div>
        )}

        <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: 'var(--color-muted)', margin: 0 }}>
          {totalPlaces === 0
            ? 'No places listed yet — be the first to add one'
            : `${totalPlaces} place${totalPlaces !== 1 ? 's' : ''} across ${totalPresent} categor${totalPresent !== 1 ? 'ies' : 'y'} — tap a type to explore`
          }
        </p>
      </div>

      {/* ── Category tile grid ──────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '28px' }}>
        {CLUSTERS.map(c => (
          <ClusterTile
            key={c.key}
            cluster={c}
            count={clusterCounts[c.key]}
            hasActive={clusterActive[c.key]}
            onClick={() => setActiveCluster(c.key)}
          />
        ))}
      </div>

      {/* ── Places locals honour ────────────────────────────────────────── */}
      <HonouredPlacesRail suburb={suburb || undefined} city={city || undefined} showTeaser={false} />

      {/* ── Help grow your neighbourhood — missing category gaps ────────── */}
      {gaps.length > 0 && (
        <div>
          <h2 style={{
            fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '15px',
            color: 'var(--color-text)', margin: '0 0 12px', letterSpacing: '-0.01em',
          }}>
            Help grow {areaLabel}
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
            {gaps.slice(0, 4).map(c => (
              <div
                key={c.key}
                onClick={() => navigate('/onboarding')}
                role="button"
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '12px 14px',
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px dashed rgba(255,255,255,0.09)',
                  borderRadius: '14px', cursor: 'pointer',
                  WebkitTapHighlightColor: 'transparent',
                  transition: 'background 0.15s',
                }}
              >
                <span style={{ fontSize: '18px', flexShrink: 0 }}>{c.emoji}</span>
                <p style={{
                  fontFamily: 'Inter, sans-serif', fontSize: '13px',
                  color: 'var(--color-muted)', margin: 0, flex: 1, lineHeight: 1.4,
                }}>
                  No <strong style={{ color: 'rgba(255,255,255,0.55)', fontWeight: 600 }}>
                    {c.label.toLowerCase()}
                  </strong> listed in {areaLabel} yet
                </p>
                <span style={{
                  fontFamily: 'Inter, sans-serif', fontSize: '12px',
                  color: '#39D98A', fontWeight: 700, flexShrink: 0,
                }}>
                  Add →
                </span>
              </div>
            ))}
          </div>

          {/* Remaining gaps collapsed into a chip row if more than 4 */}
          {gaps.length > 4 && (
            <p style={{
              fontFamily: 'Inter, sans-serif', fontSize: '12px',
              color: 'rgba(255,255,255,0.25)', margin: '4px 0 0',
            }}>
              {gaps.slice(4).map(c => c.emoji + ' ' + c.label).join(' · ')} · also missing
            </p>
          )}
        </div>
      )}

      {/* ── When all categories covered — affirming message ─────────────── */}
      {gaps.length === 0 && totalPlaces > 0 && (
        <div style={{
          background: 'rgba(57,217,138,0.05)',
          border: '1px solid rgba(57,217,138,0.15)',
          borderRadius: '14px', padding: '14px 16px',
          display: 'flex', alignItems: 'center', gap: '10px',
        }}>
          <span style={{ fontSize: '18px' }}>🏘️</span>
          <p style={{
            fontFamily: 'Inter, sans-serif', fontSize: '13px',
            color: 'rgba(255,255,255,0.55)', margin: 0, lineHeight: 1.5,
          }}>
            <strong style={{ color: '#39D98A' }}>{areaLabel}</strong> has places across all major categories.
            Tap any category to explore.
          </p>
        </div>
      )}

    </div>
  );
}
