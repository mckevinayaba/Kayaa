import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Shield, Phone } from 'lucide-react';
import {
  getEmergencyContacts,
  saveEmergencyContacts,
  type EmergencyContact,
} from '../components/safety/SafetyCheckIn';

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function EmergencyContacts() {
  const navigate = useNavigate();

  const [contacts,    setContacts]    = useState<EmergencyContact[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [name,        setName]        = useState('');
  const [phone,       setPhone]       = useState('');
  const [relationship,setRelationship]= useState('');
  const [error,       setError]       = useState('');

  useEffect(() => {
    setContacts(getEmergencyContacts());
  }, []);

  function handleAdd() {
    const n = name.trim();
    const p = phone.replace(/\D/g, '');
    if (!n)           { setError('Please enter a name');          return; }
    if (p.length < 9) { setError('Enter a valid WhatsApp number'); return; }

    const updated = [
      ...contacts,
      { id: crypto.randomUUID(), name: n, phone: p, relationship: relationship.trim() || 'Contact' },
    ];
    setContacts(updated);
    saveEmergencyContacts(updated);
    setName(''); setPhone(''); setRelationship(''); setError('');
    setShowAddForm(false);
  }

  function handleDelete(id: string) {
    const updated = contacts.filter(c => c.id !== id);
    setContacts(updated);
    saveEmergencyContacts(updated);
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box',
    background: '#161B22', border: '1px solid #30363D',
    borderRadius: '10px', padding: '12px 14px',
    color: '#F0F6FC', fontFamily: 'DM Sans, sans-serif', fontSize: '14px',
    outline: 'none',
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', paddingBottom: '100px' }}>

      {/* Sticky header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 40,
        background: 'rgba(13,17,23,0.95)', backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--color-border)',
        padding: '14px 16px',
        display: 'flex', alignItems: 'center', gap: '10px',
      } as React.CSSProperties}>
        <button
          onClick={() => navigate(-1)}
          style={{
            background: 'var(--color-surface)', border: '1px solid var(--color-border)',
            borderRadius: '10px', width: '36px', height: '36px', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <ArrowLeft size={18} color="var(--color-text)" />
        </button>
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '20px', color: 'var(--color-text)', margin: 0 }}>
          Emergency Contacts
        </h1>
      </div>

      <div style={{ padding: '16px' }}>

        {/* Info banner */}
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: '10px',
          padding: '14px', marginBottom: '20px',
          background: 'rgba(57,217,138,0.08)',
          border: '1px solid rgba(57,217,138,0.2)',
          borderRadius: '12px',
        }}>
          <Shield size={16} color="#39D98A" style={{ flexShrink: 0, marginTop: '1px' }} />
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: 'rgba(57,217,138,0.9)', lineHeight: 1.5, margin: 0 }}>
            These contacts are notified via WhatsApp when you tap <strong>Safety Check-in</strong> at a place. Stored on your device only.
          </p>
        </div>

        {/* Contact list */}
        {contacts.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
            {contacts.map(c => (
              <div
                key={c.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '14px',
                  background: '#161B22',
                  border: '1px solid #21262D',
                  borderRadius: '14px',
                }}
              >
                {/* Avatar */}
                <div style={{
                  width: '40px', height: '40px', borderRadius: '50%', flexShrink: 0,
                  background: 'rgba(57,217,138,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '15px', color: '#39D98A',
                }}>
                  {c.name[0]?.toUpperCase()}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 700, fontSize: '14px', color: '#F0F6FC', marginBottom: '2px' }}>
                    {c.name}
                  </div>
                  <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Phone size={10} />
                    {c.phone}
                    {c.relationship && <span style={{ marginLeft: '6px', color: 'rgba(255,255,255,0.3)' }}>· {c.relationship}</span>}
                  </div>
                </div>

                {/* Delete */}
                <button
                  onClick={() => handleDelete(c.id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px', flexShrink: 0 }}
                >
                  <Trash2 size={16} color="rgba(239,68,68,0.55)" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {contacts.length === 0 && !showAddForm && (
          <div style={{ textAlign: 'center', padding: '40px 0 20px' }}>
            <div style={{ fontSize: '44px', marginBottom: '12px' }}>🛡️</div>
            <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '16px', color: 'var(--color-text)', marginBottom: '6px' }}>
              No contacts yet
            </div>
            <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: 'var(--color-muted)' }}>
              Add people to notify when you check in somewhere
            </div>
          </div>
        )}

        {/* Add form */}
        {showAddForm ? (
          <div style={{
            padding: '16px',
            background: '#161B22',
            border: '1px solid rgba(57,217,138,0.2)',
            borderRadius: '14px',
            display: 'flex', flexDirection: 'column', gap: '10px',
            marginBottom: '16px',
          }}>
            <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '14px', color: '#39D98A', marginBottom: '4px' }}>
              New Contact
            </div>

            <input
              style={inputStyle} placeholder="Full name"
              value={name} onChange={e => { setName(e.target.value); setError(''); }}
            />
            <input
              style={inputStyle} placeholder="WhatsApp number (e.g. 0821234567)"
              type="tel" value={phone} onChange={e => { setPhone(e.target.value); setError(''); }}
            />
            <input
              style={inputStyle} placeholder="Relationship (e.g. Mom, Partner, Friend)"
              value={relationship} onChange={e => setRelationship(e.target.value)}
            />

            {error && (
              <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: '#EF4444' }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={handleAdd}
                style={{
                  flex: 1, padding: '12px',
                  background: '#39D98A', border: 'none', borderRadius: '10px',
                  fontFamily: 'DM Sans, sans-serif', fontWeight: 700, fontSize: '14px',
                  color: '#000', cursor: 'pointer',
                }}
              >
                Save Contact
              </button>
              <button
                onClick={() => { setShowAddForm(false); setError(''); }}
                style={{
                  padding: '12px 20px',
                  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '10px',
                  fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: '14px',
                  color: 'rgba(255,255,255,0.55)', cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowAddForm(true)}
            style={{
              width: '100%',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              padding: '15px',
              background: '#39D98A',
              border: 'none', borderRadius: '14px',
              fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '14px',
              color: '#0D1117', cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(57,217,138,0.3)',
            }}
          >
            <Plus size={18} />
            Add Emergency Contact
          </button>
        )}
      </div>
    </div>
  );
}
