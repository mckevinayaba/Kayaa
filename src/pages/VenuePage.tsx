import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, MapPin, Clock, Calendar, CheckCircle2, Share2, X,
  ChevronLeft, ChevronRight, Play,
  Heart, Phone, MessageCircle, Navigation, Store, Sparkles, Users,
} from 'lucide-react';
import { getCategoryEmoji, getVenueOpenStatus } from '../lib/venueUtils';
import { VenueStatusBadge } from '../components/VenueStatusBadge';
import { useAuth } from '../contexts/AuthContext';
import StoryViewer from '../components/StoryViewer';
import VideoPlayer from '../components/VideoPlayer';
import { supabase } from '../lib/supabase';
import { PlaceShareModal } from '../components/place/ShareModal';
import { CheckInModal }    from '../components/place/CheckInModal';
import { ReportModal }         from '../components/moderation/ReportModal';
import { VerificationBadge }   from '../components/common/VerificationBadge';
import {
  getVenueBySlug, getVenueEvents, getVenuePosts,
  getVenueRecentStats, getUserVenueScoreLocal, getVisitorId,
  getHeadingThereCount, signalHeadingThere, cancelHeadingThere,
  getVibeSummary,
  getActiveVenueStory, getInteractiveUserId,
  getEventRsvpCountsBatch, checkUserRsvp, addEventRsvp, removeEventRsvp, getEventRsvpCount,
  getVenueRecentCheckIns, recordVenueView, getVenueOwnerUpdates,
  getVenueRecommendations, getMyVenueRecommendation,
  upsertVenueRecommendation, removeVenueRecommendation,
  checkFollowsBusiness, getBusinessFollowerCount, followBusiness, unfollowBusiness,
  createOwnerUpdate,
  type VenueRecommendation,
} from '../lib/api';
import type { VenueRecentStats, VenueStory24, VibeType, RecentCheckin, VenueOwnerUpdate } from '../lib/api';
import type { Venue, Event, Post } from '../types';
import { haversineKm } from '../lib/geocode';

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORY_COLOR: Record<string, string> = {
  Barbershop: '#39D98A', Shisanyama: '#F5A623', Tavern: '#60A5FA',
  Café: '#F59E0B', Church: '#A78BFA', Carwash: '#34D399',
  'Spaza Shop': '#60A5FA', Salon: '#F472B6', Tutoring: '#34D399',
  'Sports Ground': '#FB923C', 'Home Business': '#94A3B8',
};

const NEW_PLACE_THRESHOLD_MS = 14 * 24 * 60 * 60 * 1000; // 14 days


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

function formatEventDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short' });
}

function formatEventTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' });
}

// Open/closed status is now computed by getVenueOpenStatus() from ../lib/venueUtils
// which handles all states (before_open, open, open_active, closing_soon, closed, no_hours)

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
      <div style={{ background: 'var(--color-surface2)', height: '320px' }} />
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

// ─── Post Update Modal ────────────────────────────────────────────────────────

type PostUpdateStatus = 'idle' | 'submitting' | 'done' | 'error';

const UPDATE_TYPE_OPTIONS: { value: VenueOwnerUpdate['type']; label: string; emoji: string; hint: string }[] = [
  { value: 'general',      label: 'General update', emoji: '📢', hint: 'e.g. "Power is back, we\'re open!"' },
  { value: 'special',      label: 'Special / deal',  emoji: '🎉', hint: 'e.g. "Weekend special — R50 off haircuts"' },
  { value: 'announcement', label: 'Announcement',    emoji: '📣', hint: 'e.g. "We\'re moving to a new location"' },
  { value: 'menu',         label: 'Menu / stock',    emoji: '🍽️', hint: 'e.g. "Fresh stock arrived today"' },
  { value: 'event',        label: 'Event',           emoji: '📅', hint: 'e.g. "Live music this Saturday 6pm"' },
];

const EXPIRY_OPTIONS = [
  { value: '', label: 'No expiry' },
  { value: '24h', label: 'Expires in 24 hours' },
  { value: '3d',  label: 'Expires in 3 days' },
  { value: '7d',  label: 'Expires in 7 days' },
];

function expiryToDate(val: string): string | null {
  if (!val) return null;
  const now = new Date();
  if (val === '24h') now.setHours(now.getHours() + 24);
  else if (val === '3d') now.setDate(now.getDate() + 3);
  else if (val === '7d') now.setDate(now.getDate() + 7);
  return now.toISOString();
}

function PostUpdateModal({
  venue, onClose, onPosted,
}: {
  venue: { id: string; name: string };
  onClose: () => void;
  onPosted: () => void;
}) {
  const [title,   setTitle]   = useState('');
  const [content, setContent] = useState('');
  const [type,    setType]    = useState<VenueOwnerUpdate['type']>('general');
  const [expiry,  setExpiry]  = useState('');
  const [status,  setStatus]  = useState<PostUpdateStatus>('idle');
  const [errMsg,  setErrMsg]  = useState('');

  const inputStyle: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: '10px', padding: '11px 14px',
    fontFamily: 'Inter, sans-serif', fontSize: '14px', color: '#F0F6FC',
    outline: 'none', resize: 'none' as const,
  };

  const currentTypeCfg = UPDATE_TYPE_OPTIONS.find(o => o.value === type)!;

  async function handleSubmit() {
    if (!title.trim()) return;
    setStatus('submitting');
    setErrMsg('');
    const err = await createOwnerUpdate(venue.id, {
      title: title.trim(),
      content: content.trim() || undefined,
      type,
      expires_at: expiryToDate(expiry),
    });
    if (err) {
      setStatus('error');
      setErrMsg(err);
    } else {
      setStatus('done');
      setTimeout(() => { onPosted(); onClose(); }, 1200);
    }
  }

  // Lock body scroll
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  if (status === 'done') {
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(7,10,15,0.88)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>✅</div>
          <p style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '16px', color: '#39D98A' }}>Update posted!</p>
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>Your followers will see it in their Following feed.</p>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(7,10,15,0.88)', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}
    >
      {/* Sheet */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#161B22',
          borderTop: '1px solid rgba(255,255,255,0.07)',
          borderRadius: '20px 20px 0 0',
          padding: `0 16px calc(env(safe-area-inset-bottom, 0px) + 24px)`,
          maxHeight: '92vh',
          overflowY: 'auto',
        }}
      >
        {/* Handle + header */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
          <div style={{ width: '36px', height: '4px', borderRadius: '2px', background: 'rgba(255,255,255,0.15)' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px', paddingTop: '8px' }}>
          <div>
            <p style={{ fontFamily: 'Inter, sans-serif', fontWeight: 800, fontSize: '17px', color: '#F0F6FC', margin: 0, lineHeight: 1.2 }}>
              Post an update
            </p>
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: 'rgba(255,255,255,0.38)', margin: '3px 0 0' }}>
              {venue.name} · visible to followers
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', fontSize: '22px', padding: '4px', lineHeight: 1 }}>×</button>
        </div>

        {/* Type selector */}
        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', scrollbarWidth: 'none', marginBottom: '16px', paddingBottom: '2px' } as React.CSSProperties}>
          {UPDATE_TYPE_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setType(opt.value)}
              style={{
                flexShrink: 0,
                padding: '6px 12px',
                borderRadius: '20px',
                border: type === opt.value ? 'none' : '1px solid rgba(255,255,255,0.12)',
                background: type === opt.value ? '#39D98A' : 'rgba(255,255,255,0.04)',
                color: type === opt.value ? '#0D1117' : 'rgba(255,255,255,0.55)',
                fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '12px',
                cursor: 'pointer',
                WebkitTapHighlightColor: 'transparent',
              } as React.CSSProperties}
            >
              {opt.emoji} {opt.label}
            </button>
          ))}
        </div>

        {/* Title */}
        <div style={{ marginBottom: '12px' }}>
          <label style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.55)', display: 'block', marginBottom: '6px' }}>
            What's the update? *
          </label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder={currentTypeCfg.hint}
            maxLength={120}
            style={inputStyle}
          />
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.25)', margin: '4px 0 0', textAlign: 'right' }}>
            {title.length}/120
          </p>
        </div>

        {/* Content */}
        <div style={{ marginBottom: '12px' }}>
          <label style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.55)', display: 'block', marginBottom: '6px' }}>
            More details <span style={{ fontWeight: 400, color: 'rgba(255,255,255,0.3)' }}>(optional)</span>
          </label>
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="Add more context, hours, prices…"
            maxLength={400}
            rows={3}
            style={inputStyle}
          />
        </div>

        {/* Expiry */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.55)', display: 'block', marginBottom: '6px' }}>
            Expiry
          </label>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {EXPIRY_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setExpiry(opt.value)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '20px',
                  border: expiry === opt.value ? 'none' : '1px solid rgba(255,255,255,0.1)',
                  background: expiry === opt.value ? 'rgba(57,217,138,0.15)' : 'rgba(255,255,255,0.03)',
                  color: expiry === opt.value ? '#39D98A' : 'rgba(255,255,255,0.45)',
                  fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: '12px',
                  cursor: 'pointer',
                } as React.CSSProperties}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Error */}
        {status === 'error' && (
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: '#F87171', margin: '0 0 10px', background: 'rgba(248,113,113,0.1)', borderRadius: '8px', padding: '8px 12px' }}>
            {errMsg || 'Something went wrong. Please try again.'}
          </p>
        )}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={!title.trim() || status === 'submitting'}
          style={{
            width: '100%', padding: '15px',
            background: title.trim() ? '#39D98A' : 'rgba(57,217,138,0.25)',
            border: 'none', borderRadius: '14px',
            fontFamily: 'Inter, sans-serif', fontWeight: 800, fontSize: '15px',
            color: title.trim() ? '#0D1117' : 'rgba(57,217,138,0.5)',
            cursor: title.trim() ? 'pointer' : 'default',
            transition: 'background 0.15s',
          }}
        >
          {status === 'submitting' ? 'Posting…' : 'Post update'}
        </button>
      </div>
    </div>
  );
}

