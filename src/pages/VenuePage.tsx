import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Clock, Calendar, CheckCircle2, Share2, X, ChevronLeft, ChevronRight, Play, Volume2, VolumeX } from 'lucide-react';
import ShareModal from '../components/ShareModal';
import StoryViewer from '../components/StoryViewer';
import {
  getVenueBySlug, getVenueEvents, getVenuePosts, getActiveStories,
  getVenueRecentStats, getUserVenueScoreLocal, getVisitorId,
  getHeadingThereCount, signalHeadingThere, cancelHeadingThere,
  getVibeSummary, reportVibe, cancelVibeReport,
  getActiveVenueStory, getInteractiveUserId,
  getEventRsvpCountsBatch, checkUserRsvp, addEventRsvp, removeEventRsvp, getEventRsvpCount,
} from '../lib/api';
import type { VenueRecentStats, VibeSummary, VenueStory24, VibeType } from '../lib/api';
import type { Venue, Event, Post, Story } from '../types';
import StoriesStrip from '../components/StoriesStrip';

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORY_EMOJI: Record<string, string> = {
  Barbershop: '✂️', Shisanyama: '🔥', Tavern: '🍺', Café: '☕',
  Church: '⛪', Carwash: '🚗', 'Spaza Shop': '🏪', Salon: '💅',
  Tutoring: '📚', 'Sports Ground': '⚽', 'Home Business': '🏠',
};

const CATEGORY_COLOR: Record<string, string> = {
  Barbershop: '#39D98A', Shisanyama: '#F5A623', Tavern: '#60A5FA',
  Café: '#F59E0B', Church: '#A78BFA', Carwash: '#34D399',
  'Spaza Shop': '#60A5FA', Salon: '#F472B6', Tutoring: '#34D399',
  'Sports Ground': '#FB923C', 'Home Business': '#94A3B8',
};


const AVATAR_COLORS = ['#39D98A', '#F5A623', '#60A5FA', '#F472B6', '#A78BFA', '#FB923C'];

const REGULARS_BY_VENUE: Record<string, string[]> = {
  '1': ['L', 'T', 'S', 'N', 'B', 'K'],
  '2': ['T', 'N', 'S', 'B', 'M', 'A'],
  '3': ['A', 'S', 'T', 'L', 'N', 'P'],
  '4': ['N', 'L', 'Z', 'A', 'T', 'K'],
  '5': ['B', 'S', 'T', 'N', 'M', 'L'],
  '6': ['S', 'T', 'N', 'B', 'L', 'A'],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const LIVE_TIMES = ['2 min ago', '18 min ago', '1 hour ago', '3 hours ago'];

function formatEventDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short' });
}

function formatEventTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' });
}

function getStatus(venue: Venue): { label: string; color: string } {
  if (!venue.isOpen) return { label: 'Closed', color: '#6B7280' };
  if (venue.checkinCount > 1000) return { label: 'Busy now', color: '#F5A623' };
  return { label: 'Open now', color: '#39D98A' };
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function SkeletonBlock({ w = '100%', h = 16, radius = 8, mb = 0 }: { w?: string | number; h?: number; radius?: number; mb?: number }) {
  return (
    <div style={{
      width: w, height: h, borderRadius: radius,
      background: 'var(--color-surface2)', marginBottom: mb,
    }} />
  );
}

function VenueSkeleton() {
  return (
    <div>
      <div style={{ background: 'var(--color-surface2)', height: '220px' }} />
      <div style={{ padding: '16px' }}>
        <SkeletonBlock h={28} w="60%" mb={10} />
        <SkeletonBlock h={14} w="40%" mb={6} />
        <SkeletonBlock h={14} w="50%" mb={20} />
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
          {[1, 2, 3].map(i => <SkeletonBlock key={i} h={60} radius={12} />)}
        </div>
        <SkeletonBlock h={52} radius={14} mb={24} />
        <SkeletonBlock h={18} w="50%" mb={12} />
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--color-surface2)' }} />
          ))}
        </div>
        <SkeletonBlock h={80} radius={12} mb={10} />
        <SkeletonBlock h={80} radius={12} mb={24} />
      </div>
    </div>
  );
}

// ─── 404 state ────────────────────────────────────────────────────────────────

function VenueNotFound() {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', minHeight: '70vh', padding: '32px', textAlign: 'center',
    }}>
      <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏚️</div>
      <h2 style={{
        fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '20px',
        marginBottom: '8px', color: 'var(--color-text)',
      }}>
        This place isn't on Kayaa yet
      </h2>
      <p style={{ fontSize: '14px', color: 'var(--color-muted)', lineHeight: 1.6, marginBottom: '28px' }}>
        Know this place? Help put it on the map for your community.
      </p>
      <Link to="/onboarding" style={{
        display: 'block', background: 'var(--color-accent)', color: '#000',
        textDecoration: 'none', borderRadius: '12px', padding: '13px 28px',
        fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '15px', marginBottom: '16px',
      }}>
        Add this place
      </Link>
      <Link to="/feed" style={{ fontSize: '14px', color: 'var(--color-muted)', textDecoration: 'none' }}>
        ← Back to feed
      </Link>
    </div>
  );
}

// ─── Sub-sections ─────────────────────────────────────────────────────────────

