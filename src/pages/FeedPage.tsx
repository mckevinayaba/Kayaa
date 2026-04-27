import { useState, useMemo, useEffect, useRef } from 'react';
import { Search, X, MapPin, PenSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import useLocation from '../hooks/useLocation';
import { haversineKm } from '../lib/geocode';
import { getAreaTier, tierScore } from '../lib/areaGroups';
import NeighbourhoodGate from '../components/NeighbourhoodGate';
import PostComposer from '../components/PostComposer';
import {
  getAllVenues, getAllEvents, getActiveStories,
  getTrendingPlaces, getHappeningTonight, getNewPlaces,
  getMostLovedPlaces, getGlobalActivity,
  getNeighbourhoodPosts,
  getHeadingThereCountsBatch, getVibeWinnersBatch,
  getActiveStoryVenuesBatch, getActiveVenueStory,
  getUserPostsForFeed, getSafetyAlerts,
  likePost, unlikePost, getUserLikedPosts,
} from '../lib/api';
import type { TrendingVenue, TonightEvent, ActivityItem, NeighbourhoodPost, VibeType, VenueStory24, UserPost } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import type { Venue, Event, Story } from '../types';
import VenueCard from '../components/VenueCard';
import StoryViewer from '../components/StoryViewer';
import ActivityMoment from '../components/ActivityMoment';
import EventRail from '../components/EventRail';
import StoriesStrip from '../components/StoriesStrip';
import TrendingRail from '../components/TrendingRail';
import HappeningTonight from '../components/HappeningTonight';
import MostLovedRail from '../components/MostLovedRail';
import CategoryStrip from '../components/CategoryStrip';
import { useCountry } from '../contexts/CountryContext';

// ─── Scope model ──────────────────────────────────────────────────────────────
//
//  this_neighbourhood  Strict suburb match   GPS ≤ 8 km
//  nearby              Same city / cluster   GPS ≤ 30 km
//  city_wide           Full metro            GPS ≤ 60 km
//  explore_all         No geo restriction    everything clean
//
// Default is chosen after data loads:
//   this_neighbourhood  if ≥ LOCAL_THRESHOLD venues exist locally
//   nearby              otherwise
//
// ─────────────────────────────────────────────────────────────────────────────

type FeedScope = 'this_neighbourhood' | 'nearby' | 'city_wide' | 'explore_all';
type ActivityFilter = 'All' | 'Open now' | 'Busy now' | 'Events today';

const LOCAL_THRESHOLD = 3; // min local venues before defaulting to nearby
const ACTIVITY_FILTERS: ActivityFilter[] = ['All', 'Open now', 'Busy now', 'Events today'];

// Key → venue.category matcher (covers all country variants stored in DB)
const CAT_KEY_MATCH: Record<string, (cat: string) => boolean> = {
  barbershop: cat => /barb|kinyozi|coiff/i.test(cat),
  salon:      cat => /salon|nywele|beaut/i.test(cat),
  food:       cat => /shisan|choma|buka|bukat|lishe|chop|maquis/i.test(cat),
  tavern:     cat => /tavern|beer.?parlour|cabaret|drinking.?bar/i.test(cat),
  spaza:      cat => /spaza|duka|kiosk|provision|boutique|alimentation/i.test(cat),
  church:     cat => /church|kanisa|.?glise|chapel|faith|fellow/i.test(cat),
  carwash:    cat => /car.?wash|lavage/i.test(cat),
  cafe:       cat => /caf.?|coffee|boulang|eatery|bakery/i.test(cat),
  gym:        cat => /gym|fitness|salle.?de.?sport/i.test(cat),
  market:     cat => /market|soko|march.|tablier/i.test(cat),
  mechanic:   cat => /mechanic|garage|vulcan|m.?canicien/i.test(cat),
  other:      cat => !Object.entries(CAT_KEY_MATCH).filter(([k]) => k !== 'other').some(([, fn]) => fn(cat)),
};

const SCOPE_LABELS: Record<FeedScope, string> = {
  this_neighbourhood: 'My area',
  nearby: 'Nearby',
  city_wide: 'City-wide',
  explore_all: 'Explore',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

const TEST_NAMES = /\b(test|demo|example|setup a startup)\b/i;

function isCleanVenue(v: Venue): boolean {
  return v.description.trim().length >= 10 && !TEST_NAMES.test(v.name);
}

// Single truth function for whether a venue falls inside a given scope.
// GPS path: haversine distance (fast, accurate once coords are populated).
// Text path: cluster-based tier lookup — prevents cross-city bleed.
function venueInScope(
  v: Venue,
  scope: FeedScope,
  suburb: string,
  city: string,
  userLat?: number,
  userLon?: number,
): boolean {
  if (scope === 'explore_all') return true;

  const hasGPS = userLat != null && userLon != null;
  const hasCoords = v.latitude != null && v.longitude != null;

  if (hasGPS && hasCoords) {
    const km = haversineKm(userLat!, userLon!, v.latitude!, v.longitude!);
    switch (scope) {
      case 'this_neighbourhood': return km <= 8;
      case 'nearby':             return km <= 30;
      case 'city_wide':          return km <= 60;
    }
  }

  // Text fallback: use explicit cluster model so e.g. a Khayelitsha venue is
  // always 'outside' for a Honeydew user (their clusters never overlap).
  const tier = getAreaTier(v.neighborhood, v.city, suburb, city);
  switch (scope) {
    case 'this_neighbourhood': return tier === 'exact';
    case 'nearby':             return tier === 'exact' || tier === 'cluster';
    case 'city_wide':          return tier === 'exact' || tier === 'cluster' || tier === 'metro';
  }
}

function areaScore(venue: Venue, suburb: string, city: string): number {
  const tier = getAreaTier(venue.neighborhood, venue.city, suburb, city);
  return tierScore(tier);
}

// Filter + sort main venue list by scope.
function filterAndRankByScope(
  venues: Venue[],
  scope: FeedScope,
  suburb: string,
  city: string,
  userLat?: number,
  userLon?: number,
): Venue[] {
  const clean = venues.filter(isCleanVenue);
  const filtered = clean.filter(v => venueInScope(v, scope, suburb, city, userLat, userLon));

  if (userLat != null && userLon != null) {
    return [...filtered].sort((a, b) => {
      const aC = a.latitude != null && a.longitude != null;
      const bC = b.latitude != null && b.longitude != null;
      if (aC && bC) return haversineKm(userLat, userLon, a.latitude!, a.longitude!) - haversineKm(userLat, userLon, b.latitude!, b.longitude!);
      if (aC) return -1;
      if (bC) return 1;
      return areaScore(b, suburb, city) - areaScore(a, suburb, city);
    });
  }
  return [...filtered].sort((a, b) => areaScore(b, suburb, city) - areaScore(a, suburb, city));
}

// Rail scope filter: tries to keep results local; auto-expands with a flag
// so the UI can show honest copy about where results are coming from.
interface RailResult<T> {
  venues: T[];
  expanded: boolean;
  expandedScope: FeedScope | null;
}

function scopeFilterRail<T extends Venue>(
  venues: T[],
  scope: FeedScope,
  suburb: string,
  city: string,
  userLat?: number,
  userLon?: number,
): RailResult<T> {
  const none: RailResult<T> = { venues: [], expanded: false, expandedScope: null };
  if (venues.length === 0) return none;

  // explore_all and city_wide: show as-is, already filtered at API level
  if (scope === 'explore_all' || scope === 'city_wide') {
    return { venues, expanded: false, expandedScope: null };
  }

  const matching = venues.filter(v => venueInScope(v, scope, suburb, city, userLat, userLon));
  if (matching.length >= 1) return { venues: matching, expanded: false, expandedScope: null };

  // Not enough local — try next scope tier
  if (scope === 'this_neighbourhood') {
    const nearbyMatch = venues.filter(v => venueInScope(v, 'nearby', suburb, city, userLat, userLon));
    if (nearbyMatch.length >= 1) return { venues: nearbyMatch, expanded: true, expandedScope: 'nearby' };
  }

  // Still nothing — surface whatever was returned (already city-scoped by API)
  return { venues: venues.slice(0, 3), expanded: true, expandedScope: 'city_wide' };
}

function applyActivityFilter(venues: Venue[], filter: ActivityFilter, ids: Set<string>): Venue[] {
  switch (filter) {
    case 'Open now':     return venues.filter(v => v.venueStatus !== 'closed');
    case 'Busy now':     return venues.filter(v => v.venueStatus === 'busy');
    case 'Events today': return venues.filter(v => ids.has(v.id));
    default:             return venues;
  }
}

function applyCategoryFilter(venues: Venue[], cat: string, ids: Set<string>): Venue[] {
  if (cat === 'All') return venues;
  if (cat === 'events' || cat === 'Events') return venues.filter(v => ids.has(v.id));
  const matchFn = CAT_KEY_MATCH[cat];
  if (matchFn) return venues.filter(v => matchFn(v.category));
  return venues.filter(v => v.category === cat);
}

const ACTIVITY_AFTER = new Set([0, 1, 2]);

// ─── Scope selector ───────────────────────────────────────────────────────────

function ScopeSelector({ value, onChange }: { value: FeedScope; onChange: (s: FeedScope) => void }) {
  // Show 4 chips; "Explore" is visually de-emphasised
  const scopes: FeedScope[] = ['this_neighbourhood', 'nearby', 'city_wide', 'explore_all'];
  return (
    <div style={{ display: 'flex', gap: '6px', marginBottom: '14px', overflowX: 'auto', scrollbarWidth: 'none', paddingBottom: '2px' } as React.CSSProperties}>
      {scopes.map(s => {
        const active = value === s;
        const isExplore = s === 'explore_all';
        return (
          <button
            key={s}
            onClick={() => onChange(s)}
            style={{
              padding: '5px 13px',
              borderRadius: '20px',
              border: active ? 'none' : `1px solid ${isExplore ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.1)'}`,
              background: active ? 'rgba(57,217,138,0.15)' : 'transparent',
              color: active ? '#39D98A' : isExplore ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.45)',
              fontSize: '12px',
              fontWeight: 600,
              fontFamily: 'DM Sans, sans-serif',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              flexShrink: 0,
              transition: 'all 0.15s',
            }}
          >
            {SCOPE_LABELS[s]}
          </button>
        );
      })}
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function VenueCardSkeleton() {
  return (
    <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '16px', padding: '16px', marginBottom: '12px' }}>
      <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start', marginBottom: '12px' }}>
        <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: 'var(--color-surface2)', flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div style={{ height: '16px', width: '55%', background: 'var(--color-surface2)', borderRadius: '6px', marginBottom: '8px' }} />
          <div style={{ height: '12px', width: '35%', background: 'var(--color-surface2)', borderRadius: '6px' }} />
        </div>
      </div>
      <div style={{ height: '13px', width: '85%', background: 'var(--color-surface2)', borderRadius: '6px', marginBottom: '16px' }} />
      <div style={{ height: '1px', background: 'var(--color-border)', marginBottom: '12px' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ height: '12px', width: '25%', background: 'var(--color-surface2)', borderRadius: '6px' }} />
        <div style={{ height: '30px', width: '80px', background: 'var(--color-surface2)', borderRadius: '20px' }} />
      </div>
    </div>
  );
}

// ─── Honest context notes ─────────────────────────────────────────────────────

function ScopeNote({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: '8px',
      background: 'rgba(57,217,138,0.06)',
      border: '1px solid rgba(57,217,138,0.14)',
      borderRadius: '10px', padding: '9px 12px',
      marginBottom: '12px',
    }}>
      <span style={{ fontSize: '13px', lineHeight: 1 }}>📍</span>
      <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.52)', lineHeight: 1.5, margin: 0, fontFamily: 'DM Sans, sans-serif' }}>
        {children}
      </p>
    </div>
  );
}

