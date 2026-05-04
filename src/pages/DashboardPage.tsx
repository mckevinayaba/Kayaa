import { useState, useMemo, useEffect, useRef } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { MapPin, ExternalLink, Search, Plus, Download, Share2, Printer, Camera, Video, X as XIcon } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import {
  getVenueOwnerByUserId, getVenueById, getRecentCheckIns,
  getVenueEvents, createPost, createEvent, updateVenueSettings,
  getUserCheckInHistoryLocal, getVisitorId,
  getDashboardStats, getWeeklyRhythm, getStudioRegulars, getCommunityReportData,
  getHeadingThereList, uploadVenueFile,
  createVenueStory24, getActiveVenueStory, deleteVenueStory24, getStoryViewCount,
  getEventRsvpCountsBatch,
} from '../lib/api';
import type {
  DashboardCheckIn, HeadingThereEntry,
  StudioStats, WeeklyBar, StudioRegular, CommunityReportData, VenueStory24,
} from '../lib/api';
import type { Venue, Event } from '../types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const AVATAR_COLORS = ['#39D98A', '#F5A623', '#60A5FA', '#F472B6', '#A78BFA', '#FB923C'];

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function getTodayLabel() {
  return new Date().toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long' });
}

function avatarColor(index: number) { return AVATAR_COLORS[index % AVATAR_COLORS.length]; }

