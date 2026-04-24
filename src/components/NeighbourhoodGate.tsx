import { useState } from 'react';
import { MapPin } from 'lucide-react';
import useLocation from '../hooks/useLocation';
import AreaSelector from './AreaSelector';

interface Props {
  onDone: () => void;
}

export default function NeighbourhoodGate({ onDone }: Props) {
  const { suburb, city, loading, confirm, setManualSuburb, refresh } = useLocation();
  const [showSelector, setShowSelector] = useState(false);

  const displayArea = suburb
    ? (city && city !== suburb ? `${suburb}, ${city}` : suburb)
    : city || null;

  function handleConfirm() {
    confirm();
    onDone();
  }

  function handleSelect(s: string, c: string) {
    setManualSuburb(s, c);
    confirm();
    setShowSelector(false);
    onDone();
  }

  const primaryBtn: React.CSSProperties = {
    width: '100%',
    background: '#39D98A',
    color: '#000',
    border: 'none',
    borderRadius: '14px',
    padding: '15px',
    fontFamily: 'Syne, sans-serif',
    fontWeight: 700,
    fontSize: '15px',
    cursor: 'pointer',
    marginBottom: '10px',
  };

  const secondaryBtn: React.CSSProperties = {
    width: '100%',
    background: 'transparent',
    color: 'rgba(255,255,255,0.55)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: '14px',
    padding: '13px',
    fontFamily: 'DM Sans, sans-serif',
    fontWeight: 600,
    fontSize: '14px',
    cursor: 'pointer',
  };

  return (
    <>
      {/* Backdrop */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 49,
        background: 'rgba(0,0,0,0.72)',
        backdropFilter: 'blur(3px)',
        WebkitBackdropFilter: 'blur(3px)',
      } as React.CSSProperties} />

      {/* Sheet */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
        background: '#161B22',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '20px 20px 0 0',
        padding: '12px 24px 44px',
      }}>
        {/* Drag handle */}
        <div style={{
          width: '36px', height: '4px',
          background: 'rgba(255,255,255,0.15)',
          borderRadius: '2px',
          margin: '0 auto 20px',
        }} />

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <div style={{
            width: '38px', height: '38px', borderRadius: '11px',
            background: 'rgba(57,217,138,0.12)',
            border: '1px solid rgba(57,217,138,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <MapPin size={18} color="#39D98A" />
          </div>
          <span style={{
            fontFamily: 'Syne, sans-serif', fontWeight: 700,
            fontSize: '17px', color: '#fff',
          }}>
            Your neighbourhood
          </span>
        </div>

        {loading ? (
          <>
            <p style={{
              fontSize: '14px', color: 'rgba(255,255,255,0.52)',
              lineHeight: 1.6, marginBottom: '24px',
            }}>
              Detecting your location…
            </p>
            <button onClick={refresh} style={secondaryBtn}>
              Retry detection
            </button>
          </>
        ) : (
          <>
            <div style={{ marginBottom: '22px' }}>
              <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.85)', lineHeight: 1.5, marginBottom: '6px' }}>
                {displayArea ? (
                  <>You're near <strong style={{ color: '#fff' }}>{displayArea}</strong>.</>
                ) : (
                  <>We couldn't detect your area automatically.</>
                )}
              </p>
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.45)', lineHeight: 1.5 }}>
                {displayArea
                  ? 'Show places in this neighbourhood and nearby?'
                  : 'Choose your suburb to see local places.'}
              </p>
            </div>

            {displayArea && (
              <button onClick={handleConfirm} style={primaryBtn}>
                Yes, show my area
              </button>
            )}

            <button
              onClick={() => setShowSelector(true)}
              style={secondaryBtn}
            >
              {displayArea ? 'Change area' : 'Choose area'}
            </button>
          </>
        )}
      </div>

      {/* Area selector overlay — rendered on top of the gate */}
      {showSelector && (
        <AreaSelector
          currentSuburb={suburb}
          onSelect={handleSelect}
          onClose={() => setShowSelector(false)}
          onRequestDetect={refresh}
        />
      )}
    </>
  );
}
