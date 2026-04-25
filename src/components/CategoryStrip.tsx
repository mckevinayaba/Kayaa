export const DEFAULT_CHIPS = [
  { key: 'All',        label: 'All'          },
  { key: 'barbershop', label: '💈 Barbershop' },
  { key: 'food',       label: '🍖 Food'       },
  { key: 'salon',      label: '💅 Salon'      },
  { key: 'tavern',     label: '🍺 Tavern'     },
  { key: 'church',     label: '⛪ Church'     },
  { key: 'carwash',    label: '🚗 Carwash'    },
  { key: 'spaza',      label: '🛒 Spaza'      },
  { key: 'Events',     label: '📅 Events'     },
];

interface Props {
  value: string;
  onChange: (key: string) => void;
  chips?: { key: string; label: string }[];
}

export default function CategoryStrip({ value, onChange, chips }: Props) {
  const items = chips ?? DEFAULT_CHIPS;
  return (
    <div style={{
      display: 'flex', gap: '7px',
      overflowX: 'auto', scrollbarWidth: 'none',
      marginLeft: '-16px', paddingLeft: '16px',
      marginRight: '-16px', paddingRight: '16px',
      paddingBottom: '4px', marginBottom: '12px',
      WebkitOverflowScrolling: 'touch',
    } as React.CSSProperties}>
      {items.map(chip => {
        const active = value === chip.key;
        return (
          <button
            key={chip.key}
            onClick={() => onChange(chip.key)}
            style={{
              flexShrink: 0,
              padding: '6px 13px',
              borderRadius: '20px',
              border: active ? 'none' : '1px solid var(--color-border)',
              background: active ? '#39D98A' : 'var(--color-surface)',
              color: active ? '#000' : 'var(--color-muted)',
              fontSize: '12px', fontWeight: 600,
              fontFamily: 'DM Sans, sans-serif',
              cursor: 'pointer', whiteSpace: 'nowrap',
              transition: 'all 0.15s',
            }}
          >
            {chip.label}
          </button>
        );
      })}
    </div>
  );
}
