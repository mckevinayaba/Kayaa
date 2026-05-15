import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, AlertTriangle, X, MessageCircle, ChevronRight } from 'lucide-react';
import NudgeCard from '../components/NudgeCard';
import {
  getBoardPosts,
  updateBoardPostStatus,
  type BoardPost,
  type BoardCategory,
} from '../lib/api';
import { getInteractiveUserId } from '../lib/api';
import { useCountry } from '../contexts/CountryContext';
import useLocation from '../hooks/useLocation';

// ─── Category config ──────────────────────────────────────────────────────────

export const BOARD_CATEGORIES: { key: BoardCategory; label: string; emoji: string; color: string }[] = [
  // Opportunities — anchored first so they're visible without scrolling
  { key: 'jobs',           label: 'Jobs',           emoji: '💼',  color: '#A78BFA' },
  { key: 'services',       label: 'Services',       emoji: '🔧',  color: '#60A5FA' },
  { key: 'accommodation',  label: 'Housing / Rent', emoji: '🏠',  color: '#34D399' },
  // Classifieds
  { key: 'for_sale',       label: 'For Sale',       emoji: '🛍️',  color: '#F5A623' },
  { key: 'free',           label: 'Free',           emoji: '🎁',  color: '#39D98A' },
  // Community
  { key: 'events',         label: 'Events',         emoji: '🎉',  color: '#FB923C' },
  { key: 'announcements',  label: 'Announcements',  emoji: '📢',  color: '#34D399' },
  { key: 'lost_found',     label: 'Lost & Found',   emoji: '🔍',  color: '#F472B6' },
  { key: 'ask',            label: 'Ask',            emoji: '❓',  color: '#94A3B8' },
  { key: 'safety',         label: 'Safety',         emoji: '🚨',  color: '#EF4444' },
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
          {post.likesCount > 0 && (
            <span style={{ fontSize: '11px', color: 'var(--color-muted)' }}>· ❤️ {post.likesCount}</span>
          )}
          {post.commentsCount > 0 && (
            <span style={{ fontSize: '11px', color: 'var(--color-muted)' }}>· 💬 {post.commentsCount}</span>
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
  const { suburb, city } = useLocation();
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
    <div style={{ paddingBottom: '140px', minHeight: '100vh', background: 'var(--color-bg)' }}>

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
      <div style={{ padding: '16px 16px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
          <h1 style={{
            fontFamily: 'Syne, sans-serif', fontWeight: 800,
            fontSize: '22px', color: 'var(--color-text)', margin: 0,
          }}>
            Board
          </h1>
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

        {/* Board purpose + live count */}
        <div style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: '12px', padding: '12px 14px', marginBottom: '14px',
        }}>
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: 'rgba(255,255,255,0.55)', margin: 0, lineHeight: 1.6 }}>
            Jobs, services, housing and local listings for {display || 'your neighbourhood'}.
          </p>
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: 'rgba(255,255,255,0.3)', margin: '6px 0 0' }}>
            {loading ? '…' : `${posts.length} active post${posts.length !== 1 ? 's' : ''}`}
            {expanded && !loading && (
              <span style={{ color: '#F5A623' }}> · showing nearby area</span>
            )}
          </p>
        </div>
      </div>

      {/* ── Opportunities quick-access ────────────────────────────────────────── */}
      <div style={{ padding: '14px 16px 0' }}>
        <p style={{
          fontFamily: 'DM Sans, sans-serif', fontWeight: 700, fontSize: '11px',
          color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase',
          letterSpacing: '0.07em', margin: '0 0 10px',
        }}>
          Opportunities
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '6px' }}>
          {[
            { key: 'jobs',          emoji: '💼', label: 'Jobs',    color: '#A78BFA' },
            { key: 'services',      emoji: '🔧', label: 'Services',color: '#60A5FA' },
            { key: 'accommodation', emoji: '🏠', label: 'Housing', color: '#34D399' },
          ].map(opp => {
            const count = loading ? null : posts.filter(p => p.category === opp.key).length;
            const active = activeTab === opp.key;
            return (
              <button
                key={opp.key}
                onClick={() => setActiveTab(opp.key)}
                style={{
                  background: active ? `${opp.color}18` : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${active ? `${opp.color}40` : 'rgba(255,255,255,0.08)'}`,
                  borderRadius: '14px', padding: '12px 8px',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px',
                  cursor: 'pointer',
                  transition: 'border-color 0.15s',
                }}
              >
                <span style={{ fontSize: '20px', lineHeight: 1 }}>{opp.emoji}</span>
                <span style={{
                  fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '12px',
                  color: active ? opp.color : '#F0F6FC',
                }}>
                  {opp.label}
                </span>
                {count !== null && count > 0 && (
                  <span style={{
                    fontFamily: 'DM Sans, sans-serif', fontWeight: 700, fontSize: '10px',
                    color: opp.color, background: `${opp.color}15`,
                    borderRadius: '10px', padding: '1px 6px',
                  }}>
                    {count}
                  </span>
                )}
                {count === 0 && !loading && (
                  <span style={{
                    fontFamily: 'DM Sans, sans-serif', fontSize: '10px',
                    color: 'rgba(255,255,255,0.2)',
                  }}>
                    Post first
                  </span>
                )}
              </button>
            );
          })}
        </div>
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
          <div style={{ paddingTop: '16px' }}>
            {activeTab === 'all' ? (
              <NudgeCard
                emoji="📌"
                title={`Nothing posted in ${display || 'your area'} yet`}
                body="Be the first — share something for sale, ask a question, post a safety alert or announce an event."
                ctaLabel="Post something"
                onCta={() => navigate('/board/new')}
              />
            ) : (
              <NudgeCard
                emoji={getCategoryConfig(activeTab).emoji}
                title={`No ${getCategoryConfig(activeTab).label} posts in ${display || 'your area'}`}
                body="Nothing here yet — you could be the first to post in this category."
                ctaLabel={`Post ${getCategoryConfig(activeTab).label}`}
                onCta={() => navigate('/board/new')}
                accent={getCategoryConfig(activeTab).color}
              />
            )}
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
