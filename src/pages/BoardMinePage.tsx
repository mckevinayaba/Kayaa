import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus } from 'lucide-react';
import {
  getUserBoardPosts,
  getBoardPostsByIds,
  createBoardPost,
  type BoardPost,
  type BoardPostStatus,
} from '../lib/api';
import { getInteractiveUserId } from '../lib/api';
import { BOARD_CATEGORIES } from './BoardPage';

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

const STATUS_TABS: { key: BoardPostStatus | 'all'; label: string }[] = [
  { key: 'active',   label: 'Active' },
  { key: 'resolved', label: 'Resolved' },
  { key: 'taken',    label: 'Taken' },
  { key: 'expired',  label: 'Expired' },
];

function getMineIds(): string[] {
  try { return JSON.parse(localStorage.getItem('kayaa_board_mine') ?? '[]'); }
  catch { return []; }
}

// ─── Post row ─────────────────────────────────────────────────────────────────

function PostRow({
  post,
  onRepost,
  reposting,
}: {
  post: BoardPost;
  onRepost?: (post: BoardPost) => void;
  reposting?: boolean;
}) {
  const navigate = useNavigate();
  const cat = BOARD_CATEGORIES.find(c => c.key === post.category) ?? {
    emoji: '📌', label: post.category, color: '#94A3B8',
  };

  const isExpired = post.status === 'expired' ||
    (post.expiresAt != null && new Date(post.expiresAt).getTime() < Date.now());

  return (
    <div
      onClick={() => navigate(`/board/${post.id}`)}
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: '14px',
        padding: '14px',
        cursor: 'pointer',
        opacity: isExpired ? 0.65 : 1,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{
            fontSize: '10px', fontWeight: 700, color: cat.color,
            background: `${cat.color}18`, padding: '2px 7px',
            borderRadius: '20px', display: 'inline-block', marginBottom: '6px',
          }}>
            {cat.emoji} {cat.label}
          </span>
          <div style={{
            fontFamily: 'Syne, sans-serif', fontWeight: 700,
            fontSize: '14px', color: 'var(--color-text)',
            lineHeight: 1.3,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {post.title}
          </div>
        </div>

        {/* Status badge */}
        <div style={{ flexShrink: 0, marginLeft: '10px' }}>
          {post.status === 'active' && !isExpired && (
            <span style={{ fontSize: '10px', fontWeight: 700, color: '#39D98A', background: 'rgba(57,217,138,0.12)', padding: '3px 8px', borderRadius: '20px' }}>
              Live
            </span>
          )}
          {post.status === 'resolved' && (
            <span style={{ fontSize: '10px', fontWeight: 700, color: '#60A5FA', background: 'rgba(96,165,250,0.12)', padding: '3px 8px', borderRadius: '20px' }}>
              Resolved
            </span>
          )}
          {post.status === 'taken' && (
            <span style={{ fontSize: '10px', fontWeight: 700, color: '#F5A623', background: 'rgba(245,166,35,0.12)', padding: '3px 8px', borderRadius: '20px' }}>
              Taken
            </span>
          )}
          {(post.status === 'expired' || isExpired) && (
            <span style={{ fontSize: '10px', fontWeight: 700, color: '#94A3B8', background: 'rgba(148,163,184,0.12)', padding: '3px 8px', borderRadius: '20px' }}>
              Expired
            </span>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
        <span style={{ fontSize: '11px', color: 'var(--color-muted)', fontFamily: 'DM Sans, sans-serif' }}>
          📍 {post.neighbourhood} · {formatAge(post.createdAt)}
        </span>
        {(post.status === 'expired' || isExpired) && onRepost && (
          <button
            onClick={e => { e.stopPropagation(); onRepost(post); }}
            disabled={reposting}
            style={{
              background: '#39D98A', color: '#000',
              border: 'none', borderRadius: '20px',
              padding: '5px 12px', fontSize: '11px', fontWeight: 700,
              cursor: reposting ? 'default' : 'pointer',
              fontFamily: 'DM Sans, sans-serif',
              opacity: reposting ? 0.6 : 1,
            }}
          >
            {reposting ? '…' : 'Repost'}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function BoardMinePage() {
  const navigate = useNavigate();
  const [posts,       setPosts]       = useState<BoardPost[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [activeTab,   setActiveTab]   = useState<BoardPostStatus | 'all'>('active');
  const [repostingId, setRepostingId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const uid = await getInteractiveUserId();

      // Try DB fetch first (for authenticated users)
      let dbPosts: BoardPost[] = [];
      try {
        dbPosts = await getUserBoardPosts(uid);
      } catch { /* ignore */ }

      // Supplement with localStorage-tracked IDs (covers anon + FK-fallback posts)
      const localIds = getMineIds();
      let localPosts: BoardPost[] = [];
      if (localIds.length > 0) {
        try { localPosts = await getBoardPostsByIds(localIds); } catch { /* ignore */ }
      }

      // Merge, deduplicate by ID
      const merged = [...dbPosts];
      for (const lp of localPosts) {
        if (!merged.find(p => p.id === lp.id)) merged.push(lp);
      }

      // Sort newest first
      merged.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      // Mark expired posts based on expiresAt
      const now = new Date().toISOString();
      const enriched = merged.map(p => {
        if (p.status === 'active' && p.expiresAt && p.expiresAt < now) {
          return { ...p, status: 'expired' as BoardPostStatus };
        }
        return p;
      });

      setPosts(enriched);
      setLoading(false);
    }
    load();
  }, []);

  const filtered = activeTab === 'all'
    ? posts
    : posts.filter(p => {
        if (activeTab === 'expired') {
          return p.status === 'expired' || (p.expiresAt != null && p.expiresAt < new Date().toISOString());
        }
        return p.status === activeTab;
      });

  // Tab counts
  function tabCount(tab: BoardPostStatus | 'all'): number {
    if (tab === 'all') return posts.length;
    if (tab === 'expired') {
      const now = new Date().toISOString();
      return posts.filter(p => p.status === 'expired' || (p.expiresAt != null && p.expiresAt < now)).length;
    }
    return posts.filter(p => p.status === tab).length;
  }

  async function handleRepost(post: BoardPost) {
    setRepostingId(post.id);
    const uid = await getInteractiveUserId();
    const { error, post: newPost } = await createBoardPost({
      neighbourhood: post.neighbourhood,
      category: post.category,
      title: post.title,
      description: post.description,
      price: post.price,
      contact_whatsapp: post.contactWhatsapp,
      images: post.images,
    }, uid);

    if (!error && newPost) {
      // Track new post in localStorage
      try {
        const mine: string[] = JSON.parse(localStorage.getItem('kayaa_board_mine') ?? '[]');
        mine.unshift(newPost.id);
        localStorage.setItem('kayaa_board_mine', JSON.stringify(mine.slice(0, 50)));
      } catch { /* ignore */ }
      // Append to local state
      setPosts(prev => [newPost, ...prev]);
    }
    setRepostingId(null);
  }

  const totalActive = tabCount('active');

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', paddingBottom: '100px' }}>

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '12px',
        padding: '14px 16px',
        borderBottom: '1px solid var(--color-border)',
      }}>
        <button
          onClick={() => navigate('/board')}
          style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex' }}
        >
          <ArrowLeft size={20} color="var(--color-text)" />
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '18px', color: 'var(--color-text)' }}>
            My Posts
          </div>
          {!loading && (
            <div style={{ fontSize: '12px', color: 'var(--color-muted)', fontFamily: 'DM Sans, sans-serif' }}>
              {totalActive > 0 ? `${totalActive} live` : 'No active posts'}
            </div>
          )}
        </div>
        <button
          onClick={() => navigate('/board/new')}
          style={{
            width: '36px', height: '36px', borderRadius: '50%',
            background: '#39D98A', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Plus size={18} color="#000" strokeWidth={2.5} />
        </button>
      </div>

      {/* Status tabs */}
      <div style={{
        display: 'flex', gap: '4px',
        overflowX: 'auto', scrollbarWidth: 'none',
        padding: '12px 16px',
        borderBottom: '1px solid var(--color-border)',
      } as React.CSSProperties}>
        {STATUS_TABS.map(tab => {
          const count = tabCount(tab.key);
          const active = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                flexShrink: 0,
                padding: '6px 12px',
                borderRadius: '20px',
                border: active ? 'none' : '1px solid var(--color-border)',
                background: active ? '#39D98A' : 'var(--color-surface)',
                color: active ? '#000' : 'var(--color-muted)',
                fontSize: '12px', fontWeight: 700,
                cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
                display: 'flex', alignItems: 'center', gap: '5px',
              }}
            >
              {tab.label}
              {count > 0 && (
                <span style={{
                  background: active ? 'rgba(0,0,0,0.2)' : 'var(--color-border)',
                  borderRadius: '10px', padding: '0 5px',
                  fontSize: '10px', fontWeight: 800,
                  color: active ? '#000' : 'var(--color-muted)',
                }}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div style={{ padding: '14px 16px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--color-muted)', fontFamily: 'DM Sans, sans-serif', fontSize: '14px' }}>
            Loading…
          </div>
        ) : posts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <div style={{ fontSize: '36px', marginBottom: '12px' }}>📋</div>
            <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '16px', color: 'var(--color-text)', marginBottom: '6px' }}>
              No posts yet
            </div>
            <div style={{ fontSize: '13px', color: 'var(--color-muted)', fontFamily: 'DM Sans, sans-serif', marginBottom: '20px' }}>
              Post something on the board and it'll appear here
            </div>
            <button
              onClick={() => navigate('/board/new')}
              style={{
                background: '#39D98A', color: '#000',
                border: 'none', borderRadius: '20px',
                padding: '12px 24px', fontSize: '14px', fontWeight: 700,
                cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
              }}
            >
              Create first post
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--color-muted)', fontFamily: 'DM Sans, sans-serif', fontSize: '14px' }}>
            No {activeTab} posts
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {filtered.map(post => (
              <PostRow
                key={post.id}
                post={post}
                onRepost={handleRepost}
                reposting={repostingId === post.id}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
