import { useState, useEffect } from 'react';
import { Users, Clock, TrendingDown, TrendingUp, RefreshCw, Minus } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { getVisitorId } from '../../lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface QueueLocation {
  id: string;
  name: string;
  type: string;
  currentWait: number;   // minutes
  queueLength: number;   // people in line
  lastUpdated: string;
  trend: 'increasing' | 'decreasing' | 'stable';
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function waitColor(mins: number): string {
  if (mins < 15) return '#39D98A';
  if (mins < 45) return '#FBBF24';
  return '#EF4444';
}

function waitBg(mins: number): string {
  if (mins < 15) return 'rgba(57,217,138,0.08)';
  if (mins < 45) return 'rgba(251,191,36,0.08)';
  return 'rgba(239,68,68,0.08)';
}

function waitBorder(mins: number): string {
  if (mins < 15) return 'rgba(57,217,138,0.25)';
  if (mins < 45) return 'rgba(251,191,36,0.25)';
  return 'rgba(239,68,68,0.25)';
}

function formatAge(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

function typeLabel(type: string): string {
  return type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToQueue(row: any): QueueLocation {
  return {
    id:          row.id,
    name:        row.name,
    type:        row.type       ?? 'other',
    currentWait: row.current_wait ?? 0,
    queueLength: row.queue_length ?? 0,
    lastUpdated: row.last_updated ?? row.updated_at ?? new Date().toISOString(),
    trend:       row.trend ?? 'stable',
  };
}

// ─── Common place types (empty state) ────────────────────────────────────────

const COMMON_PLACES = [
  { type: 'home_affairs',    label: 'Home Affairs',   emoji: '🏢' },
  { type: 'clinic',          label: 'Clinic',         emoji: '🏥' },
  { type: 'police_station',  label: 'Police Station', emoji: '👮' },
  { type: 'atm',             label: 'ATM',            emoji: '🏧' },
  { type: 'post_office',     label: 'Post Office',    emoji: '📮' },
  { type: 'sassa',           label: 'SASSA Office',   emoji: '🏛️' },
];

// ─── Report wait-time modal ───────────────────────────────────────────────────

function ReportForm({
  queue,
  onDone,
}: {
  queue: QueueLocation;
  onDone: (updated: Partial<QueueLocation>) => void;
}) {
  const [wait,    setWait]    = useState(String(queue.currentWait));
  const [length,  setLength]  = useState(String(queue.queueLength));
  const [saving,  setSaving]  = useState(false);

  async function submit() {
    const w = parseInt(wait,  10);
    const l = parseInt(length, 10);
    if (isNaN(w) || isNaN(l)) return;
    setSaving(true);

    const visitorId = getVisitorId();
    await supabase.from('queue_status').update({
      current_wait: w,
      queue_length: l,
      last_updated: new Date().toISOString(),
      updated_by:   visitorId,
      trend: w > queue.currentWait ? 'increasing' : w < queue.currentWait ? 'decreasing' : 'stable',
    }).eq('id', queue.id);

    setSaving(false);
    onDone({ currentWait: w, queueLength: l, lastUpdated: new Date().toISOString() });
  }

  return (
    <div style={{ marginTop: '10px', padding: '12px', background: 'rgba(96,165,250,0.06)', border: '1px solid rgba(96,165,250,0.2)', borderRadius: '10px' }}>
      <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: 'rgba(255,255,255,0.45)', marginBottom: '8px' }}>
        Update wait time:
      </div>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
        <label style={{ flex: 1 }}>
          <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '4px' }}>Wait (mins)</div>
          <input
            type="number" min="0" max="300"
            value={wait} onChange={e => setWait(e.target.value)}
            style={{ width: '100%', boxSizing: 'border-box', background: '#0D1117', border: '1px solid #30363D', borderRadius: '7px', padding: '7px 10px', color: '#F0F6FC', fontFamily: 'DM Sans, sans-serif', fontSize: '13px', outline: 'none' }}
          />
        </label>
        <label style={{ flex: 1 }}>
          <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '4px' }}>People in line</div>
          <input
            type="number" min="0" max="500"
            value={length} onChange={e => setLength(e.target.value)}
            style={{ width: '100%', boxSizing: 'border-box', background: '#0D1117', border: '1px solid #30363D', borderRadius: '7px', padding: '7px 10px', color: '#F0F6FC', fontFamily: 'DM Sans, sans-serif', fontSize: '13px', outline: 'none' }}
          />
        </label>
      </div>
      <button
        onClick={submit} disabled={saving}
        style={{
          width: '100%', padding: '8px',
          background: '#60A5FA', border: 'none', borderRadius: '7px',
          fontFamily: 'DM Sans, sans-serif', fontWeight: 700, fontSize: '12px',
          color: '#000', cursor: 'pointer',
        }}
      >
        {saving ? 'Saving…' : 'Submit Update'}
      </button>
    </div>
  );
}

