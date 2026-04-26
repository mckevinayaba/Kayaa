import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { saveCommunityStory } from '../lib/api';
import { getAllCountries } from '../config/countries';

// ─── Floating card data ───────────────────────────────────────────────────────

const FLOAT_CARDS = [
  { emoji: '💈', name: "Gents Barbershop",       area: "Soweto"          },
  { emoji: '🍖', name: "Sizwe Shisanyama",        area: "Tembisa"         },
  { emoji: '🚗', name: "KwaMahlangu Car Wash",    area: "Alexandra"       },
  { emoji: '⛪', name: "New Hope Church Hall",    area: "Khayelitsha"     },
  { emoji: '🛒', name: "Ntombenhle Tuckshop",     area: "Mamelodi"        },
  { emoji: '☕', name: "Corner Café",             area: "Rosebank"        },
  { emoji: '🔧', name: "Trusted Mechanic",        area: "Randburg"        },
  { emoji: '💅', name: "Zanele's Salon",          area: "Sandton"         },
  { emoji: '🍺', name: "Corner Tavern",           area: "Meadowlands"     },
  { emoji: '📍', name: "Community Hall",          area: "Mitchells Plain" },
];

// ─── Place type pills ─────────────────────────────────────────────────────────

const PLACE_PILLS = [
  { emoji: '💈', label: 'Barbershop'   },
  { emoji: '💅', label: 'Salon'        },
  { emoji: '🍖', label: 'Shisanyama'   },
  { emoji: '🚗', label: 'Car Wash'     },
  { emoji: '⛪', label: 'Church Hall'  },
  { emoji: '🛒', label: 'Tuckshop'     },
  { emoji: '☕', label: 'Coffee Shop'  },
  { emoji: '🔧', label: 'Mechanic'     },
  { emoji: '🍺', label: 'Tavern'       },
  { emoji: '📍', label: 'Food Spot'    },
  { emoji: '🏪', label: 'Spaza Shop'   },
  { emoji: '🎵', label: 'Music Studio' },
];

