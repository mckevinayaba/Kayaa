import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Clock, Calendar } from 'lucide-react';
import { mockVenues, mockPosts, mockEvents, mockCheckIns } from '../lib/mockData';
import type { Venue, Event, Post } from '../types';

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

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

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
      background: 'var(--color-surface2)',
      marginBottom: mb,
    }} />
  );
}

function VenueSkeleton() {
  return (
    <div>
      {/* Hero skeleton */}
      <div style={{ background: 'var(--color-surface2)', height: '220px', marginBottom: '0' }} />
      <div style={{ padding: '16px' }}>
        <SkeletonBlock h={28} w="60%" mb={10} />
        <SkeletonBlock h={14} w="40%" mb={6} />
        <SkeletonBlock h={14} w="50%" mb={20} />
        {/* Stats */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
          {[1, 2, 3].map(i => <SkeletonBlock key={i} h={60} radius={12} />)}
        </div>
        {/* CTA */}
        <SkeletonBlock h={52} radius={14} mb={24} />
        {/* Social proof */}
        <SkeletonBlock h={18} w="50%" mb={12} />
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--color-surface2)' }} />
          ))}
        </div>
        <SkeletonBlock h={18} w="70%" mb={8} />
        <SkeletonBlock h={18} w="55%" mb={24} />
        {/* Event cards */}
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
      justifyContent: 'center', minHeight: '70vh', padding: '32px',
      textAlign: 'center',
    }}>
      <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏚️</div>
      <h2 style={{
        fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '20px',
        marginBottom: '8px', color: 'var(--color-text)',
      }}>
        This venue isn't on Kayaa yet
      </h2>
      <p style={{ fontSize: '14px', color: 'var(--color-muted)', lineHeight: 1.6, marginBottom: '28px' }}>
        Know this place? Help put it on the map for your community.
      </p>
      <Link to="/onboarding" style={{
        display: 'block', background: 'var(--color-accent)', color: '#000',
        textDecoration: 'none', borderRadius: '12px', padding: '13px 28px',
        fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '15px',
        marginBottom: '16px',
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
    <div style={{ position: 'relative', marginBottom: '0' }}>
      {/* Coloured gradient band */}
      <div style={{
        height: '200px',
        background: `linear-gradient(160deg, ${color}22 0%, #0D1117 100%)`,
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Subtle glow blob */}
        <div style={{
          position: 'absolute', top: '-40px', right: '-40px',
          width: '180px', height: '180px', borderRadius: '50%',
          background: `${color}18`,
          filter: 'blur(40px)',
        }} />

        {/* Back button */}
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

        {/* Large emoji avatar */}
        <div style={{
          position: 'absolute', bottom: '-28px', left: '16px',
          width: '64px', height: '64px', borderRadius: '18px',
          background: `${color}20`,
          border: `2px solid ${color}50`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '30px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
        }}>
          {emoji}
        </div>
      </div>

      {/* Name + badges row */}
      <div style={{ padding: '40px 16px 0', background: 'var(--color-bg)' }}>
        {/* Type badge + status */}
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

        {/* Name */}
        <h1 style={{
          fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '26px',
          color: 'var(--color-text)', lineHeight: 1.15, marginBottom: '8px',
        }}>
          {venue.name}
        </h1>

        {/* Location */}
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

        {/* Description */}
        <p style={{
          fontSize: '14px', color: 'var(--color-muted)', lineHeight: 1.65,
          marginBottom: '0',
        }}>
          {venue.description}
        </p>
      </div>
    </div>
  );
}

function StatsRow({ venue, eventsCount }: { venue: Venue; eventsCount: number }) {
  const todayCheckins = Math.max(1, Math.round(venue.checkinCount * 0.015));
  const stats = [
    { label: 'Regulars', value: venue.followerCount.toLocaleString() },
    { label: 'Today', value: `${todayCheckins} check-ins` },
    { label: 'Events', value: eventsCount > 0 ? `${eventsCount} this week` : 'None listed' },
  ];

  return (
    <div style={{ display: 'flex', gap: '8px', margin: '16px 0' }}>
      {stats.map(s => (
        <div key={s.label} style={{
          flex: 1, background: 'var(--color-surface)', border: '1px solid var(--color-border)',
          borderRadius: '12px', padding: '12px 8px', textAlign: 'center',
        }}>
          <div style={{
            fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '14px',
            color: 'var(--color-text)', marginBottom: '2px',
          }}>
            {s.value}
          </div>
          <div style={{ fontSize: '10px', color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {s.label}
          </div>
        </div>
      ))}
    </div>
  );
}

function CheckInCTA({ venue }: { venue: Venue }) {
  return (
    <Link
      to={`/venue/${venue.slug}/checkin`}
      style={{ textDecoration: 'none', display: 'block', marginBottom: '24px' }}
    >
      <div style={{
        background: 'var(--color-accent)', color: '#000',
        borderRadius: '14px', padding: '16px 20px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '16px',
        gap: '8px',
      }}>
        Check in here
      </div>
    </Link>
  );
}

function SocialProof({ venue }: { venue: Venue }) {
  const initials = REGULARS_BY_VENUE[venue.id] ?? ['A', 'B', 'C', 'D', 'E', 'F'];
  const newRegulars = Math.max(2, Math.round(venue.followerCount * 0.03));
  const busiest = BUSIEST_BY_CATEGORY[venue.category] ?? 'Popular with locals';

  return (
    <div style={{
      background: 'var(--color-surface)', border: '1px solid var(--color-border)',
      borderRadius: '14px', padding: '16px', marginBottom: '20px',
    }}>
      <h2 style={{
        fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '14px',
        color: 'var(--color-text)', marginBottom: '12px',
      }}>
        Who comes here
      </h2>

      <p style={{ fontSize: '13px', color: 'var(--color-muted)', marginBottom: '12px' }}>
        <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>{venue.followerCount.toLocaleString()}</span> people call this their spot
      </p>

      {/* Avatar row */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '12px', alignItems: 'center' }}>
        {initials.map((initial, i) => (
          <div key={i} style={{
            width: '36px', height: '36px', borderRadius: '50%',
            background: `${AVATAR_COLORS[i % AVATAR_COLORS.length]}20`,
            border: `2px solid ${AVATAR_COLORS[i % AVATAR_COLORS.length]}50`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '13px',
            color: AVATAR_COLORS[i % AVATAR_COLORS.length],
            flexShrink: 0,
          }}>
            {initial}
          </div>
        ))}
        <span style={{ fontSize: '12px', color: 'var(--color-muted)', marginLeft: '4px' }}>
          +{(venue.followerCount - initials.length).toLocaleString()}
        </span>
      </div>

      {/* Busiest time */}
      <div style={{
        borderTop: '1px solid var(--color-border)', paddingTop: '10px',
        display: 'flex', flexDirection: 'column', gap: '4px',
      }}>
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
        <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '15px' }}>
          What's happening
        </h2>
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
            Nothing on the calendar yet.{'\n'}Check back soon.
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
              {/* Date badge */}
              <div style={{
                flexShrink: 0, width: '48px',
                background: 'var(--color-surface2)', borderRadius: '10px',
                padding: '6px 4px', textAlign: 'center',
                border: '1px solid var(--color-border)',
              }}>
                <div style={{ fontSize: '10px', color: 'var(--color-accent)', fontWeight: 700, textTransform: 'uppercase' }}>
                  {new Date(event.startsAt).toLocaleDateString('en-ZA', { month: 'short' })}
                </div>
                <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '18px', color: 'var(--color-text)', lineHeight: 1 }}>
                  {new Date(event.startsAt).getDate()}
                </div>
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '14px',
                  color: 'var(--color-text)', marginBottom: '3px',
                }}>
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
                  <span style={{
                    fontSize: '12px', fontWeight: 700,
                    color: event.isFree ? '#39D98A' : 'var(--color-amber)',
                  }}>
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