// ─── Empty states ─────────────────────────────────────────────────────────────

function EmptyState({ onCompose, onCheckin, onAddPlace }: {
  onCompose: () => void;
  onCheckin: () => void;
  onAddPlace: () => void;
}) {
  return (
    <div style={{ padding: '40px 16px', textAlign: 'center' }}>
      <h3 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '18px', color: '#F0F6FC', marginBottom: '8px' }}>
        Your neighbourhood is quiet right now.
      </h3>
      <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.45)', marginBottom: '28px', lineHeight: 1.5 }}>
        Be the first to share something.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {[
          { emoji: '📝', label: 'Share something you know', action: onCompose },
          { emoji: '📍', label: 'Check in somewhere nearby', action: onCheckin },
          { emoji: '➕', label: 'Add a place to kayaa', action: onAddPlace },
        ].map(({ emoji, label, action }) => (
          <button
            key={label}
            onClick={action}
            style={{
              display: 'flex', alignItems: 'center', gap: '14px',
              background: '#161B22', border: '1px solid #21262D',
              borderRadius: '14px', padding: '14px 16px', cursor: 'pointer',
              textAlign: 'left', width: '100%',
            }}
          >
            <span style={{ fontSize: '24px' }}>{emoji}</span>
            <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: '#F0F6FC', fontWeight: 500 }}>{label}</span>
            <span style={{ marginLeft: 'auto', color: '#39D98A', fontSize: '16px' }}>→</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function LocalEmptyState({ scope, areaLabel, onExpand }: {
  scope: FeedScope;
  areaLabel: string;
  onExpand: (s: FeedScope) => void;
}) {
  const nextScope: FeedScope = scope === 'this_neighbourhood' ? 'nearby'
    : scope === 'nearby' ? 'city_wide' : 'explore_all';

  const nextLabel = SCOPE_LABELS[nextScope];

  return (
    <div style={{ padding: '40px 24px', textAlign: 'center' }}>
      <div style={{ fontSize: '36px', marginBottom: '12px' }}>📍</div>
      <h3 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '15px', color: '#fff', marginBottom: '8px' }}>
        {scope === 'this_neighbourhood' ? 'No places in your neighbourhood yet' : 'No places found in this area'}
      </h3>
      <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.45)', lineHeight: 1.5, marginBottom: '20px' }}>
        {scope === 'this_neighbourhood'
          ? `No places are registered near ${areaLabel} yet.`
          : `Nothing found at this scope for ${areaLabel}.`}
      </p>
      {scope !== 'explore_all' && (
        <button
          onClick={() => onExpand(nextScope)}
          style={{
            background: 'rgba(57,217,138,0.1)', color: '#39D98A',
            border: '1px solid rgba(57,217,138,0.25)', borderRadius: '12px',
            padding: '10px 22px', fontFamily: 'DM Sans, sans-serif',
            fontWeight: 600, fontSize: '13px', cursor: 'pointer',
          }}
        >
          Show {nextLabel} →
        </button>
      )}
    </div>
  );
}

