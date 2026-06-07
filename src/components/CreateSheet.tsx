import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface CreateSheetProps {
  suburb?: string;
  onClose: () => void;
}

const GRID_ACTIONS = [
  { emoji: '📌', label: 'Post a local notice', to: '/board/new?cat=announcements' },
  { emoji: '💼', label: 'Post a job or skill',  to: '/board/new?cat=jobs'          },
  { emoji: '🚨', label: 'Report a safety risk', to: '/report/safety'               },
  { emoji: '🏠', label: 'List a room/rental',   to: '/board/new?cat=accommodation' },
];

export default function CreateSheet({ suburb, onClose }: CreateSheetProps) {
  const navigate = useNavigate();

  // Lock body scroll while open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  function go(to: string) {
    onClose();
    navigate(to);
  }

  return (
    <>
      {/* ── Full-screen container — flex column so header + sheet stack ──── */}
      <div
        style={{
          position: 'fixed', inset: 0, zIndex: 200,
          display: 'flex', flexDirection: 'column',
          animation: 'csOverlayIn 0.2s ease both',
        }}
      >
        {/* ── Top area: dark scrim + context header — tap to dismiss ──────── */}
        <div
          onClick={onClose}
          style={{
            flex: 1,
            background: 'rgba(7,10,15,0.88)',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            padding: '0 32px',
            cursor: 'pointer',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              textAlign: 'center',
              animation: 'csHeaderIn 0.22s 0.1s ease both',
              cursor: 'default',
            }}
          >
            <div style={{
              fontFamily: 'Inter, sans-serif', fontWeight: 800, fontSize: '22px',
              color: '#FFFFFF', letterSpacing: '-0.02em', lineHeight: 1.2,
              marginBottom: '8px',
            }}>
              {suburb ? `Create in ${suburb}` : 'Create'}
            </div>
            <div style={{
              fontFamily: 'Inter, sans-serif', fontSize: '14px',
              color: 'rgba(255,255,255,0.45)', lineHeight: 1.55,
            }}>
              Add your business, post a notice, or share something that helps your neighbours.
            </div>
          </div>
        </div>

        {/* ── Bottom sheet ─────────────────────────────────────────────────── */}
        <div
          style={{
            background: '#161B22',
            borderTop: '1px solid rgba(255,255,255,0.07)',
            borderRadius: '20px 20px 0 0',
            padding: `0 16px calc(env(safe-area-inset-bottom, 0px) + 24px)`,
            animation: 'csSlideUp 0.26s 0.04s cubic-bezier(0.32,0.72,0,1) both',
          }}
        >
          {/* Drag handle */}
          <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 20px' }}>
            <div style={{
              width: '36px', height: '4px', borderRadius: '2px',
              background: 'rgba(255,255,255,0.15)',
            }} />
          </div>

          {/* 1. PRIMARY — Add your business */}
          <button
            onClick={() => go('/onboarding')}
            style={{
              width: '100%', padding: '18px 20px',
              background: '#39D98A', border: 'none', borderRadius: '14px',
              cursor: 'pointer', marginBottom: '10px',
              display: 'flex', alignItems: 'center', gap: '14px',
              textAlign: 'left',
            }}
          >
            <span style={{ fontSize: '22px', flexShrink: 0 }}>🏪</span>
            <div>
              <div style={{
                fontFamily: 'Inter, sans-serif', fontWeight: 800, fontSize: '16px',
                color: '#0D1117', lineHeight: 1.2,
              }}>
                Add your business
              </div>
              <div style={{
                fontFamily: 'Inter, sans-serif', fontSize: '12px',
                color: 'rgba(13,17,23,0.55)', marginTop: '3px',
              }}>
                Free. Takes 2 minutes. No email needed.
              </div>
            </div>
          </button>

          {/* 2. SECONDARY STRONG — Claim your business */}
          <button
            onClick={() => go('/claim-business')}
            style={{
              width: '100%', padding: '14px 20px',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '14px', cursor: 'pointer', marginBottom: '8px',
              display: 'flex', alignItems: 'center', gap: '14px',
              textAlign: 'left',
            }}
          >
            <span style={{ fontSize: '20px', flexShrink: 0 }}>✋</span>
            <div>
              <div style={{
                fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '15px',
                color: 'rgba(255,255,255,0.85)', lineHeight: 1.2,
              }}>
                Claim your business
              </div>
              <div style={{
                fontFamily: 'Inter, sans-serif', fontSize: '12px',
                color: 'rgba(255,255,255,0.38)', marginTop: '3px',
              }}>
                Already on Kayaa? Take control of your page.
              </div>
            </div>
          </button>

          {/* 3. NOMINATE — put a place on the map */}
          <button
            onClick={() => go('/nominate')}
            style={{
              width: '100%', padding: '14px 20px',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '14px', cursor: 'pointer', marginBottom: '12px',
              display: 'flex', alignItems: 'center', gap: '14px',
              textAlign: 'left',
            }}
          >
            <span style={{ fontSize: '20px', flexShrink: 0 }}>📍</span>
            <div>
              <div style={{
                fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '15px',
                color: 'rgba(255,255,255,0.85)', lineHeight: 1.2,
              }}>
                Put a place on the map
              </div>
              <div style={{
                fontFamily: 'Inter, sans-serif', fontSize: '12px',
                color: 'rgba(255,255,255,0.38)', marginTop: '3px',
              }}>
                Know a spot that should be here? Tell us — takes 30 seconds.
              </div>
            </div>
          </button>

          {/* 4. GRID — smaller actions */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr',
            gap: '8px', marginBottom: '18px',
          }}>
            {GRID_ACTIONS.map(({ emoji, label, to }) => (
              <button
                key={to}
                onClick={() => go(to)}
                style={{
                  padding: '13px 12px',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  borderRadius: '12px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '9px',
                  textAlign: 'left',
                }}
              >
                <span style={{ fontSize: '16px', flexShrink: 0 }}>{emoji}</span>
                <span style={{
                  fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: '13px',
                  color: 'rgba(255,255,255,0.7)', lineHeight: 1.3,
                }}>
                  {label}
                </span>
              </button>
            ))}
          </div>

          {/* 5. FOOTER — neighbourhood context */}
          <div style={{
            textAlign: 'center',
            fontFamily: 'Inter, sans-serif', fontSize: '12px',
            color: 'rgba(255,255,255,0.28)',
          }}>
            {suburb ? `Posting in ${suburb}` : 'Set your neighbourhood to post locally'}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes csOverlayIn  { from { opacity: 0 } to { opacity: 1 } }
        @keyframes csHeaderIn   { from { opacity: 0; transform: translateY(8px) } to { opacity: 1; transform: translateY(0) } }
        @keyframes csSlideUp    { from { transform: translateY(100%) } to { transform: translateY(0) } }
      `}</style>
    </>
  );
}