function ActivitySection({ venueId }: { venueId: string }) {
  const posts = mockPosts.filter(p => p.venueId === venueId);
  const checkins = mockCheckIns.filter(c => c.venueId === venueId);

  type ActivityItem = { id: string; initial: string; text: string; time: string; color: string };

  const items: ActivityItem[] = [
    ...checkins.map((c, i) => ({
      id: `ci-${c.id}`,
      initial: c.userName[0],
      text: `${c.userName.split(' ')[0]} checked in${c.note ? ` · "${c.note}"` : ''}`,
      time: timeAgo(c.createdAt),
      color: AVATAR_COLORS[i % AVATAR_COLORS.length],
    })),
    ...posts.map((p, i) => ({
      id: `po-${p.id}`,
      initial: p.authorName[0],
      text: `${p.authorName.split(' ')[0]} left a note`,
      time: timeAgo(p.createdAt),
      color: AVATAR_COLORS[(i + 2) % AVATAR_COLORS.length],
    })),
  ].slice(0, 4);

  if (items.length === 0) return null;

  return (
    <div style={{ marginBottom: '20px' }}>
      <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '15px', marginBottom: '12px' }}>
        Latest
      </h2>
      <div style={{
        background: 'var(--color-surface)', border: '1px solid var(--color-border)',
        borderRadius: '14px', overflow: 'hidden',
      }}>
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
      <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '15px', marginBottom: '12px' }}>
        About this place
      </h2>
      <div style={{
        background: 'var(--color-surface)', border: '1px solid var(--color-border)',
        borderRadius: '14px', padding: '16px',
      }}>
        <p style={{ fontSize: '14px', color: 'var(--color-muted)', lineHeight: 1.7, marginBottom: '16px' }}>
          {venue.description}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid var(--color-border)', paddingTop: '14px' }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: 'var(--color-muted)', minWidth: '90px' }}>Type</span>
            <span style={{ fontSize: '13px', color: 'var(--color-text)', fontWeight: 600 }}>{venue.category}</span>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: 'var(--color-muted)', minWidth: '90px' }}>Neighbourhood</span>
            <span style={{ fontSize: '13px', color: 'var(--color-text)', fontWeight: 600 }}>{venue.neighborhood}, {venue.city}</span>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
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
      <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '15px', marginBottom: '12px' }}>
        What people say
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {posts.map(post => (
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
                <div style={{ fontSize: '11px', color: 'var(--color-muted)' }}>{timeAgo(post.createdAt)}</div>
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
      background: 'rgba(13,17,23,0.88)',
      backdropFilter: 'blur(12px)',
      borderTop: '1px solid var(--color-border)',
    }}>
      <Link
        to={`/venue/${venue.slug}/checkin`}
        style={{ textDecoration: 'none', display: 'block' }}
      >
        <div style={{
          background: 'var(--color-accent)', color: '#000',
          borderRadius: '12px', padding: '14px 20px',
          textAlign: 'center',
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

  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(t);
  }, [slug]);

  const venue = mockVenues.find(v => v.slug === slug);
  const venuePosts = venue ? mockPosts.filter(p => p.venueId === venue.id) : [];
  const venueEvents = venue ? mockEvents.filter(e => e.venueId === venue.id) : [];

  if (loading) return <VenueSkeleton />;
  if (!venue) return <VenueNotFound />;

  return (
    <div>
      <HeroSection venue={venue} onBack={() => navigate(-1)} />

      <div style={{ padding: '0 16px', paddingBottom: '100px' }}>
        <StatsRow venue={venue} eventsCount={venueEvents.length} />
        <CheckInCTA venue={venue} />
        <SocialProof venue={venue} />
        <EventsSection events={venueEvents} />
        <ActivitySection venueId={venue.id} />
        <AboutSection venue={venue} />
        <PostsSection posts={venuePosts} />
      </div>

      <StickyCheckinBar venue={venue} />
    </div>
  );
}
