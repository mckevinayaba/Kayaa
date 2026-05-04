import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, BarChart3, Users, TrendingUp, Zap } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import {
  getVenueOwnerByUserId,
  getDashboardStats,
  getWeeklyRhythm,
  getCommunityReportData,
  getStudioRegulars,
} from '../lib/api';
import type { WeeklyBar, StudioRegular, CommunityReportData } from '../lib/api';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' });
}

const BADGE_COLOR: Record<string, string> = {
  legend:   '#FBBF24',
  loyal:    '#A78BFA',
  regular:  '#39D98A',
  newcomer: 'rgba(255,255,255,0.4)',
};
const BADGE_EMOJI: Record<string, string> = {
  legend: '👑', loyal: '💜', regular: '⭐', newcomer: '🌱',
};

// ─── Hourly heatmap ───────────────────────────────────────────────────────────

async function fetchHourlyData(venueId: string): Promise<number[]> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const { data, error } = await supabase
    .from('check_ins')
    .select('created_at')
    .eq('venue_id', venueId)
    .gte('created_at', thirtyDaysAgo);

  if (error || !data) return Array(24).fill(0);

  const hours = Array(24).fill(0);
  for (const row of data) {
    const h = new Date(row.created_at).getHours();
    hours[h]++;
  }
  return hours;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SummaryCard({ report }: { report: CommunityReportData }) {
  const items = [
    { label: 'Total check-ins', value: report.totalCheckins, accent: '#39D98A' },
    { label: 'Unique visitors', value: report.uniqueVisitors, accent: '#60A5FA' },
    { label: 'Loyal regulars',  value: report.loyalCount,    accent: '#A78BFA' },
    { label: 'New faces',       value: report.newFaces,      accent: '#FB923C' },
  ];

  return (
    <div style={{
      background: '#161B22', border: '1px solid #21262D',
      borderRadius: '16px', padding: '16px', marginBottom: '16px',
    }}>
      <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '13px', color: 'rgba(255,255,255,0.5)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {report.month}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
        {items.map(it => (
          <div key={it.label}>
            <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '28px', color: it.accent, lineHeight: 1 }}>
              {it.value}
            </div>
            <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '3px' }}>
              {it.label}
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: '16px', borderTop: '1px solid #21262D', paddingTop: '12px' }}>
        <div>
          <span style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 700, fontSize: '13px', color: '#F0F6FC' }}>
            {report.busiestDay}
          </span>
          <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}> busiest day</span>
        </div>
        <div>
          <span style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 700, fontSize: '13px', color: '#F0F6FC' }}>
            {report.avgFrequency}×
          </span>
          <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}> avg frequency</span>
        </div>
      </div>
    </div>
  );
}

function WeeklyChart({ bars }: { bars: WeeklyBar[] }) {
  const max = Math.max(...bars.map(b => b.avg), 1);
  const chartH = 80;

  return (
    <div style={{
      background: '#161B22', border: '1px solid #21262D',
      borderRadius: '16px', padding: '16px', marginBottom: '16px',
    }}>
      <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '14px', color: '#F0F6FC', marginBottom: '4px' }}>
        Weekly Rhythm
      </div>
      <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '16px' }}>
        4-week average check-ins per day
      </div>

      {bars.length > 0 ? (
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', height: `${chartH + 40}px` }}>
          {bars.map((b, i) => {
            const h = Math.max(4, Math.round((b.avg / max) * chartH));
            const isMax = b.avg === max && max > 0;
            return (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '10px', color: isMax ? '#39D98A' : 'rgba(255,255,255,0.35)', fontWeight: isMax ? 700 : 400 }}>
                  {b.avg > 0 ? b.avg.toFixed(1) : ''}
                </span>
                <div style={{
                  width: '100%', height: `${h}px`, borderRadius: '6px 6px 3px 3px',
                  background: isMax ? '#39D98A' : 'rgba(57,217,138,0.2)',
                  transition: 'height 0.4s ease',
                }} />
                <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: isMax ? '#39D98A' : 'rgba(255,255,255,0.4)', fontWeight: isMax ? 700 : 400 }}>
                  {b.day}
                </span>
                <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '10px', color: 'rgba(255,255,255,0.25)' }}>
                  {b.total > 0 ? b.total : ''}
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.2)', fontFamily: 'DM Sans, sans-serif', fontSize: '13px' }}>
          No check-in data yet
        </div>
      )}
    </div>
  );
}

