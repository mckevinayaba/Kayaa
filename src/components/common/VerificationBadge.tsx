import { CheckCircle, Award, Shield } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

export type VerificationType = 'verified' | 'recommended' | 'trusted';

interface VerificationBadgeProps {
  type: VerificationType;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

// ─── Config ───────────────────────────────────────────────────────────────────

const CONFIG: Record<VerificationType, {
  Icon: React.ElementType;
  color: string;
  bg: string;
  border: string;
  label: string;
}> = {
  verified: {
    Icon: CheckCircle,
    color: '#60A5FA',
    bg:   'rgba(96,165,250,0.15)',
    border: 'rgba(96,165,250,0.3)',
    label: 'Verified',
  },
  recommended: {
    Icon: Award,
    color: '#FBBF24',
    bg:   'rgba(251,191,36,0.15)',
    border: 'rgba(251,191,36,0.3)',
    label: 'Recommended',
  },
  trusted: {
    Icon: Shield,
    color: '#39D98A',
    bg:   'rgba(57,217,138,0.15)',
    border: 'rgba(57,217,138,0.3)',
    label: 'Trusted',
  },
};

const ICON_SIZE: Record<'sm' | 'md' | 'lg', number> = {
  sm: 13,
  md: 15,
  lg: 18,
};

// ─── Component ────────────────────────────────────────────────────────────────

export function VerificationBadge({
  type,
  size = 'md',
  showLabel = false,
}: VerificationBadgeProps) {
  const { Icon, color, bg, border, label } = CONFIG[type];
  const iconSize = ICON_SIZE[size];

  if (showLabel) {
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: '4px',
        padding: size === 'sm' ? '2px 7px' : '3px 9px',
        background: bg,
        border: `1px solid ${border}`,
        borderRadius: '20px',
      }}>
        <Icon size={iconSize} color={color} strokeWidth={2.5} />
        <span style={{
          fontFamily: 'DM Sans, sans-serif',
          fontSize: size === 'lg' ? '12px' : '11px',
          fontWeight: 700,
          color,
        }}>
          {label}
        </span>
      </span>
    );
  }

  return <Icon size={iconSize} color={color} strokeWidth={2.5} />;
}
