import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Camera, Phone, MessageCircle,
  Check, X, Plus, Trash2, ToggleLeft, ToggleRight, Eye,
  ChevronRight, Store, Users, CheckSquare, Zap, Upload, Settings,
  Sparkles, MapPin,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import {
  getVenueOwnerByUserId, getVenueById, getDashboardStats,
  getRecentCheckIns,
} from '../lib/api';
import type { DashboardCheckIn, StudioStats } from '../lib/api';
import type { Venue } from '../types';

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = 'overview' | 'profile' | 'updates' | 'activity' | 'settings';

type UpdateType = 'general' | 'special' | 'menu' | 'event' | 'announcement';

interface VenueUpdate {
  id: string;
  title: string;
  content: string | null;
  type: UpdateType;
  createdAt: string;
  expiresAt: string | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TABS: { key: Tab; label: string; emoji: string }[] = [
  { key: 'overview',  label: 'Overview',  emoji: '🏠' },
  { key: 'profile',   label: 'Profile',   emoji: '✏️' },
  { key: 'updates',   label: 'Updates',   emoji: '📣' },
  { key: 'activity',  label: 'Activity',  emoji: '📊' },
  { key: 'settings',  label: 'Settings',  emoji: '⚙️' },
];

const UPDATE_TYPES: { key: UpdateType; emoji: string; label: string; color: string }[] = [
  { key: 'special',      emoji: '🔥', label: 'Special',      color: '#FB923C' },
  { key: 'menu',         emoji: '🍽️', label: 'Menu',         color: '#60A5FA' },
  { key: 'event',        emoji: '🎉', label: 'Event',         color: '#F472B6' },
  { key: 'announcement', emoji: '📢', label: 'Announcement',  color: '#FBBF24' },
  { key: 'general',      emoji: '📝', label: 'General',       color: '#A78BFA' },
];

const CAT_EMOJI: Record<string, string> = {
  Barbershop: '✂️', Shisanyama: '🔥', Tavern: '🍺', Café: '☕',
  Church: '⛪', Carwash: '🚗', 'Spaza Shop': '🏪', Salon: '💅',
  Tutoring: '📚', 'Sports Ground': '⚽', 'Home Business': '🏠',
  Gym: '💪', 'Market Stall': '🛒', Mechanic: '🔧', Garage: '🔧',
  Lodge: '🏨', Clinic: '🏥', Other: '📍',
};

const CHECKIN_COLORS = ['#39D98A','#F5A623','#60A5FA','#F472B6','#A78BFA','#FB923C'];

// ─── Shared helpers ───────────────────────────────────────────────────────────

function catEmoji(cat: string) {
  return CAT_EMOJI[cat] ?? '🏪';
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function completeness(venue: Venue): { score: number; items: { label: string; done: boolean; path: string }[] } {
  const items = [
    { label: 'Add a photo',         done: !!(venue.coverImage || (venue.galleryImages?.length ?? 0) > 0), path: '/venue/photos' },
    { label: 'Write a description', done: !!(venue.description?.trim().length > 20),                       path: '/venue/edit' },
    { label: 'Add phone or WhatsApp',done: !!(venue.phoneNumber || venue.whatsappNumber),                  path: '/venue/edit' },
    { label: 'Set opening hours',   done: !!(venue.openHours || venue.ownerHours),                        path: '/venue/hours' },
    { label: 'Claim your listing',  done: !!venue.ownerClaimed,                                            path: '' },
  ];
  const done = items.filter(i => i.done).length;
  return { score: Math.round((done / items.length) * 100), items };
}

// ─── Shared UI atoms ──────────────────────────────────────────────────────────

const S = {
  input: {
    width: '100%', boxSizing: 'border-box' as const,
    background: '#0D1117', border: '1px solid #30363D',
    borderRadius: '10px', padding: '11px 13px',
    fontFamily: 'DM Sans, sans-serif', fontSize: '14px',
    color: '#F0F6FC', outline: 'none', lineHeight: '1.5',
  } as React.CSSProperties,
  label: {
    display: 'block' as const,
    fontFamily: 'DM Sans, sans-serif', fontWeight: 700, fontSize: '11px',
    color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' as const,
    letterSpacing: '0.06em', marginBottom: '6px',
  } as React.CSSProperties,
};

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{
      fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '15px',
      color: '#F0F6FC', margin: '0 0 12px', letterSpacing: '-0.01em',
    }}>
      {children}
    </h2>
  );
}

function LinkRow({ to, emoji, label, sub, accent = '#39D98A' }: {
  to: string; emoji?: string; label: string; sub?: string; accent?: string;
}) {
  return (
    <Link to={to} style={{ textDecoration: 'none', display: 'block' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: '13px',
        padding: '13px 14px', background: '#161B22',
        border: '1px solid #21262D', borderRadius: '14px',
      }}>
        {emoji && (
          <div style={{
            width: '38px', height: '38px', borderRadius: '11px', flexShrink: 0,
            background: `${accent}15`, border: `1px solid ${accent}28`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '18px',
          }}>
            {emoji}
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '13px', color: '#F0F6FC' }}>{label}</div>
          {sub && <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.38)', marginTop: '1px' }}>{sub}</div>}
        </div>
        <ChevronRight size={15} color="rgba(255,255,255,0.2)" />
      </div>
    </Link>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div style={{ padding: '70px 16px 16px' }}>
      {[90, 56, 140, 90].map((h, i) => (
        <div key={i} style={{ height: `${h}px`, background: 'rgba(255,255,255,0.04)', borderRadius: '14px', marginBottom: '12px' }} />
      ))}
    </div>
  );
}

// ─── No-venue state ───────────────────────────────────────────────────────────

