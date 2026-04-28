import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, MapPin, Clock, Calendar, CheckCircle2, Share2, X,
  ChevronLeft, ChevronRight, Play, Volume2, VolumeX,
  Heart, Phone, MessageCircle, Navigation,
} from 'lucide-react';
import StoryViewer from '../components/StoryViewer';
import { supabase } from '../lib/supabase';
import { PlaceShareModal } from '../components/place/ShareModal';
import { CheckInModal }    from '../components/place/CheckInModal';
import { SafetyRating }        from '../components/safety/SafetyRating';
import { SafetyCheckIn }       from '../components/safety/SafetyCheckIn';
import { ReportModal }         from '../components/moderation/ReportModal';
import { VerificationBadge }   from '../components/common/VerificationBadge';
import {
  getVenueBySlug, getVenueEvents, getVenuePosts, getActiveStories,
  getVenueRecentStats, getUserVenueScoreLocal, getVisitorId,
  getHeadingThereCount, signalHeadingThere, cancelHeadingThere,
  getVibeSummary, reportVibe, cancelVibeReport,
  getActiveVenueStory, getInteractiveUserId,
  getEventRsvpCountsBatch, checkUserRsvp, addEventRsvp, removeEventRsvp, getEventRsvpCount,
  getVenueRecentCheckIns,
} from '../lib/api';
import type { VenueRecentStats, VibeSummary, VenueStory24, VibeType, RecentCheckin } from '../lib/api';
import type { Venue, Event, Post, Story } from '../types';
import StoriesStrip from '../components/StoriesStrip';
import { haversineKm } from '../lib/geocode';
import { StockChecker } from '../components/utility/StockChecker';
import { QueueStatus }  from '../components/utility/QueueStatus';

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

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function formatEventDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short' });
}

function formatEventTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' });
}

function getStatus(venue: Venue): { label: string; color: string } {
  switch (venue.venueStatus) {
    case 'busy':   return { label: 'Busy now',  color: '#F5A623' };
    case 'quiet':  return { label: 'Quiet now', color: '#60A5FA' };
    case 'closed': return { label: 'Closed',    color: '#6B7280' };
    default:       return { label: 'Open now',  color: '#39D98A' };
  }
}

function formatWaNumber(n: string): string {
  const digits = n.replace(/\D/g, '');
  return digits.startsWith('0') ? '27' + digits.slice(1) : digits;
}

