interface ActivityMomentProps {
  text: string;
  time: string;
  initial: string;
}

export default function ActivityMoment({ text, time, initial }: ActivityMomentProps) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      padding: '10px 4px',
      marginBottom: '4px',
    }}>
      {/* Avatar */}
      <div style={{
        width: '28px',
        height: '28px',
        borderRadius: '50%',
        background: 'var(--color-surface2)',
        border: '1px solid var(--color-border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '11px',
        fontWeight: 700,
        color: 'var(--color-accent)',
        fontFamily: 'Syne, sans-serif',
        flexShrink: 0,
      }}>
        {initial}
      </div>

      {/* Text */}
      <p style={{
        flex: 1,
        fontSize: '13px',
        color: 'var(--color-muted)',
        lineHeight: 1.4,
        margin: 0,
      }}>
        {text}
      </p>

      {/* Time */}
      <span style={{
        fontSize: '11px',
        color: 'var(--color-muted)',
        opacity: 0.6,
        flexShrink: 0,
        whiteSpace: 'nowrap',
      }}>
        {time}
      </span>
    </div>
  );
}
