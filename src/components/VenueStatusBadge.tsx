import type { VenueOpenStatus } from '../lib/venueUtils';

interface Props {
  status: VenueOpenStatus;
  size?: 'sm' | 'md';
}

export function VenueStatusBadge({ status, size = 'sm' }: Props) {
  if (status.state === 'no_hours' || status.state === 'closed_today') return null;

  const fontSize  = size === 'md' ? '12px' : '11px';
  const dotSize   = size === 'md' ? '7px' : '6px';
  const gap       = size === 'md' ? '5px' : '4px';

  let dotColor  = '#6B7280';
  let label     = '';
  let pulse     = false;

  switch (status.state) {
    case 'open_active':
      dotColor = '#39D98A';
      label    = 'Open · Active';
      pulse    = true;
      break;
    case 'open':
      dotColor = '#39D98A';
      label    = 'Open';
      break;
    case 'closing_soon':
      dotColor = '#F59E0B';
      label    = `Closes at ${status.closesAt}`;
      break;
    case 'before_open':
      dotColor = '#6B7280';
      label    = `Opens at ${status.opensAt}`;
      break;
    case 'closed':
      dotColor = '#6B7280';
      label    = 'Closed';
      break;
  }

  return (
    <>
      {pulse && (
        <style>{`
          @keyframes statusPulse {
            0%, 100% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.6); opacity: 0.4; }
          }
        `}</style>
      )}
      <div style={{ display: 'inline-flex', alignItems: 'center', gap }}>
        <div style={{
          width: dotSize, height: dotSize, borderRadius: '50%',
          background: dotColor, flexShrink: 0,
          animation: pulse ? 'statusPulse 2s ease-in-out infinite' : 'none',
        }} />
        <span style={{
          fontFamily: 'Inter, sans-serif',
          fontSize, color: dotColor, fontWeight: 600,
          whiteSpace: 'nowrap',
        }}>
          {label}
        </span>
      </div>
    </>
  );
}
