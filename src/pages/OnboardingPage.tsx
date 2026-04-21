import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { createVenue, createVenueOwner } from '../lib/api';
import { signInWithEmail } from '../lib/auth';

// ─── Data ─────────────────────────────────────────────────────────────────────

const VENUE_TYPES = [
  { emoji: '✂️', label: 'Barbershop' },
  { emoji: '☕', label: 'Café'        },
  { emoji: '💅', label: 'Salon'       },
  { emoji: '🍺', label: 'Tavern'      },
  { emoji: '🔥', label: 'Shisanyama' },
  { emoji: '🏪', label: 'Spaza'       },
  { emoji: '🚗', label: 'Carwash'     },
  { emoji: '⛪', label: 'Church'      },
  { emoji: '🏛️', label: 'Community'  },
  { emoji: '➕', label: 'Other'       },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 14)
    .replace(/-+$/, '');
}

// ─── Shared components ────────────────────────────────────────────────────────

function StepIndicator({ current }: { current: 1 | 2 | 3 }) {
  const labels = ['Your place', 'About you', "You're live"];
  return (
    <div style={{ marginBottom: '28px' }}>
      <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
        {[1, 2, 3].map(n => (
          <div key={n} style={{
            flex: 1, height: '3px', borderRadius: '2px',
            background: n <= current ? 'var(--color-accent)' : 'var(--color-border)',
            transition: 'background 0.3s',
          }} />
        ))}
      </div>
      <p style={{ fontSize: '12px', color: 'var(--color-muted)' }}>
        Step {current} of 3 · {labels[current - 1]}
      </p>
    </div>
  );
}

