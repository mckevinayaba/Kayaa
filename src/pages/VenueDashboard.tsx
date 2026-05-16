import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  BarChart3, Users, Eye, Star, TrendingUp, TrendingDown,
  Clock, Camera, Share2, Settings, ArrowLeft,
  CheckSquare, Zap, QrCode, MessageSquarePlus, RefreshCw,
  FileText, ToggleLeft, ToggleRight,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import {
  getVenueOwnerByUserId, getVenueById,
  getDashboardStats, getWeeklyRhythm, getRecentCheckIns,
} from '../lib/api';
import type { Venue } from '../types';
import type { WeeklyBar, DashboardCheckIn } from '../lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface DashStats {
  todayCheckins:  number;
  weekCheckins:   number;
  totalCheckins:  number;
  weekViews:      number;
  regularsCount:  number;
  dailyAvg:       number;
  lapsedCount:    number;
  newFacesCount:  number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CATEGORY_EMOJI: Record<string, string> = {
  Barbershop: '✂️', Shisanyama: '🔥', Tavern: '🍺', Café: '☕',
  Church: '⛪', Carwash: '🚗', 'Spaza Shop': '🏪', Salon: '💅',
  Tutoring: '📚', 'Sports Ground': '⚽', 'Home Business': '🏠',
};

function venueEmoji(category: string) {
  return CATEGORY_EMOJI[category] ?? '🏪';
}

function pct(a: number, b: number): string {
  if (b === 0) return '';
  const diff = ((a - b) / b) * 100;
  if (Math.abs(diff) < 1) return '';
  return `${diff > 0 ? '+' : ''}${Math.round(diff)}%`;
}

// ─── Stat tile ────────────────────────────────────────────────────────────────

