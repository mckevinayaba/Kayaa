import { useState } from 'react';
import { getPrimaryCategory } from '../config/categoryLabels';

// ─── Filter chips ──────────────────────────────────────────────────────────────
// High-utility categories first; "More" expands the full set.
// Keys map to PrimaryKey values from PRIMARY_CATEGORIES, plus special keys.

export const PINNED_CHIPS = [
  { key: 'All',          label: 'All'          },
  { key: 'food',         label: '🍖 Food'       },
  { key: 'beauty',       label: '💈 Barber & Salon' },
  { key: 'retail',       label: '🛒 Spaza & Shops'  },
  { key: 'services',     label: '🏠 Services'   },
  { key: 'health',       label: '💊 Health'     },
];

export const EXTRA_CHIPS = [
  { key: 'auto',         label: '🔧 Auto'        },
  { key: 'community',    label: '⛪ Community'   },
  { key: 'professional', label: '💼 Business'    },
  { key: 'stay',         label: '🏨 Stay'        },
  { key: 'Events',       label: '📅 Events'      },
];

/** All chips combined (used by callers that don't want the More toggle) */
export const DEFAULT_CHIPS = [...PINNED_CHIPS, ...EXTRA_CHIPS];

/**
 * Maps any stored venue `category` string to one of the filter chip keys.
 * Returns the PrimaryKey so chips can match both old and new venues.
 */
export function venueMatchesChip(venueCategory: string, chipKey: string): boolean {
  if (chipKey === 'All') return true;
  const primary = getPrimaryCategory(venueCategory);
  return primary === chipKey;
}

interface Props {
  value: string;
  onChange: (key: string) => void;
  /** Override the chip list (uses PINNED_CHIPS + EXTRA_CHIPS with More toggle by default) */
  chips?: { key: string; label: string }[];
  /** Disable the More toggle and show all chips flat */
  showAll?: boolean;
}

export default function CategoryStrip({ value, onChange, chips, showAll = false }: Props) {
  const [expanded, setExpanded] = useState(false);

  // If custom chips provided, render them flat (no More toggle)
  if (chips) {
    return (
      <div style={{
        display: 'flex', gap: '7px',
        overflowX: 'auto', scrollbarWidth: 'none',
        marginLeft: '-16px', paddingLeft: '16px',
        marginRight: '-16px', paddingRight: '16px',
        paddingBottom: '4px', marginBottom: '12px',
        WebkitOverflowScrolling: 'touch',
      } as React.CSSProperties}>
        {chips.map(chip => (
          <ChipButton key={chip.key} chip={chip} active={value === chip.key} onClick={onChange} />
        ))}
      </div>
    );
  }

  const visible = showAll || expanded ? DEFAULT_CHIPS : PINNED_CHIPS;

  const isWrap = showAll || expanded;
  return (
    <div style={{
      display: 'flex', gap: '7px',
      flexWrap: isWrap ? 'wrap' : 'nowrap',
      overflowX: isWrap ? 'visible' : 'auto',
      scrollbarWidth: 'none',
      marginLeft: '-16px', paddingLeft: '16px',
      marginRight: '-16px', paddingRight: '16px',
      paddingBottom: '4px', marginBottom: '12px',
      WebkitOverflowScrolling: 'touch',
    } as React.CSSProperties}>
      {visible.map(chip => (
        <ChipButton key={chip.key} chip={chip} active={value === chip.key} onClick={onChange} />
      ))}

      {!showAll && (
        <button
          onClick={() => setExpanded(e => !e)}
          style={{
            flexShrink: 0,
            padding: '6px 13px',
            borderRadius: '20px',
            border: '1px solid var(--color-border)',
            background: 'var(--color-surface)',
            color: 'var(--color-muted)',
            fontSize: '12px', fontWeight: 600,
            fontFamily: 'Inter, sans-serif',
            cursor: 'pointer', whiteSpace: 'nowrap',
            transition: 'all 0.15s',
          }}
        >
          {expanded ? '✕ Less' : 'More ›'}
        </button>
      )}
    </div>
  );
}

function ChipButton({
  chip, active, onClick,
}: { chip: { key: string; label: string }; active: boolean; onClick: (key: string) => void }) {
  return (
    <button
      onClick={() => onClick(chip.key)}
      style={{
        flexShrink: 0,
        padding: '6px 13px',
        borderRadius: '20px',
        border: active ? 'none' : '1px solid var(--color-border)',
        background: active ? '#39D98A' : 'var(--color-surface)',
        color: active ? '#000' : 'var(--color-muted)',
        fontSize: '12px', fontWeight: 600,
        fontFamily: 'Inter, sans-serif',
        cursor: 'pointer', whiteSpace: 'nowrap',
        transition: 'all 0.15s',
      }}
    >
      {chip.label}
    </button>
  );
}
