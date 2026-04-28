import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, MessageCircle, Phone, Share2,
  MapPin, Clock, ChevronDown, ChevronUp, Flag,
} from 'lucide-react';
import { getBoardPost, type BoardPost } from '../lib/api';

import { PlaceShareModal as ShareModal } from '../components/place/ShareModal';

// ── Helpers ───────────────────────────────────────────────────────────────────

function skillEmoji(title: string, desc?: string): string {
  const t = `${title} ${desc ?? ''}`.toLowerCase();
  if (/barber|fade|lineup|haircut/.test(t)) return '💈';
  if (/electric|geyser|wiring|power/.test(t)) return '🔌';
  if (/domestic|cleaner|clean house/.test(t)) return '🧹';
  if (/mechanic|motor|car repair/.test(t)) return '🔧';
  if (/braid|weave|cornrow|natural hair|hair/.test(t)) return '✂️';
  if (/tailor|sewing|dress|alteration/.test(t)) return '👗';
  if (/tutor|teach|lesson|maths|science/.test(t)) return '📚';
  if (/cater|cook|food|chef/.test(t)) return '🍳';
  if (/dj|music|sound system/.test(t)) return '🎵';
  if (/driver|transport|delivery|courier/.test(t)) return '🚗';
  if (/plumb|paint|build|tile|roof/.test(t)) return '🏗️';
  if (/tech|computer|laptop|phone repair/.test(t)) return '💻';
  if (/car wash|wash|detail/.test(t)) return '🚿';
  if (/photo|photographer/.test(t)) return '📸';
  return '🛠️';
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' });
}

function rateLabel(post: BoardPost): string | null {
  if (!post.price) return null;
  const t = post.title.toLowerCase();
  if (t.includes('per hour') || t.includes('/hr') || t.includes('hourly')) return `R${post.price}/hr`;
  if (t.includes('per head')) return `R${post.price} per head`;
  return `From R${post.price}`;
}

// ── Collapsible detail block ──────────────────────────────────────────────────