function StatTile({
  value, label, accent, icon,
}: {
  value: string | number;
  label: string;
  accent: string;
  icon: React.ReactNode;
}) {
  return (
    <div style={{
      background: 'var(--color-surface)', border: `1px solid ${accent}25`,
      borderRadius: '14px', padding: '14px 12px',
      display: 'flex', flexDirection: 'column', gap: '6px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '26px', color: accent, lineHeight: 1 }}>
          {value}
        </span>
        {icon}
      </div>
      <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {label}
      </div>
    </div>
  );
}

// ─── Weekly rhythm mini-chart ─────────────────────────────────────────────────

function WeeklyMiniChart({ bars }: { bars: WeeklyBar[] }) {
  const max = Math.max(...bars.map(b => b.avg), 1);
  const chartH = 52;

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: `${chartH + 18}px` }}>
      {bars.map((b, i) => {
        const h = Math.max(4, Math.round((b.avg / max) * chartH));
        const isMax = b.avg === max && max > 0;
        return (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
            <div style={{
              width: '100%', height: `${h}px`, borderRadius: '4px 4px 2px 2px',
              background: isMax ? '#39D98A' : 'rgba(57,217,138,0.25)',
              transition: 'height 0.3s',
            }} />
            <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '9px', color: 'rgba(255,255,255,0.3)' }}>
              {b.day.slice(0, 1)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Quick action button ──────────────────────────────────────────────────────

function ActionButton({
  to, emoji, icon, label, sub, accent = 'rgba(255,255,255,0.1)', premium = false,
}: {
  to: string;
  emoji?: string;
  icon?: React.ReactNode;
  label: string;
  sub: string;
  accent?: string;
  premium?: boolean;
}) {
  return (
    <Link
      to={to}
      style={{
        display: 'flex', alignItems: 'center', gap: '14px',
        padding: '14px 16px', borderRadius: '14px', textDecoration: 'none',
        background: premium
          ? 'linear-gradient(135deg, rgba(251,191,36,0.12), rgba(249,115,22,0.08))'
          : 'var(--color-surface)',
        border: premium
          ? '1px solid rgba(251,191,36,0.3)'
          : '1px solid #21262D',
      }}
    >
      <div style={{
        width: '40px', height: '40px', borderRadius: '12px', flexShrink: 0,
        background: `${accent}18`, border: `1px solid ${accent}30`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: emoji ? '20px' : undefined,
      }}>
        {emoji ?? icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '14px', color: premium ? '#FBBF24' : '#F0F6FC', marginBottom: '1px' }}>
          {label}
        </div>
        <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: premium ? 'rgba(251,191,36,0.6)' : 'rgba(255,255,255,0.4)' }}>
          {sub}
        </div>
      </div>
      {premium && (
        <span style={{
          fontFamily: 'DM Sans, sans-serif', fontWeight: 800, fontSize: '10px',
          color: '#000', background: '#FBBF24', borderRadius: '6px', padding: '3px 7px',
          flexShrink: 0,
        }}>
          PRO
        </span>
      )}
      {!premium && (
        <span style={{ fontSize: '16px', color: 'rgba(255,255,255,0.2)' }}>›</span>
      )}
    </Link>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function DashSkeleton() {
  return (
    <div style={{ padding: '16px', paddingTop: '70px' }}>
      {[80, 40, 120, 80].map((h, i) => (
        <div key={i} style={{ height: `${h}px`, background: 'rgba(255,255,255,0.04)', borderRadius: '14px', marginBottom: '12px' }} />
      ))}
    </div>
  );
}

// ─── No-venue state ───────────────────────────────────────────────────────────

function NoVenueState() {
  return (
    <div style={{ minHeight: '80vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 24px', textAlign: 'center' }}>
      <div style={{ fontSize: '56px', marginBottom: '16px' }}>🏪</div>
      <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '22px', color: '#F0F6FC', marginBottom: '8px' }}>
        No venue found
      </h1>
      <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.6, marginBottom: '24px', maxWidth: '280px' }}>
        You don't have a place on Kayaa yet. Add your business to get check-ins, analytics, and regulars.
      </p>
      <Link
        to="/onboarding"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: '8px',
          padding: '14px 28px', borderRadius: '14px', textDecoration: 'none',
          background: '#39D98A', fontFamily: 'Syne, sans-serif', fontWeight: 800,
          fontSize: '15px', color: '#000',
        }}
      >
        <Zap size={16} />
        Add Your Place
      </Link>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function VenueDashboard() {
  const { user } = useAuth();
  const navigate  = useNavigate();

  const [venue,    setVenue]    = useState<Venue | null>(null);
  const [stats,    setStats]    = useState<DashStats | null>(null);
  const [bars,     setBars]     = useState<WeeklyBar[]>([]);
  const [recent,   setRecent]   = useState<DashboardCheckIn[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [refresh,  setRefresh]  = useState(false);
  const [isOpen,   setIsOpen]   = useState(false);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    if (!user) return;
    load();
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  async function load() {
    setRefresh(true);
    try {
      const ownership = await getVenueOwnerByUserId(user!.id);
      if (!ownership) { setLoading(false); setRefresh(false); return; }

      const v = await getVenueById(ownership.venueId);
      if (!v) { setLoading(false); setRefresh(false); return; }
      setVenue(v);
      setIsOpen(v.isOpen);

      // Load all stats in parallel
      const [studioStats, weeklyBars, recentCIs, viewsRes, totalRes, regularsRes] = await Promise.all([
        getDashboardStats(v.id),
        getWeeklyRhythm(v.id),
        getRecentCheckIns(v.id, 15),
        // weekly profile views
        supabase
          .from('venue_views')
          .select('id', { count: 'exact', head: true })
          .eq('venue_id', v.id)
          .gte('viewed_at', new Date(Date.now() - 7 * 86_400_000).toISOString()),
        // all-time total check-ins
        supabase
          .from('check_ins')
          .select('id', { count: 'exact', head: true })
          .eq('venue_id', v.id),
        // regulars from check_ins (more reliable than regular_scores)
        supabase
          .from('check_ins')
          .select('visitor_name')
          .eq('venue_id', v.id)
          .eq('is_ghost', false)
          .not('visitor_name', 'is', null),
      ]);

      // Count unique regulars (visited 5+ times) from check_ins
      const nameCounts: Record<string, number> = {};
      for (const row of regularsRes.data ?? []) {
        const n = row.visitor_name as string;
        if (n) nameCounts[n] = (nameCounts[n] ?? 0) + 1;
      }
      const trueRegularsCount = Object.values(nameCounts).filter(c => c >= 5).length;

      setBars(weeklyBars);
      setRecent(recentCIs);
      setStats({
        todayCheckins:  studioStats.todayCount,
        weekCheckins:   studioStats.weekCount,
        totalCheckins:  totalRes.count ?? v.checkinCount ?? 0,
        weekViews:      viewsRes.count ?? 0,
        regularsCount:  trueRegularsCount || v.regularsCount,
        dailyAvg:       studioStats.dailyAvg,
        lapsedCount:    studioStats.lapsedCount,
        newFacesCount:  studioStats.newFacesCount,
      } satisfies DashStats);
    } finally {
      setLoading(false);
      setRefresh(false);
    }
  }

  async function toggleStatus() {
    if (!venue || toggling) return;
    setToggling(true);
    const next = !isOpen;
    setIsOpen(next); // optimistic
    await supabase
      .from('venues')
      .update({ status: next ? 'open' : 'closed' })
      .eq('id', venue.id);
    setToggling(false);
  }

  // ── Redirect unauthenticated users ────────────────────────────────────────
  if (!user) {
    return (
      <div style={{ minHeight: '80vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔒</div>
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: 'rgba(255,255,255,0.5)', marginBottom: '20px' }}>
          Sign in to manage your venue
        </p>
        <Link to="/login" style={{ padding: '12px 28px', background: '#39D98A', borderRadius: '12px', textDecoration: 'none', fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '14px', color: '#000' }}>
          Sign In
        </Link>
      </div>
    );
  }

  if (loading) return <DashSkeleton />;
  if (!venue)  return <NoVenueState />;

  const emoji = venueEmoji(venue.category);
  const weekTrend = pct(stats?.weekCheckins ?? 0, stats?.dailyAvg ? stats.dailyAvg * 7 : 0);

  return (
    <div style={{ paddingBottom: '100px' }}>

      {/* ── Sticky header ───────────────────────────────────────────────── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 40,
        background: 'rgba(13,17,23,0.92)', backdropFilter: 'blur(12px)',
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
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '16px', color: '#F0F6FC', margin: 0 }}>
          Venue Dashboard
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <button
            onClick={load}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px' }}
          >
            <RefreshCw size={16} color="rgba(255,255,255,0.4)"
              style={refresh ? { animation: 'spin 1s linear infinite' } : {}} />
          </button>
          <Link to="/feed" style={{ padding: '6px', display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
            <Settings size={18} color="rgba(255,255,255,0.5)" />
          </Link>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      <div style={{ padding: '0 16px' }}>

        {/* ── Venue identity card ─────────────────────────────────────────── */}
        <div style={{
          marginTop: '16px', marginBottom: '20px',
          background: 'var(--color-surface)', border: '1px solid #21262D',
          borderRadius: '16px', padding: '16px',
          display: 'flex', alignItems: 'center', gap: '14px',
        }}>
          <div style={{
            width: '56px', height: '56px', borderRadius: '16px', flexShrink: 0,
            background: 'rgba(57,217,138,0.1)', border: '1px solid rgba(57,217,138,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px',
          }}>
            {emoji}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '17px', color: '#F0F6FC', marginBottom: '2px' }}>
              {venue.name}
            </div>
            <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: 'rgba(255,255,255,0.45)' }}>
              {venue.category} · {venue.neighborhood}
            </div>
            {/* Plan tier indicator — always shown so owners know where they stand */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '5px' }}>
              <span style={{
                fontFamily: 'DM Sans, sans-serif', fontWeight: 700, fontSize: '9px',
                letterSpacing: '0.05em', textTransform: 'uppercase',
                color: venue.planTier === 'pro' ? '#FBBF24' : venue.planTier === 'starter' ? '#39D98A' : 'rgba(255,255,255,0.35)',
                background: venue.planTier === 'pro' ? 'rgba(251,191,36,0.1)' : venue.planTier === 'starter' ? 'rgba(57,217,138,0.1)' : 'rgba(255,255,255,0.06)',
                border: `1px solid ${venue.planTier === 'pro' ? 'rgba(251,191,36,0.25)' : venue.planTier === 'starter' ? 'rgba(57,217,138,0.2)' : 'rgba(255,255,255,0.1)'}`,
                borderRadius: '4px', padding: '2px 6px',
              }}>
                {venue.planTier === 'pro' ? 'Pro plan' : venue.planTier === 'starter' ? 'Starter plan' : 'Free plan'}
              </span>
              {venue.isPromoted && (
                <span style={{
                  fontFamily: 'DM Sans, sans-serif', fontWeight: 700, fontSize: '9px',
                  color: '#F5A623', background: 'rgba(245,166,35,0.1)',
                  border: '1px solid rgba(245,166,35,0.2)',
                  borderRadius: '4px', padding: '2px 6px', textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}>
                  Promoted
                </span>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flexShrink: 0, alignItems: 'flex-end' }}>
            <Link
              to={`/venue/${venue.slug}`}
              style={{
                padding: '7px 12px', borderRadius: '10px', textDecoration: 'none',
                background: 'rgba(57,217,138,0.1)', border: '1px solid rgba(57,217,138,0.2)',
                fontFamily: 'DM Sans, sans-serif', fontWeight: 700, fontSize: '11px',
                color: '#39D98A', whiteSpace: 'nowrap',
              }}
            >
              View page →
            </Link>
            {/* Open / Closed quick toggle */}
            <button
              onClick={toggleStatus}
              disabled={toggling}
              style={{
                display: 'flex', alignItems: 'center', gap: '5px',
                padding: '5px 10px', borderRadius: '20px', border: 'none', cursor: 'pointer',
                background: isOpen ? 'rgba(57,217,138,0.12)' : 'rgba(255,255,255,0.06)',
                transition: 'all 0.2s',
              }}
            >
              {isOpen
                ? <ToggleRight size={14} color="#39D98A" />
                : <ToggleLeft  size={14} color="rgba(255,255,255,0.3)" />
              }
              <span style={{
                fontFamily: 'DM Sans, sans-serif', fontWeight: 700, fontSize: '10px',
                color: isOpen ? '#39D98A' : 'rgba(255,255,255,0.3)',
              }}>
                {isOpen ? 'Open' : 'Closed'}
              </span>
            </button>
          </div>
        </div>

        {/* ── Alert banners ───────────────────────────────────────────────── */}
        {(stats?.lapsedCount ?? 0) > 0 && (
          <div style={{
            marginBottom: '16px', padding: '12px 14px',
            background: 'rgba(245,166,35,0.07)', border: '1px solid rgba(245,166,35,0.25)',
            borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '10px',
          }}>
            <span style={{ fontSize: '18px' }}>⏰</span>
            <div style={{ flex: 1 }}>
              <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '13px', color: '#F5A623' }}>
                {stats!.lapsedCount} regular{stats!.lapsedCount !== 1 ? 's' : ''} haven't visited in 14+ days
              </span>
              <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '1px' }}>
                Send a WhatsApp nudge from the Studio tab
              </div>
            </div>
            <Link to="/feed" style={{ textDecoration: 'none', fontFamily: 'DM Sans, sans-serif', fontWeight: 700, fontSize: '11px', color: '#F5A623', flexShrink: 0 }}>
              Studio →
            </Link>
          </div>
        )}

        {(stats?.newFacesCount ?? 0) > 0 && (
          <div style={{
            marginBottom: '16px', padding: '12px 14px',
            background: 'rgba(57,217,138,0.06)', border: '1px solid rgba(57,217,138,0.2)',
            borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '10px',
          }}>
            <span style={{ fontSize: '18px' }}>🌱</span>
            <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '13px', color: '#39D98A' }}>
              {stats!.newFacesCount} new face{stats!.newFacesCount !== 1 ? 's' : ''} this week — make them feel welcome!
            </div>
          </div>
        )}

        {/* ── Stat tiles ──────────────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
          <StatTile
            value={stats?.todayCheckins ?? 0}
            label="Check-ins today"
            accent="#39D98A"
            icon={<CheckSquare size={18} color="rgba(57,217,138,0.6)" />}
          />
          <StatTile
            value={stats?.weekCheckins ?? 0}
            label="This week"
            accent="#60A5FA"
            icon={<TrendingUp size={18} color="rgba(96,165,250,0.6)" />}
          />
          <StatTile
            value={stats?.regularsCount ?? 0}
            label="Regulars"
            accent="#A78BFA"
            icon={<Users size={18} color="rgba(167,139,250,0.6)" />}
          />
          <StatTile
            value={stats?.totalCheckins ?? 0}
            label="All-time"
            accent="#FBBF24"
            icon={<Star size={18} color="rgba(251,191,36,0.6)" />}
          />
        </div>

        {/* ── Weekly rhythm card ──────────────────────────────────────────── */}
        <div style={{
          background: 'var(--color-surface)', border: '1px solid #21262D',
          borderRadius: '16px', padding: '16px', marginBottom: '20px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div>
              <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '14px', color: '#F0F6FC', marginBottom: '1px' }}>
                Weekly rhythm
              </div>
              <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>
                4-week average check-ins per day
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              {weekTrend && (
                <>
                  {weekTrend.startsWith('+')
                    ? <TrendingUp  size={14} color="#39D98A" />
                    : <TrendingDown size={14} color="#F87171" />}
                  <span style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 700, fontSize: '12px', color: weekTrend.startsWith('+') ? '#39D98A' : '#F87171' }}>
                    {weekTrend}
                  </span>
                </>
              )}
            </div>
          </div>
          {bars.length > 0
            ? <WeeklyMiniChart bars={bars} />
            : <div style={{ height: '70px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: 'rgba(255,255,255,0.25)' }}>No check-in data yet</div>
          }
          <div style={{ marginTop: '10px', display: 'flex', gap: '16px' }}>
            {(stats?.dailyAvg ?? 0) > 0 && (
              <div>
                <span style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 700, fontSize: '13px', color: '#F0F6FC' }}>{stats?.dailyAvg ?? 0}</span>
                <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}> daily avg</span>
              </div>
            )}
          </div>
        </div>

        {/* ── Recent visitors ─────────────────────────────────────────────── */}
        <div style={{
          background: 'var(--color-surface)', border: '1px solid #21262D',
          borderRadius: '16px', padding: '16px', marginBottom: '20px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <div>
              <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '14px', color: '#F0F6FC', marginBottom: '1px' }}>
                Recent visitors
              </div>
              <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>
                Last {recent.length} check-ins
              </div>
            </div>
            <CheckSquare size={16} color="rgba(57,217,138,0.5)" />
          </div>

          {recent.length === 0 ? (
            <div style={{
              padding: '20px 0', textAlign: 'center',
              fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: 'rgba(255,255,255,0.25)',
            }}>
              No check-ins yet — share your QR code to get started
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {recent.map((ci, i) => {
                const name = ci.isGhost ? 'Anonymous' : ci.visitorName;
                const initial = ci.isGhost ? '?' : (name[0]?.toUpperCase() ?? '?');
                const COLORS = ['#39D98A', '#F5A623', '#60A5FA', '#F472B6', '#A78BFA', '#FB923C'];
                const color = ci.isGhost ? 'rgba(255,255,255,0.3)' : COLORS[i % COLORS.length];
                const isFirstTime = ci.isFirstVisit;
                return (
                  <div key={ci.id} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {/* Avatar */}
                    <div style={{
                      width: '34px', height: '34px', borderRadius: '50%', flexShrink: 0,
                      background: `${color}18`, border: `1.5px solid ${color}35`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '13px', color,
                    }}>
                      {initial}
                    </div>
                    {/* Name + meta */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: '13px', color: '#F0F6FC', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {name}
                        </span>
                        {isFirstTime && (
                          <span style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 700, fontSize: '9px', color: '#39D98A', background: 'rgba(57,217,138,0.1)', border: '1px solid rgba(57,217,138,0.3)', borderRadius: '4px', padding: '1px 5px', flexShrink: 0 }}>
                            NEW
                          </span>
                        )}
                        {ci.visitNumber >= 5 && !ci.isGhost && (
                          <span style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 700, fontSize: '9px', color: '#A78BFA', background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.3)', borderRadius: '4px', padding: '1px 5px', flexShrink: 0 }}>
                            REGULAR
                          </span>
                        )}
                      </div>
                      <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.35)', marginTop: '1px' }}>
                        visit #{ci.visitNumber}
                      </div>
                    </div>
                    {/* Time */}
                    <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.3)', flexShrink: 0 }}>
                      {(() => {
                        const diff = Date.now() - new Date(ci.createdAt).getTime();
                        const mins = Math.floor(diff / 60000);
                        if (mins < 1) return 'just now';
                        if (mins < 60) return `${mins}m ago`;
                        const hrs = Math.floor(mins / 60);
                        if (hrs < 24) return `${hrs}h ago`;
                        return new Date(ci.createdAt).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' });
                      })()}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Quick actions ────────────────────────────────────────────────── */}
        <div style={{ marginBottom: '8px' }}>
          <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '15px', color: '#F0F6FC', margin: '0 0 12px' }}>
            Quick Actions
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>

            <ActionButton
              to="/venue/edit"
              icon={<FileText size={20} color="#39D98A" />}
              label="Edit Details"
              sub="Description, phone, WhatsApp and open status"
              accent="#39D98A"
            />

            <ActionButton
              to="/venue/hours"
              icon={<Clock size={20} color="#60A5FA" />}
              label="Update Hours"
              sub="Change opening times"
              accent="#60A5FA"
            />

            <ActionButton
              to="/venue/updates"
              icon={<MessageSquarePlus size={20} color="#39D98A" />}
              label="Post an Update"
              sub="Share a special or news with regulars"
              accent="#39D98A"
            />

            <ActionButton
              to="/venue/photos"
              icon={<Camera size={20} color="#A78BFA" />}
              label="Manage Photos"
              sub="Upload new images of your place"
              accent="#A78BFA"
            />

            <ActionButton
              to="/venue/analytics"
              icon={<BarChart3 size={20} color="#FB923C" />}
              label="Full Analytics"
              sub="Detailed check-in insights and regulars"
              accent="#FB923C"
            />

            <ActionButton
              to="/venue/events"
              icon={<Share2 size={20} color="#F472B6" />}
              label="Create an Event"
              sub="Gig, braai, church service, stokvel…"
              accent="#F472B6"
            />

            <ActionButton
              to="/venue/qr-code"
              icon={<QrCode size={20} color="#34D399" />}
              label="Get QR Code"
              sub="Print and place at your counter"
              accent="#34D399"
            />

            <ActionButton
              to="/venue/boost"
              emoji="👑"
              label="Boost Your Place"
              sub="Paid plans launching soon — see what's coming"
              premium
            />

          </div>
        </div>

        {/* ── WhatsApp check-in alerts ─────────────────────────────────────── */}
        {(() => {
          const waNumber = import.meta.env.VITE_KAYAA_WA_NUMBER ?? '27600000000';
          const venueName = venue?.name ?? 'my venue';
          const waMsg = encodeURIComponent(`Hi Kayaa, I own ${venueName} and I want to receive check-in alerts on WhatsApp.`);
          return (
            <a
              href={`https://wa.me/${waNumber}?text=${waMsg}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                marginBottom: '12px', padding: '14px 16px',
                background: 'rgba(37,211,102,0.07)', border: '1px solid rgba(37,211,102,0.2)',
                borderRadius: '14px', textDecoration: 'none',
                fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: '14px', color: '#25D366',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#25D366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              Get check-in alerts on WhatsApp
            </a>
          );
        })()}

        {/* ── Owner dashboard deep-link ────────────────────────────────────── */}
        <Link
          to="/owner"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            marginTop: '20px', padding: '14px',
            background: 'rgba(57,217,138,0.06)', border: '1px solid rgba(57,217,138,0.2)',
            borderRadius: '14px', textDecoration: 'none',
            fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '14px', color: '#39D98A',
          }}
        >
          <Eye size={16} />
          Open Owner Dashboard
        </Link>

      </div>
    </div>
  );
}
