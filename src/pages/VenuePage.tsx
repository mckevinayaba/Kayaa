import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Clock, Calendar, Users, MessageSquare, TrendingUp, CheckCircle2, Share2 } from 'lucide-react';
import ShareModal from '../components/ShareModal';
import { getVenueBySlug, getVenueEvents, getVenuePosts, getActiveStories, getVenueRecentStats } from '../lib/api';
import type { VenueRecentStats } from '../lib/api';
import { supabase } from '../lib/supabase';
import type { Venue, Event, Post, Story } from '../types';
import StoriesStrip from '../components/StoriesStrip';

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORY_EMOJI: Record<string, string> = {
  Barbershop: '✂️', Shisanyama: '🔥', Tavern: '🍺', Café: '☕',
  Church: '⛪', Carwash: '🚗', 'Spaza Shop': '🏪', Salon: '💅',
  Tutoring: '📚', 'Sports Ground': '⚽', 'Home Business': '🏠',
};

const CATEGORY_COLOR: Record<string, string> = {
  Barbershop: '#39D98A', Shisanyama: '#F5A623', Tavern: '#60A5FA',
  Café: '#F59E0B', Church: '#A78BFA', Carwash: '#34D399',
  'Spaza Shop': '#60A5FA', Salon: '#F472B6', Tutoring: '#34D399',
  'Sports Ground': '#FB923C', 'Home Business': '#94A3B8',
};

const BUSIEST_BY_CATEGORY: Record<string, string> = {
  Barbershop: 'Busiest on Saturdays · Usually from 10am',
  Shisanyama: 'Busiest on weekends · From 12pm',
  Church: 'Busiest on Sundays · From 9am',
  'Spaza Shop': 'Busy all day · Peaks around 6pm',
  Salon: 'Busiest on Fridays and Saturdays',
  Tutoring: 'Busiest Mon–Fri from 4pm',
  Tavern: 'Busiest Fri & Sat nights',
};

const AVATAR_COLORS = ['#39D98A', '#F5A623', '#60A5FA', '#F472B6', '#A78BFA', '#FB923C'];

const REGULARS_BY_VENUE: Record<string, string[]> = {
  '1': ['L', 'T', 'S', 'N', 'B', 'K'],
  '2': ['T', 'N', 'S', 'B', 'M', 'A'],
  '3': ['A', 'S', 'T', 'L', 'N', 'P'],
  '4': ['N', 'L', 'Z', 'A', 'T', 'K'],
  '5': ['B', 'S', 'T', 'N', 'M', 'L'],
  '6': ['S', 'T', 'N', 'B', 'L', 'A'],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const LIVE_TIMES = ['2 min ago', '18 min ago', '1 hour ago', '3 hours ago'];

function formatEventDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short' });
}

function formatEventTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' });
}

function getStatus(venue: Venue): { label: string; color: string } {
  if (!venue.isOpen) return { label: 'Closed', color: '#6B7280' };
  if (venue.checkinCount > 1000) return { label: 'Busy now', color: '#F5A623' };
  return { label: 'Open now', color: '#39D98A' };
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function SkeletonBlock({ w = '100%', h = 16, radius = 8, mb = 0 }: { w?: string | number; h?: number; radius?: number; mb?: number }) {
  return (
    <div style={{
      width: w, height: h, borderRadius: radius,
      background: 'var(--color-surface2)', marginBottom: mb,
    }} />
  );
}

function VenueSkeleton() {
  return (
    <div>
      <div style={{ background: 'var(--color-surface2)', height: '220px' }} />
      <div style={{ padding: '16px' }}>
        <SkeletonBlock h={28} w="60%" mb={10} />
        <SkeletonBlock h={14} w="40%" mb={6} />
        <SkeletonBlock h={14} w="50%" mb={20} />
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
          {[1, 2, 3].map(i => <SkeletonBlock key={i} h={60} radius={12} />)}
        </div>
        <SkeletonBlock h={52} radius={14} mb={24} />
        <SkeletonBlock h={18} w="50%" mb={12} />
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--color-surface2)' }} />
          ))}
        </div>
        <SkeletonBlock h={80} radius={12} mb={10} />
        <SkeletonBlock h={80} radius={12} mb={24} />
      </div>
    </div>
  );
}