function DetailBlock({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div style={{ marginBottom: '16px' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'none', border: 'none', cursor: 'pointer', padding: '0 0 10px',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
        }}
      >
        <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '14px', color: '#fff' }}>
          {title}
        </span>
        {open
          ? <ChevronUp  size={16} color="rgba(255,255,255,0.4)" />
          : <ChevronDown size={16} color="rgba(255,255,255,0.4)" />}
      </button>
      {open && <div style={{ paddingTop: '12px' }}>{children}</div>}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SkillDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [post,      setPost]      = useState<BoardPost | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [shareOpen, setShareOpen] = useState(false);
  const [imgIdx,    setImgIdx]    = useState(0);

  useEffect(() => {
    if (!id) { setLoading(false); return; }
    getBoardPost(id).then(p => { setPost(p); setLoading(false); });
  }, [id]);

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          border: '3px solid rgba(57,217,138,0.2)',
          borderTopColor: '#39D98A',
          animation: 'spin 0.7s linear infinite',
        }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  // ── Not found ────────────────────────────────────────────────────────────────
  if (!post) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', padding: '24px' }}>
        <span style={{ fontSize: '40px' }}>🔍</span>
        <p style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '16px', color: '#fff', textAlign: 'center' }}>
          This listing is no longer available
        </p>
        <button
          onClick={() => navigate('/skills')}
          style={{ background: '#39D98A', color: '#000', border: 'none', borderRadius: '12px', padding: '12px 24px', fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '14px', cursor: 'pointer' }}
        >
          Browse Skills
        </button>
      </div>
    );
  }

  const emoji = skillEmoji(post.title, post.description);
  const rate  = rateLabel(post);
  const waText = encodeURIComponent(`Hi, I saw your "${post.title}" listing on Kayaa. I'm interested.`);
  const waUrl  = post.contactWhatsapp
    ? `https://wa.me/${post.contactWhatsapp.replace(/\D/g, '')}?text=${waText}`
    : null;

  return (
    <div style={{ minHeight: '100vh', paddingBottom: '100px' }}>

      {/* ── Sticky header ────────────────────────────────────────────────────── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 40,
        background: 'rgba(13,17,23,0.95)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        padding: '14px 16px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <button
          onClick={() => navigate(-1)}
          style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.07)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
        >
          <ArrowLeft size={18} color="#fff" />
        </button>

        <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '15px', color: '#fff', flex: 1, textAlign: 'center', padding: '0 8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {post.title}
        </span>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setShareOpen(true)}
            style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.07)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
          >
            <Share2 size={16} color="#fff" />
          </button>
          <a
            href={`mailto:hello@kayaa.co.za?subject=Report listing: ${encodeURIComponent(post.title)}`}
            style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.07)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', textDecoration: 'none' }}
          >
            <Flag size={16} color="rgba(255,255,255,0.5)" />
          </a>
        </div>
      </div>

      <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {/* ── Hero card ──────────────────────────────────────────────────────── */}
        <div style={{ background: '#161B22', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px', padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', marginBottom: '14px' }}>
            <div style={{
              width: 56, height: 56, borderRadius: '14px', flexShrink: 0,
              background: 'rgba(57,217,138,0.08)', border: '1px solid rgba(57,217,138,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '26px', lineHeight: 1,
            }}>
              {emoji}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '18px', color: '#fff', margin: '0 0 6px', lineHeight: 1.25 }}>
                {post.title}
              </h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <MapPin size={12} color="rgba(255,255,255,0.4)" />
                <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: 'rgba(255,255,255,0.45)' }}>
                  {post.neighbourhood}
                </span>
                <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '10px' }}>•</span>
                <Clock size={12} color="rgba(255,255,255,0.4)" />
                <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: 'rgba(255,255,255,0.45)' }}>
                  {timeAgo(post.createdAt)}
                </span>
              </div>
            </div>
          </div>

          {/* Rate badge */}
          {rate && (
            <div style={{
              display: 'inline-block',
              background: 'rgba(57,217,138,0.12)', border: '1px solid rgba(57,217,138,0.25)',
              borderRadius: '8px', padding: '6px 14px',
              fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '20px', color: '#39D98A',
            }}>
              {rate}
            </div>
          )}
        </div>

        {/* ── Photo gallery ──────────────────────────────────────────────────── */}
        {post.images && post.images.length > 0 && (
          <div>
            {/* Main photo */}
            <div style={{
              width: '100%', height: '220px',
              background: '#161B22', borderRadius: '14px', overflow: 'hidden',
              marginBottom: '8px', position: 'relative',
            }}>
              <img
                src={post.images[imgIdx]}
                alt={`${post.title} photo ${imgIdx + 1}`}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              {post.images.length > 1 && (
                <div style={{
                  position: 'absolute', bottom: '10px', right: '10px',
                  background: 'rgba(0,0,0,0.6)', borderRadius: '8px',
                  padding: '3px 8px',
                  fontFamily: 'DM Sans, sans-serif', fontSize: '11px', fontWeight: 700, color: '#fff',
                }}>
                  {imgIdx + 1}/{post.images.length}
                </div>
              )}
            </div>
            {/* Thumbnails */}
            {post.images.length > 1 && (
              <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', scrollbarWidth: 'none' }}>
                {post.images.map((src, i) => (
                  <button
                    key={i}
                    onClick={() => setImgIdx(i)}
                    style={{
                      flexShrink: 0, width: 56, height: 56, borderRadius: '8px',
                      overflow: 'hidden', border: i === imgIdx ? '2px solid #39D98A' : '2px solid transparent',
                      padding: 0, cursor: 'pointer', background: '#161B22',
                    }}
                  >
                    <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Contact buttons ────────────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: waUrl ? '1fr 1fr' : '1fr', gap: '10px' }}>
          {waUrl && (
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                padding: '14px 0', borderRadius: '14px',
                background: '#25D366', textDecoration: 'none',
                fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '14px', color: '#000',
                boxShadow: '0 4px 16px rgba(37,211,102,0.3)',
              }}
            >
              <MessageCircle size={18} color="#000" />
              WhatsApp
            </a>
          )}
          {post.contactWhatsapp && (
            <a
              href={`tel:${post.contactWhatsapp.replace(/\D/g, '')}`}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                padding: '14px 0', borderRadius: '14px',
                background: '#161B22', border: '1px solid rgba(255,255,255,0.1)',
                textDecoration: 'none',
                fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '14px', color: '#fff',
              }}
            >
              <Phone size={18} color="#fff" />
              Call
            </a>
          )}
          {!waUrl && !post.contactWhatsapp && (
            <div style={{
              padding: '14px 0', borderRadius: '14px',
              background: '#161B22', border: '1px solid rgba(255,255,255,0.07)',
              textAlign: 'center',
              fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: 'rgba(255,255,255,0.35)',
            }}>
              No contact info provided
            </div>
          )}
        </div>

        {/* ── Description ────────────────────────────────────────────────────── */}
        {post.description && (
          <DetailBlock title="About this service">
            <p style={{
              fontFamily: 'DM Sans, sans-serif', fontSize: '14px',
              color: 'rgba(255,255,255,0.75)', lineHeight: 1.7, margin: 0,
            }}>
              {post.description}
            </p>
          </DetailBlock>
        )}

        {/* ── Meta info ──────────────────────────────────────────────────────── */}
        <div style={{
          background: '#161B22', border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: '14px', overflow: 'hidden',
        }}>
          {[
            { label: 'Category',     value: 'Skills & Services' },
            { label: 'Location',     value: post.neighbourhood },
            { label: 'Listed',       value: new Date(post.createdAt).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' }) },
            post.expiresAt
              ? { label: 'Expires',  value: new Date(post.expiresAt).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long' }) }
              : null,
          ].filter(Boolean).map((item, i, arr) => (
            <div
              key={item!.label}
              style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '12px 16px',
                borderBottom: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
              }}
            >
              <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>
                {item!.label}
              </span>
              <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', fontWeight: 600, color: '#fff' }}>
                {item!.value}
              </span>
            </div>
          ))}
        </div>

        {/* ── Safety notice ──────────────────────────────────────────────────── */}
        <div style={{
          background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.15)',
          borderRadius: '12px', padding: '12px 14px',
          display: 'flex', gap: '10px', alignItems: 'flex-start',
        }}>
          <span style={{ fontSize: '16px', flexShrink: 0, lineHeight: 1.4 }}>⚠️</span>
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: 'rgba(255,255,255,0.45)', lineHeight: 1.6, margin: 0 }}>
            Always meet service providers in a public place first. Kayaa does not verify listings — use your judgement.
          </p>
        </div>

        {/* ── Report ─────────────────────────────────────────────────────────── */}
        <a
          href={`mailto:hello@kayaa.co.za?subject=Report listing: ${encodeURIComponent(post.title)}&body=Post ID: ${post.id}%0APlease describe the issue:`}
          style={{
            display: 'block', textAlign: 'center',
            fontFamily: 'DM Sans, sans-serif', fontSize: '12px',
            color: 'rgba(255,255,255,0.2)', textDecoration: 'none',
          }}
        >
          Report this listing
        </a>
      </div>

      {/* ── Share modal ────────────────────────────────────────────────────────── */}
      {shareOpen && (
        <ShareModal
          place={{
            id:       post.id,
            name:     post.title,
            slug:     post.id,
            tagline:  rate ? `${rate} · ${post.neighbourhood}` : post.neighbourhood,
            emoji,
            category: 'services',
          }}
          onClose={() => setShareOpen(false)}
        />
      )}
    </div>
  );
}
