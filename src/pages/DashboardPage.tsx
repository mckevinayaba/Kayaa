import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, ExternalLink, Search } from 'lucide-react';
import { mockVenues, mockEvents } from '../lib/mockData';

// ─── Mock data for owner's venue ──────────────────────────────────────────────

const venue = mockVenues[0]; // Uncle Dee's Barbershop
const upcomingEvents = mockEvents.filter(e => e.venueId === venue.id);

const MOCK_CHECKINS = [
  { id: 't1', name: 'Lerato K.',  time: '2 min ago',  visits: 23, isFirst: false, isGhost: false },
  { id: 't2', name: 'Thabo M.',   time: '14 min ago', visits: 8,  isFirst: false, isGhost: false },
  { id: 't3', name: 'Anonymous',  time: '22 min ago', visits: 0,  isFirst: false, isGhost: true  },
  { id: 't4', name: 'Sipho D.',   time: '1 hr ago',   visits: 1,  isFirst: true,  isGhost: false },
  { id: 't5', name: 'Nomsa P.',   time: '2 hrs ago',  visits: 12, isFirst: false, isGhost: false },
  { id: 't6', name: 'Bongani T.', time: '3 hrs ago',  visits: 4,  isFirst: false, isGhost: false },
];

const MOCK_REGULARS = [
  { id: 'r1', name: 'Lerato K.',   visits: 23, lastSeen: 'Today',       initial: 'L' },
  { id: 'r2', name: 'Thabo M.',    visits: 18, lastSeen: 'Today',       initial: 'T' },
  { id: 'r3', name: 'Nomsa P.',    visits: 12, lastSeen: '2 days ago',  initial: 'N' },
  { id: 'r4', name: 'Sipho D.',    visits: 8,  lastSeen: 'Today',       initial: 'S' },
  { id: 'r5', name: 'Bongani T.',  visits: 7,  lastSeen: '3 days ago',  initial: 'B' },
  { id: 'r6', name: 'Ayanda Z.',   visits: 6,  lastSeen: '1 week ago',  initial: 'A' },
  { id: 'r7', name: 'Khumalo M.',  visits: 5,  lastSeen: '2 days ago',  initial: 'K' },
  { id: 'r8', name: 'Zanele N.',   visits: 3,  lastSeen: '1 week ago',  initial: 'Z' },
  { id: 'r9', name: 'Palesa T.',   visits: 2,  lastSeen: '5 days ago',  initial: 'P' },
];

