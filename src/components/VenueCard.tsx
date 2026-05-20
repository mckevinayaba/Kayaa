import { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { MapPin, Share2, CheckCircle2, Store } from 'lucide-react';
import type { Venue } from '../types';
import type { VibeType } from '../lib/api';
import { followBusiness, unfollowBusiness } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import ShareModal from './ShareModal';
import { VerificationBadge } from './common/VerificationBadge';
import { getCategoryEmoji, getVenueOpenStatus } from '../lib/venueUtils';
import { VenueStatusBadge } from './VenueStatusBadge';

const NEW_PLACE_MS = 14 * 24 * 60 * 60 * 1000;

const categoryColor: Record<string, string> = {
  Barbershop: '#39D98A', Shisanyama: '#F5A623', Tavern: '#60A5FA',
  Café: '#F59E0B', Church: '#A78BFA', Carwash: '#34D399',
  'Spaza Shop': '#60A5FA', Salon: '#F472B6', Tutoring: '#34D399',
  'Sports Ground': '#FB923C', 'Home Business': '#94A3B8',
};

const VIBE_EMOJI: Record<VibeType, string> = { busy: '🔥', chilled: '😌', happening: '🎉' };
const VIBE_LABEL: Record<VibeType, string> = { busy: 'Busy', chilled: 'Chilled', happening: 'Happening' };

function timeAgoShort(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  if (h < 48) return 'yesterday';
  return `${Math.floor(h / 24)}d ago`;
}

// Status config kept only for reference — no longer rendered on cards
// Open/closed is community-verified through check-ins, not hardcoded

function getHumanDetail(description: string): string {
  const sentence = description.split('.')[0];
  return sentence.length > 60 ? sentence.slice(0, 57) + '…' : sentence;
}

/**
 * Returns the street-level part of a full address (everything before the
 * first comma), capped at `max` chars. Returns null if the street part is
 * essentially just the neighbourhood name (no useful info to add).
 */
function streetPart(address: string, neighborhood: string, max = 50): string | null {
  if (!address) return null;
  const first = address.split(',')[0].trim();
  if (!first || first.length <= 3) return null;
  if (first.toLowerCase() === neighborhood.toLowerCase()) return null;
  return first.length <= max ? first : first.slice(0, max - 1) + '…';
}

interface VenueCardProps {
  venue: Venue;
  headingCount?: number;
  vibeWinner?: { vibe: VibeType; count: number } | null;
  hasActiveStory?: boolean;
  onStoryTap?: () => void;
  recommendationReason?: string;
  recCount?: number;  // neighbour recommendation count
  distance?: number | null;  // km from user — shown when available
  isFollowed?: boolean;      // controlled follow state (from parent)
  onFollowToggle?: (venueId: string) => void; // parent-managed toggle
}

/**
 * Returns an "active business" signal based on recent check-in data.
 * Only shows when backed by real, recent activity — never stale or misleading.
 */
function getActiveSignal(v: Venue): { label: string; color: string } | null {
  if (v.checkinsToday && v.checkinsToday > 0) {
    return { label: '🟢 Active today', color: '#39D98A' };
  }
  if (v.lastCheckinAt) {
    const daysAgo = (Date.now() - new Date(v.lastCheckinAt).getTime()) / (1000 * 60 * 60 * 24);
    if (daysAgo < 7) return { label: '✅ Active this week', color: '#39D98A' };
  }
  return null;
}

/** Returns a lightweight popularity signal based on follower count, regulars, and check-ins. */
function getPopularitySignal(v: Venue): { label: string; color: string } | null {
  const ageMs = Date.now() - new Date(v.createdAt).getTime();
  if (ageMs < 14 * 24 * 60 * 60 * 1000 && v.regularsCount < 3) return null;
  if (v.followerCount >= 8 || v.regularsCount >= 12 || v.checkinsThisWeek >= 20)
    return { label: '❤️ Popular nearby', color: '#F472B6' };
  if (v.followerCount >= 3 || v.regularsCount >= 6 || v.checkinsThisWeek >= 8)
    return { label: '👥 Locals love this', color: '#A78BFA' };
  return null;
}

export default function VenueCard({ venue, headingCount = 0, vibeWinner, hasActiveStory, onStoryTap, recommendationReason, recCount = 0, distance = null, isFollowed: isFollowedProp, onFollowToggle }: VenueCardProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const emoji  = getCategoryEmoji(venue.category);
  const color  = categoryColor[venue.category] ?? '#39D98A';
  const hasRecentCheckin = !!(venue.lastCheckinAt && Date.now() - new Date(venue.lastCheckinAt).getTime() < 2 * 60 * 60 * 1000);
  const openStatus = getVenueOpenStatus(venue, hasRecentCheckin);
  const [shareOpen, setShareOpen] = useState(false);

  // Self-contained follow state — used when parent doesn't provide controlled state
  const [localFollowed, setLocalFollowed] = useState(false);
  const followed = isFollowedProp !== undefined ? isFollowedProp : localFollowed;

  async function handleFollow(e: React.MouseEvent) {
    e.stopPropagation();
    if (!user) { navigate('/welcome'); return; }
    if (onFollowToggle) {
      onFollowToggle(venue.id);
    } else {
      // Self-contained: optimistic update + API call
      setLocalFollowed(f => !f);
      if (localFollowed) {
        await unfollowBusiness(venue.id);
      } else {
        await followBusiness(venue.id);
      }
    }
  }
  const todayCount = venue.checkinsToday ?? 0;
  const popularitySignal = getPopularitySignal(venue);
  const activeSignal     = getActiveSignal(venue);
  // Three activity states — never based on hardcoded status field
  const activitySignal: 'active' | 'someone' | 'quiet' =
    todayCount >= 3 ? 'active' : todayCount >= 1 ? 'someone' : 'quiet';

  // Lazy-load: only fetch the cover image once the card scrolls into view
  const cardRef   = useRef<HTMLDivElement>(null);
  const [inView,   setInView]   = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setInView(true); obs.disconnect(); } },
      { rootMargin: '200px' },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <>
      <style>{`
        @keyframes headingPulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.6; transform: scale(0.9); } }
        @keyframes storyRing { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } }
      `}</style>

      <div
        ref={cardRef}
        onClick={() => navigate(`/venue/${venue.slug}`)}
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border-warm)',
          borderRadius: 'var(--radius-card)',
          boxShadow: 'var(--shadow-card)',
          overflow: 'hidden', marginBottom: '14px',
          cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
          position: 'relative',
        }}
      >
        {/* ── 16:9 photo header ── */}
        <div style={{ position: 'relative', width: '100%', paddingTop: '56.25%', overflow: 'hidden' }}>
          {venue.coverImage ? (
            <>
              {/* Shimmer placeholder — shows until image is loaded */}
              {!imgLoaded && (
                <div style={{
                  position: 'absolute', inset: 0,
                  background: 'linear-gradient(90deg, var(--color-surface2) 25%, rgba(255,255,255,0.05) 50%, var(--color-surface2) 75%)',
                  backgroundSize: '200% 100%',
                  animation: 'shimmer 1.5s ease-in-out infinite',
                }} />
              )}
              {/* Only attach src after card enters viewport */}
              {inView && (
                <img
                  src={venue.coverImage}
                  alt={venue.name}
                  onLoad={() => setImgLoaded(true)}
                  style={{
                    position: 'absolute', inset: 0, width: '100%', height: '100%',
                    objectFit: 'cover',
                    opacity: imgLoaded ? 1 : 0,
                    transition: 'opacity 0.4s ease',
                  }}
                />
              )}
              {/* Editorial gradient — strong scrim for text legibility and depth */}
              <div style={{
                position: 'absolute', inset: 0, pointerEvents: 'none',
                background: 'linear-gradient(to bottom, transparent 38%, rgba(13,17,23,0.35) 65%, rgba(13,17,23,0.72) 100%)',
              }} />
            </>
          ) : (
            /* Emoji fallback — dark background, centered emoji */
            <div style={{
              position: 'absolute', inset: 0,
              background: '#0D1117',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '52px',
            }}>
              {emoji}
            </div>
          )}

          {/* ── Community activity signal — top-left overlay ── */}
          {/* Derived entirely from real check-in counts. Never from status field. */}
          {activitySignal === 'active' && (
            <div style={{
              position: 'absolute', top: '10px', left: '10px',
              background: 'rgba(13,17,23,0.72)', backdropFilter: 'blur(10px)',
              border: '1px solid rgba(57,217,138,0.32)',
              borderRadius: '100px', padding: '5px 11px',
              display: 'flex', alignItems: 'center', gap: '6px',
            }}>
              <div style={{
                width: '6px', height: '6px', borderRadius: '50%',
                background: '#39D98A', flexShrink: 0,
                animation: 'kDotPulse 2s ease-in-out infinite',
              }} />
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#39D98A', fontFamily: 'Inter, sans-serif', letterSpacing: '0.01em' }}>
                {todayCount} here today
              </span>
            </div>
          )}
          {activitySignal === 'someone' && (
            <div style={{
              position: 'absolute', top: '10px', left: '10px',
              background: 'rgba(13,17,23,0.72)', backdropFilter: 'blur(10px)',
              border: '1px solid rgba(251,191,36,0.28)',
              borderRadius: '100px', padding: '5px 11px',
              display: 'flex', alignItems: 'center', gap: '6px',
            }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#FBBF24', flexShrink: 0 }} />
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#FBBF24', fontFamily: 'Inter, sans-serif', letterSpacing: '0.01em' }}>
                Someone was here today
              </span>
            </div>
          )}
          {activitySignal === 'quiet' && (
            <div style={{
              position: 'absolute', top: '10px', left: '10px',
              display: 'flex', alignItems: 'center',
            }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'rgba(255,255,255,0.15)' }} />
            </div>
          )}

          {/* Vibe badge — top-right */}
          {vibeWinner && (
            <div style={{
              position: 'absolute', top: '10px', right: '10px',
              background: 'rgba(13,17,23,0.85)', borderRadius: '12px',
              padding: '3px 8px', display: 'flex', alignItems: 'center', gap: '4px',
              border: '1px solid rgba(255,255,255,0.12)',
            }}>
              <span style={{ fontSize: '11px' }}>{VIBE_EMOJI[vibeWinner.vibe]}</span>
              <span style={{ fontSize: '10px', fontWeight: 700, color: '#fff', fontFamily: 'Inter, sans-serif' }}>
                {VIBE_LABEL[vibeWinner.vibe]}
              </span>
            </div>
          )}

          {/* Story ring on avatar thumbnail — bottom-left */}
          {hasActiveStory && (
            <div
              onClick={e => { e.stopPropagation(); onStoryTap?.(); }}
              style={{
                position: 'absolute', bottom: '10px', left: '10px',
                width: '36px', height: '36px', borderRadius: '10px',
                border: '2px solid #22c55e',
                background: `${color}33`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '18px', cursor: 'pointer', zIndex: 1,
                animation: 'storyRing 2s ease-in-out infinite',
              }}
            >
              {emoji}
            </div>
          )}
        </div>

        {/* ── Card body ── */}
        {/* Category accent rule — 3px left bar in category color, editorial treatment */}
        <div style={{
          padding: '15px 18px 16px',
          borderLeft: `3px solid ${color}`,
        }}>

          {/* Category row — smaller, more subdued, typographically light */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '7px', flexWrap: 'wrap' }}>
            <span style={{
              fontSize: '11px', fontWeight: 700,
              color, letterSpacing: '0.06em', textTransform: 'uppercase',
              fontFamily: 'Inter, sans-serif',
            }}>
              {emoji} {venue.category}
            </span>

            {/* Verified check */}
            {venue.isVerified && !venue.verificationType && (
              <CheckCircle2 size={12} color="#39D98A" />
            )}

            {/* Owner managed */}
            {venue.ownerClaimed && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '3px',
                fontSize: '10px', fontWeight: 700,
                color: '#60A5FA',
                background: 'rgba(96,165,250,0.08)',
                border: '1px solid rgba(96,165,250,0.18)',
                borderRadius: '100px', padding: '2px 7px',
                fontFamily: 'Inter, sans-serif',
              }}>
                <Store size={9} color="#60A5FA" />
                Owner managed
              </span>
            )}

            {/* New place — first 14 days */}
            {Date.now() - new Date(venue.createdAt).getTime() < NEW_PLACE_MS && (
              <span style={{
                fontSize: '10px', fontWeight: 700,
                color: '#39D98A',
                background: 'rgba(57,217,138,0.09)',
                border: '1px solid rgba(57,217,138,0.2)',
                borderRadius: '100px', padding: '2px 8px',
                fontFamily: 'Inter, sans-serif',
                letterSpacing: '0.04em',
              }}>
                New
              </span>
            )}
          </div>

          {/* Place name — bigger, tighter, more authoritative */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '7px', margin: '0 0 5px', flexWrap: 'wrap' }}>
            <h3 style={{
              fontFamily: 'Inter, sans-serif', fontWeight: 800, fontSize: '19px',
              color: 'var(--color-text)', lineHeight: 1.2, margin: 0,
              letterSpacing: '-0.3px',
            }}>
              {venue.name}
            </h3>
            {venue.isVerified && venue.verificationType && (
              <VerificationBadge type={venue.verificationType} size="sm" showLabel />
            )}
          </div>

          {/* Location + address + distance + status */}
          <div style={{ marginBottom: '11px' }}>
            {/* Row 1: neighbourhood, city, distance badge, open status */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                <MapPin size={11} color="var(--color-muted2)" />
                <span style={{ fontSize: '12px', color: 'var(--color-muted2)' }}>
                  {venue.neighborhood}, {venue.city}
                </span>
              </div>
              {distance != null && (
                <span style={{
                  fontSize: '11px', fontWeight: 700, color: '#39D98A',
                  background: 'rgba(57,217,138,0.09)',
                  border: '1px solid rgba(57,217,138,0.2)',
                  borderRadius: '20px', padding: '2px 7px',
                  fontFamily: 'Inter, sans-serif',
                }}>
                  {distance < 1 ? `${Math.round(distance * 1000)}m` : `${distance.toFixed(1)}km`} away
                </span>
              )}
              {openStatus.state !== 'no_hours' && openStatus.state !== 'closed_today' && (
                <VenueStatusBadge status={openStatus} size="sm" />
              )}
            </div>
            {/* Row 2: street address (only the street-level part, not repeating suburb/city) */}
            {(() => {
              const street = streetPart(venue.address, venue.neighborhood);
              if (!street) return null;
              return (
                <p style={{
                  fontSize: '11px', color: 'rgba(255,255,255,0.38)',
                  margin: '3px 0 0', lineHeight: 1.4,
                  fontFamily: 'Inter, sans-serif',
                }}>
                  {street}
                </p>
              );
            })()}
          </div>

          {/* Active + Popularity signals */}
          {(activeSignal || popularitySignal) && (
            <div style={{ marginBottom: '8px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {activeSignal && (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: '4px',
                  fontSize: '11px', fontWeight: 700,
                  color: activeSignal.color, fontFamily: 'Inter, sans-serif',
                  background: `${activeSignal.color}12`,
                  border: `1px solid ${activeSignal.color}28`,
                  borderRadius: '20px', padding: '3px 9px',
                }}>
                  {activeSignal.label}
                </span>
              )}
              {popularitySignal && (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: '4px',
                  fontSize: '11px', fontWeight: 700,
                  color: popularitySignal.color, fontFamily: 'Inter, sans-serif',
                  background: `${popularitySignal.color}12`,
                  border: `1px solid ${popularitySignal.color}28`,
                  borderRadius: '20px', padding: '3px 9px',
                }}>
                  {popularitySignal.label}
                </span>
              )}
            </div>
          )}

          {/* Recommendation reason or neighbour count */}
          {(recommendationReason || recCount > 0) && (
            <div style={{ marginBottom: '9px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              {recCount > 0 && (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: '4px',
                  fontSize: '11px', fontWeight: 700,
                  color: '#39D98A', fontFamily: 'Inter, sans-serif',
                  background: 'rgba(57,217,138,0.09)',
                  border: '1px solid rgba(57,217,138,0.2)',
                  borderRadius: '20px', padding: '3px 9px',
                }}>
                  👍 Recommended by {recCount} neighbour{recCount !== 1 ? 's' : ''}
                </span>
              )}
              {recommendationReason && (
                <span style={{
                  fontSize: '11px', fontWeight: 600,
                  color: 'var(--color-muted2)',
                  fontFamily: 'Inter, sans-serif',
                  letterSpacing: '0.01em',
                }}>
                  {recommendationReason}
                </span>
              )}
            </div>
          )}

          {/* Description */}
          <p style={{
            fontSize: '13px', color: 'var(--color-muted)',
            lineHeight: 1.65, marginBottom: '15px',
          }}>
            {getHumanDetail(venue.description)}
          </p>

          {/* Bottom row */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            paddingTop: '13px',
            borderTop: '1px solid var(--color-border-warm)',
          }}>
            {/* Social signals */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              {(venue.regularsCount ?? venue.checkinCount) > 50 && (
                <span style={{ fontSize: '12px', color: 'var(--color-muted)' }}>
                  <span style={{ color: 'var(--color-text)', fontWeight: 700 }}>
                    💛 {(venue.regularsCount ?? venue.checkinCount).toLocaleString()}
                  </span>
                  <span style={{ color: 'var(--color-muted2)' }}> regulars</span>
                </span>
              )}
              {venue.lastCheckinAt && (
                <span style={{ fontSize: '11px', color: 'var(--color-muted2)' }}>
                  · {timeAgoShort(venue.lastCheckinAt)}
                </span>
              )}
              {headingCount > 0 && (
                <span style={{
                  fontSize: '11px', fontWeight: 700,
                  background: 'rgba(245,166,35,0.1)',
                  color: '#F5A623',
                  border: '1px solid rgba(245,166,35,0.2)',
                  borderRadius: '100px', padding: '3px 9px',
                  animation: 'kDotPulse 2.5s ease-in-out infinite',
                  display: 'inline-block',
                }}>
                  🚶 {headingCount}
                </span>
              )}
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {/* Follow */}
              <button
                onClick={handleFollow}
                style={{
                  padding: '7px 13px', borderRadius: '20px', cursor: 'pointer', flexShrink: 0,
                  border: `1px solid ${followed ? 'rgba(57,217,138,0.4)' : 'var(--color-border-warm)'}`,
                  background: followed ? 'rgba(57,217,138,0.1)' : 'rgba(255,255,255,0.04)',
                  color: followed ? '#39D98A' : 'var(--color-muted)',
                  fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '12px',
                  transition: 'all 0.15s',
                }}
              >
                {followed ? '✓ Following' : '+ Follow'}
              </button>
              {/* Share */}
              <button
                onClick={e => { e.stopPropagation(); setShareOpen(true); }}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: '32px', height: '32px', borderRadius: '50%',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid var(--color-border-warm)',
                  flexShrink: 0, cursor: 'pointer',
                  transition: 'background 0.15s',
                }}
              >
                <Share2 size={14} color="var(--color-muted)" />
              </button>
              {/* Check in */}
              <Link
                to={`/venue/${venue.slug}/checkin`}
                onClick={e => e.stopPropagation()}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '5px',
                  background: 'var(--color-accent)',
                  color: '#0D1117',
                  textDecoration: 'none',
                  fontSize: '12px', fontWeight: 800,
                  fontFamily: 'Inter, sans-serif',
                  padding: '8px 18px',
                  borderRadius: '100px',
                  letterSpacing: '0.02em',
                  boxShadow: '0 2px 12px rgba(57,217,138,0.2)',
                }}
              >
                Check in
              </Link>
            </div>
          </div>
        </div>{/* end card body */}
      </div>{/* end card */}

      <ShareModal
        type="place"
        data={{ name: venue.name, slug: venue.slug, category: venue.category, emoji, neighborhood: venue.neighborhood, city: venue.city, description: venue.description, checkinCount: venue.checkinCount, isOpen: venue.isOpen }}
        isOpen={shareOpen}
        onClose={() => setShareOpen(false)}
      />
    </>
  );
}
