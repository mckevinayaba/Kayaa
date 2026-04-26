import { useState, useRef } from 'react';
import { X, Image } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { createUserPost, uploadUserPostImage } from '../lib/api';
import type { UserPost, UserPostCategory } from '../lib/api';

const CATEGORIES: { key: UserPostCategory; emoji: string; label: string; color: string }[] = [
  { key: 'story',          emoji: '📖', label: 'Story',          color: '#60A5FA' },
  { key: 'news',           emoji: '📰', label: 'News',           color: '#F59E0B' },
  { key: 'alert',          emoji: '🚨', label: 'Alert',          color: '#EF4444' },
  { key: 'question',       emoji: '❓', label: 'Question',       color: '#A78BFA' },
  { key: 'recommendation', emoji: '⭐', label: 'Tip',            color: '#39D98A' },
  { key: 'event',          emoji: '📅', label: 'Event',          color: '#34D399' },
  { key: 'spotted',        emoji: '👀', label: 'Spotted',        color: '#8B5CF6' },
];

const MAX_CHARS = 500;

interface Props {
  neighbourhood: string;
  onClose: () => void;
  onPosted: (post: UserPost) => void;
}

export default function PostComposer({ neighbourhood, onClose, onPosted }: Props) {
  const { user } = useAuth();
  const [category, setCategory] = useState<UserPostCategory>('story');
  const [content, setContent]   = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const isAlert  = category === 'alert';
  const accentBorder = isAlert ? '#EF4444' : '#39D98A';

  async function handleImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    try {
      const url = await uploadUserPostImage(user.id, file);
      setImageUrl(url);
    } catch {
      setError('Image upload failed. Try again.');
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit() {
    if (!user) { setError('Sign in to post.'); return; }
    if (!content.trim()) { setError('Write something first.'); return; }
    setError(null);
    setSubmitting(true);
    const { post, error: err } = await createUserPost(user.id, {
      neighbourhood,
      category,
      content: content.trim(),
      image_url: imageUrl ?? undefined,
      country_code: 'ZA',
    });
    setSubmitting(false);
    if (err || !post) {
      setError('Could not post. Try again.');
      return;
    }
    onPosted(post);
    onClose();
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 70,
          background: 'rgba(0,0,0,0.6)',
        }}
      />

      {/* Sheet */}
      <div
        style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 80,
          background: '#161B22',
          border: `2px solid ${accentBorder}`,
          borderRadius: '20px 20px 0 0',
          padding: '20px 16px 32px',
          maxHeight: '92dvh',
          overflowY: 'auto',
        }}
      >
        {/* Handle */}
        <div style={{ width: '40px', height: '4px', background: 'rgba(255,255,255,0.15)', borderRadius: '2px', margin: '0 auto 20px' }} />

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '17px', color: '#F0F6FC', margin: 0 }}>
            Share with your neighbourhood
          </h2>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px' }}>
            <X size={20} />
          </button>
        </div>

        {/* Alert warning */}
        {isAlert && (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '10px', padding: '10px 14px', marginBottom: '16px' }}>
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: '#FCA5A5', margin: 0, lineHeight: 1.5 }}>
              🚨 Alerts are for urgent neighbourhood safety or emergency information only.
            </p>
          </div>
        )}

        {/* Category selector */}
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', scrollbarWidth: 'none', paddingBottom: '4px', marginBottom: '16px' } as React.CSSProperties}>
          {CATEGORIES.map(c => {
            const active = c.key === category;
            return (
              <button
                key={c.key}
                onClick={() => setCategory(c.key)}
                style={{
                  flexShrink: 0,
                  display: 'flex', alignItems: 'center', gap: '5px',
                  padding: '7px 14px', borderRadius: '20px',
                  border: active ? 'none' : '1px solid rgba(255,255,255,0.1)',
                  background: active ? `${c.color}25` : 'transparent',
                  color: active ? c.color : 'rgba(255,255,255,0.55)',
                  fontFamily: 'DM Sans, sans-serif', fontSize: '13px', fontWeight: 600,
                  cursor: 'pointer', transition: 'all 0.15s',
                }}
              >
                <span>{c.emoji}</span> {c.label}
              </button>
            );
          })}
        </div>

        {/* Neighbourhood chip */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
          <span style={{ fontSize: '11px', fontFamily: 'DM Sans, sans-serif', color: 'rgba(255,255,255,0.45)' }}>Posting to:</span>
          <span style={{ fontSize: '12px', fontFamily: 'DM Sans, sans-serif', fontWeight: 600, color: '#39D98A', background: 'rgba(57,217,138,0.1)', border: '1px solid rgba(57,217,138,0.25)', borderRadius: '20px', padding: '3px 10px' }}>
            📍 {neighbourhood || 'Your area'}
          </span>
        </div>

        {/* Text area */}
        <div style={{ position: 'relative', marginBottom: '12px' }}>
          <textarea
            value={content}
            onChange={e => setContent(e.target.value.slice(0, MAX_CHARS))}
            placeholder={`What's happening in ${neighbourhood || 'your area'}?\nShare something people should know.`}
            rows={5}
            style={{
              width: '100%', boxSizing: 'border-box',
              background: '#0D1117', border: `1px solid ${content.length > 0 ? accentBorder + '60' : '#21262D'}`,
              borderRadius: '12px', padding: '14px', paddingBottom: '30px',
              color: '#F0F6FC', fontFamily: 'DM Sans, sans-serif', fontSize: '15px',
              lineHeight: 1.6, outline: 'none', resize: 'vertical',
              transition: 'border-color 0.2s',
            }}
          />
          <span style={{
            position: 'absolute', bottom: '10px', right: '12px',
            fontFamily: 'DM Sans, sans-serif', fontSize: '11px',
            color: content.length >= MAX_CHARS ? '#EF4444' : 'rgba(255,255,255,0.3)',
          }}>
            {content.length}/{MAX_CHARS}
          </span>
        </div>

        {/* Image preview / add photo */}
        {imageUrl ? (
          <div style={{ position: 'relative', marginBottom: '12px' }}>
            <img src={imageUrl} alt="Post image" style={{ width: '100%', maxHeight: '180px', objectFit: 'cover', borderRadius: '10px', border: '1px solid #21262D' }} />
            <button
              onClick={() => setImageUrl(null)}
              style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '50%', width: '28px', height: '28px', cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              background: 'transparent', border: '1px dashed rgba(255,255,255,0.15)',
              borderRadius: '10px', padding: '10px 16px', marginBottom: '16px',
              color: 'rgba(255,255,255,0.45)', fontFamily: 'DM Sans, sans-serif',
              fontSize: '13px', cursor: uploading ? 'wait' : 'pointer', width: '100%',
            }}
          >
            <Image size={16} />
            {uploading ? 'Uploading…' : 'Add photo (optional)'}
          </button>
        )}
        <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImage} />

        {/* Error */}
        {error && (
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: '#FCA5A5', margin: '0 0 12px' }}>{error}</p>
        )}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={submitting || !content.trim()}
          style={{
            width: '100%', background: submitting || !content.trim() ? 'rgba(57,217,138,0.4)' : '#39D98A',
            color: '#0D1117', border: 'none', borderRadius: '12px',
            padding: '15px', fontFamily: 'Syne, sans-serif', fontWeight: 700,
            fontSize: '15px', cursor: submitting || !content.trim() ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s',
          }}
        >
          {submitting ? 'Posting…' : `Post to ${neighbourhood || 'neighbourhood'}`}
        </button>
      </div>
    </>
  );
}
