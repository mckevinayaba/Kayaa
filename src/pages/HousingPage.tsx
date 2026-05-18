/**
 * HousingPage — /housing
 *
 * Dedicated surface for accommodation listings pulled from the Board.
 * Category: 'accommodation'. Sub-type filter uses keyword detection on
 * title + description so no schema changes are needed.
 */

import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, MessageCircle } from 'lucide-react';
import { getBoardPosts, type BoardPost } from '../lib/api';
import { useNeighbourhood } from '../contexts/NeighbourhoodContext';

// ── Sub-type detection ────────────────────────────────────────────────────────

type SubType = 'all' | 'room' | 'rental' | 'short_stay' | 'lodge';

interface SubFilter {
  key:   SubType;
  label: string;
  emoji: string;
}

const SUB_FILTERS: SubFilter[] = [
  { key: 'all',       label: 'All',        emoji: '🏠' },
  { key: 'room',      label: 'Room',       emoji: '🛏️' },
  { key: 'rental',    label: 'Rental',     emoji: '🏡' },
  { key: 'short_stay',label: 'Short stay', emoji: '🌙' },
  { key: 'lodge',     label: 'Lodge',      emoji: '🏨' },
];

function detectSubType(post: BoardPost): SubType {
  const text = `${post.title} ${post.description ?? ''}`.toLowerCase();
  if (/lodge|guesthouse|guest house|bed and breakfast|b&b|b & b/.test(text)) return 'lodge';
  if (/short.?stay|per night|nightly|weekend|airbnb|daily rate/.test(text)) return 'short_stay';
  if (/room|bachelor|flatlet|sharing|share|single room|double room/.test(text)) return 'room';
  return 'rental';
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function formatPrice(post: BoardPost): string {
  if (!post.price) return 'Price on request';
  const text = `${post.title} ${post.description ?? ''}`.toLowerCase();
  const sub = detectSubType(post);
  if (sub === 'short_stay' || /night|daily|per day/.test(text)) return `R${post.price.toLocaleString()}/night`;
  return `R${post.price.toLocaleString()}/month`;
}

const SUB_COLORS: Record<SubType, string> = {
  all:       '#34D399',
  room:      '#60A5FA',
  rental:    '#34D399',
  short_stay:'#A78BFA',
  lodge:     '#F59E0B',
};

// ── HousingCard ───────────────────────────────────────────────────────────────

function HousingCard({ post }: { post: BoardPost }) {
  const sub   = detectSubType(post);
  const color = SUB_COLORS[sub];
  const filter = SUB_FILTERS.find(f => f.key === sub)!;

  function openWhatsApp() {
    if (!post.contactWhatsapp) return;
    const num = post.contactWhatsapp.replace(/\D/g, '');
    const msg = encodeURIComponent(`Hi, I saw your listing on Kayaa: "${post.title}"`);
    window.open(`https://wa.me/${num}?text=${msg}`, '_blank');
  }

  return (
    <div style={{
      background: 'var(--color-surface)',
      border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: '16px',
      overflow: 'hidden',
      marginBottom: '12px',
    }}>
      {/* Cover image */}
      {post.images.length > 0 && (
        <div style={{ position: 'relative', height: '160px', overflow: 'hidden' }}>
          <img
            src={post.images[0]}
            alt={post.title}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
          {/* Sub-type badge */}
          <div style={{
            position: 'absolute', top: '10px', left: '10px',
            background: `${color}22`,
            border: `1px solid ${color}55`,
            borderRadius: '20px',
            padding: '3px 10px',
            display: 'flex', alignItems: 'center', gap: '5px',
          }}>
            <span style={{ fontSize: '12px' }}>{filter.emoji}</span>
            <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', fontWeight: 700, color }}>
              {filter.label}
            </span>
          </div>
        </div>
      )}

      <div style={{ padding: '14px 16px' }}>
        {/* No image — inline badge */}
        {post.images.length === 0 && (
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '5px',
            background: `${color}18`, border: `1px solid ${color}44`,
            borderRadius: '20px', padding: '2px 10px', marginBottom: '8px',
          }}>
            <span style={{ fontSize: '11px' }}>{filter.emoji}</span>
            <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', fontWeight: 700, color }}>
              {filter.label}
            </span>
          </div>
        )}

        {/* Title */}
        <div style={{
          fontFamily: 'Syne, sans-serif', fontWeight: 700,
          fontSize: '15px', color: '#F0F6FC', marginBottom: '4px',
          lineHeight: 1.3,
        }}>
          {post.title}
        </div>

        {/* Price */}
        <div style={{
          fontFamily: 'Syne, sans-serif', fontWeight: 800,
          fontSize: '17px', color, marginBottom: '6px',
        }}>
          {formatPrice(post)}
        </div>

        {/* Description */}
        {post.description && (
          <div style={{
            fontFamily: 'DM Sans, sans-serif', fontSize: '13px',
            color: 'rgba(255,255,255,0.52)', lineHeight: 1.5,
            marginBottom: '10px',
            display: '-webkit-box', WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical', overflow: 'hidden',
          } as React.CSSProperties}>
            {post.description}
          </div>
        )}

        {/* Meta row */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '12px',
          marginBottom: '12px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <MapPin size={11} color="rgba(255,255,255,0.3)" />
            <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.38)' }}>
              {post.neighbourhood}
            </span>
          </div>
          <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.25)' }}>
            {timeAgo(post.createdAt)}
          </span>
        </div>

        {/* WhatsApp CTA */}
        {post.contactWhatsapp && (
          <button
            onClick={openWhatsApp}
            style={{
              width: '100%', padding: '11px',
              borderRadius: '10px',
              background: 'rgba(37,211,102,0.1)',
              border: '1px solid rgba(37,211,102,0.25)',
              color: '#25D366',
              fontFamily: 'DM Sans, sans-serif', fontWeight: 700, fontSize: '13px',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
              WebkitTapHighlightColor: 'transparent',
            } as React.CSSProperties}
          >
            <MessageCircle size={15} />
            Message on WhatsApp
          </button>
        )}
      </div>
    </div>
  );
}

