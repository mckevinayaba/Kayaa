import { useState, useEffect } from 'react';
import { MessageSquare } from 'lucide-react';
import {
  getNeighbourhoodPosts,
  createNeighbourhoodPost,
  type NeighbourhoodPost,
} from '../lib/api';

const CATEGORY_LABELS: Record<string, string> = {
  announcement: 'Announcement',
  lost_found: 'Lost & Found',
  question: 'Question',
  recommendation: 'Recommendation',
  event: 'Event',
  general: 'General',
};

const CATEGORY_COLORS: Record<string, string> = {
  announcement: '#60A5FA',
  lost_found: '#F5A623',
  question: '#A78BFA',
  recommendation: '#39D98A',
  event: '#F472B6',
  general: '#94A3B8',
};

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'announcement', label: 'Announcements' },
  { key: 'lost_found', label: 'Lost & Found' },
  { key: 'question', label: 'Questions' },
  { key: 'event', label: 'Events' },
];

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function BoardPage() {
  const neighbourhood = localStorage.getItem('kayaa_city') ?? 'Johannesburg';
  const [posts, setPosts] = useState<NeighbourhoodPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('all');
  const [showForm, setShowForm] = useState(false);

  const [name, setName] = useState('');
  const [isAnon, setIsAnon] = useState(false);
  const [category, setCategory] = useState('general');
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getNeighbourhoodPosts(neighbourhood).then(data => {
      setPosts(data);
      setLoading(false);
    });
  }, [neighbourhood]);

  const filtered = tab === 'all' ? posts : posts.filter(p => p.category === tab);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim() || submitting) return;
    setSubmitting(true);

    const authorName = isAnon ? 'Anonymous' : (name.trim() || 'Anonymous');
    const newPost: NeighbourhoodPost = {
      id: `local-${Date.now()}`,
      authorName,
      content: content.trim(),
      neighbourhood,
      category: category as NeighbourhoodPost['category'],
      isAnonymous: isAnon,
      createdAt: new Date().toISOString(),
    };

    setPosts(prev => [newPost, ...prev]);
    setShowForm(false);
    setContent('');
    setName('');
    setIsAnon(false);
    setCategory('general');

    await createNeighbourhoodPost({
      author_name: authorName,
      content: newPost.content,
      neighbourhood,
      category,
      is_anonymous: isAnon,
    });

    setSubmitting(false);
  }

  return (
    <div style={{ padding: '16px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
        <div>
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '20px', color: 'var(--color-text)', margin: 0 }}>
            Neighbourhood Board
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--color-muted)', margin: '2px 0 0', fontFamily: 'DM Sans, sans-serif' }}>
            {neighbourhood}
          </p>
        </div>
        <button
          onClick={() => setShowForm(v => !v)}
          style={{
            background: '#39D98A', color: '#000', border: 'none',
            borderRadius: '20px', padding: '8px 14px',
            fontSize: '13px', fontWeight: 700, cursor: 'pointer',
            fontFamily: 'DM Sans, sans-serif',
          }}
        >
          {showForm ? 'Cancel' : '+ Post'}
        </button>
      </div>

      {/* Inline post form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          style={{
            background: 'var(--color-surface)', border: '1px solid var(--color-border)',
            borderRadius: '14px', padding: '14px', marginTop: '14px', marginBottom: '4px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <input
              type="text"
              placeholder="Your name (optional)"
              value={isAnon ? '' : name}
              disabled={isAnon}
              onChange={e => setName(e.target.value)}
              style={{
                flex: 1, background: 'var(--color-bg)', border: '1px solid var(--color-border)',
                borderRadius: '8px', padding: '8px 10px', color: 'var(--color-text)',
                fontSize: '13px', fontFamily: 'DM Sans, sans-serif',
                opacity: isAnon ? 0.4 : 1, outline: 'none',
              }}
            />
            <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: 'var(--color-muted)', cursor: 'pointer', whiteSpace: 'nowrap' }}>
              <input type="checkbox" checked={isAnon} onChange={e => setIsAnon(e.target.checked)} />
              Anonymous
            </label>
          </div>

          <select
            value={category}
            onChange={e => setCategory(e.target.value)}
            style={{
              width: '100%', background: 'var(--color-bg)', border: '1px solid var(--color-border)',
              borderRadius: '8px', padding: '8px 10px', color: 'var(--color-text)',
              fontSize: '13px', fontFamily: 'DM Sans, sans-serif', marginBottom: '10px',
              boxSizing: 'border-box',
            }}
          >
            {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>

          <textarea
            placeholder="What's happening in the neighbourhood?"
            value={content}
            onChange={e => setContent(e.target.value.slice(0, 280))}
            rows={3}
            style={{
              width: '100%', background: 'var(--color-bg)', border: '1px solid var(--color-border)',
              borderRadius: '8px', padding: '8px 10px', color: 'var(--color-text)',
              fontSize: '13px', fontFamily: 'DM Sans, sans-serif',
              resize: 'none', boxSizing: 'border-box', marginBottom: '6px', outline: 'none',
            }}
          />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', color: 'var(--color-muted)' }}>
              {280 - content.length} chars left
            </span>
            <button
              type="submit"
              disabled={!content.trim() || submitting}
              style={{
                background: content.trim() ? '#39D98A' : 'var(--color-border)',
                color: content.trim() ? '#000' : 'var(--color-muted)',
                border: 'none', borderRadius: '20px', padding: '8px 16px',
                fontSize: '13px', fontWeight: 700,
                cursor: content.trim() ? 'pointer' : 'default',
                fontFamily: 'DM Sans, sans-serif',
              }}
            >
              Post to board
            </button>
          </div>

          <div style={{ fontSize: '11px', color: 'var(--color-muted)', marginTop: '8px' }}>
            📍 {neighbourhood}
          </div>
        </form>
      )}

      {/* Tab bar */}
      <div style={{
        display: 'flex', gap: '6px', overflowX: 'auto', scrollbarWidth: 'none',
        marginLeft: '-16px', paddingLeft: '16px',
        marginRight: '-16px', paddingRight: '16px',
        paddingBottom: '4px', marginTop: '14px', marginBottom: '14px',
      } as React.CSSProperties}>
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              flexShrink: 0, padding: '6px 13px', borderRadius: '20px',
              border: tab === t.key ? 'none' : '1px solid var(--color-border)',
              background: tab === t.key ? '#39D98A' : 'var(--color-surface)',
              color: tab === t.key ? '#000' : 'var(--color-muted)',
              fontSize: '12px', fontWeight: 600,
              fontFamily: 'DM Sans, sans-serif', cursor: 'pointer', whiteSpace: 'nowrap',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Posts */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--color-muted)', fontSize: '14px', fontFamily: 'DM Sans, sans-serif' }}>
          Loading...
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0' }}>
          <div style={{ marginBottom: '12px' }}><MessageSquare size={32} color="var(--color-border)" /></div>
          <div style={{ color: 'var(--color-muted)', fontSize: '14px', fontFamily: 'DM Sans, sans-serif' }}>
            {tab === 'all' ? 'No posts yet. Be the first!' : `No ${(CATEGORY_LABELS[tab] ?? tab).toLowerCase()} posts yet.`}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {filtered.map(post => {
            const color = CATEGORY_COLORS[post.category] ?? '#94A3B8';
            return (
              <div key={post.id} style={{
                background: 'var(--color-surface)', border: '1px solid var(--color-border)',
                borderRadius: '14px', padding: '14px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{
                    fontSize: '11px', fontWeight: 600, color,
                    background: `${color}18`, padding: '2px 8px', borderRadius: '20px',
                  }}>
                    {CATEGORY_LABELS[post.category] ?? post.category}
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--color-muted)' }}>
                    {formatRelativeTime(post.createdAt)}
                  </span>
                </div>

                <p style={{
                  fontSize: '14px', color: 'var(--color-text)', margin: '0 0 10px',
                  lineHeight: 1.55, fontFamily: 'DM Sans, sans-serif',
                }}>
                  {post.content}
                </p>

                <div style={{ fontSize: '12px', color: 'var(--color-muted)', display: 'flex', gap: '8px', fontFamily: 'DM Sans, sans-serif' }}>
                  <span>{post.isAnonymous ? '🕶 Anonymous' : `👤 ${post.authorName}`}</span>
                  <span>·</span>
                  <span>📍 {post.neighbourhood}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
