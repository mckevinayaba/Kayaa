/**
 * QuickAddPlace — 30-second community place submission.
 *
 * Any user can add a missing place in three fields:
 *   name · category · neighbourhood
 *
 * No photos. No owner registration. No 4-step flow.
 * The place is saved as status = 'closed', owner_claimed = false.
 * It appears in the feed immediately for that neighbourhood.
 * Owners can claim it later.
 *
 * After saving, we call /api/generate-description to enrich the listing
 * with an AI-written description — so every new place looks alive from day 1.
 */

import { useState } from 'react';
import { X, MapPin, ChevronDown, Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useCountry } from '../contexts/CountryContext';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toSlug(name: string, suburb: string): string {
  const combined = `${name}-${suburb}`;
  return combined
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 28)
    .replace(/-+$/, '');
}

/** Call the AI description endpoint and update the venue record in Supabase. */
async function enrichDescription(slug: string, name: string, type: string, location: string) {
  try {
    const res = await fetch('/api/generate-description', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ name, type, location }),
    });
    if (!res.ok) return;
    const { description } = await res.json();
    if (!description) return;

    // Update the venue record — slug is unique so this hits exactly one row
    await supabase
      .from('venues')
      .update({ description })
      .eq('slug', slug);
  } catch {
    // Non-fatal — the venue is already saved with a basic description
  }
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface QuickAddPlaceProps {
  defaultSuburb?: string;
  defaultCity?:   string;
  onAdded?: (venueName: string) => void;
  onClose: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function QuickAddPlace({
  defaultSuburb = '',
  defaultCity   = '',
  onAdded,
  onClose,
}: QuickAddPlaceProps) {
  const { categoryLabels } = useCountry();

  const [name,       setName]       = useState('');
  const [category,   setCategory]   = useState('');
  const [suburb,     setSuburb]     = useState(defaultSuburb);
  const [city,       setCity]       = useState(defaultCity);
  const [saving,     setSaving]     = useState(false);
  const [enriching,  setEnriching]  = useState(false);
  const [done,       setDone]       = useState(false);
  const [error,      setError]      = useState('');

  const canSubmit = name.trim().length >= 2 && category && suburb.trim().length >= 2;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || saving) return;

    setSaving(true);
    setError('');

    const trimmedName   = name.trim();
    const trimmedSuburb = suburb.trim();
    const trimmedCity   = city.trim();
    const slug          = toSlug(trimmedName, trimmedSuburb);
    const location      = [trimmedSuburb, trimmedCity].filter(Boolean).join(', ');

    // Fallback description (plain, used until AI enrichment completes)
    const cat = categoryLabels.find(c => c.key === category);
    const fallbackDescription = cat
      ? `${cat.label} in ${trimmedSuburb}.`
      : `Place in ${trimmedSuburb}.`;

    // ── Save to Supabase ───────────────────────────────────────────────────
    let finalSlug = slug;

    const { error: err } = await supabase.from('venues').insert({
      name:          trimmedName,
      type:          category,
      slug,
      location,
      description:   fallbackDescription,
      status:        'closed',
      owner_claimed: false,
      country_code:  'ZA',
    });

    if (err) {
      if (err.code === '23505') {
        // Duplicate slug — retry with random suffix
        finalSlug = `${slug}-${Math.random().toString(36).slice(2, 5)}`;
        const { error: err2 } = await supabase.from('venues').insert({
          name:          trimmedName,
          type:          category,
          slug:          finalSlug,
          location,
          description:   fallbackDescription,
          status:        'closed',
          owner_claimed: false,
          country_code:  'ZA',
        });
        if (err2) {
          setSaving(false);
          setError('Could not save. Try again.');
          return;
        }
      } else {
        setSaving(false);
        setError('Could not save. Try again.');
        return;
      }
    }

    setSaving(false);

    // ── Show done state immediately — don't wait for AI ───────────────────
    setDone(true);
    onAdded?.(trimmedName);

    // ── AI enrichment runs in the background ──────────────────────────────
    // The venue is already live. AI upgrades the description silently.
    setEnriching(true);
    await enrichDescription(finalSlug, trimmedName, category, location);
    setEnriching(false);
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 300,
          background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)',
        }}
      />

      {/* Sheet */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 301,
        background: '#161B22',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '20px 20px 0 0',
        padding: '24px 20px 48px',
        maxWidth: '560px', margin: '0 auto',
        boxShadow: '0 -8px 40px rgba(0,0,0,0.5)',
      }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div>
            <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '18px', color: '#F0F6FC', margin: 0 }}>
              Add a place
            </h2>
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: 'rgba(255,255,255,0.4)', margin: '4px 0 0', lineHeight: 1.4 }}>
              Know a barbershop, spaza, or shisanyama that's not on Kayaa yet? Add it in 30 seconds.
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0, marginLeft: '12px',
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
            }}
          >
            <X size={15} color="rgba(255,255,255,0.5)" />
          </button>
        </div>

        {/* Done state */}
        {done ? (
          <div style={{ textAlign: 'center', padding: '16px 0 8px' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>📍</div>
            <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '18px', color: '#39D98A', marginBottom: '6px' }}>
              {name} is on Kayaa
            </div>
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: 'rgba(255,255,255,0.45)', margin: '0 0 8px', lineHeight: 1.5 }}>
              It will appear in the feed for {suburb}. The owner can claim it anytime.
            </p>

            {/* AI enrichment indicator */}
            {enriching && (
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.2)',
                borderRadius: '20px', padding: '5px 12px', marginBottom: '16px',
              }}>
                <Sparkles size={12} color="#A78BFA" />
                <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: '#A78BFA' }}>
                  Writing description…
                </span>
              </div>
            )}

            <button
              onClick={onClose}
              style={{
                width: '100%', padding: '12px', borderRadius: '12px',
                background: '#39D98A', border: 'none',
                fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '15px',
                color: '#000', cursor: 'pointer',
                marginTop: enriching ? '0' : '16px',
              }}
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

              {/* Place name */}
              <div>
                <label style={labelStyle}>What's it called? *</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Uncle Dee's Barbershop"
                  autoFocus
                  style={inputStyle}
                />
              </div>

              {/* Category */}
              <div>
                <label style={labelStyle}>What kind of place? *</label>
                <div style={{ position: 'relative' }}>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    style={{ ...inputStyle, appearance: 'none', paddingRight: '36px' }}
                  >
                    <option value="">Choose a category…</option>
                    {categoryLabels.map(c => (
                      <option key={c.key} value={c.key}>{c.emoji} {c.label}</option>
                    ))}
                  </select>
                  <ChevronDown
                    size={15}
                    color="rgba(255,255,255,0.35)"
                    style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
                  />
                </div>
              </div>

              {/* Location */}
              <div>
                <label style={labelStyle}>Where is it? *</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <MapPin size={13} color="rgba(255,255,255,0.3)" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                    <input
                      type="text"
                      value={suburb}
                      onChange={e => setSuburb(e.target.value)}
                      placeholder="Suburb / Township"
                      style={{ ...inputStyle, paddingLeft: '28px' }}
                    />
                  </div>
                  <input
                    type="text"
                    value={city}
                    onChange={e => setCity(e.target.value)}
                    placeholder="City"
                    style={{ ...inputStyle, flex: 1 }}
                  />
                </div>
              </div>

              {error && (
                <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: '#F87171', margin: 0 }}>
                  {error}
                </p>
              )}

              {/* AI note */}
              <div style={{
                display: 'flex', alignItems: 'flex-start', gap: '8px',
                background: 'rgba(167,139,250,0.05)', border: '1px solid rgba(167,139,250,0.12)',
                borderRadius: '10px', padding: '10px 12px',
              }}>
                <Sparkles size={13} color="#A78BFA" style={{ flexShrink: 0, marginTop: '1px' }} />
                <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: 'rgba(255,255,255,0.35)', margin: 0, lineHeight: 1.5 }}>
                  We'll write a description for this place automatically. The owner can update it anytime after claiming.
                </p>
              </div>

              <button
                type="submit"
                disabled={!canSubmit || saving}
                style={{
                  width: '100%', padding: '13px', borderRadius: '12px',
                  background: canSubmit ? '#39D98A' : 'rgba(57,217,138,0.2)',
                  border: 'none',
                  fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '15px',
                  color: canSubmit ? '#000' : 'rgba(255,255,255,0.2)',
                  cursor: canSubmit ? 'pointer' : 'default',
                  transition: 'background 0.15s',
                }}
              >
                {saving ? 'Saving…' : 'Add this place →'}
              </button>
            </div>
          </form>
        )}
      </div>
    </>
  );
}

// ─── Shared styles ────────────────────────────────────────────────────────────

const labelStyle: React.CSSProperties = {
  fontFamily: 'DM Sans, sans-serif',
  fontSize: '12px',
  fontWeight: 600,
  color: 'rgba(255,255,255,0.45)',
  display: 'block',
  marginBottom: '6px',
  letterSpacing: '0.02em',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '10px',
  padding: '10px 12px',
  color: '#F0F6FC',
  fontSize: '14px',
  fontFamily: 'DM Sans, sans-serif',
  outline: 'none',
  boxSizing: 'border-box',
};