function HourlyHeatmap({ hours }: { hours: number[] }) {
  const max = Math.max(...hours, 1);
  const amPm = (h: number) => {
    if (h === 0) return '12am';
    if (h === 12) return '12pm';
    return h < 12 ? `${h}am` : `${h - 12}pm`;
  };

  return (
    <div style={{
      background: '#161B22', border: '1px solid #21262D',
      borderRadius: '16px', padding: '16px', marginBottom: '16px',
    }}>
      <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '14px', color: '#F0F6FC', marginBottom: '4px' }}>
        Busiest Hours
      </div>
      <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '14px' }}>
        Last 30 days — when visitors arrive
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '4px' }}>
        {hours.map((count, h) => {
          const intensity = count / max;
          const bg = intensity === 0
            ? 'rgba(255,255,255,0.03)'
            : `rgba(57,217,138,${0.08 + intensity * 0.85})`;
          return (
            <div
              key={h}
              title={`${amPm(h)}: ${count} visits`}
              style={{
                background: bg, borderRadius: '6px',
                padding: '6px 2px', textAlign: 'center',
              }}
            >
              <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '9px', color: intensity > 0.5 ? '#0D1117' : 'rgba(255,255,255,0.4)' }}>
                {amPm(h)}
              </div>
              {count > 0 && (
                <div style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 700, fontSize: '10px', color: intensity > 0.5 ? '#0D1117' : 'rgba(255,255,255,0.6)', marginTop: '2px' }}>
                  {count}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RegularsList({ regulars }: { regulars: StudioRegular[] }) {
  const [showAll, setShowAll] = useState(false);
  const shown = showAll ? regulars : regulars.slice(0, 10);

  return (
    <div style={{
      background: '#161B22', border: '1px solid #21262D',
      borderRadius: '16px', padding: '16px', marginBottom: '16px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <div>
          <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '14px', color: '#F0F6FC' }}>
            Your Regulars
          </div>
          <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>
            {regulars.length} total visitors tracked
          </div>
        </div>
        <Users size={16} color="rgba(167,139,250,0.6)" />
      </div>

      {shown.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '24px 0', fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: 'rgba(255,255,255,0.3)' }}>
          No visitors yet — share your QR code!
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {shown.map((r, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              padding: '10px 12px', borderRadius: '10px',
              background: r.isLapsed ? 'rgba(251,191,36,0.04)' : 'rgba(255,255,255,0.02)',
              border: `1px solid ${r.isLapsed ? 'rgba(251,191,36,0.12)' : '#21262D'}`,
            }}>
              {/* Rank */}
              <span style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 700, fontSize: '12px', color: 'rgba(255,255,255,0.25)', width: '18px', textAlign: 'right', flexShrink: 0 }}>
                {i + 1}
              </span>
              {/* Avatar */}
              <div style={{
                width: '34px', height: '34px', borderRadius: '10px', flexShrink: 0,
                background: `${BADGE_COLOR[r.badgeTier]}20`,
                border: `1px solid ${BADGE_COLOR[r.badgeTier]}40`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '14px',
                color: BADGE_COLOR[r.badgeTier],
              }}>
                {r.name[0]?.toUpperCase() ?? '?'}
              </div>
              {/* Name + last visit */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: '13px', color: '#F0F6FC', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {r.name}
                </div>
                <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: r.isLapsed ? '#FBBF24' : 'rgba(255,255,255,0.4)', marginTop: '1px' }}>
                  {r.isLapsed ? '⚠️ 14+ days ago' : `Last: ${fmtDate(r.lastVisit)}`}
                </div>
              </div>
              {/* Badge + visits */}
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '13px', color: BADGE_COLOR[r.badgeTier] }}>
                  {r.visitCount}×
                </div>
                <div style={{ fontSize: '12px' }} title={r.badgeTier}>{BADGE_EMOJI[r.badgeTier]}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {regulars.length > 10 && (
        <button
          onClick={() => setShowAll(v => !v)}
          style={{
            marginTop: '12px', width: '100%', padding: '10px',
            background: 'rgba(255,255,255,0.04)', border: '1px solid #30363D',
            borderRadius: '10px', cursor: 'pointer',
            fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: '13px',
            color: 'rgba(255,255,255,0.5)',
          }}
        >
          {showAll ? 'Show less' : `Show all ${regulars.length} visitors`}
        </button>
      )}
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div style={{ padding: '70px 16px 16px' }}>
      {[120, 180, 160, 240].map((h, i) => (
        <div key={i} style={{ height: `${h}px`, background: 'rgba(255,255,255,0.04)', borderRadius: '16px', marginBottom: '12px' }} />
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function VenueAnalytics() {
  const { user }  = useAuth();
  const navigate  = useNavigate();

  const [venueId,   setVenueId]   = useState<string | null>(null);
  const [venueName, setVenueName] = useState('');
  const [loading,   setLoading]   = useState(true);
  const [report,    setReport]    = useState<CommunityReportData | null>(null);
  const [bars,      setBars]      = useState<WeeklyBar[]>([]);
  const [hours,     setHours]     = useState<number[]>(Array(24).fill(0));
  const [regulars,  setRegulars]  = useState<StudioRegular[]>([]);
  const [today,     setToday]     = useState(0);
  const [week,      setWeek]      = useState(0);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const ownership = await getVenueOwnerByUserId(user.id);
      if (!ownership) { setLoading(false); return; }
      setVenueId(ownership.venueId);

      const [statsRes, barsRes, reportRes, regularsRes, hourlyRes] = await Promise.all([
        getDashboardStats(ownership.venueId),
        getWeeklyRhythm(ownership.venueId),
        getCommunityReportData(ownership.venueId),
        getStudioRegulars(ownership.venueId),
        fetchHourlyData(ownership.venueId),
      ]);

      // Get venue name
      const { data: vRow } = await supabase
        .from('venues').select('name').eq('id', ownership.venueId).single();
      setVenueName(vRow?.name ?? '');

      setToday(statsRes.todayCount);
      setWeek(statsRes.weekCount);
      setBars(barsRes);
      setReport(reportRes);
      setRegulars(regularsRes);
      setHours(hourlyRes);
      setLoading(false);
    })();
  }, [user]);

  if (loading) return <Skeleton />;

  if (!venueId) {
    return (
      <div style={{ padding: '80px 24px', textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>📊</div>
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: 'rgba(255,255,255,0.5)' }}>
          No venue found. Add your place first.
        </p>
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
        display: 'flex', alignItems: 'center', gap: '12px',
      }}>
        <button
          onClick={() => navigate(-1)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
        >
          <ArrowLeft size={20} color="rgba(255,255,255,0.6)" />
        </button>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '16px', color: '#F0F6FC', margin: 0 }}>
            Full Analytics
          </h1>
          {venueName && (
            <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>
              {venueName}
            </div>
          )}
        </div>
        <BarChart3 size={18} color="rgba(251,146,60,0.7)" />
      </div>

      <div style={{ padding: '16px' }}>

        {/* ── Live pulse ─────────────────────────────────────────────────── */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px',
        }}>
          {[
            { label: 'Today', value: today, accent: '#39D98A', icon: '✅' },
            { label: 'This week', value: week, accent: '#60A5FA', icon: <TrendingUp size={16} color="rgba(96,165,250,0.7)" /> },
          ].map(t => (
            <div key={t.label} style={{
              background: '#161B22', border: `1px solid ${t.accent}20`,
              borderRadius: '14px', padding: '14px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '30px', color: t.accent, lineHeight: 1 }}>
                  {t.value}
                </span>
                <span style={{ fontSize: '16px' }}>{t.icon}</span>
              </div>
              <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {t.label}
              </div>
            </div>
          ))}
        </div>

        {/* ── Monthly summary ────────────────────────────────────────────── */}
        {report && <SummaryCard report={report} />}

        {/* ── Weekly rhythm ──────────────────────────────────────────────── */}
        <WeeklyChart bars={bars} />

        {/* ── Hourly heatmap ─────────────────────────────────────────────── */}
        <HourlyHeatmap hours={hours} />

        {/* ── Regulars list ──────────────────────────────────────────────── */}
        <RegularsList regulars={regulars} />

        {/* ── Tip ────────────────────────────────────────────────────────── */}
        <div style={{
          background: 'rgba(57,217,138,0.04)', border: '1px solid rgba(57,217,138,0.12)',
          borderRadius: '14px', padding: '14px 16px',
          display: 'flex', gap: '12px', alignItems: 'flex-start',
        }}>
          <Zap size={18} color="#39D98A" style={{ flexShrink: 0, marginTop: '2px' }} />
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.6, margin: 0 }}>
            Tip: Place your QR code near the checkout to boost scan rates by up to 3×.
            Visitors who check in 5+ times automatically earn a regular badge.
          </p>
        </div>

      </div>
    </div>
  );
}
