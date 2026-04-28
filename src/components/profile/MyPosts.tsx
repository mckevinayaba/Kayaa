import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

// ── Types ─────────────────────────────────────────────────────────────────────

interface BoardPost {
  id:         string;
  content:    string;
  post_type:  string;
  created_at: string;
  like_count: number;
}

interface MyPostsProps {
  /** Anonymous visitor ID stored in localStorage */
  visitorId: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const POST_TYPE_EMOJI: Record<string, string> = {
  question:     '❓',
  story:        '📖',
  announcement: '📢',
  review:       '⭐',
  skill:        '🛠️',
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'Just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function MyPosts({ visitorId }: MyPostsProps) {
  const navigate             = useNavigate();
  const [posts, setPosts]    = useState<BoardPost[]>([]);
  const [loaded, setLoaded]  = useState(false);

  useEffect(() => {
    if (!visitorId) { setLoaded(true); return; }

    supabase
      .from('board_posts')
      .select('id, content, post_type, created_at, like_count')
      .eq('visitor_id', visitorId)
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data }) => {
        setPosts(data ?? []);
        setLoaded(true);
      });
  }, [visitorId]);

  if (!loaded) {
    return (
      <div style={{ textAlign: 'center', padding: '32px 0' }}>
        <div style={{ width: '24px', height: '24px', borderRadius: '50%', border: '2px solid rgba(57,217,138,0.3)', borderTopColor: '#39D98A', animation: 'spin 0.7s linear infinite', margin: '0 auto' }} />
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 0' }}>
        <div style={{ fontSize: '48px', marginBottom: '12px' }}>💬</div>
        <h3 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '16px', color: '#fff', marginBottom: '8px' }}>
          No posts yet
        </h3>
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: 'rgba(255,255,255,0.45)', lineHeight: 1.6, marginBottom: '20px' }}>
          Share a question, story or skill on the Board.
        </p>
        <button
          onClick={() => navigate('/board/new')}
          style={{
            background: '#39D98A', color: '#000', border: 'none',
            borderRadius: '12px', padding: '12px 24px',
            fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '14px', cursor: 'pointer',
          }}
        >
          Post something →
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {posts.map(post => (
        <div
          key={post.id}
          style={{
            background: '#161B22', border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: '14px', padding: '14px 16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span style={{ fontSize: '16px' }}>
              {POST_TYPE_EMOJI[post.post_type] ?? '💬'}
            </span>
            <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {post.post_type}
            </span>
            <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.25)', marginLeft: 'auto' }}>
              {timeAgo(post.created_at)}
            </span>
          </div>
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: 'rgba(255,255,255,0.8)', lineHeight: 1.6, margin: '0 0 10px' }}>
            {post.content.length > 120 ? post.content.slice(0, 120) + '…' : post.content}
          </p>
          <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>
            ❤️ {post.like_count ?? 0}
          </div>
        </div>
      ))}
    </div>
  );
}
