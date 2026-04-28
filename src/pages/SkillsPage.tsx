import { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Search, PenSquare, ChevronRight } from 'lucide-react';
import { getBoardPosts, type BoardPost } from '../lib/api';
import { useCountry } from '../contexts/CountryContext';

// ─── Skill categories (filter chips) ─────────────────────────────────────────

const SKILL_FILTERS: { key: string; emoji: string; label: string; keywords: string[] }[] = [
  { key: 'all',          emoji: '',   label: 'All',          keywords: [] },
  { key: 'barber',       emoji: '💈', label: 'Barber',       keywords: ['barber', 'fade', 'lineup', 'cut hair', 'hair cut'] },
  { key: 'electric',     emoji: '🔌', label: 'Electrician',  keywords: ['electric', 'geyser', 'wiring', 'power'] },
  { key: 'domestic',     emoji: '🧹', label: 'Domestic',     keywords: ['domestic', 'cleaner', 'clean house', 'housekeep'] },
  { key: 'mechanic',     emoji: '🔧', label: 'Mechanic',     keywords: ['mechanic', 'motor', 'car repair', 'service car'] },
  { key: 'hair',         emoji: '✂️', label: 'Hairdresser',  keywords: ['hair', 'braid', 'braids', 'weave', 'cornrow', 'natural hair', 'salon'] },
  { key: 'tailor',       emoji: '👗', label: 'Tailor',       keywords: ['tailor', 'sewing', 'dress', 'alteration', 'stitch'] },
  { key: 'tutor',        emoji: '📚', label: 'Tutor',        keywords: ['tutor', 'teach', 'lesson', 'maths', 'science', 'grade'] },
  { key: 'catering',     emoji: '🍳', label: 'Caterer',      keywords: ['cater', 'cook', 'food', 'chef', 'event food', 'pap', 'braai'] },
  { key: 'dj',           emoji: '🎵', label: 'DJ',           keywords: ['dj', 'music', 'sound system', 'entertainment', 'mc'] },
  { key: 'driver',       emoji: '🚗', label: 'Driver',       keywords: ['driver', 'transport', 'delivery', 'courier', 'lift'] },
  { key: 'construction', emoji: '🏗️', label: 'Construction', keywords: ['plumb', 'paint', 'build', 'construct', 'tile', 'plaster', 'roof'] },
  { key: 'tech',         emoji: '💻', label: 'Tech',         keywords: ['tech', 'computer', 'laptop', 'phone repair', 'it', 'software'] },
  { key: 'carwash',      emoji: '🚿', label: 'Car Wash',     keywords: ['car wash', 'wash', 'mobile wash', 'detail'] },
];

function matchesFilter(post: BoardPost, filterKey: string): boolean {
  if (filterKey === 'all') return true;
  const filter = SKILL_FILTERS.find(f => f.key === filterKey);
  if (!filter) return true;
  const text = `${post.title} ${post.description ?? ''}`.toLowerCase();
  return filter.keywords.some(k => text.includes(k));
}

// ─── Skill card ───────────────────────────────────────────────────────────────

function skillEmoji(post: BoardPost): string {
  const text = `${post.title} ${post.description ?? ''}`.toLowerCase();
  for (const f of SKILL_FILTERS.slice(1)) {
    if (f.keywords.some(k => text.includes(k))) return f.emoji;
  }
  return '🔧';
}

function formatRate(post: BoardPost): string | null {
  if (!post.price) return null;
  const title = post.title.toLowerCase();
  if (title.includes('per hour') || title.includes('/hr') || title.includes('hourly')) return `R${post.price}/hr`;
  if (title.includes('per head')) return `R${post.price} per head`;
  return `From R${post.price}`;
}