// localStorage-backed likes (no auth required)
function getLikedVenues(): Set<string> {
  try {
    const raw = localStorage.getItem('kayaa_liked_venues');
    return new Set<string>(raw ? JSON.parse(raw) : []);
  } catch { return new Set(); }
}
function setLikedVenues(set: Set<string>) {
  localStorage.setItem('kayaa_liked_venues', JSON.stringify([...set]));
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function SkeletonBlock({ w = '100%', h = 16, radius = 8, mb = 0 }: { w?: string | number; h?: number; radius?: number; mb?: number }) {
  return <div style={{ width: w, height: h, borderRadius: radius, background: 'var(--color-surface2)', marginBottom: mb }} />;
}

function VenueSkeleton() {
  return (
    <div>
      <div style={{ background: 'var(--color-surface2)', height: '300px' }} />
      <div style={{ padding: '16px' }}>
        <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
          {[1, 2, 3].map(i => <SkeletonBlock key={i} h={72} radius={14} />)}
        </div>
        <SkeletonBlock h={48} radius={14} mb={10} />
        <SkeletonBlock h={28} w="60%" mb={10} />
        <SkeletonBlock h={14} w="40%" mb={20} />
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
          {[1, 2, 3, 4, 5].map(i => <div key={i} style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--color-surface2)' }} />)}
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
      <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '20px', marginBottom: '8px', color: 'var(--color-text)' }}>
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

// ─── Photo Gallery Hero ───────────────────────────────────────────────────────

function PhotoGalleryHero({
  venue,
  distance,
  isLiked,
  onBack,
  onShare,
  onLike,
  onPlayVideo,
}: {
  venue: Venue;
  distance: number | null;
  isLiked: boolean;
  onBack: () => void;
  onShare: () => void;
  onLike: () => void;
  onPlayVideo?: () => void;
}) {
  // Merge gallery + cover into one array, deduplicated
  const allPhotos: string[] = [];
  const seen = new Set<string>();
  for (const url of [...(venue.galleryImages ?? []), venue.coverImage ?? '']) {
    if (url && !seen.has(url)) { seen.add(url); allPhotos.push(url); }
  }

  const [idx, setIdx] = useState(0);
  const touchStartX = useRef<number | null>(null);

  const emoji = CATEGORY_EMOJI[venue.category] ?? '📍';
  const color = CATEGORY_COLOR[venue.category] ?? '#39D98A';
  const status = getStatus(venue);
  const hasCover = allPhotos.length > 0;
  const isActive = venue.venueStatus !== 'closed';

  function handleTouchEnd(clientX: number) {
    if (touchStartX.current === null) return;
    const dx = clientX - touchStartX.current;
    touchStartX.current = null;
    if (dx < -40 && idx < allPhotos.length - 1) setIdx(i => i + 1);
    if (dx > 40 && idx > 0) setIdx(i => i - 1);
  }

  const iconBtn = (onClick: () => void, children: React.ReactNode) => (
    <button
      onClick={onClick}
      style={{
        width: '36px', height: '36px', borderRadius: '50%',
        background: 'rgba(13,17,23,0.55)', border: '1px solid rgba(255,255,255,0.15)',
        backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  );

  return (
    <div
      style={{ position: 'relative', height: '300px', overflow: 'hidden', background: '#0D1117' }}
      onTouchStart={e => { touchStartX.current = e.touches[0].clientX; }}
      onTouchEnd={e => handleTouchEnd(e.changedTouches[0].clientX)}
    >
      {/* Background image or emoji placeholder */}
      {hasCover ? (
        <img
          src={allPhotos[idx]}
          alt={`${venue.name} — photo ${idx + 1}`}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      ) : (
        <div style={{
          width: '100%', height: '100%',
          background: `linear-gradient(160deg, ${color}1A 0%, #0D1117 100%)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '80px',
        }}>
          {emoji}
        </div>
      )}

      {/* Gradient overlay */}
      <div style={{
        position: 'absolute', inset: 0,
        background: hasCover
          ? 'linear-gradient(to bottom, rgba(13,17,23,0.55) 0%, transparent 35%, rgba(13,17,23,0.92) 100%)'
          : 'none',
        pointerEvents: 'none',
      }} />

      {/* Top bar: Back | Intro-video play | Like + Share */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        padding: '16px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        zIndex: 3,
      }}>
        {iconBtn(onBack, <ArrowLeft size={16} color="#fff" />)}
        <div style={{ display: 'flex', gap: '8px' }}>
          {venue.introVideo && onPlayVideo && (
            iconBtn(onPlayVideo, <Play size={14} color="#fff" fill="#fff" />)
          )}
          {iconBtn(onLike,
            <Heart size={15} color={isLiked ? '#EF4444' : '#fff'} fill={isLiked ? '#EF4444' : 'none'} />
          )}
          {iconBtn(onShare, <Share2 size={15} color="#fff" />)}
        </div>
      </div>

      {/* Prev / Next arrows */}
      {idx > 0 && (
        <button
          onClick={() => setIdx(i => i - 1)}
          style={{
            position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', zIndex: 3,
            width: '32px', height: '32px', borderRadius: '50%',
            background: 'rgba(13,17,23,0.5)', border: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          }}
        >
          <ChevronLeft size={18} color="#fff" />
        </button>
      )}
      {allPhotos.length > 1 && idx < allPhotos.length - 1 && (
        <button
          onClick={() => setIdx(i => i + 1)}
          style={{
            position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', zIndex: 3,
            width: '32px', height: '32px', borderRadius: '50%',
            background: 'rgba(13,17,23,0.5)', border: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          }}
        >
          <ChevronRight size={18} color="#fff" />
        </button>
      )}

      {/* Bottom info overlay */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '14px 16px', zIndex: 3 }}>
        {/* Badges row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', flexWrap: 'wrap' }}>
          <span style={{
            fontSize: '11px', fontWeight: 700, color,
            background: `${color}22`, padding: '3px 10px', borderRadius: '20px',
            border: `1px solid ${color}40`,
          }}>
            {emoji} {venue.category}
          </span>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '5px',
            fontSize: '11px', fontWeight: 700, color: status.color,
            background: `${status.color}18`, padding: '3px 10px', borderRadius: '20px',
            border: `1px solid ${status.color}30`,
          }}>
            <span style={{
              width: '6px', height: '6px', borderRadius: '50%',
              background: status.color, display: 'inline-block',
              animation: isActive ? 'navLocPulse 1.2s ease-in-out infinite' : 'none',
            }} />
            {status.label}
          </span>
          {venue.isVerified && (
            venue.verificationType
              ? <VerificationBadge type={venue.verificationType} size="sm" showLabel />
              : (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: '4px',
                  fontSize: '11px', fontWeight: 700, color: '#39D98A',
                  background: 'rgba(57,217,138,0.14)', padding: '3px 8px', borderRadius: '20px',
                }}>
                  <CheckCircle2 size={11} color="#39D98A" />
                  Verified
                </span>
              )
          )}
        </div>

        {/* Venue name */}
        <h1 style={{
          fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '24px',
          color: '#fff', lineHeight: 1.15, margin: '0 0 5px',
          textShadow: '0 2px 10px rgba(0,0,0,0.7)',
        }}>
          {venue.name}
        </h1>

        {/* Address + distance */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'rgba(255,255,255,0.7)' }}>
            <MapPin size={12} />
            {venue.neighborhood}, {venue.city}
          </span>
          {distance !== null && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'rgba(255,255,255,0.7)' }}>
              <Navigation size={12} />
              {distance < 1 ? `${Math.round(distance * 1000)}m` : `${distance.toFixed(1)} km`} away
            </span>
          )}
        </div>

        {/* Photo dots */}
        {allPhotos.length > 1 && (
          <div style={{ display: 'flex', gap: '4px', marginTop: '8px' }}>
            {allPhotos.map((_, i) => (
              <div
                key={i}
                onClick={() => setIdx(i)}
                style={{
                  width: i === idx ? '16px' : '6px', height: '6px', borderRadius: '3px',
                  background: i === idx ? '#39D98A' : 'rgba(255,255,255,0.4)',
                  transition: 'width 0.2s, background 0.2s', cursor: 'pointer',
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── One-tap Action Grid ──────────────────────────────────────────────────────

function ActionGrid({ venue, onShare, onCheckIn }: { venue: Venue; onShare: () => void; onCheckIn: () => void }) {
  const [isHeading, setIsHeading]   = useState(false);
  const [headingCount, setHeadingCount] = useState(0);
  const [headingLoaded, setHeadingLoaded] = useState(false);
  const [toast, setToast] = useState('');
  const sessionKey = `kayaa_heading_${venue.id}`;

  const waUrl = venue.whatsappNumber
    ? `https://wa.me/${formatWaNumber(venue.whatsappNumber)}?text=${encodeURIComponent(`Hi! I found ${venue.name} on Kayaa and I'd like to know more.`)}`
    : null;

  useEffect(() => {
    setIsHeading(sessionStorage.getItem(sessionKey) === '1');
    getHeadingThereCount(venue.id).then(c => { setHeadingCount(c); setHeadingLoaded(true); });
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

  // Shared button style
  const actionBtnInner = (
    icon: React.ReactNode,
    label: string,
    bg: string,
    fg: string,
    shadow: string,
    disabled = false,
  ) => (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: '5px', padding: '14px 8px', borderRadius: '14px',
      background: disabled ? 'var(--color-surface)' : bg,
      border: disabled ? '1px solid var(--color-border)' : 'none',
      color: disabled ? 'rgba(255,255,255,0.25)' : fg,
      boxShadow: disabled ? 'none' : `0 4px 14px ${shadow}`,
      opacity: disabled ? 0.55 : 1,
      minHeight: '72px',
    }}>
      {icon}
      <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '11px', letterSpacing: '0.02em', textAlign: 'center' }}>
        {label}
      </span>
    </div>
  );

  return (
    <div style={{ marginBottom: '20px' }}>
      {toast && (
        <div style={{
          background: 'rgba(57,217,138,0.10)', border: '1px solid rgba(57,217,138,0.25)',
          borderRadius: '10px', padding: '10px 14px', marginBottom: '10px',
          fontSize: '13px', color: '#39D98A', fontFamily: 'DM Sans, sans-serif',
        }}>
          {toast}
        </div>
      )}

      {/* 3-up action buttons */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '10px' }}>
        {/* CHECK IN — opens quick modal; GPS full-flow stays in sticky bar */}
        <button onClick={onCheckIn} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'block' }}>
          {actionBtnInner(<CheckCircle2 size={24} />, 'CHECK IN', '#39D98A', '#000', 'rgba(57,217,138,0.4)')}
        </button>

        {/* CALL */}
        {venue.phoneNumber ? (
          <a href={`tel:${venue.phoneNumber}`} style={{ textDecoration: 'none' }}>
            {actionBtnInner(<Phone size={24} />, 'CALL', '#3B82F6', '#fff', 'rgba(59,130,246,0.4)')}
          </a>
        ) : (
          actionBtnInner(<Phone size={24} />, 'CALL', '', '', '', true)
        )}

        {/* WHATSAPP */}
        {waUrl ? (
          <a href={waUrl} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
            {actionBtnInner(<MessageCircle size={24} />, 'WHATSAPP', '#25D366', '#fff', 'rgba(37,211,102,0.4)')}
          </a>
        ) : (
          actionBtnInner(<MessageCircle size={24} />, 'WHATSAPP', '', '', '', true)
        )}
      </div>

      {/* Directions */}
      {venue.latitude != null && venue.longitude != null && (
        <a
          href={`https://www.google.com/maps/dir/?api=1&destination=${venue.latitude},${venue.longitude}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{ textDecoration: 'none', display: 'block', marginBottom: '10px' }}
        >
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            padding: '13px', borderRadius: '14px',
            background: 'var(--color-surface)', border: '1px solid var(--color-border)',
            fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '14px',
            color: 'var(--color-text)',
          }}>
            <Navigation size={16} color="var(--color-muted)" />
            Get Directions
          </div>
        </a>
      )}

      {/* Heading There */}
      {isHeading ? (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          padding: '13px 16px', marginBottom: '10px',
          background: 'rgba(57,217,138,0.06)', border: '1px solid rgba(57,217,138,0.2)', borderRadius: '14px',
        }}>
          <span style={{ fontSize: '14px', fontWeight: 700, color: '#39D98A', fontFamily: 'Syne, sans-serif', flex: 1 }}>
            On my way ✓
          </span>
          <button
            onClick={handleCancel}
            style={{ background: 'none', border: 'none', fontSize: '13px', color: 'var(--color-muted)', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}
          >
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

      {headingLoaded && headingCount > 0 && (
        <p style={{ fontSize: '13px', color: '#39D98A', textAlign: 'center', margin: '0 0 10px', fontFamily: 'DM Sans, sans-serif', fontWeight: 600 }}>
          {headingCount === 1 ? '1 person is heading here' : `${headingCount} people are heading here`}
        </p>
      )}

      {/* Share */}
      <button
        onClick={onShare}
        style={{
          width: '100%', background: 'transparent',
          border: '1px solid rgba(57,217,138,0.3)', borderRadius: '14px',
          padding: '13px 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
          fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '15px',
          color: '#39D98A', cursor: 'pointer',
        }}
      >
        <Share2 size={16} color="#39D98A" />
        Share this place
      </button>
    </div>
  );
}

// ─── Opening Hours Section ────────────────────────────────────────────────────

function OpeningHoursSection({ venue }: { venue: Venue }) {
  if (!venue.openHours) return null;
  const status = getStatus(venue);
  const isActive = venue.venueStatus !== 'closed';

  return (
    <div style={{ marginBottom: '20px' }}>
      <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '15px', color: 'var(--color-text)', marginBottom: '12px' }}>
        Opening hours
      </h2>
      <div style={{
        background: 'var(--color-surface)', border: '1px solid var(--color-border)',
        borderRadius: '14px', padding: '14px 16px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
          <span style={{
            width: '8px', height: '8px', borderRadius: '50%',
            background: status.color, flexShrink: 0,
            display: 'inline-block',
            animation: isActive ? 'navLocPulse 1.2s ease-in-out infinite' : 'none',
          }} />
          <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '13px', color: status.color }}>
            {status.label}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
          <Clock size={14} color="var(--color-muted)" style={{ flexShrink: 0, marginTop: '1px' } as React.CSSProperties} />
          <p style={{
            fontFamily: 'DM Sans, sans-serif', fontSize: '13px',
            color: 'rgba(255,255,255,0.7)', lineHeight: 1.7, margin: 0,
            whiteSpace: 'pre-wrap',
          }}>
            {venue.openHours}
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Real-time Recent Activity Feed ──────────────────────────────────────────

function RecentActivityFeed({ venueId }: { venueId: string }) {
  const [checkins, setCheckins] = useState<RecentCheckin[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    getVenueRecentCheckIns(venueId, 5)
      .then(data => { setCheckins(data); setLoaded(true); })
      .catch(() => setLoaded(true));

    const channel = supabase
      .channel(`recent-checkins:${venueId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'check_ins', filter: `venue_id=eq.${venueId}` },
        payload => {
          const r = payload.new as Record<string, unknown>;
          const entry: RecentCheckin = {
            id: String(r.id ?? Math.random()),
            visitorName: r.is_ghost ? 'Someone' : String(r.visitor_name ?? 'Someone'),
            createdAt: String(r.created_at ?? new Date().toISOString()),
          };
          setCheckins(prev => [entry, ...prev].slice(0, 5));
        },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [venueId]);

  if (!loaded || checkins.length === 0) return null;

  return (
    <div style={{ marginBottom: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '15px', color: 'var(--color-text)', margin: 0 }}>
          Recent activity
        </h2>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: '5px',
          fontSize: '11px', fontWeight: 700, color: '#39D98A',
          background: 'rgba(57,217,138,0.1)', padding: '2px 10px', borderRadius: '20px',
        }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#39D98A', display: 'inline-block', animation: 'navLocPulse 1.2s ease-in-out infinite' }} />
          Live
        </span>
      </div>
      <div style={{
        background: 'var(--color-surface)', border: '1px solid var(--color-border)',
        borderRadius: '14px', overflow: 'hidden',
      }}>
        {checkins.map((c, i) => (
          <div
            key={c.id}
            style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              padding: '11px 14px',
              borderBottom: i < checkins.length - 1 ? '1px solid var(--color-border)' : 'none',
            }}
          >
            <div style={{
              width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0,
              background: 'rgba(57,217,138,0.1)', border: '1px solid rgba(57,217,138,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '13px', color: '#39D98A',
            }}>
              {c.visitorName === 'Someone' ? '👤' : c.visitorName[0].toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', fontWeight: 600, color: 'var(--color-text)' }}>
                {c.visitorName}
              </span>
              <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: 'var(--color-muted)' }}>
                {' '}checked in
              </span>
            </div>
            <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.3)', flexShrink: 0 }}>
              {timeAgo(c.createdAt)}
            </span>
          </div>
        ))}
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
      background: 'rgba(57,217,138,0.06)', border: '1px solid rgba(57,217,138,0.16)',
      borderRadius: '12px', padding: '12px 14px', marginBottom: '12px',
      display: 'flex', alignItems: 'center', gap: '10px',
    }}>
      <span style={{ fontSize: '22px', flexShrink: 0 }}>
        {VISIT_BADGE_ICON[score.badgeTier] ?? '✓'}
      </span>
      <div>
        <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff', fontFamily: 'Syne, sans-serif', marginBottom: '1px' }}>
          You've been here {score.visitCount} {score.visitCount === 1 ? 'time' : 'times'}
        </div>
        <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.48)' }}>
          {score.badgeTier.charAt(0).toUpperCase() + score.badgeTier.slice(1)}{lastVisitLabel ? ` · ${lastVisitLabel}` : ''}
        </div>
      </div>
    </div>
  );
}

