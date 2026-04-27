import { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { MapPin, Share2, CheckCircle2 } from 'lucide-react';
import type { Venue } from '../types';
import type { VibeType } from '../lib/api';
import ShareModal from './ShareModal';

const categoryEmoji: Record<string, string> = {
  Barbershop: '✂️', Shisanyama: '🔥', Tavern: '🍺', Café: '☕',
  Church: '⛪', Carwash: '🚗', 'Spaza Shop': '🏪', Salon: '💅',
  Tutoring: '📚', 'Sports Ground': '⚽', 'Home Business': '🏠',
};

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

function statusConfig(status: string): { dot: string; label: string; color: string } {
  switch (status) {
    case 'busy':   return { dot: '🔥', label: 'Busy now',  color: '#F97316' };
    case 'quiet':  return { dot: '🌙', label: 'Quiet',     color: '#6B7280' };
    case 'closed': return { dot: '⚫', label: 'Closed',    color: '#6B7280' };
    default:       return { dot: '✓',  label: 'Open now',  color: '#39D98A' };
  }
}

function getHumanDetail(description: string): string {
  const sentence = description.split('.')[0];
  return sentence.length > 60 ? sentence.slice(0, 57) + '…' : sentence;
}

interface VenueCardProps {
  venue: Venue;
  headingCount?: number;
  vibeWinner?: { vibe: VibeType; count: number } | null;
  hasActiveStory?: boolean;
  onStoryTap?: () => void;
  recommendationReason?: string;
}

export default function VenueCard({ venue, headingCount = 0, vibeWinner, hasActiveStory, onStoryTap, recommendationReason }: VenueCardProps) {
  const navigate = useNavigate();
  const emoji  = categoryEmoji[venue.category] ?? '📍';
  const color  = categoryColor[venue.category] ?? '#39D98A';
  const status = statusConfig(venue.venueStatus ?? (venue.isOpen ? 'open' : 'closed'));
  const [shareOpen, setShareOpen] = useState(false);

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
          border: '1px solid var(--color-border)',
          borderRadius: '16px', overflow: 'hidden', marginBottom: '12px',
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
            </>
          ) : (
            /* Emoji fallback — gradient + large category emoji */
            <div style={{
              position: 'absolute', inset: 0,
              background: `linear-gradient(135deg, ${color}22 0%, ${color}08 100%)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '56px',
            }}>
              {emoji}
            </div>
          )}

          {/* Status badge overlay — top-left */}
          <div style={{
            position: 'absolute', top: '10px', left: '10px',
            background: `${status.color}dd`, backdropFilter: 'blur(6px)',
            borderRadius: '20px', padding: '4px 10px',
            display: 'flex', alignItems: 'center', gap: '4px',
          }}>
            <span style={{ fontSize: '12px' }}>{status.dot}</span>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#fff', fontFamily: 'DM Sans, sans-serif' }}>
              {status.label}
            </span>
          </div>

          {/* Vibe badge — top-right */}
          {vibeWinner && (
            <div style={{
              position: 'absolute', top: '10px', right: '10px',
              background: 'rgba(13,17,23,0.85)', borderRadius: '12px',
              padding: '3px 8px', display: 'flex', alignItems: 'center', gap: '4px',
              border: '1px solid rgba(255,255,255,0.12)',
            }}>
              <span style={{ fontSize: '11px' }}>{VIBE_EMOJI[vibeWinner.vibe]}</span>
              <span style={{ fontSize: '10px', fontWeight: 700, color: '#fff', fontFamily: 'DM Sans, sans-serif' }}>
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
        <div style={{ padding: '14px 16px 0' }}>

          {/* Category header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '5px' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color, background: `${color}18`, padding: '2px 8px', borderRadius: '20px', lineHeight: 1.6 }}>
              {emoji} {venue.category}
            </span>
            {venue.isVerified && <CheckCircle2 size={14} color="#39D98A" />}
            {(venue.checkinsToday ?? 0) > 0 && (
              <span style={{ fontSize: '11px', color: '#F59E0B', fontWeight: 600, marginLeft: 'auto' }}>
                📍 {venue.checkinsToday} today
              </span>
            )}
          </div>

          {/* Place name */}
          <h3 style={{
            fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '18px',
            color: 'var(--color-text)', lineHeight: 1.2, margin: '0 0 4px',
          }}>
            {venue.name}
          </h3>

          {/* Location */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '3px', marginBottom: '10px' }}>
            <MapPin size={11} color="var(--color-muted)" />
            <span style={{ fontSize: '12px', color: 'var(--color-muted)' }}>
              {venue.neighborhood}, {venue.city}
            </span>
          </div>

          {recommendationReason && (
            <div style={{ marginBottom: '8px' }}>
              <span style={{
                fontSize: '10px', fontWeight: 700,
                color: 'rgba(255,255,255,0.45)',
                fontFamily: 'DM Sans, sans-serif',
                letterSpacing: '0.02em',
              }}>
                {recommendationReason}
              </span>
            </div>
          )}

          <p style={{ fontSize: '13px', color: 'var(--color-muted)', lineHeight: 1.55, marginBottom: '14px' }}>
            {getHumanDetail(venue.description)}
          </p>

          {/* Bottom row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '12px', borderTop: '1px solid var(--color-border)', marginBottom: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              {(venue.regularsCount ?? venue.checkinCount) > 50 && (
                <span style={{ fontSize: '12px', color: 'var(--color-muted)' }}>
                  <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>
                    💛 {(venue.regularsCount ?? venue.checkinCount).toLocaleString()}
                  </span> regulars
                </span>
              )}
              {venue.lastCheckinAt && (
                <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>
                  · {timeAgoShort(venue.lastCheckinAt)}
                </span>
              )}
              {headingCount > 0 && (
                <span style={{
                  fontSize: '11px', fontWeight: 700,
                  background: 'rgba(245,166,35,0.12)',
                  color: '#F5A623', border: '1px solid rgba(245,166,35,0.25)',
                  borderRadius: '10px', padding: '2px 7px',
                  animation: 'headingPulse 2s ease-in-out infinite',
                  display: 'inline-block',
                }}>
                  🚶 {headingCount}
                </span>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={e => { e.stopPropagation(); setShareOpen(true); }}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '30px', height: '30px', borderRadius: '50%', background: 'var(--color-surface2)', border: '1px solid var(--color-border)', flexShrink: 0, cursor: 'pointer' }}
              >
                <Share2 size={14} color="var(--color-muted)" />
              </button>
              <Link
                to={`/venue/${venue.slug}/checkin`}
                onClick={e => e.stopPropagation()}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: 'var(--color-accent)', color: '#000', textDecoration: 'none', fontSize: '12px', fontWeight: 700, fontFamily: 'Syne, sans-serif', padding: '6px 14px', borderRadius: '20px', letterSpacing: '0.01em' }}
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
