import { useState, useMemo, useEffect, useRef } from 'react';
import { PenSquare, ChevronDown, Share2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useNeighbourhood } from '../contexts/NeighbourhoodContext';
import { haversineKm } from '../lib/geocode';
import { getAreaTier } from '../lib/areaGroups';
import NeighbourhoodGate from '../components/NeighbourhoodGate';
import PostComposer from '../components/PostComposer';
import {
  getAllVenues,
  getBoardPosts,
  getLocalJobs,
  getUtilityReports,
  getFollowedVenueIds,
  getFollowingFeedItems,
  getLocalVenueUpdates,
  followBusiness,
  unfollowBusiness,
} from '../lib/api';
import type { BoardPost, LocalJob, UtilityReport, FollowingFeedItem } from '../lib/api';
import { PlaceShareModal } from '../components/place/ShareModal';
import type { Venue } from '../types';
import PostBar from '../components/feed/PostBar';
import QuickAddPlace from '../components/QuickAddPlace';
import PushBanner from '../components/PushBanner';
import { useCountry } from '../contexts/CountryContext';
import { useAuth } from '../contexts/AuthContext';
import { getCategoryEmoji } from '../lib/venueUtils';

// ─── Scope models ─────────────────────────────────────────────────────────────
type FeedScope = 'this_neighbourhood' | 'nearby' | 'city_wide' | 'explore_all';
type HomeScope = 'my_area' | 'nearby' | 'everywhere' | 'following';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

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
  const tier = getAreaTier(v.neighborhood, v.city, suburb, city);
  switch (scope) {
    case 'this_neighbourhood': return tier === 'exact';
    case 'nearby':             return tier === 'exact' || tier === 'cluster';
    case 'city_wide':          return tier === 'exact' || tier === 'cluster' || tier === 'metro';
  }
}

function scopeToFeedScope(s: HomeScope): FeedScope {
  if (s === 'nearby') return 'nearby';
  if (s === 'everywhere' || s === 'following') return 'explore_all';
  return 'this_neighbourhood';
}

// ─── Seed data (display-only — never saved to Supabase) ──────────────────────

interface SeedBoardPost { id: string; category: string; title: string; time: string }
interface SeedJob       { id: string; type: 'Hiring' | 'Skills'; title: string; neighbourhood: string; time: string }
interface SeedAlert     { id: string; icon: string; label: string; message: string; isNormal: boolean; time: string }

const SEED_BOARD_POST: SeedBoardPost = {
  id: 'seed-b1', category: 'announcement',
  title: 'City Cuts Barbershop open today — walk-ins welcome until 6pm',
  time: '4 hours ago',
};
const SEED_JOB: SeedJob = {
  id: 'seed-j1', type: 'Hiring',
  title: 'Domestic worker needed — 3 days per week',
  neighbourhood: 'Berea', time: 'Today',
};
const SEED_ALERT: SeedAlert = {
  id: 'seed-alert-1', icon: '⚡', label: 'Status',
  message: 'No power or water issues reported in your area',
  isNormal: true, time: 'Updated just now',
};

// ─── Normalised display types ─────────────────────────────────────────────────

interface DisplayBoardPost { id: string; category: string; title: string; timeDisplay: string; isSeed?: boolean }
interface DisplayJob       { id: string; typeLabel: 'Hiring' | 'Skills'; title: string; neighbourhood: string; timeDisplay: string; isSeed?: boolean }

// ─── Category maps ────────────────────────────────────────────────────────────

const CAT_COLORS: Record<string, string> = {
  safety: '#EF4444', announcement: '#39D98A', announcements: '#39D98A',
  lost_found: '#60A5FA', event: '#A78BFA', events: '#A78BFA',
  question: '#60A5FA', recommendation: '#39D98A', general: 'rgba(255,255,255,0.3)',
};
const CAT_LABELS: Record<string, string> = {
  safety: 'Safety', announcement: 'Announcement', announcements: 'Announcement',
  lost_found: 'Lost & Found', event: 'Event', events: 'Event',
  question: 'Question', recommendation: 'Recommendation', general: 'General',
};

// ─── Skeletons ────────────────────────────────────────────────────────────────


function FeedItemSkeleton() {
  return (
    <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '12px 14px', marginBottom: '8px' }}>
      <div style={{ height: '9px', width: '30%', background: 'var(--color-surface2)', borderRadius: '4px', marginBottom: '9px' }} />
      <div style={{ height: '13px', width: '85%', background: 'var(--color-surface2)', borderRadius: '4px', marginBottom: '5px' }} />
      <div style={{ height: '13px', width: '60%', background: 'var(--color-surface2)', borderRadius: '4px' }} />
    </div>
  );
}

// ─── Scope tabs ───────────────────────────────────────────────────────────────

function ScopeTabs({
  scope, onChange, suburb,
}: { scope: HomeScope; onChange: (s: HomeScope) => void; suburb: string }) {
  const tabs: { id: HomeScope; label: string }[] = [
    { id: 'my_area',    label: suburb ? suburb : 'My Area' },
    { id: 'nearby',     label: 'Nearby'                    },
    { id: 'everywhere', label: 'Everywhere'                },
    { id: 'following',  label: 'Following'                 },
  ];
  return (
    <div style={{ display: 'flex', gap: '5px', marginBottom: '20px' }}>
      {tabs.map(tab => {
        const active = scope === tab.id;
        const isFollowing = tab.id === 'following';
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            style={{
              flex: 1,
              padding: '9px 2px',
              borderRadius: '100px',
              border: active
                ? 'none'
                : isFollowing
                  ? '1px solid rgba(167,139,250,0.22)'
                  : '1px solid rgba(255,255,255,0.12)',
              background: active
                ? isFollowing ? '#A78BFA' : '#39D98A'
                : 'rgba(255,255,255,0.04)',
              color: active
                ? '#0D1117'
                : isFollowing ? 'rgba(167,139,250,0.7)' : 'rgba(255,255,255,0.45)',
              fontFamily: 'Inter, sans-serif',
              fontWeight: active ? 800 : 600,
              fontSize: '12px',
              cursor: 'pointer',
              transition: 'all 0.15s',
              whiteSpace: 'nowrap' as const,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              WebkitTapHighlightColor: 'transparent',
            } as React.CSSProperties}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

// ─── Feed section header ──────────────────────────────────────────────────────

function SectionHeader({
  label, linkLabel, linkColor = '#39D98A', onLink,
}: {
  label: string;
  linkLabel: string;
  linkColor?: string;
  onLink: () => void;
}) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
      <p style={{
        fontFamily: 'Inter, sans-serif', fontSize: '11px', fontWeight: 700,
        textTransform: 'uppercase', letterSpacing: '0.1em',
        color: 'rgba(255,255,255,0.3)', margin: 0,
      }}>
        {label}
      </p>
      <button
        onClick={onLink}
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 600, color: linkColor }}
      >
        {linkLabel} →
      </button>
    </div>
  );
}

// ─── Utility pill strip ───────────────────────────────────────────────────────

function UtilityPillStrip({ suburb }: { suburb: string }) {
  const navigate = useNavigate();
  const pillBase: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: '6px',
    height: '34px', padding: '0 14px', flexShrink: 0,
    background: '#161B22', border: '1px solid #1e2a3a',
    borderRadius: '18px', cursor: 'pointer',
    fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 600,
    WebkitTapHighlightColor: 'transparent',
  };
  return (
    <div style={{ marginBottom: '20px' }}>
      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', scrollbarWidth: 'none', marginLeft: '-16px', paddingLeft: '16px', marginRight: '-16px', paddingRight: '16px', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
        <button style={{ ...pillBase, color: '#39D98A' }} onClick={() => navigate('/report/utility/power')}>⚡ No load shedding</button>
        <button style={{ ...pillBase, color: '#39D98A' }} onClick={() => navigate('/report/utility/water')}>💧 Water normal</button>
        <button style={{ ...pillBase, color: 'rgba(255,255,255,0.5)' }} onClick={() => navigate('/alerts')}>🔔 {suburb ? `${suburb} alerts` : 'Alerts'}</button>
      </div>
    </div>
  );
}