function HeroSection({ venue, onBack, onPlayVideo }: { venue: Venue; onBack: () => void; onPlayVideo?: () => void }) {
  const emoji = CATEGORY_EMOJI[venue.category] ?? '📍';
  const color = CATEGORY_COLOR[venue.category] ?? '#39D98A';
  const status = getStatus(venue);
  const hasCover = !!venue.coverImage;

  return (
    <div style={{ position: 'relative' }}>
      <div style={{
        height: '220px',
        background: hasCover
          ? `url(${venue.coverImage}) center/cover no-repeat`
          : `linear-gradient(160deg, ${color}22 0%, #0D1117 100%)`,
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Dark gradient overlay for text legibility */}
        <div style={{
          position: 'absolute', inset: 0,
          background: hasCover
            ? 'linear-gradient(to bottom, rgba(13,17,23,0.3) 0%, rgba(13,17,23,0.75) 100%)'
            : 'none',
        }} />

        {!hasCover && (
          <div style={{
            position: 'absolute', top: '-40px', right: '-40px',
            width: '180px', height: '180px', borderRadius: '50%',
            background: `${color}18`, filter: 'blur(40px)',
          }} />
        )}

        <button
          onClick={onBack}
          style={{
            position: 'absolute', top: '16px', left: '16px', zIndex: 2,
            width: '36px', height: '36px', borderRadius: '50%',
            background: 'rgba(13,17,23,0.6)', border: '1px solid rgba(255,255,255,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', backdropFilter: 'blur(8px)',
          }}
        >
          <ArrowLeft size={16} color="#fff" />
        </button>

        {/* Play button overlay if intro video exists */}
        {venue.introVideo && onPlayVideo && (
          <button
            onClick={onPlayVideo}
            style={{
              position: 'absolute', top: '50%', left: '50%', zIndex: 2,
              transform: 'translate(-50%, -50%)',
              width: '52px', height: '52px', borderRadius: '50%',
              background: 'rgba(57,217,138,0.9)', border: '3px solid rgba(255,255,255,0.8)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', backdropFilter: 'blur(4px)',
              boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
            }}
          >
            <Play size={20} color="#000" fill="#000" style={{ marginLeft: '2px' } as React.CSSProperties} />
          </button>
        )}

        {!hasCover && (
          <div style={{
            position: 'absolute', bottom: '-28px', left: '16px', zIndex: 1,
            width: '64px', height: '64px', borderRadius: '18px',
            background: `${color}20`, border: `2px solid ${color}50`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '30px', boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
          }}>
            {emoji}
          </div>
        )}
      </div>

      <div style={{ padding: hasCover ? '16px 16px 0' : '40px 16px 0', background: 'var(--color-bg)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
          <span style={{
            fontSize: '11px', fontWeight: 600, color,
            background: `${color}18`, padding: '3px 10px', borderRadius: '20px',
          }}>
            {venue.category}
          </span>
          <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: status.color, flexShrink: 0 }} />
          <span style={{ fontSize: '12px', fontWeight: 600, color: status.color }}>{status.label}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
          <h1 style={{
            fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '26px',
            color: 'var(--color-text)', lineHeight: 1.15, margin: 0,
          }}>
            {venue.name}
          </h1>
          {venue.isVerified && (
            <span
              title="This place has been confirmed by the Kayaa team"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '4px',
                background: 'rgba(57,217,138,0.12)', border: '1px solid rgba(57,217,138,0.3)',
                borderRadius: '20px', padding: '3px 8px', flexShrink: 0,
              }}
            >
              <CheckCircle2 size={12} color="#39D98A" />
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#39D98A', fontFamily: 'DM Sans, sans-serif' }}>
                Verified
              </span>
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: venue.openHours ? '4px' : '12px' }}>
          <MapPin size={13} color="var(--color-muted)" />
          <span style={{ fontSize: '13px', color: 'var(--color-muted)' }}>
            {venue.address} · {venue.neighborhood}, {venue.city}
          </span>
        </div>

        {venue.openHours && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '12px' }}>
            <Clock size={13} color="var(--color-muted)" />
            <span style={{ fontSize: '13px', color: 'var(--color-muted)' }}>{venue.openHours}</span>
          </div>
        )}

        <p style={{ fontSize: '14px', color: 'var(--color-muted)', lineHeight: 1.65 }}>
          {venue.description}
        </p>
      </div>
    </div>
  );
}


// ─── User visit badge ─────────────────────────────────────────────────────────

const VISIT_BADGE_ICON: Record<string, string> = {
  newcomer: '🌱', regular: '⭐', loyal: '🔥', legend: '👑',
};

