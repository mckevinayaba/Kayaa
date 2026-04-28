/**
 * Edit Profile page — stores display preferences in localStorage.
 * No Supabase auth required; uses the anonymous visitor ID system.
 *
 * Saved key: "kayaa_profile"
 * Shape: { name, bio, neighborhood, city, phone, updatedAt }
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, User } from 'lucide-react';

// ── localStorage helpers ──────────────────────────────────────────────────────

export interface LocalProfile {
  name:         string;
  bio:          string;
  neighborhood: string;
  city:         string;
  phone:        string;
  updatedAt?:   string;
}

const PROFILE_KEY = 'kayaa_profile';

export function getLocalProfile(): LocalProfile {
  try {
    return JSON.parse(localStorage.getItem(PROFILE_KEY) ?? '{}') as LocalProfile;
  } catch { return { name: '', bio: '', neighborhood: '', city: '', phone: '' }; }
}

export function saveLocalProfile(profile: LocalProfile) {
  localStorage.setItem(PROFILE_KEY, JSON.stringify({ ...profile, updatedAt: new Date().toISOString() }));
}

// ── SA cities ─────────────────────────────────────────────────────────────────

const SA_CITIES = [
  'Johannesburg', 'Cape Town', 'Durban', 'Pretoria', 'Port Elizabeth',
  'Bloemfontein', 'East London', 'Nelspruit', 'Polokwane', 'Kimberley',
];

// ── Shared field styles ───────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box',
  background: '#161B22', border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '12px', padding: '13px 14px',
  color: '#fff', fontFamily: 'DM Sans, sans-serif', fontSize: '14px',
  outline: 'none',
};

const labelStyle: React.CSSProperties = {
  display: 'block', fontFamily: 'DM Sans, sans-serif',
  fontSize: '12px', fontWeight: 700, color: 'rgba(255,255,255,0.5)',
  textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px',
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function EditProfile() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [saved,   setSaved]   = useState(false);
  const [form, setForm] = useState<LocalProfile>({
    name: '', bio: '', neighborhood: '', city: '', phone: '',
  });

  useEffect(() => {
    setForm(getLocalProfile());
  }, []);

  function set(key: keyof LocalProfile, value: string) {
    setForm(f => ({ ...f, [key]: value }));
  }

  function handleSave() {
    setLoading(true);
    saveLocalProfile(form);
    setSaved(true);
    setTimeout(() => {
      setLoading(false);
      navigate('/profile');
    }, 700);
  }

  return (
    <div style={{ minHeight: '100vh', paddingBottom: '40px' }}>

      {/* Header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 40,
        background: 'rgba(13,17,23,0.95)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        padding: '14px 16px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <button
          onClick={() => navigate(-1)}
          style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(255,255,255,0.07)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
        >
          <ArrowLeft size={18} color="#fff" />
        </button>
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '18px', color: '#fff', margin: 0 }}>
          Edit Profile
        </h1>
        <button
          onClick={handleSave}
          disabled={loading}
          style={{
            width: '36px', height: '36px', borderRadius: '50%',
            background: saved ? 'rgba(57,217,138,0.15)' : 'rgba(255,255,255,0.07)',
            border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: loading ? 'default' : 'pointer', opacity: loading ? 0.6 : 1,
          }}
        >
          <Save size={18} color={saved ? '#39D98A' : '#fff'} />
        </button>
      </div>

      <div style={{ padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {/* Avatar placeholder */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', paddingBottom: '8px' }}>
          <div style={{
            width: '80px', height: '80px', borderRadius: '50%',
            background: 'rgba(57,217,138,0.1)', border: '2px solid rgba(57,217,138,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {form.name ? (
              <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '32px', color: '#39D98A' }}>
                {form.name[0].toUpperCase()}
              </span>
            ) : (
              <User size={32} color="rgba(57,217,138,0.6)" />
            )}
          </div>
          <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>
            Profile photo coming soon
          </span>
        </div>

        {/* Name */}
        <div>
          <label style={labelStyle}>Display Name</label>
          <input
            type="text"
            value={form.name}
            onChange={e => set('name', e.target.value)}
            placeholder="e.g. Thabo"
            style={inputStyle}
          />
          <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.25)', marginTop: '5px' }}>
            Shown when you check in publicly
          </div>
        </div>

        {/* Bio */}
        <div>
          <label style={labelStyle}>Bio</label>
          <textarea
            value={form.bio}
            onChange={e => set('bio', e.target.value)}
            rows={3}
            maxLength={160}
            placeholder="Tell your neighbours about yourself…"
            style={{ ...inputStyle, resize: 'none', lineHeight: 1.55 }}
          />
          <div style={{ textAlign: 'right', fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.25)', marginTop: '4px' }}>
            {form.bio.length}/160
          </div>
        </div>

        {/* Neighbourhood */}
        <div>
          <label style={labelStyle}>Neighbourhood</label>
          <input
            type="text"
            value={form.neighborhood}
            onChange={e => set('neighborhood', e.target.value)}
            placeholder="e.g. Ferndale, Randburg"
            style={inputStyle}
          />
        </div>

        {/* City */}
        <div>
          <label style={labelStyle}>City</label>
          <select
            value={form.city}
            onChange={e => set('city', e.target.value)}
            style={{ ...inputStyle, appearance: 'none', WebkitAppearance: 'none', cursor: 'pointer' }}
          >
            <option value="">Select city</option>
            {SA_CITIES.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* Phone */}
        <div>
          <label style={labelStyle}>Phone (optional)</label>
          <input
            type="tel"
            value={form.phone}
            onChange={e => set('phone', e.target.value)}
            placeholder="+27 XX XXX XXXX"
            style={inputStyle}
          />
        </div>

        {/* Save button */}
        <button
          onClick={handleSave}
          disabled={loading}
          style={{
            width: '100%', background: loading ? 'rgba(57,217,138,0.5)' : '#39D98A',
            border: 'none', borderRadius: '14px', padding: '16px',
            fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '15px',
            color: '#000', cursor: loading ? 'default' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
          }}
        >
          {loading
            ? <div style={{ width: '16px', height: '16px', borderRadius: '50%', border: '2px solid rgba(0,0,0,0.3)', borderTopColor: '#000', animation: 'spin 0.7s linear infinite' }} />
            : <Save size={17} />}
          {loading ? 'Saving…' : 'Save Changes'}
        </button>

        {/* Anonymous note */}
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: 'rgba(255,255,255,0.2)', textAlign: 'center', lineHeight: 1.6, margin: 0 }}>
          Your profile is stored locally on this device. No account required.
        </p>
      </div>
    </div>
  );
}
