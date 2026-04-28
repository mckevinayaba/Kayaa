import { useState, useEffect } from 'react';
import { Zap, ZapOff, ChevronDown, ChevronUp, Bell, BellOff } from 'lucide-react';
import {
  getLoadSheddingStatus,
  getAreaSchedule,
  getLoadSheddingPrefs,
  saveLoadSheddingPrefs,
  timeUntil,
  slotLabel,
  type LoadSheddingStatus,
  type AreaSchedule,
} from '../../services/loadShedding';

// ─── Stage config ─────────────────────────────────────────────────────────────

const STAGE_CONFIG: Record<number, { label: string; color: string; bg: string; border: string }> = {
  0: { label: 'No Load Shedding',  color: '#39D98A', bg: 'rgba(57,217,138,0.1)',  border: 'rgba(57,217,138,0.25)' },
  1: { label: 'Stage 1',           color: '#FBBF24', bg: 'rgba(251,191,36,0.1)',  border: 'rgba(251,191,36,0.25)' },
  2: { label: 'Stage 2',           color: '#FBBF24', bg: 'rgba(251,191,36,0.12)', border: 'rgba(251,191,36,0.3)'  },
  3: { label: 'Stage 3',           color: '#F97316', bg: 'rgba(249,115,22,0.12)', border: 'rgba(249,115,22,0.3)'  },
  4: { label: 'Stage 4',           color: '#F97316', bg: 'rgba(249,115,22,0.15)', border: 'rgba(249,115,22,0.35)' },
  5: { label: 'Stage 5',           color: '#EF4444', bg: 'rgba(239,68,68,0.12)',  border: 'rgba(239,68,68,0.3)'   },
  6: { label: 'Stage 6',           color: '#EF4444', bg: 'rgba(239,68,68,0.15)',  border: 'rgba(239,68,68,0.35)'  },
  7: { label: 'Stage 7',           color: '#EF4444', bg: 'rgba(239,68,68,0.18)',  border: 'rgba(239,68,68,0.4)'   },
  8: { label: 'Stage 8',           color: '#EF4444', bg: 'rgba(239,68,68,0.2)',   border: 'rgba(239,68,68,0.45)'  },
};

function stageConf(stage: number) {
  return STAGE_CONFIG[Math.min(stage, 8)] ?? STAGE_CONFIG[8];
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface LoadSheddingWidgetProps {
  /** Compact single-line chip for embedding in feeds / venue pages */
  compact?: boolean;
  /** EskomSePush area ID — leave blank to show status only */
  areaId?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function LoadSheddingWidget({ compact = false, areaId }: LoadSheddingWidgetProps) {
  const [status,   setStatus]   = useState<LoadSheddingStatus | null>(null);
  const [schedule, setSchedule] = useState<AreaSchedule | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [alerts,   setAlerts]   = useState(false);

  useEffect(() => {
    getLoadSheddingStatus().then(setStatus);
    if (areaId) {
      getAreaSchedule(areaId).then(setSchedule);
    }
    // Load saved alert prefs
    const prefs = getLoadSheddingPrefs();
    if (prefs && prefs.areaId === areaId) setAlerts(prefs.alert30min);
  }, [areaId]);

  if (!status) {
    // Skeleton
    return (
      <div style={{ height: '40px', background: 'rgba(255,255,255,0.04)', borderRadius: '10px' }} />
    );
  }

  const conf = stageConf(status.stage);
  const isOff = status.stage === 0;
  const next  = schedule?.nextOutage;

  // ── Compact chip ────────────────────────────────────────────────────────────
  if (compact) {
    return (
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: '5px',
        padding: '4px 10px',
        background: conf.bg, border: `1px solid ${conf.border}`,
        borderRadius: '20px',
      }}>
        {isOff
          ? <Zap    size={12} color={conf.color} />
          : <ZapOff size={12} color={conf.color} />
        }
        <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', fontWeight: 700, color: conf.color }}>
          {isOff ? 'No load shedding' : conf.label}
        </span>
        {next && !isOff && (
          <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.45)' }}>
            · {timeUntil(next.start)}
          </span>
        )}
      </div>
    );
  }

  // ── Full widget ─────────────────────────────────────────────────────────────
  return (
    <div style={{
      background: conf.bg,
      border: `1px solid ${conf.border}`,
      borderRadius: '14px',
      overflow: 'hidden',
    }}>

      {/* Main row */}
      <button
        onClick={() => setExpanded(e => !e)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: '12px',
          padding: '14px 16px', background: 'none', border: 'none', cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        {/* Icon */}
        <div style={{
          width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0,
          background: `${conf.color}20`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {isOff
            ? <Zap    size={18} color={conf.color} />
            : <ZapOff size={18} color={conf.color} />
          }
        </div>

        {/* Text */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '14px', color: conf.color, marginBottom: '1px' }}>
            {conf.label}
          </div>
          <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>
            {next
              ? `Next outage ${timeUntil(next.start)} · ${slotLabel(next)}`
              : isOff
                ? 'Enjoy the power 🔌'
                : 'No upcoming outages found'
            }
          </div>
        </div>

        {/* Chevron */}
        {expanded
          ? <ChevronUp   size={16} color="rgba(255,255,255,0.4)" />
          : <ChevronDown size={16} color="rgba(255,255,255,0.4)" />
        }
      </button>

      {/* Expanded section */}
      {expanded && (
        <div style={{ padding: '0 16px 16px', borderTop: `1px solid ${conf.border}` }}>

          {/* Upcoming slots */}
          {schedule && schedule.upcoming.length > 0 ? (
            <>
              <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '12px 0 8px' }}>
                Upcoming Outages
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {schedule.upcoming.map((slot, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '8px 12px',
                    background: 'rgba(255,255,255,0.05)', borderRadius: '8px',
                  }}>
                    <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: '#F0F6FC' }}>
                      {slotLabel(slot)}
                    </span>
                    <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>
                      {timeUntil(slot.start)}
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: 'rgba(255,255,255,0.4)', marginTop: '12px', textAlign: 'center' }}>
              {areaId ? 'No upcoming outages for your area' : 'Add your area for a full schedule'}
            </div>
          )}

          {/* Alert toggle */}
          {areaId && (
            <button
              onClick={() => {
                const next = !alerts;
                setAlerts(next);
                if (areaId) saveLoadSheddingPrefs({ areaId, alert30min: next, alert2hours: next });
              }}
              style={{
                marginTop: '14px', width: '100%',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                padding: '10px',
                background: alerts ? 'rgba(57,217,138,0.12)' : 'rgba(255,255,255,0.06)',
                border: `1px solid ${alerts ? 'rgba(57,217,138,0.3)' : 'rgba(255,255,255,0.1)'}`,
                borderRadius: '10px',
                fontFamily: 'DM Sans, sans-serif', fontWeight: 700, fontSize: '13px',
                color: alerts ? '#39D98A' : 'rgba(255,255,255,0.55)',
                cursor: 'pointer',
              }}
            >
              {alerts
                ? <><Bell    size={14} color="#39D98A" /> Alerts on</>
                : <><BellOff size={14} color="rgba(255,255,255,0.55)" /> Get outage alerts</>
              }
            </button>
          )}

          {/* Data attribution */}
          <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '10px', color: 'rgba(255,255,255,0.25)', textAlign: 'center', marginTop: '10px' }}>
            Data via EskomSePush · Updates every 5 min
          </div>
        </div>
      )}
    </div>
  );
}
