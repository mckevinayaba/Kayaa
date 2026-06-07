/**
 * AlertsPage — trustworthy, suburb-first local alert system.
 *
 * Architecture:
 *   1. Official alerts   — EskomSePush (load shedding) + SAWS via AfriGIS (weather)
 *   2. Community reports — structured safety_reports + utility_reports from Supabase
 *
 * Trust model (visible on every card):
 *   Official        — API / authority source
 *   Verified local  — 3+ corroborating community reports
 *   Community       — user-submitted, not yet formally verified
 *
 * Do NOT: turn this into a social feed, make community alerts look official,
 * or overload the page with controls.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldAlert, Zap, Droplet, CloudLightning, RefreshCw,
  MapPin, Search, X, ChevronDown, ChevronUp, Clock,
} from 'lucide-react';
import { useNeighbourhood } from '../contexts/NeighbourhoodContext';
import {
  fetchAllAlerts,
  getSavedEskomArea, saveEskomArea, clearEskomArea,
  searchEskomAreas,
  SOURCE_LABEL, SEVERITY_COLOR, SEVERITY_LABEL, TYPE_LABEL,
  type KayaaAlert, type AlertBundle, type EskomArea,
} from '../alerts';
import VideoPlayer from '../components/VideoPlayer';

// ─── Types ────────────────────────────────────────────────────────────────────

type FilterTab = 'all' | 'official' | 'safety' | 'utilities' | 'weather' | 'community';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short' });
}

function slotLabel(start: string, end: string): string {
  return `${formatTime(start)} – ${formatTime(end)}`;
}

function timeUntil(iso: string): string {
  const diffMs = new Date(iso).getTime() - Date.now();
  if (diffMs <= 0) return 'now';
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 60)  return `in ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `in ${hours}h`;
  return `in ${Math.floor(hours / 24)}d`;
}

// ─── Trust badge ──────────────────────────────────────────────────────────────

function TrustBadge({ sourceType }: { sourceType: KayaaAlert['sourceType']; sourceName?: string }) {
  const cfg: Record<KayaaAlert['sourceType'], { color: string; bg: string; icon: string }> = {
    official:       { color: '#39D98A', bg: 'rgba(57,217,138,0.12)', icon: '✓' },
    verified_local: { color: '#60A5FA', bg: 'rgba(96,165,250,0.12)', icon: '👥' },
    community:      { color: 'rgba(255,255,255,0.4)', bg: 'rgba(255,255,255,0.06)', icon: '🏘' },
  };
  const c = cfg[sourceType];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '4px',
      fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '10px',
      color: c.color, background: c.bg,
      borderRadius: '20px', padding: '2px 8px',
      textTransform: 'uppercase', letterSpacing: '0.05em',
      whiteSpace: 'nowrap',
    }}>
      <span style={{ fontSize: '9px' }}>{c.icon}</span>
      {SOURCE_LABEL[sourceType]}
    </span>
  );
}

// ─── Load shedding card (expanded — shows schedule) ───────────────────────────

function LoadSheddingCard({ alert }: { alert: KayaaAlert }) {
  const [expanded, setExpanded] = useState(false);
  const stage    = alert.loadSheddingStage ?? 0;
  const schedule = alert.loadSheddingSchedule ?? [];
  const isOff    = stage === 0;

  const stageColor =
    stage === 0 ? '#39D98A' :
    stage <= 2  ? '#FBBF24' :
    stage <= 4  ? '#F97316' : '#EF4444';

  return (
    <div style={{
      background: `${stageColor}08`,
      border: `1px solid ${stageColor}22`,
      borderLeft: `3px solid ${stageColor}`,
      borderRadius: '14px', overflow: 'hidden',
    }}>
      {/* Main row */}
      <button
        onClick={() => setExpanded(e => !e)}
        style={{
          width: '100%', display: 'flex', alignItems: 'flex-start', gap: '12px',
          padding: '14px', background: 'none', border: 'none', cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        {/* Icon */}
        <div style={{
          width: '38px', height: '38px', borderRadius: '10px', flexShrink: 0,
          background: `${stageColor}18`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Zap size={18} color={stageColor} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Trust + severity row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '5px', flexWrap: 'wrap' }}>
            <TrustBadge sourceType="official" sourceName={alert.sourceName} />
            <span style={{
              fontFamily: 'Inter, sans-serif', fontSize: '10px', fontWeight: 700,
              color: stageColor, background: `${stageColor}15`,
              borderRadius: '20px', padding: '2px 7px',
              textTransform: 'uppercase', letterSpacing: '0.04em',
            }}>
              {isOff ? 'No load shedding' : `Stage ${stage}`}
            </span>
          </div>

          {/* Title */}
          <div style={{
            fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '14px',
            color: '#F0F6FC', marginBottom: '3px', lineHeight: 1.3,
          }}>
            {alert.title}
          </div>

          {/* Description */}
          <div style={{
            fontFamily: 'Inter, sans-serif', fontSize: '12px',
            color: 'rgba(255,255,255,0.5)', lineHeight: 1.5,
          }}>
            {alert.description}
          </div>

          {/* Footer */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            marginTop: '8px', flexWrap: 'wrap',
          }}>
            <span style={{
              fontFamily: 'Inter, sans-serif', fontSize: '10px',
              color: 'rgba(255,255,255,0.3)',
              display: 'flex', alignItems: 'center', gap: '3px',
            }}>
              <Clock size={9} color="rgba(255,255,255,0.25)" />
              Updated {timeAgo(alert.updatedAt)}
            </span>
            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '10px', color: 'rgba(255,255,255,0.25)' }}>
              {alert.sourceName}
            </span>
            {schedule.length > 0 && (
              <span style={{
                fontFamily: 'Inter, sans-serif', fontSize: '10px', fontWeight: 700,
                color: stageColor,
              }}>
                {schedule.length} upcoming slot{schedule.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>

        {schedule.length > 0 && (
          expanded
            ? <ChevronUp size={14} color="rgba(255,255,255,0.3)" style={{ flexShrink: 0, marginTop: '2px' }} />
            : <ChevronDown size={14} color="rgba(255,255,255,0.3)" style={{ flexShrink: 0, marginTop: '2px' }} />
        )}
      </button>

      {/* Expanded schedule */}
      {expanded && schedule.length > 0 && (
        <div style={{ padding: '0 14px 14px', borderTop: `1px solid ${stageColor}15` }}>
          <div style={{
            fontFamily: 'Inter, sans-serif', fontSize: '10px', fontWeight: 700,
            color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.06em',
            margin: '12px 0 8px',
          }}>
            Upcoming outages
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {schedule.slice(0, 4).map((slot, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '8px 12px',
                background: 'rgba(255,255,255,0.04)', borderRadius: '8px',
              }}>
                <div>
                  <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: '#F0F6FC', fontWeight: 600 }}>
                    {slotLabel(slot.start, slot.end)}
                  </span>
                  <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.35)', marginLeft: '8px' }}>
                    {formatDate(slot.start)}
                  </span>
                </div>
                <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: stageColor, fontWeight: 600 }}>
                  {timeUntil(slot.start)}
                </span>
              </div>
            ))}
          </div>
          <div style={{
            fontFamily: 'Inter, sans-serif', fontSize: '10px',
            color: 'rgba(255,255,255,0.2)', textAlign: 'center', marginTop: '10px',
          }}>
            Data via EskomSePush · Refreshed every 5 min
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Weather card ─────────────────────────────────────────────────────────────

