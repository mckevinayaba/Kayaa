import { useNavigate } from 'react-router-dom';
import type { TrendingVenue } from '../lib/api';

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

export default function TrendingRail({ venues }: { venues: TrendingVenue[] }) {
  const navigate = useNavigate();

  if (venues.length < 2) return null;

  return (
    <div style={{ marginBottom: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '12px' }}>
        <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '15px', color: 'var(--color-text)' }}>
          Trending this week
        </h2>
        <span style={{ fontSize: '12px', color: 'var(--color-accent)' }}>🔥 live</span>
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
          const hasCover = !!venue.coverImage;
          const galleryCount = venue.galleryImages?.length ?? 0;
          const hasVideo = !!venue.introVideo;

          return (
            <div
              key={venue.id}
              onClick={() => navigate(`/venue/${venue.slug}`)}
              style={{
                flexShrink: 0, width: '140px', height: '160px',
                background: hasCover
                  ? `url(${venue.coverImage}) center/cover no-repeat`
                  : 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: '14px',
                cursor: 'pointer',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {/* Dark overlay if cover image */}
              {hasCover && (
                <div style={{
                  position: 'absolute', inset: 0,
                  background: 'linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.72) 100%)',
                  borderRadius: '14px',
                }} />
              )}

              {/* Media badges top-left */}
              {(galleryCount > 0 || hasVideo) && (
                <div style={{
                  position: 'absolute', top: '8px', left: '8px',
                  display: 'flex', gap: '4px', zIndex: 2,
                }}>
                  {galleryCount > 0 && (
                    <span style={{
                      fontSize: '10px', fontWeight: 700,
                      background: 'rgba(0,0,0,0.65)', color: '#fff',
                      borderRadius: '8px', padding: '2px 6px',
                      backdropFilter: 'blur(4px)',
                    }}>
                      📷 {galleryCount}
                    </span>
                  )}
                  {hasVideo && (
                    <span style={{
                      fontSize: '10px', fontWeight: 700,
                      background: 'rgba(0,0,0,0.65)', color: '#fff',
                      borderRadius: '8px', padding: '2px 6px',
                      backdropFilter: 'blur(4px)',
                    }}>
                      ▶
                    </span>
                  )}
                </div>
              )}

              {/* Content */}
              <div style={{
                position: 'absolute',
                ...(hasCover ? { bottom: 0, left: 0, right: 0, padding: '10px 12px' } : { top: 0, left: 0, right: 0, bottom: 0, padding: '12px' }),
              }}>
                {!hasCover && (
                  <div style={{
                    width: '40px', height: '40px', borderRadius: '12px',
                    background: `${color}18`, border: `1px solid ${color}30`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '20px', marginBottom: '8px',
                  }}>
                    {emoji}
                  </div>
                )}

                <div style={{
                  fontFamily: 'Syne, sans-serif', fontWeight: 700,
                  fontSize: hasCover ? '12px' : '13px',
                  color: hasCover ? '#fff' : 'var(--color-text)',
                  marginBottom: '4px',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {venue.name}
                </div>

                <span style={{
                  fontSize: '10px', fontWeight: 600,
                  color: hasCover ? 'rgba(255,255,255,0.75)' : color,
                  background: hasCover ? 'rgba(255,255,255,0.12)' : `${color}18`,
                  padding: '1px 7px', borderRadius: '20px',
                  display: 'inline-block', marginBottom: hasCover ? '0' : '6px',
                }}>
                  {venue.category}
                </span>

                {!hasCover && (
                  <div style={{ fontSize: '11px', color: 'var(--color-muted)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                    <span>🔥</span>
                    <span>{venue.weeklyCheckins} this week</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
