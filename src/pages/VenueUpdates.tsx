import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Check, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { getVenueOwnerByUserId } from '../lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

type UpdateType = 'general' | 'special' | 'menu' | 'event' | 'announcement';

interface VenueUpdate {
  id: string;
  title: string;
  content: string | null;
  type: UpdateType;
  createdAt: string;
  expiresAt: string | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<UpdateType, { emoji: string; label: string; color: string }> = {
  special:      { emoji: '🔥', label: 'Special',      color: '#FB923C' },
  menu:         { emoji: '🍽️', label: 'Menu Update',  color: '#60A5FA' },
  event:        { emoji: '🎉', label: 'Event',         color: '#F472B6' },
  announcement: { emoji: '📢', label: 'Announcement',  color: '#FBBF24' },
  general:      { emoji: '📝', label: 'General',       color: '#A78BFA' },
};

const TYPES: UpdateType[] = ['special', 'menu', 'event', 'announcement', 'general'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)   return 'just now';
  if (mins < 60)  return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)   return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

// ─── Update card ──────────────────────────────────────────────────────────────

function UpdateCard({
  update,
  onDelete,
}: {
  update: VenueUpdate;
  onDelete: (id: string) => void;
}) {
  const [confirm, setConfirm] = useState(false);
  const cfg = TYPE_CONFIG[update.type];

  return (
    <div style={{
      background: '#161B22', border: '1px solid #21262D',
      borderRadius: '14px', padding: '14px', marginBottom: '10px',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
        {/* Type badge */}
        <div style={{
          width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0,
          background: `${cfg.color}15`, border: `1px solid ${cfg.color}30`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '18px',
        }}>
          {cfg.emoji}
        </div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
            <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '14px', color: '#F0F6FC' }}>
              {update.title}
            </span>
            <span style={{
              fontFamily: 'DM Sans, sans-serif', fontSize: '10px', fontWeight: 600,
              color: cfg.color, background: `${cfg.color}15`, borderRadius: '6px',
              padding: '2px 7px', flexShrink: 0,
            }}>
              {cfg.label}
            </span>
          </div>
          {update.content && (
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: 'rgba(255,255,255,0.55)', margin: '0 0 6px', lineHeight: 1.5 }}>
              {update.content}
            </p>
          )}
          <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>
            {fmtRelative(update.createdAt)}
            {update.expiresAt && ` · expires ${new Date(update.expiresAt).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })}`}
          </div>
        </div>

        {/* Delete */}
        {confirm ? (
          <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
            <button
              onClick={() => onDelete(update.id)}
              style={{
                background: '#EF4444', border: 'none', borderRadius: '8px',
                padding: '5px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center',
              }}
            >
              <Check size={14} color="#fff" />
            </button>
            <button
              onClick={() => setConfirm(false)}
              style={{
                background: 'rgba(255,255,255,0.07)', border: 'none', borderRadius: '8px',
                padding: '5px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center',
              }}
            >
              <X size={14} color="rgba(255,255,255,0.5)" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirm(true)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '4px', display: 'flex', alignItems: 'center', flexShrink: 0,
            }}
          >
            <Trash2 size={15} color="rgba(255,255,255,0.25)" />
          </button>
        )}
      </div>
    </div>
  );
}

// ─── New update form ──────────────────────────────────────────────────────────