// ─── User Post Card ───────────────────────────────────────────────────────────

const POST_CAT: Record<string, { label: string; color: string; bg: string }> = {
  story:          { label: 'Story',          color: '#93C5FD', bg: 'rgba(96,165,250,0.12)'  },
  news:           { label: 'News',           color: '#FCD34D', bg: 'rgba(245,158,11,0.12)'  },
  alert:          { label: 'Alert',          color: '#FCA5A5', bg: 'rgba(239,68,68,0.12)'   },
  question:       { label: 'Question',       color: '#C4B5FD', bg: 'rgba(167,139,250,0.12)' },
  recommendation: { label: 'Tip',            color: '#6EE7B7', bg: 'rgba(57,217,138,0.12)'  },
  event:          { label: 'Event',          color: '#6EE7B7', bg: 'rgba(52,211,153,0.12)'  },
  spotted:        { label: 'Spotted',        color: '#C4B5FD', bg: 'rgba(139,92,246,0.12)'  },
};

function timeAgoFeed(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

function initials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

interface UserPostCardProps {
  post: UserPost;
  liked: boolean;
  onLike: (postId: string, currentlyLiked: boolean) => void;
}

function UserPostCard({ post, liked, onLike }: UserPostCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [localLiked, setLocalLiked] = useState(liked);
  const [localCount, setLocalCount] = useState(post.likesCount);
  const cat = POST_CAT[post.category] ?? { label: post.category, color: '#94A3B8', bg: 'rgba(148,163,184,0.12)' };
  const authorName = post.userId ? 'Neighbour' : 'kayaa team';
  const authorInitials = initials(authorName);
  const isAlert = post.category === 'alert';
  const isLong = post.content.length > 240;

  // Sync if parent liked state changes (e.g. after data load)
  useEffect(() => { setLocalLiked(liked); }, [liked]);

  function handleLike() {
    const next = !localLiked;
    setLocalLiked(next);
    setLocalCount(c => next ? c + 1 : Math.max(0, c - 1));
    onLike(post.id, localLiked);
  }

  return (
    <div style={{
      background: '#161B22',
      border: `1px solid ${isAlert ? 'rgba(239,68,68,0.4)' : '#21262D'}`,
      borderLeft: isAlert ? '3px solid #EF4444' : undefined,
      borderRadius: '12px',
      padding: '14px 16px',
      marginBottom: '10px',
    }}>
      {/* Top row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
        {/* Avatar */}
        <div style={{
          width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0,
          background: 'rgba(57,217,138,0.12)', border: '1px solid rgba(57,217,138,0.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '11px', color: '#39D98A',
        }}>
          {authorInitials}
        </div>
        {/* Name + area */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 700, fontSize: '13px', color: '#F0F6FC' }}>
            {authorName}
          </span>
          <span style={{ color: 'rgba(255,255,255,0.35)', margin: '0 4px', fontSize: '12px' }}>·</span>
          <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: 'rgba(255,255,255,0.45)' }}>
            {post.neighbourhood}
          </span>
        </div>
        {/* Category badge */}
        <span style={{
          fontFamily: 'DM Sans, sans-serif', fontSize: '10px', fontWeight: 700,
          color: cat.color, background: cat.bg, borderRadius: '20px', padding: '2px 9px',
          whiteSpace: 'nowrap', flexShrink: 0,
        }}>
          {cat.label}
        </span>
        {/* Time */}
        <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.3)', flexShrink: 0 }}>
          {timeAgoFeed(post.createdAt)}
        </span>
      </div>

      {/* Content */}
      <p style={{
        fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: 'rgba(240,246,252,0.9)',
        lineHeight: 1.6, margin: 0,
        display: !expanded && isLong ? '-webkit-box' : undefined,
        WebkitLineClamp: !expanded && isLong ? 3 : undefined,
        WebkitBoxOrient: !expanded && isLong ? 'vertical' : undefined,
        overflow: !expanded && isLong ? 'hidden' : undefined,
      } as React.CSSProperties}>
        {post.content}
      </p>
      {isLong && (
        <button
          onClick={() => setExpanded(e => !e)}
          style={{ background: 'none', border: 'none', color: '#39D98A', fontSize: '12px', fontWeight: 600, cursor: 'pointer', padding: '4px 0 0', fontFamily: 'DM Sans, sans-serif' }}
        >
          {expanded ? 'Show less' : 'Read more'}
        </button>
      )}

      {/* Image */}
      {post.imageUrl && (
        <img src={post.imageUrl} alt="Post" loading="lazy" style={{ width: '100%', maxHeight: '200px', objectFit: 'cover', borderRadius: '8px', marginTop: '10px', border: '1px solid #21262D' }} />
      )}

      {/* Footer */}
      <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button
          onClick={handleLike}
          style={{
            background: 'none', border: 'none',
            color: localLiked ? '#39D98A' : 'rgba(255,255,255,0.35)',
            fontFamily: 'DM Sans, sans-serif', fontSize: '13px', cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', gap: '5px',
            padding: 0, transition: 'color 0.15s',
          }}
        >
          <span style={{ fontSize: '15px' }}>{localLiked ? '👍' : '👍'}</span>
          <span style={{ fontWeight: localLiked ? 700 : 400 }}>{localCount > 0 ? localCount : ''}</span>
        </button>
        <button disabled style={{
          background: 'none', border: 'none', color: 'rgba(255,255,255,0.25)',
          fontFamily: 'DM Sans, sans-serif', fontSize: '13px', cursor: 'default',
          display: 'inline-flex', alignItems: 'center', gap: '5px', padding: 0,
        }}>
          💬 Reply
        </button>
      </div>
    </div>
  );
}