// ── Seed housing listings (display-only — never saved to Supabase) ────────────

interface SeedHousing {
  id: string; subType: SubType; title: string;
  price: string; neighbourhood: string; description: string; time: string;
}

const SEED_HOUSING: SeedHousing[] = [
  {
    id: 'sh1', subType: 'room',
    title: 'Bachelor room to rent — Berea',
    price: 'R2 800/month',
    neighbourhood: 'Berea',
    description: 'Self-contained bachelor room, own entrance. Water and lights included. No smoking.',
    time: '2 hours ago',
  },
  {
    id: 'sh2', subType: 'rental',
    title: '2-bedroom flat available — Berea',
    price: 'R5 500/month',
    neighbourhood: 'Berea',
    description: 'Spacious 2-bedroom flat in a quiet complex. Secure parking, fibre-ready.',
    time: '1 day ago',
  },
  {
    id: 'sh3', subType: 'short_stay',
    title: 'Short-stay room — R350 per night',
    price: 'R350/night',
    neighbourhood: 'Berea',
    description: 'Clean room with shared kitchen and bathroom. Ideal for visiting workers.',
    time: '3 days ago',
  },
];

const SUB_COLORS_SEED: Record<SubType, string> = {
  all: '#34D399', room: '#60A5FA', rental: '#34D399', short_stay: '#A78BFA', lodge: '#F59E0B',
};