function NewUpdateForm({
  onPost,
  onCancel,
}: {
  onPost: (data: { title: string; content: string; type: UpdateType; expiresIn: string }) => Promise<void>;
  onCancel: () => void;
}) {
  const [type,      setType]      = useState<UpdateType>('special');
  const [title,     setTitle]     = useState('');
  const [content,   setContent]   = useState('');
  const [expiresIn, setExpiresIn] = useState('7');
  const [posting,   setPosting]   = useState(false);

  const inputStyle = {
    width: '100%', background: '#0D1117', border: '1px solid #30363D',
    borderRadius: '10px', padding: '11px 12px',
    fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: '#F0F6FC',
    outline: 'none', boxSizing: 'border-box' as const,
  };

  async function handlePost() {
    if (!title.trim()) return;
    setPosting(true);
    await onPost({ title, content, type, expiresIn });
    setPosting(false);
  }

  return (
    <div style={{
      background: '#161B22', border: '1px solid #39D98A30',
      borderRadius: '16px', padding: '16px', marginBottom: '16px',
    }}>
      <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '15px', color: '#F0F6FC', marginBottom: '14px' }}>
        New Update
      </div>

      {/* Type selector */}
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
        {TYPES.map(t => {
          const cfg = TYPE_CONFIG[t];
          const active = type === t;
          return (
            <button
              key={t}
              onClick={() => setType(t)}
              style={{
                display: 'flex', alignItems: 'center', gap: '5px',
                padding: '5px 10px', borderRadius: '20px', border: 'none', cursor: 'pointer',
                background: active ? `${cfg.color}20` : 'rgba(255,255,255,0.05)',
                outline: active ? `1px solid ${cfg.color}` : '1px solid transparent',
                fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: '12px',
                color: active ? cfg.color : 'rgba(255,255,255,0.5)',
                transition: 'all 0.15s',
              }}
            >
              <span>{cfg.emoji}</span> {cfg.label}
            </button>
          );
        })}
      </div>

      {/* Title */}
      <div style={{ marginBottom: '10px' }}>
        <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '5px' }}>
          Headline *
        </div>
        <input
          type="text"
          placeholder={type === 'special' ? 'e.g. 2-for-1 haircuts this Saturday' : 'Update headline…'}
          value={title}
          onChange={e => setTitle(e.target.value)}
          maxLength={80}
          style={inputStyle}
        />
      </div>

      {/* Content */}
      <div style={{ marginBottom: '10px' }}>
        <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '5px' }}>
          Details (optional)
        </div>
        <textarea
          placeholder="Add more details about this update…"
          value={content}
          onChange={e => setContent(e.target.value)}
          rows={3}
          maxLength={400}
          style={{ ...inputStyle, resize: 'vertical', lineHeight: '1.5' }}
        />
      </div>

      {/* Expiry */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '5px' }}>
          Show for
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          {[
            { val: '1', label: '1 day' },
            { val: '3', label: '3 days' },
            { val: '7', label: '1 week' },
            { val: '30', label: '1 month' },
            { val: '0', label: 'No expiry' },
          ].map(opt => (
            <button
              key={opt.val}
              onClick={() => setExpiresIn(opt.val)}
              style={{
                flex: 1, padding: '7px 4px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                background: expiresIn === opt.val ? 'rgba(57,217,138,0.15)' : 'rgba(255,255,255,0.04)',
                outline: expiresIn === opt.val ? '1px solid rgba(57,217,138,0.4)' : '1px solid transparent',
                fontFamily: 'DM Sans, sans-serif', fontSize: '11px', fontWeight: 600,
                color: expiresIn === opt.val ? '#39D98A' : 'rgba(255,255,255,0.4)',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          onClick={handlePost}
          disabled={!title.trim() || posting}
          style={{
            flex: 1, padding: '13px', borderRadius: '12px', border: 'none', cursor: 'pointer',
            background: !title.trim() || posting ? 'rgba(57,217,138,0.3)' : '#39D98A',
            fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '14px', color: '#000',
          }}
        >
          {posting ? 'Posting…' : 'Post Update'}
        </button>
        <button
          onClick={onCancel}
          style={{
            padding: '13px 16px', borderRadius: '12px',
            background: 'rgba(255,255,255,0.05)', border: '1px solid #30363D', cursor: 'pointer',
            fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: '14px', color: 'rgba(255,255,255,0.5)',
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div style={{ padding: '70px 16px 16px' }}>
      {[80, 80, 80].map((h, i) => (
        <div key={i} style={{ height: `${h}px`, background: 'rgba(255,255,255,0.04)', borderRadius: '14px', marginBottom: '10px' }} />
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function VenueUpdates() {
  const { user }  = useAuth();
  const navigate  = useNavigate();

  const [venueId,  setVenueId]  = useState<string | null>(null);
  const [updates,  setUpdates]  = useState<VenueUpdate[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [posted,   setPosted]   = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const ownership = await getVenueOwnerByUserId(user.id);
      if (!ownership) { setLoading(false); return; }
      setVenueId(ownership.venueId);
      await loadUpdates(ownership.venueId);
      setLoading(false);
    })();
  }, [user]);

  async function loadUpdates(vid: string) {
    const { data } = await supabase
      .from('venue_updates')
      .select('*')
      .eq('venue_id', vid)
      .order('created_at', { ascending: false })
      .limit(50);

    if (data) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setUpdates(data.map((r: any) => ({
        id: r.id,
        title: r.title,
        content: r.content ?? null,
        type: r.type as UpdateType,
        createdAt: r.created_at,
        expiresAt: r.expires_at ?? null,
      })));
    }
  }

  async function handlePost(data: { title: string; content: string; type: UpdateType; expiresIn: string }) {
    if (!venueId) return;
    const expires_at = data.expiresIn !== '0'
      ? new Date(Date.now() + Number(data.expiresIn) * 86_400_000).toISOString()
      : null;

    await supabase.from('venue_updates').insert({
      venue_id: venueId,
      title:    data.title.trim(),
      content:  data.content.trim() || null,
      type:     data.type,
      expires_at,
    });

    setShowForm(false);
    setPosted(true);
    setTimeout(() => setPosted(false), 3000);
    await loadUpdates(venueId);
  }

  async function handleDelete(id: string) {
    await supabase.from('venue_updates').delete().eq('id', id);
    setUpdates(prev => prev.filter(u => u.id !== id));
  }

  if (loading) return <Skeleton />;

  return (
    <div style={{ paddingBottom: '100px' }}>

      {/* ── Sticky header ─────────────────────────────────────────────── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 40,
        background: 'rgba(13,17,23,0.94)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid #21262D',
        padding: '12px 16px',
        display: 'flex', alignItems: 'center', gap: '12px',
      }}>
        <button
          onClick={() => navigate(-1)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
        >
          <ArrowLeft size={20} color="rgba(255,255,255,0.6)" />
        </button>
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '16px', color: '#F0F6FC', margin: 0, flex: 1 }}>
          Post an Update
        </h1>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              padding: '8px 12px', borderRadius: '10px', border: 'none', cursor: 'pointer',
              background: '#39D98A',
              fontFamily: 'DM Sans, sans-serif', fontWeight: 700, fontSize: '12px', color: '#000',
            }}
          >
            <Plus size={14} /> New
          </button>
        )}
      </div>

      <div style={{ padding: '16px' }}>

        {/* ── Success banner ─────────────────────────────────────────────── */}
        {posted && (
          <div style={{
            marginBottom: '14px', padding: '12px 14px',
            background: 'rgba(57,217,138,0.08)', border: '1px solid rgba(57,217,138,0.25)',
            borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '8px',
          }}>
            <Check size={16} color="#39D98A" />
            <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: '#39D98A' }}>
              Update posted! Visitors on your venue page will see it.
            </span>
          </div>
        )}

        {/* ── No-venue state ─────────────────────────────────────────────── */}
        {!venueId && (
          <div style={{ textAlign: 'center', padding: '60px 16px', fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: 'rgba(255,255,255,0.4)' }}>
            No venue found. <a href="/onboarding" style={{ color: '#39D98A' }}>Add your place first.</a>
          </div>
        )}

        {/* ── New update form ────────────────────────────────────────────── */}
        {showForm && venueId && (
          <NewUpdateForm onPost={handlePost} onCancel={() => setShowForm(false)} />
        )}

        {/* ── Empty CTA ──────────────────────────────────────────────────── */}
        {!showForm && venueId && updates.length === 0 && (
          <div style={{
            textAlign: 'center', padding: '48px 24px',
            background: '#161B22', border: '1px dashed #30363D',
            borderRadius: '16px', marginBottom: '16px',
          }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>📣</div>
            <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '16px', color: '#F0F6FC', marginBottom: '6px' }}>
              Post your first update
            </div>
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: 'rgba(255,255,255,0.4)', lineHeight: 1.6, marginBottom: '20px', maxWidth: '280px', margin: '0 auto 20px' }}>
              Share specials, menu changes, events or announcements. They appear on your venue page.
            </p>
            <button
              onClick={() => setShowForm(true)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '8px',
                padding: '12px 24px', borderRadius: '12px', border: 'none', cursor: 'pointer',
                background: '#39D98A',
                fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '14px', color: '#000',
              }}
            >
              <Plus size={16} />
              Post Update
            </button>
          </div>
        )}

        {/* ── Updates list ───────────────────────────────────────────────── */}
        {updates.length > 0 && (
          <>
            <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: 'rgba(255,255,255,0.35)', marginBottom: '10px' }}>
              {updates.length} update{updates.length !== 1 ? 's' : ''} posted
            </div>
            {updates.map(u => (
              <UpdateCard key={u.id} update={u} onDelete={handleDelete} />
            ))}
          </>
        )}

      </div>
    </div>
  );
}
