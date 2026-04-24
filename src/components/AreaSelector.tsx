import { useState } from 'react';
import { X, MapPin, Search } from 'lucide-react';

const QUICK_AREAS = [
  { suburb: 'Soweto',          city: 'Johannesburg' },
  { suburb: 'Alexandra',       city: 'Johannesburg' },
  { suburb: 'Tembisa',         city: 'Ekurhuleni'   },
  { suburb: 'Sandton',         city: 'Johannesburg' },
  { suburb: 'Rosebank',        city: 'Johannesburg' },
  { suburb: 'Maboneng',        city: 'Johannesburg' },
  { suburb: 'Randburg',        city: 'Johannesburg' },
  { suburb: 'Germiston',       city: 'Ekurhuleni'   },
  { suburb: 'Midrand',         city: 'Johannesburg' },
  { suburb: "Mitchell's Plain", city: 'Cape Town'   },
  { suburb: 'Khayelitsha',     city: 'Cape Town'    },
  { suburb: 'Bellville',       city: 'Cape Town'    },
  { suburb: 'Durban CBD',      city: 'Durban'       },
  { suburb: 'Umlazi',          city: 'Durban'       },
  { suburb: 'Pinetown',        city: 'Durban'       },
  { suburb: 'Cape Town CBD',   city: 'Cape Town'    },
  { suburb: 'Observatory',     city: 'Cape Town'    },
  { suburb: 'Wynberg',         city: 'Cape Town'    },
];

interface AreaSelectorProps {
  currentSuburb: string;
  onSelect: (suburb: string, city: string) => void;
  onClose: () => void;
  /** Show geolocation denied message */
  showDeniedMessage?: boolean;
  onRequestDetect?: () => void;
}

export default function AreaSelector({
  currentSuburb,
  onSelect,
  onClose,
  showDeniedMessage = false,
  onRequestDetect,
}: AreaSelectorProps) {
  const [query, setQuery] = useState('');

  const filtered = query.trim()
    ? QUICK_AREAS.filter(a =>
        a.suburb.toLowerCase().includes(query.toLowerCase()) ||
        a.city.toLowerCase().includes(query.toLowerCase())
      )
    : QUICK_AREAS;

  function handleCustomSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    const match = QUICK_AREAS.find(a => a.suburb.toLowerCase() === trimmed.toLowerCase());
    onSelect(match?.suburb ?? trimmed, match?.city ?? trimmed);
    onClose();
  }

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(3px)' }} />

      {/* Sheet */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 201,
        background: 'var(--color-surface)', borderTop: '1px solid var(--color-border)',
        borderRadius: '20px 20px 0 0', padding: '20px 20px 40px',
        maxWidth: '480px', margin: '0 auto', maxHeight: '80vh',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexShrink: 0 }}>
          <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '16px', color: 'var(--color-text)' }}>
            Choose your area
          </span>
          <button onClick={onClose} style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <X size={16} color="var(--color-muted)" />
          </button>
        </div>

        {/* Geolocation denied message */}
        {showDeniedMessage && (
          <div style={{ background: 'rgba(245,166,35,0.08)', border: '1px solid rgba(245,166,35,0.2)', borderRadius: '10px', padding: '10px 14px', marginBottom: '14px', fontSize: '13px', color: 'var(--color-muted)', lineHeight: 1.5, flexShrink: 0 }}>
            Choose your area to see what is happening nearby.
            {onRequestDetect && (
              <button onClick={onRequestDetect} style={{ background: 'none', border: 'none', color: '#39D98A', fontSize: '13px', fontWeight: 600, cursor: 'pointer', padding: 0, marginLeft: '6px' }}>
                Detect location →
              </button>
            )}
          </div>
        )}

        {/* Current location */}
        {currentSuburb && !showDeniedMessage && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '14px', flexShrink: 0 }}>
            <MapPin size={13} color="#39D98A" />
            <span style={{ fontSize: '13px', color: '#39D98A', fontWeight: 600 }}>Currently: {currentSuburb}</span>
          </div>
        )}

        {/* Search */}
        <form onSubmit={handleCustomSubmit} style={{ position: 'relative', marginBottom: '16px', flexShrink: 0 }}>
          <Search size={14} color="var(--color-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search for your suburb or area"
            autoFocus
            style={{
              width: '100%', background: 'var(--color-bg)', border: '1px solid var(--color-border)',
              borderRadius: '12px', padding: '10px 12px 10px 34px',
              color: 'var(--color-text)', fontSize: '14px', fontFamily: 'DM Sans, sans-serif',
              outline: 'none', boxSizing: 'border-box',
            }}
          />
        </form>

        {/* Quick select chips */}
        <div style={{ overflowY: 'auto', flex: 1 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {filtered.map(area => (
              <button
                key={area.suburb}
                onClick={() => { onSelect(area.suburb, area.city); onClose(); }}
                style={{
                  padding: '7px 14px', borderRadius: '20px',
                  background: area.suburb === currentSuburb ? 'rgba(57,217,138,0.12)' : 'var(--color-bg)',
                  border: `1px solid ${area.suburb === currentSuburb ? 'rgba(57,217,138,0.4)' : 'var(--color-border)'}`,
                  color: area.suburb === currentSuburb ? '#39D98A' : 'var(--color-text)',
                  fontSize: '13px', fontWeight: area.suburb === currentSuburb ? 600 : 400,
                  fontFamily: 'DM Sans, sans-serif', cursor: 'pointer', whiteSpace: 'nowrap',
                }}
              >
                {area.suburb}
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