const AVATAR_COLORS = ['#39D98A', '#F5A623', '#60A5FA', '#F472B6', '#A78BFA', '#FB923C'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function getTodayLabel() {
  return new Date().toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long' });
}

function avatarColor(index: number) {
  return AVATAR_COLORS[index % AVATAR_COLORS.length];
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

// ─── Tab content ──────────────────────────────────────────────────────────────

function HomeTab() {
  const [postText, setPostText] = useState('');
  const [posted, setPosted] = useState(false);

  function handlePost() {
    if (!postText.trim()) return;
    setPosted(true);
    setPostText('');
    setTimeout(() => setPosted(false), 2500);
  }

  return (
    <div>
      {/* Who came in today */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{
          fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '15px',
          marginBottom: '12px', color: 'var(--color-text)',
        }}>
          Who came in today
        </h2>

        <div style={{
          background: 'var(--color-surface)', border: '1px solid var(--color-border)',
          borderRadius: '14px', overflow: 'hidden',
        }}>
          {MOCK_CHECKINS.map((ci, i) => {
            const color = ci.isGhost ? '#6B7280' : avatarColor(i);
            return (
              <div key={ci.id} style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                padding: '12px 14px',
                borderBottom: i < MOCK_CHECKINS.length - 1 ? '1px solid var(--color-border)' : 'none',
              }}>
                <Avatar
                  initial={ci.isGhost ? '?' : ci.name[0]}
                  color={color}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: '14px', fontWeight: 600,
                    color: ci.isGhost ? 'var(--color-muted)' : 'var(--color-text)',
                  }}>
                    {ci.isGhost ? 'Anonymous' : ci.name.split(' ')[0]}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--color-muted)' }}>{ci.time}</div>
                </div>
                {ci.isGhost ? (
                  <Pill label="Anonymous · counted" color="#9CA3AF" bg="rgba(107,114,128,0.12)" />
                ) : ci.isFirst ? (
                  <Pill label="First visit" color="#F5A623" bg="rgba(245,166,35,0.12)" />
                ) : (
                  <Pill label={`${ci.visits} visits`} color="#39D98A" bg="rgba(57,217,138,0.1)" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick actions */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{
          fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '15px',
          marginBottom: '12px', color: 'var(--color-text)',
        }}>
          Quick actions
        </h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          {[
            { label: 'Post update', color: 'var(--color-text)', bg: 'var(--color-surface)', border: 'var(--color-border)' },
            { label: 'Add event',   color: 'var(--color-text)', bg: 'var(--color-surface)', border: 'var(--color-border)' },
          ].map(a => (
            <button key={a.label} style={{
              flex: 1, padding: '12px 8px', borderRadius: '12px',
              background: a.bg, border: `1px solid ${a.border}`,
              color: a.color, fontSize: '13px', fontWeight: 600,
              fontFamily: 'DM Sans, sans-serif', cursor: 'pointer',
              minHeight: '48px',
            }}>
              {a.label}
            </button>
          ))}
          <Link to={`/venue/${venue.slug}`} style={{ textDecoration: 'none', flex: 1 }}>
            <button style={{
              width: '100%', padding: '12px 8px', borderRadius: '12px',
              background: 'rgba(57,217,138,0.08)', border: '1px solid rgba(57,217,138,0.25)',
              color: 'var(--color-accent)', fontSize: '13px', fontWeight: 600,
              fontFamily: 'DM Sans, sans-serif', cursor: 'pointer',
              minHeight: '48px',
            }}>
              View page
            </button>
          </Link>
        </div>
      </div>

      {/* Post box */}
      <div>
        <h2 style={{
          fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '15px',
          marginBottom: '12px', color: 'var(--color-text)',
        }}>
          Post an update
        </h2>
        <div style={{
          background: 'var(--color-surface)', border: '1px solid var(--color-border)',
          borderRadius: '14px', padding: '14px',
        }}>
          <textarea
            value={postText}
            onChange={e => setPostText(e.target.value)}
            placeholder="What's happening today at the shop..."
            maxLength={200}
            style={{
              width: '100%', minHeight: '80px',
              background: 'transparent', border: 'none', outline: 'none',
              color: 'var(--color-text)', fontSize: '14px',
              fontFamily: 'DM Sans, sans-serif', resize: 'none',
              lineHeight: 1.5,
            }}
          />
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginTop: '8px', paddingTop: '8px', borderTop: '1px solid var(--color-border)',
          }}>
            <span style={{ fontSize: '11px', color: 'var(--color-muted)' }}>{postText.length}/200</span>
            <button
              onClick={handlePost}
              style={{
                background: posted ? 'rgba(57,217,138,0.2)' : 'var(--color-accent)',
                color: posted ? 'var(--color-accent)' : '#000',
                border: 'none', borderRadius: '10px', padding: '8px 20px',
                fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '13px',
                cursor: 'pointer', transition: 'all 0.2s',
              }}
            >
              {posted ? 'Posted ✓' : 'Post'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function RegularsTab() {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() =>
    MOCK_REGULARS.filter(r => r.name.toLowerCase().includes(query.toLowerCase())),
    [query]
  );

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '15px' }}>
          {MOCK_REGULARS.length} regulars
        </h2>
        <span style={{ fontSize: '12px', color: 'var(--color-accent)', fontWeight: 600 }}>
          +{Math.round(venue.followerCount * 0.03)} this week
        </span>
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: '16px' }}>
        <Search size={14} color="var(--color-muted)" style={{
          position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none',
        }} />
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search regulars..."
          style={{
            width: '100%', background: 'var(--color-surface)',
            border: '1px solid var(--color-border)', borderRadius: '12px',
            padding: '11px 12px 11px 34px',
            color: 'var(--color-text)', fontSize: '14px',
            fontFamily: 'DM Sans, sans-serif', outline: 'none',
            boxSizing: 'border-box',
          }}
        />
      </div>

      {/* List */}
      <div style={{
        background: 'var(--color-surface)', border: '1px solid var(--color-border)',
        borderRadius: '14px', overflow: 'hidden',
      }}>
        {filtered.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--color-muted)', fontSize: '14px' }}>
            No regulars match that name
          </div>
        ) : filtered.map((r, i) => (
          <div key={r.id} style={{
            display: 'flex', alignItems: 'center', gap: '12px',
            padding: '12px 14px',
            borderBottom: i < filtered.length - 1 ? '1px solid var(--color-border)' : 'none',
          }}>
            <Avatar initial={r.initial} color={avatarColor(i)} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '2px' }}>{r.name}</div>
              <div style={{ fontSize: '11px', color: 'var(--color-muted)' }}>Last seen {r.lastSeen}</div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{
                fontFamily: 'Syne, sans-serif', fontWeight: 700,
                fontSize: '15px', color: 'var(--color-accent)',
              }}>
                {r.visits}
              </div>
              <div style={{ fontSize: '10px', color: 'var(--color-muted)' }}>visits</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function EventsTab() {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '15px' }}>
          Upcoming events
        </h2>
        {upcomingEvents.length > 0 && (
          <span style={{
            fontSize: '11px', fontWeight: 700, color: 'var(--color-accent)',
            background: 'rgba(57,217,138,0.1)', padding: '2px 8px', borderRadius: '20px',
          }}>
            {upcomingEvents.length} on
          </span>
        )}
      </div>

      {upcomingEvents.length === 0 ? (
        <div style={{
          background: 'var(--color-surface)', border: '1px solid var(--color-border)',
          borderRadius: '14px', padding: '32px', textAlign: 'center',
        }}>
          <div style={{ fontSize: '32px', marginBottom: '10px' }}>📅</div>
          <p style={{ fontSize: '14px', color: 'var(--color-muted)', lineHeight: 1.5 }}>
            Nothing on the calendar yet.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
          {upcomingEvents.map(event => (
            <div key={event.id} style={{
              background: 'var(--color-surface)', border: '1px solid var(--color-border)',
              borderRadius: '14px', padding: '14px',
              display: 'flex', gap: '12px', alignItems: 'flex-start',
            }}>
              <div style={{
                flexShrink: 0, width: '48px',
                background: 'var(--color-surface2)', borderRadius: '10px',
                padding: '6px 4px', textAlign: 'center',
                border: '1px solid var(--color-border)',
              }}>
                <div style={{ fontSize: '10px', color: 'var(--color-accent)', fontWeight: 700, textTransform: 'uppercase' }}>
                  {new Date(event.startsAt).toLocaleDateString('en-ZA', { month: 'short' })}
                </div>
                <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '18px', lineHeight: 1 }}>
                  {new Date(event.startsAt).getDate()}
                </div>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '14px', marginBottom: '3px' }}>
                  {event.title}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--color-muted)', marginBottom: '6px', lineHeight: 1.4 }}>
                  {event.description}
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', color: 'var(--color-muted)' }}>
                    {new Date(event.startsAt).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })}
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

      <button style={{
        width: '100%', minHeight: '52px',
        background: 'var(--color-surface)', border: '1px solid var(--color-border)',
        borderRadius: '14px', color: 'var(--color-accent)',
        fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '14px',
        cursor: 'pointer',
      }}>
        + Add event
      </button>
    </div>
  );
}