function WeatherCard({ alert }: { alert: KayaaAlert }) {
  const level    = alert.weatherWarningLevel ?? 'Yellow';
  const levelColor =
    level.toLowerCase().includes('red')    ? '#EF4444' :
    level.toLowerCase().includes('orange') ? '#F97316' : '#FBBF24';

  return (
    <div style={{
      background: `${levelColor}08`,
      border: `1px solid ${levelColor}22`,
      borderLeft: `3px solid ${levelColor}`,
      borderRadius: '14px',
      padding: '14px',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        <div style={{
          width: '38px', height: '38px', borderRadius: '10px', flexShrink: 0,
          background: `${levelColor}18`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <CloudLightning size={18} color={levelColor} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '5px', flexWrap: 'wrap' }}>
            <TrustBadge sourceType="official" sourceName={alert.sourceName} />
            <span style={{
              fontFamily: 'Inter, sans-serif', fontSize: '10px', fontWeight: 700,
              color: levelColor, background: `${levelColor}15`,
              borderRadius: '20px', padding: '2px 7px',
              textTransform: 'uppercase', letterSpacing: '0.04em',
            }}>
              {level} · {alert.weatherWarningType ?? 'Weather'}
            </span>
          </div>

          <div style={{
            fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '14px',
            color: '#F0F6FC', marginBottom: '4px', lineHeight: 1.3,
          }}>
            {alert.title}
          </div>

          <div style={{
            fontFamily: 'Inter, sans-serif', fontSize: '12px',
            color: 'rgba(255,255,255,0.55)', lineHeight: 1.55,
          }}>
            {alert.description}
          </div>

          <div style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            marginTop: '8px', flexWrap: 'wrap',
          }}>
            {alert.locationText && (
              <span style={{
                fontFamily: 'Inter, sans-serif', fontSize: '10px',
                color: 'rgba(255,255,255,0.3)',
                display: 'flex', alignItems: 'center', gap: '3px',
              }}>
                <MapPin size={9} color="rgba(255,255,255,0.25)" />
                {alert.locationText}
              </span>
            )}
            {alert.startsAt && alert.endsAt && (
              <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '10px', color: levelColor, fontWeight: 600 }}>
                {formatTime(alert.startsAt)} – {formatTime(alert.endsAt)}
              </span>
            )}
            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '10px', color: 'rgba(255,255,255,0.25)' }}>
              {alert.sourceName}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Generic alert card ───────────────────────────────────────────────────────

