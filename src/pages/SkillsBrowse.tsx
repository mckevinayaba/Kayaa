import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, MapPin } from 'lucide-react';
import { getBoardPosts, type BoardPost } from '../lib/api';
import { useCountry } from '../contexts/CountryContext';
import useLocation from '../hooks/useLocation';

// ─── Category config ──────────────────────────────────────────────────────────

const BROWSE_CATEGORIES: { key: string; label: string; emoji: string; keywords: string[] }[] = [
  { key: 'all',          label: 'All',             emoji: '',   keywords: [] },
  { key: 'home',         label: 'Home Services',   emoji: '🏠', keywords: ['domestic', 'cleaner', 'clean house', 'housekeep', 'plumb', 'paint', 'build', 'tile', 'plaster', 'roof', 'electric', 'geyser', 'wiring'] },
  { key: 'beauty',       label: 'Beauty & Care',   emoji: '✂️', keywords: ['barber', 'fade', 'lineup', 'hair', 'braid', 'weave', 'cornrow', 'salon', 'nail', 'lash'] },
  { key: 'repair',       label: 'Repair & Fix',    emoji: '🔧', keywords: ['mechanic', 'motor', 'car repair', 'phone repair', 'laptop', 'tech', 'computer'] },
  { key: 'education',    label: 'Education',       emoji: '📚', keywords: ['tutor', 'teach', 'lesson', 'maths', 'science', 'grade'] },
  { key: 'catering',     label: 'Catering',        emoji: '🍳', keywords: ['cater', 'cook', 'food', 'chef', 'pap', 'braai', 'event food'] },
  { key: 'transport',    label: 'Transport',       emoji: '🚗', keywords: ['driver', 'transport', 'delivery', 'courier', 'lift'] },
  { key: 'entertainment',label: 'Entertainment',   emoji: '🎵', keywords: ['dj', 'music', 'sound system', 'mc', 'entertainment'] },
  { key: 'carwash',      label: 'Car Wash',        emoji: '🚿', keywords: ['car wash', 'wash', 'mobile wash', 'detail'] },
  { key: 'tech',         label: 'Tech & IT',       emoji: '💻', keywords: ['tech', 'it', 'software', 'website', 'app', 'computer', 'laptop'] },
];

function matchesCategory(post: BoardPost, key: string): boolean {
  if (key === 'all') return true;
  const cat = BROWSE_CATEGORIES.find(c => c.key === key);
  if (!cat) return true;
  const text = `${post.title} ${post.description ?? ''}`.toLowerCase();
  return cat.keywords.some(k => text.includes(k));
}

function skillEmoji(post: BoardPost): string {
  const text = `${post.title} ${post.description ?? ''}`.toLowerCase();
  for (const c of BROWSE_CATEGORIES.slice(1)) {
    if (c.keywords.some(k => text.includes(k))) return c.emoji;
  }
  return '🔧';
}

function initials(title: string): string {
  return title.trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('');
}

// ─── Skill card ───────────────────────────────────────────────────────────────