function isToday(iso: string): boolean {
  return new Date(iso).toDateString() === new Date().toDateString();
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr${hrs > 1 ? 's' : ''} ago`;
  return new Date(iso).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' });
}

function getWeeklyInsight(bars: WeeklyBar[]): string {
  const nonEmpty = bars.filter(b => b.avg > 0);
  if (nonEmpty.length === 0) return 'No check-ins yet in the last 4 weeks. Share your QR to get started.';
  const maxBar = nonEmpty.reduce((a, b) => (b.avg > a.avg ? b : a));
  const minBar = nonEmpty.length > 1 ? nonEmpty.reduce((a, b) => (b.avg < a.avg ? b : a)) : null;
  let s = `${maxBar.day}s are your busiest day — avg ${maxBar.avg} check-in${maxBar.avg !== 1 ? 's' : ''}.`;
  if (minBar && minBar.day !== maxBar.day) s += ` ${minBar.day}s tend to be quieter — a good day to run a special.`;
  return s;
}

// ─── Shared mini-components ───────────────────────────────────────────────────

function Avatar({ initial, color, size = 36 }: { initial: string; color: string; size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: `${color}18`, border: `1.5px solid ${color}40`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'Syne, sans-serif', fontWeight: 700,
      fontSize: size > 36 ? '16px' : '13px', color,
    }}>
      {initial}
    </div>
  );
}

function Pill({ label, color, bg }: { label: string; color: string; bg: string }) {
  return (
    <span style={{
      fontSize: '10px', fontWeight: 700, color, background: bg,
      padding: '2px 8px', borderRadius: '20px', whiteSpace: 'nowrap',
    }}>
      {label}
    </span>
  );
}

function ToggleRow({ label, sub, checked, onChange }: {
  label: string; sub?: string; checked: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '12px',
      padding: '14px 0', borderBottom: '1px solid var(--color-border)',
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text)' }}>{label}</div>
        {sub && <div style={{ fontSize: '12px', color: 'var(--color-muted)', marginTop: '2px' }}>{sub}</div>}
      </div>
      <div
        onClick={() => onChange(!checked)}
        style={{
          width: '46px', height: '26px', borderRadius: '13px', flexShrink: 0,
          background: checked ? 'var(--color-accent)' : 'var(--color-surface2)',
          border: `1px solid ${checked ? 'var(--color-accent)' : 'var(--color-border)'}`,
          position: 'relative', cursor: 'pointer',
          transition: 'background 0.2s, border-color 0.2s',
        }}
      >
        <div style={{
          position: 'absolute', top: '4px',
          left: checked ? '23px' : '4px',
          width: '16px', height: '16px', borderRadius: '50%',
          background: checked ? '#000' : '#6B7280',
          transition: 'left 0.2s',
        }} />
      </div>
    </div>
  );
}

// ─── Pilot checklist ─────────────────────────────────────────────────────────

function PilotChecklist({ venueId, venueCreatedAt, venueDescription, checkinCount }: {
  venueId: string; venueCreatedAt: string; venueDescription: string; checkinCount: number;
}) {
  const ageDays = (Date.now() - new Date(venueCreatedAt).getTime()) / 86400000;
  if (ageDays > 14) return null;

  const lsKey = `kayaa_pilot_${venueId}`;
  const [ticked, setTicked] = useState<Record<string, boolean>>(() => {
    try { return JSON.parse(localStorage.getItem(lsKey) ?? '{}'); } catch { return {}; }
  });

  function tick(key: string) {
    const next = { ...ticked, [key]: true };
    setTicked(next);
    localStorage.setItem(lsKey, JSON.stringify(next));
  }

  const items = [
    { key: 'register',      label: 'Register your place',                     done: true },
    { key: 'description',   label: 'Add a description (20+ characters)',       done: venueDescription.trim().length >= 20 },
    { key: 'share',         label: 'Share your check-in link with a customer', done: !!ticked.share },
    { key: 'first_checkin', label: 'Get your first check-in',                  done: checkinCount > 0 },
    { key: 'post',          label: 'Post an update',                           done: !!ticked.post },
    { key: 'event',         label: 'Add an event',                             done: !!ticked.event },
    { key: 'board',         label: 'Add to the neighbourhood board',           done: !!ticked.board },
  ];

  const doneCount = items.filter(i => i.done).length;
  const allDone = doneCount === items.length;

  if (allDone) return (
    <div style={{ marginBottom: '24px', background: 'rgba(57,217,138,0.06)', border: '1px solid rgba(57,217,138,0.2)', borderRadius: '14px', padding: '20px', textAlign: 'center' }}>
      <div style={{ fontSize: '28px', marginBottom: '8px' }}>🎉</div>
      <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '15px', color: 'var(--color-accent)', marginBottom: '4px' }}>You're all set!</div>
      <div style={{ fontSize: '13px', color: 'var(--color-muted)' }}>Your place is fully launched on Kayaa.</div>
    </div>
  );

  return (
    <div style={{ marginBottom: '24px' }}>
      <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '15px', marginBottom: '12px', color: 'var(--color-text)' }}>
        Getting started ({doneCount}/{items.length})
      </h2>
      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '14px', padding: '14px' }}>
        <div style={{ height: '4px', background: 'var(--color-border)', borderRadius: '2px', marginBottom: '14px', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${(doneCount / items.length) * 100}%`, background: 'var(--color-accent)', borderRadius: '2px', transition: 'width 0.3s' }} />
        </div>
        {items.map((item, i) => (
          <div key={item.key} onClick={() => !item.done && tick(item.key)} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 0', borderBottom: i < items.length - 1 ? '1px solid var(--color-border)' : 'none', cursor: item.done ? 'default' : 'pointer' }}>
            <div style={{ width: '20px', height: '20px', borderRadius: '50%', flexShrink: 0, background: item.done ? 'rgba(57,217,138,0.15)' : 'transparent', border: `1.5px solid ${item.done ? '#39D98A' : 'var(--color-border)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {item.done && <span style={{ fontSize: '11px', color: '#39D98A' }}>✓</span>}
            </div>
            <span style={{ fontSize: '13px', color: item.done ? 'var(--color-muted)' : 'var(--color-text)', textDecoration: item.done ? 'line-through' : 'none' }}>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Stat Tiles Row ──────────────────────────────────────────────────────────

function StatTilesRow({ stats, loading }: { stats: StudioStats | null; loading: boolean }) {
  const tiles = [
    {
      value: loading ? '—' : String(stats?.todayCount ?? 0),
      label: "Today's check-ins",
      color: (stats?.todayCount ?? 0) > 0 ? '#39D98A' : 'var(--color-muted)',
      border: (stats?.todayCount ?? 0) > 0 ? 'rgba(57,217,138,0.3)' : 'var(--color-border)',
    },
    {
      value: loading ? '—' : String(stats?.weekCount ?? 0),
      label: 'This week',
      color: 'var(--color-text)',
      border: 'var(--color-border)',
    },
    {
      value: loading ? '—' : String(stats?.lapsedCount ?? 0),
      label: 'Lapsed 14d+',
      color: (stats?.lapsedCount ?? 0) > 15 ? '#F87171' : (stats?.lapsedCount ?? 0) > 5 ? '#F5A623' : 'var(--color-muted)',
      border: (stats?.lapsedCount ?? 0) > 5 ? 'rgba(245,166,35,0.3)' : 'var(--color-border)',
    },
    {
      value: loading ? '—' : String(stats?.newFacesCount ?? 0),
      label: 'New faces',
      color: (stats?.newFacesCount ?? 0) > 0 ? '#60A5FA' : 'var(--color-muted)',
      border: (stats?.newFacesCount ?? 0) > 0 ? 'rgba(96,165,250,0.3)' : 'var(--color-border)',
    },
  ];

  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px',
      marginBottom: '20px',
    }}>
      {tiles.map((t, i) => (
        <div key={i} style={{
          background: 'var(--color-surface)',
          border: `1px solid ${t.border}`,
          borderRadius: '14px', padding: '14px 12px',
        }}>
          <div style={{
            fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '28px',
            color: t.color, lineHeight: 1, marginBottom: '4px',
          }}>
            {t.value}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {t.label}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Slow Day Alert ──────────────────────────────────────────────────────────

function SlowDayAlert({ todayCount, dailyAvg, onNudge }: {
  todayCount: number; dailyAvg: number; onNudge: () => void;
}) {
  const [dismissed, setDismissed] = useState(false);
  const h = new Date().getHours();
  const isQuietTime = h >= 12 && h < 16;
  const isQuiet = todayCount === 0 || (dailyAvg > 0 && todayCount < dailyAvg * 0.5);

  if (!isQuietTime || !isQuiet || dismissed) return null;

  return (
    <div style={{
      background: 'rgba(245,166,35,0.07)', border: '1px solid rgba(245,166,35,0.25)',
      borderRadius: '14px', padding: '14px 16px', marginBottom: '20px',
      display: 'flex', gap: '12px', alignItems: 'flex-start',
    }}>
      <span style={{ fontSize: '20px', flexShrink: 0 }}>🌤</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '14px', color: '#F5A623', marginBottom: '4px' }}>
          It's quiet right now
        </div>
        <p style={{ fontSize: '13px', color: 'var(--color-muted)', lineHeight: 1.5, margin: 0 }}>
          Only {todayCount} check-in{todayCount !== 1 ? 's' : ''} today.
          {' '}Some of your regulars haven't visited in over 2 weeks.{' '}
          <button onClick={onNudge} style={{ background: 'none', border: 'none', color: '#F5A623', fontSize: '13px', fontWeight: 700, cursor: 'pointer', padding: 0 }}>
            Send them a nudge →
          </button>
        </p>
      </div>
      <button
        onClick={() => setDismissed(true)}
        style={{ background: 'none', border: 'none', color: 'var(--color-muted)', fontSize: '18px', cursor: 'pointer', flexShrink: 0, padding: 0, lineHeight: 1 }}
      >
        ×
      </button>
    </div>
  );
}

// ─── Weekly Rhythm Chart ──────────────────────────────────────────────────────

function WeeklyRhythmChart({ bars }: { bars: WeeklyBar[] }) {
  const maxAvg = Math.max(...bars.map(b => b.avg), 1);
  const chartH = 90;
  const barW = 28;
  const totalW = 280;
  const gap = (totalW - bars.length * barW) / (bars.length + 1);

  const maxIdx = bars.reduce((best, b, i) => b.avg > bars[best].avg ? i : best, 0);
  const nonZero = bars.filter(b => b.avg > 0);
  const minVal = nonZero.length > 0 ? Math.min(...nonZero.map(b => b.avg)) : 0;
  const minIdx = bars.findIndex(b => b.avg === minVal && nonZero.length > 0);

  return (
    <div>
      <svg width="100%" viewBox={`0 0 ${totalW} ${chartH + 22}`} style={{ display: 'block', overflow: 'visible' }}>
        {bars.map((bar, i) => {
          const barH = bar.avg > 0 ? Math.max((bar.avg / maxAvg) * chartH, 4) : 2;
          const x = gap + i * (barW + gap);
          const y = chartH - barH;
          const isMax = i === maxIdx && bar.avg > 0;
          const isMin = i === minIdx && bar.avg > 0 && nonZero.length > 1 && minIdx !== maxIdx;
          const fill = isMax ? '#39D98A' : isMin ? '#F5A623' : 'rgba(255,255,255,0.1)';

          return (
            <g key={bar.day}>
              <rect x={x} y={y} width={barW} height={barH} rx={5} fill={fill} />
              {bar.avg > 0 && (
                <text
                  x={x + barW / 2} y={y - 5}
                  textAnchor="middle" fontSize="9"
                  fill={isMax ? '#39D98A' : 'rgba(255,255,255,0.4)'}
                  fontFamily="DM Sans, sans-serif"
                >
                  {bar.avg}
                </text>
              )}
              <text
                x={x + barW / 2} y={chartH + 15}
                textAnchor="middle" fontSize="10"
                fill={isMax ? '#39D98A' : 'rgba(255,255,255,0.4)'}
                fontFamily="DM Sans, sans-serif"
                fontWeight={isMax ? '700' : '400'}
              >
                {bar.day}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ─── Tab: Home ────────────────────────────────────────────────────────────────

function HomeTab({ checkIns, venueId, venueSlug, venueCreatedAt, venueDescription, checkinCount,
  stats, weeklyBars, onNudge }: {
  checkIns: DashboardCheckIn[];
  venueId: string; venueSlug: string; venueCreatedAt: string;
  venueDescription: string; checkinCount: number;
  stats: StudioStats | null; weeklyBars: WeeklyBar[];
  onNudge: () => void;
}) {
  const [postText, setPostText] = useState('');
  const [posting, setPosting] = useState(false);
  const [posted, setPosted] = useState(false);
  const [postError, setPostError] = useState('');
  const [postAudience, setPostAudience] = useState<'public' | 'regulars_only'>('public');

  // Story creation
  const [showStorySheet, setShowStorySheet] = useState(false);
  const [storyMediaUrl, setStoryMediaUrl] = useState('');
  const [storyMediaType, setStoryMediaType] = useState<'photo' | 'video'>('photo');
  const [storyCaption, setStoryCaption] = useState('');
  const [storyUploading, setStoryUploading] = useState(false);
  const [storyPosting, setStoryPosting] = useState(false);
  const [storyError, setStoryError] = useState('');
  const [activeStory, setActiveStory] = useState<VenueStory24 | null>(null);
  const [storyViews, setStoryViews] = useState(0);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const storySessionId = useRef(`story_${Date.now().toString(36)}`);

  // Heading there
  const [headingList, setHeadingList] = useState<HeadingThereEntry[]>([]);

  useEffect(() => {
    getActiveVenueStory(venueId).then(s => {
      setActiveStory(s);
      if (s) getStoryViewCount(s.id).then(setStoryViews);
    });
    getHeadingThereList(venueId).then(setHeadingList);

    // Realtime: heading_there changes
    const ch = supabase.channel(`heading-${venueId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'heading_there', filter: `venue_id=eq.${venueId}` }, () => {
        getHeadingThereList(venueId).then(setHeadingList);
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [venueId]);

  async function handlePost() {
    if (!postText.trim()) return;
    setPosting(true); setPostError('');
    const { error } = await createPost({ venue_id: venueId, content: postText.trim(), audience: postAudience });
    setPosting(false);
    if (error) { setPostError('Could not post. Try again.'); return; }
    setPosted(true); setPostText(''); setPostAudience('public');
    setTimeout(() => setPosted(false), 2500);
  }

  async function handleStoryMediaSelect(file: File, type: 'photo' | 'video') {
    if (type === 'video' && file.size > 50 * 1024 * 1024) {
      setStoryError('Video must be under 50MB');
      return;
    }
    if (type === 'photo' && file.size > 10 * 1024 * 1024) {
      setStoryError('Photo must be under 10MB');
      return;
    }
    setStoryError(''); setStoryUploading(true);
    try {
      const ext = file.name.split('.').pop() ?? (type === 'photo' ? 'jpg' : 'mp4');
      const path = `stories/${venueId}/${storySessionId.current}.${ext}`;
      const url = await uploadVenueFile(path, file);
      setStoryMediaUrl(url); setStoryMediaType(type);
    } catch (e) { setStoryError('Upload failed. Try again.'); }
    setStoryUploading(false);
  }

  async function handlePostStory() {
    if (!storyMediaUrl) return;
    setStoryPosting(true);
    const { error, story } = await createVenueStory24({
      venue_id: venueId, media_url: storyMediaUrl,
      media_type: storyMediaType, caption: storyCaption.trim() || undefined,
    });
    setStoryPosting(false);
    if (error) { setStoryError(error); return; }
    setActiveStory(story); setStoryViews(0);
    setShowStorySheet(false); setStoryMediaUrl(''); setStoryCaption(''); setStoryError('');
  }

  async function handleDeleteStory() {
    if (!activeStory) return;
    await deleteVenueStory24(activeStory.id);
    setActiveStory(null); setStoryViews(0);
  }

  function hoursLeft(expiresAt: string): number {
    return Math.max(0, Math.round((new Date(expiresAt).getTime() - Date.now()) / 3600000));
  }

  const todayCheckIns = checkIns.filter(ci => isToday(ci.createdAt));
  const insight = getWeeklyInsight(weeklyBars);

  return (
    <div>
      <style>{`@keyframes progScan2 { 0% { left: -45%; } 100% { left: 100%; } }`}</style>

      {/* Story creation sheet */}
      {showStorySheet && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'flex-end' }} onClick={() => setShowStorySheet(false)}>
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', background: 'var(--color-surface)', borderRadius: '20px 20px 0 0', padding: '20px 16px 40px', maxHeight: '80vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '16px', color: 'var(--color-text)' }}>Share today's story</h2>
              <button onClick={() => setShowStorySheet(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}><XIcon size={18} color="var(--color-muted)" /></button>
            </div>

            {/* Media picker */}
            {!storyMediaUrl ? (
              <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
                <input ref={photoInputRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) handleStoryMediaSelect(f, 'photo'); }} />
                <input ref={videoInputRef} type="file" accept="video/*" capture="environment" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) handleStoryMediaSelect(f, 'video'); }} />
                <button onClick={() => photoInputRef.current?.click()} style={{ flex: 1, padding: '20px 8px', borderRadius: '14px', background: 'var(--color-bg)', border: '1px solid var(--color-border)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                  <Camera size={24} color="#39D98A" />
                  <span style={{ fontSize: '12px', color: 'var(--color-text)', fontFamily: 'DM Sans, sans-serif', fontWeight: 600 }}>Photo</span>
                </button>
                <button onClick={() => videoInputRef.current?.click()} style={{ flex: 1, padding: '20px 8px', borderRadius: '14px', background: 'var(--color-bg)', border: '1px solid var(--color-border)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                  <Video size={24} color="#60A5FA" />
                  <span style={{ fontSize: '12px', color: 'var(--color-text)', fontFamily: 'DM Sans, sans-serif', fontWeight: 600 }}>Short Video</span>
                </button>
              </div>
            ) : (
              <div style={{ marginBottom: '16px', borderRadius: '12px', overflow: 'hidden', position: 'relative' }}>
                {storyMediaType === 'photo'
                  ? <img src={storyMediaUrl} alt="Preview" style={{ width: '100%', maxHeight: '200px', objectFit: 'cover', display: 'block' }} />
                  : <video src={storyMediaUrl} muted autoPlay loop playsInline style={{ width: '100%', maxHeight: '200px', objectFit: 'cover', display: 'block' }} />
                }
                <button onClick={() => { setStoryMediaUrl(''); }} style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '50%', width: '28px', height: '28px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <XIcon size={14} color="#fff" />
                </button>
              </div>
            )}

            {storyUploading && (
              <div style={{ height: '3px', background: 'var(--color-border)', borderRadius: '2px', overflow: 'hidden', marginBottom: '12px', position: 'relative' }}>
                <div style={{ position: 'absolute', height: '100%', width: '45%', background: '#39D98A', borderRadius: '2px', animation: 'progScan2 1.2s ease-in-out infinite' }} />
              </div>
            )}

            {/* Caption */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ position: 'relative' }}>
                <textarea
                  value={storyCaption}
                  onChange={e => setStoryCaption(e.target.value.slice(0, 80))}
                  placeholder="What's happening today? (optional — 80 chars max)"
                  style={{ width: '100%', minHeight: '72px', background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '12px', color: 'var(--color-text)', fontSize: '14px', fontFamily: 'DM Sans, sans-serif', resize: 'none', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                <span style={{ fontSize: '10px', color: 'var(--color-muted)' }}>{storyCaption.length}/80</span>
              </div>
              {/* Quick captions */}
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
                {['Fresh in today 💈', 'Busy right now — short wait', 'Closed today, back tomorrow', 'Special price until 6pm'].map(q => (
                  <button key={q} onClick={() => setStoryCaption(q.slice(0, 80))} style={{ fontSize: '11px', background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: '20px', padding: '4px 10px', color: 'var(--color-muted)', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                    {q}
                  </button>
                ))}
              </div>
            </div>

            {storyError && <p style={{ fontSize: '12px', color: '#F87171', marginBottom: '10px' }}>{storyError}</p>}

            <button
              onClick={handlePostStory}
              disabled={!storyMediaUrl || storyPosting || storyUploading}
              style={{ width: '100%', minHeight: '52px', background: !storyMediaUrl || storyPosting ? 'rgba(57,217,138,0.4)' : '#39D98A', color: '#000', border: 'none', borderRadius: '14px', fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '15px', cursor: !storyMediaUrl ? 'default' : 'pointer' }}
            >
              {storyPosting ? 'Posting…' : 'Post Story — live for 24 hours'}
            </button>
          </div>
        </div>
      )}

      <SlowDayAlert
        todayCount={stats?.todayCount ?? 0}
        dailyAvg={stats?.dailyAvg ?? 0}
        onNudge={onNudge}
      />

      {/* Story CTA or Active Story */}
      {activeStory ? (
        <div style={{ marginBottom: '20px', background: 'rgba(34,197,94,0.07)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: '14px', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '22px' }}>📸</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '13px', color: '#22c55e', marginBottom: '2px' }}>
              Story active — {hoursLeft(activeStory.expiresAt)}h remaining
            </div>
            <div style={{ fontSize: '12px', color: 'var(--color-muted)' }}>{storyViews} view{storyViews !== 1 ? 's' : ''}</div>
          </div>
          <button onClick={handleDeleteStory} style={{ background: 'none', border: '1px solid rgba(248,113,113,0.3)', borderRadius: '8px', padding: '6px 10px', color: '#F87171', fontSize: '11px', fontWeight: 700, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', flexShrink: 0 }}>
            Delete
          </button>
        </div>
      ) : (
        <button
          onClick={() => setShowStorySheet(true)}
          style={{ width: '100%', marginBottom: '20px', padding: '16px', background: 'transparent', border: '1.5px solid rgba(57,217,138,0.35)', borderRadius: '14px', color: '#39D98A', fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
        >
          <Camera size={16} />
          📸 Share what's happening today
        </button>
      )}

      <PilotChecklist
        venueId={venueId} venueCreatedAt={venueCreatedAt}
        venueDescription={venueDescription} checkinCount={checkinCount}
      />

      {/* Weekly rhythm */}
      {weeklyBars.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '15px', marginBottom: '12px', color: 'var(--color-text)' }}>
            Weekly rhythm
          </h2>
          <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '14px', padding: '16px 12px 8px' }}>
            <WeeklyRhythmChart bars={weeklyBars} />
            <p style={{ fontSize: '12px', color: 'var(--color-muted)', margin: '10px 4px 4px', lineHeight: 1.5 }}>
              {insight}
            </p>
          </div>
        </div>
      )}

      {/* Heading your way */}
      {headingList.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '15px', marginBottom: '12px', color: 'var(--color-text)' }}>
            Heading your way 🚶
          </h2>
          <div style={{ background: 'var(--color-surface)', border: '1px solid rgba(245,166,35,0.25)', borderRadius: '14px', overflow: 'hidden' }}>
            {headingList.map((entry, i) => {
              const minsAgo = Math.floor((Date.now() - new Date(entry.createdAt).getTime()) / 60000);
              const timeLabel = minsAgo < 1 ? 'just now' : minsAgo < 60 ? `${minsAgo} min ago` : `${Math.floor(minsAgo / 60)} hr ago`;
              const shortId = entry.userId.slice(-4).toUpperCase();
              return (
                <div key={entry.userId + i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', borderBottom: i < headingList.length - 1 ? '1px solid var(--color-border)' : 'none' }}>
                  <Avatar initial={shortId[0]} color="#F5A623" />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text)' }}>Someone is on their way</div>
                    <div style={{ fontSize: '11px', color: 'var(--color-muted)' }}>{timeLabel}</div>
                  </div>
                  <span style={{ fontSize: '10px', fontWeight: 700, color: '#F5A623', background: 'rgba(245,166,35,0.12)', padding: '2px 8px', borderRadius: '10px' }}>Coming</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Who came in today */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '15px', marginBottom: '12px', color: 'var(--color-text)' }}>
          Who came in today
        </h2>
        {todayCheckIns.length === 0 ? (
          <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '14px', padding: '28px', textAlign: 'center' }}>
            <p style={{ fontSize: '13px', color: 'var(--color-muted)' }}>
              Nobody has checked in yet today. Share your QR code to get started.
            </p>
          </div>
        ) : (
          <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '14px', overflow: 'hidden' }}>
            {todayCheckIns.slice(0, 10).map((ci, i) => {
              const color = ci.isGhost ? '#6B7280' : avatarColor(i);
              return (
                <div key={ci.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', borderBottom: i < Math.min(todayCheckIns.length, 10) - 1 ? '1px solid var(--color-border)' : 'none' }}>
                  <Avatar initial={ci.isGhost ? '?' : ci.visitorName[0]} color={color} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: ci.isGhost ? 'var(--color-muted)' : 'var(--color-text)' }}>
                      {ci.isGhost ? 'Anonymous' : ci.visitorName.split(' ')[0]}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--color-muted)' }}>{timeAgo(ci.createdAt)}</div>
                  </div>
                  {ci.isGhost
                    ? <Pill label="Anonymous · counted" color="#9CA3AF" bg="rgba(107,114,128,0.12)" />
                    : ci.isFirstVisit
                    ? <Pill label="First visit" color="#F5A623" bg="rgba(245,166,35,0.12)" />
                    : <Pill label={`${ci.visitNumber} visits`} color="#39D98A" bg="rgba(57,217,138,0.1)" />}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '15px', marginBottom: '12px', color: 'var(--color-text)' }}>
          Quick actions
        </h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Link to={`/venue/${venueSlug}`} style={{ textDecoration: 'none', flex: 1 }}>
            <button style={{ width: '100%', padding: '12px 8px', borderRadius: '12px', background: 'rgba(57,217,138,0.08)', border: '1px solid rgba(57,217,138,0.25)', color: 'var(--color-accent)', fontSize: '13px', fontWeight: 600, fontFamily: 'DM Sans, sans-serif', cursor: 'pointer', minHeight: '48px' }}>
              View page
            </button>
          </Link>
          <Link to={`/venue/${venueSlug}/checkin`} style={{ textDecoration: 'none', flex: 1 }}>
            <button style={{ width: '100%', padding: '12px 8px', borderRadius: '12px', background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text)', fontSize: '13px', fontWeight: 600, fontFamily: 'DM Sans, sans-serif', cursor: 'pointer', minHeight: '48px' }}>
              Test check-in
            </button>
          </Link>
        </div>
      </div>

      {/* Post box */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '15px', marginBottom: '12px', color: 'var(--color-text)' }}>Post an update</h2>
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '14px', padding: '14px' }}>
          <textarea
            value={postText} onChange={e => setPostText(e.target.value)}
            placeholder="What's happening today at your place..." maxLength={200}
            style={{ width: '100%', minHeight: '80px', background: 'transparent', border: 'none', outline: 'none', color: 'var(--color-text)', fontSize: '14px', fontFamily: 'DM Sans, sans-serif', resize: 'none', lineHeight: 1.5, boxSizing: 'border-box' }}
          />
          {/* Audience selector */}
          <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid var(--color-border)' }}>
            <div style={{ fontSize: '11px', color: 'var(--color-muted)', marginBottom: '6px', fontFamily: 'DM Sans, sans-serif' }}>Who can see this post?</div>
            <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
              {(['public', 'regulars_only'] as const).map(a => (
                <button key={a} onClick={() => setPostAudience(a)} style={{ flex: 1, padding: '7px 4px', borderRadius: '10px', background: postAudience === a ? 'var(--color-accent)' : 'var(--color-bg)', border: postAudience === a ? 'none' : '1px solid var(--color-border)', color: postAudience === a ? '#000' : 'var(--color-muted)', fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: '12px', cursor: 'pointer' }}>
                  {a === 'public' ? '🌍 Everyone' : '🔒 Regulars only'}
                </button>
              ))}
            </div>
            {postAudience === 'regulars_only' && (
              <p style={{ fontSize: '11px', color: '#F5A623', margin: '0 0 8px', lineHeight: 1.4 }}>
                Only people who have visited 3+ times will see this post.
              </p>
            )}
          </div>
          {postError && <p style={{ fontSize: '12px', color: '#F87171', marginBottom: '8px' }}>{postError}</p>}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px', borderTop: '1px solid var(--color-border)' }}>
            <span style={{ fontSize: '11px', color: 'var(--color-muted)' }}>{postText.length}/200</span>
            <button onClick={handlePost} disabled={posting} style={{ background: posted ? 'rgba(57,217,138,0.2)' : 'var(--color-accent)', color: posted ? 'var(--color-accent)' : '#000', border: 'none', borderRadius: '10px', padding: '8px 20px', fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '13px', cursor: posting ? 'default' : 'pointer', transition: 'all 0.2s' }}>
              {posted ? 'Posted ✓' : posting ? 'Posting…' : 'Post'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Tab: Regulars (Studio) ───────────────────────────────────────────────────

type RegularFilter = 'all' | 'loyal' | 'lapsed' | 'new';

const BADGE_ICON: Record<string, string> = { newcomer: '🌱', regular: '⭐', loyal: '🔥', legend: '👑' };
const BADGE_COLOR: Record<string, string> = { newcomer: '#34D399', regular: '#F5A623', loyal: '#F97316', legend: '#A855F7' };

function StudioRegularsTab({ regulars, loading, venueName, lapsedCount }: {
  regulars: StudioRegular[]; loading: boolean; venueName: string; lapsedCount: number;
}) {
  const [filter, setFilter] = useState<RegularFilter>('all');
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    let list = regulars;
    if (filter === 'loyal')  list = list.filter(r => r.isLoyal);
    if (filter === 'lapsed') list = list.filter(r => r.isLapsed);
    if (filter === 'new')    list = list.filter(r => r.isNew);
    if (query) list = list.filter(r => r.name.toLowerCase().includes(query.toLowerCase()));
    return list;
  }, [regulars, filter, query]);

  const FILTERS: { key: RegularFilter; label: string }[] = [
    { key: 'all',    label: `All (${regulars.length})` },
    { key: 'loyal',  label: `Loyal+ (${regulars.filter(r => r.isLoyal).length})` },
    { key: 'lapsed', label: `Lapsed (${regulars.filter(r => r.isLapsed).length})` },
    { key: 'new',    label: `New (${regulars.filter(r => r.isNew).length})` },
  ];

  function nudgeMessage(name?: string) {
    const n = name ?? 'a regular';
    return encodeURIComponent(`Hey ${n}! 👋 Haven't seen you at ${venueName} in a while. We'd love to have you back — come check in and see what's new 🙌 ${window.location.origin}/venue/`);
  }

  return (
    <div>
      {/* Lapsed banner */}
      {lapsedCount > 0 && (
        <div style={{ background: 'rgba(245,166,35,0.07)', border: '1px solid rgba(245,166,35,0.2)', borderRadius: '14px', padding: '14px 16px', marginBottom: '16px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
          <span style={{ fontSize: '18px' }}>⏰</span>
          <div>
            <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '14px', color: '#F5A623', marginBottom: '4px' }}>
              {lapsedCount} regular{lapsedCount !== 1 ? 's' : ''} haven't visited in 14+ days
            </div>
            <p style={{ fontSize: '12px', color: 'var(--color-muted)', margin: 0, lineHeight: 1.5 }}>
              A personal nudge brings back 1 in 3. Tap the WhatsApp button next to their name.
            </p>
          </div>
        </div>
      )}

      {/* Filter chips */}
      <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', scrollbarWidth: 'none', marginBottom: '14px', paddingBottom: '2px' } as React.CSSProperties}>
        {FILTERS.map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)} style={{
            flexShrink: 0, padding: '6px 14px', borderRadius: '20px',
            background: filter === f.key ? 'var(--color-accent)' : 'var(--color-surface)',
            border: `1px solid ${filter === f.key ? 'var(--color-accent)' : 'var(--color-border)'}`,
            color: filter === f.key ? '#000' : 'var(--color-muted)',
            fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: '12px',
            cursor: 'pointer', whiteSpace: 'nowrap',
          }}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: '14px' }}>
        <Search size={14} color="var(--color-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
        <input
          type="text" value={query} onChange={e => setQuery(e.target.value)}
          placeholder="Search regulars..."
          style={{ width: '100%', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '11px 12px 11px 34px', color: 'var(--color-text)', fontSize: '14px', fontFamily: 'DM Sans, sans-serif', outline: 'none', boxSizing: 'border-box' }}
        />
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '32px', color: 'var(--color-muted)', fontSize: '13px' }}>Loading regulars…</div>
      ) : regulars.length === 0 ? (
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '14px', padding: '32px', textAlign: 'center' }}>
          <p style={{ fontSize: '13px', color: 'var(--color-muted)' }}>No check-ins yet. Regulars appear once people start checking in.</p>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '14px', padding: '32px', textAlign: 'center', color: 'var(--color-muted)', fontSize: '14px' }}>No regulars match this filter</div>
      ) : (
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '14px', overflow: 'hidden' }}>
          {filtered.map((r, i) => {
            const daysAgo = r.lastVisit ? Math.floor((Date.now() - new Date(r.lastVisit).getTime()) / 86400000) : null;
            const lastLabel = daysAgo === 0 ? 'Today' : daysAgo === 1 ? 'Yesterday' : daysAgo != null ? `${daysAgo}d ago` : '';
            const bc = BADGE_COLOR[r.badgeTier] ?? '#39D98A';
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px', borderBottom: i < filtered.length - 1 ? '1px solid var(--color-border)' : 'none' }}>
                <Avatar initial={r.name[0]?.toUpperCase() ?? '?'} color={avatarColor(i)} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text)', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.name}
                  </div>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '10px', fontWeight: 700, color: bc, background: `${bc}15`, padding: '1px 6px', borderRadius: '10px' }}>
                      {BADGE_ICON[r.badgeTier]} {r.badgeTier}
                    </span>
                    <span style={{ fontSize: '10px', color: 'var(--color-muted)' }}>{r.visitCount}v{r.streakDays > 1 ? ` · 🔥${r.streakDays}d` : ''}</span>
                    {lastLabel && <span style={{ fontSize: '10px', color: r.isLapsed ? '#F5A623' : 'var(--color-muted)' }}>{r.isLapsed ? '⏰ ' : ''}{lastLabel}</span>}
                  </div>
                </div>
                {/* Nudge button */}
                <a
                  href={`https://wa.me/?text=${nudgeMessage(r.name.split(' ')[0])}`}
                  target="_blank" rel="noopener noreferrer"
                  style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(37,211,102,0.1)', border: '1px solid rgba(37,211,102,0.25)', borderRadius: '8px', padding: '6px 10px', color: '#25D366', fontSize: '11px', fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap' }}
                >
                  <Share2 size={10} />
                  Nudge
                </a>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Tab: Events ──────────────────────────────────────────────────────────────