function NoVenue() {
  return (
    <div style={{ minHeight: '70vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 24px', textAlign: 'center' }}>
      <div style={{ fontSize: '56px', marginBottom: '16px' }}>🏪</div>
      <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '22px', color: '#F0F6FC', marginBottom: '8px' }}>
        No place found
      </h1>
      <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: 'rgba(255,255,255,0.45)', lineHeight: 1.6, marginBottom: '24px', maxWidth: '280px' }}>
        Add your business to Kayaa to get check-ins, regulars, and a neighbourhood presence.
      </p>
      <Link to="/onboarding" style={{
        display: 'inline-flex', alignItems: 'center', gap: '8px',
        padding: '14px 28px', borderRadius: '14px', textDecoration: 'none',
        background: '#39D98A', fontFamily: 'Syne, sans-serif', fontWeight: 800,
        fontSize: '15px', color: '#000',
      }}>
        <Zap size={16} /> Add Your Place
      </Link>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB 1 — OVERVIEW
// ══════════════════════════════════════════════════════════════════════════════

function OverviewTab({
  venue, stats, weekViews, onTabChange,
}: {
  venue: Venue;
  stats: StudioStats | null;
  weekViews: number;
  onTabChange: (t: Tab) => void;
}) {
  const { score, items } = completeness(venue);
  const emoji = catEmoji(venue.category);
  const coverUrl = venue.coverImage ?? (venue.galleryImages?.[0] ?? '');

  return (
    <div>
      {/* ── Identity card ─────────────────────────────────────────────── */}
      <div style={{
        background: '#161B22', border: '1px solid #21262D', borderRadius: '16px',
        overflow: 'hidden', marginBottom: '16px',
      }}>
        {/* Cover strip */}
        {coverUrl ? (
          <div style={{ height: '90px', overflow: 'hidden', position: 'relative' }}>
            <img src={coverUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 40%, rgba(22,27,34,0.92))' }} />
          </div>
        ) : (
          <div style={{ height: '60px', background: `linear-gradient(135deg, rgba(57,217,138,0.12), rgba(57,217,138,0.04))`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px' }}>
            {emoji}
          </div>
        )}

        <div style={{ padding: '14px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
            <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '18px', color: '#F0F6FC', margin: 0, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {venue.name}
            </h1>
            {venue.ownerClaimed && (
              <span style={{
                fontFamily: 'DM Sans, sans-serif', fontWeight: 700, fontSize: '10px',
                color: '#39D98A', background: 'rgba(57,217,138,0.1)', border: '1px solid rgba(57,217,138,0.25)',
                borderRadius: '6px', padding: '2px 8px', flexShrink: 0, marginLeft: '8px',
              }}>
                CLAIMED ✓
              </span>
            )}
          </div>
          <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>{emoji} {venue.category}</span>
            <span>·</span>
            <MapPin size={11} color="rgba(255,255,255,0.3)" />
            <span>{venue.neighborhood}</span>
          </div>

          {/* Quick view link */}
          <Link to={`/venue/${venue.slug}`} style={{
            display: 'inline-flex', alignItems: 'center', gap: '5px',
            marginTop: '10px', padding: '6px 12px', borderRadius: '8px', textDecoration: 'none',
            background: 'rgba(57,217,138,0.08)', border: '1px solid rgba(57,217,138,0.2)',
            fontFamily: 'DM Sans, sans-serif', fontWeight: 700, fontSize: '11px', color: '#39D98A',
          }}>
            <Eye size={12} /> View public page →
          </Link>
        </div>
      </div>

      {/* ── Completeness checklist ────────────────────────────────────── */}
      {score < 100 && (
        <div style={{
          background: '#161B22', border: '1px solid #21262D', borderRadius: '16px',
          padding: '16px', marginBottom: '16px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <SectionTitle>Profile completeness</SectionTitle>
            <span style={{
              fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '16px',
              color: score >= 80 ? '#39D98A' : score >= 60 ? '#FBBF24' : '#FB923C',
            }}>
              {score}%
            </span>
          </div>

          {/* Bar */}
          <div style={{ height: '6px', background: 'rgba(255,255,255,0.07)', borderRadius: '3px', marginBottom: '14px', overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: '3px',
              width: `${score}%`,
              background: score >= 80 ? '#39D98A' : score >= 60 ? '#FBBF24' : '#FB923C',
              transition: 'width 0.4s ease',
            }} />
          </div>

          {/* Items */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
            {items.map(item => (
              <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '20px', height: '20px', borderRadius: '50%', flexShrink: 0,
                  background: item.done ? 'rgba(57,217,138,0.15)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${item.done ? 'rgba(57,217,138,0.35)' : '#30363D'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {item.done && <Check size={11} color="#39D98A" />}
                </div>
                <span style={{
                  flex: 1, fontFamily: 'DM Sans, sans-serif', fontSize: '13px',
                  color: item.done ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.75)',
                  textDecoration: item.done ? 'line-through' : 'none',
                }}>
                  {item.label}
                </span>
                {!item.done && item.path && (
                  <Link to={item.path} style={{
                    fontFamily: 'DM Sans, sans-serif', fontWeight: 700, fontSize: '11px',
                    color: '#39D98A', textDecoration: 'none',
                    padding: '3px 9px', borderRadius: '20px', border: '1px solid rgba(57,217,138,0.28)',
                    flexShrink: 0,
                  }}>
                    Fix →
                  </Link>
                )}
                {!item.done && !item.path && (
                  <button
                    onClick={() => onTabChange('settings')}
                    style={{
                      fontFamily: 'DM Sans, sans-serif', fontWeight: 700, fontSize: '11px',
                      color: '#39D98A', background: 'none', border: '1px solid rgba(57,217,138,0.28)',
                      borderRadius: '20px', padding: '3px 9px', cursor: 'pointer', flexShrink: 0,
                    }}
                  >
                    Fix →
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Visibility snapshot ───────────────────────────────────────── */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '16px',
      }}>
        {[
          { val: stats?.todayCount ?? 0,  label: 'Today',    accent: '#39D98A', icon: <CheckSquare size={14} color="rgba(57,217,138,0.6)" /> },
          { val: stats?.weekCount ?? 0,   label: 'This week', accent: '#60A5FA', icon: <Users size={14} color="rgba(96,165,250,0.6)" /> },
          { val: weekViews,               label: 'Views',     accent: '#A78BFA', icon: <Eye size={14} color="rgba(167,139,250,0.6)" /> },
        ].map(s => (
          <div key={s.label} style={{
            background: '#161B22', border: `1px solid ${s.accent}20`,
            borderRadius: '13px', padding: '13px 10px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '22px', color: s.accent, lineHeight: 1 }}>
                {s.val}
              </span>
              {s.icon}
            </div>
            <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '10px', color: 'rgba(255,255,255,0.38)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* ── Quick actions ─────────────────────────────────────────────── */}
      <SectionTitle>Quick actions</SectionTitle>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
        <button
          onClick={() => onTabChange('updates')}
          style={{
            display: 'flex', alignItems: 'center', gap: '13px',
            padding: '13px 14px', background: 'rgba(57,217,138,0.08)',
            border: '1px solid rgba(57,217,138,0.25)', borderRadius: '14px',
            cursor: 'pointer', textAlign: 'left',
          }}
        >
          <div style={{ width: '38px', height: '38px', borderRadius: '11px', flexShrink: 0, background: 'rgba(57,217,138,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>
            📣
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '13px', color: '#39D98A' }}>Post an update</div>
            <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: 'rgba(57,217,138,0.6)', marginTop: '1px' }}>Special, stock, hours, event…</div>
          </div>
          <ChevronRight size={15} color="rgba(57,217,138,0.4)" />
        </button>

        <LinkRow to="/venue/photos" emoji="📷" label="Add photos" sub="Help people recognise your place" accent="#A78BFA" />
        <LinkRow to="/venue/hours"  emoji="🕐" label="Set opening hours" sub="Let neighbours know when you're open" accent="#60A5FA" />
        <LinkRow to="/venue/edit"   emoji="✏️" label="Edit details" sub="Name, phone, WhatsApp, description" accent="#39D98A" />
        <LinkRow to="/venue/qr-code" emoji="📲" label="Get your QR code" sub="Print it and put it at the counter" accent="#34D399" />
        <LinkRow to="/venue/events" emoji="🗓️" label="Create an event" sub="Gig, braai, church service, stokvel…" accent="#F472B6" />
        <LinkRow to="/venue/analytics" emoji="📈" label="Full analytics" sub="Detailed check-in insights" accent="#FB923C" />
      </div>

      {/* ── Visibility value prop ─────────────────────────────────────── */}
      <div style={{
        background: 'rgba(57,217,138,0.04)', border: '1px solid rgba(57,217,138,0.12)',
        borderRadius: '14px', padding: '14px 16px',
        display: 'flex', alignItems: 'flex-start', gap: '12px',
      }}>
        <Sparkles size={18} color="rgba(57,217,138,0.7)" style={{ flexShrink: 0, marginTop: '1px' }} />
        <div>
          <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '13px', color: '#39D98A', marginBottom: '4px' }}>
            Kayaa is where {venue.neighborhood} finds local places
          </div>
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: 'rgba(255,255,255,0.45)', margin: 0, lineHeight: 1.6 }}>
            Every check-in and update makes your place more visible to neighbours nearby.
            Complete your profile to show up higher in local searches.
          </p>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB 2 — PLACE PROFILE
// ══════════════════════════════════════════════════════════════════════════════

function ProfileTab({ venue, venueId, onVenueUpdate }: {
  venue: Venue;
  venueId: string;
  onVenueUpdate: (partial: Partial<Venue>) => void;
}) {
  const [name,    setName]    = useState(venue.name);
  const [desc,    setDesc]    = useState(venue.description ?? '');
  const [phone,   setPhone]   = useState(venue.phoneNumber ?? '');
  const [wa,      setWa]      = useState(venue.whatsappNumber ?? '');
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    const { error: dbErr } = await supabase
      .from('venues')
      .update({
        name:             name.trim(),
        description:      desc.trim() || null,
        phone_number:     phone.trim() || null,
        whatsapp_number:  wa.trim() || null,
      })
      .eq('id', venueId);

    setSaving(false);
    if (dbErr) { setError('Could not save. Try again.'); return; }
    setSaved(true);
    onVenueUpdate({ name: name.trim(), description: desc.trim(), phoneNumber: phone.trim() || undefined, whatsappNumber: wa.trim() || undefined });
    setTimeout(() => setSaved(false), 2500);
  }

  const coverUrl = venue.coverImage ?? venue.galleryImages?.[0] ?? '';
  const photos   = venue.galleryImages ?? [];

  return (
    <div>
      {/* ── Public preview block ────────────────────────────────────── */}
      <div style={{
        background: '#161B22', border: '1px solid rgba(57,217,138,0.2)',
        borderRadius: '16px', overflow: 'hidden', marginBottom: '20px',
      }}>
        <div style={{
          padding: '9px 14px',
          background: 'rgba(57,217,138,0.06)',
          borderBottom: '1px solid rgba(57,217,138,0.12)',
          fontFamily: 'DM Sans, sans-serif', fontWeight: 700, fontSize: '11px',
          color: '#39D98A', letterSpacing: '0.04em',
          display: 'flex', alignItems: 'center', gap: '6px',
        }}>
          <Eye size={12} /> How people see your place
        </div>
        <div style={{ padding: '14px' }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            {coverUrl ? (
              <img src={coverUrl} alt="" style={{ width: '52px', height: '52px', borderRadius: '12px', objectFit: 'cover', flexShrink: 0 }} />
            ) : (
              <div style={{ width: '52px', height: '52px', borderRadius: '12px', background: 'rgba(57,217,138,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', flexShrink: 0 }}>
                {catEmoji(venue.category)}
              </div>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '15px', color: '#F0F6FC' }}>{name || venue.name}</div>
              <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>{venue.category} · {venue.neighborhood}</div>
              {(desc || venue.description) && (
                <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: 'rgba(255,255,255,0.55)', marginTop: '4px', lineHeight: 1.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {desc || venue.description}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Edit form ───────────────────────────────────────────────── */}
      <div style={{ background: '#161B22', border: '1px solid #21262D', borderRadius: '16px', padding: '16px', marginBottom: '16px' }}>
        <SectionTitle>Edit details</SectionTitle>

        {saved && (
          <div style={{ marginBottom: '14px', padding: '10px 12px', background: 'rgba(57,217,138,0.08)', border: '1px solid rgba(57,217,138,0.25)', borderRadius: '10px', display: 'flex', gap: '8px', alignItems: 'center' }}>
            <Check size={14} color="#39D98A" />
            <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: '#39D98A' }}>Saved!</span>
          </div>
        )}
        {error && (
          <div style={{ marginBottom: '14px', padding: '10px 12px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '10px', fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: '#F87171' }}>
            {error}
          </div>
        )}

        <div style={{ marginBottom: '14px' }}>
          <label style={S.label}>Place name</label>
          <input value={name} onChange={e => setName(e.target.value)} maxLength={80} style={S.input} placeholder="Your business name" />
        </div>
        <div style={{ marginBottom: '14px' }}>
          <label style={S.label}>Description</label>
          <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={3} maxLength={400} style={{ ...S.input, resize: 'vertical' }} placeholder="Tell neighbours what makes your place special…" />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
          <div>
            <label style={S.label}><Phone size={10} style={{ display: 'inline', marginRight: '4px' }} />Phone</label>
            <input value={phone} onChange={e => setPhone(e.target.value)} maxLength={20} style={S.input} placeholder="e.g. 011 123 4567" />
          </div>
          <div>
            <label style={S.label}><MessageCircle size={10} style={{ display: 'inline', marginRight: '4px' }} />WhatsApp</label>
            <input value={wa} onChange={e => setWa(e.target.value)} maxLength={20} style={S.input} placeholder="e.g. 083 123 4567" />
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving || !name.trim()}
          style={{
            width: '100%', padding: '13px', borderRadius: '12px', border: 'none', cursor: 'pointer',
            background: saving || !name.trim() ? 'rgba(57,217,138,0.3)' : '#39D98A',
            fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '14px', color: '#000',
          }}
        >
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </div>

      {/* ── Photos ─────────────────────────────────────────────────── */}
      <div style={{ background: '#161B22', border: '1px solid #21262D', borderRadius: '16px', padding: '16px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <SectionTitle>Photos</SectionTitle>
          <Link to="/venue/photos" style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 700, fontSize: '12px', color: '#39D98A', textDecoration: 'none' }}>
            Manage →
          </Link>
        </div>
        {photos.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
            {photos.slice(0, 5).map((url, i) => (
              <div key={i} style={{ aspectRatio: '1', borderRadius: '10px', overflow: 'hidden', position: 'relative' }}>
                <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
                {i === 0 && (
                  <div style={{ position: 'absolute', bottom: '4px', left: '4px', background: '#FBBF24', borderRadius: '4px', padding: '1px 5px', fontFamily: 'DM Sans, sans-serif', fontWeight: 700, fontSize: '9px', color: '#000' }}>
                    Cover
                  </div>
                )}
              </div>
            ))}
            <Link to="/venue/photos" style={{
              aspectRatio: '1', borderRadius: '10px', border: '2px dashed #30363D',
              background: 'rgba(255,255,255,0.02)', display: 'flex', alignItems: 'center',
              justifyContent: 'center', textDecoration: 'none', flexDirection: 'column', gap: '4px',
            }}>
              <Upload size={16} color="rgba(57,217,138,0.6)" />
              <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '10px', color: 'rgba(57,217,138,0.6)' }}>Add</span>
            </Link>
          </div>
        ) : (
          <Link to="/venue/photos" style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            padding: '28px', borderRadius: '12px', border: '2px dashed #30363D',
            background: 'rgba(255,255,255,0.02)', textDecoration: 'none', gap: '8px',
          }}>
            <Camera size={24} color="rgba(167,139,250,0.6)" />
            <span style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: '13px', color: 'rgba(255,255,255,0.45)' }}>
              Add a photo so people can recognise your place
            </span>
          </Link>
        )}
      </div>

      {/* ── Hours ────────────────────────────────────────────────────── */}
      <div style={{ background: '#161B22', border: '1px solid #21262D', borderRadius: '16px', padding: '16px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <SectionTitle>Opening hours</SectionTitle>
          <Link to="/venue/hours" style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 700, fontSize: '12px', color: '#39D98A', textDecoration: 'none' }}>
            {venue.openHours || venue.ownerHours ? 'Edit →' : 'Set →'}
          </Link>
        </div>
        {venue.openHours ? (
          <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: 'rgba(255,255,255,0.6)', lineHeight: 1.6 }}>
            {venue.openHours}
          </div>
        ) : (
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: 'rgba(255,255,255,0.35)', margin: 0 }}>
            No hours set — neighbours won't know when you're open.
          </p>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB 3 — OFFERS & UPDATES
// ══════════════════════════════════════════════════════════════════════════════

function UpdatesTab({ venueId }: { venueId: string }) {
  const [updates,  setUpdates]  = useState<VenueUpdate[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [posted,   setPosted]   = useState(false);

  useEffect(() => {
    load();
  }, [venueId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from('venue_updates')
      .select('*')
      .eq('venue_id', venueId)
      .order('created_at', { ascending: false })
      .limit(30);
    if (data) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setUpdates(data.map((r: any) => ({
        id: r.id, title: r.title, content: r.content ?? null,
        type: r.type as UpdateType, createdAt: r.created_at, expiresAt: r.expires_at ?? null,
      })));
    }
    setLoading(false);
  }

  async function handlePost(d: { type: UpdateType; title: string; content: string; expiresIn: string }) {
    const expires_at = d.expiresIn !== '0' ? new Date(Date.now() + Number(d.expiresIn) * 86_400_000).toISOString() : null;
    await supabase.from('venue_updates').insert({
      venue_id: venueId, title: d.title.trim(),
      content: d.content.trim() || null, type: d.type, expires_at,
    });
    setShowForm(false);
    setPosted(true);
    setTimeout(() => setPosted(false), 3000);
    load();
  }

  async function handleDelete(id: string) {
    await supabase.from('venue_updates').delete().eq('id', id);
    setUpdates(prev => prev.filter(u => u.id !== id));
  }

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {[80, 80, 80].map((h, i) => <div key={i} style={{ height: `${h}px`, background: 'rgba(255,255,255,0.04)', borderRadius: '14px' }} />)}
    </div>
  );

  return (
    <div>
      {/* ── Post CTA / header ────────────────────────────────────────── */}
      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: '12px',
            padding: '14px 16px', marginBottom: '16px',
            background: 'rgba(57,217,138,0.08)', border: '1px solid rgba(57,217,138,0.25)',
            borderRadius: '16px', cursor: 'pointer', textAlign: 'left',
          }}
        >
          <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(57,217,138,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>📣</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '14px', color: '#39D98A' }}>Post an update</div>
            <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: 'rgba(57,217,138,0.55)', marginTop: '2px' }}>
              Specials · stock · hours · events · announcements
            </div>
          </div>
          <Plus size={18} color="#39D98A" />
        </button>
      )}

      {/* ── Success banner ───────────────────────────────────────────── */}
      {posted && (
        <div style={{ marginBottom: '14px', padding: '11px 14px', background: 'rgba(57,217,138,0.08)', border: '1px solid rgba(57,217,138,0.25)', borderRadius: '12px', display: 'flex', gap: '8px', alignItems: 'center' }}>
          <Check size={15} color="#39D98A" />
          <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: '#39D98A' }}>
            Update posted! Visible on your venue page now.
          </span>
        </div>
      )}

      {/* ── Composer ─────────────────────────────────────────────────── */}
      {showForm && (
        <UpdateComposer onPost={handlePost} onCancel={() => setShowForm(false)} />
      )}

      {/* ── Empty state ──────────────────────────────────────────────── */}
      {!showForm && updates.length === 0 && (
        <div style={{
          textAlign: 'center', padding: '48px 24px',
          background: '#161B22', border: '1px dashed #30363D', borderRadius: '16px',
        }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>💬</div>
          <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '16px', color: '#F0F6FC', marginBottom: '6px' }}>
            Your first update
          </div>
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: 'rgba(255,255,255,0.4)', lineHeight: 1.6, margin: '0 auto 20px', maxWidth: '260px' }}>
            Share a special, let people know you're open, or post a quick promo. It shows on your place page.
          </p>
          <button
            onClick={() => setShowForm(true)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              padding: '12px 24px', borderRadius: '12px', border: 'none', cursor: 'pointer',
              background: '#39D98A', fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '14px', color: '#000',
            }}
          >
            <Plus size={15} /> Post now
          </button>
        </div>
      )}

      {/* ── Updates list ─────────────────────────────────────────────── */}
      {updates.length > 0 && (
        <div>
          <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {updates.length} update{updates.length !== 1 ? 's' : ''} active
          </div>
          {updates.map(u => <UpdateCard key={u.id} update={u} onDelete={handleDelete} />)}
        </div>
      )}
    </div>
  );
}

