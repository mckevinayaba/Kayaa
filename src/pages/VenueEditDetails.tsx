import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, FileText, Phone, MessageCircle, ToggleLeft, ToggleRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { getVenueOwnerByUserId } from '../lib/api';

// ─── Field wrapper ────────────────────────────────────────────────────────────

function Field({
  label, hint, children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: '20px' }}>
      <label style={{
        display: 'block',
        fontFamily: 'DM Sans, sans-serif', fontWeight: 700, fontSize: '12px',
        color: 'rgba(255,255,255,0.5)',
        textTransform: 'uppercase', letterSpacing: '0.06em',
        marginBottom: '8px',
      }}>
        {label}
      </label>
      {children}
      {hint && (
        <p style={{
          fontFamily: 'DM Sans, sans-serif', fontSize: '11px',
          color: 'rgba(255,255,255,0.3)', margin: '6px 0 0', lineHeight: 1.5,
        }}>
          {hint}
        </p>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function VenueEditDetails() {
  const { user }   = useAuth();
  const navigate   = useNavigate();

  const [venueId,     setVenueId]     = useState<string | null>(null);
  const [venueName,   setVenueName]   = useState('');
  const [description, setDescription] = useState('');
  const [phone,       setPhone]       = useState('');
  const [whatsapp,    setWhatsapp]    = useState('');
  const [isOpen,      setIsOpen]      = useState(false);
  const [loading,     setLoading]     = useState(true);
  const [saving,      setSaving]      = useState(false);
  const [saved,       setSaved]       = useState(false);
  const [error,       setError]       = useState<string | null>(null);

  const inputStyle: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box',
    background: 'var(--color-surface)', border: '1px solid #30363D',
    borderRadius: '10px', padding: '12px 14px',
    fontFamily: 'DM Sans, sans-serif', fontSize: '14px',
    color: '#F0F6FC', outline: 'none',
    lineHeight: 1.5,
  };

  // ── Load current venue data ──────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    (async () => {
      const ownership = await getVenueOwnerByUserId(user.id);
      if (!ownership) { setLoading(false); return; }
      setVenueId(ownership.venueId);

      const { data } = await supabase
        .from('venues')
        .select('name, description, phone_number, whatsapp_number, status')
        .eq('id', ownership.venueId)
        .maybeSingle();

      if (data) {
        setVenueName(data.name ?? '');
        setDescription(data.description ?? '');
        setPhone(data.phone_number ?? '');
        setWhatsapp(data.whatsapp_number ?? '');
        setIsOpen(data.status !== 'closed');
      }
      setLoading(false);
    })();
  }, [user]);

  // ── Save ─────────────────────────────────────────────────────────────────
  async function handleSave() {
    if (!venueId || saving) return;
    setError(null);
    setSaving(true);

    const { error: err } = await supabase
      .from('venues')
      .update({
        description:      description.trim(),
        phone_number:     phone.trim()    || null,
        whatsapp_number:  whatsapp.trim() || null,
        status:           isOpen ? 'open' : 'closed',
      })
      .eq('id', venueId);

    setSaving(false);
    if (err) {
      setError('Save failed — please try again.');
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    }
  }

  // ── Open/closed toggle ────────────────────────────────────────────────────
  async function handleToggleStatus() {
    if (!venueId) return;
    const next = !isOpen;
    setIsOpen(next);
    // Optimistic — fire and forget (visible immediately, syncs to DB)
    await supabase
      .from('venues')
      .update({ status: next ? 'open' : 'closed' })
      .eq('id', venueId);
  }

  // ── Skeleton ─────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ padding: '70px 16px 16px' }}>
        {[120, 80, 60, 60].map((h, i) => (
          <div key={i} style={{ height: h, background: 'rgba(255,255,255,0.04)', borderRadius: '14px', marginBottom: '12px' }} />
        ))}
      </div>
    );
  }

  if (!venueId) {
    return (
      <div style={{ padding: '80px 24px', textAlign: 'center' }}>
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: 'rgba(255,255,255,0.4)' }}>
          No venue found. <a href="/onboarding" style={{ color: '#39D98A' }}>Add your place first.</a>
        </p>
      </div>
    );
  }

  return (
    <div style={{ paddingBottom: '100px' }}>

      {/* ── Sticky header ───────────────────────────────────────────────── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 40,
        background: 'rgba(13,17,23,0.94)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid #21262D',
        padding: '12px 16px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <button
          onClick={() => navigate(-1)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
        >
          <ArrowLeft size={20} color="rgba(255,255,255,0.6)" />
        </button>

        <h1 style={{
          fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '16px',
          color: '#F0F6FC', margin: 0,
        }}>
          Edit Details
        </h1>

        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '8px 14px', borderRadius: '10px', border: 'none',
            background: saved ? 'rgba(57,217,138,0.2)' : '#39D98A',
            fontFamily: 'DM Sans, sans-serif', fontWeight: 700, fontSize: '13px',
            color: saved ? '#39D98A' : '#000',
            cursor: saving ? 'default' : 'pointer',
            transition: 'all 0.2s',
          }}
        >
          {saved ? <><Check size={14} /> Saved</> : saving ? 'Saving…' : 'Save'}
        </button>
      </div>

      <div style={{ padding: '20px 16px' }}>

        {/* ── Venue name (read-only context) ──────────────────────────── */}
        <div style={{
          background: 'var(--color-surface)', border: '1px solid #21262D',
          borderRadius: '14px', padding: '12px 16px',
          marginBottom: '24px',
          display: 'flex', alignItems: 'center', gap: '10px',
        }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0,
            background: 'rgba(57,217,138,0.1)', border: '1px solid rgba(57,217,138,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '18px',
          }}>
            🏪
          </div>
          <div>
            <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '15px', color: '#F0F6FC' }}>
              {venueName}
            </div>
            <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>
              Editing your listing details
            </div>
          </div>
        </div>

        {/* ── Open / Closed toggle ─────────────────────────────────────── */}
        <div style={{
          background: isOpen ? 'rgba(57,217,138,0.06)' : 'rgba(255,255,255,0.03)',
          border: `1px solid ${isOpen ? 'rgba(57,217,138,0.25)' : 'var(--color-border)'}`,
          borderRadius: '14px', padding: '16px',
          marginBottom: '24px',
          display: 'flex', alignItems: 'center', gap: '14px',
        }}>
          <div style={{ flex: 1 }}>
            <div style={{
              fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '15px',
              color: isOpen ? '#39D98A' : 'rgba(255,255,255,0.5)',
            }}>
              {isOpen ? 'Open now' : 'Closed'}
            </div>
            <div style={{
              fontFamily: 'DM Sans, sans-serif', fontSize: '12px',
              color: 'rgba(255,255,255,0.35)', marginTop: '2px',
            }}>
              {isOpen
                ? 'Customers can see your place is open'
                : 'Your place is showing as closed to visitors'}
            </div>
          </div>
          <button
            onClick={handleToggleStatus}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', flexShrink: 0 }}
          >
            {isOpen
              ? <ToggleRight size={38} color="#39D98A" />
              : <ToggleLeft  size={38} color="rgba(255,255,255,0.25)" />
            }
          </button>
        </div>

        {/* ── Description ─────────────────────────────────────────────── */}
        <Field
          label="Short description"
          hint="A sentence or two about what makes your place special. Shown on your venue page and in search results."
        >
          <div style={{ position: 'relative' }}>
            <FileText size={14} color="rgba(255,255,255,0.25)" style={{ position: 'absolute', top: '14px', left: '13px' }} />
            <textarea
              value={description}
              onChange={e => { setDescription(e.target.value); setSaved(false); }}
              rows={4}
              maxLength={280}
              placeholder="e.g. A neighbourhood barbershop in Berea. Sharp cuts, good conversations, always fresh."
              style={{ ...inputStyle, paddingLeft: '36px', resize: 'none' }}
            />
          </div>
          <div style={{
            display: 'flex', justifyContent: 'flex-end',
            fontFamily: 'DM Sans, sans-serif', fontSize: '11px',
            color: description.length > 240 ? '#FBBF24' : 'rgba(255,255,255,0.2)',
            marginTop: '4px',
          }}>
            {description.length}/280
          </div>
        </Field>

        {/* ── Phone ───────────────────────────────────────────────────── */}
        <Field
          label="Phone number"
          hint="Customers can call you directly from your venue page."
        >
          <div style={{ position: 'relative' }}>
            <Phone size={14} color="rgba(255,255,255,0.25)" style={{ position: 'absolute', top: '14px', left: '13px' }} />
            <input
              type="tel"
              value={phone}
              onChange={e => { setPhone(e.target.value); setSaved(false); }}
              placeholder="e.g. 011 123 4567"
              style={{ ...inputStyle, paddingLeft: '36px' }}
            />
          </div>
        </Field>

        {/* ── WhatsApp ─────────────────────────────────────────────────── */}
        <Field
          label="WhatsApp number"
          hint="Customers can message you on WhatsApp. Use the full number with country code (e.g. 27831234567)."
        >
          <div style={{ position: 'relative' }}>
            <MessageCircle size={14} color="rgba(255,255,255,0.25)" style={{ position: 'absolute', top: '14px', left: '13px' }} />
            <input
              type="tel"
              value={whatsapp}
              onChange={e => { setWhatsapp(e.target.value); setSaved(false); }}
              placeholder="e.g. 27831234567"
              style={{ ...inputStyle, paddingLeft: '36px' }}
            />
          </div>
        </Field>

        {/* ── Error ──────────────────────────────────────────────────── */}
        {error && (
          <div style={{
            padding: '12px 14px', borderRadius: '10px', marginBottom: '16px',
            background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
            fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: '#F87171',
          }}>
            {error}
          </div>
        )}

        {/* ── Save button ─────────────────────────────────────────────── */}
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            width: '100%', padding: '15px', borderRadius: '12px', border: 'none',
            background: saved ? 'rgba(57,217,138,0.15)' : '#39D98A',
            fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '15px',
            color: saved ? '#39D98A' : '#000',
            cursor: saving ? 'default' : 'pointer',
            transition: 'all 0.2s',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
          }}
        >
          {saved
            ? <><Check size={16} /> Changes saved</>
            : saving ? 'Saving…' : 'Save changes'}
        </button>

        <p style={{
          fontFamily: 'DM Sans, sans-serif', fontSize: '12px',
          color: 'rgba(255,255,255,0.25)', textAlign: 'center', marginTop: '12px',
        }}>
          Changes appear on your venue page immediately.
        </p>
      </div>
    </div>
  );
}