function VenueTypeGrid({ selected, onSelect }: {
  selected: string;
  onSelect: (label: string) => void;
}) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: '8px',
    }}>
      {VENUE_TYPES.map(({ emoji, label }) => {
        const isSelected = selected === label;
        return (
          <button
            key={label}
            onClick={() => onSelect(label)}
            style={{
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              gap: '6px',
              padding: '14px 8px',
              borderRadius: '14px',
              background: isSelected ? 'rgba(57,217,138,0.08)' : 'var(--color-surface)',
              border: `1.5px solid ${isSelected ? 'var(--color-accent)' : 'var(--color-border)'}`,
              cursor: 'pointer',
              transition: 'all 0.15s',
              minHeight: '80px',
            }}
          >
            <span style={{ fontSize: '26px', lineHeight: 1 }}>{emoji}</span>
            <span style={{
              fontSize: '11px', fontWeight: 600,
              color: isSelected ? 'var(--color-accent)' : 'var(--color-muted)',
              textAlign: 'center', lineHeight: 1.2,
              transition: 'color 0.15s',
            }}>
              {label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div
      onClick={() => onChange(!checked)}
      style={{
        width: '46px', height: '26px', borderRadius: '13px', flexShrink: 0,
        background: checked ? 'var(--color-accent)' : 'var(--color-surface2)',
        border: `1px solid ${checked ? 'var(--color-accent)' : 'var(--color-border)'}`,
        position: 'relative', cursor: 'pointer',
        transition: 'background 0.2s, border-color 0.2s',
      }}
    >
      <div style={{
        position: 'absolute', top: '4px',
        left: checked ? '23px' : '4px',
        width: '16px', height: '16px', borderRadius: '50%',
        background: checked ? '#000' : '#6B7280',
        transition: 'left 0.2s',
      }} />
    </div>
  );
}

// ─── Input styles ─────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'var(--color-surface)',
  border: '1px solid var(--color-border)',
  borderRadius: '14px',
  padding: '15px 16px',
  color: 'var(--color-text)',
  fontSize: '15px',
  fontFamily: 'DM Sans, sans-serif',
  outline: 'none',
  boxSizing: 'border-box',
  minHeight: '52px',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '13px',
  fontWeight: 600,
  color: 'var(--color-muted)',
  marginBottom: '8px',
};

function errorStyle(show: boolean): React.CSSProperties {
  return {
    fontSize: '12px', color: '#F87171',
    marginTop: '5px', minHeight: '16px',
    visibility: show ? 'visible' : 'hidden',
  };
}

// ─── Form state ───────────────────────────────────────────────────────────────

interface FormData {
  venueName: string;
  venueType: string;
  neighbourhood: string;
  description: string;
  ownerName: string;
  ownerPhone: string;
  ownerEmail: string;
  privacyAgreed: boolean;
}

const empty: FormData = {
  venueName: '', venueType: '', neighbourhood: '', description: '',
  ownerName: '', ownerPhone: '', ownerEmail: '', privacyAgreed: false,
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [form, setForm] = useState<FormData>(empty);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData | 'privacy' | 'submit', string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const qrWrapRef = useRef<HTMLDivElement>(null);

  const slug = toSlug(form.venueName);
  const qrUrl = `https://kayaa.co.za/${slug}/checkin`;

  function set(key: keyof FormData) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm(f => ({ ...f, [key]: e.target.value }));
      setErrors(er => ({ ...er, [key]: undefined }));
    };
  }

  // ── Step 1 validation ──

  function goStep2() {
    const errs: typeof errors = {};
    if (!form.venueName.trim())    errs.venueName     = 'Give your place a name';
    if (!form.venueType)           errs.venueType     = 'Pick a type for your place';
    if (!form.neighbourhood.trim()) errs.neighbourhood = 'Tell us where you are';
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setStep(2);
    window.scrollTo(0, 0);
  }

  // ── Step 2: create venue + owner in Supabase, then advance ──

  async function goStep3() {
    const errs: typeof errors = {};
    if (!form.ownerName.trim())  errs.ownerName  = "We need your name";
    if (!form.ownerEmail.trim()) errs.ownerEmail = 'Add your email so you can sign in';
    if (!form.privacyAgreed)     errs.privacy    = 'Please agree to continue';
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setSubmitting(true);
    setErrors({});

    const { row: venueRow, error: venueErr } = await createVenue({
      name: form.venueName.trim(),
      type: form.venueType,
      slug,
      location: form.neighbourhood.trim(),
      description: form.description.trim() || undefined,
    });

    if (venueErr || !venueRow) {
      setErrors({ submit: 'Could not create your place. Please try again.' });
      setSubmitting(false);
      return;
    }

    const { error: ownerErr } = await createVenueOwner({
      name: form.ownerName.trim(),
      phone: form.ownerPhone.trim(),
      email: form.ownerEmail.trim() || undefined,
      venue_id: venueRow.id,
    });

    if (ownerErr) {
      console.error('Owner creation failed:', ownerErr);
    }

    // Store venueId so LoginPage can claim this venue_owner record
    localStorage.setItem('kayaa_venue_id', venueRow.id);
    localStorage.setItem('kayaa_pending_email', form.ownerEmail.trim());

    // Fire OTP in background — user enters code on /login
    signInWithEmail(form.ownerEmail.trim()).catch(() => {});

    setSubmitting(false);
    setStep(3);
    window.scrollTo(0, 0);
  }

  // ── QR download ──

  function downloadQR() {
    const canvas = qrWrapRef.current?.querySelector('canvas') as HTMLCanvasElement | null;
    if (!canvas) return;
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `${slug}-kayaa-qr.png`;
    a.click();
  }

  // ─── Step 3: Live! ─────────────────────────────────────────────────────────

  if (step === 3) {
    return (
      <>
        <style>{`
          @keyframes scaleIn {
            from { transform: scale(0.3); opacity: 0; }
            to   { transform: scale(1);   opacity: 1; }
          }
          @keyframes fadeUp {
            from { transform: translateY(14px); opacity: 0; }
            to   { transform: translateY(0);    opacity: 1; }
          }
          .ob-icon { animation: scaleIn 0.45s cubic-bezier(0.34,1.56,0.64,1) forwards; }
          .ob-h1   { animation: fadeUp  0.35s ease 0.3s  both; }
          .ob-sub  { animation: fadeUp  0.35s ease 0.45s both; }
          .ob-slug { animation: fadeUp  0.35s ease 0.55s both; }
          .ob-qr   { animation: fadeUp  0.35s ease 0.65s both; }
          .ob-cta  { animation: fadeUp  0.35s ease 0.8s  both; }
        `}</style>

        <div style={{ padding: '24px 16px 100px', textAlign: 'center' }}>
          <StepIndicator current={3} />

          {/* Checkmark */}
          <div className="ob-icon" style={{
            width: '80px', height: '80px', borderRadius: '50%',
            background: 'rgba(57,217,138,0.12)',
            border: '2px solid var(--color-accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px',
            fontSize: '36px',
          }}>
            ✓
          </div>

          <h1 className="ob-h1" style={{
            fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '30px',
            color: 'var(--color-text)', marginBottom: '8px',
          }}>
            You're live.
          </h1>

          <p className="ob-sub" style={{
            fontSize: '16px', color: 'var(--color-muted)', marginBottom: '4px',
          }}>
            <span style={{ color: 'var(--color-accent)', fontWeight: 700 }}>
              {form.venueName}
            </span>{' '}
            is now on Kayaa.
          </p>

          {/* Slug */}
          <div className="ob-slug" style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            background: 'var(--color-surface)', border: '1px solid var(--color-border)',
            borderRadius: '10px', padding: '8px 14px', marginBottom: '28px',
          }}>
            <span style={{ fontSize: '12px', color: 'var(--color-muted)' }}>kayaa.co.za/</span>
            <span style={{
              fontSize: '13px', fontWeight: 700, color: 'var(--color-accent)',
              fontFamily: 'DM Sans, sans-serif',
            }}>
              {slug}
            </span>
          </div>

          {/* QR code */}
          <div className="ob-qr" style={{ marginBottom: '28px' }}>
            <div
              ref={qrWrapRef}
              onClick={downloadQR}
              style={{
                display: 'inline-block',
                padding: '16px', borderRadius: '16px',
                background: '#fff',
                cursor: 'pointer',
                boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
              }}
              title="Tap to download"
            >
              <QRCodeCanvas
                value={qrUrl}
                size={180}
                level="M"
                marginSize={0}
              />
            </div>
            <p style={{ fontSize: '12px', color: 'var(--color-muted)', marginTop: '10px' }}>
              Print this and put it on your counter, mirror, or door
            </p>
            <p style={{ fontSize: '11px', color: 'var(--color-accent)', marginTop: '4px' }}>
              Tap the QR code to download
            </p>
          </div>

          {/* CTA */}
          <div className="ob-cta" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button
              onClick={() => navigate('/login')}
              style={{
                width: '100%', minHeight: '56px',
                background: 'var(--color-accent)', color: '#000',
                border: 'none', borderRadius: '14px',
                fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '16px',
                cursor: 'pointer',
              }}
            >
              Go to my dashboard →
            </button>
          </div>
        </div>
      </>
    );
  }

  // ─── Step 2: About you ─────────────────────────────────────────────────────

  if (step === 2) {
    return (
      <div style={{ padding: '16px 16px 100px' }}>
        <StepIndicator current={2} />

        <h1 style={{
          fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '24px',
          marginBottom: '6px',
        }}>
          Now about you
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--color-muted)', marginBottom: '28px' }}>
          So we know who to talk to when{' '}
          <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>{form.venueName}</span>{' '}
          goes live.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', marginBottom: '24px' }}>

          {/* Owner name */}
          <div>
            <label style={labelStyle}>Your name</label>
            <input
              type="text"
              value={form.ownerName}
              onChange={set('ownerName')}
              placeholder="What do people call you?"
              autoComplete="given-name"
              style={{
                ...inputStyle,
                border: `1px solid ${errors.ownerName ? '#F87171' : 'var(--color-border)'}`,
              }}
            />
            <p style={errorStyle(!!errors.ownerName)}>{errors.ownerName}</p>
          </div>

          {/* WhatsApp */}
          <div>
            <label style={labelStyle}>Your WhatsApp number</label>
            <input
              type="tel"
              value={form.ownerPhone}
              onChange={set('ownerPhone')}
              placeholder="+27 71 000 0000"
              autoComplete="tel"
              style={{
                ...inputStyle,
                border: `1px solid ${errors.ownerPhone ? '#F87171' : 'var(--color-border)'}`,
              }}
            />
            <p style={errorStyle(!!errors.ownerPhone)}>{errors.ownerPhone}</p>
          </div>

          {/* Email */}
          <div>
            <label style={labelStyle}>Your email address</label>
            <input
              type="email"
              value={form.ownerEmail}
              onChange={set('ownerEmail')}
              placeholder="you@example.com"
              autoComplete="email"
              style={{
                ...inputStyle,
                border: `1px solid ${errors.ownerEmail ? '#F87171' : 'var(--color-border)'}`,
              }}
            />
            <p style={errorStyle(!!errors.ownerEmail)}>{errors.ownerEmail}</p>
          </div>

          {/* POPIA card */}
          <div style={{
            background: 'rgba(57,217,138,0.05)',
            border: '1px solid rgba(57,217,138,0.2)',
            borderRadius: '14px', padding: '14px 16px',
            display: 'flex', gap: '10px', alignItems: 'flex-start',
          }}>
            <Shield size={16} color="var(--color-accent)" style={{ marginTop: '1px', flexShrink: 0 }} />
            <p style={{ fontSize: '13px', color: 'var(--color-muted)', lineHeight: 1.55, margin: 0 }}>
              Your information is protected under <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>POPIA</span>{' '}
              and never shared without your consent.
            </p>
          </div>

          {/* Privacy toggle */}
          <div style={{
            background: 'var(--color-surface)', border: `1px solid ${errors.privacy ? '#F87171' : 'var(--color-border)'}`,
            borderRadius: '14px', padding: '14px 16px',
            display: 'flex', gap: '12px', alignItems: 'center',
          }}>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text)', marginBottom: '2px' }}>
                I agree to the Kayaa terms
              </p>
              <p style={{ fontSize: '12px', color: 'var(--color-muted)' }}>
                You're in control of your place data, always.
              </p>
            </div>
            <ToggleSwitch
              checked={form.privacyAgreed}
              onChange={v => {
                setForm(f => ({ ...f, privacyAgreed: v }));
                setErrors(er => ({ ...er, privacy: undefined }));
              }}
            />
          </div>
          {errors.privacy && (
            <p style={{ fontSize: '12px', color: '#F87171', marginTop: '-10px' }}>{errors.privacy}</p>
          )}
        </div>

        {/* Submit error */}
        {errors.submit && (
          <p style={{ fontSize: '13px', color: '#F87171', marginBottom: '12px', textAlign: 'center' }}>
            {errors.submit}
          </p>
        )}

        {/* Nav buttons */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => { setStep(1); window.scrollTo(0, 0); }}
            disabled={submitting}
            style={{
              width: '52px', height: '52px', borderRadius: '14px', flexShrink: 0,
              background: 'var(--color-surface)', border: '1px solid var(--color-border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: submitting ? 'default' : 'pointer',
            }}
          >
            <ArrowLeft size={18} color="var(--color-text)" />
          </button>
          <button
            onClick={goStep3}
            disabled={submitting}
            style={{
              flex: 1, minHeight: '52px',
              background: submitting ? 'rgba(57,217,138,0.6)' : 'var(--color-accent)',
              color: '#000', border: 'none', borderRadius: '14px',
              fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '16px',
              cursor: submitting ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              transition: 'background 0.2s',
            }}
          >
            {submitting ? (
              <>
                <span style={{
                  width: '16px', height: '16px', borderRadius: '50%',
                  border: '2px solid rgba(0,0,0,0.3)', borderTopColor: '#000',
                  display: 'inline-block', animation: 'obSpin 0.7s linear infinite',
                }} />
                Creating…
                <style>{`@keyframes obSpin { to { transform: rotate(360deg); } }`}</style>
              </>
            ) : (
              'Create my Kayaa →'
            )}
          </button>
        </div>
      </div>
    );
  }

  // ─── Step 1: Your venue ────────────────────────────────────────────────────

  return (
    <div style={{ padding: '16px 16px 100px' }}>
      <StepIndicator current={1} />

      <h1 style={{
        fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '24px',
        marginBottom: '6px',
      }}>
        Tell us about your place
      </h1>
      <p style={{ fontSize: '14px', color: 'var(--color-muted)', marginBottom: '28px' }}>
        Every great neighbourhood spot deserves its own page.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '28px' }}>

        {/* Venue name */}
        <div>
          <label style={labelStyle}>What's your place called?</label>
          <input
            type="text"
            value={form.venueName}
            onChange={set('venueName')}
            placeholder="e.g. Uncle Dee's Barbershop"
            autoComplete="organization"
            style={{
              ...inputStyle,
              border: `1px solid ${errors.venueName ? '#F87171' : 'var(--color-border)'}`,
            }}
          />
          <p style={errorStyle(!!errors.venueName)}>{errors.venueName}</p>
        </div>

        {/* Venue type grid */}
        <div>
          <label style={labelStyle}>What kind of place is it?</label>
          <VenueTypeGrid
            selected={form.venueType}
            onSelect={v => {
              setForm(f => ({ ...f, venueType: v }));
              setErrors(er => ({ ...er, venueType: undefined }));
            }}
          />
          <p style={errorStyle(!!errors.venueType)}>{errors.venueType}</p>
        </div>

        {/* Neighbourhood */}
        <div>
          <label style={labelStyle}>Where are you based?</label>
          <input
            type="text"
            value={form.neighbourhood}
            onChange={set('neighbourhood')}
            placeholder="e.g. Orlando West, Soweto"
            style={{
              ...inputStyle,
              border: `1px solid ${errors.neighbourhood ? '#F87171' : 'var(--color-border)'}`,
            }}
          />
          <p style={errorStyle(!!errors.neighbourhood)}>{errors.neighbourhood}</p>
        </div>

        {/* Description */}
        <div>
          <label style={labelStyle}>
            Describe your place in one line{' '}
            <span style={{ fontWeight: 400, opacity: 0.6 }}>(optional)</span>
          </label>
          <textarea
            value={form.description}
            onChange={set('description')}
            placeholder="e.g. Best fades in Soweto, open 7 days a week"
            maxLength={120}
            style={{
              ...inputStyle,
              minHeight: '80px',
              resize: 'vertical',
              lineHeight: 1.5,
            }}
          />
          <p style={{ fontSize: '11px', color: 'var(--color-muted)', textAlign: 'right', marginTop: '4px' }}>
            {form.description.length}/120
          </p>
        </div>
      </div>

      <button
        onClick={goStep2}
        style={{
          width: '100%', minHeight: '56px',
          background: 'var(--color-accent)', color: '#000',
          border: 'none', borderRadius: '14px',
          fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '16px',
          cursor: 'pointer',
        }}
      >
        Continue →
      </button>
    </div>
  );
}