// ─── Safety Alert Banner ──────────────────────────────────────────────────────

function SafetyAlertBanner({ post }: { post: UserPost }) {
  return (
    <div style={{
      background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.35)',
      borderLeft: '3px solid #EF4444', borderRadius: '12px', padding: '12px 14px', marginBottom: '10px',
    }}>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
        <span style={{ fontSize: '16px', flexShrink: 0 }}>🚨</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', fontWeight: 700, color: '#FCA5A5', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Safety Alert</span>
            <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>{post.neighbourhood} · {timeAgoFeed(post.createdAt)}</span>
          </div>
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: 'rgba(240,246,252,0.85)', lineHeight: 1.55, margin: 0 }}>
            {post.content}
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── New Places section ───────────────────────────────────────────────────────

const NEW_CAT_COLOR: Record<string, string> = {
  Barbershop: '#39D98A', Shisanyama: '#F5A623', Tavern: '#60A5FA',
  Café: '#F59E0B', Church: '#A78BFA', Carwash: '#34D399',
  'Spaza Shop': '#60A5FA', Salon: '#F472B6', Tutoring: '#34D399',
  'Sports Ground': '#FB923C', 'Home Business': '#94A3B8',
};
const NEW_CAT_EMOJI: Record<string, string> = {
  Barbershop: '✂️', Shisanyama: '🔥', Tavern: '🍺', Café: '☕',
  Church: '⛪', Carwash: '🚗', 'Spaza Shop': '🏪', Salon: '💅',
  Tutoring: '📚', 'Sports Ground': '⚽', 'Home Business': '🏠',
};

