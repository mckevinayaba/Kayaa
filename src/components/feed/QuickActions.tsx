import { useNavigate } from 'react-router-dom';
import { HelpCircle, MapPin, Package, Users, Zap, PlusCircle } from 'lucide-react';

// ─── Config ───────────────────────────────────────────────────────────────────
// Each shortcut navigates to a specific destination — no duplicate compose entry.
// The green FAB in Home is the ONE main "Post" action.

interface Action {
  icon: React.ElementType;
  label: string;
  color: string;
  bg: string;
  key: string;
}

const ACTIONS: Action[] = [
  { icon: MapPin,      label: 'Check In', color: '#39D98A', bg: 'rgba(57,217,138,0.12)',   key: 'checkin'  },
  { icon: Package,     label: 'Sell',     color: '#F97316', bg: 'rgba(249,115,22,0.12)',   key: 'sell'     },
  { icon: HelpCircle,  label: 'Ask',      color: '#60A5FA', bg: 'rgba(96,165,250,0.12)',   key: 'ask'      },
  { icon: Zap,         label: 'Skill',    color: '#F59E0B', bg: 'rgba(245,158,11,0.12)',   key: 'skill'    },
  { icon: Users,       label: 'Safety',   color: '#EF4444', bg: 'rgba(239,68,68,0.10)',    key: 'safety'   },
  { icon: PlusCircle,  label: 'Add Place',color: '#A78BFA', bg: 'rgba(167,139,250,0.12)',  key: 'addplace' },
];

// ─── Props ────────────────────────────────────────────────────────────────────

interface QuickActionsProps {
  onCompose?:  () => void; // kept for backward compat
  onAddPlace?: () => void; // opens QuickAddPlace sheet (30-second form)
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function QuickActions({ onCompose: _onCompose, onAddPlace }: QuickActionsProps) {
  const navigate = useNavigate();

  function handleAction(key: string) {
    switch (key) {
      case 'checkin':  navigate('/checkin');                      break;
      case 'sell':     navigate('/board/new?cat=for_sale');       break;
      case 'ask':      navigate('/board/new?cat=ask');            break;
      case 'skill':    navigate('/skills/new');                   break;
      case 'safety':   navigate('/board/new?cat=safety');         break;
      case 'addplace':
        // Use QuickAddPlace sheet if provided, otherwise fall back to full onboarding
        if (onAddPlace) { onAddPlace(); } else { navigate('/onboarding'); }
        break;
    }
  }

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(6, 1fr)',
      gap: '4px',
      background: 'var(--color-surface)',
      border: '1px solid var(--color-border)',
      borderRadius: '16px',
      padding: '14px 8px 10px',
      marginBottom: '16px',
    }}>
      {ACTIONS.map(({ icon: Icon, label, color, bg, key }) => (
        <button
          key={key}
          onClick={() => handleAction(key)}
          aria-label={label}
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
            background: 'none', border: 'none', cursor: 'pointer',
            padding: '4px 2px',
            borderRadius: '12px',
            WebkitTapHighlightColor: 'transparent',
            transition: 'opacity 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '0.75')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
        >
          {/* Icon bubble */}
          <div style={{
            width: '44px', height: '44px',
            borderRadius: '14px',
            background: bg,
            border: `1px solid ${color}30`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <Icon size={20} color={color} strokeWidth={2} />
          </div>

          {/* Label */}
          <span style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '10px', fontWeight: 600,
            color: 'var(--color-muted)',
            textAlign: 'center',
            lineHeight: 1.2,
            letterSpacing: '0.01em',
          }}>
            {label}
          </span>
        </button>
      ))}
    </div>
  );
}