function SkillCard({ post }: { post: BoardPost }) {
  const rate = formatRate(post);
  const emoji = skillEmoji(post);
  const waText = encodeURIComponent(`Hi, I saw your "${post.title}" listing on kayaa. I'm interested.`);
  const waUrl  = post.contactWhatsapp
    ? `https://wa.me/${post.contactWhatsapp.replace(/\D/g, '')}?text=${waText}`
    : null;

  return (
    <Link
      to={`/skills/${post.id}`}
      style={{ display: 'block', textDecoration: 'none' }}
    >
      <div style={{
        background: '#161B22',
        border: '1px solid #21262D',
        borderLeft: '3px solid #39D98A',
        borderRadius: '10px',
        padding: '16px 20px',
        marginBottom: '12px',
      }}>
        {/* Top row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '8px' }}>
          <span style={{ fontSize: '28px', flexShrink: 0, lineHeight: 1 }}>{emoji}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '15px', color: '#F0F6FC', lineHeight: 1.3, marginBottom: '3px' }}>
              {post.title.replace(/^[^\w]*/, '').trim()}
            </div>
            <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: 'rgba(255,255,255,0.45)' }}>
              📍 {post.neighbourhood}
            </div>
          </div>
          <ChevronRight size={16} color="rgba(255,255,255,0.2)" style={{ flexShrink: 0, marginTop: '2px' }} />
        </div>

        {/* Description */}
        {post.description && (
          <p style={{
            fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: 'rgba(240,246,252,0.85)',
            lineHeight: 1.6, margin: '0 0 12px', padding: 0,
            overflow: 'hidden', display: '-webkit-box',
            WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
          } as React.CSSProperties}>
            {post.description}
          </p>
        )}

        {/* Footer */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
          {rate ? (
            <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', fontWeight: 700, color: '#39D98A' }}>
              {rate}
            </span>
          ) : (
            <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: 'rgba(255,255,255,0.35)' }}>
              Rate on request
            </span>
          )}
          {waUrl ? (
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              style={{
                background: '#25D366', color: '#000',
                textDecoration: 'none', borderRadius: '6px',
                padding: '7px 16px',
                fontFamily: 'DM Sans, sans-serif', fontWeight: 700, fontSize: '12px',
                display: 'inline-flex', alignItems: 'center', gap: '5px', flexShrink: 0,
              }}
            >
              WhatsApp →
            </a>
          ) : (
            <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>
              View →
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkillSkeleton() {
  return (
    <div style={{ background: '#161B22', border: '1px solid #21262D', borderLeft: '3px solid #21262D', borderRadius: '10px', padding: '16px 20px', marginBottom: '12px' }}>
      <div style={{ height: '16px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', width: '60%', marginBottom: '8px' }} />
      <div style={{ height: '12px', background: 'rgba(255,255,255,0.04)', borderRadius: '4px', width: '30%', marginBottom: '12px' }} />
      <div style={{ height: '12px', background: 'rgba(255,255,255,0.04)', borderRadius: '4px', width: '90%', marginBottom: '6px' }} />
      <div style={{ height: '12px', background: 'rgba(255,255,255,0.04)', borderRadius: '4px', width: '75%' }} />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SkillsPage() {
  const navigate = useNavigate();
  const { selectedCountry } = useCountry();

  const suburb = localStorage.getItem('kayaa_suburb') ?? '';
  const city   = localStorage.getItem('kayaa_city')   ?? 'Johannesburg';

  const [posts,   setPosts]   = useState<BoardPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');
  const [filter,  setFilter]  = useState('all');

  useEffect(() => {
    setLoading(true);
    getBoardPosts(suburb, city, 'services', selectedCountry.code).then(({ posts: p }) => {
      setPosts(p);
      setLoading(false);
    });
  }, [suburb, city, selectedCountry.code]);

  const visible = useMemo(() => {
    let result = posts.filter(p => matchesFilter(p, filter));
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(p =>
        p.title.toLowerCase().includes(q) ||
        (p.description ?? '').toLowerCase().includes(q) ||
        p.neighbourhood.toLowerCase().includes(q)
      );
    }
    return result;
  }, [posts, filter, search]);

  return (
    <div style={{ paddingBottom: '120px', minHeight: '100vh', background: 'var(--color-bg)' }}>

      {/* Header */}
      <div style={{ padding: '20px 16px 0' }}>
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '24px', color: 'var(--color-text)', margin: '0 0 4px' }}>
          Skills & Services
        </h1>
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: 'var(--color-muted)', margin: '0 0 16px' }}>
          {loading ? 'Loading…' : `${visible.length} skill${visible.length !== 1 ? 's' : ''} available near you`}
        </p>

        {/* Search */}
        <div style={{ position: 'relative', marginBottom: '14px' }}>
          <Search size={15} color="var(--color-muted)" style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search for a skill or service…"
            style={{
              width: '100%', boxSizing: 'border-box',
              background: 'var(--color-surface)', border: '1px solid var(--color-border)',
              borderRadius: '12px', padding: '11px 14px 11px 36px',
              color: 'var(--color-text)', fontSize: '14px', fontFamily: 'DM Sans, sans-serif',
              outline: 'none',
            }}
          />
        </div>
      </div>

      {/* Filter chips */}
      <div style={{
        display: 'flex', gap: '6px',
        overflowX: 'auto', scrollbarWidth: 'none',
        padding: '0 16px 12px',
        WebkitOverflowScrolling: 'touch',
      } as React.CSSProperties}>
        {SKILL_FILTERS.map(f => {
          const active = filter === f.key;
          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              style={{
                flexShrink: 0,
                padding: '6px 14px', borderRadius: '20px',
                border: active ? 'none' : '1px solid var(--color-border)',
                background: active ? '#39D98A' : 'var(--color-surface)',
                color: active ? '#000' : 'var(--color-muted)',
                fontSize: '12px', fontWeight: 700,
                fontFamily: 'DM Sans, sans-serif', cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {f.emoji ? `${f.emoji} ` : ''}{f.label}
            </button>
          );
        })}
      </div>

      {/* Listings */}
      <div style={{ padding: '0 16px' }}>
        {loading ? (
          [1,2,3,4].map(i => <SkillSkeleton key={i} />)
        ) : visible.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>🔧</div>
            <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '16px', color: 'var(--color-text)', marginBottom: '8px' }}>
              No skills listed yet{filter !== 'all' ? ' in this category' : ''}
            </div>
            <div style={{ fontSize: '13px', color: 'var(--color-muted)', fontFamily: 'DM Sans, sans-serif', marginBottom: '20px' }}>
              Be the first to post your skill in {suburb || city}
            </div>
            <button
              onClick={() => navigate('/skills/new')}
              style={{
                background: '#39D98A', color: '#000', border: 'none', borderRadius: '12px',
                padding: '12px 24px', fontFamily: 'Syne, sans-serif', fontWeight: 700,
                fontSize: '14px', cursor: 'pointer',
              }}
            >
              Post Your Skill
            </button>
          </div>
        ) : (
          visible.map(post => <SkillCard key={post.id} post={post} />)
        )}
      </div>

      {/* FAB — Post Your Skill */}
      <button
        onClick={() => navigate('/skills/new')}
        title="Post your skill"
        style={{
          position: 'fixed', bottom: '80px', right: '16px', zIndex: 50,
          width: '52px', height: '52px', borderRadius: '50%',
          background: '#39D98A', border: 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 20px rgba(57,217,138,0.45)',
          cursor: 'pointer',
          fontSize: '22px',
        }}
      >
        <PenSquare size={22} color="#0D1117" strokeWidth={2.5} />
      </button>
    </div>
  );
}
