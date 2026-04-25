import { useState } from 'react';
import { X, Check } from 'lucide-react';
import { getAllCountries, type Country } from '../config/countries';
import { useCountry } from '../contexts/CountryContext';
import { joinCountryWaitlist } from '../lib/api';

function NotifyRow({ country }: { country: Country }) {
  const [open,       setOpen]       = useState(false);
  const [contact,    setContact]    = useState('');
  const [submitted,  setSubmitted]  = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [err,        setErr]        = useState('');

  async function handleSubmit() {
    const val = contact.trim();
    if (!val) { setErr('Enter a phone number or email'); return; }
    setSubmitting(true);
    setErr('');
    const { error } = await joinCountryWaitlist(country.code, val);
    setSubmitting(false);
    if (error) { setErr('Could not save. Try again.'); return; }
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div style={{
        fontSize: '12px', color: '#39D98A',
        fontFamily: 'DM Sans, sans-serif',
        padding: '8px 0',
      }}>
        ✓ We'll notify you when {country.name} launches
      </div>
    );
  }

  if (open) {
    return (
      <div style={{ paddingTop: '8px' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <input
            type="text"
            value={contact}
            onChange={e => { setContact(e.target.value); setErr(''); }}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            placeholder="Phone or email"
            autoFocus
            style={{
              flex: 1, background: 'var(--color-bg)',
              border: `1px solid ${err ? '#EF4444' : 'var(--color-border)'}`,
              borderRadius: '10px', padding: '9px 12px',
              color: 'var(--color-text)', fontSize: '13px',
              fontFamily: 'DM Sans, sans-serif', outline: 'none',
            }}
          />
          <button
            onClick={handleSubmit}
            disabled={submitting}
            style={{
              background: '#39D98A', color: '#000',
              border: 'none', borderRadius: '10px',
              padding: '9px 14px', fontWeight: 700,
              fontSize: '13px', cursor: submitting ? 'default' : 'pointer',
              fontFamily: 'DM Sans, sans-serif',
              opacity: submitting ? 0.6 : 1,
            }}
          >
            {submitting ? '…' : 'Notify me'}
          </button>
        </div>
        {err && <div style={{ fontSize: '11px', color: '#EF4444', marginTop: '4px', fontFamily: 'DM Sans, sans-serif' }}>{err}</div>}
      </div>
    );
  }

  return (
    <button
      onClick={e => { e.stopPropagation(); setOpen(true); }}
      style={{
        background: 'transparent',
        border: '1px solid rgba(245,166,35,0.4)',
        borderRadius: '20px', padding: '4px 10px',
        color: '#F5A623', fontSize: '11px', fontWeight: 700,
        cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
        flexShrink: 0,
      }}
    >
      Notify me
    </button>
  );
}

// ─── Main modal ───────────────────────────────────────────────────────────────

export default function CountrySelector({ onClose }: { onClose: () => void }) {
  const { selectedCountry, setSelectedCountry } = useCountry();
  const countries = getAllCountries();

  function handleSelect(country: Country) {
    if (!country.active) return;
    setSelectedCountry(country);
    onClose();
    // Reload feed content for the new country
    window.location.reload();
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 150,
          background: 'rgba(0,0,0,0.6)',
        }}
      />

      {/* Bottom sheet */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 151,
        background: 'var(--color-surface)',
        borderRadius: '20px 20px 0 0',
        padding: '20px 20px 48px',
        maxHeight: '85vh',
        overflowY: 'auto',
      }}>
        {/* Handle */}
        <div style={{
          width: '36px', height: '4px', borderRadius: '2px',
          background: 'var(--color-border)',
          margin: '0 auto 20px',
        }} />

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
          <div>
            <h2 style={{
              fontFamily: 'Syne, sans-serif', fontWeight: 800,
              fontSize: '20px', color: 'var(--color-text)', margin: 0,
            }}>
              Select your country
            </h2>
            <p style={{
              fontSize: '13px', color: 'var(--color-muted)',
              margin: '4px 0 0', fontFamily: 'DM Sans, sans-serif',
            }}>
              kayaa is available in these countries
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent', border: 'none',
              cursor: 'pointer', padding: '4px',
              display: 'flex', alignItems: 'center',
            }}
          >
            <X size={20} color="var(--color-muted)" />
          </button>
        </div>

        {/* Country list */}
        <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {countries.map(country => {
            const isSelected = country.code === selectedCountry.code;
            const isActive   = country.active;

            return (
              <div key={country.code}>
                <div
                  onClick={() => handleSelect(country)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '14px 12px',
                    borderRadius: '14px',
                    cursor: isActive ? 'pointer' : 'default',
                    background: isSelected ? 'rgba(57,217,138,0.06)' : 'transparent',
                    border: `1px solid ${isSelected ? 'rgba(57,217,138,0.25)' : 'transparent'}`,
                    opacity: isActive ? 1 : 0.7,
                    transition: 'background 0.15s',
                  }}
                >
                  {/* Flag */}
                  <span style={{ fontSize: '26px', flexShrink: 0 }}>{country.flag}</span>

                  {/* Name + currency */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontFamily: 'Syne, sans-serif', fontWeight: 700,
                      fontSize: '15px', color: 'var(--color-text)',
                    }}>
                      {country.name}
                    </div>
                    <div style={{
                      fontSize: '12px', color: 'var(--color-muted)',
                      fontFamily: 'DM Sans, sans-serif', marginTop: '1px',
                    }}>
                      {country.currency_symbol} {country.currency_code}
                    </div>
                  </div>

                  {/* Right side */}
                  {isSelected && isActive ? (
                    <Check size={18} color="#39D98A" strokeWidth={2.5} />
                  ) : !isActive ? (
                    <span style={{
                      fontSize: '11px', fontWeight: 700,
                      color: '#F5A623',
                      background: 'rgba(245,166,35,0.12)',
                      border: '1px solid rgba(245,166,35,0.25)',
                      padding: '3px 8px', borderRadius: '20px',
                      flexShrink: 0,
                    }}>
                      Coming soon
                    </span>
                  ) : null}
                </div>

                {/* Notify me form — only for coming-soon countries */}
                {!isActive && (
                  <div style={{ paddingLeft: '50px', paddingBottom: '4px' }}>
                    <NotifyRow country={country} />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div style={{
          marginTop: '24px', paddingTop: '16px',
          borderTop: '1px solid var(--color-border)',
          textAlign: 'center',
          fontSize: '13px', color: 'var(--color-muted)',
          fontFamily: 'DM Sans, sans-serif', lineHeight: 1.6,
        }}>
          More countries coming soon.<br />
          <span style={{ color: '#39D98A', fontWeight: 600 }}>kayaa</span> is building across Africa.
        </div>
      </div>
    </>
  );
}