// ─── 404 state ────────────────────────────────────────────────────────────────

function VenueNotFound() {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', minHeight: '70vh', padding: '32px', textAlign: 'center',
    }}>
      <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏚️</div>
      <h2 style={{
        fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '20px',
        marginBottom: '8px', color: 'var(--color-text)',
      }}>
        This place isn't on Kayaa yet
      </h2>
      <p style={{ fontSize: '14px', color: 'var(--color-muted)', lineHeight: 1.6, marginBottom: '28px' }}>
        Know this place? Help put it on the map for your community.
      </p>
      <Link to="/onboarding" style={{
        display: 'block', background: 'var(--color-accent)', color: '#000',
        textDecoration: 'none', borderRadius: '12px', padding: '13px 28px',
        fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '15px', marginBottom: '16px',
      }}>
        Add this place
      </Link>
      <Link to="/feed" style={{ fontSize: '14px', color: 'var(--color-muted)', textDecoration: 'none' }}>
        ← Back to feed
      </Link>
    </div>
  );
}

// ─── Sub-sections ─────────────────────────────────────────────────────────────

function HeroSection({ venue, onBack }: { venue: Venue; onBack: () => void }) {
  const emoji = CATEGORY_EMOJI[venue.category] ?? '📍';
  const color = CATEGORY_COLOR[venue.category] ?? '#39D98A';
  const status = getStatus(venue);

  return (
    <div style={{ position: 'relative' }}>
      <div style={{
        height: '200px',
        background: `linear-gradient(160deg, ${color}22 0%, #0D1117 100%)`,
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', top: '-40px', right: '-40px',
          width: '180px', height: '180px', borderRadius: '50%',
          background: `${color}18`, filter: 'blur(40px)',
        }} />
        <button
          onClick={onBack}
          style={{
            position: 'absolute', top: '16px', left: '16px',
            width: '36px', height: '36px', borderRadius: '50%',
            background: 'rgba(13,17,23,0.6)', border: '1px solid rgba(255,255,255,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', backdropFilter: 'blur(8px)',
          }}
        >
          <ArrowLeft size={16} color="#fff" />
        </button>
        <div style={{
          position: 'absolute', bottom: '-28px', left: '16px',
          width: '64px', height: '64px', borderRadius: '18px',
          background: `${color}20`, border: `2px solid ${color}50`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '30px', boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
        }}>
          {emoji}
        </div>
      </div>

      <div style={{ padding: '40px 16px 0', background: 'var(--color-bg)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
          <span style={{
            fontSize: '11px', fontWeight: 600, color,
            background: `${color}18`, padding: '3px 10px', borderRadius: '20px',
          }}>
            {venue.category}
          </span>
          <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: status.color, flexShrink: 0 }} />
          <span style={{ fontSize: '12px', fontWeight: 600, color: status.color }}>{status.label}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
          <h1 style={{
            fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '26px',
            color: 'var(--color-text)', lineHeight: 1.15, margin: 0,
          }}>
            {venue.name}
          </h1>
          {venue.isVerified && (
            <span
              title="This place has been confirmed by the Kayaa team"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '4px',
                background: 'rgba(57,217,138,0.12)', border: '1px solid rgba(57,217,138,0.3)',
                borderRadius: '20px', padding: '3px 8px', flexShrink: 0,
              }}
            >
              <CheckCircle2 size={12} color="#39D98A" />
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#39D98A', fontFamily: 'DM Sans, sans-serif' }}>
                Verified
              </span>
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: venue.openHours ? '4px' : '12px' }}>
          <MapPin size={13} color="var(--color-muted)" />
          <span style={{ fontSize: '13px', color: 'var(--color-muted)' }}>
            {venue.address} · {venue.neighborhood}, {venue.city}
          </span>
        </div>

        {venue.openHours && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '12px' }}>
            <Clock size={13} color="var(--color-muted)" />
            <span style={{ fontSize: '13px', color: 'var(--color-muted)' }}>{venue.openHours}</span>
          </div>
        )}

        <p style={{ fontSize: '14px', color: 'var(--color-muted)', lineHeight: 1.65 }}>
          {venue.description}
        </p>
      </div>
    </div>
  );
}

