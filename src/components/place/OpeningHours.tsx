import { useState } from 'react';
import { Clock, ChevronDown, ChevronUp } from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface DayHours {
  open: string;   // "08:00"
  close: string;  // "17:00"
}

interface HoursMap {
  monday?:    DayHours;
  tuesday?:   DayHours;
  wednesday?: DayHours;
  thursday?:  DayHours;
  friday?:    DayHours;
  saturday?:  DayHours;
  sunday?:    DayHours;
}

interface OpeningHoursProps {
  /** Structured hours map — when available from DB */
  hours?: HoursMap;
  /** Fallback free-text string (e.g. "Mon–Fri 8am–5pm") */
  hoursText?: string;
  currentStatus?: 'open' | 'busy' | 'closed';
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const DAYS    = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;
const LABELS  = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** Returns index 0–6 (Mon–Sun) for today */
function todayIndex(): number {
  const d = new Date().getDay(); // 0 = Sunday
  return d === 0 ? 6 : d - 1;
}

function fmt12(time24: string): string {
  const [h, m] = time24.split(':').map(Number);
  const suffix = h >= 12 ? 'pm' : 'am';
  const h12 = h % 12 || 12;
  return m === 0 ? `${h12}${suffix}` : `${h12}:${String(m).padStart(2, '0')}${suffix}`;
}

function todaySummary(hours: HoursMap): string {
  const day  = DAYS[todayIndex()];
  const slot = hours[day];
  if (!slot) return 'Closed today';

  const now   = new Date();
  const cur   = now.getHours() * 60 + now.getMinutes();
  const [oh, om] = slot.open.split(':').map(Number);
  const [ch, cm] = slot.close.split(':').map(Number);
  const open  = oh * 60 + om;
  const close = ch * 60 + cm;

  if (cur < open)  return `Opens at ${fmt12(slot.open)}`;
  if (cur > close) return 'Closed now';
  return `Open until ${fmt12(slot.close)}`;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function OpeningHours({ hours, hoursText, currentStatus }: OpeningHoursProps) {
  const [expanded, setExpanded] = useState(false);

  // ── Plain-text fallback (when structured data isn't available yet) ──────────
  if (!hours) {
    if (!hoursText) return null;
    return (
      <div>
        <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '18px', color: '#fff', marginBottom: '12px' }}>
          Hours
        </h2>
        <div style={{
          background: '#161B22', border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '12px', padding: '16px',
          display: 'flex', alignItems: 'flex-start', gap: '12px',
        }}>
          <Clock size={18} color="rgba(255,255,255,0.4)" style={{ flexShrink: 0, marginTop: '1px' } as React.CSSProperties} />
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: 'rgba(255,255,255,0.7)', margin: 0, lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>
            {hoursText}
          </p>
        </div>
      </div>
    );
  }

  // ── Structured view ────────────────────────────────────────────────────────
  const dayIdx    = todayIndex();
  const todayKey  = DAYS[dayIdx];
  const todaySlot = hours[todayKey];
  const summary   = todaySummary(hours);

  const statusColor =
    currentStatus === 'closed' ? '#6B7280' :
    currentStatus === 'busy'   ? '#F5A623' : '#39D98A';

  return (
    <div>
      <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '18px', color: '#fff', marginBottom: '12px' }}>
        Hours
      </h2>

      <div style={{ background: '#161B22', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', overflow: 'hidden' }}>

        {/* Summary row — tap to expand */}
        <button
          onClick={() => setExpanded(e => !e)}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '16px', background: 'none', border: 'none', cursor: 'pointer',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Clock size={18} color="rgba(255,255,255,0.4)" />
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: '14px', color: statusColor }}>
                {summary}
              </div>
              <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>
                {todaySlot ? `${fmt12(todaySlot.open)} – ${fmt12(todaySlot.close)}` : 'Closed today'}
              </div>
            </div>
          </div>
          {expanded
            ? <ChevronUp  size={18} color="rgba(255,255,255,0.4)" />
            : <ChevronDown size={18} color="rgba(255,255,255,0.4)" />}
        </button>

        {/* Full schedule */}
        {expanded && (
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            {DAYS.map((day, i) => {
              const slot    = hours[day];
              const isToday = i === dayIdx;
              return (
                <div
                  key={day}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '12px 16px',
                    borderBottom: i < DAYS.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                    background: isToday ? 'rgba(57,217,138,0.05)' : 'transparent',
                  }}
                >
                  <span style={{
                    fontFamily: 'DM Sans, sans-serif', fontWeight: isToday ? 700 : 500,
                    fontSize: '13px',
                    color: isToday ? '#39D98A' : 'rgba(255,255,255,0.75)',
                  }}>
                    {LABELS[i]}{isToday ? ' (today)' : ''}
                  </span>
                  <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: slot ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.25)' }}>
                    {slot ? `${fmt12(slot.open)} – ${fmt12(slot.close)}` : 'Closed'}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