function AlertCard({ alert }: { alert: KayaaAlert }) {
  const typeMeta  = TYPE_LABEL[alert.type] ?? { label: 'Alert', emoji: '⚠️' };
  const sevColor  = SEVERITY_COLOR[alert.severity] ?? '#FBBF24';
  const isCommunity = alert.sourceType === 'community';

  return (
    <div style={{
      background: isCommunity ? 'rgba(255,255,255,0.02)' : `${sevColor}06`,
      border: isCommunity
        ? '1px solid rgba(255,255,255,0.07)'
        : `1px solid ${sevColor}18`,
      borderLeft: `3px solid ${isCommunity ? 'rgba(255,255,255,0.12)' : sevColor}`,
      borderRadius: '14px',
      overflow: 'hidden',
    }}>
      {/* Evidence image */}
      {alert.imageUrl && (
        alert.mediaType === 'video'
          ? <VideoPlayer src={alert.imageUrl} maxHeight={180} borderRadius={0} label="Evidence clip" />
          : <img src={alert.imageUrl} alt="Evidence" style={{ width: '100%', maxHeight: '180px', objectFit: 'cover', display: 'block' }} />
      )}

      <div style={{ padding: '12px 14px' }}>
        {/* Trust + type + severity row */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          marginBottom: '8px', flexWrap: 'wrap',
        }}>
          <TrustBadge sourceType={alert.sourceType} sourceName={alert.sourceName} />
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '4px',
            fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '10px',
            color: isCommunity ? 'rgba(255,255,255,0.45)' : sevColor,
            background: isCommunity ? 'rgba(255,255,255,0.06)' : `${sevColor}15`,
            borderRadius: '20px', padding: '2px 7px',
            textTransform: 'uppercase', letterSpacing: '0.04em',
          }}>
            {typeMeta.emoji} {typeMeta.label}
          </span>
          <span style={{
            fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: '10px',
            color: isCommunity ? 'rgba(255,255,255,0.3)' : sevColor,
          }}>
            <span style={{
              width: '5px', height: '5px', borderRadius: '50%',
              background: isCommunity ? 'rgba(255,255,255,0.2)' : sevColor,
              display: 'inline-block', marginRight: '4px', verticalAlign: 'middle',
            }} />
            {SEVERITY_LABEL[alert.severity]}
          </span>
          <span style={{ marginLeft: 'auto', fontFamily: 'Inter, sans-serif', fontSize: '10px', color: 'rgba(255,255,255,0.28)' }}>
            {timeAgo(alert.happenedAt ?? alert.createdAt)}
          </span>
        </div>

        {/* Title */}
        <div style={{
          fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '14px',
          color: '#F0F6FC', marginBottom: '4px', lineHeight: 1.3,
        }}>
          {alert.title}
        </div>

        {/* Description */}
        <div style={{
          fontFamily: 'Inter, sans-serif', fontSize: '12px',
          color: 'rgba(255,255,255,0.6)', lineHeight: 1.55, marginBottom: '8px',
        }}>
          {alert.description}
        </div>

        {/* Footer: area · timing · source */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{
            fontFamily: 'Inter, sans-serif', fontSize: '10px',
            color: 'rgba(255,255,255,0.3)',
            display: 'flex', alignItems: 'center', gap: '3px',
          }}>
            <MapPin size={9} color="rgba(255,255,255,0.2)" />
            {alert.locationText || `${alert.suburb}${alert.city ? `, ${alert.city}` : ''}`}
          </span>
          {alert.startsAt && (
            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '10px', color: 'rgba(255,255,255,0.3)' }}>
              · {formatTime(alert.startsAt)}
              {alert.endsAt ? ` – ${formatTime(alert.endsAt)}` : ''}
            </span>
          )}
          <span style={{
            fontFamily: 'Inter, sans-serif', fontSize: '10px',
            color: isCommunity ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.3)',
          }}>
            · {alert.sourceName}
          </span>
        </div>

        {/* Community disclaimer */}
        {alert.sourceType === 'community' && (
          <div style={{
            marginTop: '8px', padding: '6px 10px',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '8px',
            fontFamily: 'Inter, sans-serif', fontSize: '10px',
            color: 'rgba(255,255,255,0.28)', lineHeight: 1.5,
          }}>
            Shared by a community member. Not officially verified.
          </div>
        )}
      </div>
    </div>
  );
}

