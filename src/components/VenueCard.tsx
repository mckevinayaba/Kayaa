import { useNavigate, Link } from 'react-router-dom';
import { MapPin, Share2, CheckCircle2 } from 'lucide-react';
import type { Venue } from '../types';

const categoryEmoji: Record<string, string> = {
  Barbershop: '✂️',
  Shisanyama: '🔥',
  Tavern: '🍺',
  Café: '☕',
  Church: '⛪',
  Carwash: '🚗',
  'Spaza Shop': '🏪',
  Salon: '💅',
  Tutoring: '📚',
  'Sports Ground': '⚽',
  'Home Business': '🏠',
};

const categoryColor: Record<string, string> = {
  Barbershop: '#39D98A',
  Shisanyama: '#F5A623',
  Tavern: '#60A5FA',
  Café: '#F59E0B',
  Church: '#A78BFA',
  Carwash: '#34D399',
  'Spaza Shop': '#60A5FA',
  Salon: '#F472B6',
  Tutoring: '#34D399',
  'Sports Ground': '#FB923C',
  'Home Business': '#94A3B8',
};

const BUSY_THRESHOLD = 1000;
const HOT_THRESHOLD    = 1500;
const ACTIVE_THRESHOLD = 300;

function getActivityLevel(count: number): { label: string; emoji: string } | null {
  if (count >= HOT_THRESHOLD)    return { label: 'Hot',    emoji: '🔥' };
  if (count >= ACTIVE_THRESHOLD) return { label: 'Active', emoji: '⚡' };
  return null;
}

function getHumanDetail(description: string): string {
  const sentence = description.split('.')[0];
  return sentence.length > 60 ? sentence.slice(0, 57) + '…' : sentence;
}

interface VenueCardProps {
  venue: Venue;
}

export default function VenueCard({ venue }: VenueCardProps) {
  const navigate = useNavigate();
  const emoji = categoryEmoji[venue.category] ?? '📍';
  const color = categoryColor[venue.category] ?? '#39D98A';
  const isBusy = venue.checkinCount > BUSY_THRESHOLD;
  const activity = getActivityLevel(venue.checkinCount);

  return (
    <div
      onClick={() => navigate(`/venue/${venue.slug}`)}
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: '16px',
        padding: '16px',
        marginBottom: '12px',
        cursor: 'pointer',
        WebkitTapHighlightColor: 'transparent',
        transition: 'border-color 0.15s',
      }}
    >
      {/* Top row: avatar + name block */}
      <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start', marginBottom: '12px' }}>
        {/* Emoji avatar */}
        <div style={{
          width: '52px',
          height: '52px',
          borderRadius: '14px',
          background: `${color}18`,
          border: `1px solid ${color}30`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '24px',
          flexShrink: 0,
        }}>
          {emoji}
        </div>

        {/* Name + badges */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '5px' }}>
            <h3 style={{
              fontFamily: 'Syne, sans-serif',
              fontWeight: 700,
              fontSize: '16px',
              color: 'var(--color-text)',
              lineHeight: 1.2,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              margin: 0, flex: 1, minWidth: 0,
            }}>
              {venue.name}
            </h3>
            {venue.isVerified && (
              <CheckCircle2 size={15} color="#39D98A" style={{ flexShrink: 0 }} />
            )}
          </div>

          {/* Type badge + status + activity */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <span style={{
              fontSize: '11px',
              fontWeight: 600,
              color,
              background: `${color}18`,
              padding: '2px 8px',
              borderRadius: '20px',
              lineHeight: 1.6,
            }}>
              {venue.category}
            </span>

            {venue.isOpen ? (
              <>
                <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#39D98A', flexShrink: 0 }} />
                <span style={{ fontSize: '11px', color: '#39D98A', fontWeight: 600 }}>
                  {isBusy ? 'Busy now' : 'Open now'}
                </span>
              </>
            ) : (
              <>
                <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#6B7280', flexShrink: 0 }} />
                <span style={{ fontSize: '11px', color: '#6B7280' }}>Closed</span>
              </>
            )}
            {activity && (
              <span style={{
                fontSize: '10px', fontWeight: 700,
                color: activity.label === 'Hot' ? '#F5A623' : '#60A5FA',
                background: activity.label === 'Hot' ? 'rgba(245,166,35,0.12)' : 'rgba(96,165,250,0.12)',
                padding: '1px 7px', borderRadius: '20px',
              }}>
                {activity.emoji} {activity.label}
              </span>
            )}
          </div>

          {/* Location */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '3px', marginTop: '4px' }}>
            <MapPin size={11} color="var(--color-muted)" />
            <span style={{
              fontSize: '12px',
              color: 'var(--color-muted)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}>
              {venue.neighborhood}, {venue.city}
            </span>
          </div>
        </div>
      </div>

      {/* Human detail */}
      <p style={{
        fontSize: '13px',
        color: 'var(--color-muted)',
        lineHeight: 1.55,
        marginBottom: '14px',
      }}>
        {getHumanDetail(venue.description)}
      </p>

      {/* Bottom row: regulars count + check-in button */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: '12px',
        borderTop: '1px solid var(--color-border)',
      }}>
        <span style={{ fontSize: '12px', color: 'var(--color-muted)' }}>
          <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>
            {venue.checkinCount.toLocaleString()}
          </span>{' '}
          regulars
        </span>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <a
            href={`https://wa.me/?text=${encodeURIComponent(`Check out ${venue.name} on Kayaa — https://kayaa.co.za/venue/${venue.slug}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: '30px', height: '30px', borderRadius: '50%',
              background: 'var(--color-surface2)',
              border: '1px solid var(--color-border)',
              flexShrink: 0,
            }}
          >
            <Share2 size={14} color="var(--color-muted)" />
          </a>
          <Link
            to={`/venue/${venue.slug}/checkin`}
            onClick={e => e.stopPropagation()}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              background: 'var(--color-accent)',
              color: '#000',
              textDecoration: 'none',
              fontSize: '12px',
              fontWeight: 700,
              fontFamily: 'Syne, sans-serif',
              padding: '6px 14px',
              borderRadius: '20px',
              letterSpacing: '0.01em',
            }}
          >
            Check in
          </Link>
        </div>
      </div>
    </div>
  );
}