function EventsTab({ events, venueId, onEventAdded }: {
  events: Event[]; venueId: string; onEventAdded: (e: Event) => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [price, setPrice] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [rsvpCounts, setRsvpCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    if (events.length === 0) return;
    getEventRsvpCountsBatch(events.map(e => e.id)).then(setRsvpCounts);
  }, [events]);

  async function handleAdd() {
    if (!title.trim() || !date || !time) { setFormError('Fill in title, date, and time'); return; }
    setSaving(true); setFormError('');
    const datetime = new Date(`${date}T${time}`).toISOString();
    const priceNum = parseInt(price) || 0;
    const { error } = await createEvent({ venue_id: venueId, title: title.trim(), event_date: datetime, price: priceNum });
    setSaving(false);
    if (error) { setFormError('Could not save event. Run migration 002 first.'); return; }
    setTitle(''); setDate(''); setTime(''); setPrice(''); setShowForm(false);
    onEventAdded({ id: `tmp-${Date.now()}`, venueId, title: title.trim(), description: '', startsAt: datetime, isFree: priceNum === 0, price: priceNum > 0 ? priceNum : undefined, createdAt: new Date().toISOString() });
  }

  const inputSt: React.CSSProperties = { width: '100%', background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: '10px', padding: '10px 12px', color: 'var(--color-text)', fontSize: '14px', fontFamily: 'DM Sans, sans-serif', outline: 'none', boxSizing: 'border-box', minHeight: '44px' };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '15px' }}>Upcoming events</h2>
        {events.length > 0 && <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-accent)', background: 'rgba(57,217,138,0.1)', padding: '2px 8px', borderRadius: '20px' }}>{events.length} on</span>}
      </div>
      {events.length === 0 && !showForm && (
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '14px', padding: '32px', textAlign: 'center', marginBottom: '12px' }}>
          <div style={{ fontSize: '32px', marginBottom: '10px' }}>📅</div>
          <p style={{ fontSize: '14px', color: 'var(--color-muted)', lineHeight: 1.5 }}>Nothing on the calendar yet.</p>
        </div>
      )}
      {events.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
          {events.map(event => (
            <div key={event.id} style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '14px', padding: '14px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <div style={{ flexShrink: 0, width: '48px', background: 'var(--color-surface2)', borderRadius: '10px', padding: '6px 4px', textAlign: 'center', border: '1px solid var(--color-border)' }}>
                <div style={{ fontSize: '10px', color: 'var(--color-accent)', fontWeight: 700, textTransform: 'uppercase' }}>{new Date(event.startsAt).toLocaleDateString('en-ZA', { month: 'short' })}</div>
                <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '18px', lineHeight: 1 }}>{new Date(event.startsAt).getDate()}</div>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '14px', marginBottom: '3px' }}>{event.title}</div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '12px', color: 'var(--color-muted)' }}>{new Date(event.startsAt).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })}</span>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: event.isFree ? '#39D98A' : '#F5A623' }}>{event.isFree ? 'Free' : `R${event.price}`}</span>
                  {(rsvpCounts[event.id] ?? 0) > 0 && (
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#F5A623', background: 'rgba(245,166,35,0.1)', padding: '1px 8px', borderRadius: '20px' }}>
                      👋 {rsvpCounts[event.id]} interested
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {showForm && (
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '14px', padding: '16px', marginBottom: '12px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Event title" style={inputSt} />
            <div style={{ display: 'flex', gap: '8px' }}>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ ...inputSt, flex: 1 }} />
              <input type="time" value={time} onChange={e => setTime(e.target.value)} style={{ ...inputSt, flex: 1 }} />
            </div>
            <input type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="Price in ZAR (leave blank for free)" style={inputSt} />
            {formError && <p style={{ fontSize: '12px', color: '#F87171' }}>{formError}</p>}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => { setShowForm(false); setFormError(''); }} style={{ flex: 1, minHeight: '44px', background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: '10px', color: 'var(--color-muted)', fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleAdd} disabled={saving} style={{ flex: 2, minHeight: '44px', background: saving ? 'rgba(57,217,138,0.6)' : 'var(--color-accent)', border: 'none', borderRadius: '10px', color: '#000', fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '13px', cursor: saving ? 'default' : 'pointer' }}>{saving ? 'Saving…' : 'Save event'}</button>
            </div>
          </div>
        </div>
      )}
      {!showForm && (
        <button onClick={() => setShowForm(true)} style={{ width: '100%', minHeight: '52px', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '14px', color: 'var(--color-accent)', fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
          <Plus size={16} /> Add event
        </button>
      )}
    </div>
  );
}