// ─── Queue card ───────────────────────────────────────────────────────────────

function QueueCard({ queue: initial }: { queue: QueueLocation }) {
  const [queue,    setQueue]    = useState(initial);
  const [updating, setUpdating] = useState(false);
  const color  = waitColor(queue.currentWait);
  const bg     = waitBg(queue.currentWait);
  const border = waitBorder(queue.currentWait);

  return (
    <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: '12px', padding: '14px' }}>
      {/* Top row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '10px' }}>
        <div>
          <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '14px', color: '#F0F6FC', marginBottom: '2px' }}>
            {queue.name}
          </div>
          <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>
            {typeLabel(queue.type)}
          </div>
        </div>
        {queue.trend === 'increasing' && <TrendingUp  size={16} color="#EF4444" />}
        {queue.trend === 'decreasing' && <TrendingDown size={16} color="#39D98A" />}
        {queue.trend === 'stable'     && <Minus        size={16} color="rgba(255,255,255,0.3)" />}
      </div>

      {/* Stats row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Clock size={13} color={color} />
            <span style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 700, fontSize: '13px', color }}>
              {queue.currentWait} min
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Users size={13} color="rgba(255,255,255,0.4)" />
            <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: 'rgba(255,255,255,0.45)' }}>
              {queue.queueLength} in line
            </span>
          </div>
        </div>
        <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '10px', color: 'rgba(255,255,255,0.3)' }}>
          {formatAge(queue.lastUpdated)}
        </span>
      </div>

      {/* Update toggle */}
      {updating ? (
        <ReportForm
          queue={queue}
          onDone={patch => { setQueue(q => ({ ...q, ...patch })); setUpdating(false); }}
        />
      ) : (
        <button
          onClick={() => setUpdating(true)}
          style={{
            marginTop: '10px', width: '100%', padding: '6px',
            background: 'transparent', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '7px', fontFamily: 'DM Sans, sans-serif', fontSize: '11px',
            color: 'rgba(255,255,255,0.35)', cursor: 'pointer',
          }}
        >
          ✏️ Update wait time
        </button>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function QueueStatus() {
  const [queues,  setQueues]  = useState<QueueLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [spinning, setSpinning] = useState(false);

  async function fetchQueues() {
    setSpinning(true);
    const { data } = await supabase
      .from('queue_status')
      .select('*')
      .order('current_wait', { ascending: true });

    setQueues((data ?? []).map(rowToQueue));
    setLoading(false);
    setSpinning(false);
  }

  useEffect(() => {
    fetchQueues();
    const iv = setInterval(fetchQueues, 2 * 60 * 1000);
    return () => clearInterval(iv);
  }, []);

  return (
    <div style={{ background: '#161B22', border: '1px solid #21262D', borderRadius: '16px', padding: '16px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <div>
          <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '17px', color: '#F0F6FC', margin: '0 0 2px' }}>
            Queue Status
          </h2>
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: 'rgba(255,255,255,0.4)', margin: 0 }}>
            Live wait times near you
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={fetchQueues}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
          >
            <RefreshCw size={15} color="rgba(255,255,255,0.35)" style={spinning ? { animation: 'spin 1s linear infinite' } : {}} />
          </button>
          <div style={{ width: '36px', height: '36px', borderRadius: '12px', background: 'rgba(96,165,250,0.12)', border: '1px solid rgba(96,165,250,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Users size={17} color="#60A5FA" />
          </div>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Loading skeletons */}
      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {[1,2,3].map(i => (
            <div key={i} style={{ height: '80px', background: 'rgba(255,255,255,0.04)', borderRadius: '12px' }} />
          ))}
        </div>
      )}

      {/* Queue list */}
      {!loading && queues.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {queues.map(q => <QueueCard key={q.id} queue={q} />)}
        </div>
      )}

      {/* Empty state */}
      {!loading && queues.length === 0 && (
        <div style={{ textAlign: 'center', paddingBottom: '8px' }}>
          <div style={{ padding: '20px', background: '#0D1117', borderRadius: '12px', marginBottom: '12px' }}>
            <Users size={32} color="rgba(255,255,255,0.15)" style={{ marginBottom: '8px' }} />
            <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: 'rgba(255,255,255,0.4)', marginBottom: '4px' }}>
              No queue info yet
            </div>
            <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: 'rgba(255,255,255,0.25)' }}>
              Be the first to report a wait time
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {COMMON_PLACES.map(p => (
              <button
                key={p.type}
                style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  width: '100%', padding: '12px',
                  background: '#0D1117', border: '1px solid #21262D', borderRadius: '10px',
                  cursor: 'pointer', textAlign: 'left',
                }}
              >
                <span style={{ fontSize: '20px' }}>{p.emoji}</span>
                <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: 'rgba(255,255,255,0.7)', flex: 1 }}>
                  {p.label}
                </span>
                <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', fontWeight: 700, color: '#60A5FA' }}>
                  Report Wait →
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