// ─── EskomSePush area linker ──────────────────────────────────────────────────

function EskomAreaLinker({
  savedArea,
  onSave,
  onClear,
}: {
  savedArea: { id: string; name: string } | null;
  onSave: (id: string, name: string) => void;
  onClear: () => void;
}) {
  const [open,    setOpen]    = useState(false);
  const [query,   setQuery]   = useState('');
  const [results, setResults] = useState<EskomArea[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query.trim() || query.length < 2) { setResults([]); return; }
    const t = setTimeout(async () => {
      setLoading(true);
      const r = await searchEskomAreas(query);
      setResults(r);
      setLoading(false);
    }, 350);
    return () => clearTimeout(t);
  }, [query]);

  if (savedArea) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        background: 'rgba(57,217,138,0.07)',
        border: '1px solid rgba(57,217,138,0.2)',
        borderRadius: '12px', padding: '10px 14px',
        marginBottom: '14px',
      }}>
        <Zap size={14} color="#39D98A" style={{ flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 700, color: '#39D98A' }}>
            Load shedding area linked
          </div>
          <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '1px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {savedArea.name}
          </div>
        </div>
        <button
          onClick={onClear}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', flexShrink: 0, color: 'rgba(255,255,255,0.3)' }}
        >
          <X size={14} color="rgba(255,255,255,0.3)" />
        </button>
      </div>
    );
  }

  return (
    <div style={{ marginBottom: '14px' }}>
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
            padding: '10px 14px',
            background: 'rgba(251,191,36,0.06)',
            border: '1px solid rgba(251,191,36,0.2)',
            borderRadius: '12px', cursor: 'pointer', textAlign: 'left',
          } as React.CSSProperties}
        >
          <Zap size={14} color="#FBBF24" style={{ flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 700, color: '#FBBF24' }}>
              Get your load shedding schedule
            </div>
            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.35)', marginTop: '1px' }}>
              Link your area for outage times
            </div>
          </div>
          <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: '#FBBF24', fontWeight: 700, flexShrink: 0 }}>
            Set up →
          </span>
        </button>
      ) : (
        <div style={{
          background: 'var(--color-surface, #161B22)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '14px', padding: '14px',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: '12px',
          }}>
            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', fontWeight: 700, color: '#F0F6FC' }}>
              Find your load shedding area
            </div>
            <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px' }}>
              <X size={14} color="rgba(255,255,255,0.35)" />
            </button>
          </div>

          <div style={{ position: 'relative', marginBottom: '10px' }}>
            <Search size={14} color="rgba(255,255,255,0.35)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' } as React.CSSProperties} />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search your suburb — e.g. Berea, Sandton…"
              autoFocus
              style={{
                width: '100%', background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px',
                padding: '10px 12px 10px 36px', color: '#F0F6FC',
                fontFamily: 'Inter, sans-serif', fontSize: '14px', outline: 'none',
                boxSizing: 'border-box',
              } as React.CSSProperties}
            />
          </div>

          {loading && (
            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: 'rgba(255,255,255,0.3)', padding: '4px 0' }}>
              Searching…
            </div>
          )}

          {results.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '200px', overflowY: 'auto' }}>
              {results.map(area => (
                <button
                  key={area.id}
                  onClick={() => { onSave(area.id, area.name); setOpen(false); setQuery(''); setResults([]); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '10px 12px',
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.07)',
                    borderRadius: '10px', cursor: 'pointer', textAlign: 'left',
                  } as React.CSSProperties}
                >
                  <Zap size={13} color="#FBBF24" style={{ flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', fontWeight: 600, color: '#F0F6FC', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {area.name}
                    </div>
                    <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>
                      {area.region}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {query.length >= 2 && !loading && results.length === 0 && (
            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: 'rgba(255,255,255,0.3)', padding: '4px 0' }}>
              No areas found. Try a different suburb name.
            </div>
          )}

          <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '10px', color: 'rgba(255,255,255,0.2)', marginTop: '10px', lineHeight: 1.5 }}>
            Powered by EskomSePush · Your area ID is saved locally only
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function AlertSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {[88, 110, 88].map((h, i) => (
        <div key={i} style={{
          height: h, borderRadius: '14px',
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.05)',
        }} />
      ))}
    </div>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHead({ label, count, color }: { label: string; count?: number; color?: string }) {
  const c = color ?? 'rgba(255,255,255,0.35)';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
      <span style={{
        fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '10px',
        color: c, textTransform: 'uppercase', letterSpacing: '0.08em',
      }}>
        {label}
      </span>
      {count !== undefined && count > 0 && (
        <span style={{
          fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '10px',
          color: '#000', background: c, borderRadius: '20px', padding: '1px 6px',
        }}>
          {count}
        </span>
      )}
      <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.07)' }} />
    </div>
  );
}