function NewPlacesSection({ venues, expandedNote }: { venues: Venue[]; expandedNote?: string }) {
  const navigate = useNavigate();
  if (venues.length === 0) return null;
  return (
    <div style={{ marginBottom: '20px' }}>
      <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '15px', color: 'var(--color-text)', marginBottom: expandedNote ? '6px' : '12px' }}>
        New in your neighbourhood 🆕
      </h2>
      {expandedNote && (
        <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.38)', marginBottom: '10px', fontFamily: 'DM Sans, sans-serif' }}>
          {expandedNote}
        </p>
      )}
      <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', scrollbarWidth: 'none', marginLeft: '-16px', paddingLeft: '16px', marginRight: '-16px', paddingRight: '16px', paddingBottom: '4px', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
        {venues.map(venue => {
          const emoji = NEW_CAT_EMOJI[venue.category] ?? '📍';
          const color = NEW_CAT_COLOR[venue.category] ?? '#39D98A';
          return (
            <div key={venue.id} onClick={() => navigate(`/venue/${venue.slug}`)} style={{ flexShrink: 0, width: '150px', background: 'var(--color-surface)', border: '1px solid rgba(57,217,138,0.25)', borderRadius: '14px', padding: '12px', cursor: 'pointer' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: `${color}18`, border: `1px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', marginBottom: '8px' }}>
                {emoji}
              </div>
              <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '13px', color: 'var(--color-text)', marginBottom: '6px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {venue.name}
              </div>
              <span style={{ fontSize: '10px', fontWeight: 700, color: '#39D98A', background: 'rgba(57,217,138,0.12)', padding: '2px 8px', borderRadius: '20px', display: 'inline-block' }}>
                Just joined
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Board & Jobs teasers ─────────────────────────────────────────────────────

const BOARD_CAT_COLORS: Record<string, string> = {
  announcement: '#60A5FA', lost_found: '#F5A623', question: '#A78BFA',
  recommendation: '#39D98A', event: '#F472B6', general: '#94A3B8',
};
const BOARD_CAT_LABELS: Record<string, string> = {
  announcement: 'Announcement', lost_found: 'Lost & Found', question: 'Question',
  recommendation: 'Recommendation', event: 'Event', general: 'General',
};
function teaserTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function BoardTeaser({ posts }: { posts: NeighbourhoodPost[] }) {
  const navigate = useNavigate();
  return (
    <div style={{ marginBottom: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '12px' }}>
        <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '15px', color: 'var(--color-text)', margin: 0 }}>From the neighbourhood board</h2>
        <button onClick={() => navigate('/board')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', color: 'var(--color-accent)', fontWeight: 600, fontFamily: 'DM Sans, sans-serif' }}>See all →</button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {posts.map(post => {
          const color = BOARD_CAT_COLORS[post.category] ?? '#94A3B8';
          return (
            <div key={post.id} onClick={() => navigate('/board')} style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '12px', cursor: 'pointer' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color, background: `${color}18`, padding: '2px 8px', borderRadius: '20px' }}>{BOARD_CAT_LABELS[post.category] ?? post.category}</span>
                <span style={{ fontSize: '11px', color: 'var(--color-muted)' }}>{teaserTime(post.createdAt)}</span>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--color-text)', margin: 0, lineHeight: 1.5, fontFamily: 'DM Sans, sans-serif', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' } as React.CSSProperties}>
                {post.content}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── PWA Install Banner ───────────────────────────────────────────────────────

function InstallBanner() {
  const [show, setShow] = useState(false);
  const [showFallback, setShowFallback] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const deferredRef = useRef<any>(null);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function onPrompt(e: any) { e.preventDefault(); deferredRef.current = e; }
    window.addEventListener('beforeinstallprompt' as keyof WindowEventMap, onPrompt as EventListener);
    return () => window.removeEventListener('beforeinstallprompt' as keyof WindowEventMap, onPrompt as EventListener);
  }, []);

  useEffect(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (navigator as any).standalone === true;
    if (isStandalone) return;
    if (localStorage.getItem('kayaa_install_dismissed')) return;
    const visits = parseInt(localStorage.getItem('kayaa_feed_visits') ?? '0') + 1;
    localStorage.setItem('kayaa_feed_visits', String(visits));
    if (visits >= 2) setShow(true);
  }, []);

  if (!show) return null;

  function handleAdd() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (deferredRef.current && (deferredRef.current as any).prompt) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (deferredRef.current as any).prompt();
      setShow(false);
    } else {
      setShowFallback(true);
    }
  }

  return (
    <div style={{ position: 'fixed', bottom: '64px', left: 0, right: 0, zIndex: 40, background: 'var(--color-surface)', borderTop: '1px solid var(--color-border)', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '13px', color: 'var(--color-text)', marginBottom: '2px' }}>Add Kayaa to your home screen</div>
        {showFallback
          ? <div style={{ fontSize: '12px', color: 'var(--color-muted)', lineHeight: 1.4 }}>Tap the share button in your browser, then <strong>Add to Home Screen</strong></div>
          : <div style={{ fontSize: '12px', color: 'var(--color-muted)' }}>Open it like an app, any time.</div>}
      </div>
      {!showFallback && (
        <button onClick={handleAdd} style={{ background: 'var(--color-accent)', color: '#000', border: 'none', borderRadius: '10px', padding: '8px 18px', fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '13px', cursor: 'pointer', flexShrink: 0 }}>Add</button>
      )}
      <button onClick={() => { localStorage.setItem('kayaa_install_dismissed', '1'); setShow(false); }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--color-muted)', flexShrink: 0, padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <X size={16} />
      </button>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function FeedPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { suburb, city, lat: userLat, lon: userLon, needsConfirmation } = useLocation();
  const { selectedCountry, categoryLabels } = useCountry();

  // Raw data from API (unfiltered beyond isCleanVenue)
  const [rawVenues, setRawVenues] = useState<Venue[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [rawTrending, setRawTrending] = useState<TrendingVenue[]>([]);
  const [tonight, setTonight] = useState<TonightEvent[]>([]);
  const [rawNewPlaces, setRawNewPlaces] = useState<Venue[]>([]);
  const [rawMostLoved, setRawMostLoved] = useState<Venue[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [boardPosts, setBoardPosts] = useState<NeighbourhoodPost[]>([]);
  const [userPosts, setUserPosts] = useState<UserPost[]>([]);
  const [safetyAlerts, setSafetyAlerts] = useState<UserPost[]>([]);
  const [likedPostIds, setLikedPostIds] = useState<Set<string>>(new Set());
  const [showComposer, setShowComposer] = useState(false);
  const [loading, setLoading] = useState(true);

  // Interactivity data (Sprint 5)
  const [headingCounts, setHeadingCounts] = useState<Record<string, number>>({});
  const [vibeWinners, setVibeWinners] = useState<Record<string, { vibe: VibeType; count: number } | null>>({});
  const [activeStoryVenueIds, setActiveStoryVenueIds] = useState<Set<string>>(new Set());
  const [viewingStory, setViewingStory] = useState<{ story: VenueStory24; venueName: string; venueCategory: string } | null>(null);

  // UI filters
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [search, setSearch] = useState('');

  // Scope: starts at 'nearby' (safe default); set to smart default after data loads.
  // manualScope tracks whether the user explicitly picked a scope this session.
  const [scope, setScope] = useState<FeedScope>('nearby');
  const [manualScope, setManualScope] = useState<FeedScope | null>(null);

  const [showAreaGate, setShowAreaGate] = useState(needsConfirmation);

  const areaLabel = suburb || city || 'Your area';

  // Reset manual scope override when user changes area so smart default re-applies
  useEffect(() => {
    setManualScope(null);
  }, [areaLabel]);

  const countryChips = useMemo(() => [
    { key: 'All', label: 'All' },
    ...categoryLabels.map(c => ({ key: c.key, label: `${c.emoji} ${c.label}` })),
    { key: 'events', label: '📅 Events' },
  ], [categoryLabels]);

  useEffect(() => {
    Promise.all([
      getAllVenues(selectedCountry.code),
      getAllEvents(),
      getActiveStories(),
      getTrendingPlaces(city),
      getHappeningTonight(),
      getNewPlaces(city),
      getMostLovedPlaces(city),
      getGlobalActivity(),
      getNeighbourhoodPosts(areaLabel),
      getUserPostsForFeed(),
      getSafetyAlerts(),
    ]).then(([v, e, s, tr, tn, np, ml, act, bp, up, sa]) => {
      const venues = v as Venue[];
      setRawVenues(venues);
      setEvents(e);
      setStories(s);
      setRawTrending(tr);
      setTonight(tn);
      setRawNewPlaces(np);
      setRawMostLoved(ml);
      setActivity(act);
      setBoardPosts((bp as NeighbourhoodPost[]).slice(0, 2));
      const posts = up as UserPost[];
      setUserPosts(posts);
      setSafetyAlerts(sa as UserPost[]);
      setLoading(false);

      // Load which posts the current user has liked
      if (user && posts.length > 0) {
        getUserLikedPosts(user.id, posts.map(p => p.id))
          .then(ids => setLikedPostIds(ids))
          .catch(() => {});
      }

      // Smart default scope: use this_neighbourhood only if enough local places exist.
      // Respect manual override if user already tapped a chip.
      if (!manualScope) {
        const localCount = venues
          .filter(isCleanVenue)
          .filter(u => venueInScope(u, 'this_neighbourhood', suburb, city, userLat, userLon))
          .length;
        setScope(localCount >= LOCAL_THRESHOLD ? 'this_neighbourhood' : 'nearby');
      }

      // Batch-load interactivity data for all venues
      const venueIds = venues.map(v => v.id);
      if (venueIds.length > 0) {
        Promise.all([
          getHeadingThereCountsBatch(venueIds),
          getVibeWinnersBatch(venueIds),
          getActiveStoryVenuesBatch(venueIds),
        ]).then(([hc, vw, as_]) => {
          setHeadingCounts(hc);
          setVibeWinners(vw);
          setActiveStoryVenueIds(as_);
        }).catch(() => {/* non-critical, fail silently */});
      }
    });
  }, [areaLabel, selectedCountry.code]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleScopeChange(s: FeedScope) {
    setManualScope(s);
    setScope(s);
    setCategoryFilter('All');
    setActivityFilter('All');
  }

  // ─── Computed: main venue list ───────────────────────────────────────────────

  const venues = useMemo(
    () => filterAndRankByScope(rawVenues, scope, suburb, city, userLat, userLon),
    [rawVenues, scope, suburb, city, userLat, userLon],
  );

  // Sparse local: in this_neighbourhood scope with some but few results
  const sparseLocal = !loading && scope === 'this_neighbourhood' && venues.length > 0 && venues.length < LOCAL_THRESHOLD;

  const venueIdsWithEvents = useMemo(() => new Set(events.map(e => e.venueId)), [events]);

  const isFiltered = !!(search.trim() || categoryFilter !== 'All' || activityFilter !== 'All');

  const filteredVenues = useMemo(() => {
    let result = applyCategoryFilter(venues, categoryFilter, venueIdsWithEvents);
    result = applyActivityFilter(result, activityFilter, venueIdsWithEvents);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(v =>
        v.name.toLowerCase().includes(q) ||
        v.category.toLowerCase().includes(q) ||
        v.neighborhood.toLowerCase().includes(q) ||
        v.city.toLowerCase().includes(q)
      );
    }
    return result;
  }, [venues, activityFilter, categoryFilter, search, venueIdsWithEvents]);

  // ─── Computed: scope-filtered rails ─────────────────────────────────────────

  const trendingResult = useMemo(
    () => scopeFilterRail(rawTrending, scope, suburb, city, userLat, userLon),
    [rawTrending, scope, suburb, city, userLat, userLon],
  );

  const newPlacesResult = useMemo(
    () => scopeFilterRail(rawNewPlaces, scope, suburb, city, userLat, userLon),
    [rawNewPlaces, scope, suburb, city, userLat, userLon],
  );

  const mostLovedResult = useMemo(
    () => scopeFilterRail(rawMostLoved, scope, suburb, city, userLat, userLon),
    [rawMostLoved, scope, suburb, city, userLat, userLon],
  );

  const openCount = venues.filter(v => v.venueStatus === 'open' || v.venueStatus === 'busy').length;
  let activityIdx = 0;

  // Expand note for rails when auto-expanded beyond selected scope
  function expandNote(result: RailResult<Venue>): string | undefined {
    if (!result.expanded || !result.expandedScope) return undefined;
    if (result.expandedScope === 'nearby') return `None in ${suburb || areaLabel} — showing nearby areas`;
    return `None near ${areaLabel} — showing wider area`;
  }

  function handleLike(postId: string, currentlyLiked: boolean) {
    if (!user) return;
    if (currentlyLiked) {
      setLikedPostIds(prev => { const next = new Set(prev); next.delete(postId); return next; });
      unlikePost(postId, user.id).catch(() => {
        // rollback on failure
        setLikedPostIds(prev => new Set([...prev, postId]));
      });
    } else {
      setLikedPostIds(prev => new Set([...prev, postId]));
      likePost(postId, user.id).catch(() => {
        setLikedPostIds(prev => { const next = new Set(prev); next.delete(postId); return next; });
      });
    }
  }

  return (
    <div style={{ padding: '16px' }}>

      {/* Stories strip with "+" compose bubble */}
      <StoriesStrip stories={stories} onCompose={() => setShowComposer(true)} />

      {/* Greeting + clickable area label */}
      <div style={{ marginBottom: '10px' }}>
        <p style={{ fontSize: '13px', color: 'var(--color-muted)', marginBottom: '2px' }}>{getGreeting()} 👋</p>
        <div
          onClick={() => setShowAreaGate(true)}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', marginBottom: '10px' }}
        >
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '22px', color: 'var(--color-text)', lineHeight: 1.2, margin: 0 }}>
            {areaLabel}
          </h1>
          <MapPin size={15} color="rgba(255,255,255,0.3)" style={{ marginTop: '2px' }} />
        </div>
        {/* Neighbourhood pulse stat strip */}
        {!loading && (
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <div style={{ background: 'rgba(57,217,138,0.1)', border: '1px solid rgba(57,217,138,0.2)', borderRadius: '20px', padding: '4px 12px', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ fontSize: '11px', color: '#39D98A' }}>🏪</span>
              <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', fontWeight: 700, color: '#39D98A' }}>{openCount} active</span>
            </div>
            {userPosts.length > 0 && (
              <div style={{ background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.2)', borderRadius: '20px', padding: '4px 12px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ fontSize: '11px' }}>💬</span>
                <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', fontWeight: 700, color: '#60A5FA' }}>{userPosts.length} post{userPosts.length !== 1 ? 's' : ''}</span>
              </div>
            )}
            {activity.length > 0 && (
              <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '20px', padding: '4px 12px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ fontSize: '11px' }}>📍</span>
                <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', fontWeight: 700, color: '#F59E0B' }}>{activity.length} check-ins</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Scope selector */}
      <ScopeSelector value={scope} onChange={handleScopeChange} />

      {/* Sparse local banner: shown when this_neighbourhood has results but few */}
      {sparseLocal && (
        <ScopeNote>
          Only {venues.length} place{venues.length === 1 ? '' : 's'} active near {suburb || areaLabel} right now.{' '}
          <button
            onClick={() => handleScopeChange('nearby')}
            style={{ background: 'none', border: 'none', color: '#39D98A', fontSize: '12px', fontWeight: 700, cursor: 'pointer', padding: 0, fontFamily: 'DM Sans, sans-serif' }}
          >
            Show nearby →
          </button>
        </ScopeNote>
      )}

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: '12px' }}>
        <Search size={15} color="var(--color-muted)" style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search your neighbourhood..."
          style={{ width: '100%', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '11px 14px 11px 36px', color: 'var(--color-text)', fontSize: '14px', fontFamily: 'DM Sans, sans-serif', outline: 'none', boxSizing: 'border-box' }}
        />
      </div>

      {/* Category strip */}
      <CategoryStrip value={categoryFilter} onChange={v => { setCategoryFilter(v); setActivityFilter('All'); }} chips={countryChips} />

      {/* Activity filter chips */}
      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', scrollbarWidth: 'none', marginLeft: '-16px', paddingLeft: '16px', marginRight: '-16px', paddingRight: '16px', paddingBottom: '4px', marginBottom: '20px', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
        {ACTIVITY_FILTERS.map(f => (
          <button key={f} onClick={() => setActivityFilter(f)} style={{ flexShrink: 0, padding: '7px 16px', borderRadius: '20px', border: activityFilter === f ? 'none' : '1px solid var(--color-border)', background: activityFilter === f ? 'var(--color-accent)' : 'var(--color-surface)', color: activityFilter === f ? '#000' : 'var(--color-muted)', fontSize: '13px', fontWeight: 600, fontFamily: 'DM Sans, sans-serif', cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.15s' }}>
            {f}
          </button>
        ))}
      </div>

      {/* Trending this week — scope-filtered */}
      {trendingResult.expanded && trendingResult.venues.length > 0 && (
        <ScopeNote>{expandNote(trendingResult as RailResult<Venue>)}</ScopeNote>
      )}
      <TrendingRail venues={trendingResult.venues} />

      {/* Happening tonight */}
      <HappeningTonight events={tonight} />

      {/* New in your neighbourhood — scope-filtered */}
      <NewPlacesSection
        venues={newPlacesResult.venues}
        expandedNote={expandNote(newPlacesResult as RailResult<Venue>)}
      />

      {/* Event rail */}
      {activityFilter === 'All' && !search && events.length > 0 && (
        <EventRail events={events} venues={venues} />
      )}

      {/* Safety alerts — always at top */}
      {safetyAlerts.map(a => <SafetyAlertBanner key={a.id} post={a} />)}

      {/* Community posts — visible when no filters active */}
      {!loading && !isFiltered && userPosts.length > 0 && (
        <div style={{ marginBottom: '8px' }}>
          <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '14px', color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' }}>
            From the neighbourhood
          </h2>
          {userPosts.slice(0, 5).map(p => (
            <UserPostCard key={p.id} post={p} liked={likedPostIds.has(p.id)} onLike={handleLike} />
          ))}
          {userPosts.length > 5 && (
            <button
              onClick={() => setShowComposer(true)}
              style={{ width: '100%', background: 'none', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '12px', padding: '10px', color: 'rgba(255,255,255,0.3)', fontFamily: 'DM Sans, sans-serif', fontSize: '12px', cursor: 'pointer', marginBottom: '10px' }}
            >
              + {userPosts.length - 5} more posts — share yours
            </button>
          )}
        </div>
      )}

      {/* Venue cards with interleaved activity */}
      {loading ? (
        <div><VenueCardSkeleton /><VenueCardSkeleton /><VenueCardSkeleton /></div>
      ) : filteredVenues.length === 0 ? (
        isFiltered
          ? <EmptyState onCompose={() => setShowComposer(true)} onCheckin={() => navigate('/checkin')} onAddPlace={() => navigate('/onboarding')} />
          : userPosts.length > 0
            ? <LocalEmptyState scope={scope} areaLabel={areaLabel} onExpand={handleScopeChange} />
            : <EmptyState onCompose={() => setShowComposer(true)} onCheckin={() => navigate('/checkin')} onAddPlace={() => navigate('/onboarding')} />
      ) : (
        <div>
          {filteredVenues.map((venue, i) => {
            const showActivity = ACTIVITY_AFTER.has(i) && activityIdx < activity.length;
            const moment = showActivity ? activity[activityIdx] : null;
            if (showActivity) activityIdx++;
            const hasActiveStory = activeStoryVenueIds.has(venue.id);
            return (
              <div key={venue.id}>
                <VenueCard
                  venue={venue}
                  headingCount={headingCounts[venue.id] ?? 0}
                  vibeWinner={vibeWinners[venue.id] ?? null}
                  hasActiveStory={hasActiveStory}
                  onStoryTap={hasActiveStory ? () => {
                    getActiveVenueStory(venue.id).then(story => {
                      if (story) setViewingStory({ story, venueName: venue.name, venueCategory: venue.category });
                    }).catch(() => {});
                  } : undefined}
                />
                {moment && <ActivityMoment key={moment.id} text={moment.text} time={moment.time} initial={moment.initial} />}
              </div>
            );
          })}
        </div>
      )}

      {/* Most loved — scope-filtered */}
      {!loading && (
        <>
          {mostLovedResult.expanded && mostLovedResult.venues.length > 0 && (
            <ScopeNote>{expandNote(mostLovedResult as RailResult<Venue>)}</ScopeNote>
          )}
          <MostLovedRail
            venues={mostLovedResult.venues}
            city={mostLovedResult.expanded ? (city || areaLabel) : areaLabel}
          />
        </>
      )}

      {/* Neighbourhood Board teaser */}
      {boardPosts.length > 0 && <BoardTeaser posts={boardPosts} />}

      {/* Jobs teaser removed — Jobs lives under Board categories */}

      <InstallBanner />

      {/* Neighbourhood gate — first run or manual area change */}
      {showAreaGate && (
        <NeighbourhoodGate onDone={() => setShowAreaGate(false)} />
      )}

      {/* Story viewer — fullscreen overlay */}
      {viewingStory && (
        <StoryViewer
          story={viewingStory.story}
          venueName={viewingStory.venueName}
          venueCategory={viewingStory.venueCategory}
          onClose={() => setViewingStory(null)}
        />
      )}

      {/* Floating compose button */}
      <button
        onClick={() => setShowComposer(true)}
        title="Share something with your neighbourhood"
        style={{
          position: 'fixed', bottom: '80px', right: '16px', zIndex: 50,
          width: '52px', height: '52px', borderRadius: '50%',
          background: '#39D98A', border: 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 20px rgba(57,217,138,0.45)',
          cursor: 'pointer', transition: 'transform 0.15s, filter 0.15s',
        }}
        onMouseEnter={e => (e.currentTarget.style.filter = 'brightness(1.1)')}
        onMouseLeave={e => (e.currentTarget.style.filter = '')}
      >
        <PenSquare size={22} color="#0D1117" />
      </button>

      {/* Post composer */}
      {showComposer && (
        <PostComposer
          neighbourhood={suburb || areaLabel}
          onClose={() => setShowComposer(false)}
          onPosted={post => setUserPosts(prev => [post, ...prev])}
        />
      )}
    </div>
  );
}