// ─── Trust signals helpers ────────────────────────────────────────────────────

const DAY_NUM: Record<string, number> = {
  mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6, sun: 7,
};

function parseDaysOpenPerWeek(hours?: string): number | null {
  if (!hours) return null;
  const h = hours.toLowerCase();
  if (/daily|7 day|every day/.test(h)) return 7;
  const counted = new Set<number>();
  const rangeRe = /\b(mon|tue|wed|thu|fri|sat|sun)\b\s*[–\-]\s*(mon|tue|wed|thu|fri|sat|sun)\b/g;
  let m: RegExpExecArray | null;
  while ((m = rangeRe.exec(h)) !== null) {
    const s = DAY_NUM[m[1]], e = DAY_NUM[m[2]];
    if (s && e) {
      if (e >= s) { for (let d = s; d <= e; d++) counted.add(d); }
      else { for (let d = s; d <= 7; d++) counted.add(d); for (let d = 1; d <= e; d++) counted.add(d); }
    }
  }
  if (counted.size > 0) {
    const pipeExtra = h.split('|').slice(1).join(' ');
    const dayRe = /\b(mon|tue|wed|thu|fri|sat|sun)\b/g;
    while ((m = dayRe.exec(pipeExtra)) !== null) if (DAY_NUM[m[1]]) counted.add(DAY_NUM[m[1]]);
    return counted.size;
  }
  const dayRe2 = /\b(mon|tue|wed|thu|fri|sat|sun)\b/g;
  while ((m = dayRe2.exec(h)) !== null) if (DAY_NUM[m[1]]) counted.add(DAY_NUM[m[1]]);
  return counted.size > 0 ? counted.size : null;
}

// ─── Trust Signals section ────────────────────────────────────────────────────

interface TrustSignalsProps {
  venue: Venue;
  events: Event[];
  posts: Post[];
  recentStats: VenueRecentStats;
  regularsCount: number;
}