// ─── Tab: Setup (QR) ─────────────────────────────────────────────────────────

function SetupTab({ venue }: { venue: Venue }) {
  const qrRef = useRef<HTMLDivElement>(null);
  const qrUrl = `https://kayaa.co.za/checkin/${venue.id}`;

  function downloadQR() {
    const sourceCanvas = qrRef.current?.querySelector('canvas') as HTMLCanvasElement | null;
    if (!sourceCanvas) return;
    const size = 512;
    const out = document.createElement('canvas');
    out.width = size; out.height = size;
    const ctx = out.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);
    ctx.drawImage(sourceCanvas, 0, 0, size, size);
    const a = document.createElement('a');
    a.href = out.toDataURL('image/png');
    a.download = `kayaa-qr-${venue.slug}.png`;
    a.click();
  }

  function printCard() {
    const win = window.open('', '_blank');
    if (!win) return;
    const canvas = qrRef.current?.querySelector('canvas') as HTMLCanvasElement | null;
    const dataUrl = canvas ? canvas.toDataURL('image/png') : '';
    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Kayaa Check-In Card — ${venue.name}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans&display=swap');
          body { margin: 0; background: #fff; display: flex; align-items: center; justify-content: center; min-height: 100vh; font-family: 'DM Sans', sans-serif; }
          .card { width: 148mm; min-height: 105mm; border: 2px solid #39D98A; border-radius: 16px; padding: 24px; display: flex; flex-direction: column; align-items: center; gap: 12px; text-align: center; }
          h1 { font-family: 'Syne', sans-serif; font-weight: 800; font-size: 22px; margin: 0; color: #0D1117; }
          p { font-size: 13px; color: #555; margin: 0; line-height: 1.5; }
          img { width: 200px; height: 200px; }
          .url { font-size: 11px; color: #888; margin-top: 4px; }
          .badge { background: #39D98A; color: #000; font-weight: 700; font-size: 12px; padding: 4px 14px; border-radius: 20px; font-family: 'Syne', sans-serif; }
          @media print { body { margin: 0; } }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="badge">Check in here</div>
          <h1>${venue.name}</h1>
          <p>${venue.neighborhood}, ${venue.city}</p>
          ${dataUrl ? `<img src="${dataUrl}" alt="QR Code" />` : ''}
          <p>Scan to check in and earn your regular badge on Kayaa</p>
          <div class="url">kayaa.co.za/checkin/${venue.id.slice(0, 8)}…</div>
        </div>
        <script>window.onload = () => window.print();<\/script>
      </body>
      </html>
    `);
    win.document.close();
  }

  return (
    <div>
      <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '15px', marginBottom: '4px', color: 'var(--color-text)' }}>Your check-in QR code</h2>
      <p style={{ fontSize: '13px', color: 'var(--color-muted)', marginBottom: '24px', lineHeight: 1.5 }}>
        Print this and place it at your counter. Customers scan to check in instantly — no app needed.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', marginBottom: '28px' }}>
        <div ref={qrRef} style={{ background: '#fff', padding: '18px', borderRadius: '16px', boxShadow: '0 4px 24px rgba(0,0,0,0.4)' }}>
          <QRCodeCanvas value={qrUrl} size={240} level="M" marginSize={0} />
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '16px', color: 'var(--color-text)', marginBottom: '4px' }}>{venue.name}</div>
          <div style={{ fontSize: '12px', color: 'var(--color-muted)' }}>kayaa.co.za/checkin/{venue.id.slice(0, 8)}…</div>
        </div>
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <button
          onClick={downloadQR}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%', padding: '16px', background: 'var(--color-accent)', border: 'none', borderRadius: '14px', color: '#000', fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '15px', cursor: 'pointer' }}
        >
          <Download size={16} />
          Download QR as PNG
        </button>
        <button
          onClick={printCard}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%', padding: '16px', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '14px', color: 'var(--color-text)', fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '15px', cursor: 'pointer' }}
        >
          <Printer size={16} />
          Print Check-In Card
        </button>
      </div>

      <div style={{ marginTop: '24px', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '14px', padding: '16px' }}>
        <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '13px', marginBottom: '10px', color: 'var(--color-text)' }}>Placement tips</div>
        {[
          'Stick it at eye level at the counter or entrance',
          "Print at least A5 size so it's easy to scan",
          'Works with any smartphone camera — no app needed',
          'The URL never changes — print once, keep forever',
        ].map((tip, i) => (
          <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
            <span style={{ color: '#39D98A', fontSize: '12px', flexShrink: 0, marginTop: '1px' }}>✓</span>
            <span style={{ fontSize: '12px', color: 'var(--color-muted)', lineHeight: 1.5 }}>{tip}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Tab: Report ──────────────────────────────────────────────────────────────

function ReportTab({ venue, reportData, loading }: {
  venue: Venue; reportData: CommunityReportData | null; loading: boolean;
}) {
  function printReport() {
    window.print();
  }

  const shareText = reportData
    ? encodeURIComponent(
        `📊 ${venue.name} — ${reportData.month} report\n\n` +
        `✅ ${reportData.totalCheckins} verified check-ins\n` +
        `👥 ${reportData.uniqueVisitors} unique regulars\n` +
        `🔥 ${reportData.loyalCount} loyal customers (10+ visits)\n` +
        `🆕 ${reportData.newFaces} new faces this month\n` +
        `📅 Busiest day: ${reportData.busiestDay}\n\n` +
        `Built on @KayaaApp — your neighbourhood community 🏘`
      )
    : '';

  const stats = reportData ? [
    { icon: '✅', label: 'Verified check-ins', value: String(reportData.totalCheckins), color: '#39D98A' },
    { icon: '👥', label: 'Unique regulars', value: String(reportData.uniqueVisitors), color: '#60A5FA' },
    { icon: '🔥', label: 'Loyal customers (10+ visits)', value: String(reportData.loyalCount), color: '#F97316' },
    { icon: '🆕', label: 'New faces this month', value: String(reportData.newFaces), color: '#A78BFA' },
    { icon: '📅', label: 'Busiest day', value: reportData.busiestDay, color: '#F5A623' },
    { icon: '📈', label: 'Avg visits per regular', value: `${reportData.avgFrequency}×`, color: '#34D399' },
  ] : [];

  return (
    <div>
      <style>{`@media print { .no-print { display: none !important; } .print-card { background: #fff !important; color: #000 !important; border: 1px solid #ddd !important; } .print-stat { border: 1px solid #ddd !important; } }`}</style>

      <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '15px', marginBottom: '4px', color: 'var(--color-text)' }}>
        Community Proof Report
      </h2>
      <p style={{ fontSize: '13px', color: 'var(--color-muted)', marginBottom: '20px', lineHeight: 1.5 }}>
        Your verified {reportData?.month ?? 'monthly'} summary. Share it to show social proof.
      </p>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--color-muted)', fontSize: '13px' }}>Building your report…</div>
      ) : (
        <>
          {/* Report card */}
          <div className="print-card" style={{ background: 'var(--color-surface)', border: '1px solid rgba(57,217,138,0.2)', borderRadius: '16px', padding: '20px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <div>
                <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '17px', color: 'var(--color-text)' }}>{venue.name}</div>
                <div style={{ fontSize: '12px', color: 'var(--color-muted)' }}>{reportData?.month ?? '—'} · Community report</div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {stats.map((s, i) => (
                <div key={i} className="print-stat" style={{ background: 'var(--color-bg)', borderRadius: '12px', padding: '12px' }}>
                  <div style={{ fontSize: '20px', marginBottom: '4px' }}>{s.icon}</div>
                  <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '22px', color: s.color, lineHeight: 1, marginBottom: '4px' }}>{s.value}</div>
                  <div style={{ fontSize: '11px', color: 'var(--color-muted)', lineHeight: 1.3 }}>{s.label}</div>
                </div>
              ))}
            </div>
            {(reportData?.totalCheckins ?? 0) === 0 && (
              <div style={{ textAlign: 'center', padding: '20px', color: 'var(--color-muted)', fontSize: '13px' }}>
                No check-ins recorded this month yet.
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="no-print" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <a
              href={`https://wa.me/?text=${shareText}`}
              target="_blank" rel="noopener noreferrer"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%', padding: '16px', background: '#25D366', border: 'none', borderRadius: '14px', color: '#fff', fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '15px', cursor: 'pointer', textDecoration: 'none', boxSizing: 'border-box' }}
            >
              <Share2 size={16} />
              Share via WhatsApp
            </a>
            <button
              onClick={printReport}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%', padding: '16px', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '14px', color: 'var(--color-text)', fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '15px', cursor: 'pointer' }}
            >
              <Printer size={16} />
              Download as PDF
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Tab: Settings ────────────────────────────────────────────────────────────

function SettingsTab({ venue, venueId }: { venue: Venue; venueId: string }) {
  const [publicPage, setPublicPage]       = useState(true);
  const [showRegulars, setShowRegulars]   = useState(true);
  const [quietCheckins, setQuietCheckins] = useState(true);
  const [notifyContact, setNotifyContact] = useState(() => localStorage.getItem('kayaa_notify_contact') ?? '');
  const [notifySaved, setNotifySaved] = useState(false);

  function saveNotify() {
    if (!notifyContact.trim()) return;
    localStorage.setItem('kayaa_notify_contact', notifyContact.trim());
    setNotifySaved(true);
    setTimeout(() => setNotifySaved(false), 2500);
  }

  async function handleToggle(key: 'is_public' | 'show_regulars_publicly' | 'allow_quiet_checkins', val: boolean) {
    await updateVenueSettings(venueId, { [key]: val });
  }

  return (
    <div>
      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '14px', padding: '16px', marginBottom: '16px' }}>
        <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '16px', marginBottom: '8px' }}>{venue.name}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
          <MapPin size={12} color="var(--color-muted)" />
          <span style={{ fontSize: '13px', color: 'var(--color-muted)' }}>{venue.address ? `${venue.address} · ` : ''}{venue.neighborhood}, {venue.city}</span>
        </div>
        {venue.openHours && <div style={{ fontSize: '12px', color: 'var(--color-muted)' }}>{venue.openHours}</div>}
      </div>

      {/* Plan tiers */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '14px', color: 'var(--color-text)', marginBottom: '10px' }}>Your plan</div>
        <div style={{ background: 'rgba(57,217,138,0.05)', border: '1px solid rgba(57,217,138,0.2)', borderRadius: '14px', padding: '14px 16px', marginBottom: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
            <div>
              <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '15px', color: 'var(--color-accent)', marginBottom: '2px' }}>Kayaa Free</div>
              <div style={{ fontSize: '12px', color: 'var(--color-muted)' }}>Free forever</div>
            </div>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#39D98A', background: 'rgba(57,217,138,0.12)', padding: '4px 10px', borderRadius: '20px' }}>Active</span>
          </div>
          {['Community page', 'QR check-in', 'Regulars list', 'Board & Jobs'].map(f => (
            <div key={f} style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '4px' }}>
              <span style={{ color: '#39D98A', fontSize: '12px' }}>✓</span>
              <span style={{ fontSize: '12px', color: 'var(--color-muted)' }}>{f}</span>
            </div>
          ))}
        </div>
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '14px', padding: '14px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
            <div>
              <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '15px', color: 'var(--color-text)', marginBottom: '2px' }}>Kayaa Pro</div>
              <div style={{ fontSize: '12px', color: 'var(--color-muted)' }}>R99–199/mo · Coming soon</div>
            </div>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#F5A623', background: 'rgba(245,166,35,0.12)', padding: '4px 10px', borderRadius: '20px' }}>Soon</span>
          </div>
          {['Everything in Free', 'Analytics dashboard', 'Promoted listing', 'Custom QR design', 'Priority support'].map(f => (
            <div key={f} style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '4px' }}>
              <span style={{ color: '#F5A623', fontSize: '12px' }}>✓</span>
              <span style={{ fontSize: '12px', color: 'var(--color-muted)' }}>{f}</span>
            </div>
          ))}
          <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
            <input type="text" value={notifyContact} onChange={e => setNotifyContact(e.target.value)} placeholder="Phone or email" style={{ flex: 1, background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '8px 10px', color: 'var(--color-text)', fontSize: '13px', fontFamily: 'DM Sans, sans-serif', outline: 'none' }} />
            <button onClick={saveNotify} style={{ background: notifySaved ? 'rgba(245,166,35,0.2)' : 'rgba(245,166,35,0.12)', border: '1px solid rgba(245,166,35,0.3)', borderRadius: '8px', padding: '8px 14px', color: '#F5A623', fontSize: '12px', fontWeight: 700, fontFamily: 'Syne, sans-serif', cursor: 'pointer', whiteSpace: 'nowrap' }}>
              {notifySaved ? 'Saved ✓' : 'Notify me'}
            </button>
          </div>
        </div>
      </div>

      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '14px', padding: '0 16px', marginBottom: '16px' }}>
        <ToggleRow label="Public place page" sub="Anyone with the link can see your page" checked={publicPage} onChange={v => { setPublicPage(v); handleToggle('is_public', v); }} />
        <ToggleRow label="Show regulars count publicly" sub="Visitors can see how many regulars you have" checked={showRegulars} onChange={v => { setShowRegulars(v); handleToggle('show_regulars_publicly', v); }} />
        <ToggleRow label="Allow quiet check-ins" sub="Regulars can check in anonymously" checked={quietCheckins} onChange={v => { setQuietCheckins(v); handleToggle('allow_quiet_checkins', v); }} />
      </div>

      <Link to={`/venue/${venue.slug}`} style={{ textDecoration: 'none' }}>
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '14px', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text)' }}>View your public page</span>
          <ExternalLink size={15} color="var(--color-accent)" />
        </div>
      </Link>
    </div>
  );
}

