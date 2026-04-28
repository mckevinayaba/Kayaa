import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, Check, Zap } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { getVenueOwnerByUserId } from '../lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface DaySlot {
  open:   string;
  close:  string;
  closed: boolean;
}

type WeekHours = Record<string, DaySlot>;

const DAYS = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'] as const;

const DAY_LABELS: Record<string, string> = {
  monday: 'Monday', tuesday: 'Tuesday', wednesday: 'Wednesday',
  thursday: 'Thursday', friday: 'Friday', saturday: 'Saturday', sunday: 'Sunday',
};

const DEFAULT_HOURS: WeekHours = {
  monday:    { open: '08:00', close: '18:00', closed: false },
  tuesday:   { open: '08:00', close: '18:00', closed: false },
  wednesday: { open: '08:00', close: '18:00', closed: false },
  thursday:  { open: '08:00', close: '18:00', closed: false },
  friday:    { open: '08:00', close: '18:00', closed: false },
  saturday:  { open: '09:00', close: '14:00', closed: false },
  sunday:    { open: '00:00', close: '00:00', closed: true  },
};

// ─── Quick presets ────────────────────────────────────────────────────────────

const PRESETS: { label: string; emoji: string; hours: WeekHours }[] = [
  {
    label: 'Mon – Fri 9–5',
    emoji: '🏢',
    hours: {
      monday:    { open: '09:00', close: '17:00', closed: false },
      tuesday:   { open: '09:00', close: '17:00', closed: false },
      wednesday: { open: '09:00', close: '17:00', closed: false },
      thursday:  { open: '09:00', close: '17:00', closed: false },
      friday:    { open: '09:00', close: '17:00', closed: false },
      saturday:  { open: '00:00', close: '00:00', closed: true  },
      sunday:    { open: '00:00', close: '00:00', closed: true  },
    },
  },
  {
    label: 'Mon – Sat extended',
    emoji: '🏪',
    hours: {
      monday:    { open: '07:00', close: '20:00', closed: false },
      tuesday:   { open: '07:00', close: '20:00', closed: false },
      wednesday: { open: '07:00', close: '20:00', closed: false },
      thursday:  { open: '07:00', close: '20:00', closed: false },
      friday:    { open: '07:00', close: '21:00', closed: false },
      saturday:  { open: '08:00', close: '18:00', closed: false },
      sunday:    { open: '00:00', close: '00:00', closed: true  },
    },
  },
  {
    label: '7 days 24/7',
    emoji: '⚡',
    hours: Object.fromEntries(
      DAYS.map(d => [d, { open: '00:00', close: '23:59', closed: false }])
    ) as WeekHours,
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseHours(raw: string | undefined): WeekHours {
  if (!raw) return DEFAULT_HOURS;
  try {
    const parsed = JSON.parse(raw);
    // Validate shape — must have at least 'monday'
    if (typeof parsed === 'object' && parsed.monday) return { ...DEFAULT_HOURS, ...parsed };
  } catch { /* fall through */ }
  return DEFAULT_HOURS;
}

function fmt12(time24: string): string {
  const [h, m] = time24.split(':').map(Number);
  if (isNaN(h)) return time24;
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12  = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}

// ─── Day row ─────────────────────────────────────────────────────────────────

function DayRow({
  day, slot, onChange,
}: {
  day: string;
  slot: DaySlot;
  onChange: (updated: DaySlot) => void;
}) {
  const inputStyle = {
    background: '#0D1117', border: '1px solid #30363D', borderRadius: '8px',
    padding: '9px 10px', color: '#F0F6FC',
    fontFamily: 'DM Sans, sans-serif', fontSize: '13px', outline: 'none',
    width: '100%', boxSizing: 'border-box' as const,
  };

  return (
    <div style={{
      background: slot.closed ? 'rgba(255,255,255,0.02)' : '#161B22',
      border: `1px solid ${slot.closed ? '#21262D' : 'rgba(57,217,138,0.15)'}`,
      borderRadius: '14px', padding: '14px', opacity: slot.closed ? 0.6 : 1,
    }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: slot.closed ? '0' : '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '8px', height: '8px', borderRadius: '50%',
            background: slot.closed ? 'rgba(255,255,255,0.15)' : '#39D98A',
          }} />
          <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '14px', color: '#F0F6FC' }}>
            {DAY_LABELS[day]}
          </span>
          {!slot.closed && (
            <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>
              {fmt12(slot.open)} – {fmt12(slot.close)}
            </span>
          )}
        </div>

        {/* Closed toggle */}
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
          <div
            onClick={() => onChange({ ...slot, closed: !slot.closed })}
            style={{
              width: '40px', height: '22px', borderRadius: '11px',
              background: slot.closed ? '#30363D' : 'rgba(57,217,138,0.3)',
              border: `1px solid ${slot.closed ? '#444' : 'rgba(57,217,138,0.5)'}`,
              position: 'relative', cursor: 'pointer', transition: 'all 0.2s',
            }}
          >
            <div style={{
              position: 'absolute', top: '3px',
              left: slot.closed ? '3px' : '19px',
              width: '14px', height: '14px', borderRadius: '50%',
              background: slot.closed ? '#555' : '#39D98A',
              transition: 'left 0.2s',
            }} />
          </div>
          <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>
            {slot.closed ? 'Closed' : 'Open'}
          </span>
        </label>
      </div>

      {/* Time inputs */}
      {!slot.closed && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div>
            <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '4px' }}>
              Opens
            </div>
            <input
              type="time"
              value={slot.open}
              onChange={e => onChange({ ...slot, open: e.target.value })}
              style={inputStyle}
            />
          </div>
          <div>
            <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '4px' }}>
              Closes
            </div>
            <input
              type="time"
              value={slot.close}
              onChange={e => onChange({ ...slot, close: e.target.value })}
              style={inputStyle}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function VenueHours() {
  const { user }   = useAuth();
  const navigate   = useNavigate();

  const [venueId,  setVenueId]  = useState<string | null>(null);
  const [hours,    setHours]    = useState<WeekHours>(DEFAULT_HOURS);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [saved,    setSaved]    = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const ownership = await getVenueOwnerByUserId(user.id);
      if (!ownership) { setLoading(false); return; }
      setVenueId(ownership.venueId);

      const { data } = await supabase
        .from('venues')
        .select('opening_hours')
        .eq('id', ownership.venueId)
        .maybeSingle();

      setHours(parseHours(data?.opening_hours));
      setLoading(false);
    })();
  }, [user]);

  async function handleSave() {
    if (!venueId) return;
    setSaving(true);
    await supabase
      .from('venues')
      .update({ opening_hours: JSON.stringify(hours) })
      .eq('id', venueId);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  function updateDay(day: string, slot: DaySlot) {
    setHours(h => ({ ...h, [day]: slot }));
    setSaved(false);
  }

  // ── Skeleton ────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ padding: '70px 16px 16px' }}>
        {[...Array(7)].map((_, i) => (
          <div key={i} style={{ height: '70px', background: 'rgba(255,255,255,0.04)', borderRadius: '14px', marginBottom: '10px' }} />
        ))}
      </div>
    );
  }

  return (
    <div style={{ paddingBottom: '100px' }}>

      {/* ── Sticky header ─────────────────────────────────────────────── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 40,
        background: 'rgba(13,17,23,0.94)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid #21262D',
        padding: '12px 16px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <button
          onClick={() => navigate(-1)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
        >
          <ArrowLeft size={20} color="rgba(255,255,255,0.6)" />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Clock size={16} color="rgba(255,255,255,0.5)" />
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '16px', color: '#F0F6FC', margin: 0 }}>
            Opening Hours
          </h1>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '8px 14px', borderRadius: '10px', border: 'none',
            background: saved ? 'rgba(57,217,138,0.2)' : '#39D98A',
            fontFamily: 'DM Sans, sans-serif', fontWeight: 700, fontSize: '13px',
            color: saved ? '#39D98A' : '#000',
            cursor: saving ? 'default' : 'pointer',
            transition: 'all 0.2s',
          }}
        >
          {saved
            ? <><Check size={14} /> Saved</>
            : saving
              ? 'Saving…'
              : 'Save'}
        </button>
      </div>

      <div style={{ padding: '16px' }}>

        {/* ── Quick presets ─────────────────────────────────────────────── */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginBottom: '8px' }}>
            Quick presets
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {PRESETS.map(p => (
              <button
                key={p.label}
                onClick={() => { setHours(p.hours); setSaved(false); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '6px 12px', borderRadius: '20px',
                  background: '#161B22', border: '1px solid #30363D',
                  fontFamily: 'DM Sans, sans-serif', fontSize: '12px', fontWeight: 600,
                  color: 'rgba(255,255,255,0.6)', cursor: 'pointer', whiteSpace: 'nowrap',
                }}
              >
                <Zap size={11} color="#39D98A" />
                {p.emoji} {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Day rows ─────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
          {DAYS.map(day => (
            <DayRow
              key={day}
              day={day}
              slot={hours[day] ?? DEFAULT_HOURS[day]}
              onChange={slot => updateDay(day, slot)}
            />
          ))}
        </div>

        {/* ── No venue fallback ─────────────────────────────────────────── */}
        {!venueId && !loading && (
          <div style={{ textAlign: 'center', padding: '40px 16px', color: 'rgba(255,255,255,0.4)', fontFamily: 'DM Sans, sans-serif', fontSize: '14px' }}>
            No venue found. <a href="/onboarding" style={{ color: '#39D98A' }}>Add your place first.</a>
          </div>
        )}

        {/* ── Save hint ─────────────────────────────────────────────────── */}
        <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: 'rgba(255,255,255,0.25)', textAlign: 'center' }}>
          Changes are visible on your venue page immediately after saving.
        </div>
      </div>
    </div>
  );
}