// ─── Quick Stats Row ──────────────────────────────────────────────────────────

const VIBE_WINNER_LABEL: Record<VibeType, string> = {
  busy: '🔥 Busy right now', chilled: '😌 Chilled right now', happening: '🎉 Happening right now',
};

function QuickStatsRow({ venue, recentStats, distance }: { venue: Venue; recentStats: VenueRecentStats; distance: number | null }) {
  const [vibeWinner, setVibeWinner] = useState<VibeType | null>(null);

  useEffect(() => {
    getVibeSummary(venue.id).then(s => {
      if (s.winning) setVibeWinner(s.winning);
    }).catch(() => {});
  }, [venue.id]);

  const stats: { label: string; value: string | number; color?: string }[] = [
    { label: 'regulars', value: venue.regularsCount.toLocaleString() },
    { label: 'today', value: venue.checkinsToday },
    { label: 'this week', value: recentStats.weeklyCheckins },
  ];
  if (distance !== null) {
    stats.push({ label: 'away', value: distance < 1 ? `${Math.round(distance * 1000)}m` : `${distance.toFixed(1)}km` });
  }

  return (
    <div style={{ paddingTop: '14px', paddingBottom: '14px', borderBottom: '1px solid var(--color-border)', marginBottom: '14px' }}>
      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: vibeWinner ? '8px' : '0' }}>
        {stats.map(s => (
          <div key={s.label}>
            <span style={{ fontSize: '15px', color: 'var(--color-text)', fontWeight: 700 }}>{s.value}</span>
            <span style={{ fontSize: '12px', color: 'var(--color-muted)' }}> {s.label}</span>
          </div>
        ))}
      </div>
      {vibeWinner && (
        <div style={{ fontSize: '12px', fontWeight: 700, color: '#F97316' }}>
          {VIBE_WINNER_LABEL[vibeWinner]}
        </div>
      )}
    </div>
  );
}