// ─── Following update type config ────────────────────────────────────────────

const FOLLOWING_UPDATE_CFG: Record<string, { emoji: string; label: string; color: string }> = {
  general:      { emoji: '📢', label: 'Update',       color: '#39D98A' },
  special:      { emoji: '🎉', label: 'Special',      color: '#F5A623' },
  menu:         { emoji: '🍽️', label: 'Menu',         color: '#60A5FA' },
  event:        { emoji: '📅', label: 'Event',        color: '#A78BFA' },
  announcement: { emoji: '📣', label: 'Announcement', color: '#FBBF24' },
};

// FeedModeTabs removed — Following is now a unified scope tab in ScopeTabs

// ─── Following feed view ──────────────────────────────────────────────────────

function FollowingFeedContent({
  isSignedIn,
  followedCount,
  items,
  loading,
  loaded,
  followedIds,
  onFollowToggle,
  onShare,
  onBrowse,
}: {
  isSignedIn: boolean;
  followedCount: number;
  items: FollowingFeedItem[];
  loading: boolean;
  loaded: boolean;
  followedIds: string[];
  onFollowToggle: (venueId: string) => void;
  onShare: (item: FollowingFeedItem) => void;
  onBrowse: () => void;
}) {
  const navigate = useNavigate();

  // Case: not signed in
  if (!isSignedIn) {
    return (
      <div style={{ paddingTop: '24px', textAlign: 'center' }}>
        <div style={{ fontSize: '40px', marginBottom: '12px' }}>🔐</div>
        <p style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '16px', color: '#F0F6FC', margin: '0 0 8px' }}>
          Sign in to follow businesses
        </p>
        <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: 'rgba(255,255,255,0.45)', margin: '0 0 20px', lineHeight: 1.6 }}>
          Follow your favourite local spots and see their updates right here.
        </p>
        <button
          onClick={() => navigate('/welcome')}
          style={{ background: '#39D98A', color: '#0D1117', border: 'none', borderRadius: '10px', padding: '11px 24px', cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '14px' }}
        >
          Get started
        </button>
      </div>
    );
  }

  // Loading
  if (loading) {
    return (
      <div style={{ paddingTop: '8px' }}>
        <FeedItemSkeleton />
        <FeedItemSkeleton />
        <FeedItemSkeleton />
      </div>
    );
  }

  // Case A: signed in but follows nobody
  if (loaded && followedCount === 0) {
    return (
      <div style={{ paddingTop: '24px', textAlign: 'center' }}>
        <div style={{ fontSize: '40px', marginBottom: '12px' }}>🏪</div>
        <p style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '16px', color: '#F0F6FC', margin: '0 0 8px' }}>
          You're not following any businesses yet
        </p>
        <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: 'rgba(255,255,255,0.45)', margin: '0 0 20px', lineHeight: 1.6 }}>
          Follow local businesses to see their updates, specials, and announcements here.
        </p>
        <button
          onClick={onBrowse}
          style={{ background: 'rgba(57,217,138,0.1)', color: '#39D98A', border: '1px solid rgba(57,217,138,0.3)', borderRadius: '10px', padding: '11px 24px', cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '14px' }}
        >
          Browse businesses near you
        </button>
      </div>
    );
  }

  // Case B: follows businesses but none have posted yet
  if (loaded && followedCount > 0 && items.length === 0) {
    return (
      <div style={{ paddingTop: '24px', textAlign: 'center' }}>
        <div style={{ fontSize: '40px', marginBottom: '12px' }}>📭</div>
        <p style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '16px', color: '#F0F6FC', margin: '0 0 8px' }}>
          No updates yet
        </p>
        <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: 'rgba(255,255,255,0.45)', margin: '0 0 6px', lineHeight: 1.6 }}>
          The {followedCount} {followedCount === 1 ? 'business' : 'businesses'} you follow {followedCount === 1 ? "hasn't" : "haven't"} posted an update yet.
        </p>
        <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: 'rgba(255,255,255,0.3)', margin: '0 0 20px' }}>
          Check back later — or follow more businesses.
        </p>
        <button
          onClick={onBrowse}
          style={{ background: 'rgba(57,217,138,0.1)', color: '#39D98A', border: '1px solid rgba(57,217,138,0.3)', borderRadius: '10px', padding: '11px 24px', cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '14px' }}
        >
          Find more businesses
        </button>
      </div>
    );
  }

  // Feed items
  return (
    <div>
      <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)', margin: '0 0 14px' }}>
        From businesses you follow
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {items.map(item => {
          const cfg = FOLLOWING_UPDATE_CFG[item.updateType] ?? FOLLOWING_UPDATE_CFG.general;
          const catEmoji = getCategoryEmoji(item.venueCategory);
          const isFollowed = followedIds.includes(item.venueId);
          return (
            <div
              key={item.id}
              onClick={() => navigate(`/venue/${item.venueSlug}`)}
              style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: '14px',
                padding: '14px 16px',
                cursor: 'pointer',
                WebkitTapHighlightColor: 'transparent',
              } as React.CSSProperties}
            >
              {/* Business identity */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                <div style={{
                  width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0,
                  background: 'rgba(57,217,138,0.08)', border: '1px solid rgba(57,217,138,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px',
                }}>
                  {catEmoji}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '13px', color: '#F0F6FC', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.venueName}
                  </p>
                  <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.38)', margin: 0 }}>
                    {item.venueCategory} · {item.venueNeighborhood}
                  </p>
                </div>
                <span style={{
                  fontFamily: 'Inter, sans-serif', fontSize: '10px', fontWeight: 700,
                  color: cfg.color, background: `${cfg.color}18`,
                  borderRadius: '20px', padding: '2px 8px', flexShrink: 0,
                }}>
                  {cfg.emoji} {cfg.label}
                </span>
              </div>
              {/* Update content */}
              <p style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '14px', color: '#F0F6FC', margin: '0 0 4px', lineHeight: 1.4 }}>
                {item.updateTitle}
              </p>
              {item.updateContent && (
                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: 'rgba(255,255,255,0.55)', margin: '0 0 8px', lineHeight: 1.55, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' } as React.CSSProperties}>
                  {item.updateContent}
                </p>
              )}
              {/* Action row */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                paddingTop: '10px', marginTop: '4px',
                borderTop: '1px solid rgba(255,255,255,0.06)',
              }}>
                <button
                  onClick={e => { e.stopPropagation(); onFollowToggle(item.venueId); }}
                  style={{
                    flex: 1, padding: '7px 10px', borderRadius: '20px', cursor: 'pointer',
                    border: `1px solid ${isFollowed ? 'rgba(57,217,138,0.4)' : 'rgba(255,255,255,0.15)'}`,
                    background: isFollowed ? 'rgba(57,217,138,0.1)' : 'transparent',
                    color: isFollowed ? '#39D98A' : 'rgba(255,255,255,0.55)',
                    fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '12px',
                    transition: 'all 0.15s',
                  }}
                >
                  {isFollowed ? '✓ Following' : '+ Follow'}
                </button>
                <button
                  onClick={e => { e.stopPropagation(); onShare(item); }}
                  style={{
                    padding: '7px 12px', borderRadius: '20px', cursor: 'pointer',
                    border: '1px solid rgba(255,255,255,0.1)',
                    background: 'transparent',
                    color: 'rgba(255,255,255,0.45)',
                    fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: '12px',
                    display: 'flex', alignItems: 'center', gap: '4px',
                  }}
                >
                  <Share2 size={11} color="rgba(255,255,255,0.45)" /> Share
                </button>
                <button
                  onClick={e => { e.stopPropagation(); navigate(`/venue/${item.venueSlug}`); }}
                  style={{
                    padding: '7px 12px', borderRadius: '20px', cursor: 'pointer',
                    border: '1px solid rgba(255,255,255,0.1)',
                    background: 'transparent',
                    color: 'rgba(255,255,255,0.45)',
                    fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: '12px',
                  }}
                >
                  Open →
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Business Updates Strip (home feed) ──────────────────────────────────────
// Shows recent owner updates from local businesses. Visually distinct from
// neighbour posts so users can immediately tell "this is from a business."