// ─── Check-in history section ─────────────────────────────────────────────────

const HIST_BADGE_ICON: Record<string, string> = { newcomer: '🌱', regular: '⭐', loyal: '🔥', legend: '👑' };
const HIST_CAT_EMOJI: Record<string, string> = {
  Barbershop: '✂️', Shisanyama: '🔥', Tavern: '🍺', Café: '☕',
  Church: '⛪', Carwash: '🚗', 'Spaza Shop': '🏪', Salon: '💅',
  Tutoring: '📚', 'Sports Ground': '⚽', 'Home Business': '🏠',
};

function CheckInHistorySection() {
  const history = getUserCheckInHistoryLocal(getVisitorId());
  if (history.length === 0) return (
    <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '14px', padding: '24px 16px', textAlign: 'center', marginBottom: '16px' }}>
      <div style={{ fontSize: '32px', marginBottom: '8px' }}>🏪</div>
      <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text)', marginBottom: '4px', fontFamily: 'Syne, sans-serif' }}>No check-ins yet</p>
      <p style={{ fontSize: '13px', color: 'var(--color-muted)', lineHeight: 1.5 }}>Find a place nearby and tap <strong>Check In</strong>.</p>
    </div>
  );

  return (
    <div style={{ marginBottom: '16px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {history.map(item => {
          const daysAgo = item.lastVisit ? Math.floor((Date.now() - new Date(item.lastVisit).getTime()) / (1000 * 60 * 60 * 24)) : null;
          const lastLabel = daysAgo === 0 ? 'Today' : daysAgo === 1 ? 'Yesterday' : daysAgo != null ? `${daysAgo}d ago` : '';
          const catEmoji = HIST_CAT_EMOJI[item.venueType] ?? '📍';
          return (
            <Link key={item.venueId} to={`/venue/${item.venueSlug}`} style={{ textDecoration: 'none' }}>
              <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '22px', flexShrink: 0 }}>{catEmoji}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '14px', color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: '2px' }}>{item.venueName}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#39D98A', background: 'rgba(57,217,138,0.1)', padding: '1px 7px', borderRadius: '20px' }}>{HIST_BADGE_ICON[item.badgeTier]} {item.badgeTier}</span>
                    <span style={{ fontSize: '11px', color: 'var(--color-muted)' }}>{item.visitCount} visit{item.visitCount !== 1 ? 's' : ''}</span>
                    {lastLabel && <span style={{ fontSize: '11px', color: 'var(--color-muted)' }}>· {lastLabel}</span>}
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type Tab = 'home' | 'regulars' | 'events' | 'setup' | 'report' | 'settings';
const TABS: { key: Tab; label: string }[] = [
  { key: 'home',     label: 'Home'     },
  { key: 'regulars', label: 'Regulars' },
  { key: 'events',   label: 'Events'   },
  { key: 'setup',    label: 'Setup'    },
  { key: 'report',   label: 'Report'   },
  { key: 'settings', label: 'Settings' },
];

