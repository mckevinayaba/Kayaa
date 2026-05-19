import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface CreateSheetProps {
  suburb?: string;
  onClose: () => void;
}

const SECONDARY_ACTIONS = [
  { emoji: '📋', label: 'Post to Board',   to: '/board/new'         },
  { emoji: '💼', label: 'Post a Job',       to: '/board/new?type=job' },
  { emoji: '🚨', label: 'Safety Alert',    to: '/report/safety'     },
  { emoji: '📸', label: 'Share a Moment',  to: '/moments/new'       },
];

export default function CreateSheet({ suburb, onClose }: CreateSheetProps) {
  const navigate = useNavigate();

  // Lock scroll while sheet is open
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
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 200,
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(3px)',
          animation: 'csBackdropIn 0.2s ease both',
        }}
      />

      {/* Sheet */}
      <div
        style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 201,
          background: '#161B22',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '20px 20px 0 0',
          padding: '0 16px calc(env(safe-area-inset-bottom, 0px) + 24px)',
          animation: 'csSlideUp 0.25s cubic-bezier(0.32,0.72,0,1) both',
          maxWidth: '640px',
          margin: '0 auto',
        }}
      >
        {/* Drag handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 16px' }}>
          <div style={{
            width: '40px', height: '4px', borderRadius: '2px',
            background: 'rgba(255,255,255,0.18)',
          }} />
        </div>

        {/* PRIMARY: Add your business */}
        <button
          onClick={() => go('/onboarding')}
          style={{
            width: '100%', padding: '20px 20px',
            background: '#39D98A', border: 'none', borderRadius: '16px',
            cursor: 'pointer', marginBottom: '12px',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px',
          }}
        >
          <span style={{ fontSize: '22px' }}>🏪</span>
          <div style={{ textAlign: 'left' }}>
            <div style={{
              fontFamily: 'Inter, sans-serif', fontWeight: 800, fontSize: '17px',
              color: '#0D1117', lineHeight: 1.2,
            }}>
              Add your business
            </div>
            <div style={{
              fontFamily: 'Inter, sans-serif', fontSize: '12px',
              color: 'rgba(13,17,23,0.6)', marginTop: '2px',
            }}>
              List your place on Kayaa for free
            </div>
          </div>
        </button>

        {/* SECONDARY: 2×2 grid */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr',
          gap: '8px', marginBottom: '16px',
        }}>
          {SECONDARY_ACTIONS.map(({ emoji, label, to }) => (
            <button
              key={to}
              onClick={() => go(to)}
              style={{
                padding: '14px 12px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '14px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '10px',
              }}
            >
              <span style={{ fontSize: '18px', flexShrink: 0 }}>{emoji}</span>
              <span style={{
                fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: '13px',
                color: 'rgba(255,255,255,0.8)', textAlign: 'left', lineHeight: 1.3,
              }}>
                {label}
              </span>
            </button>
          ))}
        </div>

        {/* Footer: neighbourhood context */}
        <div style={{
          textAlign: 'center',
          fontFamily: 'Inter, sans-serif', fontSize: '12px',
          color: 'rgba(255,255,255,0.3)',
        }}>
          {suburb ? `Posting to ${suburb}` : 'Set your neighbourhood to post'}
        </div>
      </div>

      <style>{`
        @keyframes csBackdropIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes csSlideUp { from { transform: translateY(100%) } to { transform: translateY(0) } }
      `}</style>
    </>
  );
}
