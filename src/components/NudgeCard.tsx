/**
 * NudgeCard — a dismissible in-feed contextual prompt.
 *
 * Design philosophy: nudges should feel like helpful local guidance,
 * not dark patterns. They're subtle, honest, and always dismissible.
 */

export interface NudgeCardProps {
  emoji: string;
  title: string;
  body: string;
  ctaLabel: string;
  onCta: () => void;
  /** Omit to render without a dismiss button (good for factual / transient states) */
  onDismiss?: () => void;
  /** Optional accent colour — defaults to Kayaa green */
  accent?: string;
}

export default function NudgeCard({
  emoji,
  title,
  body,
  ctaLabel,
  onCta,
  onDismiss,
  accent = '#39D98A',
}: NudgeCardProps) {
  return (
    <div
      style={{
        position: 'relative',
        background: `${accent}07`,
        border: `1px solid ${accent}20`,
        borderLeft: `3px solid ${accent}55`,
        borderRadius: '14px',
        padding: onDismiss ? '14px 40px 14px 14px' : '14px',
        marginBottom: '12px',
      }}
    >
      {/* Dismiss button — only rendered when handler is provided */}
      {onDismiss && (
        <button
          onClick={onDismiss}
          aria-label="Dismiss"
          style={{
            position: 'absolute', top: '10px', right: '10px',
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'rgba(255,255,255,0.22)', fontSize: '17px',
            lineHeight: 1, padding: '3px 5px',
            fontFamily: 'monospace',
          }}
        >
          ×
        </button>
      )}

      <div style={{ display: 'flex', gap: '11px', alignItems: 'flex-start' }}>
        <span style={{ fontSize: '20px', lineHeight: 1, marginTop: '1px', flexShrink: 0 }}>
          {emoji}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: 'Syne, sans-serif', fontWeight: 700,
            fontSize: '13px', color: '#F0F6FC',
            marginBottom: '3px', lineHeight: 1.3,
          }}>
            {title}
          </div>
          <div style={{
            fontFamily: 'DM Sans, sans-serif', fontSize: '12px',
            color: 'rgba(255,255,255,0.45)', lineHeight: 1.5,
            marginBottom: '10px',
          }}>
            {body}
          </div>
          <button
            onClick={onCta}
            style={{
              background: accent, color: '#000',
              border: 'none', borderRadius: '8px',
              padding: '6px 14px',
              fontFamily: 'Syne, sans-serif', fontWeight: 700,
              fontSize: '12px', cursor: 'pointer',
              WebkitTapHighlightColor: 'transparent',
            } as React.CSSProperties}
          >
            {ctaLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