// ─── CSS injected once ────────────────────────────────────────────────────────

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700;800&family=DM+Sans:wght@400;500;600;700&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  .kl-body { font-family: 'DM Sans', sans-serif; background: #0D1117; color: #fff; overflow-x: hidden; }

  /* Floating card animation */
  @keyframes floatUp {
    0%   { transform: translateY(0px) translateX(0px);   opacity: 0.35; }
    25%  { transform: translateY(-18px) translateX(4px);  opacity: 0.4; }
    50%  { transform: translateY(-10px) translateX(-4px); opacity: 0.38; }
    75%  { transform: translateY(-24px) translateX(2px);  opacity: 0.42; }
    100% { transform: translateY(0px) translateX(0px);   opacity: 0.35; }
  }

  /* Scroll bounce */
  @keyframes bounce {
    0%, 100% { transform: translateY(0); }
    50%       { transform: translateY(8px); }
  }

  /* Green pulse glow */
  @keyframes pulseGlow {
    0%, 100% { box-shadow: 0 0 0 0 rgba(57,217,138,0); }
    50%       { box-shadow: 0 0 32px 8px rgba(57,217,138,0.08); }
  }

  /* Section fade in */
  @keyframes fadeInUp {
    from { opacity: 0; transform: translateY(24px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  .kl-float { animation: floatUp var(--dur,14s) ease-in-out var(--delay,0s) infinite; }
  .kl-bounce { animation: bounce 1.8s ease-in-out infinite; }
  .kl-pulse  { animation: pulseGlow 4s ease-in-out infinite; }

  /* Dot grid texture */
  .kl-dots {
    background-image: radial-gradient(rgba(57,217,138,0.06) 1px, transparent 1px);
    background-size: 28px 28px;
  }

  /* Responsive */
  @media (max-width: 767px) {
    .kl-hero-btns { flex-direction: column !important; align-items: stretch !important; }
    .kl-hero-btns a, .kl-hero-btns button { width: 100% !important; }
    .kl-how-grid { grid-template-columns: 1fr !important; }
    .kl-owner-cols { flex-direction: column !important; }
    .kl-country-row { flex-wrap: wrap !important; }
    .kl-final-btns { flex-direction: column !important; align-items: stretch !important; }
    .kl-footer-inner { flex-direction: column !important; align-items: center !important; gap: 16px !important; text-align: center; }
    .kl-footer-links { justify-content: center !important; }
  }

  /* Reduced motion */
  @media (prefers-reduced-motion: reduce) {
    .kl-float, .kl-bounce, .kl-pulse { animation: none !important; }
  }

  /* Nav button */
  .kl-nav-btn {
    background: transparent;
    border: 1.5px solid #39D98A;
    color: #39D98A;
    border-radius: 10px;
    padding: 8px 18px;
    font-family: 'DM Sans', sans-serif;
    font-weight: 700;
    font-size: 14px;
    cursor: pointer;
    transition: background 0.15s, color 0.15s;
    white-space: nowrap;
  }
  .kl-nav-btn:hover { background: #39D98A; color: #000; }

  .kl-btn-primary {
    display: inline-flex; align-items: center; justify-content: center;
    background: #39D98A; color: #000;
    border: none; border-radius: 14px;
    padding: 16px 32px;
    font-family: 'Space Grotesk', 'Syne', sans-serif;
    font-weight: 700; font-size: 16px;
    cursor: pointer; text-decoration: none;
    transition: opacity 0.15s, transform 0.15s;
    white-space: nowrap;
  }
  .kl-btn-primary:hover { opacity: 0.9; transform: translateY(-1px); }

  .kl-btn-outline {
    display: inline-flex; align-items: center; justify-content: center;
    background: transparent; color: #fff;
    border: 1.5px solid rgba(255,255,255,0.25); border-radius: 14px;
    padding: 16px 32px;
    font-family: 'Space Grotesk', 'Syne', sans-serif;
    font-weight: 600; font-size: 16px;
    cursor: pointer; text-decoration: none;
    transition: border-color 0.15s, color 0.15s;
    white-space: nowrap;
  }
  .kl-btn-outline:hover { border-color: #39D98A; color: #39D98A; }

  .kl-how-card:hover { border-color: rgba(57,217,138,0.4) !important; }
  .kl-float-card:hover { border-color: rgba(57,217,138,0.5) !important; box-shadow: 0 0 16px rgba(57,217,138,0.15) !important; }

  .kl-country-card {
    background: #161B22;
    border: 1px solid #21262D;
    border-radius: 16px;
    padding: 20px 18px;
    min-width: 160px;
    flex-shrink: 0;
    transition: border-color 0.15s;
  }
  .kl-country-card:hover { border-color: rgba(57,217,138,0.3); }
`;

// ─── Section 1: Hero ──────────────────────────────────────────────────────────

function Hero() {
  const navigate = useNavigate();

  const floatPositions = [
    { top: '12%',  left: '3%',   dur: '16s', delay: '0s'   },
    { top: '22%',  left: '72%',  dur: '18s', delay: '2.5s' },
    { top: '38%',  left: '1%',   dur: '14s', delay: '1s'   },
    { top: '50%',  left: '78%',  dur: '20s', delay: '4s'   },
    { top: '65%',  left: '5%',   dur: '17s', delay: '0.5s' },
    { top: '72%',  left: '65%',  dur: '15s', delay: '3s'   },
    { top: '14%',  left: '55%',  dur: '19s', delay: '6s'   },
    { top: '80%',  left: '30%',  dur: '13s', delay: '2s'   },
    { top: '42%',  left: '60%',  dur: '22s', delay: '7s'   },
    { top: '58%',  left: '40%',  dur: '16s', delay: '5s'   },
  ];

  return (
    <section style={{
      position: 'relative', minHeight: '100vh',
      background: '#0D1117', overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Nav */}
      <nav style={{
        position: 'relative', zIndex: 10,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '20px 24px',
      }}>
        <span style={{
          fontFamily: "'Space Grotesk', 'Syne', sans-serif",
          fontWeight: 800, fontSize: '22px', color: '#39D98A',
          letterSpacing: '-0.5px',
        }}>kayaa</span>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button
            onClick={() => navigate('/login')}
            style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              color: 'rgba(255,255,255,0.6)', fontSize: '14px', fontWeight: 600,
              fontFamily: "'DM Sans', sans-serif",
            }}
          >Sign in</button>
          <button className="kl-nav-btn" onClick={() => navigate('/onboarding')}>
            Add your place →
          </button>
        </div>
      </nav>

      {/* Floating cards (background layer) */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none' }}>
        {FLOAT_CARDS.map((card, i) => {
          const pos = floatPositions[i];
          return (
            <div
              key={i}
              className="kl-float kl-float-card"
              style={{
                position: 'absolute',
                top: pos.top, left: pos.left,
                '--dur': pos.dur, '--delay': pos.delay,
                background: '#161B22',
                border: '1px solid #21262D',
                borderRadius: '12px',
                padding: '10px 14px',
                opacity: 0.35,
                fontSize: '12px',
                color: 'rgba(255,255,255,0.7)',
                fontFamily: "'DM Sans', sans-serif",
                fontWeight: 600,
                whiteSpace: 'nowrap',
                transition: 'border-color 0.3s, box-shadow 0.3s',
              } as React.CSSProperties}
            >
              {card.emoji} {card.name} · {card.area}
            </div>
          );
        })}
      </div>

      {/* Subtle radial glow */}
      <div style={{
        position: 'absolute', top: '40%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '600px', height: '600px',
        background: 'radial-gradient(circle, rgba(57,217,138,0.06) 0%, transparent 70%)',
        pointerEvents: 'none', zIndex: 1,
      }} />

      {/* Hero content */}
      <div style={{
        position: 'relative', zIndex: 2,
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '40px 24px',
        textAlign: 'center',
      }}>
        {/* Eyebrow */}
        <p style={{
          fontSize: '11px', fontWeight: 700, color: '#39D98A',
          letterSpacing: '0.12em', textTransform: 'uppercase',
          marginBottom: '24px', fontFamily: "'DM Sans', sans-serif",
        }}>
          Community Research Brief 001
        </p>

        {/* Main headline */}
        <h1 style={{
          fontFamily: "'Space Grotesk', 'Syne', sans-serif",
          fontWeight: 800, fontSize: 'clamp(36px, 7vw, 72px)',
          color: '#fff', lineHeight: 1.1,
          marginBottom: '20px', maxWidth: '820px',
          letterSpacing: '-1px',
        }}>
          We say support local.<br />
          But we cannot even find local.
        </h1>

        {/* Subheadline */}
        <p style={{
          fontSize: 'clamp(16px, 2.5vw, 20px)',
          color: '#6B7280', lineHeight: 1.6,
          marginBottom: '40px', maxWidth: '560px',
          fontFamily: "'DM Sans', sans-serif",
        }}>
          The places that hold neighbourhood life together
          are still invisible online.
        </p>

        {/* CTAs */}
        <div className="kl-hero-btns" style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button className="kl-btn-primary" onClick={() => navigate('/feed')}>
            Explore your neighbourhood →
          </button>
          <button className="kl-btn-outline" onClick={() => navigate('/onboarding')}>
            Add your place — it's free
          </button>
        </div>
      </div>

      {/* Scroll indicator */}
      <div style={{
        position: 'relative', zIndex: 2,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        paddingBottom: '28px', gap: '8px',
      }}>
        <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.28)', fontFamily: "'DM Sans', sans-serif", letterSpacing: '0.04em' }}>
          Scroll to see what kayaa is building
        </p>
        <div className="kl-bounce" style={{ fontSize: '18px', opacity: 0.4 }}>↓</div>
      </div>
    </section>
  );
}

// ─── Section 2: The Truth ─────────────────────────────────────────────────────

function TheTruth() {
  return (
    <section style={{ background: '#0D1117', padding: '100px 24px' }}>
      <div style={{ maxWidth: '680px', margin: '0 auto', textAlign: 'center' }}>
        {/* Large quote */}
        <blockquote style={{
          fontFamily: "'Space Grotesk', 'Syne', sans-serif",
          fontWeight: 700, fontSize: 'clamp(22px, 4vw, 36px)',
          color: '#fff', lineHeight: 1.35,
          marginBottom: '48px',
          borderLeft: 'none', fontStyle: 'normal',
        }}>
          "The places that hold our lives together
          are still invisible online."
        </blockquote>

        {/* Place type pills */}
        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: '10px',
          justifyContent: 'center', marginBottom: '40px',
        }}>
          {PLACE_PILLS.map(p => (
            <span key={p.label} style={{
              background: '#161B22', border: '1px solid #21262D',
              borderRadius: '999px', padding: '8px 16px',
              fontSize: '13px', fontWeight: 600, color: 'rgba(255,255,255,0.75)',
              fontFamily: "'DM Sans', sans-serif",
            }}>
              {p.emoji} {p.label}
            </span>
          ))}
        </div>

        <p style={{ fontSize: '18px', color: '#6B7280', marginBottom: '32px', lineHeight: 1.6, fontFamily: "'DM Sans', sans-serif" }}>
          Trusted for years. Full every weekend.
          Still hard to find.
        </p>

        <p style={{ fontSize: '20px', fontWeight: 700, color: '#fff', marginBottom: '28px', fontFamily: "'Space Grotesk', 'Syne', sans-serif" }}>
          And this is not only a township problem.
        </p>

        <p style={{ fontSize: '16px', color: '#6B7280', lineHeight: 1.8, marginBottom: '32px', fontFamily: "'DM Sans', sans-serif", fontStyle: 'italic' }}>
          The family coffee shop in Rosebank.<br />
          The trusted mechanic in Randburg.<br />
          The salon in Sandton. The food spot in Maboneng.<br />
          The church hall in Midrand.
        </p>

        <p style={{
          fontSize: '22px', fontWeight: 700,
          color: '#39D98A', fontFamily: "'Space Grotesk', 'Syne', sans-serif",
        }}>
          Different streets. Same wound.
        </p>
      </div>
    </section>
  );
}

// ─── Section 3: How it Works ──────────────────────────────────────────────────

function HowItWorks() {
  const cards = [
    {
      icon: '📍', step: 'DISCOVER',
      title: "Find what's happening nearby",
      body: 'See which local places are open, busy, or hosting something today. Real places. Real people. Your area.',
    },
    {
      icon: '✅', step: 'CHECK IN',
      title: 'Check in where you belong',
      body: 'Walk in. Tap check in. Build your regulars identity over time. No payment needed. No booking required.',
    },
    {
      icon: '🏡', step: 'BELONG',
      title: 'Become a neighbourhood regular',
      body: 'The more you check in, the more your local places know you. Earn your Regular status. Unlock regulars-only posts.',
    },
  ];

  return (
    <section style={{ background: '#0D1117', padding: '100px 24px', borderTop: '1px solid #21262D' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        {/* Eyebrow */}
        <p style={{ fontSize: '11px', fontWeight: 700, color: '#39D98A', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '14px', textAlign: 'center', fontFamily: "'DM Sans', sans-serif" }}>
          HOW IT WORKS
        </p>
        <h2 style={{ fontFamily: "'Space Grotesk', 'Syne', sans-serif", fontWeight: 700, fontSize: 'clamp(26px, 4vw, 40px)', color: '#fff', textAlign: 'center', marginBottom: '56px' }}>
          Three things. That's it.
        </h2>

        <div className="kl-how-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
          {cards.map(card => (
            <div
              key={card.step}
              className="kl-how-card"
              style={{
                background: '#161B22', border: '1px solid #21262D',
                borderRadius: '20px', padding: '32px 28px',
                transition: 'border-color 0.2s',
              }}
            >
              <div style={{ fontSize: '48px', marginBottom: '18px' }}>{card.icon}</div>
              <p style={{ fontSize: '10px', fontWeight: 700, color: '#39D98A', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '10px', fontFamily: "'DM Sans', sans-serif" }}>
                {card.step}
              </p>
              <h3 style={{ fontFamily: "'Space Grotesk', 'Syne', sans-serif", fontWeight: 700, fontSize: '18px', color: '#fff', marginBottom: '12px', lineHeight: 1.3 }}>
                {card.title}
              </h3>
              <p style={{ fontSize: '14px', color: '#6B7280', lineHeight: 1.7, fontFamily: "'DM Sans', sans-serif" }}>
                {card.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Section 4: For Place Owners ─────────────────────────────────────────────

function DashboardMockup() {
  const rows = [
    { color: '#39D98A', name: 'Thabo',  badge: 'Regular',   visits: 11, time: '2 mins ago'  },
    { color: '#39D98A', name: 'Sipho',  badge: 'Loyal',     visits: 18, time: '14 mins ago' },
    { color: '#F59E0B', name: 'Lerato', badge: 'Newcomer',  visits: 1,  time: '1 hr ago'    },
  ];

  return (
    <div style={{
      background: '#0D1117', borderRadius: '28px',
      border: '6px solid #21262D',
      padding: '20px', maxWidth: '300px', margin: '0 auto',
      fontFamily: "'DM Sans', sans-serif",
      boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
    }}>
      {/* Header */}
      <p style={{ fontSize: '12px', fontWeight: 700, color: '#fff', marginBottom: '16px', lineHeight: 1.4 }}>
        Good morning, Sbu's Cuts ☀️
      </p>

      {/* 4 stat tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px' }}>
        {[
          { label: 'Today',     value: '12' },
          { label: 'This Week', value: '47' },
          { label: 'Lapsed',    value: '3', warn: true },
          { label: 'New Faces', value: '2' },
        ].map(stat => (
          <div key={stat.label} style={{
            background: '#161B22', border: '1px solid #21262D',
            borderRadius: '12px', padding: '12px 10px',
          }}>
            <div style={{ fontSize: '20px', fontWeight: 800, color: stat.warn ? '#F59E0B' : '#39D98A', lineHeight: 1 }}>
              {stat.value}
            </div>
            <div style={{ fontSize: '10px', color: '#6B7280', marginTop: '4px' }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Visitor list */}
      <p style={{ fontSize: '10px', fontWeight: 700, color: '#6B7280', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        Today's visitors
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {rows.map(row => (
          <div key={row.name} style={{
            background: '#161B22', border: '1px solid #21262D',
            borderRadius: '10px', padding: '10px 12px',
            display: 'flex', alignItems: 'center', gap: '10px',
          }}>
            <div style={{
              width: '28px', height: '28px', borderRadius: '50%',
              background: `${row.color}20`, border: `1.5px solid ${row.color}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '11px', fontWeight: 800, color: row.color, flexShrink: 0,
            }}>
              {row.name[0]}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#fff' }}>{row.name}</div>
              <div style={{ fontSize: '10px', color: '#6B7280' }}>Visit #{row.visits} · {row.time}</div>
            </div>
            <span style={{
              fontSize: '9px', fontWeight: 700,
              color: row.color, background: `${row.color}18`,
              padding: '2px 7px', borderRadius: '20px',
            }}>{row.badge}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ForOwners() {
  const navigate = useNavigate();
  const features = [
    'See who your real regulars are',
    "Know who hasn't visited in 14+ days",
    'Send a WhatsApp nudge in one tap',
    'Download your Community Proof Report',
    'Post events and stories to your regulars',
    'Get discovered by people nearby',
  ];

  return (
    <section style={{ background: '#0D1117', padding: '100px 24px', borderTop: '1px solid #21262D' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        <div className="kl-owner-cols" style={{ display: 'flex', gap: '64px', alignItems: 'center' }}>
          {/* Left */}
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '11px', fontWeight: 700, color: '#39D98A', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '14px', fontFamily: "'DM Sans', sans-serif" }}>
              FOR PLACE OWNERS
            </p>
            <h2 style={{ fontFamily: "'Space Grotesk', 'Syne', sans-serif", fontWeight: 800, fontSize: 'clamp(26px, 4vw, 40px)', color: '#fff', marginBottom: '24px', lineHeight: 1.2 }}>
              Your community is real.<br />Now make it visible.
            </h2>
            <p style={{ fontSize: '16px', color: '#6B7280', lineHeight: 1.7, marginBottom: '16px', fontFamily: "'DM Sans', sans-serif" }}>
              You already know your regulars by face. You know who comes every Saturday. You know who disappeared three weeks ago.
            </p>
            <p style={{ fontSize: '16px', color: '#6B7280', lineHeight: 1.7, marginBottom: '32px', fontFamily: "'DM Sans', sans-serif" }}>
              kayaa gives that knowledge a record. So you can reach them when it's quiet. So you can prove your community exists to a bank, a brand, or a partner.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '36px' }}>
              {features.map(f => (
                <div key={f} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <span style={{ color: '#39D98A', fontWeight: 700, fontSize: '16px', flexShrink: 0 }}>✓</span>
                  <span style={{ fontSize: '15px', color: 'rgba(255,255,255,0.75)', fontFamily: "'DM Sans', sans-serif" }}>{f}</span>
                </div>
              ))}
            </div>

            <button
              className="kl-btn-primary"
              onClick={() => navigate('/onboarding')}
              style={{ width: '100%', maxWidth: '360px' }}
            >
              Add your place — it's free →
            </button>
          </div>

          {/* Right: Dashboard mockup */}
          <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
            <DashboardMockup />
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Section 5: Research Brief / Community Stories ────────────────────────────

function ResearchBrief() {
  const [form, setForm] = useState({ place_name: '', place_type: '', story: '', contact: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [err, setErr] = useState('');

  function set(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [key]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.place_name.trim()) { setErr('Please enter a place name'); return; }
    setSubmitting(true); setErr('');
    const { error } = await saveCommunityStory({
      place_name: form.place_name.trim(),
      place_type: form.place_type.trim() || undefined,
      story: form.story.trim() || undefined,
      contact: form.contact.trim() || undefined,
    });
    setSubmitting(false);
    if (error) { setErr('Could not save. Please try again.'); return; }
    setSubmitted(true);
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', background: '#0D1117',
    border: '1px solid #21262D', borderRadius: '12px',
    padding: '14px 16px', color: '#fff', fontSize: '15px',
    fontFamily: "'DM Sans', sans-serif", outline: 'none',
    boxSizing: 'border-box', transition: 'border-color 0.15s',
  };

  return (
    <section className="kl-dots" style={{ background: '#0D1117', padding: '100px 24px', borderTop: '1px solid #21262D' }}>
      <div style={{ maxWidth: '640px', margin: '0 auto', textAlign: 'center' }}>
        {/* Label */}
        <p style={{ fontSize: '11px', fontWeight: 700, color: '#39D98A', letterSpacing: '0.1em', marginBottom: '24px', fontFamily: "'DM Sans', sans-serif" }}>
          kayaa · Community Research Brief 001
        </p>

        {/* Question */}
        <h2 style={{ fontFamily: "'Space Grotesk', 'Syne', sans-serif", fontWeight: 800, fontSize: 'clamp(26px, 4vw, 40px)', color: '#fff', marginBottom: '20px', lineHeight: 1.25 }}>
          What is that place in your area?
        </h2>

        <p style={{ fontSize: '17px', color: '#6B7280', lineHeight: 1.7, marginBottom: '48px', fontFamily: "'DM Sans', sans-serif" }}>
          "The one that keeps pulling people back.<br />
          The one that would hurt if it closed.<br />
          The one whose story deserves to be told."
        </p>

        {/* Example card */}
        <div style={{
          background: '#161B22',
          border: '1px solid #21262D',
          borderLeft: '4px solid #39D98A',
          borderRadius: '14px',
          padding: '20px 24px',
          textAlign: 'left',
          marginBottom: '56px',
        }}>
          <p style={{ fontSize: '12px', fontWeight: 700, color: '#39D98A', marginBottom: '8px', fontFamily: "'DM Sans', sans-serif" }}>
            📍 KwaMahlangu Car Wash · Car wash · Alexandra
          </p>
          <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.7)', lineHeight: 1.7, fontFamily: "'DM Sans', sans-serif", fontStyle: 'italic' }}>
            "Even now, people come for more than the wash. They come for the conversations, the connections, and the feeling of being part of something."
          </p>
        </div>

        {/* Form */}
        {submitted ? (
          <div style={{
            background: 'rgba(57,217,138,0.08)',
            border: '1px solid rgba(57,217,138,0.25)',
            borderRadius: '16px', padding: '32px 24px',
          }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>🙏</div>
            <p style={{ fontFamily: "'Space Grotesk', 'Syne', sans-serif", fontWeight: 700, fontSize: '18px', color: '#fff', marginBottom: '8px' }}>
              Thank you.
            </p>
            <p style={{ fontSize: '15px', color: '#6B7280', lineHeight: 1.6, fontFamily: "'DM Sans', sans-serif" }}>
              This place is now part of the kayaa community archive.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ textAlign: 'left' }}>
            <p style={{ fontSize: '18px', fontWeight: 700, color: '#fff', marginBottom: '24px', textAlign: 'center', fontFamily: "'Space Grotesk', 'Syne', sans-serif" }}>
              Tell us yours:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
              <input
                type="text" value={form.place_name}
                onChange={set('place_name')}
                placeholder="Place name"
                style={{ ...inputStyle, border: `1px solid ${err ? '#EF4444' : '#21262D'}` }}
              />
              <input
                type="text" value={form.place_type}
                onChange={set('place_type')}
                placeholder="What kind of place is it?"
                style={inputStyle}
              />
              <textarea
                value={form.story}
                onChange={set('story')}
                placeholder="One thing that makes it matter (a story, a memory, a detail)"
                rows={4}
                style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }}
              />
              <input
                type="text" value={form.contact}
                onChange={set('contact')}
                placeholder="Your WhatsApp or email (optional)"
                style={inputStyle}
              />
            </div>
            {err && <p style={{ fontSize: '13px', color: '#EF4444', marginBottom: '12px', fontFamily: "'DM Sans', sans-serif" }}>{err}</p>}
            <button
              type="submit"
              disabled={submitting}
              className="kl-btn-primary"
              style={{ width: '100%', opacity: submitting ? 0.7 : 1 }}
            >
              {submitting ? 'Saving…' : 'Share this place →'}
            </button>
            <p style={{ fontSize: '12px', color: '#6B7280', textAlign: 'center', marginTop: '16px', lineHeight: 1.6, fontFamily: "'DM Sans', sans-serif" }}>
              These stories help us build kayaa for the places that matter most.
            </p>
          </form>
        )}
      </div>
    </section>
  );
}

// ─── Section 6: Africa Expansion ─────────────────────────────────────────────

function AfricaExpansion() {
  const countries = getAllCountries();
  const [notifyContact, setNotifyContact] = useState('');
  const [notifyCountry, setNotifyCountry] = useState('KE');
  const [notifyDone, setNotifyDone] = useState(false);
  const [notifySubmitting, setNotifySubmitting] = useState(false);

  async function handleNotify(e: React.FormEvent) {
    e.preventDefault();
    if (!notifyContact.trim()) return;
    setNotifySubmitting(true);
    // Import joinCountryWaitlist dynamically to avoid circular deps
    const { joinCountryWaitlist } = await import('../lib/api');
    await joinCountryWaitlist(notifyCountry, notifyContact.trim());
    setNotifySubmitting(false);
    setNotifyDone(true);
  }

  return (
    <section style={{ background: '#0D1117', padding: '100px 24px', borderTop: '1px solid #21262D' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        {/* Heading */}
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <h2 style={{ fontFamily: "'Space Grotesk', 'Syne', sans-serif", fontWeight: 700, fontSize: 'clamp(24px, 4vw, 36px)', color: '#fff', marginBottom: '12px' }}>
            kayaa is building across Africa
          </h2>
          <p style={{ fontSize: '16px', color: '#6B7280', fontFamily: "'DM Sans', sans-serif" }}>
            South Africa first. The continent next.
          </p>
        </div>

        {/* Country cards */}
        <div className="kl-country-row" style={{ display: 'flex', gap: '14px', overflowX: 'auto', paddingBottom: '8px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '48px' }}>
          {countries.map(c => (
            <div key={c.code} className="kl-country-card">
              <div style={{ fontSize: '36px', marginBottom: '10px' }}>{c.flag}</div>
              <div style={{ fontFamily: "'Space Grotesk', 'Syne', sans-serif", fontWeight: 700, fontSize: '14px', color: '#fff', marginBottom: '8px' }}>
                {c.name}
              </div>
              <span style={{
                fontSize: '10px', fontWeight: 700,
                color: c.active ? '#39D98A' : '#F59E0B',
                background: c.active ? 'rgba(57,217,138,0.12)' : 'rgba(245,158,11,0.12)',
                border: `1px solid ${c.active ? 'rgba(57,217,138,0.25)' : 'rgba(245,158,11,0.25)'}`,
                padding: '3px 8px', borderRadius: '20px',
                display: 'inline-block',
              }}>
                {c.active ? '🟢 Live now' : '🟡 Coming soon'}
              </span>
            </div>
          ))}
        </div>

        {/* Notify form */}
        <div style={{ maxWidth: '480px', margin: '0 auto', textAlign: 'center' }}>
          <p style={{ fontSize: '15px', fontWeight: 600, color: '#fff', marginBottom: '16px', fontFamily: "'DM Sans', sans-serif" }}>
            Want kayaa in your city?
          </p>
          {notifyDone ? (
            <p style={{ fontSize: '14px', color: '#39D98A', fontFamily: "'DM Sans', sans-serif" }}>
              ✓ We'll let you know when kayaa arrives.
            </p>
          ) : (
            <form onSubmit={handleNotify} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <select
                value={notifyCountry}
                onChange={e => setNotifyCountry(e.target.value)}
                style={{
                  background: '#161B22', border: '1px solid #21262D',
                  borderRadius: '10px', padding: '12px 14px',
                  color: '#fff', fontSize: '14px', fontFamily: "'DM Sans', sans-serif",
                  cursor: 'pointer', outline: 'none',
                }}
              >
                {countries.filter(c => !c.active).map(c => (
                  <option key={c.code} value={c.code}>{c.flag} {c.name}</option>
                ))}
              </select>
              <input
                type="text" value={notifyContact}
                onChange={e => setNotifyContact(e.target.value)}
                placeholder="Your phone or email"
                style={{
                  flex: 1, background: '#161B22', border: '1px solid #21262D',
                  borderRadius: '10px', padding: '12px 14px', color: '#fff',
                  fontSize: '14px', fontFamily: "'DM Sans', sans-serif", outline: 'none',
                  minWidth: '160px',
                }}
              />
              <button
                type="submit" disabled={notifySubmitting}
                className="kl-btn-primary"
                style={{ padding: '12px 20px', fontSize: '14px', borderRadius: '10px', opacity: notifySubmitting ? 0.7 : 1 }}
              >
                {notifySubmitting ? '…' : 'Notify me'}
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}

// ─── Section 7: Final CTA ─────────────────────────────────────────────────────

function FinalCTA() {
  const navigate = useNavigate();

  return (
    <section style={{
      minHeight: '100vh', background: '#0D1117',
      borderTop: '1px solid #21262D',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '80px 24px', position: 'relative', overflow: 'hidden',
    }}>
      {/* Green glow */}
      <div style={{
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%,-50%)',
        width: '500px', height: '500px',
        background: 'radial-gradient(circle, rgba(57,217,138,0.07) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', maxWidth: '600px' }}>
        <h2 style={{
          fontFamily: "'Space Grotesk', 'Syne', sans-serif",
          fontWeight: 800, fontSize: 'clamp(32px, 6vw, 64px)',
          color: '#fff', lineHeight: 1.1, marginBottom: '4px',
        }}>
          Every place that makes a neighbourhood.
        </h2>
        <h2 style={{
          fontFamily: "'Space Grotesk', 'Syne', sans-serif",
          fontWeight: 800, fontSize: 'clamp(32px, 6vw, 64px)',
          color: '#39D98A', lineHeight: 1.1, marginBottom: '28px',
        }}>
          One network.
        </h2>
        <p style={{ fontSize: '17px', color: '#6B7280', lineHeight: 1.7, marginBottom: '40px', fontFamily: "'DM Sans', sans-serif" }}>
          Find your local places. Check in. Become a regular. Or add your place and let your community find you.
        </p>
        <div className="kl-final-btns" style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '32px' }}>
          <button className="kl-btn-primary" onClick={() => navigate('/feed')}>
            Explore kayaa →
          </button>
          <button className="kl-btn-outline" onClick={() => navigate('/onboarding')}>
            Add your place — free
          </button>
        </div>
        <p style={{ fontSize: '12px', color: '#6B7280', fontFamily: "'DM Sans', sans-serif", lineHeight: 1.8 }}>
          South Africa · Kenya · Nigeria · Ghana · Cameroon<br />
          © 2026 kayaa · Built in South Africa · For every neighbourhood
        </p>
      </div>
    </section>
  );
}

// ─── Section 8: Footer ────────────────────────────────────────────────────────

function Footer() {
  const navigate = useNavigate();
  const links = ['Feed', 'Board', 'Add Place', 'Countries', 'Sign in'];
  const hrefs = ['/feed', '/board', '/onboarding', '/countries', '/login'];

  return (
    <footer style={{ background: '#161B22', borderTop: '1px solid #21262D', padding: '24px' }}>
      <div className="kl-footer-inner" style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
        <span style={{ fontFamily: "'Space Grotesk', 'Syne', sans-serif", fontWeight: 800, fontSize: '18px', color: '#39D98A' }}>kayaa</span>
        <div className="kl-footer-links" style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', justifyContent: 'center' }}>
          {links.map((label, i) => (
            <button
              key={label}
              onClick={() => navigate(hrefs[i])}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: '#6B7280', fontSize: '13px', fontWeight: 600,
                fontFamily: "'DM Sans', sans-serif",
                transition: 'color 0.15s', padding: 0,
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <span style={{ fontSize: '13px', color: '#6B7280', fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap' }}>
          Built in South Africa 🇿🇦
        </span>
      </div>
    </footer>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <div className="kl-body">
      <style>{CSS}</style>
      <Hero />
      <TheTruth />
      <HowItWorks />
      <ForOwners />
      <ResearchBrief />
      <AfricaExpansion />
      <FinalCTA />
      <Footer />
    </div>
  );
}
