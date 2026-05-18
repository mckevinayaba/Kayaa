import { useState, useEffect, useRef } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { MapPin, Loader } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import useLocation from '../hooks/useLocation';

// ── Quick areas for manual pick ───────────────────────────────────────────────
// Sorted: suburb first within each city group.
// Residents identify by neighbourhood, not metro — keep that word order in labels.
const QUICK_AREAS = [
  // ── Durban — launch city (Berea first: active launch neighbourhood) ────────
  { suburb: 'Berea',             city: 'Durban'       },
  { suburb: 'Glenwood',          city: 'Durban'       },
  { suburb: 'Overport',          city: 'Durban'       },
  { suburb: 'Durban CBD',        city: 'Durban'       },
  { suburb: 'Umlazi',            city: 'Durban'       },
  { suburb: 'Chatsworth',        city: 'Durban'       },
  { suburb: 'Pinetown',          city: 'Durban'       },
  { suburb: 'Phoenix',           city: 'Durban'       },
  // ── Johannesburg ──────────────────────────────────────────────────────────
  { suburb: 'Soweto',            city: 'Johannesburg' },
  { suburb: 'Alexandra',         city: 'Johannesburg' },
  { suburb: 'Tembisa',           city: 'Ekurhuleni'   },
  { suburb: 'Ivory Park',        city: 'Johannesburg' },
  { suburb: 'Diepsloot',         city: 'Johannesburg' },
  { suburb: 'Cosmo City',        city: 'Johannesburg' },
  // NOTE: there are two South African neighbourhoods named Berea.
  // Berea, Durban is listed first (launch city). This one is Jozi's.
  { suburb: 'Berea',             city: 'Johannesburg' },
  { suburb: 'Maboneng',          city: 'Johannesburg' },
  { suburb: 'Braamfontein',      city: 'Johannesburg' },
  { suburb: 'Hillbrow',          city: 'Johannesburg' },
  { suburb: 'Rosebank',          city: 'Johannesburg' },
  { suburb: 'Sandton',           city: 'Johannesburg' },
  { suburb: 'Midrand',           city: 'Johannesburg' },
  { suburb: 'Randburg',          city: 'Johannesburg' },
  // ── Pretoria / Tshwane ────────────────────────────────────────────────────
  { suburb: 'Sunnyside',         city: 'Pretoria'     },
  { suburb: 'Hatfield',          city: 'Pretoria'     },
  { suburb: 'Mamelodi',          city: 'Pretoria'     },
  { suburb: 'Atteridgeville',    city: 'Pretoria'     },
  { suburb: 'Soshanguve',        city: 'Pretoria'     },
  { suburb: 'Centurion',         city: 'Pretoria'     },
  // ── Cape Town ─────────────────────────────────────────────────────────────
  { suburb: 'Khayelitsha',       city: 'Cape Town'    },
  { suburb: 'Gugulethu',         city: 'Cape Town'    },
  { suburb: 'Langa',             city: 'Cape Town'    },
  { suburb: 'Nyanga',            city: 'Cape Town'    },
  { suburb: "Mitchell's Plain",  city: 'Cape Town'    },
  { suburb: 'Woodstock',         city: 'Cape Town'    },
  { suburb: 'Observatory',       city: 'Cape Town'    },
  { suburb: 'Salt River',        city: 'Cape Town'    },
  { suburb: 'Cape Town CBD',     city: 'Cape Town'    },
  { suburb: 'Bellville',         city: 'Cape Town'    },
  { suburb: 'Parow',             city: 'Cape Town'    },
];

// ── Intent options ────────────────────────────────────────────────────────────
const INTENTS = [
  {
    id:    'find',
    emoji: '🗺️',
    title: 'Find places',
    desc:  'Discover what\'s nearby — the spots your area actually uses.',
    dest:  '/feed',
  },
  {
    id:    'nominate',
    emoji: '➕',
    title: 'Nominate a place',
    desc:  'Add somewhere worth knowing — a spaza, barber, clinic, or church.',
    dest:  '/onboarding',
  },
  {
    id:    'owner',
    emoji: '🏪',
    title: 'I run a place',
    desc:  'Manage your business page, post updates, and grow regulars.',
    dest:  '/onboarding',
  },
] as const;

type Intent = typeof INTENTS[number]['id'];

