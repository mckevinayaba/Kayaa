import { useState } from 'react';
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
}

export default function VenueCard({ venue, headingCount = 0, vibeWinner, hasActiveStory, onStoryTap }: VenueCardProps) {
  const navigate = useNavigate();
  const emoji  = categoryEmoji[venue.category] ?? '📍';
  const color  = categoryColor[venue.category] ?? '#39D98A';
  const status = statusConfig(venue.venueStatus ?? (venue.isOpen ? 'open' : 'closed'));
  const [shareOpen, setShareOpen] = useState(false);

  return (
    <>
      <style>{`
        @keyframes headingPulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.6; transform: scale(0.9); } }
        @keyframes storyRing { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } }
      `}</style>

      <div
        onClick={() => navigate(`/venue/${venue.slug}`)}
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: '16px', padding: '16px', marginBottom: '12px',
          cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
          position: 'relative',
        }}
      >
        {/* Vibe badge — top-right */}
        {vibeWinner && (
          <div style={{
            position: 'absolute', top: '12px', right: '12px',
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

        {/* Top row: avatar + name block */}
        <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start', marginBottom: '12px' }}>
          {/* Emoji avatar — with optional story ring */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            {hasActiveStory && (
              <div
                onClick={e => { e.stopPropagation(); onStoryTap?.(); }}
                style={{
                  position: 'absolute', inset: '-4px', borderRadius: '18px',
                  border: '2.5px solid #22c55e',
                  animation: 'storyRing 2s ease-in-out infinite',
                  cursor: 'pointer', zIndex: 1,
                }}
              />
            )}
            <div style={{
              width: '52px', height: '52px', borderRadius: '14px',
              background: `${color}18`, border: `1px solid ${color}30`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '24px', position: 'relative', zIndex: 0,
            }}>
              {emoji}
            </div>
          </div>

          {/* Name + badges */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '5px' }}>
              <h3 style={{
                fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '16px',
                color: 'var(--color-text)', lineHeight: 1.2,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                margin: 0, flex: 1, minWidth: 0,
              }}>
                {venue.name}
              </h3>
              {venue.isVerified && <CheckCircle2 size={15} color="#39D98A" style={{ flexShrink: 0 }} />}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '11px', fontWeight: 600, color, background: `${color}18`, padding: '2px 8px', borderRadius: '20px', lineHeight: 1.6 }}>
                {venue.category}
              </span>
              <span style={{ fontSize: '10px', fontWeight: 700, color: status.color, background: `${status.color}18`, padding: '2px 8px', borderRadius: '20px', lineHeight: 1.6 }}>
                {status.dot} {status.label}
              </span>
              {(venue.checkinsToday ?? 0) > 0 && (
                <span style={{ fontSize: '10px', color: '#F59E0B', fontWeight: 600 }}>
                  📍 {venue.checkinsToday} today
                </span>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '3px', marginTop: '4px' }}>
              <MapPin size={11} color="var(--color-muted)" />
              <span style={{ fontSize: '12px', color: 'var(--color-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {venue.neighborhood}, {venue.city}
              </span>
            </div>
          </div>
        </div>

        <p style={{ fontSize: '13px', color: 'var(--color-muted)', lineHeight: 1.55, marginBottom: '14px' }}>
          {getHumanDetail(venue.description)}
        </p>

        {/* Bottom row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '12px', borderTop: '1px solid var(--color-border)' }}>
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
      </div>

      <ShareModal
        type="place"
        data={{ name: venue.name, slug: venue.slug, category: venue.category, emoji, neighborhood: venue.neighborhood, city: venue.city, description: venue.description, checkinCount: venue.checkinCount, isOpen: venue.isOpen }}
        isOpen={shareOpen}
        onClose={() => setShareOpen(false)}
      />
    </>
  );
}
