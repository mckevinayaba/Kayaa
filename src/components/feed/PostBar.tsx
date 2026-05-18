import { useNavigate } from 'react-router-dom';

interface PostBarProps {
  suburb:     string;
  onPost:     () => void;
  onAddPlace?: () => void;
  onWork?:    () => void;
}

export default function PostBar({ suburb, onPost, onAddPlace, onWork }: PostBarProps) {
  const navigate = useNavigate();

  const buttonBase: React.CSSProperties = {
    flex: 1,
    height: '38px',
    borderRadius: '10px',
    fontFamily: 'Inter, sans-serif',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
    WebkitTapHighlightColor: 'transparent',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  };

  return (
    <div style={{ marginBottom: '28px' }}>
      {/* Text area */}
      <div
        onClick={onPost}
        style={{
          width: '100%',
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '12px',
          padding: '12px 14px',
          marginBottom: '10px',
          cursor: 'pointer',
          fontFamily: 'Inter, sans-serif', fontSize: '13px',
          color: 'rgba(255,255,255,0.45)',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        {suburb ? `What's happening in ${suburb} today?` : "What's happening nearby today?"}
      </div>

      {/* Four action buttons */}
      <div style={{ display: 'flex', gap: '6px' }}>
        <button
          onClick={() => navigate('/checkin')}
          style={{
            ...buttonBase,
            background: 'rgba(57,217,138,0.1)',
            border: '1px solid rgba(57,217,138,0.2)',
            color: '#39D98A',
          }}
        >
          ✓ Check In
        </button>

        <button
          onClick={onWork ? onWork : () => navigate('/jobs')}
          style={{
            ...buttonBase,
            background: 'rgba(167,139,250,0.08)',
            border: '1px solid rgba(167,139,250,0.18)',
            color: '#A78BFA',
          }}
        >
          💼 Work
        </button>

        <button
          onClick={onAddPlace ? onAddPlace : () => navigate('/onboarding')}
          style={{
            ...buttonBase,
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            color: 'rgba(255,255,255,0.6)',
          }}
        >
          + Place
        </button>

        <button
          onClick={onPost}
          style={{
            ...buttonBase,
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            color: 'rgba(255,255,255,0.6)',
          }}
        >
          💬 Post
        </button>
      </div>
    </div>
  );
}