// ── Step dot indicator ────────────────────────────────────────────────────────
function StepDots({ current, total }: { current: number; total: number }) {
  return (
    <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          style={{
            width: i === current ? '20px' : '6px',
            height: '6px', borderRadius: '3px',
            background: i === current ? '#39D98A' : 'rgba(255,255,255,0.15)',
            transition: 'all 0.25s',
          }}
        />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export default function SetupPage() {
  const navigate  = useNavigate();
  const { user }  = useAuth();
  const { suburb, city, loading: locLoading, setManualSuburb, confirm, refresh } = useLocation();

  const [step,          setStep]          = useState<0 | 1>(0);
  const [query,         setQuery]         = useState('');
  const [confirmedArea, setConfirmedArea] = useState('');
  const [confirmedCity, setConfirmedCity] = useState('');
  const [selectedIntent, setSelectedIntent] = useState<Intent | null>(null);
  const [detecting,     setDetecting]     = useState(false);
  const detectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Returning user (already done setup on this device) → skip straight to feed
  if (user && localStorage.getItem('kayaa_setup_done') === 'true') {
    return <Navigate to="/feed" replace />;
  }

  // Not authenticated → send to welcome
  if (!user) return <Navigate to="/welcome" replace />;

  // If GPS came in while on step 0, capture it
  useEffect(() => {
    if (suburb && !confirmedArea) {
      setConfirmedArea(suburb);
      setConfirmedCity(city);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suburb]);

  const filtered = query.trim()
    ? QUICK_AREAS.filter(a =>
        a.suburb.toLowerCase().includes(query.toLowerCase()) ||
        a.city.toLowerCase().includes(query.toLowerCase())
      )
    : QUICK_AREAS;

  function handleDetect() {
    setDetecting(true);
    refresh();
    // Safety timeout: clear spinner after 10s regardless (handles denied GPS)
    if (detectTimerRef.current) clearTimeout(detectTimerRef.current);
    detectTimerRef.current = setTimeout(() => setDetecting(false), 10000);
  }

  useEffect(() => {
    if (detecting && suburb) {
      setDetecting(false);
      if (detectTimerRef.current) clearTimeout(detectTimerRef.current);
    }
  }, [suburb, detecting]);

  function confirmArea() {
    if (!confirmedArea) return;
    setManualSuburb(confirmedArea, confirmedCity || confirmedArea);
    confirm();
    setStep(1);
  }

  function selectArea(s: string, c: string) {
    setConfirmedArea(s);
    setConfirmedCity(c);
    setQuery('');
  }

  function finish() {
    if (!selectedIntent) return;
    const dest = INTENTS.find(i => i.id === selectedIntent)?.dest ?? '/feed';
    // Mark setup as done so the setup guard doesn't loop
    localStorage.setItem('kayaa_setup_done', 'true');
    localStorage.setItem('kayaa_intent', selectedIntent);
    navigate(dest, { replace: true });
  }

  function skipArea() {
    setStep(1);
  }

  // ── Step 0: Location ────────────────────────────────────────────────────────
  const locationStep = (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, padding: '0 24px' }}>
      {/* Header */}
      <div style={{ paddingTop: '56px', paddingBottom: '32px', textAlign: 'center' }}>
        <div style={{
          width: '56px', height: '56px', borderRadius: '50%',
          background: 'rgba(57,217,138,0.1)',
          border: '1.5px solid rgba(57,217,138,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 20px', fontSize: '24px',
        }}>
          📍
        </div>
        <h1 style={{
          fontFamily: 'Inter, sans-serif', fontWeight: 800,
          fontSize: '24px', color: '#F0F6FC',
          marginBottom: '8px', lineHeight: 1.2,
        }}>
          Where are you?
        </h1>
        <p style={{
          fontSize: '14px', color: 'rgba(255,255,255,0.45)',
          fontFamily: 'Inter, sans-serif', lineHeight: 1.6,
        }}>
          Kayaa shows you what's happening in your neighbourhood.
        </p>
      </div>

      {/* Detected / confirmed area pill */}
      {confirmedArea && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'rgba(57,217,138,0.08)',
          border: '1px solid rgba(57,217,138,0.3)',
          borderRadius: '12px', padding: '12px 16px',
          marginBottom: '16px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MapPin size={15} color="#39D98A" />
            <span style={{
              fontSize: '15px', fontWeight: 600, color: '#F0F6FC',
              fontFamily: 'Inter, sans-serif',
            }}>
              {confirmedArea}{confirmedCity && confirmedCity !== confirmedArea ? `, ${confirmedCity}` : ''}
            </span>
          </div>
          <button
            onClick={() => { setConfirmedArea(''); setConfirmedCity(''); }}
            style={{
              background: 'transparent', border: 'none',
              color: 'rgba(255,255,255,0.35)', fontSize: '12px',
              fontFamily: 'Inter, sans-serif', cursor: 'pointer',
              padding: '2px 6px',
            }}
          >
            change
          </button>
        </div>
      )}

      {/* Detect button (show when nothing confirmed yet) */}
      {!confirmedArea && (
        <button
          onClick={handleDetect}
          disabled={detecting || locLoading}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: '8px', width: '100%', minHeight: '54px',
            background: '#39D98A', color: '#0D1117',
            border: 'none', borderRadius: '14px',
            fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '15px',
            cursor: detecting ? 'default' : 'pointer',
            marginBottom: '16px',
            opacity: detecting ? 0.8 : 1,
          }}
        >
          {detecting || locLoading ? (
            <>
              <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} />
              Detecting…
            </>
          ) : (
            <>
              <MapPin size={16} />
              Use my location
            </>
          )}
        </button>
      )}

      {/* Manual search */}
      {!confirmedArea && (
        <>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            marginBottom: '10px',
          }}>
            <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }} />
            <span style={{
              fontSize: '11px', color: 'rgba(255,255,255,0.25)',
              fontFamily: 'Inter, sans-serif',
            }}>
              or search
            </span>
            <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }} />
          </div>

          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Type your suburb or area…"
            style={{
              width: '100%', minHeight: '50px',
              background: 'var(--color-surface)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '12px', padding: '0 16px',
              color: '#F0F6FC', fontSize: '15px',
              fontFamily: 'Inter, sans-serif',
              outline: 'none', boxSizing: 'border-box',
              marginBottom: '8px',
            }}
          />

          <div style={{
            display: 'flex', flexDirection: 'column', gap: '4px',
            maxHeight: '200px', overflowY: 'auto',
            marginBottom: '8px',
          }}>
            {filtered.map(a => (
              <button
                key={`${a.suburb}-${a.city}`}
                onClick={() => selectArea(a.suburb, a.city)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '11px 14px', borderRadius: '10px',
                  background: 'transparent',
                  border: '1px solid rgba(255,255,255,0.06)',
                  cursor: 'pointer', textAlign: 'left',
                  transition: 'background 0.1s',
                }}
              >
                <span style={{
                  fontSize: '14px', color: '#F0F6FC',
                  fontFamily: 'Inter, sans-serif', fontWeight: 500,
                }}>
                  {a.suburb}
                </span>
                <span style={{
                  fontSize: '12px', color: 'rgba(255,255,255,0.35)',
                  fontFamily: 'Inter, sans-serif',
                }}>
                  {a.city}
                </span>
              </button>
            ))}

            {/* Custom suburb escape hatch — shown when typed text matches nothing */}
            {query.trim().length >= 2 && filtered.length === 0 && (
              <button
                onClick={() => selectArea(query.trim(), query.trim())}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '11px 14px', borderRadius: '10px',
                  background: 'rgba(57,217,138,0.06)',
                  border: '1px solid rgba(57,217,138,0.25)',
                  cursor: 'pointer', textAlign: 'left',
                }}
              >
                <span style={{
                  fontSize: '14px', color: '#F0F6FC',
                  fontFamily: 'Inter, sans-serif', fontWeight: 500,
                }}>
                  Use "{query.trim()}"
                </span>
                <span style={{
                  fontSize: '11px', color: '#39D98A',
                  fontFamily: 'Inter, sans-serif', fontWeight: 600,
                }}>
                  Custom area →
                </span>
              </button>
            )}
          </div>
        </>
      )}

      {/* Actions */}
      <div style={{ marginTop: 'auto', paddingBottom: '40px', paddingTop: '16px' }}>
        <button
          onClick={confirmArea}
          disabled={!confirmedArea}
          style={{
            width: '100%', minHeight: '54px',
            background: confirmedArea ? '#39D98A' : 'rgba(57,217,138,0.2)',
            color: confirmedArea ? '#0D1117' : 'rgba(57,217,138,0.5)',
            border: 'none', borderRadius: '14px',
            fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '16px',
            cursor: confirmedArea ? 'pointer' : 'default',
            marginBottom: '12px',
          }}
        >
          Confirm →
        </button>

        <button
          onClick={skipArea}
          style={{
            width: '100%', background: 'transparent', border: 'none',
            color: 'rgba(255,255,255,0.3)', fontSize: '13px',
            fontFamily: 'Inter, sans-serif', cursor: 'pointer',
            padding: '6px',
          }}
        >
          Skip for now
        </button>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  // ── Step 1: Intent ──────────────────────────────────────────────────────────
  const intentStep = (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, padding: '0 24px' }}>
      {/* Header */}
      <div style={{ paddingTop: '56px', paddingBottom: '32px', textAlign: 'center' }}>
        <h1 style={{
          fontFamily: 'Inter, sans-serif', fontWeight: 800,
          fontSize: '24px', color: '#F0F6FC',
          marginBottom: '8px', lineHeight: 1.2,
        }}>
          What brings you here?
        </h1>
        <p style={{
          fontSize: '14px', color: 'rgba(255,255,255,0.45)',
          fontFamily: 'Inter, sans-serif', lineHeight: 1.6,
        }}>
          We'll tailor your experience from the start.
        </p>
      </div>

      {/* Intent cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
        {INTENTS.map(intent => {
          const active = selectedIntent === intent.id;
          return (
            <button
              key={intent.id}
              onClick={() => setSelectedIntent(intent.id)}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: '14px',
                padding: '16px 18px', borderRadius: '16px', textAlign: 'left',
                background: active ? 'rgba(57,217,138,0.08)' : 'var(--color-surface)',
                border: `1.5px solid ${active ? '#39D98A' : 'rgba(255,255,255,0.08)'}`,
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              <span style={{ fontSize: '28px', lineHeight: 1, flexShrink: 0, paddingTop: '2px' }}>
                {intent.emoji}
              </span>
              <div>
                <div style={{
                  fontSize: '15px', fontWeight: 700, color: '#F0F6FC',
                  fontFamily: 'Inter, sans-serif', marginBottom: '4px',
                }}>
                  {intent.title}
                </div>
                <div style={{
                  fontSize: '13px', color: 'rgba(255,255,255,0.45)',
                  fontFamily: 'Inter, sans-serif', lineHeight: 1.5,
                }}>
                  {intent.desc}
                </div>
              </div>
              {/* Checkmark */}
              {active && (
                <div style={{
                  marginLeft: 'auto', flexShrink: 0,
                  width: '20px', height: '20px', borderRadius: '50%',
                  background: '#39D98A',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#0D1117', fontSize: '11px', fontWeight: 700,
                }}>
                  ✓
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Confirm */}
      <div style={{ paddingTop: '24px', paddingBottom: '40px' }}>
        <button
          onClick={finish}
          disabled={!selectedIntent}
          style={{
            width: '100%', minHeight: '54px',
            background: selectedIntent ? '#39D98A' : 'rgba(57,217,138,0.2)',
            color: selectedIntent ? '#0D1117' : 'rgba(57,217,138,0.5)',
            border: 'none', borderRadius: '14px',
            fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '16px',
            cursor: selectedIntent ? 'pointer' : 'default',
            marginBottom: '12px',
          }}
        >
          Get started →
        </button>
        <button
          onClick={() => setStep(0)}
          style={{
            width: '100%', background: 'transparent', border: 'none',
            color: 'rgba(255,255,255,0.3)', fontSize: '13px',
            fontFamily: 'Inter, sans-serif', cursor: 'pointer',
            padding: '6px',
          }}
        >
          ← Back
        </button>
      </div>
    </div>
  );

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      {/* Kayaa wordmark + step dots */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '20px 24px 0',
      }}>
        <span style={{
          fontFamily: 'Inter, sans-serif', fontWeight: 700,
          fontSize: '18px', color: '#39D98A', letterSpacing: '-0.5px',
        }}>
          kayaa
        </span>
        <StepDots current={step} total={2} />
        <div style={{ width: '44px' }} />{/* spacer to center dots */}
      </div>

      {step === 0 ? locationStep : intentStep}
    </div>
  );
}
