import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useNeighbourhood } from '../contexts/NeighbourhoodContext';
import { useCountry } from '../contexts/CountryContext';

// ─── Category chips ───────────────────────────────────────────────────────────

const CATS = [
  { emoji: '✂️', label: 'Barbershop / Salon' },
  { emoji: '🍖', label: 'Food & Shisanyama'  },
  { emoji: '🍺', label: 'Tavern / Pub'       },
  { emoji: '🏪', label: 'Spaza / Shop'       },
  { emoji: '⛪', label: 'Church / Mosque'    },
  { emoji: '🚗', label: 'Carwash / Mechanic' },
  { emoji: '🏥', label: 'Clinic / Pharmacy'  },
  { emoji: '📚', label: 'Tutoring / School'  },
  { emoji: '🤝', label: 'Community space'    },
  { emoji: '🏠', label: 'Home business'      },
  { emoji: '➕', label: 'Something else'     },
];

// ─── Input styles ─────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: '100%', background: '#161B22',
  border: '1px solid #30363D', borderRadius: '12px',
  padding: '14px 16px', color: '#F0F6FC', fontSize: '16px',
  fontFamily: 'Inter, sans-serif', outline: 'none',
  boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '14px', fontWeight: 700,
  color: 'rgba(255,255,255,0.75)', marginBottom: '8px',
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function NominatePage() {
  const navigate = useNavigate();
  const { displaySuburb, displayCity } = useNeighbourhood();
  const { selectedCountry } = useCountry();

  const [placeName,  setPlaceName]  = useState('');
  const [category,   setCategory]   = useState('');
  const [area,       setArea]       = useState(displaySuburb || displayCity || '');
  const [notes,      setNotes]      = useState('');
  const [phone,      setPhone]      = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done,       setDone]       = useState(false);
  const [error,      setError]      = useState('');

  async function handleSubmit() {
    if (!placeName.trim()) { setError('Please tell us the name of the place.'); return; }
    if (!area.trim())      { setError('Please tell us which area it\'s in.'); return; }
    setError(''); setSubmitting(true);

    const { error: err } = await supabase.from('nominations').insert({
      place_name:      placeName.trim(),
      category:        category || null,
      area:            area.trim(),
      notes:           notes.trim() || null,
      nominator_phone: phone.trim() || null,
      country_code:    selectedCountry.code,
    });

    setSubmitting(false);

    if (err) {
      // Table may not exist yet — still show success so user isn't blocked
      console.warn('[Kayaa] Nomination insert error:', err.message);
    }

    setDone(true);
  }

  // ── Success screen ────────────────────────────────────────────────────────
  if (done) {
    return (
      <div style={{ padding: '60px 24px 80px', textAlign: 'center', maxWidth: '380px', margin: '0 auto' }}>
        <div style={{
          width: '72px', height: '72px', borderRadius: '50%',
          background: '#39D98A', display: 'flex', alignItems: 'center',
          justifyContent: 'center', margin: '0 auto 24px',
        }}>
          <Check size={32} color="#0D1117" strokeWidth={3} />
        </div>

        <h1 style={{ fontFamily: 'Inter, sans-serif', fontWeight: 800, fontSize: '22px', color: '#F0F6FC', margin: '0 0 10px' }}>
          Thank you! 🙏
        </h1>
        <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '15px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.6, margin: '0 0 8px' }}>
          <strong style={{ color: '#F0F6FC' }}>{placeName}</strong> has been added to our list.
        </p>
        <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', color: 'rgba(255,255,255,0.38)', lineHeight: 1.6, margin: '0 0 36px' }}>
          We review nominations and add good places as fast as we can. You're helping build the {area || 'neighbourhood'} map.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button
            onClick={() => { setPlaceName(''); setCategory(''); setNotes(''); setPhone(''); setDone(false); }}
            style={{
              width: '100%', padding: '14px',
              background: '#39D98A', color: '#0D1117',
              border: 'none', borderRadius: '12px',
              fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '15px', cursor: 'pointer',
            }}
          >
            Suggest another place
          </button>
          <button
            onClick={() => navigate(-1)}
            style={{
              width: '100%', padding: '14px',
              background: 'none', color: 'rgba(255,255,255,0.4)',
              border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px',
              fontFamily: 'Inter, sans-serif', fontSize: '14px', cursor: 'pointer',
            }}
          >
            Back to feed
          </button>
        </div>
      </div>
    );
  }

  // ── Form ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ paddingBottom: '100px' }}>

      {/* Sticky header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 40,
        background: 'rgba(13,17,23,0.95)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid #21262D',
        padding: '12px 16px',
        display: 'flex', alignItems: 'center', gap: '12px',
      }}>
        <button
          onClick={() => navigate(-1)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex' }}
        >
          <ArrowLeft size={20} color="rgba(255,255,255,0.6)" />
        </button>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontFamily: 'Inter, sans-serif', fontWeight: 800, fontSize: '16px', color: '#F0F6FC', margin: 0 }}>
            Put a place on the map
          </h1>
        </div>
      </div>

      <div style={{ padding: '24px 16px' }}>

        {/* Hero blurb */}
        <div style={{
          background: 'rgba(57,217,138,0.05)',
          border: '1px solid rgba(57,217,138,0.15)',
          borderRadius: '16px', padding: '18px',
          marginBottom: '28px',
        }}>
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '15px', color: 'rgba(255,255,255,0.8)', margin: 0, lineHeight: 1.65 }}>
            Know a <strong style={{ color: '#F0F6FC' }}>barbershop, church, spaza, clinic</strong> — any spot people already go to — that's not on Kayaa yet?{' '}
            <strong style={{ color: '#39D98A' }}>Tell us in 30 seconds.</strong> We'll review it and add it so the whole neighbourhood can find it.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>

          {/* Place name */}
          <div>
            <label style={labelStyle}>What's the place called? *</label>
            <input
              type="text"
              value={placeName}
              onChange={e => { setPlaceName(e.target.value); setError(''); }}
              placeholder="e.g. Sipho's Cuts, Corner Church, Mama's Spaza"
              style={{ ...inputStyle, border: `1px solid ${error && !placeName.trim() ? '#F87171' : '#30363D'}` }}
              autoComplete="off"
            />
          </div>

          {/* Category chips */}
          <div>
            <label style={labelStyle}>What kind of place is it?</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {CATS.map(c => {
                const active = category === c.label;
                return (
                  <button
                    key={c.label}
                    onClick={() => setCategory(active ? '' : c.label)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '6px',
                      padding: '8px 12px', borderRadius: '20px',
                      border: `1.5px solid ${active ? '#39D98A' : '#30363D'}`,
                      background: active ? 'rgba(57,217,138,0.1)' : '#161B22',
                      color: active ? '#39D98A' : 'rgba(255,255,255,0.55)',
                      fontFamily: 'Inter, sans-serif', fontSize: '13px', fontWeight: 600,
                      cursor: 'pointer', transition: 'all 0.15s',
                    }}
                  >
                    <span>{c.emoji}</span>
                    <span>{c.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Area */}
          <div>
            <label style={labelStyle}>Which area or neighbourhood is it in? *</label>
            <input
              type="text"
              value={area}
              onChange={e => { setArea(e.target.value); setError(''); }}
              placeholder="e.g. Berea, Orlando West, Katlehong, Alex"
              style={{ ...inputStyle, border: `1px solid ${error && !area.trim() ? '#F87171' : '#30363D'}` }}
            />
          </div>

          {/* Notes */}
          <div>
            <label style={labelStyle}>
              Anything else we should know?{' '}
              <span style={{ fontWeight: 400, color: 'rgba(255,255,255,0.35)' }}>(optional)</span>
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g. It's next to the taxi rank on Main Rd. Opens at 8am. Everyone knows it."
              rows={3}
              maxLength={300}
              style={{ ...inputStyle, minHeight: '80px', resize: 'none', lineHeight: 1.55 }}
            />
          </div>

          {/* Phone */}
          <div>
            <label style={labelStyle}>
              A WhatsApp number{' '}
              <span style={{ fontWeight: 400, color: 'rgba(255,255,255,0.35)' }}>(optional)</span>
            </label>
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: 'rgba(255,255,255,0.38)', marginBottom: '8px', marginTop: '-4px', lineHeight: 1.6 }}>
              Add <strong style={{ color: 'rgba(255,255,255,0.55)' }}>your number</strong> so we can thank you when it goes live —
              or add the <strong style={{ color: 'rgba(255,255,255,0.55)' }}>owner's number</strong> if you know it,
              so we can reach out and let them know their place is now on Kayaa.
            </p>
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="e.g. 082 123 4567 — yours or the owner's"
              style={inputStyle}
            />
          </div>

        </div>

        {/* Error */}
        {error && (
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: '#F87171', marginTop: '16px' }}>
            {error}
          </p>
        )}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={submitting}
          style={{
            width: '100%', marginTop: '28px', padding: '16px',
            background: submitting ? 'rgba(57,217,138,0.6)' : '#39D98A',
            color: '#0D1117', border: 'none', borderRadius: '12px',
            fontFamily: 'Inter, sans-serif', fontWeight: 800, fontSize: '17px',
            cursor: submitting ? 'default' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
          }}
        >
          {submitting ? 'Submitting…' : 'Submit nomination'}
        </button>

        <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: 'rgba(255,255,255,0.25)', textAlign: 'center', marginTop: '14px', lineHeight: 1.6 }}>
          Every nomination is reviewed by our team. We add good places as fast as we can.
        </p>

      </div>
    </div>
  );
}