// ─── Neighbourhood Favourite signal ──────────────────────────────────────────

function getNeighbourhoodSignal(
  followerCount: number,
  regularsCount: number,
  weeklyCheckins: number,
  createdAt: string,
): { label: string; color: string } | null {
  const ageMs = Date.now() - new Date(createdAt).getTime();
  const isVeryNew = ageMs < 14 * 24 * 60 * 60 * 1000 && regularsCount < 3;
  if (isVeryNew) return null;

  // Strong signal
  if (followerCount >= 8 || regularsCount >= 12 || weeklyCheckins >= 20) {
    return { label: '❤️ Popular in the neighbourhood', color: '#F472B6' };
  }
  // Soft signal
  if (followerCount >= 3 || regularsCount >= 6 || weeklyCheckins >= 8) {
    return { label: '👥 Locals love this place', color: '#A78BFA' };
  }
  return null;
}

// ─── 404 state ────────────────────────────────────────────────────────────────

function VenueNotFound() {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', minHeight: '70vh', padding: '32px', textAlign: 'center',
    }}>
      <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏚️</div>
      <h2 style={{ fontFamily: 'Inter, sans-serif', fontWeight: 800, fontSize: '20px', marginBottom: '8px', color: 'var(--color-text)' }}>
        This place isn't on Kayaa yet
      </h2>
      <p style={{ fontSize: '14px', color: 'var(--color-muted)', lineHeight: 1.6, marginBottom: '28px' }}>
        Know this place? Help put it on the map for your community.
      </p>
      <Link to="/onboarding" style={{
        display: 'block', background: 'var(--color-accent)', color: '#000',
        textDecoration: 'none', borderRadius: '12px', padding: '13px 28px',
        fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '15px', marginBottom: '16px',
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

  const emoji = getCategoryEmoji(venue.category);
  const color = CATEGORY_COLOR[venue.category] ?? '#39D98A';
  const hasRecentCheckin = !!(venue.lastCheckinAt && Date.now() - new Date(venue.lastCheckinAt).getTime() < 2 * 60 * 60 * 1000);
  const openStatus = getVenueOpenStatus(venue, hasRecentCheckin);
  const hasCover = allPhotos.length > 0;
  const todayCount = venue.checkinsToday ?? 0;

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
      style={{ position: 'relative', height: '320px', overflow: 'hidden', background: '#0D1117' }}
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

          {/* Open/closed status — from ownerHours, null-safe */}
          <VenueStatusBadge status={openStatus} size="sm" />

          {/* Community activity — always shown alongside or instead of owner status */}
          {todayCount >= 3 && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '5px',
              fontSize: '11px', fontWeight: 700, color: '#39D98A',
              background: 'rgba(57,217,138,0.14)', padding: '3px 10px', borderRadius: '20px',
              border: '1px solid rgba(57,217,138,0.3)',
            }}>
              <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#39D98A', display: 'inline-block', animation: 'navLocPulse 1.2s ease-in-out infinite' }} />
              {todayCount} here today
            </span>
          )}
          {todayCount === 1 || todayCount === 2 ? (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '5px',
              fontSize: '11px', fontWeight: 700, color: '#FBBF24',
              background: 'rgba(251,191,36,0.12)', padding: '3px 10px', borderRadius: '20px',
              border: '1px solid rgba(251,191,36,0.28)',
            }}>
              <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#FBBF24', display: 'inline-block' }} />
              Someone was here today
            </span>
          ) : null}

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

          {/* Newly added badge — shown for first 14 days */}
          {Date.now() - new Date(venue.createdAt).getTime() < NEW_PLACE_THRESHOLD_MS && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '4px',
              fontSize: '11px', fontWeight: 700, color: '#39D98A',
              background: 'rgba(57,217,138,0.18)', padding: '3px 9px', borderRadius: '20px',
              border: '1px solid rgba(57,217,138,0.35)',
            }}>
              <Sparkles size={10} color="#39D98A" />
              New place
            </span>
          )}

          {/* Owner managed badge — shown when ownerClaimed */}
          {venue.ownerClaimed && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '4px',
              fontSize: '11px', fontWeight: 700, color: '#60A5FA',
              background: 'rgba(96,165,250,0.14)', padding: '3px 9px', borderRadius: '20px',
              border: '1px solid rgba(96,165,250,0.3)',
            }}>
              <Store size={10} color="#60A5FA" />
              Owner managed
            </span>
          )}
        </div>

        {/* Venue name */}
        <h1 style={{
          fontFamily: 'Inter, sans-serif', fontWeight: 800, fontSize: '26px',
          color: '#fff', lineHeight: 1.15, margin: '0 0 5px',
          textShadow: '0 2px 12px rgba(0,0,0,0.8)',
        }}>
          {venue.name}
        </h1>

        {/* Address + distance */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '5px' }}>
            <MapPin size={13} color="rgba(255,255,255,0.7)" style={{ flexShrink: 0, marginTop: '2px' } as React.CSSProperties} />
            <div>
              {venue.address ? (
                <span style={{
                  fontSize: '13px', color: 'rgba(255,255,255,0.9)', fontWeight: 600,
                  lineHeight: 1.35, display: 'block',
                  textShadow: '0 1px 8px rgba(0,0,0,0.7)',
                }}>
                  {venue.address}
                </span>
              ) : null}
              <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.55)', display: 'block', marginTop: venue.address ? '1px' : 0 }}>
                {venue.neighborhood}, {venue.city}
              </span>
            </div>
          </div>
          {distance !== null && (
            <span style={{
              display: 'flex', alignItems: 'center', gap: '4px',
              fontSize: '12px', fontWeight: 700, color: '#39D98A',
              marginLeft: '18px',
            }}>
              <Navigation size={11} />
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
  ) => (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: '5px', padding: '14px 8px', borderRadius: '14px',
      background: bg,
      border: 'none',
      color: fg,
      boxShadow: `0 4px 14px ${shadow}`,
      minHeight: '72px',
    }}>
      {icon}
      <span style={{ fontFamily: 'Inter, sans-serif', fontWeight: 800, fontSize: '11px', letterSpacing: '0.02em', textAlign: 'center' }}>
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
          fontSize: '13px', color: '#39D98A', fontFamily: 'Inter, sans-serif',
        }}>
          {toast}
        </div>
      )}

      {/* Action buttons — auto-fit based on how many are present */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${1 + (venue.phoneNumber ? 1 : 0) + (waUrl ? 1 : 0)}, 1fr)`,
        gap: '10px', marginBottom: '10px',
      }}>
        {/* CHECK IN — opens quick modal; GPS full-flow stays in sticky bar */}
        <button onClick={onCheckIn} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'block' }}>
          {actionBtnInner(<CheckCircle2 size={24} />, 'CHECK IN', '#39D98A', '#000', 'rgba(57,217,138,0.4)')}
        </button>

        {/* CALL — only rendered when phone number exists */}
        {venue.phoneNumber && (
          <a href={`tel:${venue.phoneNumber}`} style={{ textDecoration: 'none' }}>
            {actionBtnInner(<Phone size={24} />, 'CALL', '#3B82F6', '#fff', 'rgba(59,130,246,0.4)')}
          </a>
        )}

        {/* WHATSAPP — only rendered when number exists */}
        {waUrl && (
          <a href={waUrl} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
            {actionBtnInner(<MessageCircle size={24} />, 'WHATSAPP', '#25D366', '#fff', 'rgba(37,211,102,0.4)')}
          </a>
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
            fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '14px',
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
          <span style={{ fontSize: '14px', fontWeight: 700, color: '#39D98A', fontFamily: 'Inter, sans-serif', flex: 1 }}>
            On my way ✓
          </span>
          <button
            onClick={handleCancel}
            style={{ background: 'none', border: 'none', fontSize: '13px', color: 'var(--color-muted)', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}
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
            fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '15px',
            cursor: 'pointer', textAlign: 'center', marginBottom: '10px',
          }}
        >
          I'm heading there 🚶
        </button>
      )}

      {headingLoaded && headingCount > 0 && (
        <p style={{ fontSize: '13px', color: '#39D98A', textAlign: 'center', margin: '0 0 10px', fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>
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
          fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '15px',
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
  const hasRecentCheckin = !!(venue.lastCheckinAt && Date.now() - new Date(venue.lastCheckinAt).getTime() < 2 * 60 * 60 * 1000);
  const openStatus = getVenueOpenStatus(venue, hasRecentCheckin);
  const showStatus = openStatus.state !== 'no_hours' && openStatus.state !== 'closed_today';

  return (
    <div style={{ marginBottom: '20px' }}>
      <h2 style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '16px', color: 'var(--color-text)', marginBottom: '14px', letterSpacing: '-0.01em' }}>
        Opening hours
      </h2>
      <div style={{
        background: 'var(--color-surface)', border: '1px solid var(--color-border)',
        borderRadius: '14px', padding: '14px 16px',
      }}>
        {showStatus && (
          <div style={{ marginBottom: '10px' }}>
            <VenueStatusBadge status={openStatus} size="md" />
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
          <Clock size={14} color="var(--color-muted)" style={{ flexShrink: 0, marginTop: '1px' } as React.CSSProperties} />
          <p style={{
            fontFamily: 'Inter, sans-serif', fontSize: '13px',
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
        <h2 style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '16px', color: 'var(--color-text)', margin: 0, letterSpacing: '-0.01em' }}>
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
              fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '13px', color: '#39D98A',
            }}>
              {c.visitorName === 'Someone' ? '👤' : c.visitorName[0].toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', fontWeight: 600, color: 'var(--color-text)' }}>
                {c.visitorName}
              </span>
              <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: 'var(--color-muted)' }}>
                {' '}checked in
              </span>
            </div>
            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.3)', flexShrink: 0 }}>
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
        <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff', fontFamily: 'Inter, sans-serif', marginBottom: '1px' }}>
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

function QuickStatsRow({ venue, recentStats, distance, followerCount }: { venue: Venue; recentStats: VenueRecentStats; distance: number | null; followerCount?: number }) {
  const [vibeWinner, setVibeWinner] = useState<VibeType | null>(null);
  const [showRegularsHint, setShowRegularsHint] = useState(false);

  useEffect(() => {
    getVibeSummary(venue.id).then(s => {
      if (s.winning) setVibeWinner(s.winning);
    }).catch(() => {});
  }, [venue.id]);

  const stats: { label: string; value: string | number; color?: string }[] = [];
  if ((followerCount ?? 0) > 0) {
    stats.push({ label: 'followers', value: (followerCount ?? 0).toLocaleString() });
  }
  stats.push(
    { label: 'regulars', value: venue.regularsCount.toLocaleString() },
    { label: 'today', value: venue.checkinsToday },
    { label: 'this week', value: recentStats.weeklyCheckins },
  );
  if (distance !== null) {
    stats.push({ label: 'away', value: distance < 1 ? `${Math.round(distance * 1000)}m` : `${distance.toFixed(1)}km` });
  }

  return (
    <div style={{ paddingTop: '14px', paddingBottom: '14px', borderBottom: '1px solid var(--color-border)', marginBottom: '14px' }}>
      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: vibeWinner ? '8px' : '0' }}>
        {stats.map(s => (
          <div key={s.label} style={{ position: 'relative' }}>
            <span style={{ fontSize: '17px', color: 'var(--color-text)', fontWeight: 700 }}>{s.value}</span>
            <span style={{ fontSize: '12px', color: 'var(--color-muted)' }}> {s.label}</span>
            {s.label === 'regulars' && (
              <button
                onClick={() => setShowRegularsHint(v => !v)}
                style={{
                  background: 'none', border: 'none', padding: '0 0 0 4px',
                  fontSize: '11px', color: 'rgba(255,255,255,0.3)',
                  cursor: 'pointer', verticalAlign: 'middle', lineHeight: 1,
                }}
                aria-label="What are regulars?"
              >
                ⓘ
              </button>
            )}
            {s.label === 'regulars' && showRegularsHint && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, zIndex: 20,
                marginTop: '6px', width: '220px',
                background: '#161B22', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '10px', padding: '10px 12px',
                fontSize: '12px', color: 'rgba(255,255,255,0.65)',
                lineHeight: 1.55, fontFamily: 'Inter, sans-serif',
                boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
              }}>
                Regulars are people who visit this place often. 5 visits and you become one.
                <button
                  onClick={() => setShowRegularsHint(false)}
                  style={{ display: 'block', marginTop: '6px', background: 'none', border: 'none', fontSize: '11px', color: '#39D98A', cursor: 'pointer', padding: 0 }}
                >
                  Got it
                </button>
              </div>
            )}
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
        <h2 style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '16px', letterSpacing: '-0.01em' }}>Upcoming events</h2>
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
                    <div style={{ fontFamily: 'Inter, sans-serif', fontWeight: 800, fontSize: '18px', color: 'var(--color-text)', lineHeight: 1 }}>
                      {new Date(event.startsAt).getDate()}
                    </div>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '14px', color: 'var(--color-text)', marginBottom: '3px' }}>{event.title}</div>
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
                      fontFamily: 'Inter, sans-serif',
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

// ─── Place Story Panel ────────────────────────────────────────────────────────
// Surfaces description, trust signals, and tags early in the page scroll.

function PlaceStoryPanel({ venue }: { venue: Venue }) {
  const [expanded, setExpanded] = useState(false);
  const desc = venue.description ?? '';
  const isNew = Date.now() - new Date(venue.createdAt).getTime() < NEW_PLACE_THRESHOLD_MS;
  const isActiveToday = !!(venue.checkinsToday && venue.checkinsToday > 0);
  const hasRecentCheckin = !!(
    venue.lastCheckinAt &&
    Date.now() - new Date(venue.lastCheckinAt).getTime() < 2 * 60 * 60 * 1000
  );
  const truncated = desc.length > 160 && !expanded;
  const displayDesc = truncated ? desc.slice(0, 157) + '…' : desc;

  type Chip = {
    key: string;
    icon: React.ReactNode;
    label: string;
    color: string;
    bg: string;
    border: string;
  };
  const chips: Chip[] = [];

  // Active today — always highest priority, backed by real check-in data
  if (isActiveToday || hasRecentCheckin) chips.push({
    key: 'active',
    icon: <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#39D98A', display: 'inline-block', flexShrink: 0, animation: 'navLocPulse 1.2s ease-in-out infinite' }} />,
    label: venue.checkinsToday && venue.checkinsToday >= 3
      ? `${venue.checkinsToday} people here today`
      : 'Active today',
    color: '#39D98A',
    bg: 'rgba(57,217,138,0.08)', border: 'rgba(57,217,138,0.2)',
  });

  // Owner managed — only when explicitly claimed
  if (venue.ownerClaimed) chips.push({
    key: 'claimed',
    icon: <Store size={10} color="#60A5FA" style={{ flexShrink: 0 }} />,
    label: 'Owner managed',
    color: '#60A5FA',
    bg: 'rgba(96,165,250,0.1)', border: 'rgba(96,165,250,0.25)',
  });

  // Verified — backed by isVerified flag (not shown if VerificationBadge handles it separately)
  if (venue.isVerified && !venue.verificationType) chips.push({
    key: 'verified',
    icon: <CheckCircle2 size={10} color="#A78BFA" style={{ flexShrink: 0 }} />,
    label: 'Verified',
    color: '#A78BFA',
    bg: 'rgba(167,139,250,0.1)', border: 'rgba(167,139,250,0.25)',
  });

  // Regulars — only meaningful above a real threshold
  const regulars = venue.regularsCount ?? venue.checkinCount;
  if (regulars >= 20) chips.push({
    key: 'regulars',
    icon: <Users size={10} color="#FBBF24" style={{ flexShrink: 0 }} />,
    label: `${regulars >= 1000 ? `${(regulars / 1000).toFixed(1)}k` : regulars} regulars`,
    color: '#FBBF24',
    bg: 'rgba(251,191,36,0.08)', border: 'rgba(251,191,36,0.2)',
  });

  // Newly added — only for first 14 days
  if (isNew) chips.push({
    key: 'new',
    icon: <Sparkles size={10} color="#39D98A" style={{ flexShrink: 0 }} />,
    label: 'Newly added',
    color: '#39D98A',
    bg: 'rgba(57,217,138,0.08)', border: 'rgba(57,217,138,0.2)',
  });

  const hasTags = !!(venue.tags && venue.tags.length > 0);
  if (!desc && chips.length === 0 && !hasTags) return null;

  return (
    <div style={{ marginBottom: '20px' }}>
      {/* Description card */}
      {desc && (
        <div style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: '14px', padding: '14px 16px',
          marginBottom: chips.length > 0 || hasTags ? '10px' : 0,
        }}>
          <p style={{
            fontFamily: 'Inter, sans-serif', fontSize: '14px',
            color: 'rgba(255,255,255,0.72)', lineHeight: 1.65, margin: 0,
          }}>
            {displayDesc}
          </p>
          {desc.length > 160 && (
            <button
              onClick={() => setExpanded(e => !e)}
              style={{
                marginTop: '8px', background: 'none', border: 'none', padding: 0,
                fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 700,
                color: '#39D98A', cursor: 'pointer',
              }}
            >
              {expanded ? 'Show less' : 'Read more'}
            </button>
          )}
        </div>
      )}

      {/* Trust + status chips */}
      {chips.length > 0 && (
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: hasTags ? '8px' : 0 }}>
          {chips.map(chip => (
            <span
              key={chip.key}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '5px',
                fontSize: '11px', fontWeight: 700, color: chip.color,
                background: chip.bg, border: `1px solid ${chip.border}`,
                borderRadius: '20px', padding: '4px 10px',
                fontFamily: 'Inter, sans-serif',
              }}
            >
              {chip.icon}
              {chip.label}
            </span>
          ))}
        </div>
      )}

      {/* Tags */}
      {hasTags && (
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {(venue.tags ?? []).map(tag => (
            <span key={tag} style={{
              fontSize: '11px', color: 'var(--color-muted)',
              background: 'var(--color-surface2)',
              border: '1px solid var(--color-border)',
              borderRadius: '20px', padding: '4px 10px',
              fontFamily: 'Inter, sans-serif',
            }}>
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Neighbour Recommendations ───────────────────────────────────────────────
// No star ratings. Neighbours say why they like a place.
// One recommendation per visitor (visitor_id). Soft-delete on removal.

const REC_TAGS = ['Friendly', 'Affordable', 'Fast', 'Safe', 'Good quality'] as const;
const REC_PLACEHOLDERS = [
  'Friendly and affordable',
  'Always open when others are closed',
  'Clean and safe',
  'Good service, owner is kind',
];

function formatDisplayName(raw: string): string {
  // "Kevin Ayaba" → "Kevin A."
  const parts = raw.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
}

function getStoredVisitorName(): string {
  return localStorage.getItem('kayaa_visitor_name') ?? '';
}

function RecModal({
  existing,
  onSave,
  onClose,
}: {
  existing:  VenueRecommendation | null;
  onSave:    (text: string | null, tags: string[], name: string | null) => Promise<void>;
  onClose:   () => void;
}) {
  const [text,    setText]    = useState(existing?.text ?? '');
  const [tags,    setTags]    = useState<string[]>(existing?.tags ?? []);
  const [name,    setName]    = useState(getStoredVisitorName());
  const [saving,  setSaving]  = useState(false);
  const charLeft = 120 - text.length;

  function toggleTag(tag: string) {
    setTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : prev.length < 3 ? [...prev, tag] : prev,  // max 3 tags
    );
  }

  async function handleSave(skipText = false) {
    setSaving(true);
    const displayName = name.trim() ? formatDisplayName(name.trim()) : null;
    if (displayName) localStorage.setItem('kayaa_visitor_name', name.trim());
    await onSave(skipText ? null : (text.trim() || null), tags, displayName);
    setSaving(false);
  }

  const placeholder = REC_PLACEHOLDERS[Math.floor(Math.random() * REC_PLACEHOLDERS.length)];

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 300,
        background: 'rgba(0,0,0,0.85)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      }}
    >
      <div style={{
        width: '100%', maxWidth: '480px',
        background: 'var(--color-surface)', borderRadius: '20px 20px 0 0',
        padding: '24px 20px 44px', boxSizing: 'border-box',
        maxHeight: '92dvh', overflowY: 'auto',
      }}>
        {/* Drag handle */}
        <div style={{ width: '36px', height: '4px', borderRadius: '2px', background: 'rgba(255,255,255,0.15)', margin: '0 auto 20px' }} />

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <h2 style={{ fontFamily: 'Inter, sans-serif', fontWeight: 800, fontSize: '18px', color: 'var(--color-text)', margin: 0 }}>
            Why do you recommend this place?
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', flexShrink: 0, marginLeft: '12px' }}>
            <X size={20} color="var(--color-muted)" />
          </button>
        </div>

        {/* Quick tags */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
          {REC_TAGS.map(tag => {
            const active = tags.includes(tag);
            return (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                style={{
                  padding: '7px 14px', borderRadius: '20px', cursor: 'pointer',
                  fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: '13px',
                  background: active ? 'rgba(57,217,138,0.15)' : 'var(--color-surface2)',
                  border:     active ? '1.5px solid rgba(57,217,138,0.5)' : '1px solid var(--color-border)',
                  color:      active ? '#39D98A' : 'var(--color-muted)',
                  transition: 'all 0.15s',
                }}
              >
                {tag}
              </button>
            );
          })}
        </div>

        {/* Text field */}
        <div style={{ marginBottom: '14px' }}>
          <textarea
            value={text}
            onChange={e => setText(e.target.value.slice(0, 120))}
            placeholder={placeholder}
            rows={3}
            style={{
              width: '100%', boxSizing: 'border-box',
              background: 'var(--color-surface2)', border: '1px solid var(--color-border)',
              borderRadius: '12px', padding: '12px 14px',
              fontFamily: 'Inter, sans-serif', fontSize: '14px', color: 'var(--color-text)',
              resize: 'none', outline: 'none', lineHeight: 1.55,
            }}
          />
          <div style={{ textAlign: 'right', fontFamily: 'Inter, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginTop: '4px' }}>
            {charLeft} left
          </div>
        </div>

        {/* Name field */}
        <div style={{ marginBottom: '20px' }}>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Your first name (optional)"
            style={{
              width: '100%', boxSizing: 'border-box',
              background: 'var(--color-surface2)', border: '1px solid var(--color-border)',
              borderRadius: '10px', padding: '11px 14px',
              fontFamily: 'Inter, sans-serif', fontSize: '13px', color: 'var(--color-text)',
              outline: 'none',
            }}
          />
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => handleSave(false)}
            disabled={saving}
            style={{
              flex: 1, padding: '13px', borderRadius: '12px', border: 'none', cursor: 'pointer',
              background: '#39D98A', color: '#0D1117',
              fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '14px',
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? 'Saving…' : 'Save recommendation'}
          </button>
          <button
            onClick={() => handleSave(true)}
            disabled={saving}
            style={{
              padding: '13px 18px', borderRadius: '12px', cursor: 'pointer',
              background: 'transparent',
              border: '1px solid var(--color-border)',
              fontFamily: 'Inter, sans-serif', fontSize: '13px', color: 'var(--color-muted)',
            }}
          >
            Skip
          </button>
        </div>
      </div>
    </div>
  );
}

function NeighbourRecommendations({ venue }: { venue: { id: string; name: string } }) {
  const [recs,      setRecs]      = useState<VenueRecommendation[]>([]);
  const [myRec,     setMyRec]     = useState<VenueRecommendation | null>(null);
  const [loaded,    setLoaded]    = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showMenu,  setShowMenu]  = useState(false);  // edit/remove menu

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      getVenueRecommendations(venue.id),
      getMyVenueRecommendation(venue.id),
    ]).then(([list, mine]) => {
      if (!cancelled) { setRecs(list); setMyRec(mine); setLoaded(true); }
    });
    return () => { cancelled = true; };
  }, [venue.id]);

  async function handleSave(text: string | null, tags: string[], name: string | null) {
    const { error } = await upsertVenueRecommendation(venue.id, text, tags, name);
    if (error) return;
    // Refresh
    const [list, mine] = await Promise.all([
      getVenueRecommendations(venue.id),
      getMyVenueRecommendation(venue.id),
    ]);
    setRecs(list); setMyRec(mine);
    setShowModal(false);
  }

  async function handleRemove() {
    await removeVenueRecommendation(venue.id);
    const [list, mine] = await Promise.all([
      getVenueRecommendations(venue.id),
      getMyVenueRecommendation(venue.id),
    ]);
    setRecs(list); setMyRec(mine);
    setShowMenu(false);
  }

  const activeRecs   = recs.filter(r => r.isActive);
  const count        = activeRecs.length;
  const hasMyActive  = !!(myRec?.isActive);
  const snippets     = activeRecs.filter(r => r.text || r.tags.length > 0).slice(0, 3);

  // Collect all tags with counts
  const tagCounts: Record<string, number> = {};
  for (const r of activeRecs) {
    for (const t of r.tags) tagCounts[t] = (tagCounts[t] ?? 0) + 1;
  }
  const topTags = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);

  return (
    <div style={{ marginBottom: '20px' }}>
      {/* ── Recommend button ── */}
      <div style={{ marginBottom: snippets.length > 0 || count > 0 ? '14px' : 0 }}>
        {!hasMyActive ? (
          <button
            onClick={() => setShowModal(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px', width: '100%',
              padding: '13px 16px', borderRadius: '14px', cursor: 'pointer',
              background: 'rgba(57,217,138,0.06)',
              border: '1px solid rgba(57,217,138,0.2)',
              textAlign: 'left',
            }}
          >
            <span style={{ fontSize: '20px', flexShrink: 0 }}>👍</span>
            <div style={{ flex: 1 }}>
              <p style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '14px', color: '#39D98A', margin: 0 }}>
                Recommend this place
              </p>
              {loaded && count > 0 && (
                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: 'rgba(255,255,255,0.4)', margin: '2px 0 0' }}>
                  Recommended by {count} neighbour{count !== 1 ? 's' : ''}
                </p>
              )}
              {loaded && count === 0 && (
                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: 'rgba(255,255,255,0.35)', margin: '2px 0 0' }}>
                  Be the first to recommend it
                </p>
              )}
            </div>
          </button>
        ) : (
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowMenu(v => !v)}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px', width: '100%',
                padding: '13px 16px', borderRadius: '14px', cursor: 'pointer',
                background: 'rgba(57,217,138,0.1)',
                border: '1.5px solid rgba(57,217,138,0.35)',
                textAlign: 'left',
              }}
            >
              <span style={{ fontSize: '20px', flexShrink: 0 }}>✅</span>
              <div style={{ flex: 1 }}>
                <p style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '14px', color: '#39D98A', margin: 0 }}>
                  You recommend this place
                </p>
                {count > 0 && (
                  <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: 'rgba(255,255,255,0.4)', margin: '2px 0 0' }}>
                    Recommended by {count} neighbour{count !== 1 ? 's' : ''}
                  </p>
                )}
              </div>
              <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.3)', flexShrink: 0 }}>▾</span>
            </button>

            {/* Edit / Remove dropdown */}
            {showMenu && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
                marginTop: '4px', background: 'var(--color-surface)',
                border: '1px solid var(--color-border)', borderRadius: '12px',
                overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
              }}>
                <button
                  onClick={() => { setShowMenu(false); setShowModal(true); }}
                  style={{
                    display: 'block', width: '100%', padding: '13px 16px', textAlign: 'left',
                    background: 'none', border: 'none', cursor: 'pointer', borderBottom: '1px solid var(--color-border)',
                    fontFamily: 'Inter, sans-serif', fontSize: '14px', color: 'var(--color-text)',
                  }}
                >
                  ✏️ Edit why I recommend
                </button>
                <button
                  onClick={handleRemove}
                  style={{
                    display: 'block', width: '100%', padding: '13px 16px', textAlign: 'left',
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontFamily: 'Inter, sans-serif', fontSize: '14px', color: '#F87171',
                  }}
                >
                  🗑 Remove my recommendation
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── "Neighbours say" display section ── */}
      {loaded && (snippets.length > 0 || topTags.length > 0) && (
        <div style={{
          background: 'var(--color-surface)', border: '1px solid var(--color-border)',
          borderRadius: '14px', padding: '14px 16px',
        }}>
          <p style={{
            fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '13px',
            color: 'rgba(255,255,255,0.5)', margin: '0 0 12px',
            textTransform: 'uppercase', letterSpacing: '0.05em',
          }}>
            Neighbours say
          </p>

          {/* Tag chips */}
          {topTags.length > 0 && (
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: snippets.length > 0 ? '12px' : 0 }}>
              {topTags.map(([tag, cnt]) => (
                <span key={tag} style={{
                  padding: '4px 10px', borderRadius: '20px',
                  fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 600,
                  color: '#39D98A', background: 'rgba(57,217,138,0.1)',
                  border: '1px solid rgba(57,217,138,0.2)',
                }}>
                  {tag}{cnt > 1 ? ` · ${cnt}` : ''}
                </span>
              ))}
            </div>
          )}

          {/* Short snippets */}
          {snippets.map((r, i) => {
            const nameLabel = r.displayName ?? 'A neighbour';
            const body = r.text
              ? (r.text.length > 100 ? r.text.slice(0, 97) + '…' : r.text)
              : r.tags.join(', ');
            return (
              <div key={r.id} style={{
                paddingTop: i > 0 ? '10px' : 0,
                borderTop: i > 0 ? '1px solid var(--color-border)' : 'none',
                marginTop: i > 0 ? '10px' : 0,
              }}>
                <p style={{
                  fontFamily: 'Inter, sans-serif', fontSize: '13px',
                  color: 'rgba(255,255,255,0.72)', margin: '0 0 3px', lineHeight: 1.5,
                }}>
                  "{body}"
                </p>
                <p style={{
                  fontFamily: 'Inter, sans-serif', fontSize: '11px',
                  color: 'rgba(255,255,255,0.35)', margin: 0,
                }}>
                  — {nameLabel}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty state — only shown to non-recommenders after load */}
      {loaded && count === 0 && !hasMyActive && (
        <p style={{
          fontFamily: 'Inter, sans-serif', fontSize: '12px',
          color: 'rgba(255,255,255,0.28)', margin: '8px 0 0', textAlign: 'center',
        }}>
          No neighbours have recommended this place yet.
        </p>
      )}

      {/* Modal */}
      {showModal && (
        <RecModal
          existing={myRec?.isActive ? myRec : null}
          onSave={handleSave}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}

// ─── Owner Next Step Nudge ────────────────────────────────────────────────────
// Shown only to the verified owner. Shows ONE next step at a time.
// Calmer, simpler, no lists — just the most impactful thing to do right now.

type NudgeStep = { emoji: string; heading: string; body: string; cta: string; path: string };

function OwnerNextStepNudge({ venue, isOwner }: { venue: Venue; isOwner: boolean }) {
  if (!isOwner) return null;

  const hasPhoto   = !!(venue.coverImage || (venue.galleryImages && venue.galleryImages.length > 0));
  const hasContact = !!(venue.phoneNumber || venue.whatsappNumber);
  const hasHours   = !!(venue.openHours || venue.ownerHours);
  const hasDesc    = !!(venue.description && venue.description.trim().length > 20);

  let step: NudgeStep | null = null;

  if (!hasPhoto) step = {
    emoji: '📸',
    heading: 'Add a photo',
    body: 'Places with a photo get 3× more taps from neighbours.',
    cta: 'Add photo',
    path: '/venue/photos',
  };
  else if (!hasContact) step = {
    emoji: '💬',
    heading: 'Add your WhatsApp number',
    body: 'Let customers message you directly. Most people prefer WhatsApp.',
    cta: 'Add WhatsApp',
    path: '/venue/edit',
  };
  else if (!hasHours) step = {
    emoji: '🕐',
    heading: 'Add your opening hours',
    body: 'People need to know when you are open before they head out.',
    cta: 'Set hours',
    path: '/venue/hours',
  };
  else if (!hasDesc) step = {
    emoji: '✏️',
    heading: 'Write one line about your place',
    body: 'A short description helps people know what to expect.',
    cta: 'Add description',
    path: '/venue/edit',
  };

  if (!step) return null;

  return (
    <div style={{
      marginBottom: '16px',
      background: 'rgba(57,217,138,0.04)',
      border: '1px solid rgba(57,217,138,0.18)',
      borderRadius: '14px',
      padding: '14px 16px',
      display: 'flex', alignItems: 'center', gap: '14px',
    }}>
      <span style={{ fontSize: '28px', flexShrink: 0 }}>{step.emoji}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '14px', color: '#F0F6FC', margin: '0 0 3px' }}>
          {step.heading}
        </p>
        <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: 'rgba(255,255,255,0.5)', margin: '0 0 10px', lineHeight: 1.5 }}>
          {step.body}
        </p>
        <a
          href={step.path}
          onClick={e => { e.preventDefault(); window.location.href = step!.path; }}
          style={{
            display: 'inline-block',
            fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '13px',
            color: '#39D98A', textDecoration: 'none',
            background: 'rgba(57,217,138,0.1)',
            border: '1px solid rgba(57,217,138,0.25)',
            borderRadius: '20px', padding: '5px 14px',
          }}
        >
          {step.cta} →
        </a>
      </div>
    </div>
  );
}

// ─── Claim This Place ─────────────────────────────────────────────────────────

type ClaimSubmitStatus = 'idle' | 'submitting' | 'done' | 'error';

const CLAIM_ROLES = [
  { value: 'owner',          label: 'Owner',          desc: 'This is my business' },
  { value: 'manager',        label: 'Manager',        desc: 'I manage this place' },
  { value: 'representative', label: 'Representative', desc: 'I act on behalf of the owner' },
] as const;
type ClaimRole = typeof CLAIM_ROLES[number]['value'];

function ClaimModal({ venue, onClose, onSubmitted }: { venue: Venue; onClose: () => void; onSubmitted: () => void }) {
  const [form, setForm] = useState({
    name: '', email: '', phone: '',
    role: 'owner' as ClaimRole,
    message: '',
    confirmed: false,
  });
  const [status, setStatus] = useState<ClaimSubmitStatus>('idle');

  const canSubmit = form.confirmed && !!form.name.trim() && !!form.email.trim() && status !== 'submitting';

  const fieldStyle: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box',
    background: 'var(--color-surface2)', border: '1px solid var(--color-border)',
    borderRadius: '10px', padding: '12px 14px',
    fontFamily: 'Inter, sans-serif', fontSize: '14px', color: 'var(--color-text)',
    outline: 'none',
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setStatus('submitting');
    try {
      const { error } = await supabase.from('claimed_requests').insert({
        venue_id:           venue.id,
        venue_name:         venue.name,
        name:               form.name.trim(),
        email:              form.email.trim().toLowerCase(),
        phone:              form.phone.trim() || null,
        role:               form.role,
        message:            form.message.trim() || null,
        is_owner_confirmed: form.confirmed,
      });
      if (error) throw error;
      setStatus('done');
      onSubmitted();
    } catch {
      setStatus('error');
    }
  }

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 300,
        background: 'rgba(0,0,0,0.85)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      }}
    >
      <div style={{
        width: '100%', maxWidth: '480px',
        background: 'var(--color-surface)', borderRadius: '20px 20px 0 0',
        padding: '24px 20px 44px', boxSizing: 'border-box',
        maxHeight: '92dvh', overflowY: 'auto',
      }}>
        {/* Drag handle */}
        <div style={{ width: '36px', height: '4px', borderRadius: '2px', background: 'rgba(255,255,255,0.15)', margin: '0 auto 20px' }} />

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px' }}>
          <div>
            <h2 style={{ fontFamily: 'Inter, sans-serif', fontWeight: 800, fontSize: '20px', color: 'var(--color-text)', margin: '0 0 4px' }}>
              Claim {venue.name}
            </h2>
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: 'var(--color-muted)', margin: 0, lineHeight: 1.5 }}>
              Tell us who you are. We'll review within 24 hours and notify you by email.
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', flexShrink: 0, marginLeft: '12px', marginTop: '2px' }}>
            <X size={20} color="var(--color-muted)" />
          </button>
        </div>

        {status === 'done' ? (
          <div style={{ textAlign: 'center', padding: '28px 0 8px' }}>
            <div style={{ fontSize: '52px', marginBottom: '14px' }}>✅</div>
            <h3 style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '17px', color: 'var(--color-text)', margin: '0 0 8px' }}>
              Request received
            </h3>
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: 'var(--color-muted)', lineHeight: 1.65, margin: '0 0 24px' }}>
              We'll review your claim for <strong style={{ color: 'var(--color-text)' }}>{venue.name}</strong> and reply to <strong style={{ color: 'var(--color-text)' }}>{form.email}</strong> within 24 hours.
            </p>
            <button
              onClick={onClose}
              style={{ background: 'var(--color-accent)', color: '#000', border: 'none', borderRadius: '20px', padding: '12px 32px', fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '14px', cursor: 'pointer' }}
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

            {/* Role selector */}
            <div>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 700, color: 'var(--color-muted)', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                My role
              </p>
              <div style={{ display: 'flex', gap: '8px' }}>
                {CLAIM_ROLES.map(r => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, role: r.value }))}
                    style={{
                      flex: 1, padding: '10px 6px', borderRadius: '10px', cursor: 'pointer',
                      background: form.role === r.value ? 'rgba(57,217,138,0.12)' : 'var(--color-surface2)',
                      border: form.role === r.value ? '1.5px solid rgba(57,217,138,0.45)' : '1px solid var(--color-border)',
                      textAlign: 'center', transition: 'all 0.15s',
                    }}
                  >
                    <div style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '12px', color: form.role === r.value ? '#39D98A' : 'var(--color-text)' }}>
                      {r.label}
                    </div>
                    <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '10px', color: 'var(--color-muted)', marginTop: '2px' }}>
                      {r.desc}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Name */}
            <input
              type="text" placeholder="Your full name" value={form.name} required
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              style={fieldStyle}
            />

            {/* Email */}
            <input
              type="email" placeholder="Email address" value={form.email} required
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              style={fieldStyle}
            />

            {/* Phone */}
            <input
              type="tel" placeholder="Phone number (optional)" value={form.phone}
              onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              style={fieldStyle}
            />

            {/* Optional message / proof */}
            <textarea
              placeholder={`Anything that helps us verify — e.g. "I opened this barbershop in 2019" (optional)`}
              value={form.message}
              rows={3}
              onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
              style={{ ...fieldStyle, resize: 'none', lineHeight: 1.5 }}
            />

            {/* Confirmation checkbox */}
            <label style={{
              display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer',
              padding: '12px 14px', background: 'var(--color-surface2)',
              border: `1px solid ${form.confirmed ? 'rgba(57,217,138,0.3)' : 'var(--color-border)'}`,
              borderRadius: '10px', transition: 'border-color 0.15s',
            }}>
              <input
                type="checkbox" checked={form.confirmed}
                onChange={e => setForm(f => ({ ...f, confirmed: e.target.checked }))}
                style={{ marginTop: '2px', accentColor: '#39D98A', flexShrink: 0 }}
              />
              <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: 'rgba(255,255,255,0.7)', lineHeight: 1.55 }}>
                I confirm I am authorised to manage <strong style={{ color: 'var(--color-text)' }}>{venue.name}</strong> and that this information is accurate.
              </span>
            </label>

            {status === 'error' && (
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: '#EF4444', margin: 0 }}>
                Something went wrong — please try again.
              </p>
            )}

            <button
              type="submit"
              disabled={!canSubmit}
              style={{
                background: canSubmit ? 'var(--color-accent)' : 'rgba(57,217,138,0.2)',
                color: canSubmit ? '#000' : 'rgba(255,255,255,0.25)',
                border: 'none', borderRadius: '20px', padding: '15px',
                fontFamily: 'Inter, sans-serif', fontWeight: 800, fontSize: '14px',
                cursor: canSubmit ? 'pointer' : 'not-allowed',
                transition: 'all 0.2s',
              }}
            >
              {status === 'submitting' ? 'Sending…' : 'Send claim request'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

// ─── Claim CTA — state-aware (unclaimed / pending / claimed) ──────────────────

function ClaimCTA({ venue }: { venue: Venue }) {
  const [open, setOpen] = useState(false);
  // 'idle' while we check for an existing pending request
  // 'submitted' = just submitted this session (shows 48h message)
  // 'pending'   = pre-existing pending claim found on DB check
  const [claimState, setClaimState] = useState<'checking' | 'unclaimed' | 'pending' | 'submitted'>('checking');

  useEffect(() => {
    // If already claimed by owner, skip the check entirely
    if (venue.ownerClaimed) { setClaimState('unclaimed'); return; }

    supabase
      .from('claimed_requests')
      .select('id', { count: 'exact', head: true })
      .eq('venue_id', venue.id)
      .eq('status', 'pending')
      .then(({ count }) => {
        setClaimState((count ?? 0) > 0 ? 'pending' : 'unclaimed');
      });
  }, [venue.id, venue.ownerClaimed]);

  // Hide entirely when claimed or still checking
  if (venue.ownerClaimed === true) return null;
  if (claimState === 'checking') return null;

  // ── Just submitted this session ───────────────────────────────────────────
  if (claimState === 'submitted') {
    return (
      <div style={{
        marginBottom: '20px',
        background: 'rgba(57,217,138,0.06)',
        border: '1px solid rgba(57,217,138,0.22)',
        borderRadius: '14px', padding: '14px 16px',
        display: 'flex', alignItems: 'center', gap: '12px',
      }}>
        <div style={{
          width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0,
          background: 'rgba(57,217,138,0.12)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '18px',
        }}>
          ✅
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '13px', color: '#39D98A', margin: '0 0 2px' }}>
            Claim submitted
          </p>
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: 'var(--color-muted)', margin: 0, lineHeight: 1.5 }}>
            We will be in touch within 48 hours.
          </p>
        </div>
      </div>
    );
  }

  // ── Pre-existing pending claim (found on page load) ───────────────────────
  if (claimState === 'pending') {
    return (
      <div style={{
        marginBottom: '20px',
        background: 'rgba(251,191,36,0.06)',
        border: '1px solid rgba(251,191,36,0.2)',
        borderRadius: '14px', padding: '14px 16px',
        display: 'flex', alignItems: 'center', gap: '12px',
      }}>
        <div style={{
          width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0,
          background: 'rgba(251,191,36,0.1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '18px',
        }}>
          ⏳
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '13px', color: '#FBBF24', margin: '0 0 2px' }}>
            Ownership claim under review
          </p>
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: 'var(--color-muted)', margin: 0, lineHeight: 1.5 }}>
            A request to manage this place has been submitted and is awaiting approval.
          </p>
        </div>
      </div>
    );
  }

  // ── Unclaimed state ───────────────────────────────────────────────────────
  return (
    <>
      <div
        data-claim-cta
        onClick={() => setOpen(true)}
        role="button"
        style={{
          marginBottom: '20px', cursor: 'pointer',
          background: 'rgba(57,217,138,0.04)',
          border: '1px dashed rgba(57,217,138,0.28)',
          borderRadius: '14px', padding: '14px 16px',
          display: 'flex', alignItems: 'center', gap: '12px',
          WebkitTapHighlightColor: 'transparent',
          transition: 'background 0.15s',
        }}
      >
        <div style={{
          width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0,
          background: 'rgba(57,217,138,0.1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Store size={18} color="#39D98A" />
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '13px', color: 'var(--color-text)', margin: '0 0 2px' }}>
            Is this your business? 👋
          </p>
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: 'var(--color-muted)', margin: 0, lineHeight: 1.5 }}>
            Let us know and we will give you tools to manage it on Kayaa. Free.
          </p>
        </div>
      </div>
      {open && (
        <ClaimModal
          venue={venue}
          onClose={() => setOpen(false)}
          onSubmitted={() => { setOpen(false); setClaimState('submitted'); }}
        />
      )}
    </>
  );
}

// ─── Owner Updates Section ────────────────────────────────────────────────────

const UPDATE_TYPE_CONFIG: Record<string, { emoji: string; color: string; label: string }> = {
  special:      { emoji: '🔥', color: '#FB923C', label: 'Special' },
  menu:         { emoji: '🍽️', color: '#60A5FA', label: 'Menu Update' },
  event:        { emoji: '🎉', color: '#F472B6', label: 'Event' },
  announcement: { emoji: '📢', color: '#FBBF24', label: 'Announcement' },
  general:      { emoji: '📝', color: '#A78BFA', label: 'Update' },
};

function timeAgoShort(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function OwnerUpdatesSection({
  updates,
  venueName,
  isOwner = false,
  onPostUpdate,
}: {
  updates: VenueOwnerUpdate[];
  venueName: string;
  isOwner?: boolean;
  onPostUpdate?: () => void;
}) {
  // Derive active status directly from the freshest update
  const activeStatus: { label: string; color: string } | null = (() => {
    if (updates.length === 0) return null;
    const msAgo = Date.now() - new Date(updates[0].createdAt).getTime();
    if (msAgo < 24 * 60 * 60 * 1000)     return { label: '🟢 Updated today',    color: '#39D98A' };
    if (msAgo < 7  * 24 * 60 * 60 * 1000) return { label: '✅ Active this week', color: '#39D98A' };
    return null;
  })();

  if (updates.length === 0) {
    // Show first-update nudge only to the owner when there are no updates yet
    if (!isOwner) return null;
    return (
      <div style={{ marginBottom: '20px' }}>
        <div
          onClick={onPostUpdate}
          style={{
            background: 'rgba(57,217,138,0.04)',
            border: '1.5px dashed rgba(57,217,138,0.3)',
            borderRadius: '14px', padding: '16px',
            cursor: 'pointer', textAlign: 'center',
          }}
        >
          <span style={{ fontSize: '24px', display: 'block', marginBottom: '6px' }}>📢</span>
          <p style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '14px', color: '#39D98A', margin: '0 0 4px' }}>
            Share your first update with neighbours
          </p>
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: 'rgba(255,255,255,0.4)', margin: 0, lineHeight: 1.55 }}>
            Tell people what's happening — fresh stock, new hours, a weekend special.
          </p>
        </div>
      </div>
    );
  }
  return (
    <div style={{ marginBottom: '20px' }}>
      {/* Section header — title + active badge + owner post button */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <h2 style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '16px', margin: 0, letterSpacing: '-0.01em' }}>
          Latest from {venueName}
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
          {activeStatus && (
            <span style={{
              fontFamily: 'Inter, sans-serif', fontSize: '10px', fontWeight: 700,
              color: activeStatus.color,
              background: `${activeStatus.color}14`,
              border: `1px solid ${activeStatus.color}30`,
              borderRadius: '20px', padding: '2px 8px',
            }}>
              {activeStatus.label}
            </span>
          )}
          {isOwner && (
            <button
              onClick={onPostUpdate}
              style={{
                background: 'rgba(57,217,138,0.1)', border: '1px solid rgba(57,217,138,0.25)',
                borderRadius: '20px', padding: '4px 11px', cursor: 'pointer',
                fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '11px',
                color: '#39D98A', WebkitTapHighlightColor: 'transparent',
              } as React.CSSProperties}
            >
              + Post
            </button>
          )}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {updates.slice(0, 3).map(u => {
          const cfg = UPDATE_TYPE_CONFIG[u.type] ?? UPDATE_TYPE_CONFIG.general;
          return (
            <div
              key={u.id}
              style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderLeft: `3px solid ${cfg.color}`,
                borderRadius: '14px', padding: '14px 16px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: u.content ? '8px' : '4px' }}>
                <span style={{ fontSize: '14px', lineHeight: 1 }}>{cfg.emoji}</span>
                <span style={{
                  fontFamily: 'Inter, sans-serif', fontSize: '10px', fontWeight: 700,
                  color: cfg.color, letterSpacing: '0.06em', textTransform: 'uppercase',
                }}>
                  {cfg.label}
                </span>
                <span style={{ marginLeft: 'auto', fontFamily: 'Inter, sans-serif', fontSize: '11px', color: 'var(--color-muted)' }}>
                  {timeAgoShort(u.createdAt)}
                </span>
              </div>
              <p style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '14px', color: 'var(--color-text)', margin: '0 0 4px', lineHeight: 1.35 }}>
                {u.title}
              </p>
              {u.content && (
                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: 'var(--color-muted)', margin: 0, lineHeight: 1.55 }}>
                  {u.content}
                </p>
              )}
            </div>
          );
        })}
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
        <div style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '14px', color: '#fff' }}>Regulars only</div>
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

function PostsSection({ posts, venueName, venueId, venueSlug }: { posts: Post[]; venueName: string; venueId: string; venueSlug: string }) {
  const navigate = useNavigate();
  const score = getUserVenueScoreLocal(venueId, getVisitorId());
  const visitCount = score?.visitCount ?? 0;

  if (posts.length === 0) {
    return (
      <div style={{
        marginBottom: '20px',
        border: '1.5px dashed rgba(255,255,255,0.10)',
        borderRadius: '16px',
        padding: '28px 20px',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: '32px', marginBottom: '10px' }}>💬</div>
        <div style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '15px', color: 'var(--color-text)', marginBottom: '6px' }}>
          No posts yet
        </div>
        <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: 'var(--color-muted)', lineHeight: 1.6, margin: '0 0 18px' }}>
          Be the first to share something about {venueName}. A tip, a question, a recommendation — anything helps.
        </p>
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
          <button
            onClick={() => navigate(`/venue/${venueSlug}/checkin`)}
            style={{
              padding: '9px 18px', borderRadius: '10px',
              background: 'rgba(57,217,138,0.12)', border: '1px solid rgba(57,217,138,0.3)',
              fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '13px',
              color: '#39D98A', cursor: 'pointer',
            }}
          >
            Check in
          </button>
          <button
            onClick={() => navigate('/board/new')}
            style={{
              padding: '9px 18px', borderRadius: '10px',
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
              fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '13px',
              color: 'rgba(255,255,255,0.6)', cursor: 'pointer',
            }}
          >
            Post something
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ marginBottom: '20px' }}>
      <h2 style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '16px', marginBottom: '14px', letterSpacing: '-0.01em' }}>What people say</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {posts.map((post) => {
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
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0, background: 'rgba(57,217,138,0.1)', border: '1.5px solid rgba(57,217,138,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '13px', color: '#39D98A' }}>
                  {post.authorName[0]}
                </div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text)' }}>{post.authorName.split(' ')[0]}</div>
                  <div style={{ fontSize: '11px', color: 'var(--color-muted)' }}>{post.createdAt ? timeAgo(post.createdAt) : ''}</div>
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

// ─── Gallery Strip ────────────────────────────────────────────────────────────

function GalleryStrip({ venue, onImageClick }: { venue: Venue; onImageClick: (idx: number) => void }) {
  const images = venue.galleryImages ?? [];
  if (images.length < 2) return null;

  return (
    <div style={{ marginBottom: '20px' }}>
      <h2 style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '16px', color: 'var(--color-text)', marginBottom: '12px', letterSpacing: '-0.01em' }}>
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
            style={{ flexShrink: 0, width: '150px', height: '150px', borderRadius: '14px', overflow: 'hidden', cursor: 'pointer', background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
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
      <div style={{ position: 'absolute', top: '20px', left: '50%', transform: 'translateX(-50%)', fontSize: '12px', color: 'rgba(255,255,255,0.6)', fontFamily: 'Inter, sans-serif', background: 'rgba(0,0,0,0.4)', borderRadius: '20px', padding: '4px 12px' }}>
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

/**
 * VideoCard — tap-to-play inline intro video for a venue.
 *
 * Replaces the previous autoPlay muted loop implementation.
 * Video is silent and paused until the user explicitly taps ▶.
 * Pauses automatically when scrolled out of view.
 */
function VideoCard({ venue }: { venue: Venue }) {
  if (!venue.introVideo) return null;
  return (
    <div style={{ marginBottom: '20px' }}>
      <h2 style={{
        fontFamily: 'Inter, sans-serif', fontWeight: 700,
        fontSize: '16px', color: 'var(--color-text)',
        marginBottom: '12px', letterSpacing: '-0.01em',
      }}>
        Watch {venue.name} in action
      </h2>
      <VideoPlayer
        src={venue.introVideo}
        maxHeight={300}
        borderRadius={14}
        label={venue.name}
      />
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
        <h2 style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '16px', color: 'var(--color-text)', marginBottom: '14px', letterSpacing: '-0.01em' }}>
          Location
        </h2>
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '14px', padding: '14px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
            <MapPin size={16} color="#39D98A" style={{ flexShrink: 0, marginTop: '2px' } as React.CSSProperties} />
            <div>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', fontWeight: 700, color: 'rgba(255,255,255,0.92)', margin: '0 0 3px', lineHeight: 1.45 }}>
                {venue.address}
              </p>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: 'var(--color-muted)', margin: 0 }}>
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
      <h2 style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '16px', color: 'var(--color-text)', marginBottom: '14px', letterSpacing: '-0.01em' }}>
        Location
      </h2>
      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '14px', padding: '14px 16px' }}>

        {/* Address row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '12px' }}>
          <MapPin size={16} color="#39D98A" style={{ flexShrink: 0, marginTop: '2px' } as React.CSSProperties} />
          <div style={{ flex: 1, minWidth: 0 }}>
            {venue.address && (
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', fontWeight: 700, color: 'rgba(255,255,255,0.92)', margin: '0 0 3px', lineHeight: 1.45 }}>
                {venue.address}
              </p>
            )}
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: 'var(--color-muted)', margin: 0 }}>
              {venue.neighborhood}, {venue.city}
              {venue.province ? `, ${venue.province}` : ''}
            </p>
            {distance !== null && (
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: '#39D98A', fontWeight: 700, margin: '6px 0 0', display: 'flex', alignItems: 'center', gap: '5px' } as React.CSSProperties}>
                <Navigation size={13} />
                {distance < 1 ? `${Math.round(distance * 1000)} m` : `${distance.toFixed(1)} km`} from you
              </p>
            )}
          </div>
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
            fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '13px',
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

// ─── Sticky check-in bar ──────────────────────────────────────────────────────

function StickyCheckinBar({ venue }: { venue: Venue }) {
  const [showHint, setShowHint] = useState(() => {
    try { return !localStorage.getItem('kayaa_checkin_hint_seen'); } catch { return false; }
  });

  function dismissHint() {
    try { localStorage.setItem('kayaa_checkin_hint_seen', '1'); } catch { /* ignore */ }
    setShowHint(false);
  }

  return (
    <div style={{
      position: 'fixed', bottom: '64px', left: 0, right: 0, zIndex: 45,
      padding: showHint ? '8px 16px 10px' : '10px 16px',
      background: 'rgba(13,17,23,0.88)', backdropFilter: 'blur(12px)',
      borderTop: '1px solid var(--color-border)',
    }}>
      {showHint && (
        <div style={{
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
          marginBottom: '8px', gap: '8px',
        }}>
          <p style={{
            fontFamily: 'Inter, sans-serif', fontSize: '12px',
            color: 'rgba(255,255,255,0.5)', lineHeight: 1.5, margin: 0,
          }}>
            Checking in tells Kayaa you visited this place. The more people check in, the more visible this business becomes.
          </p>
          <button
            onClick={dismissHint}
            style={{ background: 'none', border: 'none', padding: '0 0 0 4px', cursor: 'pointer', flexShrink: 0, color: 'rgba(255,255,255,0.3)', fontSize: '14px', lineHeight: 1 }}
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      )}
      <Link to={`/venue/${venue.slug}/checkin`} style={{ textDecoration: 'none', display: 'block' }} onClick={dismissHint}>
        <div style={{
          background: '#39D98A', color: '#0D1117',
          borderRadius: '12px', height: '48px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '14px',
        }}>
          Check in here
        </div>
      </Link>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function VenuePage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading,         setLoading]         = useState(true);
  const [notFound,        setNotFound]        = useState(false);
  const [venue,           setVenue]           = useState<Venue | null>(null);
  const [events,          setEvents]          = useState<Event[]>([]);
  const [posts,           setPosts]           = useState<Post[]>([]);
  const [recentStats,     setRecentStats]     = useState<VenueRecentStats>({ monthlyCheckins: 0, weeklyCheckins: 0 });
  const [lightboxIdx,     setLightboxIdx]     = useState<number | null>(null);
  const [videoModalOpen,  setVideoModalOpen]  = useState(false);
  const [activeStory,     setActiveStory]     = useState<VenueStory24 | null>(null);
  const [storyViewerOpen, setStoryViewerOpen] = useState(false);
  const [shareOpen,         setShareOpen]         = useState(false);
  const [showCheckInModal,  setShowCheckInModal]  = useState(false);
  const [showReportModal,   setShowReportModal]   = useState(false);
  const [isFollowing,       setIsFollowing]       = useState(false);
  const [followerCount,     setFollowerCount]     = useState(0);
  const [followLoading,     setFollowLoading]     = useState(false);

  const [ownerUpdates,        setOwnerUpdates]        = useState<VenueOwnerUpdate[]>([]);
  const [showPostUpdateModal, setShowPostUpdateModal] = useState(false);

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

      // Record one view per session — deduplicated, fails silently
      recordVenueView(v.id);

      // Load all supplementary data in parallel
      getVenueEvents(v.id).then(setEvents);
      getVenuePosts(v.id).then(setPosts);
      getVenueRecentStats(v.id).then(setRecentStats);
      getActiveVenueStory(v.id).then(setActiveStory);
      getVenueOwnerUpdates(v.id).then(setOwnerUpdates);
      getBusinessFollowerCount(v.id).then(setFollowerCount);
      checkFollowsBusiness(v.id).then(setIsFollowing);

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

  async function handleFollow() {
    if (!venue) return;
    if (!user) { navigate('/welcome'); return; }
    if (followLoading) return;
    setFollowLoading(true);
    // Optimistic update
    if (isFollowing) {
      setIsFollowing(false);
      setFollowerCount(c => Math.max(0, c - 1));
      await unfollowBusiness(venue.id);
    } else {
      setIsFollowing(true);
      setFollowerCount(c => c + 1);
      await followBusiness(venue.id);
    }
    setFollowLoading(false);
  }

  if (loading) return <VenueSkeleton />;
  if (notFound || !venue) return <VenueNotFound />;

  const galleryImages = venue.galleryImages ?? [];
  const emoji = getCategoryEmoji(venue.category);

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
            neighbourhood: venue.neighborhood,
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
            <span style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '13px', color: '#22c55e' }}>
              Watch today's story from {venue.name.split(' ')[0]}
            </span>
          </button>
        </div>
      )}

      <div style={{ padding: '0 16px', paddingBottom: '100px' }}>

        {/* ── A: Main actions — WhatsApp / Call / Check In / Directions ────── */}
        <ActionGrid venue={venue} onShare={() => setShareOpen(true)} onCheckIn={() => setShowCheckInModal(true)} />

        {/* ── A2: Follow button ─────────────────────────────────────────────── */}
        <button
          onClick={handleFollow}
          disabled={followLoading}
          style={{
            width: '100%', marginBottom: '4px',
            padding: '12px 16px',
            background: isFollowing ? 'rgba(57,217,138,0.1)' : 'transparent',
            border: `1.5px solid ${isFollowing ? '#39D98A' : 'rgba(255,255,255,0.15)'}`,
            borderRadius: '12px', cursor: followLoading ? 'default' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            transition: 'background 0.15s, border-color 0.15s',
            opacity: followLoading ? 0.7 : 1,
          }}
        >
          <Users
            size={16}
            color={isFollowing ? '#39D98A' : 'rgba(255,255,255,0.5)'}
          />
          <span style={{
            fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '14px',
            color: isFollowing ? '#39D98A' : 'rgba(255,255,255,0.7)',
          }}>
            {isFollowing ? 'Following' : 'Follow'}
          </span>
          {followerCount > 0 && (
            <span style={{
              fontFamily: 'Inter, sans-serif', fontSize: '12px',
              color: 'rgba(255,255,255,0.35)', marginLeft: '2px',
            }}>
              · {followerCount.toLocaleString()} {followerCount === 1 ? 'follower' : 'followers'}
            </span>
          )}
        </button>

        {/* ── A3: Owner channel banner ──────────────────────────────────────── */}
        {!!(user?.id && venue.ownerUserId && user.id === venue.ownerUserId) && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: 'rgba(57,217,138,0.06)',
            border: '1px solid rgba(57,217,138,0.2)',
            borderRadius: '12px', padding: '10px 14px',
            marginBottom: '8px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '14px' }}>🏪</span>
              <div>
                <p style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '12px', color: '#39D98A', margin: 0, lineHeight: 1.2 }}>
                  You manage this business
                </p>
                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.38)', margin: 0 }}>
                  {followerCount > 0 ? `${followerCount} follower${followerCount !== 1 ? 's' : ''}` : 'No followers yet'}
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowPostUpdateModal(true)}
              style={{
                background: '#39D98A', border: 'none', borderRadius: '8px',
                padding: '7px 13px', cursor: 'pointer',
                fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '12px',
                color: '#0D1117', flexShrink: 0,
                WebkitTapHighlightColor: 'transparent',
              } as React.CSSProperties}
            >
              📢 Post update
            </button>
          </div>
        )}

        {/* ── A4: Neighbourhood favourite signal ────────────────────────────── */}
        {(() => {
          const signal = getNeighbourhoodSignal(
            followerCount,
            venue.regularsCount,
            recentStats.weeklyCheckins,
            venue.createdAt,
          );
          if (!signal) return null;
          return (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              background: `${signal.color}12`,
              border: `1px solid ${signal.color}30`,
              borderRadius: '20px', padding: '5px 12px',
              marginBottom: '8px',
            }}>
              <span style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '12px', color: signal.color }}>
                {signal.label}
              </span>
            </div>
          );
        })()}

        {/* ── A5: Business channel — latest updates (moved up for prominence) ─ */}
        <OwnerUpdatesSection
          updates={ownerUpdates}
          venueName={venue.name}
          isOwner={!!(user?.id && venue.ownerUserId && user.id === venue.ownerUserId)}
          onPostUpdate={() => setShowPostUpdateModal(true)}
        />

        {/* ── B: Quick stats — regulars, today, week, distance ─────────────── */}
        <QuickStatsRow venue={venue} recentStats={recentStats} distance={distance} followerCount={followerCount} />

        {/* ── C: Personal visit badge (only when user has visited) ──────────── */}
        <UserVisitBadge venueId={venue.id} />

        {/* ── D: Opening hours (only when set) ─────────────────────────────── */}
        <OpeningHoursSection venue={venue} />

        {/* ── E: Description (only when set, no chips/tags clutter) ────────── */}
        <PlaceStoryPanel venue={venue} />

        {/* ── F: Owner next step — one action at a time, owner only ─────────── */}
        <OwnerNextStepNudge
          venue={venue}
          isOwner={!!(user?.id && venue.ownerUserId && user.id === venue.ownerUserId)}
        />

        {/* ── G: Real-time check-in activity (only when data exists) ────────── */}
        <RecentActivityFeed venueId={venue.id} />

        {/* ── G2: Neighbour recommendations (no star ratings) ──────────────── */}
        <NeighbourRecommendations venue={{ id: venue.id, name: venue.name }} />

        {/* ── H: Gallery strip (only when 2+ images exist) ─────────────────── */}
        {galleryImages.length >= 2 && (
          <GalleryStrip venue={venue} onImageClick={idx => setLightboxIdx(idx)} />
        )}

        {/* ── I: Intro video (only when uploaded) ──────────────────────────── */}
        {venue.introVideo && <VideoCard venue={venue} />}

        {/* ── K: Events (only when events exist — no empty state) ──────────── */}
        {events.length > 0 && <EventsSection events={events} />}

        {/* ── L: Community posts (only when posts exist — no empty state) ───── */}
        {posts.length > 0 && (
          <PostsSection posts={posts} venueName={venue.name} venueId={venue.id} venueSlug={venue.slug} />
        )}

        {/* ── M: Location / address + directions ───────────────────────────── */}
        <LocationSection venue={venue} distance={distance} />

        {/* ── N: Claim CTA (only when unclaimed) ───────────────────────────── */}
        <ClaimCTA venue={venue} />

        {/* ── Report issue — quiet, below the fold ─────────────────────────── */}
        <button
          onClick={() => setShowReportModal(true)}
          style={{
            display: 'block', width: '100%', textAlign: 'center',
            background: 'none', border: 'none', cursor: 'pointer',
            fontFamily: 'Inter, sans-serif', fontSize: '12px',
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

      {/* ── Owner action bar — shown only to the venue owner ─────────────── */}
      {!!(user?.id && venue.ownerUserId && user.id === venue.ownerUserId) && (
        <div style={{
          position: 'fixed', bottom: '64px', left: 0, right: 0, zIndex: 45,
          background: 'rgba(22,27,34,0.97)',
          borderTop: '1px solid rgba(57,217,138,0.25)',
          backdropFilter: 'blur(16px)',
          padding: '10px 16px',
          display: 'flex', gap: '8px', alignItems: 'center',
        }}>
          <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '10px', fontWeight: 700, color: '#39D98A', textTransform: 'uppercase', letterSpacing: '0.06em', flexShrink: 0 }}>
            Your place
          </span>
          <div style={{ flex: 1, display: 'flex', gap: '6px' }}>
            {([
              { label: '✏️ Edit',    action: () => { window.location.href = '/venue/edit'; } },
              { label: '📣 Update',  action: () => setShowPostUpdateModal(true)              },
              { label: '📊 Stats',   action: () => { window.location.href = '/owner'; }      },
            ] as { label: string; action: () => void }[]).map(a => (
              <button
                key={a.label}
                onClick={a.action}
                style={{
                  flex: 1, padding: '8px 6px', borderRadius: '10px',
                  background: 'rgba(57,217,138,0.1)',
                  border: '1px solid rgba(57,217,138,0.2)',
                  fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '11px',
                  color: '#39D98A', cursor: 'pointer',
                  whiteSpace: 'nowrap',
                } as React.CSSProperties}
              >
                {a.label}
              </button>
            ))}
          </div>
        </div>
      )}

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

      {/* ── Report modal ──────────────────────────────────────────────────── */}
      {showReportModal && (
        <ReportModal
          contentType="place"
          contentId={venue.id}
          onClose={() => setShowReportModal(false)}
        />
      )}

      {/* ── Post Update modal (owner only) ────────────────────────────────── */}
      {showPostUpdateModal && venue && (
        <PostUpdateModal
          venue={{ id: venue.id, name: venue.name }}
          onClose={() => setShowPostUpdateModal(false)}
          onPosted={() => {
            setShowPostUpdateModal(false);
            getVenueOwnerUpdates(venue.id).then(setOwnerUpdates);
          }}
        />
      )}
    </div>
  );
}
