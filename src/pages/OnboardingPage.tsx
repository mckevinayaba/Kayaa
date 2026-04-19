import { useState } from 'react';
import { Check, MapPin, Clock, Tag } from 'lucide-react';

const CATEGORIES = [
  'Barbershop', 'Salon', 'Shisanyama', 'Spaza Shop', 'Church',
  'Tavern', 'Carwash', 'Clinic', 'Tutoring', 'Sports Ground', 'Home Business', 'Other',
];

type Step = 1 | 2 | 3 | 4;

interface FormData {
  name: string;
  category: string;
  description: string;
  address: string;
  neighborhood: string;
  city: string;
  openHours: string;
  tags: string;
  ownerName: string;
  ownerPhone: string;
}

const emptyForm: FormData = {
  name: '', category: '', description: '',
  address: '', neighborhood: '', city: '',
  openHours: '', tags: '',
  ownerName: '', ownerPhone: '',
};

const inputStyle = {
  width: '100%',
  background: 'var(--color-surface)',
  border: '1px solid var(--color-border)',
  borderRadius: '10px',
  padding: '12px 14px',
  color: 'var(--color-text)',
  fontSize: '14px',
  fontFamily: 'DM Sans, sans-serif',
  outline: 'none',
};

const labelStyle = {
  display: 'block',
  fontSize: '13px',
  fontWeight: 600,
  color: 'var(--color-muted)',
  marginBottom: '6px',
};

export default function OnboardingPage() {
  const [step, setStep] = useState<Step>(1);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [done, setDone] = useState(false);

  const set = (key: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [key]: e.target.value }));

  const steps = [
    { label: 'Venue info', icon: Tag },
    { label: 'Location', icon: MapPin },
    { label: 'Hours', icon: Clock },
    { label: 'Owner', icon: Check },
  ];

  if (done) {
    return (
      <div style={{ padding: '32px 16px', textAlign: 'center' }}>
        <div style={{
          width: '80px', height: '80px', borderRadius: '50%',
          background: 'rgba(57,217,138,0.12)',
          border: '2px solid var(--color-accent)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 20px',
        }}>
          <Check size={36} color="var(--color-accent)" />
        </div>
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '24px', marginBottom: '8px' }}>
          Venue submitted!
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--color-muted)', lineHeight: 1.6, marginBottom: '32px' }}>
          <strong style={{ color: 'var(--color-text)' }}>{form.name}</strong> is under review.
          We'll notify you once it's live on Kayaa.
        </p>
        <button
          onClick={() => { setForm(emptyForm); setStep(1); setDone(false); }}
          style={{
            background: 'var(--color-accent)', color: '#000',
            border: 'none', borderRadius: '12px',
            padding: '14px 32px',
            fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '15px',
            cursor: 'pointer',
          }}
        >
          Register another venue
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '16px' }}>
      <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '22px', marginBottom: '4px' }}>
        Register your venue
      </h1>
      <p style={{ fontSize: '14px', color: 'var(--color-muted)', marginBottom: '24px' }}>
        Give your place a living page on Kayaa
      </p>

      {/* Step progress */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '28px' }}>
        {steps.map((s, i) => {
          const n = (i + 1) as Step;
          const isComplete = step > n;
          const isActive = step === n;
          return (
            <div key={n} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{
                height: '3px', borderRadius: '2px',
                background: isComplete || isActive ? 'var(--color-accent)' : 'var(--color-border)',
              }} />
              <span style={{ fontSize: '10px', color: isActive ? 'var(--color-accent)' : 'var(--color-muted)', fontWeight: isActive ? 600 : 400 }}>
                {s.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Step 1 — Venue info */}
      {step === 1 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={labelStyle}>Venue name *</label>
            <input value={form.name} onChange={set('name')} placeholder="e.g. Uncle Dee's Barbershop" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Category *</label>
            <select value={form.category} onChange={set('category')} style={inputStyle}>
              <option value="">Select a category</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Description</label>
            <textarea
              value={form.description}
              onChange={set('description')}
              placeholder="What makes this place special?"
              maxLength={200}
              style={{ ...inputStyle, minHeight: '90px', resize: 'vertical' }}
            />
          </div>
          <div>
            <label style={labelStyle}>Tags (comma-separated)</label>
            <input value={form.tags} onChange={set('tags')} placeholder="e.g. fades, walk-ins, beard trim" style={inputStyle} />
          </div>
        </div>
      )}

      {/* Step 2 — Location */}
      {step === 2 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={labelStyle}>Street address *</label>
            <input value={form.address} onChange={set('address')} placeholder="e.g. 14 Vilakazi Street" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Neighbourhood *</label>
            <input value={form.neighborhood} onChange={set('neighborhood')} placeholder="e.g. Orlando West" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>City *</label>
            <input value={form.city} onChange={set('city')} placeholder="e.g. Soweto" style={inputStyle} />
          </div>
        </div>
      )}

      {/* Step 3 — Hours */}
      {step === 3 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={labelStyle}>Opening hours</label>
            <input
              value={form.openHours}
              onChange={set('openHours')}
              placeholder="e.g. Mon–Sat 8am–7pm"
              style={inputStyle}
            />
            <p style={{ fontSize: '12px', color: 'var(--color-muted)', marginTop: '6px' }}>
              Write it however your customers would say it
            </p>
          </div>
          <div style={{
            background: 'var(--color-surface)', border: '1px solid var(--color-border)',
            borderRadius: '10px', padding: '14px',
          }}>
            <p style={{ fontSize: '13px', color: 'var(--color-muted)', lineHeight: 1.6 }}>
              You can update your hours any time from your dashboard. Customers see your live status.
            </p>
          </div>
        </div>
      )}

      {/* Step 4 — Owner */}
      {step === 4 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={labelStyle}>Your name *</label>
            <input value={form.ownerName} onChange={set('ownerName')} placeholder="e.g. Sipho Dlamini" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Phone number *</label>
            <input value={form.ownerPhone} onChange={set('ownerPhone')} placeholder="+27 71 000 0000" type="tel" style={inputStyle} />
          </div>
          <div style={{
            background: 'rgba(57,217,138,0.06)', border: '1px solid rgba(57,217,138,0.2)',
            borderRadius: '10px', padding: '14px',
          }}>
            <p style={{ fontSize: '13px', color: 'var(--color-muted)', lineHeight: 1.6 }}>
              We'll contact you to verify your venue and activate your dashboard. No spam.
            </p>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div style={{ display: 'flex', gap: '10px', marginTop: '28px' }}>
        {step > 1 && (
          <button
            onClick={() => setStep(s => (s - 1) as Step)}
            style={{
              flex: 1, padding: '14px',
              background: 'transparent', color: 'var(--color-muted)',
              border: '1px solid var(--color-border)', borderRadius: '12px',
              fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: '14px',
              cursor: 'pointer',
            }}
          >
            Back
          </button>
        )}
        <button
          onClick={() => step < 4 ? setStep(s => (s + 1) as Step) : setDone(true)}
          style={{
            flex: 2, padding: '14px',
            background: 'var(--color-accent)', color: '#000',
            border: 'none', borderRadius: '12px',
            fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '15px',
            cursor: 'pointer',
          }}
        >
          {step < 4 ? 'Continue' : 'Submit venue'}
        </button>
      </div>
    </div>
  );
}
