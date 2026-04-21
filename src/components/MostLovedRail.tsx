import { useNavigate } from 'react-router-dom';
import type { Venue } from '../types';

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

export default function MostLovedRail({ venues, city }: { venues: Venue[]; city: string }) {
  const navigate = useNavigate();

  if (venues.length < 2) return null;

  return (
    <div style={{ marginBottom: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '12px' }}>
        <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '15px', color: 'var(--color-text)' }}>
          Most loved in {city}
        </h2>
        <span style={{ fontSize: '12px', color: 'var(--color-muted)' }}>💛</span>
      </div>

      <div style={{
        display: 'flex', gap: '10px',
        overflowX: 'auto', scrollbarWidth: 'none',
        marginLeft: '-16px', paddingLeft: '16px',
        marginRight: '-16px', paddingRight: '16px',
        paddingBottom: '4px',
        WebkitOverflowScrolling: 'touch',
      } as React.CSSProperties}>
        {venues.map(venue => {
          const emoji = CATEGORY_EMOJI[venue.category] ?? '📍';
          const color = CATEGORY_COLOR[venue.category] ?? '#39D98A';

          return (
            <div
              key={venue.id}
              onClick={() => navigate(`/venue/${venue.slug}`)}
              style={{
                flexShrink: 0, width: '140px',
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: '14px', padding: '12px',
                cursor: 'pointer',
              }}
            >
              <div style={{
                width: '40px', height: '40px', borderRadius: '12px',
                background: `${color}18`, border: `1px solid ${color}30`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '20px', marginBottom: '8px',
              }}>
                {emoji}
              </div>

              <div style={{
                fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '13px',
                color: 'var(--color-text)', marginBottom: '4px',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {venue.name}
              </div>

              <span style={{
                fontSize: '10px', fontWeight: 600, color,
                background: `${color}18`, padding: '1px 7px', borderRadius: '20px',
                display: 'inline-block', marginBottom: '6px',
              }}>
                {venue.category}
              </span>

              <div style={{ fontSize: '11px', color: 'var(--color-muted)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                <span>💛</span>
                <span>{venue.followerCount.toLocaleString()} regulars</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
