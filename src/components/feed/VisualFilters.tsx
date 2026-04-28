import type { LucideIcon } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FilterPill {
  id: string;
  label: string;
  emoji?: string;
  icon?: LucideIcon;
  count?: number;
}

interface VisualFiltersProps {
  filters: FilterPill[];
  activeFilter: string;
  onSelect: (id: string) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function VisualFilters({ filters, activeFilter, onSelect }: VisualFiltersProps) {
  return (
    <div style={{
      display: 'flex', gap: '8px', overflowX: 'auto', scrollbarWidth: 'none',
      paddingBottom: '2px',
      // negative margin bleed so pills reach screen edges on mobile
      marginLeft: '-16px', paddingLeft: '16px',
      marginRight: '-16px', paddingRight: '16px',
      WebkitOverflowScrolling: 'touch',
    } as React.CSSProperties}>
      {filters.map(filter => {
        const active = activeFilter === filter.id;
        const Icon = filter.icon;
        return (
          <button
            key={filter.id}
            onClick={() => onSelect(filter.id)}
            aria-pressed={active}
            style={{
              flexShrink: 0,
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              padding: '7px 14px',
              borderRadius: '20px',
              border: active ? 'none' : '1px solid var(--color-border)',
              background: active
                ? '#39D98A'
                : 'var(--color-surface)',
              color: active ? '#000' : 'var(--color-muted)',
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '13px', fontWeight: 600,
              cursor: 'pointer', whiteSpace: 'nowrap',
              transition: 'all 0.15s',
              boxShadow: active ? '0 4px 12px rgba(57,217,138,0.25)' : 'none',
            }}
          >
            {filter.emoji && <span style={{ fontSize: '14px', lineHeight: 1 }}>{filter.emoji}</span>}
            {Icon && <Icon size={14} color={active ? '#000' : 'currentColor'} />}
            <span>{filter.label}</span>
            {filter.count !== undefined && (
              <span style={{
                fontSize: '10px', fontWeight: 700,
                padding: '1px 6px', borderRadius: '20px',
                background: active ? 'rgba(0,0,0,0.15)' : 'var(--color-surface2)',
                color: active ? '#000' : 'var(--color-muted)',
              }}>
                {filter.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