function BusinessUpdatesStrip({
  items,
  suburb,
  followedIds,
  onFollowToggle,
  onShare,
}: {
  items: FollowingFeedItem[];
  suburb: string;
  followedIds: string[];
  onFollowToggle: (venueId: string) => void;
  onShare: (item: FollowingFeedItem) => void;
}) {
  const navigate = useNavigate();
  if (items.length === 0) return null;

  return (
    <div style={{ marginBottom: '20px' }}>
      <SectionHeader
        label={`Business updates · ${suburb || 'your area'}`}
        linkLabel="Browse businesses"
        onLink={() => navigate('/neighbourhood')}
      />
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {items.map(item => {
          const cfg = FOLLOWING_UPDATE_CFG[item.updateType] ?? FOLLOWING_UPDATE_CFG.general;
          const catEmoji = getCategoryEmoji(item.venueCategory);
          const isFollowed = followedIds.includes(item.venueId);
          return (
            <div
              key={item.id}
              onClick={() => navigate(`/venue/${item.venueSlug}`)}
              style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderLeft: `3px solid ${cfg.color}`,
                borderRadius: '12px',
                padding: '12px 14px',
                cursor: 'pointer',
                WebkitTapHighlightColor: 'transparent',
              } as React.CSSProperties}
            >
              {/* Business identity row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <div style={{
                  width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0,
                  background: `${cfg.color}12`, border: `1px solid ${cfg.color}28`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px',
                }}>
                  {catEmoji}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{
                    fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '13px',
                    color: '#F0F6FC', margin: 0,
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {item.venueName}
                  </p>
                  <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.38)', margin: 0 }}>
                    {item.venueCategory} · {item.venueNeighborhood}
                  </p>
                </div>
                <span style={{
                  fontFamily: 'Inter, sans-serif', fontSize: '10px', fontWeight: 700,
                  color: cfg.color, background: `${cfg.color}18`,
                  borderRadius: '20px', padding: '2px 8px', flexShrink: 0,
                }}>
                  {cfg.emoji} {cfg.label}
                </span>
              </div>
              {/* Update content */}
              <p style={{
                fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '13px',
                color: '#F0F6FC', margin: '0 0 3px', lineHeight: 1.4,
              }}>
                {item.updateTitle}
              </p>
              {item.updateContent && (
                <p style={{
                  fontFamily: 'Inter, sans-serif', fontSize: '12px', color: 'rgba(255,255,255,0.5)',
                  margin: '0 0 8px', lineHeight: 1.5,
                  display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                } as React.CSSProperties}>
                  {item.updateContent}
                </p>
              )}
              {/* Action row */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                paddingTop: '10px', marginTop: item.updateContent ? '0' : '8px',
                borderTop: '1px solid rgba(255,255,255,0.06)',
              }}>
                <button
                  onClick={e => { e.stopPropagation(); onFollowToggle(item.venueId); }}
                  style={{
                    flex: 1, padding: '7px 10px', borderRadius: '20px', cursor: 'pointer',
                    border: `1px solid ${isFollowed ? 'rgba(57,217,138,0.4)' : 'rgba(255,255,255,0.15)'}`,
                    background: isFollowed ? 'rgba(57,217,138,0.1)' : 'transparent',
                    color: isFollowed ? '#39D98A' : 'rgba(255,255,255,0.55)',
                    fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '12px',
                    transition: 'all 0.15s',
                  }}
                >
                  {isFollowed ? '✓ Following' : '+ Follow'}
                </button>
                <button
                  onClick={e => { e.stopPropagation(); onShare(item); }}
                  style={{
                    padding: '7px 12px', borderRadius: '20px', cursor: 'pointer',
                    border: '1px solid rgba(255,255,255,0.1)',
                    background: 'transparent',
                    color: 'rgba(255,255,255,0.45)',
                    fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: '12px',
                    display: 'flex', alignItems: 'center', gap: '4px',
                  }}
                >
                  <Share2 size={11} color="rgba(255,255,255,0.45)" /> Share
                </button>
                <button
                  onClick={e => { e.stopPropagation(); navigate(`/venue/${item.venueSlug}`); }}
                  style={{
                    padding: '7px 12px', borderRadius: '20px', cursor: 'pointer',
                    border: '1px solid rgba(255,255,255,0.1)',
                    background: 'transparent',
                    color: 'rgba(255,255,255,0.45)',
                    fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: '12px',
                  }}
                >
                  Open →
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Places discovery strip (compact horizontal scroll — module, not hero) ───

function PlacesDiscoveryStrip({
  venues, loading, scope, suburb, areaLabel, onBrowse, onAddPlace,
}: {
  venues: Venue[];
  loading: boolean;
  scope: Exclude<HomeScope, 'following'>;
  suburb: string;
  areaLabel: string;
  onBrowse: () => void;
  onAddPlace: () => void;
}) {
  const navigate = useNavigate();
  const label = scope === 'my_area'
    ? `Places in ${suburb || 'your area'}`
    : scope === 'nearby' ? 'Places nearby' : 'Places everywhere';

  return (
    <div style={{ marginBottom: '24px' }}>
      <SectionHeader label={label} linkLabel="Browse all" onLink={onBrowse} />
      {loading ? (
        <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', scrollbarWidth: 'none', marginLeft: '-16px', paddingLeft: '16px', marginRight: '-16px', paddingRight: '16px' } as React.CSSProperties}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{ flexShrink: 0, width: '110px', height: '82px', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '12px' }} />
          ))}
        </div>
      ) : venues.length > 0 ? (
        <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', scrollbarWidth: 'none', marginLeft: '-16px', paddingLeft: '16px', marginRight: '-16px', paddingRight: '16px', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
          {venues.map(v => {
            const emoji = getCategoryEmoji(v.category);
            return (
              <div
                key={v.id}
                onClick={() => navigate(`/venue/${v.slug}`)}
                style={{ flexShrink: 0, width: '110px', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '12px 10px', cursor: 'pointer', WebkitTapHighlightColor: 'transparent' } as React.CSSProperties}
              >
                <div style={{ fontSize: '22px', marginBottom: '7px', lineHeight: 1 }}>{emoji}</div>
                <p style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '12px', color: '#F0F6FC', margin: '0 0 3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.name}</p>
                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '10px', color: 'rgba(255,255,255,0.35)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.neighborhood || v.category}</p>
              </div>
            );
          })}
          <div
            onClick={onAddPlace}
            style={{ flexShrink: 0, width: '82px', background: 'rgba(57,217,138,0.04)', border: '1.5px dashed rgba(57,217,138,0.22)', borderRadius: '12px', padding: '12px 8px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '5px', WebkitTapHighlightColor: 'transparent' } as React.CSSProperties}
          >
            <span style={{ fontSize: '18px', color: '#39D98A', lineHeight: 1 }}>＋</span>
            <p style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '10px', color: '#39D98A', margin: 0, textAlign: 'center', lineHeight: 1.3 }}>Add place</p>
          </div>
        </div>
      ) : (
        <div style={{ border: '1.5px dashed rgba(255,255,255,0.08)', borderRadius: '14px', padding: '20px 16px', textAlign: 'center' }}>
          <div style={{ fontSize: '26px', marginBottom: '8px' }}>🗺️</div>
          <p style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '14px', color: 'var(--color-text)', margin: '0 0 4px' }}>
            {scope === 'everywhere' ? 'No places on Kayaa yet' : `${suburb || areaLabel} is unmapped`}
          </p>
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: 'var(--color-muted)', margin: '0 0 14px' }}>
            Be the first to add a business.
          </p>
          <button
            onClick={onAddPlace}
            style={{ background: 'rgba(57,217,138,0.1)', color: '#39D98A', border: '1px solid rgba(57,217,138,0.3)', borderRadius: '10px', padding: '8px 16px', cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '12px', WebkitTapHighlightColor: 'transparent' } as React.CSSProperties}
          >
            Add the first business
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function FeedPage() {
  const navigate = useNavigate();
  const {
    displaySuburb: suburb, displayCity: city,
    displayLat: _lat, displayLon: _lon,
    isDetecting, manualOverride,
    setManualOverride, clearManualOverride,
  } = useNeighbourhood();
  const userLat = _lat ?? undefined;
  const userLon = _lon ?? undefined;
  const { selectedCountry } = useCountry();

  // Raw API data
  const [rawVenues,  setRawVenues]  = useState<Venue[]>([]);
  const [boardPosts, setBoardPosts] = useState<BoardPost[]>([]);
  const [jobPosts,   setJobPosts]   = useState<LocalJob[]>([]);

  // Section load flags
  const [boardLoaded,  setBoardLoaded]  = useState(false);
  const [jobsLoaded,   setJobsLoaded]   = useState(false);
  const [alertsLoaded, setAlertsLoaded] = useState(false);
  const [utilityAlert, setUtilityAlert] = useState<UtilityReport | null>(null);

  const [showComposer, setShowComposer] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [loading,  setLoading]  = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [cacheDate, setCacheDate] = useState<string | null>(null);

  // Pull-to-refresh
  const [pullDelta,  setPullDelta]  = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const touchStartY   = useRef(0);
  const pullDeltaRef  = useRef(0);
  const refreshingRef = useRef(false);
  const liveRegion    = useRef<HTMLDivElement>(null);

  const { user } = useAuth();

  // ─── Following feed state ─────────────────────────────────────────────────
  const [followedVenueIds, setFollowedVenueIds] = useState<string[]>([]);
  const [followingItems,   setFollowingItems]   = useState<FollowingFeedItem[]>([]);
  const [followingLoading, setFollowingLoading] = useState(false);
  const [followingLoaded,  setFollowingLoaded]  = useState(false);

  // Share sheet state — one item at a time across all feed sections
  const [shareItem, setShareItem] = useState<FollowingFeedItem | null>(null);

  // ─── Local business updates (home feed strip) ─────────────────────────────
  const [localBusinessUpdates, setLocalBusinessUpdates] = useState<FollowingFeedItem[]>([]);

  // Load followed IDs once for any signed-in user (powers Follow buttons across all scopes)
  useEffect(() => {
    if (!user) return;
    getFollowedVenueIds().then(ids => setFollowedVenueIds(ids)).catch(() => {});
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Optimistically toggle follow state; calls API in background */
  async function handleFollowToggle(venueId: string) {
    if (!user) { navigate('/welcome'); return; }
    const isNowFollowed = followedVenueIds.includes(venueId);
    setFollowedVenueIds(prev =>
      isNowFollowed ? prev.filter(id => id !== venueId) : [...prev, venueId]
    );
    if (isNowFollowed) {
      await unfollowBusiness(venueId);
    } else {
      await followBusiness(venueId);
    }
  }

  // ─── Home scope: My Area / Nearby / Everywhere ────────────────────────────
  const [scope, setScope] = useState<HomeScope>(
    () => (localStorage.getItem('kayaa_home_scope') as HomeScope | null) ?? 'my_area'
  );
  function handleScopeChange(s: HomeScope) {
    setScope(s);
    localStorage.setItem('kayaa_home_scope', s);
  }

  const [showAreaGate, setShowAreaGate] = useState(false);
  useEffect(() => {
    if (!isDetecting && !suburb && !manualOverride) setShowAreaGate(true);
    else setShowAreaGate(false);
  }, [isDetecting, suburb, manualOverride]);

  const areaLabel = suburb || 'Your area';

  const [gpsConfirmDismissed, setGpsConfirmDismissed] = useState(false);
  const [showGpsConfirm,      setShowGpsConfirm]      = useState(false);
  const [showAreaSearch,      setShowAreaSearch]       = useState(false);
  const [areaSearchQuery,     setAreaSearchQuery]      = useState('');

  useEffect(() => {
    if (!isDetecting && suburb && !manualOverride && !gpsConfirmDismissed) {
      setShowGpsConfirm(true);
      const t = setTimeout(() => setShowGpsConfirm(false), 8000);
      return () => clearTimeout(t);
    }
  }, [isDetecting, suburb]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleConfirmGpsSuburb() { setShowGpsConfirm(false); setGpsConfirmDismissed(true); }
  function handleChangeArea()       { setShowGpsConfirm(false); setGpsConfirmDismissed(true); setShowAreaSearch(true); setAreaSearchQuery(''); }

  // Online / offline
  useEffect(() => {
    const on  = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener('online',  on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  useEffect(() => {
    if (!navigator.onLine) {
      const cached = localStorage.getItem('kayaa_cached_venues');
      const ts     = localStorage.getItem('kayaa_venues_cached_at');
      if (cached) { try { setRawVenues(JSON.parse(cached)); setLoading(false); } catch { /* noop */ } }
      if (ts) setCacheDate(ts);
    }
  }, []);

  // Pull-to-refresh gesture
  useEffect(() => {
    function onTouchStart(e: TouchEvent) { touchStartY.current = e.touches[0].clientY; }
    function onTouchMove(e: TouchEvent) {
      if (window.scrollY > 8) return;
      const delta = e.touches[0].clientY - touchStartY.current;
      if (delta > 0) { const c = Math.min(delta, 80); pullDeltaRef.current = c; setPullDelta(c); }
    }
    function onTouchEnd() {
      if (pullDeltaRef.current > 60 && !refreshingRef.current) { refreshingRef.current = true; setRefreshing(true); setRefreshKey(k => k + 1); }
      pullDeltaRef.current = 0; setPullDelta(0);
    }
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove',  onTouchMove,  { passive: true });
    window.addEventListener('touchend',   onTouchEnd);
    return () => { window.removeEventListener('touchstart', onTouchStart); window.removeEventListener('touchmove', onTouchMove); window.removeEventListener('touchend', onTouchEnd); };
  }, []);

  // ─── Main data fetch ──────────────────────────────────────────────────────
  useEffect(() => {
    setBoardLoaded(false);
    setJobsLoaded(false);
    setAlertsLoaded(false);

    getAllVenues({ countryCode: selectedCountry.code, suburb: suburb || undefined, city: city || undefined })
      .then(v => {
        const venues = v as Venue[];
        setRawVenues(venues);
        try {
          localStorage.setItem('kayaa_cached_venues', JSON.stringify(venues.slice(0, 50)));
          localStorage.setItem('kayaa_venues_cached_at', new Date().toISOString());
        } catch { /* storage full */ }
        setLoading(false);
        setRefreshing(false);
        refreshingRef.current = false;

        // Board: fetch up to 5 recent posts — display count varies by scope
        getBoardPosts(suburb || '', city || '')
          .then(result => {
            const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
            const recent = result.posts
              .filter(p => new Date(p.createdAt).getTime() > sevenDaysAgo)
              .slice(0, 5);
            setBoardPosts(recent);
            setBoardLoaded(true);
          })
          .catch(() => { setBoardLoaded(true); });

        // Jobs: fetch up to 3 listings — display count varies by scope
        if (suburb) {
          getLocalJobs(suburb)
            .then(jobs => { setJobPosts(jobs.slice(0, 3)); setJobsLoaded(true); })
            .catch(() => { setJobsLoaded(true); });
        } else {
          setJobsLoaded(true);
        }

        // Utility alerts preview
        if (suburb) {
          Promise.all([
            getUtilityReports(suburb, 'power'),
            getUtilityReports(suburb, 'water'),
          ]).then(([powerReps, waterReps]) => {
            const active = [...powerReps, ...waterReps]
              .filter(r => !r.issueType.endsWith('_restored'))
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            setUtilityAlert(active[0] ?? null);
            setAlertsLoaded(true);
          }).catch(() => { setAlertsLoaded(true); });
        } else {
          setAlertsLoaded(true);
        }

        // Local business updates — fetch up to 6, slice by scope in useMemo
        if (suburb || city) {
          getLocalVenueUpdates(suburb || '', city || '', 6)
            .then(items => setLocalBusinessUpdates(items))
            .catch(() => {});
        } else {
          setLocalBusinessUpdates([]);
        }
      })
      .catch(() => {
        setRefreshing(false); refreshingRef.current = false;
        setBoardLoaded(true); setJobsLoaded(true); setAlertsLoaded(true);
      });
  }, [areaLabel, selectedCountry.code, refreshKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Following feed fetch ─────────────────────────────────────────────────
  useEffect(() => {
    if (scope !== 'following') return;
    if (!user) { setFollowingLoaded(true); return; }
    setFollowingLoading(true);
    setFollowingLoaded(false);
    getFollowedVenueIds()
      .then(ids => {
        setFollowedVenueIds(ids);
        if (ids.length === 0) {
          setFollowingItems([]);
          setFollowingLoading(false);
          setFollowingLoaded(true);
          return;
        }
        return getFollowingFeedItems(ids)
          .then(items => {
            setFollowingItems(items);
          })
          .catch(() => {})
          .finally(() => {
            setFollowingLoading(false);
            setFollowingLoaded(true);
          });
      })
      .catch(() => {
        setFollowingLoading(false);
        setFollowingLoaded(true);
      });
  }, [scope, user]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Computed: scope-aware selections ────────────────────────────────────

  // Places: 2 for My Area, 3 for Nearby, 4 for Everywhere
  const placesNearYou = useMemo(() => {
    const fScope = scopeToFeedScope(scope);
    const limit  = scope === 'my_area' ? 2 : scope === 'nearby' ? 3 : 4;
    if (!suburb && !city && scope !== 'everywhere') return rawVenues.slice(0, limit);
    return rawVenues
      .filter(v => isCleanVenue(v) && venueInScope(v, fScope, suburb, city, userLat, userLon))
      .slice(0, limit);
  }, [rawVenues, suburb, city, userLat, userLon, scope]);

  // Board posts: 1 for My Area, 2 for Nearby, 3 for Everywhere
  const displayBoardPosts = useMemo<DisplayBoardPost[]>(() => {
    if (!boardLoaded) return [];
    const limit = scope === 'my_area' ? 1 : scope === 'nearby' ? 2 : 3;
    if (boardPosts.length > 0) {
      return boardPosts.slice(0, limit).map(p => ({
        id: p.id,
        category: p.category || 'general',
        title: p.title || p.description || '',
        timeDisplay: timeAgo(p.createdAt),
        isSeed: false,
      }));
    }
    // Seed fallback
    return [{
      id: SEED_BOARD_POST.id, category: SEED_BOARD_POST.category,
      title: SEED_BOARD_POST.title, timeDisplay: SEED_BOARD_POST.time, isSeed: true,
    }];
  }, [boardLoaded, boardPosts, scope]);

  // Jobs: 1 for My Area, 2 for Nearby/Everywhere
  const displayJobs = useMemo<DisplayJob[]>(() => {
    if (!jobsLoaded) return [];
    const limit = scope === 'my_area' ? 1 : 2;
    if (jobPosts.length > 0) {
      return jobPosts.slice(0, limit).map(p => ({
        id: p.id,
        typeLabel: p.jobType === 'skill_offer' ? 'Skills' as const : 'Hiring' as const,
        title: p.title,
        neighbourhood: p.neighbourhood,
        timeDisplay: timeAgo(p.createdAt),
        isSeed: false,
      }));
    }
    return [{
      id: SEED_JOB.id, typeLabel: SEED_JOB.type, title: SEED_JOB.title,
      neighbourhood: SEED_JOB.neighbourhood, timeDisplay: SEED_JOB.time, isSeed: true,
    }];
  }, [jobsLoaded, jobPosts, scope]);

  // Business updates: 2 for My Area, 3 for Nearby, 4 for Everywhere
  const displayBusinessUpdates = useMemo(() => {
    const limit = scope === 'my_area' ? 2 : scope === 'nearby' ? 3 : 4;
    return localBusinessUpdates.slice(0, limit);
  }, [localBusinessUpdates, scope]);

  // Live pulse — venues with a check-in in the last 2 hours
  const activeNow = useMemo(
    () => rawVenues.filter(v => v.lastCheckinAt && Date.now() - new Date(v.lastCheckinAt).getTime() < 2 * 60 * 60 * 1000).length,
    [rawVenues],
  );

  // Context label used in section headers e.g. "Berea" / "near Berea" / "everywhere"
  const scopeContext = scope === 'my_area'
    ? (suburb || 'your area')
    : scope === 'nearby'
      ? `near ${suburb || 'you'}`
      : 'everywhere';

const [welcomeDismissed, setWelcomeDismissed] = useState(
    () => localStorage.getItem('kayaa_welcome_dismissed') === 'true'
  );
  const showWelcomeHint = !loading && !welcomeDismissed;

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div style={{ padding: '16px', paddingBottom: 'calc(80px + env(safe-area-inset-bottom, 0px))' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Accessible live region */}
      <div ref={liveRegion} role="status" aria-live="polite" className="sr-only">
        {loading ? 'Loading…' : refreshing ? 'Refreshing…' : `${placesNearYou.length} place${placesNearYou.length !== 1 ? 's' : ''} loaded`}
      </div>

      {/* Pull-to-refresh indicator */}
      {pullDelta > 10 && (
        <div style={{ position: 'fixed', top: '56px', left: '50%', transform: 'translateX(-50%)', zIndex: 100, display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '20px', padding: '6px 14px', opacity: Math.min(pullDelta / 60, 1), pointerEvents: 'none' }}>
          <div style={{ width: '14px', height: '14px', borderRadius: '50%', border: '2px solid rgba(57,217,138,0.35)', borderTopColor: '#39D98A', transform: `rotate(${Math.min(pullDelta * 4.5, 360)}deg)` }} />
          <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: 'var(--color-muted)' }}>{pullDelta >= 60 ? 'Release to refresh' : 'Pull to refresh'}</span>
        </div>
      )}

      {/* Refreshing banner */}
      {refreshing && !loading && (
        <div style={{ textAlign: 'center', padding: '4px 0 8px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '20px', padding: '5px 12px' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', border: '2px solid rgba(57,217,138,0.25)', borderTopColor: '#39D98A', animation: 'spin 0.8s linear infinite' }} />
            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: 'var(--color-muted)' }}>Refreshing…</span>
          </div>
        </div>
      )}

      {/* ── Unified scope tabs: My Area | Nearby | Everywhere | Following ── */}
      <ScopeTabs scope={scope} onChange={handleScopeChange} suburb={suburb} />

      {/* ══════════════════════════════════════════════════════════════════════
          ── FOLLOWING SCOPE
          ═════════════════════════════════════════════════════════════════════ */}
      {scope === 'following' ? (
        <FollowingFeedContent
          isSignedIn={!!user}
          followedCount={followedVenueIds.length}
          items={followingItems}
          loading={followingLoading}
          loaded={followingLoaded}
          followedIds={followedVenueIds}
          onFollowToggle={handleFollowToggle}
          onShare={setShareItem}
          onBrowse={() => navigate('/neighbourhood')}
        />
      ) : (
        <>

      {/* Offline banner */}
      {!isOnline && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '12px', padding: '10px 14px', marginBottom: '14px' }}>
          <span style={{ fontSize: '16px', flexShrink: 0 }}>⚠️</span>
          <div>
            <div style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '13px', color: '#F59E0B' }}>You're offline</div>
            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginTop: '2px', lineHeight: 1.4 }}>
              {cacheDate
                ? `Showing places saved ${new Date(cacheDate).toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short' })}. Some info may be outdated.`
                : 'No cached data available. Connect to the internet to load places.'}
            </div>
          </div>
        </div>
      )}

      {/* GPS confirmation */}
      {showGpsConfirm && !manualOverride && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(57,217,138,0.07)', border: '1px solid rgba(57,217,138,0.2)', borderRadius: '12px', padding: '10px 14px', marginBottom: '12px' }}>
          <span style={{ fontSize: '15px', flexShrink: 0 }}>📍</span>
          <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: 'rgba(255,255,255,0.7)', flex: 1, lineHeight: 1.4 }}>
            Showing <strong style={{ color: '#F0F6FC' }}>{suburb}</strong> — not right?
          </span>
          <button onClick={handleChangeArea} style={{ padding: '5px 12px', borderRadius: '8px', border: 'none', cursor: 'pointer', background: '#39D98A', color: '#0D1117', fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '12px', flexShrink: 0 }}>Change</button>
          <button onClick={handleConfirmGpsSuburb} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', fontSize: '16px', padding: '0 2px', flexShrink: 0 }} aria-label="Dismiss">×</button>
        </div>
      )}

      {/* Area search */}
      {showAreaSearch && (
        <div style={{ background: 'var(--color-surface)', border: '1px solid rgba(57,217,138,0.25)', borderRadius: '14px', padding: '14px 16px', marginBottom: '14px' }}>
          <div style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '14px', color: '#F0F6FC', marginBottom: '10px' }}>Which suburb are you in?</div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              autoFocus value={areaSearchQuery}
              onChange={e => setAreaSearchQuery(e.target.value)}
              placeholder="e.g. Rosebank, Soweto…"
              style={{ flex: 1, padding: '10px 14px', borderRadius: '10px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: '#F0F6FC', fontFamily: 'Inter, sans-serif', fontSize: '14px', outline: 'none' }}
              onKeyDown={e => {
                if (e.key === 'Enter' && areaSearchQuery.trim()) { setManualOverride(areaSearchQuery.trim(), city); setShowAreaSearch(false); setRefreshKey(k => k + 1); }
                if (e.key === 'Escape') setShowAreaSearch(false);
              }}
            />
            <button
              onClick={() => { if (areaSearchQuery.trim()) { setManualOverride(areaSearchQuery.trim(), city); setShowAreaSearch(false); setRefreshKey(k => k + 1); } }}
              style={{ padding: '10px 16px', borderRadius: '10px', border: 'none', cursor: 'pointer', background: '#39D98A', color: '#0D1117', fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '13px' }}
            >Set</button>
          </div>
          <button onClick={() => setShowAreaSearch(false)} style={{ marginTop: '8px', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontSize: '12px', color: 'rgba(255,255,255,0.35)', padding: 0 }}>
            Cancel — use my GPS location
          </button>
        </div>
      )}

      {/* QuickAddPlace sheet */}
      {quickAddOpen && (
        <QuickAddPlace
          defaultSuburb={suburb} defaultCity={city}
          onAdded={() => { setTimeout(() => setRefreshKey(k => k + 1), 800); }}
          onClose={() => setQuickAddOpen(false)}
        />
      )}

      {/* Manual area indicator */}
      {manualOverride && suburb && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.2)', borderRadius: '10px', padding: '8px 12px', marginBottom: '12px' }}>
          <span style={{ fontSize: '13px' }}>🔍</span>
          <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: '#93C5FD', flex: 1 }}>Browsing <strong>{manualOverride}</strong></span>
          <button onClick={() => { clearManualOverride(); setRefreshKey(k => k + 1); }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontSize: '11px', fontWeight: 600, color: '#60A5FA', padding: '0', flexShrink: 0 }}>Use GPS</button>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          ── 1. AREA HEADER — greeting + name + live pulse
          ═════════════════════════════════════════════════════════════════════ */}
      <div style={{ marginBottom: '18px' }}>
        <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(57,217,138,0.6)', margin: '0 0 5px' }}>
          {getGreeting()}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <h1 style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '28px', color: '#FFFFFF', letterSpacing: '-0.02em', lineHeight: 1.05, margin: 0 }}>
            {areaLabel}
          </h1>
          <button
            onClick={() => { setShowAreaSearch(true); setAreaSearchQuery(''); }}
            style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '20px', padding: '6px 12px',
              cursor: 'pointer', flexShrink: 0,
              fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 600,
              color: 'rgba(255,255,255,0.6)',
              WebkitTapHighlightColor: 'transparent',
            } as React.CSSProperties}
            aria-label="Change neighbourhood"
          >
            {manualOverride ? 'Browsing' : suburb ? 'Change' : 'Set area'}
            <ChevronDown size={12} />
          </button>
        </div>

        {/* Live pulse row — real signals from real data */}
        {!loading && (
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center', minHeight: '18px' }}>
            {activeNow > 0 && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontFamily: 'Inter, sans-serif', fontSize: '11px', fontWeight: 600, color: '#39D98A' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#39D98A', display: 'inline-block', boxShadow: '0 0 6px rgba(57,217,138,0.7)', animation: 'kDotPulse 2s ease-in-out infinite' }} />
                {activeNow} active now
              </span>
            )}
            {boardPosts.length > 0 && (
              <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.38)' }}>
                {boardPosts.length} post{boardPosts.length !== 1 ? 's' : ''} today
              </span>
            )}
            {jobPosts.length > 0 && (
              <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.38)' }}>
                {jobPosts.length} job{jobPosts.length !== 1 ? 's' : ''} near you
              </span>
            )}
            {rawVenues.length > 0 && activeNow === 0 && boardPosts.length === 0 && (
              <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>
                {rawVenues.length} place{rawVenues.length !== 1 ? 's' : ''} in your area
              </span>
            )}
            {!suburb && rawVenues.length === 0 && (
              <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>
                Set your area to see what's happening
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── PostBar + PushBanner ────────────────────────────────────────── */}
      <PostBar suburb={suburb || areaLabel} onPost={() => setShowComposer(true)} onAddPlace={() => setQuickAddOpen(true)} />
      <PushBanner />

      {/* ══════════════════════════════════════════════════════════════════════
          ── FEED STREAM — ordered by relevance:
          1. Urgent alert  2. Community posts  3. Jobs  4. Business updates
          5. Places (discovery strip)  6. Ask CTA  7. Status
          ═════════════════════════════════════════════════════════════════════ */}

      {/* ── FEED 1: Urgent utility alert ──────────────────────────────────── */}
      {alertsLoaded && utilityAlert && (() => {
        const POWER_LABELS: Record<string, { icon: string; label: string }> = {
          power_out:     { icon: '⚡', label: 'Power out' },
          load_shedding: { icon: '🔁', label: 'Load shedding' },
          flickering:    { icon: '💡', label: 'Flickering' },
          streetlights:  { icon: '🔦', label: 'Streetlights out' },
        };
        const WATER_LABELS: Record<string, { icon: string; label: string }> = {
          no_water:    { icon: '🚱', label: 'No water' },
          low_pressure:{ icon: '📉', label: 'Low pressure' },
          dirty_water: { icon: '🟤', label: 'Dirty water' },
          leak_burst:  { icon: '💧', label: 'Leak / burst pipe' },
        };
        const isPower = utilityAlert.category === 'power';
        const meta = isPower
          ? (POWER_LABELS[utilityAlert.issueType] ?? { icon: '⚡', label: 'Power issue' })
          : (WATER_LABELS[utilityAlert.issueType] ?? { icon: '💧', label: 'Water issue' });
        const color = isPower ? '#FBBF24' : '#60A5FA';
        return (
          <div style={{ marginBottom: '20px' }}>
            <SectionHeader label="⚠️ Neighbourhood Alert" linkLabel="See all" linkColor="#60A5FA" onLink={() => navigate('/alerts')} />
            <div onClick={() => navigate('/alerts')} style={{ background: `${color}08`, border: `1px solid ${color}30`, borderLeft: `3px solid ${color}`, borderRadius: '12px', padding: '12px 14px', cursor: 'pointer' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '5px' }}>
                <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '10px', fontWeight: 700, color, background: `${color}18`, borderRadius: '20px', padding: '2px 8px' }}>{meta.icon} {meta.label}</span>
                <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>{timeAgo(utilityAlert.createdAt)}</span>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--color-text)', margin: 0, lineHeight: 1.5, fontFamily: 'Inter, sans-serif' }}>
                📍 {utilityAlert.areaDetail}
                {utilityAlert.reportCount > 1 && <span style={{ color, fontWeight: 700 }}> · {utilityAlert.reportCount} reports</span>}
              </p>
            </div>
          </div>
        );
      })()}

      {/* ── FEED 2: Community board posts ─────────────────────────────────── */}
      {boardLoaded && displayBoardPosts.length > 0 ? (
        <div style={{ marginBottom: '20px' }}>
          <SectionHeader
            label={`Community · ${scopeContext}`}
            linkLabel="See all"
            onLink={() => navigate('/board')}
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {displayBoardPosts.map(post => {
              const color = CAT_COLORS[post.category] ?? CAT_COLORS.general;
              const label = CAT_LABELS[post.category] ?? post.category;
              return (
                <div
                  key={post.id}
                  onClick={() => navigate('/board')}
                  style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '12px', cursor: 'pointer' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                      <span style={{ display: 'inline-block', fontFamily: 'Inter, sans-serif', fontSize: '10px', fontWeight: 700, color, background: `${color}18`, borderRadius: '20px', padding: '2px 8px' }}>{label}</span>
                      {post.isSeed && <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '9px', color: 'rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.06)', borderRadius: '10px', padding: '1px 6px' }}>example</span>}
                    </div>
                    <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>{post.timeDisplay}</span>
                  </div>
                  <p style={{ fontSize: '13px', color: 'var(--color-text)', margin: 0, lineHeight: 1.5, fontFamily: 'Inter, sans-serif', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' } as React.CSSProperties}>
                    {post.title}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      ) : !boardLoaded ? (
        <div style={{ marginBottom: '20px' }}>
          <FeedItemSkeleton />
        </div>
      ) : null}

      {/* ── FEED 3: Jobs & Skills ──────────────────────────────────────────── */}
      {jobsLoaded && displayJobs.length > 0 ? (
        <div style={{ marginBottom: '20px' }}>
          <SectionHeader
            label={`Jobs & Skills · ${scopeContext}`}
            linkLabel="Browse all"
            linkColor="#A78BFA"
            onLink={() => navigate('/jobs')}
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {displayJobs.map(job => {
              const isSkill = job.typeLabel === 'Skills';
              const badgeColor = isSkill ? '#39D98A' : '#A78BFA';
              return (
                <div
                  key={job.id}
                  onClick={() => navigate('/jobs')}
                  style={{ background: 'var(--color-surface)', border: `1px solid ${badgeColor}18`, borderLeft: `3px solid ${badgeColor}55`, borderRadius: '12px', padding: '12px 14px', cursor: 'pointer' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '5px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                      <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '10px', fontWeight: 700, color: badgeColor, background: `${badgeColor}18`, borderRadius: '20px', padding: '2px 8px' }}>{isSkill ? '💡 Skills' : '💼 Hiring'}</span>
                      {job.isSeed && <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '9px', color: 'rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.06)', borderRadius: '10px', padding: '1px 6px' }}>example</span>}
                    </div>
                    <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>{job.timeDisplay}</span>
                  </div>
                  <p style={{ fontSize: '13px', color: 'var(--color-text)', margin: 0, lineHeight: 1.5, fontFamily: 'Inter, sans-serif' }}>
                    {job.title}
                  </p>
                  <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.35)', margin: '4px 0 0' }}>📍 {job.neighbourhood}</p>
                </div>
              );
            })}
          </div>
        </div>
      ) : !jobsLoaded ? (
        <div style={{ marginBottom: '20px' }}>
          <FeedItemSkeleton />
        </div>
      ) : null}

      {/* ── FEED 4: Business updates strip ──────────────────────────────────── */}
      <BusinessUpdatesStrip
        items={displayBusinessUpdates}
        suburb={suburb}
        followedIds={followedVenueIds}
        onFollowToggle={handleFollowToggle}
        onShare={setShareItem}
      />

      {/* ── FEED 5: Places discovery strip (module, not hero) ────────────────── */}
      <PlacesDiscoveryStrip
        venues={placesNearYou}
        loading={loading}
        scope={scope as Exclude<HomeScope, 'following'>}
        suburb={suburb}
        areaLabel={areaLabel}
        onBrowse={() => navigate('/neighbourhood')}
        onAddPlace={() => setQuickAddOpen(true)}
      />

      {/* ── FEED 6: Ask the neighbourhood ─────────────────────────────────── */}
      {boardLoaded && (
        <div
          onClick={() => navigate('/board/new?cat=ask')}
          style={{
            marginBottom: '20px',
            background: 'rgba(148,115,250,0.05)',
            border: '1px solid rgba(167,139,250,0.18)',
            borderRadius: '12px',
            padding: '12px 14px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <span style={{ fontSize: '20px', flexShrink: 0 }}>❓</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '13px', color: '#A78BFA', margin: '0 0 2px' }}>
              Ask {suburb || 'the neighbourhood'}
            </p>
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: 'rgba(255,255,255,0.4)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              Good mechanic near here? Best shisanyama? Your neighbours know.
            </p>
          </div>
          <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: 'rgba(167,139,250,0.6)', flexShrink: 0 }}>→</span>
        </div>
      )}

      {/* ── FEED 7: Neighbourhood status (calm "all clear" when no alert) ──── */}
      {alertsLoaded && !utilityAlert && (
        <div style={{ marginBottom: '20px' }}>
          <SectionHeader label="Neighbourhood Status" linkLabel="See all alerts" linkColor="#60A5FA" onLink={() => navigate('/alerts')} />
          <div
            onClick={() => navigate('/alerts')}
            style={{ background: 'rgba(57,217,138,0.05)', border: '1px solid rgba(57,217,138,0.15)', borderLeft: '3px solid rgba(57,217,138,0.4)', borderRadius: '12px', padding: '12px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}
          >
            <span style={{ fontSize: '18px', flexShrink: 0 }}>{SEED_ALERT.icon}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: '13px', color: '#39D98A', margin: '0 0 2px', fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>{SEED_ALERT.label}</p>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', margin: 0, fontFamily: 'Inter, sans-serif' }}>{SEED_ALERT.message}</p>
            </div>
            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '10px', color: 'rgba(255,255,255,0.25)', flexShrink: 0 }}>{SEED_ALERT.time}</span>
          </div>
        </div>
      )}

      {/* ── Utility pill strip ──────────────────────────────────────────────── */}
      <UtilityPillStrip suburb={suburb} />

      {/* ── Sparse state — neighbourhood has no activity yet ─────────────────── */}
      {!loading && boardLoaded && jobsLoaded && scope !== 'everywhere' && !!suburb &&
        boardPosts.length === 0 && jobPosts.length === 0 &&
        displayBusinessUpdates.length === 0 && !utilityAlert && (
        <div style={{ marginBottom: '20px', border: '1.5px dashed rgba(57,217,138,0.16)', borderRadius: '16px', padding: '24px 18px', textAlign: 'center' }}>
          <div style={{ fontSize: '28px', marginBottom: '10px' }}>🌱</div>
          <p style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '15px', color: '#F0F6FC', margin: '0 0 6px' }}>
            Be the first to post in {suburb}
          </p>
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: 'rgba(255,255,255,0.45)', margin: '0 0 16px', lineHeight: 1.6 }}>
            Share what's happening — a tip, an event, a job, or just say hello to your neighbours.
          </p>
          <button
            onClick={() => setShowComposer(true)}
            style={{ background: '#39D98A', color: '#0D1117', border: 'none', borderRadius: '10px', padding: '10px 20px', cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '13px', WebkitTapHighlightColor: 'transparent' } as React.CSSProperties}
          >
            Post something
          </button>
        </div>
      )}

      {/* ── Welcome hint — first visit only ──────────────────────────────────── */}
      {showWelcomeHint && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', background: 'rgba(57,217,138,0.06)', border: '1px solid rgba(57,217,138,0.15)', borderRadius: '14px', padding: '12px 14px', marginBottom: '20px' }}>
          <span style={{ fontSize: '18px', flexShrink: 0, lineHeight: 1.3 }}>👋</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '13px', color: '#F0F6FC', margin: '0 0 3px' }}>Welcome to {suburb || 'your neighbourhood'}</p>
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: 'rgba(255,255,255,0.45)', margin: 0, lineHeight: 1.55 }}>
              Explore nearby places, check in where you go, and stay on top of what's happening.
            </p>
          </div>
          <button
            onClick={() => { localStorage.setItem('kayaa_welcome_dismissed', 'true'); setWelcomeDismissed(true); }}
            aria-label="Dismiss welcome hint"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', padding: '2px', flexShrink: 0, fontSize: '16px', lineHeight: 1 }}
          >×</button>
        </div>
      )}

      {/* Neighbourhood gate */}
      {showAreaGate && <NeighbourhoodGate onDone={() => setShowAreaGate(false)} />}

        </>
      )} {/* end scope !== 'following' */}

      {/* Floating Post button — only in neighbourhood scopes */}
      {scope !== 'following' && (
        <button
          onClick={() => setShowComposer(true)}
          title="Post to your neighbourhood"
          style={{ position: 'fixed', bottom: '80px', right: '16px', zIndex: 50, width: '52px', height: '52px', borderRadius: '50%', background: '#39D98A', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 20px rgba(57,217,138,0.45)', cursor: 'pointer', transition: 'transform 0.15s, filter 0.15s' }}
          onMouseEnter={e => (e.currentTarget.style.filter = 'brightness(1.1)')}
          onMouseLeave={e => (e.currentTarget.style.filter = '')}
        >
          <PenSquare size={22} color="#0D1117" />
        </button>
      )}

      {/* Post composer */}
      {showComposer && (
        <PostComposer neighbourhood={suburb || areaLabel} onClose={() => setShowComposer(false)} onPosted={_post => setRefreshKey(k => k + 1)} />
      )}

      {/* Share sheet — triggered by any feed card's Share button */}
      {shareItem && (
        <PlaceShareModal
          place={{
            id: shareItem.venueId,
            name: shareItem.venueName,
            slug: shareItem.venueSlug,
            emoji: getCategoryEmoji(shareItem.venueCategory),
            category: shareItem.venueCategory,
            neighbourhood: shareItem.venueNeighborhood,
          }}
          onClose={() => setShareItem(null)}
        />
      )}
    </div>
  );
}