// ── Update composer ────────────────────────────────────────────────────────

function UpdateComposer({ onPost, onCancel }: {
  onPost: (d: { type: UpdateType; title: string; content: string; expiresIn: string }) => Promise<void>;
  onCancel: () => void;
}) {
  const [type,    setType]    = useState<UpdateType>('special');
  const [title,   setTitle]   = useState('');
  const [content, setContent] = useState('');
  const [exp,     setExp]     = useState('7');
  const [posting, setPosting] = useState(false);

  // Placeholder suggestions per type
  const PLACEHOLDER: Record<UpdateType, string> = {
    special:      'e.g. 2-for-1 haircuts Saturday only',
    menu:         'e.g. Fresh pap and chicken available now',
    event:        'e.g. Live music this Friday night',
    announcement: 'e.g. Closed on Monday for public holiday',
    general:      'What\'s happening at your place today?',
  };

  async function submit() {
    if (!title.trim() || posting) return;
    setPosting(true);
    await onPost({ type, title, content, expiresIn: exp });
    setPosting(false);
  }

  const activeCfg = UPDATE_TYPES.find(t => t.key === type)!;

  return (
    <div style={{
      background: '#161B22', border: `1px solid ${activeCfg.color}30`,
      borderRadius: '16px', padding: '16px', marginBottom: '16px',
    }}>
      <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '15px', color: '#F0F6FC', marginBottom: '14px' }}>
        New update
      </div>

      {/* Type pills */}
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '14px' }}>
        {UPDATE_TYPES.map(t => (
          <button key={t.key} onClick={() => setType(t.key)} style={{
            display: 'flex', alignItems: 'center', gap: '4px',
            padding: '5px 10px', borderRadius: '20px', border: 'none', cursor: 'pointer',
            background: type === t.key ? `${t.color}20` : 'rgba(255,255,255,0.05)',
            outline: type === t.key ? `1px solid ${t.color}` : '1px solid transparent',
            fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: '12px',
            color: type === t.key ? t.color : 'rgba(255,255,255,0.45)',
            transition: 'all 0.15s',
          }}>
            {t.emoji} {t.label}
          </button>
        ))}
      </div>

      {/* Headline */}
      <div style={{ marginBottom: '10px' }}>
        <label style={S.label}>Headline *</label>
        <input
          value={title} onChange={e => setTitle(e.target.value)} maxLength={80}
          placeholder={PLACEHOLDER[type]} style={S.input}
        />
      </div>

      {/* Details */}
      <div style={{ marginBottom: '10px' }}>
        <label style={S.label}>Details (optional)</label>
        <textarea
          value={content} onChange={e => setContent(e.target.value)} rows={2} maxLength={400}
          placeholder="Add more context, price, time, or anything useful…"
          style={{ ...S.input, resize: 'vertical' }}
        />
      </div>

      {/* Expiry */}
      <div style={{ marginBottom: '16px' }}>
        <label style={S.label}>Show for</label>
        <div style={{ display: 'flex', gap: '6px' }}>
          {[{ v:'1',label:'1 day'},{v:'3',label:'3 days'},{v:'7',label:'1 week'},{v:'30',label:'1 month'},{v:'0',label:'No expiry'}].map(o => (
            <button key={o.v} onClick={() => setExp(o.v)} style={{
              flex: 1, padding: '7px 2px', borderRadius: '8px', border: 'none', cursor: 'pointer',
              background: exp === o.v ? 'rgba(57,217,138,0.15)' : 'rgba(255,255,255,0.04)',
              outline: exp === o.v ? '1px solid rgba(57,217,138,0.4)' : '1px solid transparent',
              fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: '11px',
              color: exp === o.v ? '#39D98A' : 'rgba(255,255,255,0.4)',
            }}>
              {o.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          onClick={submit} disabled={!title.trim() || posting}
          style={{
            flex: 1, padding: '13px', borderRadius: '12px', border: 'none', cursor: 'pointer',
            background: !title.trim() || posting ? 'rgba(57,217,138,0.3)' : '#39D98A',
            fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '14px', color: '#000',
          }}
        >
          {posting ? 'Posting…' : 'Post update'}
        </button>
        <button onClick={onCancel} style={{
          padding: '13px 16px', borderRadius: '12px',
          background: 'rgba(255,255,255,0.05)', border: '1px solid #30363D', cursor: 'pointer',
          fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: '14px', color: 'rgba(255,255,255,0.5)',
        }}>
          Cancel
        </button>
      </div>
    </div>
  );
}

// ── Single update card ─────────────────────────────────────────────────────

function UpdateCard({ update, onDelete }: { update: VenueUpdate; onDelete: (id: string) => void }) {
  const [confirm, setConfirm] = useState(false);
  const cfg = UPDATE_TYPES.find(t => t.key === update.type) ?? UPDATE_TYPES[4];

  return (
    <div style={{ background: '#161B22', border: '1px solid #21262D', borderRadius: '14px', padding: '14px', marginBottom: '10px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
        <div style={{
          width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0,
          background: `${cfg.color}15`, border: `1px solid ${cfg.color}30`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px',
        }}>
          {cfg.emoji}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
            <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '13px', color: '#F0F6FC', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {update.title}
            </span>
            <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '10px', fontWeight: 600, color: cfg.color, background: `${cfg.color}15`, borderRadius: '5px', padding: '2px 6px', flexShrink: 0 }}>
              {cfg.label}
            </span>
          </div>
          {update.content && (
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: 'rgba(255,255,255,0.5)', margin: '0 0 5px', lineHeight: 1.5 }}>
              {update.content}
            </p>
          )}
          <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.28)' }}>
            {timeAgo(update.createdAt)}
            {update.expiresAt && ` · expires ${new Date(update.expiresAt).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })}`}
          </div>
        </div>
        {confirm ? (
          <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
            <button onClick={() => onDelete(update.id)} style={{ background: '#EF4444', border: 'none', borderRadius: '8px', padding: '5px 8px', cursor: 'pointer', display: 'flex' }}>
              <Check size={13} color="#fff" />
            </button>
            <button onClick={() => setConfirm(false)} style={{ background: 'rgba(255,255,255,0.07)', border: 'none', borderRadius: '8px', padding: '5px 8px', cursor: 'pointer', display: 'flex' }}>
              <X size={13} color="rgba(255,255,255,0.5)" />
            </button>
          </div>
        ) : (
          <button onClick={() => setConfirm(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex', flexShrink: 0 }}>
            <Trash2 size={14} color="rgba(255,255,255,0.2)" />
          </button>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB 4 — ACTIVITY
// ══════════════════════════════════════════════════════════════════════════════

function ActivityTab({ venueId, stats, weekViews }: {
  venueId: string;
  stats: StudioStats | null;
  weekViews: number;
}) {
  const [checkIns, setCheckIns] = useState<DashboardCheckIn[]>([]);
  const [loaded,   setLoaded]   = useState(false);

  useEffect(() => {
    getRecentCheckIns(venueId, 12).then(ci => { setCheckIns(ci); setLoaded(true); });
  }, [venueId]);

  return (
    <div>
      {/* ── Signal cards ─────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
        {[
          { val: stats?.todayCount ?? 0,   label: 'Check-ins today',  accent: '#39D98A' },
          { val: stats?.weekCount ?? 0,    label: 'This week',         accent: '#60A5FA' },
          { val: weekViews,                label: 'Profile views',     accent: '#A78BFA' },
          { val: stats?.newFacesCount ?? 0,label: 'New faces',         accent: '#FB923C' },
        ].map(s => (
          <div key={s.label} style={{ background: '#161B22', border: `1px solid ${s.accent}20`, borderRadius: '13px', padding: '14px 12px' }}>
            <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '26px', color: s.accent, lineHeight: 1, marginBottom: '4px' }}>
              {s.val}
            </div>
            <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '10px', color: 'rgba(255,255,255,0.38)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* ── Recent check-ins ─────────────────────────────────────────── */}
      <div style={{ background: '#161B22', border: '1px solid #21262D', borderRadius: '16px', padding: '16px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <SectionTitle>Recent check-ins</SectionTitle>
          <CheckSquare size={15} color="rgba(57,217,138,0.5)" />
        </div>

        {!loaded ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[1,2,3].map(i => <div key={i} style={{ height: '44px', background: 'rgba(255,255,255,0.04)', borderRadius: '10px' }} />)}
          </div>
        ) : checkIns.length === 0 ? (
          <div style={{ padding: '24px 0', textAlign: 'center', fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: 'rgba(255,255,255,0.25)' }}>
            No check-ins yet — share your QR code to get started
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {checkIns.map((ci, i) => {
              const name = ci.isGhost ? 'Anonymous' : ci.visitorName;
              const initial = name[0]?.toUpperCase() ?? '?';
              const color = ci.isGhost ? 'rgba(255,255,255,0.25)' : CHECKIN_COLORS[i % CHECKIN_COLORS.length];
              return (
                <div key={ci.id} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '34px', height: '34px', borderRadius: '50%', flexShrink: 0,
                    background: `${color}18`, border: `1.5px solid ${color}35`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '13px', color,
                  }}>
                    {initial}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <span style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: '13px', color: '#F0F6FC', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {name}
                      </span>
                      {ci.isFirstVisit && (
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
                    <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>
                      visit #{ci.visitNumber}
                    </div>
                  </div>
                  <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.3)', flexShrink: 0 }}>
                    {timeAgo(ci.createdAt)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Deep link to analytics ────────────────────────────────────── */}
      <LinkRow to="/venue/analytics" emoji="📈" label="Full analytics" sub="Detailed check-in history, regulars, and trends" accent="#FB923C" />

      {/* ── WhatsApp alerts ───────────────────────────────────────────── */}
      {(() => {
        const waNumber = (import.meta.env.VITE_KAYAA_WA_NUMBER as string) ?? '27600000000';
        const msg = encodeURIComponent('Hi Kayaa, I want to receive check-in alerts on WhatsApp for my venue.');
        return (
          <a
            href={`https://wa.me/${waNumber}?text=${msg}`}
            target="_blank" rel="noopener noreferrer"
            style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              marginTop: '12px', padding: '13px 16px',
              background: 'rgba(37,211,102,0.07)', border: '1px solid rgba(37,211,102,0.2)',
              borderRadius: '14px', textDecoration: 'none',
              fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: '13px', color: '#25D366',
            }}
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="#25D366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            Get check-in alerts on WhatsApp
          </a>
        );
      })()}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB 5 — SETTINGS
// ══════════════════════════════════════════════════════════════════════════════

function SettingsTab({ venue, venueId, onVenueUpdate }: {
  venue: Venue;
  venueId: string;
  onVenueUpdate: (partial: Partial<Venue>) => void;
}) {
  const [isOpen,   setIsOpen]   = useState(venue.isOpen);
  const [toggling, setToggling] = useState(false);

  async function toggleOpen() {
    if (toggling) return;
    setToggling(true);
    const next = !isOpen;
    setIsOpen(next);
    await supabase.from('venues').update({ status: next ? 'open' : 'closed' }).eq('id', venueId);
    onVenueUpdate({ isOpen: next });
    setToggling(false);
  }

  return (
    <div>
      {/* ── Open / Closed toggle ────────────────────────────────────── */}
      <div style={{ background: '#161B22', border: '1px solid #21262D', borderRadius: '16px', padding: '16px', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '14px', color: '#F0F6FC', marginBottom: '2px' }}>
              Open right now
            </div>
            <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: 'rgba(255,255,255,0.38)' }}>
              {isOpen ? 'Showing as open to neighbours' : 'Showing as closed'}
            </div>
          </div>
          <button
            onClick={toggleOpen} disabled={toggling}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '8px 14px', borderRadius: '20px', border: 'none', cursor: 'pointer',
              background: isOpen ? 'rgba(57,217,138,0.12)' : 'rgba(255,255,255,0.06)',
              transition: 'all 0.2s',
            }}
          >
            {isOpen
              ? <ToggleRight size={18} color="#39D98A" />
              : <ToggleLeft  size={18} color="rgba(255,255,255,0.3)" />
            }
            <span style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 700, fontSize: '13px', color: isOpen ? '#39D98A' : 'rgba(255,255,255,0.3)' }}>
              {isOpen ? 'Open' : 'Closed'}
            </span>
          </button>
        </div>
      </div>

      {/* ── Claim status ─────────────────────────────────────────────── */}
      <div style={{
        background: '#161B22', border: `1px solid ${venue.ownerClaimed ? 'rgba(57,217,138,0.2)' : 'rgba(251,191,36,0.2)'}`,
        borderRadius: '16px', padding: '16px', marginBottom: '12px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '40px', height: '40px', borderRadius: '12px', flexShrink: 0,
            background: venue.ownerClaimed ? 'rgba(57,217,138,0.1)' : 'rgba(251,191,36,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px',
          }}>
            {venue.ownerClaimed ? '✅' : '🏪'}
          </div>
          <div>
            <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '14px', color: venue.ownerClaimed ? '#39D98A' : '#FBBF24', marginBottom: '2px' }}>
              {venue.ownerClaimed ? 'Listing claimed' : 'Listing unclaimed'}
            </div>
            <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: 'rgba(255,255,255,0.38)' }}>
              {venue.ownerClaimed
                ? 'You are verified as the owner of this place.'
                : 'Claim your listing to unlock all owner features.'}
            </div>
          </div>
        </div>
        {!venue.ownerClaimed && (
          <Link to={`/venue/${venue.slug}`} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginTop: '12px', padding: '11px', borderRadius: '10px', textDecoration: 'none',
            background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)',
            fontFamily: 'DM Sans, sans-serif', fontWeight: 700, fontSize: '13px', color: '#FBBF24',
          }}>
            Claim this place →
          </Link>
        )}
      </div>

      {/* ── Tool links ───────────────────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
        <SectionTitle>More settings</SectionTitle>
        <LinkRow to="/venue/hours"    emoji="🕐" label="Opening hours"   sub="Set detailed hours per day"            accent="#60A5FA" />
        <LinkRow to="/venue/edit"     emoji="✏️" label="Edit details"    sub="Name, phone, WhatsApp, description"    accent="#39D98A" />
        <LinkRow to="/venue/photos"   emoji="📷" label="Manage photos"   sub="Add or update venue photos"           accent="#A78BFA" />
        <LinkRow to="/venue/events"   emoji="🗓️" label="Events"          sub="Manage upcoming events"               accent="#F472B6" />
        <LinkRow to="/venue/qr-code"  emoji="📲" label="QR code"         sub="Download and print your check-in code" accent="#34D399" />
        <LinkRow to="/venue/analytics" emoji="📈" label="Analytics"      sub="Check-in insights and regulars"       accent="#FB923C" />
        <LinkRow to="/venue/boost"    emoji="👑" label="Boost your place" sub="Paid promotion coming soon"          accent="#FBBF24" />
      </div>

      {/* ── Danger zone / support ────────────────────────────────────── */}
      <div style={{ background: '#161B22', border: '1px solid #21262D', borderRadius: '16px', padding: '16px' }}>
        <SectionTitle>Support</SectionTitle>
        <a
          href="mailto:hello@kayaa.app?subject=Issue%20with%20my%20place"
          style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '11px 0', textDecoration: 'none', borderBottom: '1px solid rgba(255,255,255,0.05)',
          }}
        >
          <Settings size={15} color="rgba(255,255,255,0.35)" />
          <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: 'rgba(255,255,255,0.6)' }}>Report an issue</span>
          <ChevronRight size={14} color="rgba(255,255,255,0.2)" style={{ marginLeft: 'auto' }} />
        </a>
        <Link
          to="/help"
          style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '11px 0', textDecoration: 'none',
          }}
        >
          <Store size={15} color="rgba(255,255,255,0.35)" />
          <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: 'rgba(255,255,255,0.6)' }}>Help & FAQ</span>
          <ChevronRight size={14} color="rgba(255,255,255,0.2)" style={{ marginLeft: 'auto' }} />
        </Link>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// PAGE