function SettingsTab() {
  const [publicPage, setPublicPage]           = useState(true);
  const [showRegulars, setShowRegulars]       = useState(true);
  const [quietCheckins, setQuietCheckins]     = useState(true);

  return (
    <div>
      {/* Venue info */}
      <div style={{
        background: 'var(--color-surface)', border: '1px solid var(--color-border)',
        borderRadius: '14px', padding: '16px', marginBottom: '16px',
      }}>
        <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '16px', marginBottom: '8px' }}>
          {venue.name}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
          <MapPin size={12} color="var(--color-muted)" />
          <span style={{ fontSize: '13px', color: 'var(--color-muted)' }}>
            {venue.address} · {venue.neighborhood}, {venue.city}
          </span>
        </div>
        {venue.openHours && (
          <div style={{ fontSize: '12px', color: 'var(--color-muted)' }}>{venue.openHours}</div>
        )}
      </div>

      {/* Plan card */}
      <div style={{
        background: 'rgba(57,217,138,0.05)',
        border: '1px solid rgba(57,217,138,0.2)',
        borderRadius: '14px', padding: '14px 16px', marginBottom: '16px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div>
          <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '14px', color: 'var(--color-accent)', marginBottom: '2px' }}>
            Kayaa Starter
          </div>
          <div style={{ fontSize: '12px', color: 'var(--color-muted)' }}>Free during pilot</div>
        </div>
        <span style={{
          fontSize: '11px', fontWeight: 700, color: '#39D98A',
          background: 'rgba(57,217,138,0.12)', padding: '4px 10px', borderRadius: '20px',
        }}>
          Active
        </span>
      </div>

      {/* Toggles */}
      <div style={{
        background: 'var(--color-surface)', border: '1px solid var(--color-border)',
        borderRadius: '14px', padding: '0 16px', marginBottom: '16px',
      }}>
        <ToggleRow
          label="Public venue page"
          sub="Anyone with the link can see your page"
          checked={publicPage}
          onChange={setPublicPage}
        />
        <ToggleRow
          label="Show regulars count publicly"
          sub="Visitors can see how many regulars you have"
          checked={showRegulars}
          onChange={setShowRegulars}
        />
        <ToggleRow
          label="Allow quiet check-ins"
          sub="Regulars can check in anonymously"
          checked={quietCheckins}
          onChange={setQuietCheckins}
        />
      </div>

      {/* Public page link */}
      <Link to={`/venue/${venue.slug}`} style={{ textDecoration: 'none' }}>
        <div style={{
          background: 'var(--color-surface)', border: '1px solid var(--color-border)',
          borderRadius: '14px', padding: '14px 16px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text)' }}>
            View your public page
          </span>
          <ExternalLink size={15} color="var(--color-accent)" />
        </div>
      </Link>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type Tab = 'home' | 'regulars' | 'events' | 'settings';
