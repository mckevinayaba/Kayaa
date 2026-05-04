import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';

// ── Shared input style ─────────────────────────────────────────────────────────
const inputStyle: React.CSSProperties = {
  width: '100%',
  minHeight: '50px',
  background: '#161B22',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '12px',
  padding: '0 16px',
  color: '#F0F6FC',
  fontSize: '15px',
  fontFamily: 'DM Sans, sans-serif',
  outline: 'none',
  boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '12px',
  fontWeight: 700,
  color: 'rgba(255,255,255,0.45)',
  fontFamily: 'DM Sans, sans-serif',
  letterSpacing: '0.05em',
  textTransform: 'uppercase',
  marginBottom: '6px',
};

type UserType = 'neighbour' | 'place_owner';

interface FormState {
  name:          string;
  email:         string;
  whatsapp:      string;
  neighbourhood: string;
  user_type:     UserType;
}

export default function WaitlistPage() {
  const [form, setForm] = useState<FormState>({
    name:          '',
    email:         '',
    whatsapp:      '',
    neighbourhood: '',
    user_type:     'neighbour',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted,  setSubmitted]  = useState(false);
  const [error,      setError]      = useState('');

  function set(field: keyof FormState, value: string) {
    setForm(f => ({ ...f, [field]: value }));
    setError('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!form.name.trim())          { setError('Please enter your name.');          return; }
    if (!form.email.trim())         { setError('Please enter your email address.');  return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      setError('Enter a valid email address.');
      return;
    }
    if (!form.neighbourhood.trim()) { setError('Please enter your neighbourhood.');  return; }

    setSubmitting(true);
    setError('');

    const { error: dbError } = await supabase
      .from('waitlist_signups')
      .insert({
        name:          form.name.trim(),
        email:         form.email.trim().toLowerCase(),
        whatsapp:      form.whatsapp.trim() || null,
        neighbourhood: form.neighbourhood.trim(),
        user_type:     form.user_type,
      });

    setSubmitting(false);

    if (dbError) {
      // Duplicate email — treat as already on list
      if (dbError.code === '23505') {
        setSubmitted(true);
        return;
      }
      setError("Something went wrong. Please try again or WhatsApp us.");
      return;
    }

    setSubmitted(true);
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>

      {/* ── Minimal header ───────────────────────────────────────────────────── */}
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '20px 24px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        <span style={{
          fontFamily: 'Syne, sans-serif', fontWeight: 800,
          fontSize: '22px', color: '#39D98A', letterSpacing: '-0.5px',
        }}>
          kayaa
        </span>
        <Link
          to="/welcome"
          style={{
            fontFamily: 'DM Sans, sans-serif', fontSize: '13px',
            fontWeight: 600, color: 'rgba(255,255,255,0.5)',
            textDecoration: 'none',
          }}
        >
          Already have access? Sign in →
        </Link>
      </header>

      {/* ── Main content ─────────────────────────────────────────────────────── */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', padding: '40px 24px 60px',
      }}>
        <div style={{ width: '100%', maxWidth: '480px' }}>

          {submitted ? (
            /* ── Success state ─────────────────────────────────────────────── */
            <div style={{ textAlign: 'center', paddingTop: '20px' }}>
              <div style={{ fontSize: '56px', marginBottom: '24px', lineHeight: 1 }}>🎉</div>
              <h1 style={{
                fontFamily: 'Syne, sans-serif', fontWeight: 800,
                fontSize: '28px', color: '#F0F6FC',
                marginBottom: '12px', lineHeight: 1.2,
              }}>
                You're on the list!
              </h1>
              <p style={{
                fontFamily: 'DM Sans, sans-serif', fontSize: '15px',
                color: 'rgba(255,255,255,0.55)', lineHeight: 1.65,
                marginBottom: '32px',
              }}>
                We'll message you on WhatsApp (or email) when Kayaa
                reaches <strong style={{ color: '#F0F6FC' }}>{form.neighbourhood || 'your area'}</strong>.
              </p>

              <div style={{
                background: 'rgba(57,217,138,0.06)',
                border: '1px solid rgba(57,217,138,0.2)',
                borderRadius: '14px', padding: '20px',
                marginBottom: '28px',
              }}>
                <p style={{
                  fontFamily: 'DM Sans, sans-serif', fontSize: '14px',
                  color: 'rgba(255,255,255,0.65)', margin: '0 0 12px', lineHeight: 1.5,
                }}>
                  Know a place that should be on Kayaa?
                </p>
                <Link
                  to="/onboarding"
                  style={{
                    fontFamily: 'Syne, sans-serif', fontWeight: 700,
                    fontSize: '14px', color: '#39D98A', textDecoration: 'none',
                  }}
                >
                  Nominate a place →
                </Link>
              </div>

              <Link
                to="/welcome"
                style={{
                  fontFamily: 'DM Sans, sans-serif', fontSize: '13px',
                  color: 'rgba(255,255,255,0.35)', textDecoration: 'none',
                }}
              >
                Sign in to explore Kayaa now →
              </Link>
            </div>

          ) : (
            /* ── Form ──────────────────────────────────────────────────────── */
            <>
              <div style={{ marginBottom: '32px' }}>
                <h1 style={{
                  fontFamily: 'Syne, sans-serif', fontWeight: 800,
                  fontSize: '28px', color: '#F0F6FC',
                  marginBottom: '10px', lineHeight: 1.2,
                }}>
                  You're early.{' '}
                  <span style={{ color: '#39D98A' }}>That's good.</span>
                </h1>
                <p style={{
                  fontFamily: 'DM Sans, sans-serif', fontSize: '15px',
                  color: 'rgba(255,255,255,0.5)', lineHeight: 1.65, margin: 0,
                }}>
                  Tell us where you are and we'll let you know when
                  Kayaa is live in your area.
                </p>
              </div>

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>

                {/* Full name */}
                <div>
                  <label style={labelStyle}>Full name *</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={e => set('name', e.target.value)}
                    placeholder="Your name"
                    autoComplete="name"
                    style={inputStyle}
                  />
                </div>

                {/* Email */}
                <div>
                  <label style={labelStyle}>Email address *</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => set('email', e.target.value)}
                    placeholder="you@example.com"
                    autoComplete="email"
                    style={inputStyle}
                  />
                </div>

                {/* WhatsApp */}
                <div>
                  <label style={labelStyle}>
                    WhatsApp number{' '}
                    <span style={{ fontWeight: 400, color: 'rgba(255,255,255,0.3)', textTransform: 'none', fontSize: '11px' }}>
                      (optional — for faster updates)
                    </span>
                  </label>
                  <input
                    type="tel"
                    value={form.whatsapp}
                    onChange={e => set('whatsapp', e.target.value)}
                    placeholder="+27 ..."
                    autoComplete="tel"
                    style={inputStyle}
                  />
                </div>

                {/* Neighbourhood */}
                <div>
                  <label style={labelStyle}>Neighbourhood / Area *</label>
                  <input
                    type="text"
                    value={form.neighbourhood}
                    onChange={e => set('neighbourhood', e.target.value)}
                    placeholder="e.g. Soweto, Khayelitsha, Sandton..."
                    style={inputStyle}
                  />
                </div>

                {/* User type */}
                <div>
                  <label style={{ ...labelStyle, marginBottom: '10px' }}>I am a...</label>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    {([
                      { value: 'neighbour',   label: '🏘️ Neighbour'   },
                      { value: 'place_owner', label: '🏪 Place owner' },
                    ] as { value: UserType; label: string }[]).map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => set('user_type', opt.value)}
                        style={{
                          flex: 1, minHeight: '46px',
                          background: form.user_type === opt.value
                            ? 'rgba(57,217,138,0.1)'
                            : '#161B22',
                          border: `1.5px solid ${form.user_type === opt.value
                            ? '#39D98A'
                            : 'rgba(255,255,255,0.1)'}`,
                          borderRadius: '12px',
                          fontFamily: 'DM Sans, sans-serif',
                          fontWeight: 600, fontSize: '14px',
                          color: form.user_type === opt.value
                            ? '#39D98A'
                            : 'rgba(255,255,255,0.6)',
                          cursor: 'pointer',
                          transition: 'all 0.15s',
                        }}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Error */}
                {error && (
                  <p style={{
                    fontSize: '13px', color: '#F87171',
                    fontFamily: 'DM Sans, sans-serif', margin: 0,
                  }}>
                    {error}
                  </p>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    width: '100%', minHeight: '54px',
                    background: submitting ? 'rgba(57,217,138,0.5)' : '#39D98A',
                    color: '#0D1117', border: 'none', borderRadius: '14px',
                    fontFamily: 'Syne, sans-serif', fontWeight: 800,
                    fontSize: '16px', cursor: submitting ? 'default' : 'pointer',
                    marginTop: '4px',
                  }}
                >
                  {submitting ? 'Joining…' : 'Join the waitlist →'}
                </button>
              </form>

              {/* WhatsApp fallback */}
              <p style={{
                fontFamily: 'DM Sans, sans-serif', fontSize: '13px',
                color: 'rgba(255,255,255,0.3)', textAlign: 'center',
                marginTop: '20px', lineHeight: 1.5,
              }}>
                Prefer WhatsApp?{' '}
                <a
                  href="https://wa.me/27663365296"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: 'rgba(255,255,255,0.5)', textDecoration: 'underline' }}
                >
                  Message us on +27 66 336 5296
                </a>
              </p>
            </>
          )}

        </div>
      </div>
    </div>
  );
}