function SeedHousingCard({ listing }: { listing: SeedHousing }) {
  const color  = SUB_COLORS_SEED[listing.subType];
  const filter = SUB_FILTERS.find(f => f.key === listing.subType)!;
  return (
    <div style={{
      background: 'var(--color-surface)',
      border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: '16px',
      overflow: 'hidden',
      marginBottom: '12px',
    }}>
      <div style={{ padding: '14px 16px' }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '5px',
          background: `${color}18`, border: `1px solid ${color}44`,
          borderRadius: '20px', padding: '2px 10px', marginBottom: '8px',
        }}>
          <span style={{ fontSize: '11px' }}>{filter.emoji}</span>
          <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', fontWeight: 700, color }}>
            {filter.label}
          </span>
        </div>

        <div style={{
          fontFamily: 'Syne, sans-serif', fontWeight: 700,
          fontSize: '15px', color: '#F0F6FC', marginBottom: '4px', lineHeight: 1.3,
        }}>
          {listing.title}
        </div>

        <div style={{
          fontFamily: 'Syne, sans-serif', fontWeight: 800,
          fontSize: '17px', color, marginBottom: '6px',
        }}>
          {listing.price}
        </div>

        <div style={{
          fontFamily: 'DM Sans, sans-serif', fontSize: '13px',
          color: 'rgba(255,255,255,0.52)', lineHeight: 1.5,
          marginBottom: '10px',
        }}>
          {listing.description}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <MapPin size={11} color="rgba(255,255,255,0.3)" />
            <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.38)' }}>
              {listing.neighbourhood}
            </span>
            <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.25)', marginLeft: '4px' }}>
              {listing.time}
            </span>
          </div>
          <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '10px', color: 'rgba(255,255,255,0.18)' }}>
            local example
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function HousingSkeleton() {
  return (
    <div style={{ background: 'var(--color-surface)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px', marginBottom: '12px', overflow: 'hidden' }}>
      <div style={{ height: '160px', background: 'rgba(255,255,255,0.04)', animation: 'pulse 1.5s ease-in-out infinite' }} />
      <div style={{ padding: '14px 16px' }}>
        <div style={{ height: '16px', width: '70%', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', marginBottom: '8px' }} />
        <div style={{ height: '20px', width: '40%', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', marginBottom: '8px' }} />
        <div style={{ height: '12px', width: '90%', background: 'rgba(255,255,255,0.04)', borderRadius: '6px' }} />
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function HousingPage() {
  const navigate = useNavigate();
  const { displaySuburb, displayCity } = useNeighbourhood();

  const [posts,    setPosts]    = useState<BoardPost[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [subFilter, setSubFilter] = useState<SubType>('all');

  const suburb = displaySuburb || '';
  const city   = displayCity   || '';

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const result = await getBoardPosts(suburb, city, 'accommodation');
      if (!cancelled) {
        setPosts(result.posts);
        setExpanded(result.expanded);
        setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [suburb, city]);

  const filtered = useMemo(() => {
    if (subFilter === 'all') return posts;
    return posts.filter(p => detectSubType(p) === subFilter);
  }, [posts, subFilter]);

  const areaLabel = suburb || city || 'your area';

  return (
    <div style={{ padding: '0 0 calc(80px + env(safe-area-inset-bottom, 0px))' }}>

      {/* ── Header ── */}
      <div style={{
        padding: '16px 16px 0',
        display: 'flex', alignItems: 'center', gap: '10px',
        marginBottom: '12px',
      }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            width: '36px', height: '36px', borderRadius: '50%',
            background: 'rgba(255,255,255,0.06)', border: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', flexShrink: 0,
          }}
        >
          <ArrowLeft size={18} color="rgba(255,255,255,0.7)" />
        </button>
        <div>
          <h1 style={{
            fontFamily: 'Syne, sans-serif', fontWeight: 800,
            fontSize: '20px', color: '#F0F6FC', margin: 0,
          }}>
            Housing &amp; Rooms
          </h1>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px',
          }}>
            <MapPin size={11} color="#34D399" />
            <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: '#34D399' }}>
              {areaLabel}{expanded ? ' (area expanded)' : ''}
            </span>
          </div>
        </div>
      </div>

      {/* ── Sub-type filter ── */}
      <div style={{
        display: 'flex', gap: '8px',
        overflowX: 'auto', padding: '0 16px 16px',
        scrollbarWidth: 'none',
        WebkitOverflowScrolling: 'touch',
      } as React.CSSProperties}>
        {SUB_FILTERS.map(f => {
          const active = subFilter === f.key;
          return (
            <button
              key={f.key}
              onClick={() => setSubFilter(f.key)}
              style={{
                display: 'flex', alignItems: 'center', gap: '5px',
                padding: '7px 14px', borderRadius: '20px', flexShrink: 0,
                background: active ? 'rgba(52,211,153,0.15)' : 'rgba(255,255,255,0.05)',
                border: `1px solid ${active ? '#34D399' : 'rgba(255,255,255,0.08)'}`,
                cursor: 'pointer',
                fontFamily: 'DM Sans, sans-serif', fontWeight: active ? 700 : 500,
                fontSize: '13px', color: active ? '#34D399' : 'rgba(255,255,255,0.5)',
                transition: 'all 0.15s',
                WebkitTapHighlightColor: 'transparent',
              } as React.CSSProperties}
            >
              <span>{f.emoji}</span>
              {f.label}
            </button>
          );
        })}
      </div>

      {/* ── List ── */}
      <div style={{ padding: '0 16px' }}>
        {loading ? (
          <>
            <HousingSkeleton />
            <HousingSkeleton />
            <HousingSkeleton />
          </>
        ) : filtered.length === 0 ? (
          <div>
            {/* Starter listings so the page never looks empty */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
              <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Local examples
              </span>
              <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.06)' }} />
            </div>
            {SEED_HOUSING
              .filter(l => subFilter === 'all' || l.subType === subFilter)
              .map(l => <SeedHousingCard key={l.id} listing={l} />)
            }
            {/* Post CTA */}
            <button
              onClick={() => navigate('/board/new?cat=accommodation')}
              style={{
                width: '100%', marginTop: '4px',
                border: '1px dashed rgba(52,211,153,0.25)',
                borderRadius: '14px', padding: '14px',
                background: 'transparent', cursor: 'pointer',
                fontFamily: 'DM Sans, sans-serif', fontSize: '13px', fontWeight: 600,
                color: 'rgba(52,211,153,0.7)',
                WebkitTapHighlightColor: 'transparent',
              } as React.CSSProperties}
            >
              + Post a room or rental in {areaLabel}
            </button>
          </div>
        ) : (
          <>
            {filtered.map(post => <HousingCard key={post.id} post={post} />)}
            <div style={{
              textAlign: 'center', padding: '8px 0 16px',
              fontFamily: 'DM Sans, sans-serif', fontSize: '12px',
              color: 'rgba(255,255,255,0.25)',
            }}>
              {filtered.length} listing{filtered.length === 1 ? '' : 's'} in {areaLabel}
            </div>
          </>
        )}
      </div>

      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }`}</style>
    </div>
  );
}
