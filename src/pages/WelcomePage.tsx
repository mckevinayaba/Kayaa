import { useState } from 'react';
import { Navigate, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// ── Google "G" icon ───────────────────────────────────────────────────────────
function GoogleG() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57C21.36 18.45 22.56 15.57 22.56 12.25z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

// ── Business category grid data ───────────────────────────────────────────────
const BIZ_CATEGORIES = [
  { emoji: '✂️',  label: 'Beauty'    },
  { emoji: '🍽️', label: 'Food'      },
  { emoji: '🏪',  label: 'Spaza'     },
  { emoji: '📚',  label: 'School'    },
  { emoji: '🚗',  label: 'Car Wash'  },
  { emoji: '🔧',  label: 'Mechanic'  },
  { emoji: '🏥',  label: 'Clinic'    },
  { emoji: '🛏️', label: 'Stay'      },
];

// ── Friendly error messages ───────────────────────────────────────────────────
function friendlyError(raw: string): string {
  const l = raw.toLowerCase();
  if (l.includes('rate') || l.includes('limit') || l.includes('too many'))
    return 'Too many requests — wait a minute, then try again.';
  if (l.includes('invalid') || l.includes('format'))
    return 'Check your email address and try again.';
  return raw;
}

// ── Divider ───────────────────────────────────────────────────────────────────
function Divider() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '2px 0' }}>
      <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.07)' }} />
      <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.2)' }}>or</span>
      <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.07)' }} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

type Step = 'welcome' | 'email' | 'sent';

