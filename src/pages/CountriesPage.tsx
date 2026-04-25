import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllCountries, type Country } from '../config/countries';
import { joinCountryWaitlist } from '../lib/api';
import { useCountry } from '../contexts/CountryContext';

function NotifyInline({ country }: { country: Country }) {
  const [open, setOpen] = useState(false);
  const [contact, setContact] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState('');

  async function handleSubmit() {
    const val = contact.trim();
    if (!val) { setErr('Enter a phone or email'); return; }
    setSubmitting(true); setErr('');
    const { error } = await joinCountryWaitlist(country.code, val);
    setSubmitting(false);
    if (error) { setErr('Could not save. Try again.'); return; }
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div style={{ fontSize: '12px', color: '#39D98A', fontFamily: 'DM Sans, sans-serif', marginTop: '10px' }}>
        ✓ We'll notify you when {country.name} launches
      </div>
    );
  }

  if (open) {
    return (
      <div style={{ marginTop: '10px' }}>
        <div style={{ display: 'flex', gap: '6px' }}>
          <input
            type="text" value={contact}
            onChange={e => { setContact(e.target.value); setErr(''); }}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            placeholder="Phone or email"
            autoFocus
            style={{
              flex: 1, background: 'var(--color-bg)',
              border: `1px solid ${err ? '#EF4444' : 'var(--color-border)'}`,
              borderRadius: '10px', padding: '8px 12px',
              color: 'var(--color-text)', fontSize: '13px',
              fontFamily: 'DM Sans, sans-serif', outline: 'none',
            }}
          />
          <button
            onClick={handleSubmit} disabled={submitting}
            style={{
              background: '#39D98A', color: '#000', border: 'none',
              borderRadius: '10px', padding: '8px 12px', fontWeight: 700,
              fontSize: '12px', cursor: submitting ? 'default' : 'pointer',
              fontFamily: 'DM Sans, sans-serif', opacity: submitting ? 0.6 : 1,
            }}
          >
            {submitting ? '…' : 'Notify'}
          </button>
        </div>
        {err && <div style={{ fontSize: '11px', color: '#EF4444', marginTop: '4px', fontFamily: 'DM Sans, sans-serif' }}>{err}</div>}
      </div>
    );
  }

  return (
    <button
      onClick={() => setOpen(true)}
      style={{
        marginTop: '10px', background: 'transparent',
        border: '1px solid rgba(245,166,35,0.4)', borderRadius: '20px',
        padding: '5px 12px', color: '#F5A623', fontSize: '11px',
        fontWeight: 700, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
      }}
    >
      Notify me when live
    </button>
  );
}

function ActiveCountryCard({ country }: { country: Country }) {
  const navigate = useNavigate();
  const { setSelectedCountry } = useCountry();

  function handleOpen() {
    setSelectedCountry(country);
    navigate('/feed');
  }

  return (
    <div
      onClick={handleOpen}
      style={{
        background: 'var(--color-surface)',
        border: '1px solid rgba(57,217,138,0.2)',
        borderRadius: '16px', padding: '18px 16px',
        cursor: 'pointer', transition: 'border-color 0.15s',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
        <span style={{ fontSize: '32px' }}>{country.flag}</span>
        <span style={{
          fontSize: '10px', fontWeight: 700, color: '#39D98A',
          background: 'rgba(57,217,138,0.12)', border: '1px solid rgba(57,217,138,0.2)',
          padding: '3px 8px', borderRadius: '20px',
        }}>
          🟢 Live now
        </span>
      </div>
      <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '15px', color: 'var(--color-text)', marginBottom: '4px' }}>
        {country.name}
      </div>
      <div style={{ fontSize: '11px', color: 'var(--color-muted)', fontFamily: 'DM Sans, sans-serif', marginBottom: '10px' }}>
        {country.currency_symbol} {country.currency_code}
      </div>
      <div style={{ fontSize: '11px', color: 'var(--color-muted)', fontFamily: 'DM Sans, sans-serif', lineHeight: 1.6 }}>
        {country.launch_cities.slice(0, 3).join(' · ')}
        {country.launch_cities.length > 3 && ` +${country.launch_cities.length - 3} more`}
      </div>
      <div style={{
        marginTop: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#39D98A', color: '#000', borderRadius: '10px',
        padding: '8px 14px', fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '13px',
      }}>
        Open kayaa →
      </div>
    </div>
  );
}

function ComingSoonCard({ country }: { country: Country }) {
  return (
    <div
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: '16px', padding: '18px 16px',
        opacity: 0.85,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
        <span style={{ fontSize: '32px' }}>{country.flag}</span>
        <span style={{
          fontSize: '10px', fontWeight: 700, color: '#F5A623',
          background: 'rgba(245,166,35,0.12)', border: '1px solid rgba(245,166,35,0.25)',
          padding: '3px 8px', borderRadius: '20px',
        }}>
          🟡 Coming soon
        </span>
      </div>
      <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '15px', color: 'var(--color-text)', marginBottom: '4px' }}>
        {country.name}
      </div>
      <div style={{ fontSize: '11px', color: 'var(--color-muted)', fontFamily: 'DM Sans, sans-serif', marginBottom: '8px' }}>
        {country.currency_symbol} {country.currency_code}
      </div>
      <NotifyInline country={country} />
    </div>
  );
}

export default function CountriesPage() {
  const countries = getAllCountries();
  const active = countries.filter(c => c.active);
  const coming = countries.filter(c => !c.active);

  return (
    <div style={{ padding: '24px 16px 100px' }}>
      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <p style={{ fontSize: '12px', color: 'var(--color-accent)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '6px', fontFamily: 'DM Sans, sans-serif' }}>
          kayaa across Africa
        </p>
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '26px', color: 'var(--color-text)', margin: '0 0 8px' }}>
          Where we're live
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--color-muted)', fontFamily: 'DM Sans, sans-serif', lineHeight: 1.6, margin: 0 }}>
          Every neighbourhood in Africa deserves its own digital home. We're building it, city by city.
        </p>
      </div>

      {/* Active */}
      {active.length > 0 && (
        <div style={{ marginBottom: '28px' }}>
          <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '14px', color: 'var(--color-text)', marginBottom: '12px' }}>
            Active markets
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {active.map(c => <ActiveCountryCard key={c.code} country={c} />)}
          </div>
        </div>
      )}

      {/* Coming soon */}
      {coming.length > 0 && (
        <div style={{ marginBottom: '32px' }}>
          <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '14px', color: 'var(--color-text)', marginBottom: '12px' }}>
            Expanding next
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {coming.map(c => <ComingSoonCard key={c.code} country={c} />)}
          </div>
        </div>
      )}

      {/* Manifesto */}
      <div style={{
        background: '#0D1117', border: '1px solid rgba(57,217,138,0.15)',
        borderRadius: '20px', padding: '24px 20px',
      }}>
        <div style={{ fontSize: '24px', marginBottom: '12px' }}>🌍</div>
        <h3 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '17px', color: 'var(--color-text)', marginBottom: '10px' }}>
          Built for African neighbourhoods
        </h3>
        <p style={{ fontSize: '13px', color: 'var(--color-muted)', fontFamily: 'DM Sans, sans-serif', lineHeight: 1.7, margin: 0 }}>
          From the barbershop on the corner to the shisanyama behind the church — every recurring place people return to deserves a living community page. kayaa puts local places on the map, one neighbourhood at a time.
        </p>
      </div>
    </div>
  );
}