// ─── Top Regulars ─────────────────────────────────────────────────────────────

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

// ─── Events Section ───────────────────────────────────────────────────────────

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
          <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-accent)', background: 'rgba(57,217,138,0.1)', padding: '2px 8px', borderRadius: '20px' }}>
            {events.length} upcoming
          </span>
        )}
      </div>

      {upcoming.length === 0 ? (
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '14px', padding: '24px 16px', textAlign: 'center' }}>
          <div style={{ fontSize: '28px', marginBottom: '8px' }}>📅</div>
          <p style={{ fontSize: '13px', color: 'var(--color-muted)', lineHeight: 1.5 }}>Nothing on the calendar yet. Check back soon.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {upcoming.map(event => {
            const going = userRsvps[event.id] ?? false;
            const count = rsvpCounts[event.id] ?? 0;
            return (
              <div key={event.id} style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '14px', padding: '14px' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div style={{ flexShrink: 0, width: '48px', background: 'var(--color-surface2)', borderRadius: '10px', padding: '6px 4px', textAlign: 'center', border: '1px solid var(--color-border)' }}>
                    <div style={{ fontSize: '10px', color: 'var(--color-accent)', fontWeight: 700, textTransform: 'uppercase' }}>
                      {new Date(event.startsAt).toLocaleDateString('en-ZA', { month: 'short' })}
                    </div>
                    <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '18px', color: 'var(--color-text)', lineHeight: 1 }}>
                      {new Date(event.startsAt).getDate()}
                    </div>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '14px', color: 'var(--color-text)', marginBottom: '3px' }}>{event.title}</div>
                    {event.description && (
                      <div style={{ fontSize: '12px', color: 'var(--color-muted)', marginBottom: '6px', lineHeight: 1.4 }}>{event.description}</div>
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
                    {going ? <>Going 👋 <span style={{ fontSize: '11px', opacity: 0.7 }}>· Cancel</span></> : 'I might come 👋'}
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

// ─── About Section ────────────────────────────────────────────────────────────

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
          {venue.address && (
            <div style={{ display: 'flex', gap: '8px' }}>
              <span style={{ fontSize: '13px', color: 'var(--color-muted)', minWidth: '90px' }}>Address</span>
              <span style={{ fontSize: '13px', color: 'var(--color-text)', fontWeight: 600 }}>{venue.address}</span>
            </div>
          )}
          {venue.tags && venue.tags.length > 0 && (
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '4px' }}>
              {venue.tags.map(tag => (
                <span key={tag} style={{ fontSize: '11px', color: 'var(--color-muted)', background: 'var(--color-surface2)', border: '1px solid var(--color-border)', borderRadius: '20px', padding: '3px 10px' }}>
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

// ─── Posts Section ────────────────────────────────────────────────────────────

function LockedPostCard({ post: _post, venueName, visitCount }: { post: Post; venueName: string; visitCount: number }) {
  const needed = Math.max(0, 3 - visitCount);
  return (
    <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '14px', overflow: 'hidden', marginBottom: '10px', position: 'relative' }}>
      <div style={{ padding: '14px', filter: 'blur(4px)', userSelect: 'none', opacity: 0.3, pointerEvents: 'none' }}>
        <div style={{ height: '14px', background: 'var(--color-muted)', borderRadius: '4px', marginBottom: '8px', width: '80%' }} />
        <div style={{ height: '12px', background: 'var(--color-muted)', borderRadius: '4px', width: '60%' }} />
      </div>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(13,17,23,0.85)', backdropFilter: 'blur(8px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px', textAlign: 'center', gap: '8px' }}>
        <span style={{ fontSize: '28px' }}>🔒</span>
        <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '14px', color: '#fff' }}>Regulars only</div>
        <p style={{ fontSize: '12px', color: 'var(--color-muted)', lineHeight: 1.5, margin: 0 }}>{venueName} shared this with their regulars.</p>
        <p style={{ fontSize: '12px', color: '#39D98A', fontWeight: 600, margin: 0 }}>
          {visitCount === 0
            ? 'Check in here to start unlocking regulars posts.'
            : `You've been here ${visitCount} time${visitCount !== 1 ? 's' : ''}. Visit ${needed} more time${needed !== 1 ? 's' : ''} to unlock.`}
        </p>
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

// ─── Vibe Check Section ───────────────────────────────────────────────────────

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
              <span>{cfg.emoji}</span><span>{cfg.label}</span>
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
        paddingBottom: '4px', WebkitOverflowScrolling: 'touch',
      } as React.CSSProperties}>
        {images.map((url, i) => (
          <div
            key={i}
            onClick={() => onImageClick(i)}
            style={{ flexShrink: 0, width: '140px', height: '140px', borderRadius: '12px', overflow: 'hidden', cursor: 'pointer', background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
          >
            <img src={url} alt={`${venue.name} photo ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} loading="lazy" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Image Lightbox ───────────────────────────────────────────────────────────

function ImageLightbox({ images, index, onClose, onNavigate }: { images: string[]; index: number; onClose: () => void; onNavigate: (idx: number) => void }) {
  const touchStartX = useRef<number | null>(null);

  return (
    <div
      onClick={onClose}
      onTouchStart={e => { touchStartX.current = e.touches[0].clientX; }}
      onTouchEnd={e => {
        if (touchStartX.current === null) return;
        const dx = e.changedTouches[0].clientX - touchStartX.current;
        touchStartX.current = null;
        if (Math.abs(dx) < 40) return;
        if (dx < 0 && index < images.length - 1) onNavigate(index + 1);
        if (dx > 0 && index > 0) onNavigate(index - 1);
      }}
      style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.95)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    >
      <button onClick={onClose} style={{ position: 'absolute', top: '16px', right: '16px', zIndex: 201, width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(255,255,255,0.12)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
        <X size={18} color="#fff" />
      </button>
      <div style={{ position: 'absolute', top: '20px', left: '50%', transform: 'translateX(-50%)', fontSize: '12px', color: 'rgba(255,255,255,0.6)', fontFamily: 'DM Sans, sans-serif', background: 'rgba(0,0,0,0.4)', borderRadius: '20px', padding: '4px 12px' }}>
        {index + 1} / {images.length}
      </div>
      <img src={images[index]} alt={`Photo ${index + 1}`} onClick={e => e.stopPropagation()} style={{ maxWidth: '100vw', maxHeight: '85vh', objectFit: 'contain', borderRadius: '4px' }} />
      {index > 0 && (
        <button onClick={e => { e.stopPropagation(); onNavigate(index - 1); }} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(255,255,255,0.12)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <ChevronLeft size={20} color="#fff" />
        </button>
      )}
      {index < images.length - 1 && (
        <button onClick={e => { e.stopPropagation(); onNavigate(index + 1); }} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(255,255,255,0.12)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <ChevronRight size={20} color="#fff" />
        </button>
      )}
    </div>
  );
}

// ─── Video components ─────────────────────────────────────────────────────────

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
        <video ref={videoRef} src={venue.introVideo} autoPlay muted loop playsInline style={{ width: '100%', display: 'block', maxHeight: '300px', objectFit: 'cover' }} />
        <button onClick={toggleMute} style={{ position: 'absolute', bottom: '12px', right: '12px', width: '34px', height: '34px', borderRadius: '50%', background: 'rgba(13,17,23,0.7)', border: '1px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', backdropFilter: 'blur(8px)' }}>
          {muted ? <VolumeX size={15} color="#fff" /> : <Volume2 size={15} color="#fff" />}
        </button>
      </div>
    </div>
  );
}

function VideoModal({ src, onClose }: { src: string; onClose: () => void }) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.97)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <button onClick={onClose} style={{ position: 'absolute', top: '16px', right: '16px', width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(255,255,255,0.12)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
        <X size={18} color="#fff" />
      </button>
      <video src={src} autoPlay controls playsInline onClick={e => e.stopPropagation()} style={{ maxWidth: '100vw', maxHeight: '90vh', borderRadius: '8px' }} />
    </div>
  );
}

// ─── Location Section ─────────────────────────────────────────────────────────

function LocationSection({ venue, distance }: { venue: Venue; distance: number | null }) {
  if (!venue.latitude || !venue.longitude) {
    // No coords — still show address if available
    if (!venue.address) return null;
    return (
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '15px', color: 'var(--color-text)', marginBottom: '12px' }}>
          Location
        </h2>
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '14px', padding: '14px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
            <MapPin size={16} color="var(--color-muted)" style={{ flexShrink: 0, marginTop: '1px' } as React.CSSProperties} />
            <div>
              <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: 'rgba(255,255,255,0.75)', margin: 0, lineHeight: 1.55 }}>
                {venue.address}
              </p>
              <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: 'var(--color-muted)', margin: '2px 0 0' }}>
                {venue.neighborhood}, {venue.city}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${venue.latitude},${venue.longitude}`;

  return (
    <div style={{ marginBottom: '20px' }}>
      <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '15px', color: 'var(--color-text)', marginBottom: '12px' }}>
        Location
      </h2>
      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '14px', padding: '14px 16px' }}>

        {/* Address row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '12px' }}>
          <MapPin size={16} color="var(--color-muted)" style={{ flexShrink: 0, marginTop: '1px' } as React.CSSProperties} />
          <div style={{ flex: 1, minWidth: 0 }}>
            {venue.address && (
              <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: 'rgba(255,255,255,0.8)', margin: '0 0 2px', lineHeight: 1.5 }}>
                {venue.address}
              </p>
            )}
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: 'var(--color-muted)', margin: 0 }}>
              {venue.neighborhood}, {venue.city}
            </p>
            {distance !== null && (
              <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: '#39D98A', fontWeight: 600, margin: '4px 0 0', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Navigation size={12} />
                {distance < 1 ? `${Math.round(distance * 1000)} m` : `${distance.toFixed(1)} km`} from you
              </p>
            )}
          </div>
        </div>

        {/* OpenStreetMap embed — free, no token */}
        <div style={{ borderRadius: '10px', overflow: 'hidden', height: '180px', marginBottom: '12px', border: '1px solid var(--color-border)' }}>
          <iframe
            src={`https://www.openstreetmap.org/export/embed.html?bbox=${venue.longitude - 0.012},${venue.latitude - 0.008},${venue.longitude + 0.012},${venue.latitude + 0.008}&layer=mapnik&marker=${venue.latitude},${venue.longitude}`}
            style={{ width: '100%', height: '100%', border: 0, display: 'block', filter: 'invert(0.85) hue-rotate(180deg) brightness(0.9)' }}
            title={`Map showing ${venue.name}`}
            loading="lazy"
          />
        </div>

        {/* Directions link */}
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            padding: '11px', borderRadius: '10px',
            background: 'rgba(57,217,138,0.08)', border: '1px solid rgba(57,217,138,0.2)',
            fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '13px',
            color: '#39D98A', textDecoration: 'none',
          }}
        >
          <Navigation size={14} />
          Get Directions
        </a>
      </div>
    </div>
  );
}

// ─── Contact Section ──────────────────────────────────────────────────────────

function ContactSection({ venue }: { venue: Venue }) {
  const hasContact = !!(venue.phoneNumber || venue.whatsappNumber);
  if (!hasContact) return null;

  const waUrl = venue.whatsappNumber
    ? `https://wa.me/${venue.whatsappNumber.replace(/\D/g, '').replace(/^0/, '27')}`
    : null;

  const contactItems: { key: string; href: string; icon: React.ReactNode; label: string; sub: string; color: string; bg: string }[] = [];

  if (venue.phoneNumber) {
    contactItems.push({
      key: 'phone',
      href: `tel:${venue.phoneNumber}`,
      icon: <Phone size={18} color="#60A5FA" />,
      label: venue.phoneNumber,
      sub: 'Tap to call',
      color: '#60A5FA',
      bg: 'rgba(96,165,250,0.08)',
    });
  }

  if (waUrl) {
    contactItems.push({
      key: 'whatsapp',
      href: waUrl,
      icon: <MessageCircle size={18} color="#25D366" />,
      label: 'WhatsApp',
      sub: 'Chat with the owner',
      color: '#25D366',
      bg: 'rgba(37,211,102,0.08)',
    });
  }

  return (
    <div style={{ marginBottom: '20px' }}>
      <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '15px', color: 'var(--color-text)', marginBottom: '12px' }}>
        Contact
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {contactItems.map(item => (
          <a
            key={item.key}
            href={item.href}
            target={item.key === 'whatsapp' ? '_blank' : undefined}
            rel={item.key === 'whatsapp' ? 'noopener noreferrer' : undefined}
            style={{
              display: 'flex', alignItems: 'center', gap: '14px',
              padding: '14px 16px', borderRadius: '14px',
              background: item.bg,
              border: `1px solid ${item.color}30`,
              textDecoration: 'none',
            }}
          >
            <div style={{
              width: '40px', height: '40px', borderRadius: '50%', flexShrink: 0,
              background: `${item.color}15`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {item.icon}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 700, fontSize: '14px', color: 'var(--color-text)' }}>
                {item.label}
              </div>
              <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: 'var(--color-muted)', marginTop: '1px' }}>
                {item.sub}
              </div>
            </div>
            <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: item.color, fontWeight: 700 }}>
              →
            </span>
          </a>
        ))}
      </div>
    </div>
  );
}