export default function DashboardPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('home');

  const [loading, setLoading]       = useState(true);
  const [loadError, setLoadError]   = useState(false);
  const [ownerName, setOwnerName]   = useState('');
  const [venueId, setVenueId]       = useState('');
  const [venue, setVenue]           = useState<Venue | null>(null);
  const [checkIns, setCheckIns]     = useState<DashboardCheckIn[]>([]);
  const [events, setEvents]         = useState<Event[]>([]);

  // Studio data
  const [stats, setStats]           = useState<StudioStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [weeklyBars, setWeeklyBars] = useState<WeeklyBar[]>([]);
  const [studioRegulars, setStudioRegulars] = useState<StudioRegular[]>([]);
  const [regularsLoading, setRegularsLoading] = useState(false);
  const [regularsLoaded, setRegularsLoaded]   = useState(false);
  const [reportData, setReportData] = useState<CommunityReportData | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportLoaded, setReportLoaded]   = useState(false);

  // todayCount fed into stats via realtime increment; kept for future use
  const _todayCount = useMemo(() => checkIns.filter(ci => isToday(ci.createdAt)).length, [checkIns]);
  void _todayCount;

  // ── Initial load ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    async function load() {
      setLoading(true); setLoadError(false);
      try {
        const owner = await getVenueOwnerByUserId(user!.id);
        if (!owner) { setLoading(false); return; }
        setOwnerName(owner.ownerName);
        setVenueId(owner.venueId);

        const [v, evts, cis] = await Promise.all([
          getVenueById(owner.venueId),
          getVenueEvents(owner.venueId),
          getRecentCheckIns(owner.venueId),
        ]);

        setVenue(v);
        setEvents(evts);
        setCheckIns(cis);

        // Load stats + weekly rhythm in background
        setStatsLoading(true);
        const [s, bars] = await Promise.all([
          getDashboardStats(owner.venueId),
          getWeeklyRhythm(owner.venueId),
        ]);
        setStats(s);
        setWeeklyBars(bars);
        setStatsLoading(false);
      } catch (err) {
        console.error('Dashboard load error:', err);
        setLoadError(true);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user]);

  // ── Lazy load regulars when tab opens ────────────────────────────────────────
  useEffect(() => {
    if (tab !== 'regulars' || regularsLoaded || !venueId) return;
    setRegularsLoading(true);
    getStudioRegulars(venueId).then(data => {
      setStudioRegulars(data);
      setRegularsLoaded(true);
      setRegularsLoading(false);
    });
  }, [tab, venueId, regularsLoaded]);

  // ── Lazy load report when tab opens ──────────────────────────────────────────
  useEffect(() => {
    if (tab !== 'report' || reportLoaded || !venueId) return;
    setReportLoading(true);
    getCommunityReportData(venueId).then(data => {
      setReportData(data);
      setReportLoaded(true);
      setReportLoading(false);
    });
  }, [tab, venueId, reportLoaded]);

  // ── Realtime: prepend new check-ins ──────────────────────────────────────────
  useEffect(() => {
    if (!venueId) return;
    const channel = supabase
      .channel(`dashboard-checkins-${venueId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'check_ins', filter: `venue_id=eq.${venueId}` }, payload => {
        const row = payload.new as Record<string, unknown>;
        setCheckIns(prev => [{
          id: row.id as string,
          visitorName: (row.visitor_name as string) ?? 'Anonymous',
          isGhost: (row.is_ghost as boolean) ?? false,
          isFirstVisit: (row.is_first_visit as boolean) ?? false,
          visitNumber: (row.visit_number as number) ?? 1,
          createdAt: row.created_at as string,
        }, ...prev]);
        // Bump today count in stats
        setStats(prev => prev ? { ...prev, todayCount: prev.todayCount + 1, weekCount: prev.weekCount + 1 } : prev);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [venueId]);

  // ── Render states ─────────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', gap: '16px' }}>
      <style>{`@keyframes dbSpin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ width: '36px', height: '36px', borderRadius: '50%', border: '3px solid rgba(57,217,138,0.2)', borderTopColor: '#39D98A', animation: 'dbSpin 0.8s linear infinite' }} />
      <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', fontFamily: 'DM Sans, sans-serif' }}>Loading your dashboard…</span>
    </div>
  );

  if (loadError) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', padding: '32px', textAlign: 'center' }}>
      <div style={{ fontSize: '40px', marginBottom: '16px' }}>⚠️</div>
      <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '18px', color: 'var(--color-text)', marginBottom: '8px' }}>Something went wrong</h2>
      <p style={{ fontSize: '14px', color: 'var(--color-muted)', marginBottom: '24px', lineHeight: 1.5 }}>Could not load your dashboard. Check your connection and try again.</p>
      <button onClick={() => window.location.reload()} style={{ background: 'var(--color-accent)', color: '#000', border: 'none', borderRadius: '12px', padding: '12px 28px', fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '14px', cursor: 'pointer' }}>Retry</button>
    </div>
  );

  // Non-owners who land on /dashboard are redirected to their profile.
  // The Passport/regular-score view lives under the Me → Profile tab.
  if (!venue || !venueId) return <Navigate to="/profile" replace />;

  const firstName = ownerName.split(' ')[0] || 'there';

  return (
    <>
      <style>{`
        @keyframes livePulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.4; transform: scale(0.75); } }
        .live-dot { animation: livePulse 1.8s ease-in-out infinite; }
      `}</style>

      <div style={{ padding: '16px 16px 0' }}>
        {/* Header */}
        <div style={{ marginBottom: '16px' }}>
          <p style={{ fontSize: '13px', color: 'var(--color-muted)', marginBottom: '4px' }}>{getGreeting()}, {firstName} 👋</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '20px', lineHeight: 1.2 }}>{venue.name}</h1>
            <div className="live-dot" style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#39D98A', flexShrink: 0 }} />
          </div>
          <p style={{ fontSize: '12px', color: 'var(--color-muted)' }}>{getTodayLabel()}</p>
        </div>

        {/* 4 stat tiles */}
        <StatTilesRow stats={stats} loading={statsLoading} />
      </div>

      {/* Tab bar */}
      <div style={{
        position: 'sticky', top: '56px', zIndex: 30,
        background: 'var(--color-bg)', borderBottom: '1px solid var(--color-border)',
        padding: '0 16px', display: 'flex', overflowX: 'auto', scrollbarWidth: 'none',
        marginBottom: '20px',
      } as React.CSSProperties}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            flexShrink: 0, padding: '12px 10px',
            background: 'transparent', border: 'none',
            borderBottom: tab === t.key ? '2px solid var(--color-accent)' : '2px solid transparent',
            color: tab === t.key ? 'var(--color-accent)' : 'var(--color-muted)',
            fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: '13px',
            cursor: 'pointer', transition: 'color 0.15s, border-color 0.15s',
            whiteSpace: 'nowrap',
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ padding: '0 16px 40px' }}>
        {tab === 'home' && (
          <HomeTab
            checkIns={checkIns} venueId={venueId} venueSlug={venue.slug}
            venueCreatedAt={venue.createdAt} venueDescription={venue.description}
            checkinCount={venue.checkinCount} stats={stats} weeklyBars={weeklyBars}
            onNudge={() => setTab('regulars')}
          />
        )}
        {tab === 'regulars' && (
          <StudioRegularsTab
            regulars={studioRegulars} loading={regularsLoading}
            venueName={venue.name} lapsedCount={stats?.lapsedCount ?? 0}
          />
        )}
        {tab === 'events' && (
          <EventsTab events={events} venueId={venueId} onEventAdded={e => setEvents(prev => [e, ...prev])} />
        )}
        {tab === 'setup' && <SetupTab venue={venue} />}
        {tab === 'report' && <ReportTab venue={venue} reportData={reportData} loading={reportLoading} />}
        {tab === 'settings' && <SettingsTab venue={venue} venueId={venueId} />}
      </div>

      {/* Personal check-in history — always visible at bottom */}
      <div style={{ padding: '0 16px 120px' }}>
        <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '15px', color: 'var(--color-text)', marginBottom: '12px' }}>Your Check-In History</h2>
        <CheckInHistorySection />
      </div>
    </>
  );
}
