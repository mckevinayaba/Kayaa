import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, AlertTriangle, X, MessageCircle, ChevronRight } from 'lucide-react';
import {
  getBoardPosts,
  updateBoardPostStatus,
  type BoardPost,
  type BoardCategory,
} from '../lib/api';
import { getInteractiveUserId } from '../lib/api';
import { useCountry } from '../contexts/CountryContext';

// ─── Category config ──────────────────────────────────────────────────────────

export const BOARD_CATEGORIES: { key: BoardCategory; label: string; emoji: string; color: string }[] = [
  { key: 'for_sale',       label: 'For Sale',      emoji: '🛍️',  color: '#F5A623' },
  { key: 'free',           label: 'Free',          emoji: '🎁',  color: '#39D98A' },
  { key: 'services',       label: 'Services',      emoji: '🔧',  color: '#60A5FA' },
  { key: 'jobs',           label: 'Jobs',          emoji: '💼',  color: '#A78BFA' },
  { key: 'lost_found',     label: 'Lost & Found',  emoji: '🔍',  color: '#F472B6' },
  { key: 'announcements',  label: 'Announcements', emoji: '📢',  color: '#34D399' },
  { key: 'ask',            label: 'Ask',           emoji: '❓',  color: '#94A3B8' },
  { key: 'events',         label: 'Events',        emoji: '🎉',  color: '#FB923C' },
  { key: 'accommodation',  label: 'Accommodation', emoji: '🏠',  color: '#60A5FA' },
  { key: 'safety',         label: 'Safety',        emoji: '🚨',  color: '#EF4444' },
];