// ─── Sticky check-in bar ──────────────────────────────────────────────────────

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

  const [loading,         setLoading]         = useState(true);
  const [notFound,        setNotFound]        = useState(false);
  const [venue,           setVenue]           = useState<Venue | null>(null);
  const [events,          setEvents]          = useState<Event[]>([]);
  const [posts,           setPosts]           = useState<Post[]>([]);
  const [stories,         setStories]         = useState<Story[]>([]);
  const [recentStats,     setRecentStats]     = useState<VenueRecentStats>({ monthlyCheckins: 0, weeklyCheckins: 0 });
  const [lightboxIdx,     setLightboxIdx]     = useState<number | null>(null);
  const [videoModalOpen,  setVideoModalOpen]  = useState(false);
  const [activeStory,     setActiveStory]     = useState<VenueStory24 | null>(null);
  const [storyViewerOpen, setStoryViewerOpen] = useState(false);
  const [shareOpen,         setShareOpen]         = useState(false);
  const [showCheckInModal,  setShowCheckInModal]  = useState(false);
  const [showSafetyCheckIn, setShowSafetyCheckIn] = useState(false);
  const [showReportModal,   setShowReportModal]   = useState(false);
  const [safetyRating,      setSafetyRating]      = useState(0);
  const [safetyReviews,     setSafetyReviews]     = useState(0);

  // Phase 3: distance + liked
  const [distance, setDistance] = useState<number | null>(null);
  const [isLiked,  setIsLiked]  = useState(false);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    setNotFound(false);

    getVenueBySlug(slug).then(v => {
      if (!v) { setNotFound(true); setLoading(false); return; }
      setVenue(v);
      setLoading(false);
      setIsLiked(getLikedVenues().has(v.id));

      // Load all supplementary data in parallel
      getVenueEvents(v.id).then(setEvents);
      getVenuePosts(v.id).then(setPosts);
      getActiveStories(v.id).then(setStories);
      getVenueRecentStats(v.id).then(setRecentStats);
      getActiveVenueStory(v.id).then(setActiveStory);

      // Safety rating from place_safety_summary view
      supabase
        .from('place_safety_summary')
        .select('avg_score, review_count')
        .eq('place_id', v.id)
        .maybeSingle()
        .then(({ data: sr }) => {
          if (sr) {
            setSafetyRating(Number(sr.avg_score));
            setSafetyReviews(Number(sr.review_count));
          }
        });

      // GPS distance calculation
      if (v.latitude != null && v.longitude != null && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          pos => {
            const km = haversineKm(pos.coords.latitude, pos.coords.longitude, v.latitude!, v.longitude!);
            setDistance(km);
          },
          () => {/* denied — silently skip */},
          { timeout: 6000, enableHighAccuracy: false, maximumAge: 60_000 },
        );
      }
    });
  }, [slug]);

  function handleLike() {
    if (!venue) return;
    const liked = getLikedVenues();
    if (liked.has(venue.id)) { liked.delete(venue.id); setIsLiked(false); }
    else { liked.add(venue.id); setIsLiked(true); }
    setLikedVenues(liked);
  }

  if (loading) return <VenueSkeleton />;
  if (notFound || !venue) return <VenueNotFound />;

  const galleryImages = venue.galleryImages ?? [];
  const emoji = CATEGORY_EMOJI[venue.category] ?? '📍';

  return (
    <div>
      {/* ── Share modal (lifted to page level, shared by hero + action grid) ── */}
      {shareOpen && (
        <PlaceShareModal
          place={{
            id: venue.id,
            name: venue.name,
            slug: venue.slug,
            tagline: venue.description?.slice(0, 80),
            emoji,
            category: venue.category,
          }}
          onClose={() => setShareOpen(false)}
        />
      )}

      {/* ── Quick check-in modal ───────────────────────────────────────────── */}
      {showCheckInModal && (
        <CheckInModal
          venue={{ id: venue.id, name: venue.name, slug: venue.slug, category: venue.category }}
          onClose={() => setShowCheckInModal(false)}
          onSuccess={() => setShowCheckInModal(false)}
        />
      )}

      {/* ── Photo Gallery Hero ─────────────────────────────────────────────── */}
      <PhotoGalleryHero
        venue={venue}
        distance={distance}
        isLiked={isLiked}
        onBack={() => navigate(-1)}
        onShare={() => setShareOpen(true)}
        onLike={handleLike}
        onPlayVideo={venue.introVideo ? () => setVideoModalOpen(true) : undefined}
      />

      {/* ── Story ring — tap to open active story ─────────────────────────── */}
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

        {/* ── Quick Stats (regulars · today · week · distance) ──────────────── */}
        <QuickStatsRow venue={venue} recentStats={recentStats} distance={distance} />

        {/* ── User's personal visit badge ───────────────────────────────────── */}
        <UserVisitBadge venueId={venue.id} />

        {/* ── One-tap action grid (Check In · Call · WhatsApp + Directions) ─── */}
        <ActionGrid venue={venue} onShare={() => setShareOpen(true)} onCheckIn={() => setShowCheckInModal(true)} />

        {/* ── Real-time recent activity ─────────────────────────────────────── */}
        <RecentActivityFeed venueId={venue.id} />

        {/* ── Vibe check ───────────────────────────────────────────────────── */}
        <VibeCheckSection venueId={venue.id} />

        {/* ── Opening hours ────────────────────────────────────────────────── */}
        <OpeningHoursSection venue={venue} />

        {/* ── Safety rating + check-in ─────────────────────────────────────── */}
        <div style={{ padding: '0 16px', marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <SafetyRating
            placeId={venue.id}
            rating={safetyRating}
            totalReviews={safetyReviews}
            showDetails
          />
          <button
            onClick={() => setShowSafetyCheckIn(true)}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              padding: '13px',
              background: 'rgba(57,217,138,0.08)',
              border: '1px solid rgba(57,217,138,0.2)',
              borderRadius: '14px',
              fontFamily: 'DM Sans, sans-serif', fontWeight: 700, fontSize: '14px',
              color: '#39D98A', cursor: 'pointer',
            }}
          >
            🛡️ Safety Check-in — let family know I'm here
          </button>
        </div>

        {/* ── Location map + address ───────────────────────────────────────── */}
        <LocationSection venue={venue} distance={distance} />

        {/* ── Contact (phone + WhatsApp) ────────────────────────────────────── */}
        <ContactSection venue={venue} />

        {/* ── Stock checker (Spaza Shops only) ─────────────────────────────── */}
        {/spaza|duka|kiosk|provision/i.test(venue.category) && (
          <div style={{ marginBottom: '20px' }}>
            <StockChecker area={`${venue.neighborhood}, ${venue.city}`} />
          </div>
        )}

        {/* ── Queue status (Clinics / service venues only) ───────────────────── */}
        {/clinic|hospital|health|home.?affair|sassa|police|post.?office/i.test(venue.category) && (
          <div style={{ marginBottom: '20px' }}>
            <QueueStatus />
          </div>
        )}

        {/* ── Gallery strip (2+ images) ─────────────────────────────────────── */}
        {galleryImages.length >= 2 && (
          <GalleryStrip venue={venue} onImageClick={idx => setLightboxIdx(idx)} />
        )}

        {/* ── Intro video ──────────────────────────────────────────────────── */}
        {venue.introVideo && <VideoCard venue={venue} />}

        {/* ── Text stories (legacy) ────────────────────────────────────────── */}
        {stories.length > 0 && <StoriesStrip stories={stories} />}

        {/* ── Top regulars ─────────────────────────────────────────────────── */}
        <TopRegularsSection venue={venue} />

        {/* ── Upcoming events with RSVP ─────────────────────────────────────── */}
        <EventsSection events={events} />

        {/* ── Community posts ──────────────────────────────────────────────── */}
        <PostsSection posts={posts} venueName={venue.name} venueId={venue.id} />

        {/* ── About ────────────────────────────────────────────────────────── */}
        <AboutSection venue={venue} />

        {/* ── Report issue ─────────────────────────────────────────────────── */}
        <button
          onClick={() => setShowReportModal(true)}
          style={{
            display: 'block', width: '100%', textAlign: 'center',
            background: 'none', border: 'none', cursor: 'pointer',
            fontFamily: 'DM Sans, sans-serif', fontSize: '12px',
            color: 'rgba(255,255,255,0.25)', padding: '8px 0 20px',
            transition: 'color 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.45)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.25)')}
        >
          Report an issue with this place
        </button>
      </div>

      {/* ── Sticky bottom CTA ─────────────────────────────────────────────── */}
      <StickyCheckinBar venue={venue} />

      {/* ── Lightbox ──────────────────────────────────────────────────────── */}
      {lightboxIdx !== null && galleryImages.length > 0 && (
        <ImageLightbox
          images={galleryImages}
          index={lightboxIdx}
          onClose={() => setLightboxIdx(null)}
          onNavigate={setLightboxIdx}
        />
      )}

      {/* ── Video modal ───────────────────────────────────────────────────── */}
      {videoModalOpen && venue.introVideo && (
        <VideoModal src={venue.introVideo} onClose={() => setVideoModalOpen(false)} />
      )}

      {/* ── Story viewer ──────────────────────────────────────────────────── */}
      {storyViewerOpen && activeStory && (
        <StoryViewer
          story={activeStory}
          venueName={venue.name}
          venueCategory={venue.category}
          onClose={() => setStoryViewerOpen(false)}
        />
      )}

      {/* ── Safety check-in modal ─────────────────────────────────────────── */}
      {showSafetyCheckIn && (
        <SafetyCheckIn
          placeId={venue.id}
          placeName={venue.name}
          onClose={() => setShowSafetyCheckIn(false)}
        />
      )}

      {/* ── Report modal ──────────────────────────────────────────────────── */}
      {showReportModal && (
        <ReportModal
          contentType="place"
          contentId={venue.id}
          onClose={() => setShowReportModal(false)}
        />
      )}
    </div>
  );
}