// ─── Filter tabs ──────────────────────────────────────────────────────────────

const FILTERS: { key: FilterTab; label: string }[] = [
  { key: 'all',       label: '📡 All'       },
  { key: 'official',  label: '✓ Official'   },
  { key: 'safety',    label: '🛡 Safety'    },
  { key: 'utilities', label: '⚡ Utilities' },
  { key: 'weather',   label: '🌩 Weather'   },
  { key: 'community', label: '🏘 Community' },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AlertsPage() {
  const navigate  = useNavigate();
  const { displaySuburb, displayCity, displayLabel } = useNeighbourhood();
  const suburb  = displaySuburb || '';
  const city    = displayCity  || '';
  const areaLabel = displayLabel || suburb || city || 'your area';

  // Derive province from city / context (rough mapping — used for weather)
  const province = useMemo(() => {
    const c = city.toLowerCase();
    if (c.includes('johannesburg') || c.includes('soweto') || c.includes('ekurhuleni') || c.includes('tshwane') || c.includes('pretoria')) return 'Gauteng';
    if (c.includes('cape town') || c.includes('stellenbosch')) return 'Western Cape';
    if (c.includes('durban') || c.includes('ethekwini') || c.includes('pmb')) return 'KwaZulu-Natal';
    if (c.includes('port elizabeth') || c.includes('gqeberha') || c.includes('east london')) return 'Eastern Cape';
    if (c.includes('polokwane') || c.includes('limpopo')) return 'Limpopo';
    if (c.includes('nelspruit') || c.includes('mbombela')) return 'Mpumalanga';
    if (c.includes('kimberley')) return 'Northern Cape';
    if (c.includes('bloemfontein') || c.includes('mangaung')) return 'Free State';
    return 'Gauteng'; // default
  }, [city]);

  const [bundle,     setBundle]     = useState<AlertBundle | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [spinning,   setSpinning]   = useState(false);
  const [activeTab,  setActiveTab]  = useState<FilterTab>('all');
  const [savedArea,  setSavedArea]  = useState(() => getSavedEskomArea());

  // ── Data load ────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    if (!suburb && !city) { setLoading(false); return; }
    setSpinning(true);
    try {
      const b = await fetchAllAlerts({
        suburb,
        city,
        province,
        eskomAreaId: savedArea?.id ?? null,
      });
      setBundle(b);
    } catch (err) {
      console.warn('[AlertsPage] load failed:', err);
    } finally {
      setLoading(false);
      setSpinning(false);
    }
  }, [suburb, city, province, savedArea?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  // ── Area save/clear ──────────────────────────────────────────────────────

  function handleSaveArea(id: string, name: string) {
    saveEskomArea(id, name);
    const next = { id, name };
    setSavedArea(next);
  }

  function handleClearArea() {
    clearEskomArea();
    setSavedArea(null);
  }

  // ── Filtered alerts ──────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    const all = bundle?.all ?? [];
    switch (activeTab) {
      case 'official':  return all.filter(a => a.sourceType === 'official');
      case 'safety':    return all.filter(a => a.type === 'safety' || a.type === 'hazard');
      case 'utilities': return all.filter(a => a.type === 'load_shedding' || a.type === 'water_outage' || a.type === 'service_disruption');
      case 'weather':   return all.filter(a => a.type === 'weather');
      case 'community': return all.filter(a => a.sourceType === 'community' || a.sourceType === 'verified_local');
      default:          return all;
    }
  }, [bundle, activeTab]);

  const officialAlerts   = filtered.filter(a => a.sourceType === 'official');
  const communityAlerts  = filtered.filter(a => a.sourceType !== 'official');

  // ── No suburb set ────────────────────────────────────────────────────────

  if (!loading && !suburb && !city) {
    return (
      <div style={{ padding: '24px 16px' }}>
        <div style={{
          padding: '40px 24px', textAlign: 'center',
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: '16px',
        }}>
          <MapPin size={28} color="rgba(255,255,255,0.18)" style={{ marginBottom: '12px' }} />
          <p style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '15px', color: 'rgba(255,255,255,0.5)', margin: '0 0 6px' }}>
            No neighbourhood set
          </p>
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: 'rgba(255,255,255,0.28)', margin: 0, lineHeight: 1.6 }}>
            Tap your location in the top bar to see alerts for your area.
          </p>
        </div>
      </div>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div style={{ padding: '16px 16px calc(80px + env(safe-area-inset-bottom, 0px))' }}>

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'flex-start',
        justifyContent: 'space-between', marginBottom: '4px',
      }}>
        <div>
          <p style={{
            fontFamily: 'Inter, sans-serif', fontSize: '11px', fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '0.1em',
            color: 'rgba(255,255,255,0.3)', margin: '0 0 4px',
          }}>
            Local alerts
          </p>
          <h1 style={{
            fontFamily: 'Inter, sans-serif', fontWeight: 800, fontSize: '24px',
            color: '#FFFFFF', margin: 0, letterSpacing: '-0.02em', lineHeight: 1.15,
          }}>
            Alerts for {areaLabel}
          </h1>
        </div>
        <button
          onClick={load}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px', marginTop: '4px', flexShrink: 0 }}
        >
          <RefreshCw
            size={17}
            color="rgba(255,255,255,0.28)"
            style={spinning ? { animation: 'alSpin 1s linear infinite' } : {}}
          />
        </button>
      </div>

      {/* Page subtitle */}
      <p style={{
        fontFamily: 'Inter, sans-serif', fontSize: '12px',
        color: 'rgba(255,255,255,0.35)', margin: '0 0 16px', lineHeight: 1.55,
      }}>
        Official utility and weather alerts, plus local community reports.
      </p>

      {/* ── EskomSePush area linker ─────────────────────────────────────── */}
      <EskomAreaLinker
        savedArea={savedArea}
        onSave={handleSaveArea}
        onClear={handleClearArea}
      />

      {/* ── Report safety CTA ───────────────────────────────────────────── */}
      <button
        onClick={() => navigate('/report/safety')}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: '12px',
          padding: '11px 14px', marginBottom: '16px',
          background: 'rgba(239,68,68,0.06)',
          border: '1px solid rgba(239,68,68,0.18)',
          borderRadius: '14px', cursor: 'pointer', textAlign: 'left',
          WebkitTapHighlightColor: 'transparent',
        } as React.CSSProperties}
      >
        <div style={{
          width: '34px', height: '34px', borderRadius: '10px', flexShrink: 0,
          background: 'rgba(239,68,68,0.12)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px',
        }}>
          🚨
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '13px', color: '#F0F6FC' }}>
            Report a local issue
          </div>
          <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.35)', marginTop: '1px' }}>
            Share only what you saw or confirmed · Add time, place, details
          </div>
        </div>
        <ShieldAlert size={15} color="rgba(239,68,68,0.5)" style={{ flexShrink: 0 }} />
      </button>

      {/* ── Filter tabs ─────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', gap: '6px', overflowX: 'auto',
        scrollbarWidth: 'none', marginBottom: '16px',
        marginLeft: '-16px', paddingLeft: '16px',
        marginRight: '-16px', paddingRight: '16px',
      } as React.CSSProperties}>
        {FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setActiveTab(f.key)}
            style={{
              flexShrink: 0,
              padding: '7px 14px', borderRadius: '20px',
              background: activeTab === f.key ? 'rgba(57,217,138,0.12)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${activeTab === f.key ? 'rgba(57,217,138,0.35)' : 'rgba(255,255,255,0.1)'}`,
              color: activeTab === f.key ? '#39D98A' : 'rgba(255,255,255,0.45)',
              fontFamily: 'Inter, sans-serif', fontWeight: activeTab === f.key ? 700 : 500,
              fontSize: '12px', cursor: 'pointer', whiteSpace: 'nowrap',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* ── Alert feed ──────────────────────────────────────────────────── */}
      {loading ? (
        <AlertSkeleton />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Official alerts section */}
          {officialAlerts.length > 0 && (
            <div>
              <SectionHead label="Official alerts" count={officialAlerts.length} color="#39D98A" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {officialAlerts.map(alert => {
                  if (alert.type === 'load_shedding') return <LoadSheddingCard key={alert.id} alert={alert} />;
                  if (alert.type === 'weather')        return <WeatherCard      key={alert.id} alert={alert} />;
                  return <AlertCard key={alert.id} alert={alert} />;
                })}
              </div>
            </div>
          )}

          {/* Community alerts section */}
          {communityAlerts.length > 0 && (
            <div>
              <SectionHead
                label={`Community reports · ${suburb || city}`}
                count={communityAlerts.length}
                color="rgba(255,255,255,0.35)"
              />
              {/* Community disclaimer */}
              <div style={{
                fontFamily: 'Inter, sans-serif', fontSize: '11px',
                color: 'rgba(255,255,255,0.28)', lineHeight: 1.5,
                marginBottom: '10px',
              }}>
                Community reports are shared by people nearby and may not yet be verified.
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {communityAlerts.map(alert => (
                  <AlertCard key={alert.id} alert={alert} />
                ))}
              </div>
            </div>
          )}

          {/* Quiet / empty state */}
          {filtered.length === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* No reports status */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                background: 'rgba(57,217,138,0.06)',
                border: '1px solid rgba(57,217,138,0.16)',
                borderRadius: '12px', padding: '12px 14px',
              }}>
                <span style={{ fontSize: '16px' }}>🟢</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', fontWeight: 700, color: '#39D98A' }}>
                    No reports in {suburb || city} right now
                  </div>
                  <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.38)', marginTop: '2px' }}>
                    No safety or utility reports in the last 24 hours
                  </div>
                </div>
              </div>

              {/* Report utility CTA */}
              <button
                onClick={() => navigate('/report/utility/power')}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '11px 14px',
                  background: 'rgba(251,191,36,0.05)',
                  border: '1px solid rgba(251,191,36,0.15)',
                  borderRadius: '14px', cursor: 'pointer', textAlign: 'left',
                  WebkitTapHighlightColor: 'transparent',
                } as React.CSSProperties}
              >
                <div style={{
                  width: '34px', height: '34px', borderRadius: '10px', flexShrink: 0,
                  background: 'rgba(251,191,36,0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px',
                }}>
                  ⚡
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '13px', color: '#F0F6FC' }}>
                    Report a power or water issue
                  </div>
                  <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.35)', marginTop: '1px' }}>
                    Power out · no water · streetlights · leak
                  </div>
                </div>
                <Droplet size={15} color="rgba(251,191,36,0.45)" style={{ flexShrink: 0 }} />
              </button>
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes alSpin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