export default function WelcomePage() {
  const { signIn, signInWithGoogle, user } = useAuth();
  const navigate = useNavigate();

  const [step,          setStep]          = useState<Step>('welcome');
  const [email,         setEmail]         = useState('');
  const [emailLoading,  setEmailLoading]  = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error,         setError]         = useState('');

  if (user) return <Navigate to="/feed" replace />;

  // ── Handlers ────────────────────────────────────────────────────────────────
  async function handleGoogle() {
    setGoogleLoading(true);
    setError('');
    const { error: e } = await signInWithGoogle();
    if (e) {
      setError(friendlyError(e.message));
      setGoogleLoading(false);
    }
  }

  async function handleEmailSend() {
    const trimmed = email.trim();
    if (!trimmed) { setError('Enter your email address.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError('Enter a valid email address.');
      return;
    }
    setEmailLoading(true);
    setError('');
    const { error: e } = await signIn(trimmed);
    setEmailLoading(false);
    if (e) { setError(friendlyError(e.message)); return; }
    localStorage.setItem('kayaa_pending_email', trimmed);
    setStep('sent');
  }

  // ── Email sent screen ────────────────────────────────────────────────────────
  if (step === 'sent') {
    return (
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '40px 24px 60px', textAlign: 'center',
      }}>
        <div style={{
          width: '64px', height: '64px', borderRadius: '50%',
          background: 'rgba(57,217,138,0.08)', border: '1.5px solid rgba(57,217,138,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: '20px', fontSize: '28px',
        }}>
          ✉️
        </div>

        <h1 style={{
          fontFamily: 'Syne, sans-serif', fontWeight: 800,
          fontSize: '22px', color: '#F0F6FC',
          marginBottom: '8px', lineHeight: 1.25,
        }}>
          Check your inbox
        </h1>
        <p style={{
          fontFamily: 'DM Sans, sans-serif', fontSize: '14px',
          color: 'rgba(255,255,255,0.5)', lineHeight: 1.6,
          marginBottom: '4px',
        }}>
          We sent a sign-in link to
        </p>
        <p style={{
          fontFamily: 'DM Sans, sans-serif', fontSize: '15px',
          fontWeight: 700, color: '#F0F6FC', marginBottom: '28px',
        }}>
          {email}
        </p>

        <div style={{
          background: '#161B22', border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: '14px', padding: '16px 18px',
          marginBottom: '24px', width: '100%', textAlign: 'left',
        }}>
          {['Open the email from Kayaa', 'Tap "Sign in to Kayaa"', "You're in ✓"].map((text, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: i < 2 ? '10px' : 0 }}>
              <div style={{
                width: '20px', height: '20px', borderRadius: '50%',
                background: 'rgba(57,217,138,0.12)', border: '1px solid rgba(57,217,138,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, fontSize: '10px', fontWeight: 700, color: '#39D98A',
                fontFamily: 'DM Sans, sans-serif',
              }}>
                {i + 1}
              </div>
              <span style={{
                fontSize: '13px', color: 'rgba(255,255,255,0.7)',
                fontFamily: 'DM Sans, sans-serif', lineHeight: 1.5, paddingTop: '2px',
              }}>
                {text}
              </span>
            </div>
          ))}
          <div style={{
            marginTop: '12px', paddingTop: '10px',
            borderTop: '1px solid rgba(255,255,255,0.05)',
            fontSize: '11px', color: 'rgba(255,255,255,0.25)',
            fontFamily: 'DM Sans, sans-serif',
          }}>
            ⏳ Link expires in 1 hour
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', width: '100%' }}>
          <a href="https://mail.google.com" target="_blank" rel="noopener noreferrer" style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
            minHeight: '48px', background: '#39D98A', color: '#0D1117',
            borderRadius: '12px', textDecoration: 'none',
            fontFamily: 'DM Sans, sans-serif', fontWeight: 700, fontSize: '14px',
          }}>
            Open Gmail
          </a>
          <a href="https://outlook.live.com" target="_blank" rel="noopener noreferrer" style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
            minHeight: '48px', background: '#161B22', color: 'rgba(255,255,255,0.6)',
            border: '1px solid rgba(255,255,255,0.09)',
            borderRadius: '12px', textDecoration: 'none',
            fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: '14px',
          }}>
            Open Outlook
          </a>
        </div>

        <button
          onClick={() => { setStep('welcome'); setEmail(''); setError(''); localStorage.removeItem('kayaa_pending_email'); }}
          style={{
            background: 'transparent', border: 'none',
            color: 'rgba(255,255,255,0.3)', fontSize: '13px',
            fontFamily: 'DM Sans, sans-serif', cursor: 'pointer',
          }}
        >
          ← Use a different method
        </button>
      </div>
    );
  }

  // ── Main welcome screen ──────────────────────────────────────────────────────
  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      padding: '0 20px 44px',
    }}>

      {/* Back to landing */}
      <div style={{ paddingTop: '18px', paddingBottom: '4px' }}>
        <Link to="/about" style={{
          fontFamily: 'DM Sans, sans-serif', fontSize: '13px',
          color: 'rgba(255,255,255,0.32)', textDecoration: 'none',
        }}>
          ← Back
        </Link>
      </div>

      {/* ── Hero ──────────────────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        textAlign: 'center', paddingTop: '28px', paddingBottom: '4px',
      }}>

        {/* 1. Logo */}
        <div style={{
          fontFamily: 'Syne, sans-serif', fontWeight: 800,
          fontSize: '34px', color: '#39D98A',
          letterSpacing: '-1.5px', lineHeight: 1,
          marginBottom: '18px',
        }}>
          kayaa
        </div>

        {/* 2. Headline */}
        <h1 style={{
          fontFamily: 'Syne, sans-serif', fontWeight: 800,
          fontSize: '22px', color: '#F0F6FC',
          lineHeight: 1.3, marginBottom: '8px',
          maxWidth: '286px',
        }}>
          Your neighbourhood's businesses, all here.
        </h1>

        {/* 3. Supporting line */}
        <p style={{
          fontFamily: 'DM Sans, sans-serif', fontSize: '14px',
          color: 'rgba(255,255,255,0.45)', lineHeight: 1.6,
          maxWidth: '270px', marginBottom: '24px',
        }}>
          Find nearby businesses and local updates in one place.
        </p>

        {/* 4. Business category grid — 4×2 */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '5px',
          width: '100%',
          maxWidth: '316px',
          marginBottom: '20px',
        }}>
          {BIZ_CATEGORIES.map(({ emoji, label }) => (
            <div
              key={label}
              style={{
                background: '#161B22',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: '10px',
                padding: '10px 4px 9px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              <span style={{ fontSize: '18px', lineHeight: 1, opacity: 0.88 }}>{emoji}</span>
              <span style={{
                fontFamily: 'DM Sans, sans-serif',
                fontSize: '9px',
                fontWeight: 700,
                color: 'rgba(255,255,255,0.38)',
                textTransform: 'uppercase' as const,
                letterSpacing: '0.05em',
                lineHeight: 1,
              }}>
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Owner callout ─────────────────────────────────────────────────────── */}
      <button
        onClick={() => navigate('/onboarding')}
        style={{
          width: '100%', padding: '14px 16px',
          marginBottom: '20px',
          background: 'rgba(57,217,138,0.05)',
          border: '1px solid rgba(57,217,138,0.18)',
          borderRadius: '12px', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: '12px',
          textAlign: 'left',
        }}
      >
        <span style={{ fontSize: '22px', flexShrink: 0 }}>🏪</span>
        <div>
          <div style={{
            fontFamily: 'Syne, sans-serif', fontWeight: 700,
            fontSize: '14px', color: '#39D98A',
            lineHeight: 1.2, marginBottom: '2px',
          }}>
            Own a business?
          </div>
          <div style={{
            fontFamily: 'DM Sans, sans-serif', fontSize: '12px',
            color: 'rgba(255,255,255,0.45)', lineHeight: 1.5,
          }}>
            Add it to Kayaa free. Help neighbours find it.
          </div>
        </div>
      </button>

      {/* ── Auth section ──────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>

        {/* Google — primary */}
        <button
          onClick={handleGoogle}
          disabled={googleLoading}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: '9px', width: '100%', minHeight: '52px',
            background: '#ffffff', color: '#1a1a1a',
            border: 'none', borderRadius: '13px',
            fontFamily: 'DM Sans, sans-serif', fontWeight: 700, fontSize: '15px',
            cursor: googleLoading ? 'default' : 'pointer',
            opacity: googleLoading ? 0.75 : 1,
          }}
        >
          {googleLoading
            ? <span style={{ fontSize: '14px', color: '#555' }}>Connecting…</span>
            : <><GoogleG />Continue with Google</>
          }
        </button>

        <Divider />

        {/* Email — secondary, inline expand */}
        {step === 'welcome' ? (
          <button
            onClick={() => { setStep('email'); setError(''); }}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: '7px', width: '100%', minHeight: '48px',
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.09)',
              borderRadius: '13px',
              color: 'rgba(255,255,255,0.42)',
              fontFamily: 'DM Sans, sans-serif', fontWeight: 500, fontSize: '14px',
              cursor: 'pointer',
            }}
          >
            ✉️ Continue with email
          </button>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
            <input
              type="email"
              value={email}
              onChange={e => { setEmail(e.target.value); setError(''); }}
              onKeyDown={e => e.key === 'Enter' && handleEmailSend()}
              placeholder="your@email.com"
              autoFocus
              autoComplete="email"
              style={{
                width: '100%', minHeight: '52px', boxSizing: 'border-box',
                background: '#161B22',
                border: `1px solid ${error ? '#F87171' : 'rgba(255,255,255,0.13)'}`,
                borderRadius: '13px', padding: '0 16px',
                color: '#F0F6FC', fontSize: '15px',
                fontFamily: 'DM Sans, sans-serif', outline: 'none',
              }}
            />
            {error && (
              <p style={{
                fontSize: '12px', color: '#F87171',
                fontFamily: 'DM Sans, sans-serif', margin: '0 4px',
              }}>
                {error}
              </p>
            )}
            <button
              onClick={handleEmailSend}
              disabled={emailLoading}
              style={{
                width: '100%', minHeight: '52px',
                background: emailLoading ? 'rgba(57,217,138,0.55)' : '#39D98A',
                color: '#0D1117', border: 'none', borderRadius: '13px',
                fontFamily: 'DM Sans, sans-serif', fontWeight: 700, fontSize: '15px',
                cursor: emailLoading ? 'default' : 'pointer',
              }}
            >
              {emailLoading ? 'Sending…' : 'Send sign-in link'}
            </button>
            <button
              onClick={() => { setStep('welcome'); setEmail(''); setError(''); }}
              style={{
                background: 'transparent', border: 'none',
                color: 'rgba(255,255,255,0.3)', fontSize: '12px',
                fontFamily: 'DM Sans, sans-serif', cursor: 'pointer',
                padding: '4px', alignSelf: 'center',
              }}
            >
              ← Back
            </button>
          </div>
        )}

        {/* Global error (welcome step) */}
        {error && step === 'welcome' && (
          <p style={{
            fontSize: '12px', color: '#F87171', textAlign: 'center',
            fontFamily: 'DM Sans, sans-serif', margin: '0',
          }}>
            {error}
          </p>
        )}
      </div>

      {/* ── Trust footer ─────────────────────────────────────────────────────── */}
      <div style={{ marginTop: '20px', textAlign: 'center' }}>
        <p style={{
          fontFamily: 'DM Sans, sans-serif', fontSize: '11px',
          color: 'rgba(255,255,255,0.2)', lineHeight: 1.6,
        }}>
          Free to join · No card needed · No password needed
          <br />
          By continuing you agree to Kayaa's Terms and Privacy Policy.
        </p>
      </div>
    </div>
  );
}
