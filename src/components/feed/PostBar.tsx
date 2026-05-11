import { MapPin, MessageSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface PostBarProps {
  suburb:    string;
  onPost:    () => void;
  onAddPlace?: () => void;
}

export default function PostBar({ suburb, onPost, onAddPlace }: PostBarProps) {
  const navigate = useNavigate();

  return (
    <div style={{ marginBottom: '28px' }}>

      {/* Primary: compose prompt */}
      <button
        onClick={onPost}
        style={{
          width: '100%',
          display: 'flex', alignItems: 'center', gap: '12px',
          padding: '16px 16px',
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.09)',
          borderRadius: '16px',
          cursor: 'pointer',
          textAlign: 'left',
          marginBottom: '10px',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        <div style={{
          width: '34px', height: '34px', borderRadius: '50%',
          background: 'rgba(57,217,138,0.12)',
          border: '1.5px solid rgba(57,217,138,0.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <MessageSquare size={16} color="#39D98A" />
        </div>
        <span style={{
          fontFamily: 'DM Sans, sans-serif',
          fontSize: '14px',
          color: 'rgba(255,255,255,0.3)',
          flex: 1,
        }}>
          {suburb ? `What's happening in ${suburb} today?` : "What's happening nearby today?"}
        </span>
        <span style={{
          fontFamily: 'Syne, sans-serif', fontWeight: 700,
          fontSize: '12px', color: '#39D98A',
          background: 'rgba(57,217,138,0.1)',
          border: '1px solid rgba(57,217,138,0.2)',
          borderRadius: '20px',
          padding: '4px 10px',
          flexShrink: 0,
        }}>
          Post
        </span>
      </button>

      {/* Secondary: compact action pills */}
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          onClick={() => navigate('/checkin')}
          style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
            padding: '9px 12px',
            background: 'rgba(57,217,138,0.07)',
            border: '1px solid rgba(57,217,138,0.15)',
            borderRadius: '12px', cursor: 'pointer',
            fontFamily: 'DM Sans, sans-serif', fontWeight: 600,
            fontSize: '12px', color: 'rgba(57,217,138,0.8)',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          <MapPin size={13} color="#39D98A" />
          Check In
        </button>

        <button
          onClick={() => navigate('/board/new?cat=ask')}
          style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
            padding: '9px 12px',
            background: 'rgba(96,165,250,0.07)',
            border: '1px solid rgba(96,165,250,0.15)',
            borderRadius: '12px', cursor: 'pointer',
            fontFamily: 'DM Sans, sans-serif', fontWeight: 600,
            fontSize: '12px', color: 'rgba(96,165,250,0.8)',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          <MessageSquare size={13} color="#60A5FA" />
          Ask
        </button>

        <button
          onClick={onAddPlace ? onAddPlace : () => navigate('/onboarding')}
          style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
            padding: '9px 12px',
            background: 'rgba(167,139,250,0.07)',
            border: '1px solid rgba(167,139,250,0.15)',
            borderRadius: '12px', cursor: 'pointer',
            fontFamily: 'DM Sans, sans-serif', fontWeight: 600,
            fontSize: '12px', color: 'rgba(167,139,250,0.8)',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          + Place
        </button>
      </div>

    </div>
  );
}