// ══════════════════════════════════════════════════════════════════════════════

export default function OwnerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [venue,     setVenue]     = useState<Venue | null>(null);
  const [venueId,   setVenueId]   = useState<string | null>(null);
  const [stats,     setStats]     = useState<StudioStats | null>(null);
  const [weekViews, setWeekViews] = useState(0);
  const [loading,   setLoading]   = useState(true);
  const [tab,       setTab]       = useState<Tab>('overview');

  // Upload ref kept at page level so ProfileTab can trigger it without extra API calls
  const _uploadRef = useRef<HTMLInputElement>(null);
  void _uploadRef; // keep unused ref from triggering lint

  useEffect(() => {
    if (!user) return;
    load();
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  async function load() {
    const ownership = await getVenueOwnerByUserId(user!.id);
    if (!ownership) { setLoading(false); return; }

    const v = await getVenueById(ownership.venueId);
    if (!v) { setLoading(false); return; }

    setVenue(v);
    setVenueId(ownership.venueId);

    const [studioStats, viewsRes] = await Promise.all([
      getDashboardStats(v.id),
      supabase
        .from('venue_views')
        .select('id', { count: 'exact', head: true })
        .eq('venue_id', v.id)
        .gte('viewed_at', new Date(Date.now() - 7 * 86_400_000).toISOString()),
    ]);

    setStats(studioStats);
    setWeekViews(viewsRes.count ?? 0);
    setLoading(false);
  }

  function handleVenueUpdate(partial: Partial<Venue>) {
    setVenue(prev => prev ? { ...prev, ...partial } : prev);
  }

  // ── Auth gate ────────────────────────────────────────────────────────────
  if (!user) {
    return (
      <div style={{ minHeight: '70vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔒</div>
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: 'rgba(255,255,255,0.45)', marginBottom: '20px' }}>
          Sign in to manage your place
        </p>
        <Link to="/welcome" style={{ padding: '12px 28px', background: '#39D98A', borderRadius: '12px', textDecoration: 'none', fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '14px', color: '#000' }}>
          Sign in
        </Link>
      </div>
    );
  }

  if (loading) return <Skeleton />;
  if (!venue || !venueId) return <NoVenue />;

  return (
    <div style={{ paddingBottom: '100px' }}>

      {/* ── Sticky top bar ────────────────────────────────────────────── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 40,
        background: 'rgba(13,17,23,0.94)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid #21262D',
        padding: '10px 16px',
        display: 'flex', alignItems: 'center', gap: '10px',
      }}>
        <button
          onClick={() => navigate(-1)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', flexShrink: 0 }}
        >
          <ArrowLeft size={20} color="rgba(255,255,255,0.6)" />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '15px', color: '#F0F6FC', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {venue.name}
          </div>
          <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.38)' }}>
            Owner dashboard
          </div>
        </div>
        <Link
          to={`/venue/${venue.slug}`}
          style={{
            padding: '6px 11px', borderRadius: '8px', textDecoration: 'none',
            background: 'rgba(57,217,138,0.08)', border: '1px solid rgba(57,217,138,0.2)',
            fontFamily: 'DM Sans, sans-serif', fontWeight: 700, fontSize: '11px', color: '#39D98A',
            flexShrink: 0,
          }}
        >
          View →
        </Link>
      </div>

      {/* ── Tab bar ──────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', overflowX: 'auto', gap: '4px',
        padding: '10px 12px 0', scrollbarWidth: 'none',
        borderBottom: '1px solid #21262D',
      }}>
        <style>{`.tab-scroll::-webkit-scrollbar{display:none}`}</style>
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              padding: '8px 13px', borderRadius: '10px 10px 0 0',
              border: 'none', cursor: 'pointer', flexShrink: 0,
              background: tab === t.key ? '#161B22' : 'transparent',
              borderBottom: tab === t.key ? '2px solid #39D98A' : '2px solid transparent',
              fontFamily: 'DM Sans, sans-serif', fontWeight: 700, fontSize: '12px',
              color: tab === t.key ? '#F0F6FC' : 'rgba(255,255,255,0.38)',
              transition: 'all 0.15s',
            }}
          >
            <span style={{ fontSize: '14px' }}>{t.emoji}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Tab content ──────────────────────────────────────────────── */}
      <div style={{ padding: '16px' }}>
        {tab === 'overview' && (
          <OverviewTab venue={venue} stats={stats} weekViews={weekViews} onTabChange={setTab} />
        )}
        {tab === 'profile' && (
          <ProfileTab venue={venue} venueId={venueId} onVenueUpdate={handleVenueUpdate} />
        )}
        {tab === 'updates' && (
          <UpdatesTab venueId={venueId} />
        )}
        {tab === 'activity' && (
          <ActivityTab venueId={venueId} stats={stats} weekViews={weekViews} />
        )}
        {tab === 'settings' && (
          <SettingsTab venue={venue} venueId={venueId} onVenueUpdate={handleVenueUpdate} />
        )}
      </div>

      <style>{`
        @keyframes navLocPulse { 0%,100%{opacity:0.6} 50%{opacity:1} }
      `}</style>
    </div>
  );
}