const TABS: { key: Tab; label: string }[] = [
  { key: 'home',     label: 'Home'     },
  { key: 'regulars', label: 'Regulars' },
  { key: 'events',   label: 'Events'   },
  { key: 'settings', label: 'Settings' },
];

const METRICS = [
  { value: MOCK_CHECKINS.length.toString(), label: 'today',        accent: true  },
  { value: venue.followerCount.toString(),  label: 'regulars',     accent: false },
  { value: Math.round(venue.followerCount * 0.03).toString(), label: 'new regulars', accent: false },
  { value: upcomingEvents.length.toString(), label: 'upcoming',    accent: false },
];

export default function DashboardPage() {
  const [tab, setTab] = useState<Tab>('home');

  return (
    <>
      <style>{`
        @keyframes livePulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.4; transform: scale(0.75); }
        }
        .live-dot { animation: livePulse 1.8s ease-in-out infinite; }
      `}</style>

      <div style={{ padding: '16px 16px 0' }}>

        {/* ── Header ── */}
        <div style={{ marginBottom: '20px' }}>
          <p style={{ fontSize: '13px', color: 'var(--color-muted)', marginBottom: '4px' }}>
            {getGreeting()}, Uncle Dee 👋
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '20px', lineHeight: 1.2 }}>
              {venue.name}
            </h1>
            <div className="live-dot" style={{
              width: '8px', height: '8px', borderRadius: '50%',
              background: '#39D98A', flexShrink: 0,
            }} />
          </div>
          <p style={{ fontSize: '12px', color: 'var(--color-muted)' }}>{getTodayLabel()}</p>
        </div>

        {/* ── Metrics row — horizontal scroll ── */}
        <div style={{
          display: 'flex', gap: '10px',
          overflowX: 'auto', scrollbarWidth: 'none',
          marginLeft: '-16px', paddingLeft: '16px',
          marginRight: '-16px', paddingRight: '16px',
          paddingBottom: '4px', marginBottom: '4px',
          WebkitOverflowScrolling: 'touch',
        } as React.CSSProperties}>
          {METRICS.map((m, i) => (
            <div key={i} style={{
              flexShrink: 0, minWidth: '100px',
              background: 'var(--color-surface)',
              border: `1px solid ${m.accent ? 'rgba(57,217,138,0.3)' : 'var(--color-border)'}`,
              borderRadius: '14px', padding: '14px 12px',
            }}>
              <div style={{
                fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '26px',
                color: m.accent ? 'var(--color-accent)' : 'var(--color-text)',
                lineHeight: 1, marginBottom: '4px',
              }}>
                {m.value}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {m.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Sticky tab bar ── */}
      <div style={{
        position: 'sticky', top: '56px', zIndex: 30,
        background: 'var(--color-bg)',
        borderBottom: '1px solid var(--color-border)',
        padding: '0 16px',
        display: 'flex', gap: '0',
        marginBottom: '20px',
      }}>
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              flex: 1, padding: '12px 4px',
              background: 'transparent',
              border: 'none',
              borderBottom: tab === t.key ? '2px solid var(--color-accent)' : '2px solid transparent',
              color: tab === t.key ? 'var(--color-accent)' : 'var(--color-muted)',
              fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: '13px',
              cursor: 'pointer', transition: 'color 0.15s, border-color 0.15s',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Tab content ── */}
      <div style={{ padding: '0 16px 120px' }}>
        {tab === 'home'     && <HomeTab />}
        {tab === 'regulars' && <RegularsTab />}
        {tab === 'events'   && <EventsTab />}
        {tab === 'settings' && <SettingsTab />}
      </div>
    </>
  );
}
