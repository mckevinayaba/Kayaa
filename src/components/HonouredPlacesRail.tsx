/**
 * HonouredPlacesRail — "Places locals honour ✨"
 *
 * A horizontal scroll rail showing venues with the most honour signals.
 * Amber/gold aesthetic to feel distinct from activity-based surfaces.
 *
 * Honour = places that hold memory, trust, routine, and local meaning.
 * This surface makes that visible on Home and Discover.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMostHonouredVenues } from '../lib/api';
import type { HonouredVenueItem } from '../lib/api';
import { getCategoryEmoji } from '../lib/venueUtils';

interface Props {
  suburb?: string;
  city?:   string;
}

export default function HonouredPlacesRail({ suburb, city }: Props) {
  const navigate = useNavigate();
  const [items,   setItems]   = useState<HonouredVenueItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMostHonouredVenues(suburb, city, 10)
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [suburb, city]);

  // Don't render skeleton — if there's no honour data yet, stay invisible
  if (!loading && items.length === 0) return null;
  if (loading) return null;

  return (
    <div style={{ marginBottom: '28px' }}>

      {/* Section header */}
      <div style={{ marginBottom: '12px' }}>
        <h2 style={{
          fontFamily: 'Syne, sans-serif', fontWeight: 700,
          fontSize: '15px', color: '#F0F6FC',
          margin: '0 0 3px',
        }}>
          Places locals honour ✨
        </h2>
        <p style={{
          fontFamily: 'DM Sans, sans-serif', fontSize: '12px',
          color: 'rgba(255,255,255,0.35)', margin: 0,
        }}>
          These places hold memory, trust, and meaning
        </p>
      </div>

      {/* Scroll rail */}
      <div style={{
        display: 'flex', gap: '10px',
        overflowX: 'auto', scrollbarWidth: 'none',
        marginLeft: '-16px', paddingLeft: '16px',
        marginRight: '-16px', paddingRight: '16px',
        paddingBottom: '4px',
        WebkitOverflowScrolling: 'touch',
      } as React.CSSProperties}>

        {items.map(({ venue, count }) => {
          const emoji = getCategoryEmoji(venue.category);
          return (
            <div
              key={venue.id}
              onClick={() => navigate(`/venue/${venue.slug}`)}
              style={{
                flexShrink: 0,
                width: '152px',
                cursor: 'pointer',
                background: 'rgba(245,158,11,0.04)',
                border: '1px solid rgba(245,158,11,0.22)',
                borderRadius: '16px',
                padding: '14px 12px',
                WebkitTapHighlightColor: 'transparent',
              } as React.CSSProperties}
            >
              {/* Emoji icon */}
              <div style={{
                width: '40px', height: '40px',
                borderRadius: '12px', flexShrink: 0,
                background: 'rgba(245,158,11,0.1)',
                border: '1px solid rgba(245,158,11,0.18)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '20px', marginBottom: '8px',
              }}>
                {emoji}
              </div>

              {/* Venue name */}
              <div style={{
                fontFamily: 'Syne, sans-serif', fontWeight: 700,
                fontSize: '13px', color: '#F0F6FC',
                marginBottom: '3px', lineHeight: 1.25,
                overflow: 'hidden', textOverflow: 'ellipsis',
                display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
              } as React.CSSProperties}>
                {venue.name}
              </div>

              {/* Area */}
              <div style={{
                fontFamily: 'DM Sans, sans-serif', fontSize: '11px',
                color: 'rgba(255,255,255,0.38)', marginBottom: '9px',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {venue.neighborhood || venue.city}
              </div>

              {/* Honour count pill */}
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: '3px',
                background: 'rgba(245,158,11,0.12)',
                border: '1px solid rgba(245,158,11,0.18)',
                borderRadius: '20px', padding: '2px 8px',
                fontFamily: 'DM Sans, sans-serif', fontWeight: 700,
                fontSize: '11px', color: '#F59E0B',
              }}>
                ✨ {count} {count === 1 ? 'honour' : 'honours'}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
