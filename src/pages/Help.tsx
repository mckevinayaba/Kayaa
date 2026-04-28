import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, MessageCircle, ChevronDown, ChevronUp } from 'lucide-react';

// ── Data ──────────────────────────────────────────────────────────────────────

const HELP_TOPICS = [
  {
    icon: '🏠',
    title: 'Getting Started',
    description: 'Learn how to use Kayaa',
    items: ['How to check in', 'Find places near you', 'Post on the Board'],
  },
  {
    icon: '📍',
    title: 'Places',
    description: 'Managing places and check-ins',
    items: ['Add your place', 'Update opening hours', 'Respond to check-ins'],
  },
  {
    icon: '🔒',
    title: 'Privacy & Safety',
    description: 'Keep your data safe',
    items: ['Privacy settings', 'Anonymous check-ins', 'Report issues'],
  },
  {
    icon: '💬',
    title: 'Community',
    description: 'Board and interactions',
    items: ['Post guidelines', 'Comment etiquette', 'Skills marketplace'],
  },
];

const FAQS = [
  {
    q: 'How do I add my business to Kayaa?',
    a: 'Tap "Add Place" from the bottom navigation, or tap "Add Your Place" on your profile page. Fill in your business details, photos, and opening hours. It\'s completely free.',
  },
  {
    q: 'Can I use Kayaa offline?',
    a: 'Yes! You can check in to places without a data connection. Your check-ins are saved locally and sync automatically when you\'re back online.',
  },
  {
    q: 'Is my identity kept private?',
    a: 'By default, Kayaa is fully anonymous — no account required. If you choose to display a name when checking in, you can control visibility in Privacy Settings.',
  },
  {
    q: 'How do I report inappropriate content?',
    a: 'Email us at hello@kayaa.co.za with the details. Our team reviews all reports within 24 hours.',
  },
  {
    q: 'Is Kayaa free to use?',
    a: 'Yes! Kayaa is completely free for community members. Premium features for business owners may be offered in future.',
  },
  {
    q: 'How do I become a regular at a place?',
    a: 'Check in at the same place 3 or more times. The venue will see you as a regular and your profile will show that place as a favourite.',
  },
];

// ── FAQ accordion item ────────────────────────────────────────────────────────

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{
      background: '#161B22', border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: '14px', overflow: 'hidden',
    }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 16px', background: 'none', border: 'none', cursor: 'pointer',
          textAlign: 'left', gap: '12px',
        }}
      >
        <span style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: '14px', color: '#fff', flex: 1 }}>
          {q}
        </span>
        {open
          ? <ChevronUp  size={16} color="rgba(255,255,255,0.4)" style={{ flexShrink: 0 } as React.CSSProperties} />
          : <ChevronDown size={16} color="rgba(255,255,255,0.4)" style={{ flexShrink: 0 } as React.CSSProperties} />}
      </button>
      {open && (
        <div style={{ padding: '0 16px 14px' }}>
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: 'rgba(255,255,255,0.55)', lineHeight: 1.65, margin: 0 }}>
            {a}
          </p>
        </div>
      )}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function Help() {
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: '100vh', paddingBottom: '40px' }}>

      {/* Header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 40,
        background: 'rgba(13,17,23,0.95)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        padding: '14px 16px',
        display: 'flex', alignItems: 'center', gap: '12px',
      }}>
        <button
          onClick={() => navigate(-1)}
          style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(255,255,255,0.07)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
        >
          <ArrowLeft size={18} color="#fff" />
        </button>
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '18px', color: '#fff', margin: 0 }}>
          Help & Support
        </h1>
      </div>

      <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: '24px' }}>

        {/* Contact CTA row */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <a
            href="https://wa.me/27600000000?text=Hi%20Kayaa%20support%2C%20I%20need%20help%20with..."
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex', alignItems: 'center', gap: '14px',
              padding: '14px 16px', borderRadius: '14px',
              background: '#25D366', textDecoration: 'none',
              boxShadow: '0 4px 16px rgba(37,211,102,0.25)',
            }}
          >
            <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <MessageCircle size={22} color="#fff" />
            </div>
            <div>
              <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '14px', color: '#fff' }}>WhatsApp Support</div>
              <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: 'rgba(255,255,255,0.75)', marginTop: '1px' }}>Get help instantly</div>
            </div>
          </a>

          <a
            href="mailto:hello@kayaa.co.za"
            style={{
              display: 'flex', alignItems: 'center', gap: '14px',
              padding: '14px 16px', borderRadius: '14px',
              background: '#161B22', border: '1px solid rgba(255,255,255,0.07)',
              textDecoration: 'none',
            }}
          >
            <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Mail size={20} color="rgba(255,255,255,0.5)" />
            </div>
            <div>
              <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '14px', color: '#fff' }}>Email Support</div>
              <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginTop: '1px' }}>hello@kayaa.co.za</div>
            </div>
          </a>
        </div>

        {/* Help topics */}
        <div>
          <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '16px', color: '#fff', marginBottom: '14px' }}>
            Help Topics
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {HELP_TOPICS.map(topic => (
              <div
                key={topic.title}
                style={{ padding: '14px 16px', background: '#161B22', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '14px' }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '10px' }}>
                  <span style={{ fontSize: '28px', lineHeight: 1, flexShrink: 0 }}>{topic.icon}</span>
                  <div>
                    <div style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 700, fontSize: '14px', color: '#fff', marginBottom: '2px' }}>
                      {topic.title}
                    </div>
                    <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>
                      {topic.description}
                    </div>
                  </div>
                </div>
                <ul style={{ margin: 0, padding: '0 0 0 42px', display: 'flex', flexDirection: 'column', gap: '6px', listStyle: 'none' }}>
                  {topic.items.map(item => (
                    <li key={item} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#39D98A', flexShrink: 0 }} />
                      <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: 'rgba(255,255,255,0.6)' }}>
                        {item}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div>
          <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '16px', color: '#fff', marginBottom: '14px' }}>
            Frequently Asked Questions
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {FAQS.map(f => <FaqItem key={f.q} q={f.q} a={f.a} />)}
          </div>
        </div>

        {/* Version footer */}
        <div style={{ textAlign: 'center', paddingTop: '8px' }}>
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: 'rgba(255,255,255,0.2)', margin: '0 0 4px' }}>
            Kayaa v1.0.0
          </p>
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: 'rgba(255,255,255,0.2)', margin: 0 }}>
            Built with ❤️ for South African neighbourhoods
          </p>
        </div>
      </div>
    </div>
  );
}