function getCategoryConfig(key: string) {
  return BOARD_CATEGORIES.find(c => c.key === key) ?? {
    key: 'ask', label: key, emoji: '📌', color: '#94A3B8',
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatAge(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function isSafetyFresh(post: BoardPost): boolean {
  return post.category === 'safety' &&
    (Date.now() - new Date(post.createdAt).getTime()) < 6 * 3600000;
}

function getMineIds(): string[] {
  try { return JSON.parse(localStorage.getItem('kayaa_board_mine') ?? '[]'); }
  catch { return []; }
}

// ─── Post card ────────────────────────────────────────────────────────────────

function PostCard({
  post,
  isMine,
  onMarkTaken,
  onMarkResolved,
}: {
  post: BoardPost;
  isMine: boolean;
  onMarkTaken: (id: string) => void;
  onMarkResolved: (id: string) => void;
}) {
  const navigate = useNavigate();
  const cat = getCategoryConfig(post.category);
  const fresh = isSafetyFresh(post);
  const safetyStyle = fresh
    ? { borderLeft: '3px solid #EF4444', background: 'rgba(239,68,68,0.06)' }
    : {};

  return (
    <div
      onClick={() => navigate(`/board/${post.id}`)}
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: '14px',
        padding: '14px',
        cursor: 'pointer',
        position: 'relative',
        ...safetyStyle,
      }}
    >
      {/* Category badge + age */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <span style={{
          fontSize: '11px', fontWeight: 700,
          color: fresh ? '#EF4444' : cat.color,
          background: fresh ? 'rgba(239,68,68,0.12)' : `${cat.color}18`,
          padding: '2px 8px', borderRadius: '20px',
        }}>
          {cat.emoji} {cat.label}
        </span>
        <span style={{ fontSize: '11px', color: 'var(--color-muted)', fontFamily: 'DM Sans, sans-serif' }}>
          {formatAge(post.createdAt)}
        </span>
      </div>

      {/* Title */}
      <div style={{
        fontFamily: 'Syne, sans-serif', fontWeight: 700,
        fontSize: '14px', color: 'var(--color-text)',
        marginBottom: post.description ? '4px' : '8px',
        lineHeight: 1.35,
      }}>
        {post.title}
      </div>

      {/* Description preview */}
      {post.description && (
        <p style={{
          fontSize: '13px', color: 'var(--color-muted)',
          margin: '0 0 10px', lineHeight: 1.55,
          fontFamily: 'DM Sans, sans-serif',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        } as React.CSSProperties}>
          {post.description}
        </p>
      )}

      {/* Price */}
      {post.price != null && (
        <div style={{
          fontSize: '15px', fontWeight: 700,
          color: '#39D98A', marginBottom: '10px',
          fontFamily: 'DM Sans, sans-serif',
        }}>
          R{post.price.toLocaleString()}
        </div>
      )}

      {/* Footer row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '11px', color: 'var(--color-muted)', fontFamily: 'DM Sans, sans-serif' }}>
            📍 {post.neighbourhood}
          </span>
          {post.images.length > 0 && (
            <span style={{ fontSize: '11px', color: 'var(--color-muted)' }}>· 📷 {post.images.length}</span>
          )}
        </div>

        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }} onClick={e => e.stopPropagation()}>
          {/* WhatsApp contact button */}
          {post.contactWhatsapp && (
            <a
              href={`https://wa.me/${post.contactWhatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(`Hi, I saw your post "${post.title}" on the Kayaa board`)}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex', alignItems: 'center', gap: '4px',
                background: '#25D366', color: '#000',
                borderRadius: '20px', padding: '5px 10px',
                fontSize: '11px', fontWeight: 700,
                fontFamily: 'DM Sans, sans-serif', textDecoration: 'none',
              }}
            >
              <MessageCircle size={12} /> WhatsApp
            </a>
          )}

          {/* Owner quick-actions */}
          {isMine && post.status === 'active' && (
            <>
              {post.category === 'for_sale' || post.category === 'free' || post.category === 'accommodation' ? (
                <button
                  onClick={() => onMarkTaken(post.id)}
                  style={{
                    background: 'var(--color-border)', color: 'var(--color-muted)',
                    border: 'none', borderRadius: '20px', padding: '5px 10px',
                    fontSize: '11px', fontWeight: 600, cursor: 'pointer',
                    fontFamily: 'DM Sans, sans-serif',
                  }}
                >
                  Mark taken
                </button>
              ) : (
                <button
                  onClick={() => onMarkResolved(post.id)}
                  style={{
                    background: 'var(--color-border)', color: 'var(--color-muted)',
                    border: 'none', borderRadius: '20px', padding: '5px 10px',
                    fontSize: '11px', fontWeight: 600, cursor: 'pointer',
                    fontFamily: 'DM Sans, sans-serif',
                  }}
                >
                  Resolve
                </button>
              )}
            </>
          )}

          <ChevronRight size={14} color="var(--color-muted)" />
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function BoardPage() {
  const navigate = useNavigate();
  const suburb  = localStorage.getItem('kayaa_suburb') ?? '';
  const city    = localStorage.getItem('kayaa_city')   ?? 'Johannesburg';
  const display = suburb || city;
  const { selectedCountry } = useCountry();

  const [posts,      setPosts]      = useState<BoardPost[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [expanded,   setExpanded]   = useState(false);
  const [activeTab,  setActiveTab]  = useState<string>('all');
  const [mineIds,    setMineIds]    = useState<string[]>([]);
  const [safetyDismissed, setSafetyDismissed] = useState(false);
  const [userId, setUserId] = useState('');

  useEffect(() => {
    getInteractiveUserId().then(setUserId);
    setMineIds(getMineIds());
  }, []);

  useEffect(() => {
    setLoading(true);
    getBoardPosts(suburb, city, activeTab === 'all' ? undefined : activeTab, selectedCountry.code).then(({ posts: p, expanded: e }) => {
      setPosts(p);
      setExpanded(e);
      setLoading(false);
    });
  }, [suburb, city, activeTab, selectedCountry.code]);

  const freshSafetyPosts = posts.filter(isSafetyFresh);
  const showSafetyBanner = freshSafetyPosts.length > 0 && !safetyDismissed;

  async function handleMarkTaken(id: string) {
    setPosts(prev => prev.filter(p => p.id !== id));
    await updateBoardPostStatus(id, 'taken', userId);
  }

  async function handleMarkResolved(id: string) {
    setPosts(prev => prev.filter(p => p.id !== id));
    await updateBoardPostStatus(id, 'resolved', userId);
  }

  return (
    <div style={{ paddingBottom: '100px', minHeight: '100vh', background: 'var(--color-bg)' }}>

      {/* Safety banner */}
      {showSafetyBanner && (
        <div style={{
          background: 'rgba(239,68,68,0.12)',
          borderBottom: '1px solid rgba(239,68,68,0.3)',
          padding: '12px 16px',
          display: 'flex', alignItems: 'flex-start', gap: '10px',
        }}>
          <AlertTriangle size={18} color="#EF4444" style={{ flexShrink: 0, marginTop: '1px' }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#EF4444', fontFamily: 'DM Sans, sans-serif' }}>
              {freshSafetyPosts.length} safety alert{freshSafetyPosts.length > 1 ? 's' : ''} in your area
            </div>
            <div style={{ fontSize: '12px', color: 'rgba(239,68,68,0.7)', fontFamily: 'DM Sans, sans-serif', marginTop: '2px' }}>
              {freshSafetyPosts[0].title}
            </div>
          </div>
          <button
            onClick={() => setSafetyDismissed(true)}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '2px', flexShrink: 0 }}
          >
            <X size={16} color="#EF4444" />
          </button>
        </div>
      )}

      {/* Header */}
      <div style={{ padding: '16px 16px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{
            fontFamily: 'Syne, sans-serif', fontWeight: 800,
            fontSize: '22px', color: 'var(--color-text)', margin: 0,
          }}>
            The Board
          </h1>
          <p style={{
            fontSize: '13px', color: 'var(--color-muted)',
            margin: '3px 0 0', fontFamily: 'DM Sans, sans-serif',
          }}>
            {display} · {loading ? '…' : `${posts.length} active posts`}
            {expanded && !loading && (
              <span style={{ color: '#F5A623', marginLeft: '6px' }}>· expanded area</span>
            )}
          </p>
        </div>
        <button
          onClick={() => navigate('/board/mine')}
          style={{
            background: 'transparent',
            border: '1px solid var(--color-border)',
            borderRadius: '20px', padding: '6px 12px',
            fontSize: '12px', fontWeight: 600,
            color: 'var(--color-muted)', cursor: 'pointer',
            fontFamily: 'DM Sans, sans-serif',
          }}
        >
          My posts
        </button>
      </div>

      {/* Post Your Skills banner */}
      <div
        onClick={() => navigate('/board/new?cat=services')}
        style={{
          margin: '14px 16px 0',
          background: 'linear-gradient(135deg, rgba(96,165,250,0.12) 0%, rgba(57,217,138,0.08) 100%)',
          border: '1px solid rgba(96,165,250,0.25)',
          borderRadius: '14px',
          padding: '14px 16px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
        }}
      >
        <div style={{
          width: '40px', height: '40px', borderRadius: '12px', flexShrink: 0,
          background: 'rgba(96,165,250,0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '20px',
        }}>
          🔧
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '14px', color: 'var(--color-text)', marginBottom: '2px' }}>
            Post Your Skills
          </div>
          <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: 'var(--color-muted)', lineHeight: 1.4 }}>
            Barber, mechanic, tutor, cleaner, DJ — let your neighbourhood find you
          </div>
        </div>
        <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.3)', flexShrink: 0 }}>→</span>
      </div>

      {/* Category filter strip */}
      <div style={{
        display: 'flex', gap: '6px',
        overflowX: 'auto', scrollbarWidth: 'none',
        padding: '14px 16px 0',
        WebkitOverflowScrolling: 'touch',
      } as React.CSSProperties}>
        {/* All pill */}
        <button
          onClick={() => setActiveTab('all')}
          style={{
            flexShrink: 0, padding: '6px 14px',
            borderRadius: '20px',
            border: activeTab === 'all' ? 'none' : '1px solid var(--color-border)',
            background: activeTab === 'all' ? '#39D98A' : 'var(--color-surface)',
            color: activeTab === 'all' ? '#000' : 'var(--color-muted)',
            fontSize: '12px', fontWeight: 700,
            fontFamily: 'DM Sans, sans-serif', cursor: 'pointer',
          }}
        >
          All
        </button>

        {BOARD_CATEGORIES.map(cat => {
          const active = activeTab === cat.key;
          const isSafety = cat.key === 'safety';
          return (
            <button
              key={cat.key}
              onClick={() => setActiveTab(cat.key)}
              style={{
                flexShrink: 0, padding: '6px 12px',
                borderRadius: '20px',
                border: active ? 'none' : `1px solid ${isSafety ? 'rgba(239,68,68,0.3)' : 'var(--color-border)'}`,
                background: active
                  ? (isSafety ? '#EF4444' : cat.color)
                  : (isSafety ? 'rgba(239,68,68,0.08)' : 'var(--color-surface)'),
                color: active ? '#000' : (isSafety ? '#EF4444' : 'var(--color-muted)'),
                fontSize: '12px', fontWeight: 600,
                fontFamily: 'DM Sans, sans-serif', cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {cat.emoji} {cat.label}
            </button>
          );
        })}
      </div>

      {/* Feed */}
      <div style={{ padding: '14px 16px 0' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--color-muted)', fontFamily: 'DM Sans, sans-serif', fontSize: '14px' }}>
            Loading…
          </div>
        ) : posts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <div style={{ fontSize: '36px', marginBottom: '12px' }}>
              {activeTab === 'all' ? '📌' : getCategoryConfig(activeTab).emoji}
            </div>
            <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '16px', color: 'var(--color-text)', marginBottom: '6px' }}>
              Nothing here yet
            </div>
            <div style={{ fontSize: '13px', color: 'var(--color-muted)', fontFamily: 'DM Sans, sans-serif' }}>
              Be the first to post in {display}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {posts.map(post => (
              <PostCard
                key={post.id}
                post={post}
                isMine={mineIds.includes(post.id) || post.userId === userId}
                onMarkTaken={handleMarkTaken}
                onMarkResolved={handleMarkResolved}
              />
            ))}
          </div>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => navigate('/board/new')}
        style={{
          position: 'fixed',
          bottom: '80px',
          right: '20px',
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: '#39D98A',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 20px rgba(57,217,138,0.4)',
          zIndex: 50,
        }}
      >
        <Plus size={24} color="#000" strokeWidth={2.5} />
      </button>
    </div>
  );
}
