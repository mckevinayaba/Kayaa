import { useState, useEffect } from 'react';
import { Shield, Users, Send, X, Plus, Trash2, Phone } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { getVisitorId } from '../../lib/api';

// ─── Emergency contact type ───────────────────────────────────────────────────

export interface EmergencyContact {
  id: string;
  name: string;
  phone: string;        // WhatsApp number, digits only
  relationship: string;
}

// ─── localStorage helpers ─────────────────────────────────────────────────────

const EC_KEY = 'kayaa_emergency_contacts';

export function getEmergencyContacts(): EmergencyContact[] {
  try { return JSON.parse(localStorage.getItem(EC_KEY) ?? '[]'); }
  catch { return []; }
}

export function saveEmergencyContacts(contacts: EmergencyContact[]): void {
  try { localStorage.setItem(EC_KEY, JSON.stringify(contacts)); }
  catch { /* storage full */ }
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface SafetyCheckInProps {
  placeId: string;
  placeName: string;
  placeUrl?: string;     // deeplink — defaults to current window.location.href
  onClose: () => void;
}

// ─── Add-contact mini form ────────────────────────────────────────────────────

function AddContactForm({ onAdd }: { onAdd: (c: EmergencyContact) => void }) {
  const [name,         setName]         = useState('');
  const [phone,        setPhone]        = useState('');
  const [relationship, setRelationship] = useState('');

  function submit() {
    const n = name.trim();
    const p = phone.replace(/\D/g, '');
    if (!n || p.length < 9) return;
    onAdd({
      id:           crypto.randomUUID(),
      name:         n,
      phone:        p,
      relationship: relationship.trim() || 'Contact',
    });
    setName(''); setPhone(''); setRelationship('');
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box',
    background: '#0D1117', border: '1px solid #30363D',
    borderRadius: '8px', padding: '9px 12px',
    color: '#F0F6FC', fontFamily: 'DM Sans, sans-serif', fontSize: '14px',
    outline: 'none',
  };

  return (
    <div style={{ background: 'rgba(57,217,138,0.06)', border: '1px solid rgba(57,217,138,0.2)', borderRadius: '12px', padding: '14px', marginTop: '10px' }}>
      <div style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 700, fontSize: '12px', color: '#39D98A', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        New Contact
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <input style={inputStyle} placeholder="Name" value={name} onChange={e => setName(e.target.value)} />
        <input style={inputStyle} placeholder="WhatsApp number (e.g. 0821234567)" value={phone} onChange={e => setPhone(e.target.value)} type="tel" />
        <input style={inputStyle} placeholder="Relationship (e.g. Mom, Partner)" value={relationship} onChange={e => setRelationship(e.target.value)} />
        <button
          onClick={submit}
          disabled={!name.trim() || phone.replace(/\D/g, '').length < 9}
          style={{
            background: name.trim() && phone.replace(/\D/g, '').length >= 9 ? '#39D98A' : 'rgba(255,255,255,0.08)',
            color: name.trim() && phone.replace(/\D/g, '').length >= 9 ? '#000' : 'rgba(255,255,255,0.3)',
            border: 'none', borderRadius: '8px', padding: '10px',
            fontFamily: 'DM Sans, sans-serif', fontWeight: 700, fontSize: '13px', cursor: 'pointer',
          }}
        >
          Save Contact
        </button>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function SafetyCheckIn({ placeId, placeName, placeUrl, onClose }: SafetyCheckInProps) {
  const [contacts,  setContacts]  = useState<EmergencyContact[]>([]);
  const [selected,  setSelected]  = useState<Set<string>>(new Set());
  const [adding,    setAdding]    = useState(false);
  const [sending,   setSending]   = useState(false);
  const [sent,      setSent]      = useState(false);

  useEffect(() => {
    setContacts(getEmergencyContacts());
  }, []);

  function toggle(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function handleAdd(c: EmergencyContact) {
    const next = [...contacts, c];
    setContacts(next);
    saveEmergencyContacts(next);
    setAdding(false);
    setSelected(prev => new Set([...prev, c.id]));
  }

  function handleRemove(id: string) {
    const next = contacts.filter(c => c.id !== id);
    setContacts(next);
    saveEmergencyContacts(next);
    setSelected(prev => { const s = new Set(prev); s.delete(id); return s; });
  }

  async function handleSend() {
    if (selected.size === 0) return;
    setSending(true);

    const visitorId = getVisitorId();
    const url = placeUrl || window.location.href;
    const message = encodeURIComponent(
      `Hi! Just checking in to let you know I'm at *${placeName}* on Kayaa.\n\n📍 ${url}\n\nStay safe! 🛡️`
    );

    // Log the check-in to DB (fire-and-forget)
    supabase.from('safety_checkins').insert({
      visitor_id: visitorId,
      place_id:   placeId,
      place_name: placeName,
      contact_count: selected.size,
    }).then(() => {/* ignore errors */});

    // Open WhatsApp for each selected contact in sequence
    const chosen = contacts.filter(c => selected.has(c.id));
    for (const contact of chosen) {
      const num = contact.phone.replace(/\D/g, '');
      // Add South African country code if local number
      const fullNum = num.startsWith('0') ? `27${num.slice(1)}` : num;
      window.open(`https://wa.me/${fullNum}?text=${message}`, '_blank');
      // Brief pause between opens to avoid popup blocker
      await new Promise(r => setTimeout(r, 500));
    }

    setSending(false);
    setSent(true);
  }

  // ── Success ──────────────────────────────────────────────────────────────────
  if (sent) {
    return (
      <div style={OVERLAY} onClick={onClose}>
        <div style={SHEET} onClick={e => e.stopPropagation()}>
          <div style={{ textAlign: 'center', padding: '36px 24px' }}>
            <div style={{ fontSize: '52px', marginBottom: '12px' }}>🛡️</div>
            <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '18px', color: '#F0F6FC', marginBottom: '8px' }}>
              Check-in Sent!
            </div>
            <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: 'rgba(255,255,255,0.55)', lineHeight: 1.5, marginBottom: '24px' }}>
              Your {selected.size} emergency {selected.size === 1 ? 'contact' : 'contacts'} {selected.size === 1 ? 'has' : 'have'} been notified via WhatsApp.
            </div>
            <button onClick={onClose} style={GREEN_BTN}>Done</button>
          </div>
        </div>
      </div>
    );
  }

  // ── Form ─────────────────────────────────────────────────────────────────────
  return (
    <div style={OVERLAY} onClick={onClose}>
      <div style={SHEET} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 16px 12px', borderBottom: '1px solid #21262D' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Shield size={18} color="#39D98A" />
            <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '16px', color: '#F0F6FC' }}>
              Safety Check-in
            </span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
            <X size={20} color="rgba(255,255,255,0.55)" />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '14px 16px', overflowY: 'auto', maxHeight: '65vh' }}>

          {/* Subtitle */}
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: 'rgba(255,255,255,0.6)', margin: '0 0 16px', lineHeight: 1.5 }}>
            Let trusted contacts know you're at{' '}
            <strong style={{ color: '#F0F6FC' }}>{placeName}</strong>
          </p>

          {/* Contact list */}
          {contacts.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
              {contacts.map(c => {
                const active = selected.has(c.id);
                return (
                  <div key={c.id} style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '12px',
                    background: active ? 'rgba(57,217,138,0.1)' : '#161B22',
                    border: `1px solid ${active ? 'rgba(57,217,138,0.4)' : '#21262D'}`,
                    borderRadius: '12px', cursor: 'pointer',
                    transition: 'border-color 0.15s',
                  }}
                  onClick={() => toggle(c.id)}
                  >
                    {/* Checkbox */}
                    <div style={{
                      width: '20px', height: '20px', borderRadius: '6px', flexShrink: 0,
                      background: active ? '#39D98A' : 'transparent',
                      border: `2px solid ${active ? '#39D98A' : '#30363D'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {active && <span style={{ color: '#000', fontSize: '11px', fontWeight: 900 }}>✓</span>}
                    </div>

                    {/* Avatar */}
                    <div style={{
                      width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0,
                      background: 'rgba(57,217,138,0.2)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '14px', color: '#39D98A',
                    }}>
                      {c.name[0]?.toUpperCase()}
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', fontWeight: 600, color: '#F0F6FC' }}>{c.name}</div>
                      <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>
                        {c.relationship} · <Phone size={10} style={{ display: 'inline', verticalAlign: 'middle' }} /> {c.phone}
                      </div>
                    </div>

                    {/* Remove */}
                    <button
                      onClick={e => { e.stopPropagation(); handleRemove(c.id); }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', flexShrink: 0 }}
                    >
                      <Trash2 size={14} color="rgba(255,255,255,0.25)" />
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '24px', background: '#161B22', borderRadius: '12px', marginBottom: '12px' }}>
              <Users size={32} color="rgba(255,255,255,0.2)" style={{ marginBottom: '8px' }} />
              <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: 'rgba(255,255,255,0.4)', marginBottom: '4px' }}>No emergency contacts yet</div>
              <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: 'rgba(255,255,255,0.25)' }}>Add a contact below to get started</div>
            </div>
          )}

          {/* Add contact toggle / form */}
          {adding ? (
            <AddContactForm onAdd={handleAdd} />
          ) : (
            <button
              onClick={() => setAdding(true)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                padding: '10px',
                background: 'transparent',
                border: '1px dashed rgba(255,255,255,0.15)',
                borderRadius: '10px',
                fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: '13px',
                color: 'rgba(255,255,255,0.4)', cursor: 'pointer',
                marginBottom: '16px',
              }}
            >
              <Plus size={14} /> Add Emergency Contact
            </button>
          )}

          {/* Send button */}
          <button
            onClick={handleSend}
            disabled={selected.size === 0 || sending}
            style={{
              width: '100%', padding: '14px',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              background: selected.size > 0 ? '#39D98A' : 'rgba(255,255,255,0.07)',
              border: 'none', borderRadius: '12px',
              fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '14px',
              color: selected.size > 0 ? '#000' : 'rgba(255,255,255,0.3)',
              cursor: selected.size > 0 ? 'pointer' : 'default',
              transition: 'background 0.2s',
            }}
          >
            <Send size={16} />
            {sending ? 'Opening WhatsApp…' : `Send to ${selected.size || ''} ${selected.size === 1 ? 'Contact' : selected.size > 0 ? 'Contacts' : 'Contacts'}`}
          </button>

          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.25)', textAlign: 'center', margin: '10px 0 0', lineHeight: 1.5 }}>
            Opens WhatsApp with a pre-filled safety message. Contacts are stored on your device only.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Shared styles ────────────────────────────────────────────────────────────

const OVERLAY: React.CSSProperties = {
  position: 'fixed', inset: 0, zIndex: 200,
  background: 'rgba(0,0,0,0.75)',
  backdropFilter: 'blur(4px)',
  WebkitBackdropFilter: 'blur(4px)',
  display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
};

const SHEET: React.CSSProperties = {
  width: '100%', maxWidth: '480px',
  background: '#0D1117',
  border: '1px solid #21262D',
  borderRadius: '20px 20px 0 0',
};

const GREEN_BTN: React.CSSProperties = {
  width: '100%', padding: '13px',
  background: '#39D98A', border: 'none', borderRadius: '12px',
  fontFamily: 'DM Sans, sans-serif', fontWeight: 700, fontSize: '14px',
  color: '#000', cursor: 'pointer',
};