function SkillCard({ post }: { post: BoardPost }) {
  const navigate = useNavigate();
  const emoji = skillEmoji(post);
  const cat   = BROWSE_CATEGORIES.slice(1).find(c => c.keywords.some(k =>
    `${post.title} ${post.description ?? ''}`.toLowerCase().includes(k)
  ));

  return (
    <div
      onClick={() => navigate(`/skills/${post.id}`)}
      style={{
        background: '#161B22',
        border: '1px solid #21262D',
        borderRadius: '14px',
        padding: '16px',
        cursor: 'pointer',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      {/* Category badge */}
      {cat && (
        <div style={{
          display: 'inline-block',
          fontSize: '11px', fontWeight: 700,
          color: '#A78BFA',
          background: 'rgba(167,139,250,0.15)',
          padding: '2px 8px', borderRadius: '20px',
          marginBottom: '8px',
          fontFamily: 'DM Sans, sans-serif',
        }}>
          {cat.emoji} {cat.label}
        </div>
      )}

      {/* Title */}
      <div style={{
        fontFamily: 'Syne, sans-serif', fontWeight: 700,
        fontSize: '15px', color: '#F0F6FC',
        marginBottom: '4px', lineHeight: 1.3,
      }}>
        {post.title.replace(/^[^\w]*/, '').trim()}
      </div>

      {/* Description */}
      {post.description && (
        <p style={{
          fontFamily: 'DM Sans, sans-serif', fontSize: '13px',
          color: 'rgba(240,246,252,0.6)', lineHeight: 1.55,
          margin: '0 0 12px',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        } as React.CSSProperties}>
          {post.description}
        </p>
      )}

      {/* Provider row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
          {/* Avatar bubble */}
          <div style={{
            width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0,
            background: 'linear-gradient(135deg, #39D98A, #60A5FA)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '11px', fontWeight: 800, color: '#0D1117',
          }}>
            {emoji || initials(post.title)}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{
              fontFamily: 'DM Sans, sans-serif', fontSize: '13px',
              color: '#F0F6FC', fontWeight: 600,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {post.neighbourhood}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '3px', marginTop: '1px' }}>
              <MapPin size={10} color="rgba(255,255,255,0.35)" />
              <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', fontFamily: 'DM Sans, sans-serif' }}>
                {post.neighbourhood}
              </span>
            </div>
          </div>
        </div>

        {post.price != null && (
          <div style={{
            fontFamily: 'DM Sans, sans-serif', fontSize: '15px',
            fontWeight: 800, color: '#39D98A', flexShrink: 0,
          }}>
            R{post.price.toLocaleString()}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkillSkeleton() {
  return (
    <div style={{ background: '#161B22', border: '1px solid #21262D', borderRadius: '14px', padding: '16px' }}>
      <div style={{ height: '20px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', width: '35%', marginBottom: '8px' }} />
      <div style={{ height: '16px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', width: '70%', marginBottom: '6px' }} />
      <div style={{ height: '13px', background: 'rgba(255,255,255,0.04)', borderRadius: '4px', width: '90%', marginBottom: '4px' }} />
      <div style={{ height: '13px', background: 'rgba(255,255,255,0.04)', borderRadius: '4px', width: '60%', marginBottom: '14px' }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
        <div style={{ flex: 1 }}>
          <div style={{ height: '12px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', width: '50%', marginBottom: '4px' }} />
          <div style={{ height: '10px', background: 'rgba(255,255,255,0.04)', borderRadius: '4px', width: '35%' }} />
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SkillsBrowse() {
  const navigate = useNavigate();
  const { selectedCountry } = useCountry();
  const { suburb, city } = useLocation();

  const [posts,    setPosts]    = useState<BoardPost[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');
  const [category, setCategory] = useState('all');

  useEffect(() => {
    setLoading(true);
    getBoardPosts(suburb, city, 'services', selectedCountry.code).then(({ posts: p }) => {
      setPosts(p);
      setLoading(false);
    });
  }, [suburb, city, selectedCountry.code]);

  const visible = useMemo(() => {
    let result = posts.filter(p => matchesCategory(p, category));
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(p =>
        p.title.toLowerCase().includes(q) ||
        (p.description ?? '').toLowerCase().includes(q) ||
        p.neighbourhood.toLowerCase().includes(q)
      );
    }
    return result;
  }, [posts, category, search]);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', paddingBottom: '140px' }}>

      {/* Sticky header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 40,
        background: 'rgba(13,17,23,0.95)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--color-border)',
        padding: '14px 16px 12px',
      } as React.CSSProperties}>

        {/* Back + title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              background: 'var(--color-surface)', border: '1px solid var(--color-border)',
              borderRadius: '10px', width: '36px', height: '36px', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <ArrowLeft size={18} color="var(--color-text)" />
          </button>
          <div>
            <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '20px', color: 'var(--color-text)', margin: 0, lineHeight: 1 }}>
              Skills & Services
            </h1>
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: 'var(--color-muted)', margin: '3px 0 0' }}>
              {loading ? 'Loading…' : `${visible.length} available near ${suburb || city}`}
            </p>
          </div>
        </div>

        {/* Search */}
        <div style={{ position: 'relative', marginBottom: '10px' }}>
          <Search size={15} color="var(--color-muted)" style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search skills…"
            style={{
              width: '100%', boxSizing: 'border-box',
              background: 'var(--color-surface)', border: '1px solid var(--color-border)',
              borderRadius: '12px', padding: '10px 14px 10px 36px',
              color: 'var(--color-text)', fontSize: '14px', fontFamily: 'DM Sans, sans-serif',
              outline: 'none',
            }}
          />
        </div>

        {/* Category chips */}
        <div style={{
          display: 'flex', gap: '6px',
          overflowX: 'auto', scrollbarWidth: 'none',
          WebkitOverflowScrolling: 'touch',
        } as React.CSSProperties}>
          {BROWSE_CATEGORIES.map(c => {
            const active = category === c.key;
            return (
              <button
                key={c.key}
                onClick={() => setCategory(c.key)}
                style={{
                  flexShrink: 0,
                  padding: '5px 12px', borderRadius: '20px',
                  border: active ? 'none' : '1px solid var(--color-border)',
                  background: active ? '#39D98A' : 'var(--color-surface)',
                  color: active ? '#000' : 'var(--color-muted)',
                  fontSize: '12px', fontWeight: 700,
                  fontFamily: 'DM Sans, sans-serif', cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                {c.emoji ? `${c.emoji} ` : ''}{c.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Skills list */}
      <div style={{ padding: '14px 16px 0', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {loading ? (
          [1, 2, 3, 4].map(i => <SkillSkeleton key={i} />)
        ) : visible.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>🔍</div>
            <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '16px', color: 'var(--color-text)', marginBottom: '8px' }}>
              {search ? 'No results found' : 'No skills listed yet'}
            </div>
            <div style={{ fontSize: '13px', color: 'var(--color-muted)', fontFamily: 'DM Sans, sans-serif', marginBottom: '20px' }}>
              {search ? 'Try a different search term' : `Be the first to post your skill in ${suburb || city}`}
            </div>
            {!search && (
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
            )}
          </div>
        ) : (
          visible.map(post => <SkillCard key={post.id} post={post} />)
        )}
      </div>

      {/* Fixed "Post Your Skill" CTA */}
      <div style={{
        position: 'fixed', bottom: '70px', left: 0, right: 0,
        padding: '12px 16px',
        background: 'linear-gradient(to top, var(--color-bg) 60%, transparent)',
        zIndex: 30,
      }}>
        <button
          onClick={() => navigate('/skills/new')}
          style={{
            width: '100%',
            padding: '15px',
            background: '#39D98A',
            border: 'none',
            borderRadius: '14px',
            fontFamily: 'Syne, sans-serif', fontWeight: 800,
            fontSize: '15px', color: '#0D1117',
            cursor: 'pointer',
            boxShadow: '0 6px 24px rgba(57,217,138,0.35)',
            letterSpacing: '0.01em',
          }}
        >
          Post Your Skill
        </button>
      </div>
    </div>
  );
}
