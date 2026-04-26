import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, MapPin } from 'lucide-react';
import { getAllVenues } from '../lib/api';
import { useCountry } from '../contexts/CountryContext';
import type { Venue } from '../types';

const CAT_EMOJI: Record<string, string> = {
  Barbershop: '✂️', Shisanyama: '🔥', Tavern: '🍺', Café: '☕',
  Church: '⛪', Carwash: '🚗', 'Spaza Shop': '🏪', Salon: '💅',
  Tutoring: '📚', 'Sports Ground': '⚽', 'Home Business': '🏠',
};

function emoji(cat: string): string {
  return CAT_EMOJI[cat] ?? '📍';
}

function Skeleton() {
  return (
    <div style={{ background: '#161B22', border: '1px solid #21262D', borderRadius: '14px', padding: '14px', marginBottom: '10px', display: 'flex', gap: '12px', alignItems: 'center' }}>
      <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: '#21262D', flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <div style={{ height: '14px', width: '55%', background: '#21262D', borderRadius: '6px', marginBottom: '8px' }} />
        <div style={{ height: '11px', width: '35%', background: '#21262D', borderRadius: '6px' }} />
      </div>
      <div style={{ width: '80px', height: '34px', background: '#21262D', borderRadius: '20px' }} />
    </div>
  );
}

export default function CheckInBrowsePage() {
  const navigate = useNavigate();
  const { selectedCountry } = useCountry();
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    getAllVenues(selectedCountry.code).then(v => {
      setVenues(v.filter(x => x.description.trim().length >= 10));
      setLoading(false);
    });
  }, [selectedCountry.code]);

  const filtered = search.trim()
    ? venues.filter(v =>
        v.name.toLowerCase().includes(search.toLowerCase()) ||
        v.neighborhood.toLowerCase().includes(search.toLowerCase()) ||
        v.category.toLowerCase().includes(search.toLowerCase())
      )
    : venues;

  return (
    <div style={{ padding: '16px' }}>
      {/* Header */}
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '22px', color: '#F0F6FC', marginBottom: '4px' }}>
          Check In
        </h1>
        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.45)', fontFamily: 'DM Sans, sans-serif' }}>
          Find a place near you and check in
        </p>
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: '20px' }}>
        <Search size={15} color="rgba(255,255,255,0.35)" style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search venues or areas..."
          style={{
            width: '100%', boxSizing: 'border-box',
            background: '#161B22', border: '1px solid #21262D',
            borderRadius: '12px', padding: '11px 14px 11px 36px',
            color: '#F0F6FC', fontSize: '14px', fontFamily: 'DM Sans, sans-serif', outline: 'none',
          }}
        />
      </div>

      {/* Venue list */}
      {loading ? (
        <div>{[0,1,2,3,4].map(i => <Skeleton key={i} />)}</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 24px' }}>
          <div style={{ fontSize: '36px', marginBottom: '12px' }}>📍</div>
          <h3 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '15px', color: '#F0F6FC', marginBottom: '8px' }}>
            No venues found
          </h3>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.45)', lineHeight: 1.5 }}>
            Try searching differently or{' '}
            <button onClick={() => navigate('/onboarding')} style={{ background: 'none', border: 'none', color: '#39D98A', cursor: 'pointer', fontSize: '13px', fontWeight: 600, padding: 0 }}>
              add your place
            </button>
          </p>
        </div>
      ) : (
        <div>
          {filtered.map(v => (
            <div
              key={v.id}
              style={{
                background: '#161B22', border: '1px solid #21262D',
                borderRadius: '14px', padding: '14px',
                marginBottom: '10px', display: 'flex', gap: '12px', alignItems: 'center',
              }}
            >
              {/* Emoji icon */}
              <div style={{
                width: '44px', height: '44px', borderRadius: '12px',
                background: 'rgba(57,217,138,0.08)', border: '1px solid rgba(57,217,138,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '20px', flexShrink: 0,
              }}>
                {emoji(v.category)}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '14px', color: '#F0F6FC', marginBottom: '3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {v.name}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <MapPin size={11} color="rgba(255,255,255,0.35)" />
                  <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)', fontFamily: 'DM Sans, sans-serif', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {v.neighborhood || v.city}
                  </span>
                </div>
              </div>

              {/* CTA */}
              <button
                onClick={() => navigate(`/venue/${v.slug}/checkin`)}
                style={{
                  background: '#39D98A', color: '#0D1117',
                  border: 'none', borderRadius: '20px',
                  padding: '8px 16px', fontFamily: 'DM Sans, sans-serif',
                  fontWeight: 700, fontSize: '12px', cursor: 'pointer',
                  whiteSpace: 'nowrap', flexShrink: 0,
                }}
              >
                Check in →
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Bottom padding */}
      <div style={{ height: '24px' }} />
    </div>
  );
}
