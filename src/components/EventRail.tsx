import type { Event, Venue } from '../types';

const categoryEmoji: Record<string, string> = {
  Barbershop: '✂️',
  Shisanyama: '🔥',
  Tavern: '🍺',
  Church: '⛪',
  Tutoring: '📚',
  Salon: '💅',
  'Spaza Shop': '🏪',
};

function formatEventTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' });
}

function formatEventDay(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const diff = Math.round((d.setHours(0,0,0,0) - today.setHours(0,0,0,0)) / 86400000);
  if (diff === 0) return 'Tonight';
  if (diff === 1) return 'Tomorrow';
  return d.toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short' });
}

interface EventRailProps {
  events: Event[];
  venues: Venue[];
}

export default function EventRail({ events, venues }: EventRailProps) {
  if (events.length === 0) return null;

  return (
    <div style={{ marginBottom: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '12px', paddingRight: '2px' }}>
        <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '15px', color: 'var(--color-text)' }}>
          Events this week
        </h2>
        <span style={{ fontSize: '12px', color: 'var(--color-accent)' }}>{events.length} on</span>
      </div>

      {/* Horizontal scroll rail */}
      <div style={{
        display: 'flex',
        gap: '10px',
        overflowX: 'auto',
        paddingBottom: '4px',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
        WebkitOverflowScrolling: 'touch' as React.CSSProperties['WebkitOverflowScrolling'],
        marginLeft: '-16px',
        paddingLeft: '16px',
        marginRight: '-16px',
        paddingRight: '16px',
      } as React.CSSProperties}>
        {events.map(event => {
          const venue = venues.find(v => v.id === event.venueId);
          if (!venue) return null;
          const emoji = categoryEmoji[venue.category] ?? '📍';

          return (
            <div
              key={event.id}
              style={{
                flexShrink: 0,
                width: '200px',
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: '14px',
                padding: '14px',
              }}
            >
              {/* Emoji + day */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '22px' }}>{emoji}</span>
                <span style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  color: 'var(--color-accent)',
                  background: 'rgba(57,217,138,0.1)',
                  padding: '2px 8px',
                  borderRadius: '20px',
                  letterSpacing: '0.03em',
                  textTransform: 'uppercase' as const,
                }}>
                  {formatEventDay(event.startsAt)}
                </span>
              </div>

              {/* Title */}
              <div style={{
                fontFamily: 'Syne, sans-serif',
                fontWeight: 700,
                fontSize: '13px',
                color: 'var(--color-text)',
                marginBottom: '4px',
                lineHeight: 1.3,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical' as const,
                overflow: 'hidden',
              } as React.CSSProperties}>
                {event.title}
              </div>

              {/* Venue */}
              <div style={{ fontSize: '11px', color: 'var(--color-muted)', marginBottom: '8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {venue.name}
              </div>

              {/* Time + price */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: 'var(--color-muted)' }}>
                  {formatEventTime(event.startsAt)}
                </span>
                <span style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: event.isFree ? '#39D98A' : 'var(--color-amber)',
                }}>
                  {event.isFree ? 'Free' : `R${event.price}`}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
