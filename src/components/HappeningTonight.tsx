import { Link } from 'react-router-dom';
import type { TonightEvent } from '../lib/api';

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

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' });
}

export default function HappeningTonight({ events }: { events: TonightEvent[] }) {
  if (events.length === 0) return null;

  return (
    <div style={{ marginBottom: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '12px' }}>
        <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '15px', color: 'var(--color-text)' }}>
          Happening tonight
        </h2>
        <span style={{ fontSize: '12px', color: 'var(--color-accent)' }}>{events.length} on</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {events.map(ev => {
          const emoji = CATEGORY_EMOJI[ev.venueType] ?? '📍';
          const color = CATEGORY_COLOR[ev.venueType] ?? '#39D98A';

          return (
            <Link
              key={ev.id}
              to={`/venue/${ev.venueSlug}`}
              style={{ textDecoration: 'none' }}
            >
              <div style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: '14px', padding: '12px 14px',
                display: 'flex', alignItems: 'center', gap: '12px',
              }}>
                <div style={{
                  width: '40px', height: '40px', borderRadius: '12px', flexShrink: 0,
                  background: `${color}18`, border: `1px solid ${color}30`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '20px',
                }}>
                  {emoji}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '13px',
                    color: 'var(--color-text)', marginBottom: '2px',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {ev.title}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--color-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {ev.venueName} · {formatTime(ev.startsAt)}
                  </div>
                </div>

                <span style={{
                  fontSize: '11px', fontWeight: 700, flexShrink: 0,
                  color: ev.isFree ? '#39D98A' : '#F5A623',
                  background: ev.isFree ? 'rgba(57,217,138,0.1)' : 'rgba(245,166,35,0.1)',
                  padding: '3px 8px', borderRadius: '20px',
                }}>
                  {ev.isFree ? 'Free' : `R${ev.price}`}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