function TrustSignals({ venue, events, posts, recentStats, regularsCount }: TrustSignalsProps) {
  const monthsActive = Math.max(1, Math.floor(
    (Date.now() - new Date(venue.createdAt).getTime()) / (30 * 24 * 60 * 60 * 1000)
  ));
  const daysOpen = parseDaysOpenPerWeek(venue.openHours);
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const hasRecentPosts = posts.some(p => new Date(p.createdAt).getTime() > thirtyDaysAgo);

  type Signal = { icon: React.ReactNode; text: string; sub: string };
  const signals: Signal[] = [];

  if (regularsCount > 0) signals.push({
    icon: <Users size={14} />,
    text: regularsCount.toLocaleString(),
    sub: 'regulars come back',
  });

  signals.push({
    icon: <Calendar size={14} />,
    text: `${monthsActive} month${monthsActive !== 1 ? 's' : ''}`,
    sub: 'active on Kayaa',
  });

  if (hasRecentPosts) signals.push({
    icon: <MessageSquare size={14} />,
    text: 'Responds',
    sub: 'to posts',
  });

  if (events.length > 0) signals.push({
    icon: <Calendar size={14} />,
    text: `${events.length}`,
    sub: 'events hosted',
  });

  if (daysOpen) signals.push({
    icon: <Clock size={14} />,
    text: `${daysOpen} days`,
    sub: 'a week',
  });

  if (recentStats.monthlyCheckins > 0) signals.push({
    icon: <TrendingUp size={14} />,
    text: recentStats.monthlyCheckins.toLocaleString(),
    sub: 'check-ins this month',
  });

  if (signals.length === 0) return null;

  return (
    <div style={{ margin: '12px 0 4px' }}>
      <div style={{
        display: 'flex', gap: '8px',
        overflowX: 'auto', scrollbarWidth: 'none',
        marginLeft: '-16px', paddingLeft: '16px',
        marginRight: '-16px', paddingRight: '16px',
        paddingBottom: '4px',
      } as React.CSSProperties}>
        {signals.map((sig, i) => (
          <div key={i} style={{
            flexShrink: 0,
            background: 'var(--color-surface)',
            border: '1px solid rgba(57,217,138,0.25)',
            borderRadius: '12px',
            padding: '10px 14px',
            display: 'flex', alignItems: 'center', gap: '8px',
            minWidth: 0,
          }}>
            <span style={{ color: '#39D98A', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
              {sig.icon}
            </span>
            <div>
              <div style={{
                fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '13px',
                color: 'var(--color-text)', lineHeight: 1.2, whiteSpace: 'nowrap',
              }}>
                {sig.text}
              </div>
              <div style={{ fontSize: '10px', color: 'var(--color-muted)', whiteSpace: 'nowrap' }}>
                {sig.sub}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Regulars love this place for ────────────────────────────────────────────

interface RegularsLoveProps {
  venue: Venue;
  events: Event[];
  posts: Post[];
  recentStats: VenueRecentStats;
}

function RegularsLoveThisFor({ venue, events, posts, recentStats }: RegularsLoveProps) {
  const reasons: string[] = [];
  if (venue.followerCount > 50) reasons.push('A strong regular community');
  if (events.length > 3) reasons.push('Regular events and activities');
  const fourteenDaysAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
  if (posts.some(p => new Date(p.createdAt).getTime() > fourteenDaysAgo))
    reasons.push('An active owner who shares updates');
  if (recentStats.weeklyCheckins > 10) reasons.push('Popular right now');
  const monthsActive = Math.floor(
    (Date.now() - new Date(venue.createdAt).getTime()) / (30 * 24 * 60 * 60 * 1000)
  );
  if (monthsActive >= 12) reasons.push('A long-standing neighbourhood place');

  if (reasons.length < 2) return null;

  return (
    <div style={{ marginBottom: '20px' }}>
      <h2 style={{
        fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '15px',
        color: 'var(--color-text)', marginBottom: '12px',
      }}>
        Regulars love this place for
      </h2>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {reasons.map(r => (
          <span key={r} style={{
            fontSize: '12px', fontWeight: 600, color: '#39D98A',
            background: 'rgba(57,217,138,0.1)', border: '1px solid rgba(57,217,138,0.2)',
            padding: '6px 12px', borderRadius: '20px',
            fontFamily: 'DM Sans, sans-serif',
          }}>
            {r}
          </span>
        ))}
      </div>
    </div>
  );
}

function formatWaNumber(n: string): string {
  const digits = n.replace(/\D/g, '');
  return digits.startsWith('0') ? '27' + digits.slice(1) : digits;
}

const CHECKIN_CTA_EMOJI: Record<string, string> = {
  Barbershop: '✂️', Shisanyama: '🔥', Tavern: '🍺', Café: '☕',
  Church: '⛪', Carwash: '🚗', 'Spaza Shop': '🏪', Salon: '💅',
  Tutoring: '📚', 'Sports Ground': '⚽', 'Home Business': '🏠',
};

function CheckInCTA({ venue }: { venue: Venue }) {
  const [shareOpen, setShareOpen] = useState(false);
  const waCheckinUrl = venue.whatsappNumber
    ? `https://wa.me/${formatWaNumber(venue.whatsappNumber)}?text=${encodeURIComponent(`Hi, I'd like to check in at ${venue.name}`)}`
    : null;

  return (
    <>
      <ShareModal
        type="place"
        data={{
          name: venue.name,
          slug: venue.slug,
          category: venue.category,
          emoji: CHECKIN_CTA_EMOJI[venue.category] ?? '📍',
          neighborhood: venue.neighborhood,
          city: venue.city,
          description: venue.description,
          checkinCount: venue.checkinCount,
          isOpen: venue.isOpen,
        }}
        isOpen={shareOpen}
        onClose={() => setShareOpen(false)}
      />
      <div style={{ marginBottom: '24px' }}>
        <Link to={`/venue/${venue.slug}/checkin`} style={{ textDecoration: 'none', display: 'block', marginBottom: '10px' }}>
          <div style={{
            background: 'var(--color-accent)', color: '#000',
            borderRadius: '14px', padding: '16px 20px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '16px',
          }}>
            Check in here
          </div>
        </Link>
        <button
          onClick={() => setShareOpen(true)}
          style={{
            width: '100%', background: 'transparent',
            border: '1.5px solid rgba(57,217,138,0.4)',
            borderRadius: '14px', padding: '14px 20px',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '15px',
            color: '#39D98A', cursor: 'pointer',
            marginBottom: waCheckinUrl ? '10px' : '0',
          }}
        >
          <Share2 size={16} color="#39D98A" />
          Share this place
        </button>
        {waCheckinUrl && (
          <a href={waCheckinUrl} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', display: 'block' }}>
            <div style={{
              background: 'transparent',
              border: '1px solid var(--color-border)',
              borderRadius: '14px', padding: '13px 20px',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: '14px',
              color: 'var(--color-muted)',
            }}>
              <span>💬</span>
              Can't scan? Check in on WhatsApp
            </div>
          </a>
        )}
      </div>
    </>
  );
}

function SocialProof({ venue, regularsCount }: { venue: Venue; regularsCount: number }) {
  const initials = REGULARS_BY_VENUE[venue.id] ?? ['A', 'B', 'C', 'D', 'E', 'F'];
  const newRegulars = Math.max(2, Math.round(regularsCount * 0.03));
  const busiest = BUSIEST_BY_CATEGORY[venue.category] ?? 'Popular with locals';

  return (
    <div style={{
      background: 'var(--color-surface)', border: '1px solid var(--color-border)',
      borderRadius: '14px', padding: '16px', marginBottom: '20px',
    }}>
      <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '14px', color: 'var(--color-text)', marginBottom: '12px' }}>
        Who comes here
      </h2>

      <p style={{ fontSize: '13px', color: 'var(--color-muted)', marginBottom: '12px' }}>
        <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>{regularsCount.toLocaleString()}</span> people call this their spot
      </p>

      <div style={{ display: 'flex', gap: '6px', marginBottom: '12px', alignItems: 'center' }}>
        {initials.map((initial, i) => (
          <div key={i} style={{
            width: '36px', height: '36px', borderRadius: '50%',
            background: `${AVATAR_COLORS[i % AVATAR_COLORS.length]}20`,
            border: `2px solid ${AVATAR_COLORS[i % AVATAR_COLORS.length]}50`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '13px',
            color: AVATAR_COLORS[i % AVATAR_COLORS.length], flexShrink: 0,
          }}>
            {initial}
          </div>
        ))}
        <span style={{ fontSize: '12px', color: 'var(--color-muted)', marginLeft: '4px' }}>
          +{Math.max(0, regularsCount - initials.length).toLocaleString()}
        </span>
      </div>

      <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '10px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <span style={{ fontSize: '12px', color: 'var(--color-muted)' }}>{busiest}</span>
        <span style={{ fontSize: '12px', color: 'var(--color-accent)', fontWeight: 600 }}>
          +{newRegulars} new regulars this week
        </span>
      </div>
    </div>
  );
}

function EventsSection({ events }: { events: Event[] }) {
  return (
    <div style={{ marginBottom: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '15px' }}>What's happening</h2>
        {events.length > 0 && (
          <span style={{
            fontSize: '11px', fontWeight: 700, color: 'var(--color-accent)',
            background: 'rgba(57,217,138,0.1)', padding: '2px 8px', borderRadius: '20px',
          }}>
            {events.length} upcoming
          </span>
        )}
      </div>

      {events.length === 0 ? (
        <div style={{
          background: 'var(--color-surface)', border: '1px solid var(--color-border)',
          borderRadius: '14px', padding: '24px 16px', textAlign: 'center',
        }}>
          <div style={{ fontSize: '28px', marginBottom: '8px' }}>📅</div>
          <p style={{ fontSize: '13px', color: 'var(--color-muted)', lineHeight: 1.5 }}>
            Nothing on the calendar yet. Check back soon.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {events.map(event => (
            <div key={event.id} style={{
              background: 'var(--color-surface)', border: '1px solid var(--color-border)',
              borderRadius: '14px', padding: '14px',
              display: 'flex', gap: '12px', alignItems: 'flex-start',
            }}>
              <div style={{
                flexShrink: 0, width: '48px',
                background: 'var(--color-surface2)', borderRadius: '10px',
                padding: '6px 4px', textAlign: 'center', border: '1px solid var(--color-border)',
              }}>
                <div style={{ fontSize: '10px', color: 'var(--color-accent)', fontWeight: 700, textTransform: 'uppercase' }}>
                  {new Date(event.startsAt).toLocaleDateString('en-ZA', { month: 'short' })}
                </div>
                <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '18px', color: 'var(--color-text)', lineHeight: 1 }}>
                  {new Date(event.startsAt).getDate()}
                </div>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '14px', color: 'var(--color-text)', marginBottom: '3px' }}>
                  {event.title}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--color-muted)', marginBottom: '6px', lineHeight: 1.4 }}>
                  {event.description}
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '12px', color: 'var(--color-muted)' }}>
                    <Calendar size={11} />
                    {formatEventDate(event.startsAt)} · {formatEventTime(event.startsAt)}
                  </span>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: event.isFree ? '#39D98A' : 'var(--color-amber)' }}>
                    {event.isFree ? 'Free' : `R${event.price}`}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ActivitySection({ posts }: { posts: Post[] }) {
  type ActivityItem = { id: string; initial: string; text: string; time: string; color: string };

  const items: ActivityItem[] = posts.slice(0, 4).map((p, i) => ({
    id: `po-${p.id}`,
    initial: p.authorName[0],
    text: p.content.length > 55 ? p.content.slice(0, 55) + '…' : p.content,
    time: LIVE_TIMES[i % LIVE_TIMES.length],
    color: AVATAR_COLORS[i % AVATAR_COLORS.length],
  }));

  if (items.length === 0) return null;

  return (
    <div style={{ marginBottom: '20px' }}>
      <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '15px', marginBottom: '12px' }}>Latest</h2>
      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '14px', overflow: 'hidden' }}>
        {items.map((item, i) => (
          <div key={item.id} style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '12px 14px',
            borderBottom: i < items.length - 1 ? '1px solid var(--color-border)' : 'none',
          }}>
            <div style={{
              width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0,
              background: `${item.color}18`, border: `1.5px solid ${item.color}40`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '12px', color: item.color,
            }}>
              {item.initial}
            </div>
            <span style={{ flex: 1, fontSize: '13px', color: 'var(--color-muted)' }}>{item.text}</span>
            <span style={{ fontSize: '11px', color: 'var(--color-muted)', opacity: 0.6, flexShrink: 0 }}>{item.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function AboutSection({ venue }: { venue: Venue }) {
  const year = new Date(venue.createdAt).getFullYear();

  return (
    <div style={{ marginBottom: '20px' }}>
      <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '15px', marginBottom: '12px' }}>About this place</h2>
      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '14px', padding: '16px' }}>
        <p style={{ fontSize: '14px', color: 'var(--color-muted)', lineHeight: 1.7, marginBottom: '16px' }}>
          {venue.description}
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid var(--color-border)', paddingTop: '14px' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <span style={{ fontSize: '13px', color: 'var(--color-muted)', minWidth: '90px' }}>Type</span>
            <span style={{ fontSize: '13px', color: 'var(--color-text)', fontWeight: 600 }}>{venue.category}</span>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <span style={{ fontSize: '13px', color: 'var(--color-muted)', minWidth: '90px' }}>Neighbourhood</span>
            <span style={{ fontSize: '13px', color: 'var(--color-text)', fontWeight: 600 }}>{venue.neighborhood}, {venue.city}</span>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <span style={{ fontSize: '13px', color: 'var(--color-muted)', minWidth: '90px' }}>On Kayaa since</span>
            <span style={{ fontSize: '13px', color: 'var(--color-text)', fontWeight: 600 }}>{year}</span>
          </div>
          {venue.tags.length > 0 && (
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '4px' }}>
              {venue.tags.map(tag => (
                <span key={tag} style={{
                  fontSize: '11px', color: 'var(--color-muted)',
                  background: 'var(--color-surface2)', border: '1px solid var(--color-border)',
                  borderRadius: '20px', padding: '3px 10px',
                }}>
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PostsSection({ posts }: { posts: Post[] }) {
  if (posts.length === 0) return null;

  return (
    <div style={{ marginBottom: '20px' }}>
      <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '15px', marginBottom: '12px' }}>What people say</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {posts.map((post, idx) => (
          <div key={post.id} style={{
            background: 'var(--color-surface)', border: '1px solid var(--color-border)',
            borderRadius: '14px', padding: '14px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <div style={{
                width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0,
                background: 'rgba(57,217,138,0.1)', border: '1.5px solid rgba(57,217,138,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '13px', color: '#39D98A',
              }}>
                {post.authorName[0]}
              </div>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text)' }}>
                  {post.authorName.split(' ')[0]}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--color-muted)' }}>{LIVE_TIMES[idx % LIVE_TIMES.length]}</div>
              </div>
            </div>
            <p style={{ fontSize: '14px', color: 'var(--color-text)', lineHeight: 1.6, marginBottom: '10px' }}>
              {post.content}
            </p>
            <div style={{ display: 'flex', gap: '14px' }}>
              <span style={{ fontSize: '12px', color: 'var(--color-muted)' }}>❤️ {post.likeCount}</span>
              <span style={{ fontSize: '12px', color: 'var(--color-muted)' }}>💬 {post.commentCount}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StickyCheckinBar({ venue }: { venue: Venue }) {
  return (
    <div style={{
      position: 'fixed', bottom: '64px', left: 0, right: 0, zIndex: 45,
      padding: '10px 16px',
      background: 'rgba(13,17,23,0.88)', backdropFilter: 'blur(12px)',
      borderTop: '1px solid var(--color-border)',
    }}>
      <Link to={`/venue/${venue.slug}/checkin`} style={{ textDecoration: 'none', display: 'block' }}>
        <div style={{
          background: 'var(--color-accent)', color: '#000',
          borderRadius: '12px', padding: '14px 20px', textAlign: 'center',
          fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '15px',
        }}>
          Check in at {venue.name.split("'")[0].trim()}
        </div>
      </Link>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function VenuePage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [venue, setVenue] = useState<Venue | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [regularsCount, setRegularsCount] = useState(0);
  const [recentStats, setRecentStats] = useState<VenueRecentStats>({ monthlyCheckins: 0, weeklyCheckins: 0 });

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    setNotFound(false);

    getVenueBySlug(slug).then(v => {
      if (!v) { setNotFound(true); setLoading(false); return; }
      setVenue(v);
      setRegularsCount(v.followerCount);
      setLoading(false);

      // Fetch events, posts, stories, recent stats in parallel
      getVenueEvents(v.id).then(setEvents);
      getVenuePosts(v.id).then(setPosts);
      getActiveStories(v.id).then(setStories);
      getVenueRecentStats(v.id).then(setRecentStats);

      // Realtime: listen for new check-ins and bump the regulars counter
      const channel = supabase
        .channel(`checkins-${v.id}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'check_ins', filter: `venue_id=eq.${v.id}` },
          () => setRegularsCount(n => n + 1)
        )
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    });
  }, [slug]);

  if (loading) return <VenueSkeleton />;
  if (notFound || !venue) return <VenueNotFound />;

  return (
    <div>
      <HeroSection venue={venue} onBack={() => navigate(-1)} />

      <div style={{ padding: '0 16px', paddingBottom: '100px' }}>
        <TrustSignals venue={venue} events={events} posts={posts} recentStats={recentStats} regularsCount={regularsCount} />
        <RegularsLoveThisFor venue={venue} events={events} posts={posts} recentStats={recentStats} />
        {stories.length > 0 && <StoriesStrip stories={stories} />}
        <CheckInCTA venue={venue} />
        <SocialProof venue={venue} regularsCount={regularsCount} />
        <EventsSection events={events} />
        <ActivitySection posts={posts} />
        <AboutSection venue={venue} />
        <PostsSection posts={posts} />
      </div>

      <StickyCheckinBar venue={venue} />
    </div>
  );
}
