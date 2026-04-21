const CHIPS = [
  { key: 'All',       label: 'All'       },
  { key: 'Barbershop', label: '✂️ Barbershop' },
  { key: 'Food',      label: '🔥 Food'   },
  { key: 'Salon',     label: '💅 Salon'  },
  { key: 'Tavern',    label: '🍺 Tavern' },
  { key: 'Church',    label: '⛪ Church' },
  { key: 'Carwash',   label: '🚗 Carwash'},
  { key: 'Spaza',     label: '🏪 Spaza'  },
  { key: 'Events',    label: '📅 Events' },
  { key: 'More',      label: '···  More' },
];

interface Props {
  value: string;
  onChange: (key: string) => void;
}

export default function CategoryStrip({ value, onChange }: Props) {
  return (
    <div style={{
      display: 'flex', gap: '7px',
      overflowX: 'auto', scrollbarWidth: 'none',
      marginLeft: '-16px', paddingLeft: '16px',
      marginRight: '-16px', paddingRight: '16px',
      paddingBottom: '4px', marginBottom: '12px',
      WebkitOverflowScrolling: 'touch',
    } as React.CSSProperties}>
      {CHIPS.map(chip => {
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