function UserVisitBadge({ venueId }: { venueId: string }) {
  const score = getUserVenueScoreLocal(venueId, getVisitorId());
  if (!score || score.visitCount === 0) return null;

  const daysAgo = score.lastVisit
    ? Math.floor((Date.now() - new Date(score.lastVisit).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const lastVisitLabel =
    daysAgo === 0 ? 'Last visit today' :
    daysAgo === 1 ? 'Last visit yesterday' :
    daysAgo != null ? `Last visit ${daysAgo} days ago` : '';

  return (
    <div style={{
      background: 'rgba(57,217,138,0.06)',
      border: '1px solid rgba(57,217,138,0.16)',
      borderRadius: '12px', padding: '12px 14px',
      marginBottom: '12px',
      display: 'flex', alignItems: 'center', gap: '10px',
    }}>
      <span style={{ fontSize: '22px', flexShrink: 0 }}>
        {VISIT_BADGE_ICON[score.badgeTier] ?? '✓'}
      </span>
      <div>
        <div style={{
          fontSize: '13px', fontWeight: 700, color: '#fff',
          fontFamily: 'Syne, sans-serif', marginBottom: '1px',
        }}>
          You've been here {score.visitCount} {score.visitCount === 1 ? 'time' : 'times'}
        </div>
        <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.48)' }}>
          {score.badgeTier.charAt(0).toUpperCase() + score.badgeTier.slice(1)}{lastVisitLabel ? ` · ${lastVisitLabel}` : ''}
        </div>
      </div>
    </div>
  );
}

function formatWaNumber(n: string): string {
  const digits = n.replace(/\D/g, '');
  return digits.startsWith('0') ? '27' + digits.slice(1) : digits;
}

// ─── Quick Stats Row (spec section 2) ────────────────────────────────────────

const VIBE_WINNER_LABEL: Record<VibeType, string> = {
  busy: '🔥 Busy right now', chilled: '😌 Chilled right now', happening: '🎉 Happening right now',
};

function QuickStatsRow({ venue, recentStats }: { venue: Venue; recentStats: VenueRecentStats }) {
  const [vibeWinner, setVibeWinner] = useState<VibeType | null>(null);
  const waUrl = venue.whatsappNumber
    ? `https://wa.me/${formatWaNumber(venue.whatsappNumber)}`
    : null;

  useEffect(() => {
    getVibeSummary(venue.id).then(s => {
      if (s.winning) setVibeWinner(s.winning);
    }).catch(() => {});
  }, [venue.id]);

  return (
    <div style={{
      paddingTop: '14px', paddingBottom: '14px',
      borderBottom: '1px solid var(--color-border)',
      marginBottom: '14px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: '14px', color: 'var(--color-text)', fontWeight: 600 }}>
            {venue.checkinCount.toLocaleString()}
          </span>
          <span style={{ fontSize: '13px', color: 'var(--color-muted)' }}> regulars</span>
          {recentStats.weeklyCheckins > 0 && (
            <>
              <span style={{ fontSize: '12px', color: 'var(--color-muted)' }}> · </span>
              <span style={{ fontSize: '13px', color: 'var(--color-muted)' }}>
                {recentStats.weeklyCheckins} check-ins this week
              </span>
            </>
          )}
          {vibeWinner && (
            <div style={{ marginTop: '4px', fontSize: '12px', fontWeight: 700, color: '#F97316' }}>
              {VIBE_WINNER_LABEL[vibeWinner]}
            </div>
          )}
        </div>
        {waUrl && (
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '5px',
              background: 'rgba(57,217,138,0.08)', border: '1px solid rgba(57,217,138,0.2)',
              borderRadius: '20px', padding: '7px 14px', textDecoration: 'none',
              fontSize: '12px', fontWeight: 700, color: '#39D98A',
              fontFamily: 'DM Sans, sans-serif', flexShrink: 0,
            }}
          >
            💬 WhatsApp
          </a>
        )}
      </div>
    </div>
  );
}

// ─── Top Regulars (spec section 8) ───────────────────────────────────────────

const TOP_REGULAR_NAMES = ['Thabo', 'Nomsa', 'Sipho', 'Lerato', 'Bongani'];
const TOP_REGULAR_BADGE_ICONS: Record<string, string> = {
  newcomer: '🌱', regular: '⭐', loyal: '🔥', legend: '👑',
};
const TOP_REGULAR_BADGES = ['legend', 'loyal', 'loyal', 'regular', 'regular'];

function TopRegularsSection({ venue }: { venue: Venue }) {
  const initials = REGULARS_BY_VENUE[venue.id] ?? ['T', 'N', 'S', 'L', 'B'];
  const top5 = initials.slice(0, 5);

  return (
    <div style={{ marginBottom: '20px' }}>
      <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '15px', color: 'var(--color-text)', marginBottom: '12px' }}>
        People who call this home
      </h2>
      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '14px', overflow: 'hidden' }}>
        {top5.map((initial, i) => {
          const color = AVATAR_COLORS[i % AVATAR_COLORS.length];
          const badge = TOP_REGULAR_BADGES[i];
          return (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              padding: '11px 14px',
              borderBottom: i < top5.length - 1 ? '1px solid var(--color-border)' : 'none',
            }}>
              <div style={{
                width: '34px', height: '34px', borderRadius: '50%', flexShrink: 0,
                background: `${color}18`, border: `1.5px solid ${color}40`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '13px', color,
              }}>
                {initial}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text)', fontFamily: 'Syne, sans-serif' }}>
                  {TOP_REGULAR_NAMES[i % TOP_REGULAR_NAMES.length]}
                </span>
              </div>
              <span style={{ fontSize: '12px', color: 'var(--color-muted)' }}>
                {TOP_REGULAR_BADGE_ICONS[badge]} {badge.charAt(0).toUpperCase() + badge.slice(1)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const CHECKIN_CTA_EMOJI: Record<string, string> = {
  Barbershop: '✂️', Shisanyama: '🔥', Tavern: '🍺', Café: '☕',
  Church: '⛪', Carwash: '🚗', 'Spaza Shop': '🏪', Salon: '💅',
  Tutoring: '📚', 'Sports Ground': '⚽', 'Home Business': '🏠',
};

// ─── Primary Actions (spec section 4) ────────────────────────────────────────
// Merges Check-in CTA + Heading There into one section

function PrimaryActions({ venue }: { venue: Venue }) {
  const [shareOpen, setShareOpen] = useState(false);
  const [isHeading, setIsHeading] = useState(false);
  const [headingCount, setHeadingCount] = useState(0);
  const [headingLoaded, setHeadingLoaded] = useState(false);
  const [toast, setToast] = useState('');
  const sessionKey = `kayaa_heading_${venue.id}`;
  const waCheckinUrl = venue.whatsappNumber
    ? `https://wa.me/${formatWaNumber(venue.whatsappNumber)}?text=${encodeURIComponent(`Hi, I'd like to check in at ${venue.name}`)}`
    : null;
  const emoji = CHECKIN_CTA_EMOJI[venue.category] ?? '📍';

  useEffect(() => {
    const local = sessionStorage.getItem(sessionKey) === '1';
    setIsHeading(local);
    getHeadingThereCount(venue.id).then(c => {
      setHeadingCount(c);
      setHeadingLoaded(true);
    });
  }, [venue.id, sessionKey]);

  async function handleSignal() {
    if (isHeading) return;
    setIsHeading(true);
    setHeadingCount(c => c + 1);
    sessionStorage.setItem(sessionKey, '1');
    const uid = await getInteractiveUserId();
    await signalHeadingThere(venue.id, uid);
    setToast(`${venue.name.split(' ')[0]} can see you're on the way! 🚶`);
    setTimeout(() => setToast(''), 3500);
  }

  async function handleCancel() {
    setIsHeading(false);
    setHeadingCount(c => Math.max(0, c - 1));
    sessionStorage.removeItem(sessionKey);
    const uid = await getInteractiveUserId();
    await cancelHeadingThere(venue.id, uid);
  }

  return (
    <>
      <ShareModal
        type="place"
        data={{
          name: venue.name, slug: venue.slug, category: venue.category,
          emoji, neighborhood: venue.neighborhood, city: venue.city,
          description: venue.description, checkinCount: venue.checkinCount, isOpen: venue.isOpen,
        }}
        isOpen={shareOpen}
        onClose={() => setShareOpen(false)}
      />
      <div style={{ marginBottom: '20px' }}>
        {toast && (
          <div style={{ background: 'rgba(57,217,138,0.10)', border: '1px solid rgba(57,217,138,0.25)', borderRadius: '10px', padding: '10px 14px', marginBottom: '10px', fontSize: '13px', color: '#39D98A', fontFamily: 'DM Sans, sans-serif' }}>
            {toast}
          </div>
        )}

        {/* Check In — large primary */}
        <Link to={`/venue/${venue.slug}/checkin`} style={{ textDecoration: 'none', display: 'block', marginBottom: '10px' }}>
          <div style={{
            background: 'var(--color-accent)', color: '#000',
            borderRadius: '14px', padding: '16px 20px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '16px',
            letterSpacing: '0.01em',
          }}>
            CHECK IN HERE
          </div>
        </Link>

        {/* Heading There — ghost secondary */}
        {isHeading ? (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '13px 16px', marginBottom: '10px',
            background: 'rgba(57,217,138,0.06)', border: '1px solid rgba(57,217,138,0.2)', borderRadius: '14px',
          }}>
            <span style={{ fontSize: '14px', fontWeight: 700, color: '#39D98A', fontFamily: 'Syne, sans-serif', flex: 1 }}>
              On my way ✓
            </span>
            <button onClick={handleCancel} style={{ background: 'none', border: 'none', fontSize: '13px', color: 'var(--color-muted)', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={handleSignal}
            style={{
              width: '100%', background: 'transparent',
              border: '1px solid rgba(255,255,255,0.18)', borderRadius: '14px',
              padding: '14px 20px', color: '#fff',
              fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '15px',
              cursor: 'pointer', textAlign: 'center', marginBottom: '10px',
            }}
          >
            I'm heading there 🚶
          </button>
        )}

        {/* Heading count */}
        {headingLoaded && headingCount > 0 && (
          <p style={{ fontSize: '13px', color: '#39D98A', textAlign: 'center', margin: '0 0 10px', fontFamily: 'DM Sans, sans-serif', fontWeight: 600 }}>
            {headingCount === 1 ? '1 person is heading here right now' : `${headingCount} people are heading here right now`}
          </p>
        )}

        {/* Share */}
        <button
          onClick={() => setShareOpen(true)}
          style={{
            width: '100%', background: 'transparent',
            border: '1px solid rgba(57,217,138,0.3)', borderRadius: '14px',
            padding: '13px 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '15px',
            color: '#39D98A', cursor: 'pointer',
            marginBottom: waCheckinUrl ? '10px' : '0',
          }}
        >
          <Share2 size={16} color="#39D98A" />
          Share this place
        </button>

        {/* WhatsApp check-in */}
        {waCheckinUrl && (
          <a href={waCheckinUrl} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', display: 'block' }}>
            <div style={{
              background: 'transparent', border: '1px solid var(--color-border)',
              borderRadius: '14px', padding: '13px 20px',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: '14px',
              color: 'var(--color-muted)',
            }}>
              <span>💬</span>
              Can't scan? Check in on WhatsApp
            </div>
          </a>
        )}
      </div>
    </>
  );
}

// ─── Events Section with soft RSVP (spec section 9 + bonus) ─────────────────

function EventsSection({ events }: { events: Event[] }) {
  const [rsvpCounts, setRsvpCounts] = useState<Record<string, number>>({});
  const [userRsvps, setUserRsvps] = useState<Record<string, boolean>>({});
  const [userId, setUserId] = useState('');

  useEffect(() => {
    if (events.length === 0) return;
    getInteractiveUserId().then(uid => {
      setUserId(uid);
      const ids = events.map(e => e.id);
      getEventRsvpCountsBatch(ids).then(setRsvpCounts);
      Promise.all(ids.map(id => checkUserRsvp(id, uid))).then(results => {
        const map: Record<string, boolean> = {};
        ids.forEach((id, i) => { map[id] = results[i]; });
        setUserRsvps(map);
      });
    });
  }, [events]);

  async function handleRsvp(eventId: string) {
    if (!userId) return;
    const isGoing = userRsvps[eventId] ?? false;
    setUserRsvps(prev => ({ ...prev, [eventId]: !isGoing }));
    setRsvpCounts(prev => ({ ...prev, [eventId]: Math.max(0, (prev[eventId] ?? 0) + (isGoing ? -1 : 1)) }));
    if (isGoing) { await removeEventRsvp(eventId, userId); }
    else { await addEventRsvp(eventId, userId); }
    getEventRsvpCount(eventId).then(c => setRsvpCounts(prev => ({ ...prev, [eventId]: c })));
  }

  const upcoming = events.slice(0, 2);

  return (
    <div style={{ marginBottom: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '15px' }}>Upcoming events</h2>
        {events.length > 0 && (
          <span style={{
            fontSize: '11px', fontWeight: 700, color: 'var(--color-accent)',
            background: 'rgba(57,217,138,0.1)', padding: '2px 8px', borderRadius: '20px',
          }}>
            {events.length} upcoming
          </span>
        )}
      </div>

      {upcoming.length === 0 ? (
        <div style={{
          background: 'var(--color-surface)', border: '1px solid var(--color-border)',
          borderRadius: '14px', padding: '24px 16px', textAlign: 'center',
        }}>
          <div style={{ fontSize: '28px', marginBottom: '8px' }}>📅</div>
          <p style={{ fontSize: '13px', color: 'var(--color-muted)', lineHeight: 1.5 }}>
            Nothing on the calendar yet. Check back soon.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {upcoming.map(event => {
            const going = userRsvps[event.id] ?? false;
            const count = rsvpCounts[event.id] ?? 0;
            return (
              <div key={event.id} style={{
                background: 'var(--color-surface)', border: '1px solid var(--color-border)',
                borderRadius: '14px', padding: '14px',
              }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div style={{
                    flexShrink: 0, width: '48px',
                    background: 'var(--color-surface2)', borderRadius: '10px',
                    padding: '6px 4px', textAlign: 'center', border: '1px solid var(--color-border)',
                  }}>
                    <div style={{ fontSize: '10px', color: 'var(--color-accent)', fontWeight: 700, textTransform: 'uppercase' }}>
                      {new Date(event.startsAt).toLocaleDateString('en-ZA', { month: 'short' })}
                    </div>
                    <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '18px', color: 'var(--color-text)', lineHeight: 1 }}>
                      {new Date(event.startsAt).getDate()}
                    </div>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '14px', color: 'var(--color-text)', marginBottom: '3px' }}>
                      {event.title}
                    </div>
                    {event.description && (
                      <div style={{ fontSize: '12px', color: 'var(--color-muted)', marginBottom: '6px', lineHeight: 1.4 }}>
                        {event.description}
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '12px', color: 'var(--color-muted)' }}>
                        <Calendar size={11} />
                        {formatEventDate(event.startsAt)} · {formatEventTime(event.startsAt)}
                      </span>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: event.isFree ? '#39D98A' : '#F5A623' }}>
                        {event.isFree ? 'Free' : `R${event.price}`}
                      </span>
                    </div>
                  </div>
                </div>

                {/* RSVP row */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '10px', borderTop: '1px solid var(--color-border)' }}>
                  {count > 0 ? (
                    <span style={{ fontSize: '12px', color: 'var(--color-muted)' }}>
                      👋 {count === 1 ? '1 person might come' : `${count} people might come`}
                    </span>
                  ) : (
                    <span style={{ fontSize: '12px', color: 'var(--color-muted)' }}>Be the first to RSVP</span>
                  )}
                  <button
                    onClick={() => handleRsvp(event.id)}
                    style={{
                      background: going ? 'rgba(57,217,138,0.1)' : 'transparent',
                      border: going ? '1px solid rgba(57,217,138,0.3)' : '1px solid rgba(255,255,255,0.15)',
                      borderRadius: '20px', padding: '6px 14px',
                      fontSize: '12px', fontWeight: 700, cursor: 'pointer',
                      color: going ? '#39D98A' : 'var(--color-muted)',
                      fontFamily: 'DM Sans, sans-serif',
                      display: 'flex', alignItems: 'center', gap: '5px',
                    }}
                  >
                    {going ? (
                      <>Going 👋 <span style={{ fontSize: '11px', opacity: 0.7 }}>· Cancel</span></>
                    ) : (
                      'I might come 👋'
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function AboutSection({ venue }: { venue: Venue }) {
  const year = new Date(venue.createdAt).getFullYear();

  return (
    <div style={{ marginBottom: '20px' }}>
      <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '15px', marginBottom: '12px' }}>About this place</h2>
      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '14px', padding: '16px' }}>
        <p style={{ fontSize: '14px', color: 'var(--color-muted)', lineHeight: 1.7, marginBottom: '16px' }}>
          {venue.description}
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid var(--color-border)', paddingTop: '14px' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <span style={{ fontSize: '13px', color: 'var(--color-muted)', minWidth: '90px' }}>Type</span>
            <span style={{ fontSize: '13px', color: 'var(--color-text)', fontWeight: 600 }}>{venue.category}</span>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <span style={{ fontSize: '13px', color: 'var(--color-muted)', minWidth: '90px' }}>Neighbourhood</span>
            <span style={{ fontSize: '13px', color: 'var(--color-text)', fontWeight: 600 }}>{venue.neighborhood}, {venue.city}</span>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <span style={{ fontSize: '13px', color: 'var(--color-muted)', minWidth: '90px' }}>On Kayaa since</span>
            <span style={{ fontSize: '13px', color: 'var(--color-text)', fontWeight: 600 }}>{year}</span>
          </div>
          {venue.tags.length > 0 && (
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '4px' }}>
              {venue.tags.map(tag => (
                <span key={tag} style={{
                  fontSize: '11px', color: 'var(--color-muted)',
                  background: 'var(--color-surface2)', border: '1px solid var(--color-border)',
                  borderRadius: '20px', padding: '3px 10px',
                }}>
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PostsSection({ posts, venueName, venueId }: { posts: Post[]; venueName: string; venueId: string }) {
  if (posts.length === 0) return null;
  const score = getUserVenueScoreLocal(venueId, getVisitorId());
  const visitCount = score?.visitCount ?? 0;

  return (
    <div style={{ marginBottom: '20px' }}>
      <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '15px', marginBottom: '12px' }}>What people say</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {posts.map((post, idx) => {
          if (post.audience === 'regulars_only' && visitCount < 3) {
            return <LockedPostCard key={post.id} post={post} venueName={venueName} visitCount={visitCount} />;
          }
          return (
            <div key={post.id} style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '14px', padding: '14px', position: 'relative' }}>
              {post.audience === 'regulars_only' && (
                <span style={{ position: 'absolute', top: '12px', right: '12px', fontSize: '10px', fontWeight: 700, color: '#F5A623', background: 'rgba(245,166,35,0.1)', padding: '2px 7px', borderRadius: '10px', border: '1px solid rgba(245,166,35,0.2)' }}>
                  🔒 Regulars only
                </span>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0, background: 'rgba(57,217,138,0.1)', border: '1.5px solid rgba(57,217,138,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '13px', color: '#39D98A' }}>
                  {post.authorName[0]}
                </div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text)' }}>{post.authorName.split(' ')[0]}</div>
                  <div style={{ fontSize: '11px', color: 'var(--color-muted)' }}>{LIVE_TIMES[idx % LIVE_TIMES.length]}</div>
                </div>
              </div>
              <p style={{ fontSize: '14px', color: 'var(--color-text)', lineHeight: 1.6, marginBottom: '10px' }}>{post.content}</p>
              <div style={{ display: 'flex', gap: '14px' }}>
                <span style={{ fontSize: '12px', color: 'var(--color-muted)' }}>❤️ {post.likeCount}</span>
                <span style={{ fontSize: '12px', color: 'var(--color-muted)' }}>💬 {post.commentCount}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Feature 2: Vibe Check ───────────────────────────────────────────────────

const VIBE_CONFIG: Record<VibeType, { emoji: string; label: string; color: string }> = {
  busy:      { emoji: '🔥', label: 'Busy',      color: '#F97316' },
  chilled:   { emoji: '😌', label: 'Chilled',   color: '#60A5FA' },
  happening: { emoji: '🎉', label: 'Happening', color: '#A78BFA' },
};

function VibeCheckSection({ venueId }: { venueId: string }) {
  const [summary, setSummary] = useState<VibeSummary | null>(null);
  const [userId, setUserId] = useState<string>('');

  useEffect(() => {
    getInteractiveUserId().then(uid => {
      setUserId(uid);
      getVibeSummary(venueId, uid).then(setSummary);
    });
  }, [venueId]);

  async function handleVibeTap(vibe: VibeType) {
    if (!summary) return;
    const isSame = summary.userVibe === vibe;
    // Optimistic update
    const next: VibeSummary = { ...summary };
    if (isSame) {
      next[vibe] = Math.max(0, next[vibe] - 1);
      next.userVibe = null; next.userExpiresAt = null;
    } else {
      if (summary.userVibe) next[summary.userVibe] = Math.max(0, next[summary.userVibe] - 1);
      next[vibe] = next[vibe] + 1;
      next.userVibe = vibe;
      next.userExpiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
    }
    const max = Math.max(next.busy, next.chilled, next.happening);
    next.winning = max >= 2 ? (['busy', 'chilled', 'happening'] as VibeType[]).find(v => next[v] === max) ?? null : null;
    next.winningCount = max >= 2 ? max : 0;
    setSummary(next);

    if (isSame) { await cancelVibeReport(venueId, userId); }
    else { await reportVibe(venueId, userId, vibe); }
    // Refresh from DB
    getVibeSummary(venueId, userId).then(setSummary);
  }

  const vibes: VibeType[] = ['busy', 'chilled', 'happening'];
  const minsLeft = summary?.userExpiresAt
    ? Math.max(0, Math.round((new Date(summary.userExpiresAt).getTime() - Date.now()) / 60000))
    : null;

  return (
    <div style={{ marginBottom: '20px' }}>
      <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '15px', color: 'var(--color-text)', marginBottom: '12px' }}>
        What's the vibe right now?
      </h2>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
        {vibes.map(v => {
          const cfg = VIBE_CONFIG[v];
          const active = summary?.userVibe === v;
          return (
            <button
              key={v}
              onClick={() => handleVibeTap(v)}
              style={{
                flex: 1, padding: '10px 4px', borderRadius: '20px',
                background: active ? '#39D98A' : 'var(--color-surface)',
                border: active ? 'none' : '1px solid rgba(255,255,255,0.15)',
                color: active ? '#000' : '#fff',
                fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: '12px',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
              }}
            >
              <span>{cfg.emoji}</span>
              <span>{cfg.label}</span>
            </button>
          );
        })}
      </div>
      {summary && (
        summary.winning ? (
          <p style={{ fontSize: '13px', fontWeight: 700, color: VIBE_CONFIG[summary.winning].color, fontFamily: 'Syne, sans-serif', margin: 0 }}>
            {VIBE_CONFIG[summary.winning].emoji} {VIBE_CONFIG[summary.winning].label} right now — {summary.winningCount} people said so
          </p>
        ) : (
          <p style={{ fontSize: '12px', color: 'var(--color-muted)', fontFamily: 'DM Sans, sans-serif', margin: 0 }}>
            Be the first to report the vibe
          </p>
        )
      )}
      {summary?.userVibe && minsLeft !== null && minsLeft > 0 && (
        <p style={{ fontSize: '11px', color: 'var(--color-muted)', marginTop: '6px', fontFamily: 'DM Sans, sans-serif' }}>
          Thanks for the update. Expires in {minsLeft} minutes.
        </p>
      )}
    </div>
  );
}

// ─── Feature 4: Locked Post Card ─────────────────────────────────────────────

function LockedPostCard({ post: _post, venueName, visitCount }: { post: Post; venueName: string; visitCount: number }) {
  const needed = Math.max(0, 3 - visitCount);
  return (
    <div style={{
      background: 'var(--color-surface)', border: '1px solid var(--color-border)',
      borderRadius: '14px', overflow: 'hidden', marginBottom: '10px',
      position: 'relative',
    }}>
      {/* Blurred background placeholder */}
      <div style={{
        padding: '14px', filter: 'blur(4px)', userSelect: 'none', opacity: 0.3,
        pointerEvents: 'none',
      }}>
        <div style={{ height: '14px', background: 'var(--color-muted)', borderRadius: '4px', marginBottom: '8px', width: '80%' }} />
        <div style={{ height: '12px', background: 'var(--color-muted)', borderRadius: '4px', width: '60%' }} />
      </div>
      {/* Overlay */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'rgba(13,17,23,0.85)', backdropFilter: 'blur(8px)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '20px', textAlign: 'center', gap: '8px',
      }}>
        <span style={{ fontSize: '28px' }}>🔒</span>
        <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '14px', color: '#fff' }}>Regulars only</div>
        <p style={{ fontSize: '12px', color: 'var(--color-muted)', lineHeight: 1.5, margin: 0 }}>
          {venueName} shared this with their regulars.
        </p>
        <p style={{ fontSize: '12px', color: '#39D98A', fontWeight: 600, margin: 0 }}>
          {visitCount === 0
            ? 'Check in here to start unlocking regulars posts.'
            : `You've been here ${visitCount} time${visitCount !== 1 ? 's' : ''}. Visit ${needed} more time${needed !== 1 ? 's' : ''} to unlock.`}
        </p>
      </div>
    </div>
  );
}

// ─── Gallery Strip ────────────────────────────────────────────────────────────

function GalleryStrip({ venue, onImageClick }: { venue: Venue; onImageClick: (idx: number) => void }) {
  const images = venue.galleryImages ?? [];
  if (images.length < 2) return null;

  return (
    <div style={{ marginBottom: '20px' }}>
      <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '15px', color: 'var(--color-text)', marginBottom: '10px' }}>
        Inside {venue.name}
      </h2>
      <div style={{
        display: 'flex', gap: '8px',
        overflowX: 'auto', scrollbarWidth: 'none',
        marginLeft: '-16px', paddingLeft: '16px',
        marginRight: '-16px', paddingRight: '16px',
        paddingBottom: '4px',
        WebkitOverflowScrolling: 'touch',
      } as React.CSSProperties}>
        {images.map((url, i) => (
          <div
            key={i}
            onClick={() => onImageClick(i)}
            style={{
              flexShrink: 0, width: '140px', height: '140px',
              borderRadius: '12px', overflow: 'hidden', cursor: 'pointer',
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
            }}
          >
            <img
              src={url}
              alt={`${venue.name} photo ${i + 1}`}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              loading="lazy"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Image Lightbox ───────────────────────────────────────────────────────────

function ImageLightbox({
  images, index, onClose, onNavigate,
}: {
  images: string[]; index: number; onClose: () => void; onNavigate: (idx: number) => void;
}) {
  const touchStartX = useRef<number | null>(null);

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(dx) < 40) return;
    if (dx < 0 && index < images.length - 1) onNavigate(index + 1);
    if (dx > 0 && index > 0) onNavigate(index - 1);
  }

  return (
    <div
      onClick={onClose}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(0,0,0,0.95)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      {/* Close */}
      <button
        onClick={onClose}
        style={{
          position: 'absolute', top: '16px', right: '16px', zIndex: 201,
          width: '36px', height: '36px', borderRadius: '50%',
          background: 'rgba(255,255,255,0.12)', border: 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer',
        }}
      >
        <X size={18} color="#fff" />
      </button>

      {/* Counter */}
      <div style={{
        position: 'absolute', top: '20px', left: '50%', transform: 'translateX(-50%)',
        fontSize: '12px', color: 'rgba(255,255,255,0.6)', fontFamily: 'DM Sans, sans-serif',
        background: 'rgba(0,0,0,0.4)', borderRadius: '20px', padding: '4px 12px',
      }}>
        {index + 1} / {images.length}
      </div>

      {/* Image */}
      <img
        src={images[index]}
        alt={`Photo ${index + 1}`}
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: '100vw', maxHeight: '85vh', objectFit: 'contain', borderRadius: '4px' }}
      />

      {/* Left nav */}
      {index > 0 && (
        <button
          onClick={e => { e.stopPropagation(); onNavigate(index - 1); }}
          style={{
            position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)',
            width: '36px', height: '36px', borderRadius: '50%',
            background: 'rgba(255,255,255,0.12)', border: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <ChevronLeft size={20} color="#fff" />
        </button>
      )}

      {/* Right nav */}
      {index < images.length - 1 && (
        <button
          onClick={e => { e.stopPropagation(); onNavigate(index + 1); }}
          style={{
            position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
            width: '36px', height: '36px', borderRadius: '50%',
            background: 'rgba(255,255,255,0.12)', border: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <ChevronRight size={20} color="#fff" />
        </button>
      )}
    </div>
  );
}

// ─── Video Card ───────────────────────────────────────────────────────────────

function VideoCard({ venue }: { venue: Venue }) {
  const [muted, setMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  if (!venue.introVideo) return null;

  function toggleMute() {
    if (!videoRef.current) return;
    const newMuted = !muted;
    videoRef.current.muted = newMuted;
    setMuted(newMuted);
  }

  return (
    <div style={{ marginBottom: '20px' }}>
      <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '15px', color: 'var(--color-text)', marginBottom: '10px' }}>
        Watch {venue.name} in action
      </h2>
      <div style={{ position: 'relative', borderRadius: '14px', overflow: 'hidden', background: '#000' }}>
        <video
          ref={videoRef}
          src={venue.introVideo}
          autoPlay muted loop playsInline
          style={{ width: '100%', display: 'block', maxHeight: '300px', objectFit: 'cover' }}
        />
        <button
          onClick={toggleMute}
          style={{
            position: 'absolute', bottom: '12px', right: '12px',
            width: '34px', height: '34px', borderRadius: '50%',
            background: 'rgba(13,17,23,0.7)', border: '1px solid rgba(255,255,255,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', backdropFilter: 'blur(8px)',
          }}
        >
          {muted
            ? <VolumeX size={15} color="#fff" />
            : <Volume2 size={15} color="#fff" />
          }
        </button>
      </div>
    </div>
  );
}

// ─── Video Modal ──────────────────────────────────────────────────────────────

function VideoModal({ src, onClose }: { src: string; onClose: () => void }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(0,0,0,0.97)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <button
        onClick={onClose}
        style={{
          position: 'absolute', top: '16px', right: '16px',
          width: '36px', height: '36px', borderRadius: '50%',
          background: 'rgba(255,255,255,0.12)', border: 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer',
        }}
      >
        <X size={18} color="#fff" />
      </button>
      <video
        src={src}
        autoPlay controls playsInline
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: '100vw', maxHeight: '90vh', borderRadius: '8px' }}
      />
    </div>
  );
}

function StickyCheckinBar({ venue }: { venue: Venue }) {
  return (
    <div style={{
      position: 'fixed', bottom: '64px', left: 0, right: 0, zIndex: 45,
      padding: '10px 16px',
      background: 'rgba(13,17,23,0.88)', backdropFilter: 'blur(12px)',
      borderTop: '1px solid var(--color-border)',
    }}>
      <Link to={`/venue/${venue.slug}/checkin`} style={{ textDecoration: 'none', display: 'block' }}>
        <div style={{
          background: 'var(--color-accent)', color: '#000',
          borderRadius: '12px', padding: '14px 20px', textAlign: 'center',
          fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '15px',
        }}>
          Check in at {venue.name.split("'")[0].trim()}
        </div>
      </Link>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function VenuePage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [venue, setVenue] = useState<Venue | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [recentStats, setRecentStats] = useState<VenueRecentStats>({ monthlyCheckins: 0, weeklyCheckins: 0 });
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const [activeStory, setActiveStory] = useState<VenueStory24 | null>(null);
  const [storyViewerOpen, setStoryViewerOpen] = useState(false);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    setNotFound(false);

    getVenueBySlug(slug).then(v => {
      if (!v) { setNotFound(true); setLoading(false); return; }
      setVenue(v);
      setLoading(false);

      // Fetch events, posts, stories, recent stats, active story in parallel
      getVenueEvents(v.id).then(setEvents);
      getVenuePosts(v.id).then(setPosts);
      getActiveStories(v.id).then(setStories);
      getVenueRecentStats(v.id).then(setRecentStats);
      getActiveVenueStory(v.id).then(setActiveStory);
    });
  }, [slug]);

  if (loading) return <VenueSkeleton />;
  if (notFound || !venue) return <VenueNotFound />;

  const galleryImages2 = venue.galleryImages ?? [];

  return (
    <div>
      <HeroSection
        venue={venue}
        onBack={() => navigate(-1)}
        onPlayVideo={venue.introVideo ? () => setVideoModalOpen(true) : undefined}
      />

      {/* Story ring on hero — tap to open if active story */}
      {activeStory && (
        <div style={{ padding: '0 16px' }}>
          <button
            onClick={() => setStoryViewerOpen(true)}
            style={{
              width: '100%', background: 'rgba(34,197,94,0.08)',
              border: '1.5px solid #22c55e', borderRadius: '12px',
              padding: '10px 16px', cursor: 'pointer', marginTop: '12px',
              display: 'flex', alignItems: 'center', gap: '10px',
            }}
          >
            <div style={{ width: '28px', height: '28px', borderRadius: '50%', border: '2px solid #22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', flexShrink: 0 }}>
              📸
            </div>
            <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '13px', color: '#22c55e' }}>
              Watch today's story from {venue.name.split(' ')[0]}
            </span>
          </button>
        </div>
      )}

      <div style={{ padding: '0 16px', paddingBottom: '100px' }}>

        {/* 2. Quick Stats Row — regulars · check-ins · WhatsApp · vibe */}
        <QuickStatsRow venue={venue} recentStats={recentStats} />

        {/* 3. User's Personal Status */}
        <UserVisitBadge venueId={venue.id} />

        {/* 4. Primary Actions — Check In + Heading There */}
        <PrimaryActions venue={venue} />

        {/* 5. Vibe Check */}
        <VibeCheckSection venueId={venue.id} />

        {/* 6. Gallery Strip — only if 2+ images */}
        {galleryImages2.length >= 2 && (
          <GalleryStrip venue={venue} onImageClick={idx => setLightboxIdx(idx)} />
        )}

        {/* 7. Intro Video */}
        {venue.introVideo && <VideoCard venue={venue} />}

        {/* Text stories (legacy) */}
        {stories.length > 0 && <StoriesStrip stories={stories} />}

        {/* 8. Top Regulars */}
        <TopRegularsSection venue={venue} />

        {/* 9. Upcoming Events with RSVP */}
        <EventsSection events={events} />

        {/* 10. Posts */}
        <PostsSection posts={posts} venueName={venue.name} venueId={venue.id} />

        {/* About — kept at bottom for reference */}
        <AboutSection venue={venue} />
      </div>

      <StickyCheckinBar venue={venue} />

      {/* Lightbox */}
      {lightboxIdx !== null && galleryImages2.length > 0 && (
        <ImageLightbox
          images={galleryImages2}
          index={lightboxIdx}
          onClose={() => setLightboxIdx(null)}
          onNavigate={setLightboxIdx}
        />
      )}

      {/* Video modal */}
      {videoModalOpen && venue.introVideo && (
        <VideoModal src={venue.introVideo} onClose={() => setVideoModalOpen(false)} />
      )}

      {/* Story viewer */}
      {storyViewerOpen && activeStory && (
        <StoryViewer
          story={activeStory}
          venueName={venue.name}
          venueCategory={venue.category}
          onClose={() => setStoryViewerOpen(false)}
        />
      )}
    </div>
  );
}
