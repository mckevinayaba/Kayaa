import { useState } from 'react';
import { X, Check } from 'lucide-react';

interface PlaceShareModalProps {
  place: {
    id: string;
    name: string;
    slug: string;
    tagline?: string;
    emoji: string;
    category: string;
  };
  onClose: () => void;
}

export function PlaceShareModal({ place, onClose }: PlaceShareModalProps) {
  const [copied, setCopied] = useState(false);

  const shareUrl  = `https://kayaa.co.za/venue/${place.slug}`;
  const shareText = `Check out ${place.emoji} ${place.name} on Kayaa!\n${place.tagline ?? place.category}\n\n`;

  const methods: {
    key: string;
    label: string;
    sublabel: string;
    emoji: string;
    bg: string;
    fg: string;
    action: () => void;
  }[] = [
    {
      key: 'whatsapp',
      label: 'WhatsApp',
      sublabel: 'Share with friends & family',
      emoji: '💬',
      bg: '#25D366',
      fg: '#fff',
      action: () => window.open(`https://wa.me/?text=${encodeURIComponent(shareText + shareUrl)}`, '_blank'),
    },
    {
      key: 'copy',
      label: copied ? 'Copied!' : 'Copy link',
      sublabel: 'Share anywhere',
      emoji: copied ? '✅' : '🔗',
      bg: 'var(--color-surface)',
      fg: 'var(--color-text)',
      action: async () => {
        try {
          await navigator.clipboard.writeText(shareUrl);
          setCopied(true);
          setTimeout(() => { setCopied(false); onClose(); }, 1400);
        } catch {
          // Fallback for non-secure contexts
          const ta = document.createElement('textarea');
          ta.value = shareUrl;
          document.body.appendChild(ta);
          ta.select();
          document.execCommand('copy');
          document.body.removeChild(ta);
          setCopied(true);
          setTimeout(() => { setCopied(false); onClose(); }, 1400);
        }
      },
    },
    {
      key: 'sms',
      label: 'SMS',
      sublabel: 'Send a text message',
      emoji: '📱',
      bg: 'var(--color-surface)',
      fg: 'var(--color-text)',
      action: () => { window.location.href = `sms:?body=${encodeURIComponent(shareText + shareUrl)}`; },
    },
  ];

  const moreOptions: { key: string; label: string; emoji: string; action: () => void }[] = [
    {
      key: 'email',
      label: 'Email',
      emoji: '📧',
      action: () => {
        window.location.href = `mailto:?subject=${encodeURIComponent(`Check out ${place.name} on Kayaa`)}&body=${encodeURIComponent(shareText + shareUrl)}`;
      },
    },
    {
      key: 'twitter',
      label: 'X / Twitter',
      emoji: '𝕏',
      action: () => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`, '_blank'),
    },
    {
      key: 'facebook',
      label: 'Facebook',
      emoji: '📘',
      action: () => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, '_blank'),
    },
  ];

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      }}
    >
      {/* Sheet */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: '480px',
          background: '#161B22',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '20px 20px 0 0',
          overflow: 'hidden',
        }}
      >
        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 4px' }}>
          <div style={{ width: '36px', height: '4px', borderRadius: '2px', background: 'rgba(255,255,255,0.15)' }} />
        </div>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '4px 16px 14px',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
        }}>
          <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '16px', color: '#fff', margin: 0 }}>
            Share {place.emoji} {place.name}
          </h2>
          <button
            onClick={onClose}
            style={{
              width: '32px', height: '32px', borderRadius: '50%',
              background: 'rgba(255,255,255,0.08)', border: 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <X size={16} color="rgba(255,255,255,0.6)" />
          </button>
        </div>

        {/* Primary share options */}
        <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {methods.map(m => (
            <button
              key={m.key}
              onClick={m.action}
              style={{
                display: 'flex', alignItems: 'center', gap: '14px',
                padding: '12px 14px', borderRadius: '14px',
                background: m.bg, border: m.bg === 'var(--color-surface)' ? '1px solid rgba(255,255,255,0.08)' : 'none',
                cursor: 'pointer', width: '100%', textAlign: 'left',
              }}
            >
              <div style={{
                width: '44px', height: '44px', borderRadius: '50%', flexShrink: 0,
                background: m.bg === 'var(--color-surface)' ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.25)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '20px',
              }}>
                {m.key === 'copy' && copied
                  ? <Check size={18} color="#39D98A" />
                  : m.emoji}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '14px', color: m.fg }}>
                  {m.label}
                </div>
                <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: m.bg === '#25D366' ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.45)', marginTop: '1px' }}>
                  {m.sublabel}
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* More options grid */}
        <div style={{ padding: '0 16px 24px' }}>
          <div style={{
            borderTop: '1px solid rgba(255,255,255,0.07)',
            paddingTop: '12px',
            marginBottom: '10px',
          }}>
            <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              More options
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
            {moreOptions.map(m => (
              <button
                key={m.key}
                onClick={m.action}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
                  padding: '12px 8px', borderRadius: '14px',
                  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)',
                  cursor: 'pointer',
                }}
              >
                <span style={{ fontSize: '22px', lineHeight: 1 }}>{m.emoji}</span>
                <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.55)' }}>
                  {m.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
