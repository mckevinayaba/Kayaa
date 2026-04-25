import { useState, useMemo, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, ExternalLink, Search, Plus, Download } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import {
  getVenueOwnerByUserId, getVenueById, getRecentCheckIns, getVenueRegulars,
  getVenueEvents, createPost, createEvent, updateVenueSettings, createStory,
  getUserCheckInHistoryLocal, getVisitorId,
} from '../lib/api';
import type { DashboardCheckIn, Regular } from '../lib/api';
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

function avatarColor(index: number) {
  return AVATAR_COLORS[index % AVATAR_COLORS.length];
}

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
  venueId: string;
  venueCreatedAt: string;
  venueDescription: string;
  checkinCount: number;
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
    { key: 'register',     label: 'Register your place',                       done: true },
    { key: 'description',  label: 'Add a description (20+ characters)',         done: venueDescription.trim().length >= 20 },
    { key: 'share',        label: 'Share your check-in link with a customer',   done: !!ticked.share },
    { key: 'first_checkin',label: 'Get your first check-in',                    done: checkinCount > 0 },
    { key: 'post',         label: 'Post an update',                             done: !!ticked.post },
    { key: 'event',        label: 'Add an event',                               done: !!ticked.event },
    { key: 'board',        label: 'Add to the neighbourhood board',             done: !!ticked.board },
  ];

  const doneCount = items.filter(i => i.done).length;
  const allDone = doneCount === items.length;

  if (allDone) {
    return (
      <div style={{
        marginBottom: '24px', background: 'rgba(57,217,138,0.06)',
        border: '1px solid rgba(57,217,138,0.2)', borderRadius: '14px',
        padding: '20px', textAlign: 'center',
      }}>
        <div style={{ fontSize: '28px', marginBottom: '8px' }}>🎉</div>
        <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '15px', color: 'var(--color-accent)', marginBottom: '4px' }}>
          You're all set!
        </div>
        <div style={{ fontSize: '13px', color: 'var(--color-muted)' }}>
          Your place is fully launched on Kayaa.
        </div>
      </div>
    );
  }

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
          <div
            key={item.key}
            onClick={() => !item.done && tick(item.key)}
            style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '9px 0',
              borderBottom: i < items.length - 1 ? '1px solid var(--color-border)' : 'none',
              cursor: item.done ? 'default' : 'pointer',
            }}
          >
            <div style={{
              width: '20px', height: '20px', borderRadius: '50%', flexShrink: 0,
              background: item.done ? 'rgba(57,217,138,0.15)' : 'transparent',
              border: `1.5px solid ${item.done ? '#39D98A' : 'var(--color-border)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {item.done && <span style={{ fontSize: '11px', color: '#39D98A' }}>✓</span>}
            </div>
            <span style={{ fontSize: '13px', color: item.done ? 'var(--color-muted)' : 'var(--color-text)', textDecoration: item.done ? 'line-through' : 'none' }}>
              {item.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Tab: Home ────────────────────────────────────────────────────────────────

function HomeTab({ checkIns, venueId, venueSlug, venueCreatedAt, venueDescription, checkinCount }: {
  checkIns: DashboardCheckIn[];
  venueId: string;
  venueSlug: string;
  venueCreatedAt: string;
  venueDescription: string;
  checkinCount: number;
}) {
  const [postText, setPostText] = useState('');
  const [posting, setPosting] = useState(false);
  const [posted, setPosted] = useState(false);
  const [postError, setPostError] = useState('');

  const [storyText, setStoryText] = useState('');
  const [postingStory, setPostingStory] = useState(false);
  const [storyPosted, setStoryPosted] = useState(false);
  const [storyError, setStoryError] = useState('');

  async function handlePost() {
    if (!postText.trim()) return;
    setPosting(true);
    setPostError('');
    const { error } = await createPost({ venue_id: venueId, content: postText.trim() });
    setPosting(false);
    if (error) { setPostError('Could not post. Try again.'); return; }
    setPosted(true);
    setPostText('');
    setTimeout(() => setPosted(false), 2500);
  }

  async function handleStory() {
    if (!storyText.trim()) return;
    setPostingStory(true);
    setStoryError('');
    const { error } = await createStory(venueId, storyText.trim());
    setPostingStory(false);
    if (error) { setStoryError('Could not post story. Try again.'); return; }
    setStoryPosted(true);
    setStoryText('');
    setTimeout(() => setStoryPosted(false), 3000);
  }

  const todayCheckIns = checkIns.filter(ci => isToday(ci.createdAt));

  return (
    <div>
      <PilotChecklist
        venueId={venueId}
        venueCreatedAt={venueCreatedAt}
        venueDescription={venueDescription}
        checkinCount={checkinCount}
      />
      {/* Who came in today */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{
          fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '15px',
          marginBottom: '12px', color: 'var(--color-text)',
        }}>
          Who came in today
        </h2>

        {todayCheckIns.length === 0 ? (
          <div style={{
            background: 'var(--color-surface)', border: '1px solid var(--color-border)',
            borderRadius: '14px', padding: '28px', textAlign: 'center',
          }}>
            <p style={{ fontSize: '13px', color: 'var(--color-muted)' }}>No check-ins yet today</p>
          </div>
        ) : (
          <div style={{
            background: 'var(--color-surface)', border: '1px solid var(--color-border)',
            borderRadius: '14px', overflow: 'hidden',
          }}>
            {todayCheckIns.slice(0, 10).map((ci, i) => {
              const color = ci.isGhost ? '#6B7280' : avatarColor(i);
              return (
                <div key={ci.id} style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '12px 14px',
                  borderBottom: i < Math.min(todayCheckIns.length, 10) - 1 ? '1px solid var(--color-border)' : 'none',
                }}>
                  <Avatar initial={ci.isGhost ? '?' : ci.visitorName[0]} color={color} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: '14px', fontWeight: 600,
                      color: ci.isGhost ? 'var(--color-muted)' : 'var(--color-text)',
                    }}>
                      {ci.isGhost ? 'Anonymous' : ci.visitorName.split(' ')[0]}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--color-muted)' }}>{timeAgo(ci.createdAt)}</div>
                  </div>
                  {ci.isGhost ? (
                    <Pill label="Anonymous · counted" color="#9CA3AF" bg="rgba(107,114,128,0.12)" />
                  ) : ci.isFirstVisit ? (
                    <Pill label="First visit" color="#F5A623" bg="rgba(245,166,35,0.12)" />
                  ) : (
                    <Pill label={`${ci.visitNumber} visits`} color="#39D98A" bg="rgba(57,217,138,0.1)" />
                  )}
                </div>
              );
            })}
          </div>
        )}
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
          <Link to={`/venue/${venueSlug}`} style={{ textDecoration: 'none', flex: 1 }}>
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
          <Link to={`/venue/${venueSlug}/checkin`} style={{ textDecoration: 'none', flex: 1 }}>
            <button style={{
              width: '100%', padding: '12px 8px', borderRadius: '12px',
              background: 'var(--color-surface)', border: '1px solid var(--color-border)',
              color: 'var(--color-text)', fontSize: '13px', fontWeight: 600,
              fontFamily: 'DM Sans, sans-serif', cursor: 'pointer',
              minHeight: '48px',
            }}>
              Test check-in
            </button>
          </Link>
        </div>
      </div>

      {/* Post box */}
      <div style={{ marginBottom: '24px' }}>
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
            placeholder="What's happening today at your place..."
            maxLength={200}
            style={{
              width: '100%', minHeight: '80px',
              background: 'transparent', border: 'none', outline: 'none',
              color: 'var(--color-text)', fontSize: '14px',
              fontFamily: 'DM Sans, sans-serif', resize: 'none',
              lineHeight: 1.5, boxSizing: 'border-box',
            }}
          />
          {postError && <p style={{ fontSize: '12px', color: '#F87171', marginBottom: '8px' }}>{postError}</p>}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginTop: '8px', paddingTop: '8px', borderTop: '1px solid var(--color-border)',
          }}>
            <span style={{ fontSize: '11px', color: 'var(--color-muted)' }}>{postText.length}/200</span>
            <button
              onClick={handlePost}
              disabled={posting}
              style={{
                background: posted ? 'rgba(57,217,138,0.2)' : 'var(--color-accent)',
                color: posted ? 'var(--color-accent)' : '#000',
                border: 'none', borderRadius: '10px', padding: '8px 20px',
                fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '13px',
                cursor: posting ? 'default' : 'pointer', transition: 'all 0.2s',
              }}
            >
              {posted ? 'Posted ✓' : posting ? 'Posting…' : 'Post'}
            </button>
          </div>
        </div>
      </div>

      {/* Story box */}
      <div>
        <h2 style={{
          fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '15px',
          marginBottom: '4px', color: 'var(--color-text)',
        }}>
          Post a story
        </h2>
        <p style={{ fontSize: '12px', color: 'var(--color-muted)', marginBottom: '12px' }}>
          Post a quick update (disappears in 24 hours)
        </p>
        <div style={{
          background: 'var(--color-surface)',
          border: '1px solid rgba(57,217,138,0.2)',
          borderRadius: '14px', padding: '14px',
        }}>
          <textarea
            value={storyText}
            onChange={e => setStoryText(e.target.value.slice(0, 120))}
            placeholder="What's happening at your place right now..."
            maxLength={120}
            style={{
              width: '100%', minHeight: '72px',
              background: 'transparent', border: 'none', outline: 'none',
              color: 'var(--color-text)', fontSize: '14px',
              fontFamily: 'DM Sans, sans-serif', resize: 'none',
              lineHeight: 1.5, boxSizing: 'border-box',
            }}
          />
          {storyError && <p style={{ fontSize: '12px', color: '#F87171', marginBottom: '8px' }}>{storyError}</p>}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginTop: '8px', paddingTop: '8px', borderTop: '1px solid var(--color-border)',
          }}>
            <span style={{
              fontSize: '11px',
              color: storyText.length >= 110 ? '#F5A623' : 'var(--color-muted)',
            }}>
              {120 - storyText.length} left
            </span>
            <button
              onClick={handleStory}
              disabled={postingStory || !storyText.trim()}
              style={{
                background: storyPosted
                  ? 'rgba(57,217,138,0.2)'
                  : postingStory || !storyText.trim()
                    ? 'rgba(57,217,138,0.4)'
                    : 'var(--color-accent)',
                color: storyPosted ? 'var(--color-accent)' : '#000',
                border: 'none', borderRadius: '10px', padding: '8px 20px',
                fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '13px',
                cursor: postingStory || !storyText.trim() ? 'default' : 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {storyPosted ? 'Your story is live for 24 hours ✓' : postingStory ? 'Posting…' : 'Post story'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Tab: Regulars ────────────────────────────────────────────────────────────

function RegularsTab({ regulars, totalCount }: { regulars: Regular[]; totalCount: number }) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() =>
    regulars.filter(r => r.name.toLowerCase().includes(query.toLowerCase())),
    [regulars, query]
  );

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '15px' }}>
          {totalCount} regulars
        </h2>
      </div>

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

      <div style={{
        background: 'var(--color-surface)', border: '1px solid var(--color-border)',
        borderRadius: '14px', overflow: 'hidden',
      }}>
        {regulars.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center' }}>
            <p style={{ fontSize: '13px', color: 'var(--color-muted)' }}>
              No named check-ins yet. Regulars appear once people start checking in with their names.
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--color-muted)', fontSize: '14px' }}>
            No regulars match that name
          </div>
        ) : filtered.map((r, i) => (
          <div key={r.name} style={{
            display: 'flex', alignItems: 'center', gap: '12px',
            padding: '12px 14px',
            borderBottom: i < filtered.length - 1 ? '1px solid var(--color-border)' : 'none',
          }}>
            <Avatar initial={r.initial} color={avatarColor(i)} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '14px', fontWeight: 600 }}>{r.name}</div>
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

// ─── Tab: Events ──────────────────────────────────────────────────────────────

function EventsTab({ events, venueId, onEventAdded }: {
  events: Event[];
  venueId: string;
  onEventAdded: (e: Event) => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [price, setPrice] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  async function handleAdd() {
    if (!title.trim() || !date || !time) { setFormError('Fill in title, date, and time'); return; }
    setSaving(true);
    setFormError('');
    const datetime = new Date(`${date}T${time}`).toISOString();
    const priceNum = parseInt(price) || 0;
    const { error } = await createEvent({
      venue_id: venueId,
      title: title.trim(),
      event_date: datetime,
      price: priceNum,
    });
    setSaving(false);
    if (error) { setFormError('Could not save event. Run migration 002 first.'); return; }
    // Refresh is handled by parent reloading events — for now just reset form
    setTitle(''); setDate(''); setTime(''); setPrice('');
    setShowForm(false);
    // Optimistically add a fake event to the list
    onEventAdded({
      id: `tmp-${Date.now()}`,
      venueId,
      title: title.trim(),
      description: '',
      startsAt: datetime,
      isFree: priceNum === 0,
      price: priceNum > 0 ? priceNum : undefined,
      createdAt: new Date().toISOString(),
    });
  }

  const inputSt: React.CSSProperties = {
    width: '100%', background: 'var(--color-bg)',
    border: '1px solid var(--color-border)', borderRadius: '10px',
    padding: '10px 12px', color: 'var(--color-text)', fontSize: '14px',
    fontFamily: 'DM Sans, sans-serif', outline: 'none',
    boxSizing: 'border-box', minHeight: '44px',
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '15px' }}>
          Upcoming events
        </h2>
        {events.length > 0 && (
          <span style={{
            fontSize: '11px', fontWeight: 700, color: 'var(--color-accent)',
            background: 'rgba(57,217,138,0.1)', padding: '2px 8px', borderRadius: '20px',
          }}>
            {events.length} on
          </span>
        )}
      </div>

      {events.length === 0 && !showForm && (
        <div style={{
          background: 'var(--color-surface)', border: '1px solid var(--color-border)',
          borderRadius: '14px', padding: '32px', textAlign: 'center',
          marginBottom: '12px',
        }}>
          <div style={{ fontSize: '32px', marginBottom: '10px' }}>📅</div>
          <p style={{ fontSize: '14px', color: 'var(--color-muted)', lineHeight: 1.5 }}>
            Nothing on the calendar yet.
          </p>
        </div>
      )}

      {events.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
          {events.map(event => (
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
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', color: 'var(--color-muted)' }}>
                    {new Date(event.startsAt).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: event.isFree ? '#39D98A' : '#F5A623' }}>
                    {event.isFree ? 'Free' : `R${event.price}`}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div style={{
          background: 'var(--color-surface)', border: '1px solid var(--color-border)',
          borderRadius: '14px', padding: '16px', marginBottom: '12px',
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Event title"
              style={inputSt}
            />
            <div style={{ display: 'flex', gap: '8px' }}>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ ...inputSt, flex: 1 }} />
              <input type="time" value={time} onChange={e => setTime(e.target.value)} style={{ ...inputSt, flex: 1 }} />
            </div>
            <input
              type="number"
              value={price}
              onChange={e => setPrice(e.target.value)}
              placeholder="Price in ZAR (leave blank for free)"
              style={inputSt}
            />
            {formError && <p style={{ fontSize: '12px', color: '#F87171' }}>{formError}</p>}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => { setShowForm(false); setFormError(''); }}
                style={{
                  flex: 1, minHeight: '44px', background: 'var(--color-bg)',
                  border: '1px solid var(--color-border)', borderRadius: '10px',
                  color: 'var(--color-muted)', fontFamily: 'DM Sans, sans-serif',
                  fontWeight: 600, fontSize: '13px', cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleAdd}
                disabled={saving}
                style={{
                  flex: 2, minHeight: '44px',
                  background: saving ? 'rgba(57,217,138,0.6)' : 'var(--color-accent)',
                  border: 'none', borderRadius: '10px',
                  color: '#000', fontFamily: 'Syne, sans-serif',
                  fontWeight: 700, fontSize: '13px', cursor: saving ? 'default' : 'pointer',
                }}
              >
                {saving ? 'Saving…' : 'Save event'}
              </button>
            </div>
          </div>
        </div>
      )}

      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          style={{
            width: '100%', minHeight: '52px',
            background: 'var(--color-surface)', border: '1px solid var(--color-border)',
            borderRadius: '14px', color: 'var(--color-accent)',
            fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '14px',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
          }}
        >
          <Plus size={16} />
          Add event
        </button>
      )}
    </div>
  );
}

// ─── Tab: Settings ────────────────────────────────────────────────────────────

function SettingsTab({ venue, venueId }: { venue: Venue; venueId: string }) {
  const [publicPage, setPublicPage]       = useState(true);
  const [showRegulars, setShowRegulars]   = useState(true);
  const [quietCheckins, setQuietCheckins] = useState(true);
  const [notifyContact, setNotifyContact] = useState(() =>
    localStorage.getItem('kayaa_notify_contact') ?? ''
  );
  const [notifySaved, setNotifySaved] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);
  // QR codes point to /checkin/:id so they work even if slug changes
  const qrUrl = `https://kayaa.co.za/checkin/${venue.id}`;

  function saveNotify() {
    if (!notifyContact.trim()) return;
    localStorage.setItem('kayaa_notify_contact', notifyContact.trim());
    setNotifySaved(true);
    setTimeout(() => setNotifySaved(false), 2500);
  }

  async function handleToggle(key: 'is_public' | 'show_regulars_publicly' | 'allow_quiet_checkins', val: boolean) {
    await updateVenueSettings(venueId, { [key]: val });
  }

  function downloadQR() {
    const sourceCanvas = qrRef.current?.querySelector('canvas') as HTMLCanvasElement | null;
    if (!sourceCanvas) return;
    const size = 512;
    const out = document.createElement('canvas');
    out.width = size;
    out.height = size;
    const ctx = out.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);
    ctx.drawImage(sourceCanvas, 0, 0, size, size);
    const a = document.createElement('a');
    a.href = out.toDataURL('image/png');
    a.download = `kayaa-qr-${venue.slug}.png`;
    a.click();
  }

  return (
    <div>
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
            {venue.address ? `${venue.address} · ` : ''}{venue.neighborhood}, {venue.city}
          </span>
        </div>
        {venue.openHours && (
          <div style={{ fontSize: '12px', color: 'var(--color-muted)' }}>{venue.openHours}</div>
        )}
      </div>

      {/* Plan tiers */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '14px', color: 'var(--color-text)', marginBottom: '10px' }}>
          Your plan
        </div>

        {/* Free */}
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

        {/* Grow */}
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '14px', padding: '14px 16px', marginBottom: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
            <div>
              <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '15px', color: 'var(--color-text)', marginBottom: '2px' }}>Kayaa Grow</div>
              <div style={{ fontSize: '12px', color: 'var(--color-muted)' }}>Coming soon</div>
            </div>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#F5A623', background: 'rgba(245,166,35,0.12)', padding: '4px 10px', borderRadius: '20px' }}>Coming soon</span>
          </div>
          {['Everything in Free', 'Analytics dashboard', 'Promoted listing', 'Story boosts'].map(f => (
            <div key={f} style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '4px' }}>
              <span style={{ color: '#F5A623', fontSize: '12px' }}>✓</span>
              <span style={{ fontSize: '12px', color: 'var(--color-muted)' }}>{f}</span>
            </div>
          ))}
          <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
            <input
              type="text"
              value={notifyContact}
              onChange={e => setNotifyContact(e.target.value)}
              placeholder="Phone or email"
              style={{ flex: 1, background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '8px 10px', color: 'var(--color-text)', fontSize: '13px', fontFamily: 'DM Sans, sans-serif', outline: 'none' }}
            />
            <button
              onClick={saveNotify}
              style={{ background: notifySaved ? 'rgba(245,166,35,0.2)' : 'rgba(245,166,35,0.12)', border: '1px solid rgba(245,166,35,0.3)', borderRadius: '8px', padding: '8px 14px', color: '#F5A623', fontSize: '12px', fontWeight: 700, fontFamily: 'Syne, sans-serif', cursor: 'pointer', whiteSpace: 'nowrap' }}
            >
              {notifySaved ? 'Saved ✓' : 'Notify me'}
            </button>
          </div>
        </div>

        {/* Pro */}
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '14px', padding: '14px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
            <div>
              <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '15px', color: 'var(--color-text)', marginBottom: '2px' }}>Kayaa Pro</div>
              <div style={{ fontSize: '12px', color: 'var(--color-muted)' }}>Coming soon</div>
            </div>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#F5A623', background: 'rgba(245,166,35,0.12)', padding: '4px 10px', borderRadius: '20px' }}>Coming soon</span>
          </div>
          {['Everything in Grow', 'Verified badge', 'Custom QR design', 'Priority support'].map(f => (
            <div key={f} style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '4px' }}>
              <span style={{ color: '#F5A623', fontSize: '12px' }}>✓</span>
              <span style={{ fontSize: '12px', color: 'var(--color-muted)' }}>{f}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{
        background: 'var(--color-surface)', border: '1px solid var(--color-border)',
        borderRadius: '14px', padding: '0 16px', marginBottom: '16px',
      }}>
        <ToggleRow
          label="Public place page"
          sub="Anyone with the link can see your page"
          checked={publicPage}
          onChange={v => { setPublicPage(v); handleToggle('is_public', v); }}
        />
        <ToggleRow
          label="Show regulars count publicly"
          sub="Visitors can see how many regulars you have"
          checked={showRegulars}
          onChange={v => { setShowRegulars(v); handleToggle('show_regulars_publicly', v); }}
        />
        <ToggleRow
          label="Allow quiet check-ins"
          sub="Regulars can check in anonymously"
          checked={quietCheckins}
          onChange={v => { setQuietCheckins(v); handleToggle('allow_quiet_checkins', v); }}
        />
      </div>

      {/* QR code */}
      <div style={{
        background: 'var(--color-surface)', border: '1px solid var(--color-border)',
        borderRadius: '14px', padding: '16px', marginBottom: '16px',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px',
      }}>
        <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '14px', color: 'var(--color-text)', alignSelf: 'flex-start' }}>
          Your check-in QR code
        </div>
        <div ref={qrRef} style={{
          background: '#fff', padding: '14px', borderRadius: '12px',
          boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
        }}>
          <QRCodeCanvas value={qrUrl} size={200} level="M" marginSize={0} />
        </div>
        <p style={{ fontSize: '11px', color: 'var(--color-muted)', textAlign: 'center', margin: 0 }}>
          kayaa.co.za/checkin/{venue.id.slice(0, 8)}…
        </p>
        <p style={{ fontSize: '11px', color: 'var(--color-muted)', textAlign: 'center', margin: 0, lineHeight: 1.5 }}>
          Print this and place it at your counter so customers can check in easily.
        </p>
        <button
          onClick={downloadQR}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            background: 'rgba(57,217,138,0.08)', border: '1px solid rgba(57,217,138,0.3)',
            borderRadius: '10px', padding: '10px 20px',
            color: 'var(--color-accent)', fontFamily: 'Syne, sans-serif',
            fontWeight: 700, fontSize: '13px', cursor: 'pointer',
          }}
        >
          <Download size={14} />
          Download QR code
        </button>
      </div>

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

// ─── Check-in history section ─────────────────────────────────────────────────

const HIST_BADGE_ICON: Record<string, string> = {
  newcomer: '🌱', regular: '⭐', loyal: '🔥', legend: '👑',
};
const HIST_CAT_EMOJI: Record<string, string> = {
  Barbershop: '✂️', Shisanyama: '🔥', Tavern: '🍺', Café: '☕',
  Church: '⛪', Carwash: '🚗', 'Spaza Shop': '🏪', Salon: '💅',
  Tutoring: '📚', 'Sports Ground': '⚽', 'Home Business': '🏠',
};

function CheckInHistorySection() {
  const history = getUserCheckInHistoryLocal(getVisitorId());

  if (history.length === 0) {
    return (
      <div style={{
        background: 'var(--color-surface)', border: '1px solid var(--color-border)',
        borderRadius: '14px', padding: '24px 16px', textAlign: 'center', marginBottom: '16px',
      }}>
        <div style={{ fontSize: '32px', marginBottom: '8px' }}>🏪</div>
        <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text)', marginBottom: '4px', fontFamily: 'Syne, sans-serif' }}>
          No check-ins yet
        </p>
        <p style={{ fontSize: '13px', color: 'var(--color-muted)', lineHeight: 1.5 }}>
          Find a place nearby and tap <strong>Check In</strong>.
        </p>
      </div>
    );
  }

  return (
    <div style={{ marginBottom: '16px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {history.map(item => {
          const daysAgo = item.lastVisit
            ? Math.floor((Date.now() - new Date(item.lastVisit).getTime()) / (1000 * 60 * 60 * 24))
            : null;
          const lastLabel =
            daysAgo === 0 ? 'Today' :
            daysAgo === 1 ? 'Yesterday' :
            daysAgo != null ? `${daysAgo}d ago` : '';
          const catEmoji = HIST_CAT_EMOJI[item.venueType] ?? '📍';

          return (
            <Link
              key={item.venueId}
              to={`/venue/${item.venueSlug}`}
              style={{ textDecoration: 'none' }}
            >
              <div style={{
                background: 'var(--color-surface)', border: '1px solid var(--color-border)',
                borderRadius: '12px', padding: '12px 14px',
                display: 'flex', alignItems: 'center', gap: '12px',
              }}>
                <span style={{ fontSize: '22px', flexShrink: 0 }}>{catEmoji}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '14px',
                    color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    marginBottom: '2px',
                  }}>
                    {item.venueName}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    <span style={{
                      fontSize: '11px', fontWeight: 700, color: '#39D98A',
                      background: 'rgba(57,217,138,0.1)', padding: '1px 7px', borderRadius: '20px',
                    }}>
                      {HIST_BADGE_ICON[item.badgeTier]} {item.badgeTier}
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--color-muted)' }}>
                      {item.visitCount} visit{item.visitCount !== 1 ? 's' : ''}
                    </span>
                    {lastLabel && (
                      <span style={{ fontSize: '11px', color: 'var(--color-muted)' }}>· {lastLabel}</span>
                    )}
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

// ─── No venue state ───────────────────────────────────────────────────────────

function NoVenueState() {
  return (
    <div style={{ padding: '24px 16px 80px' }}>
      {/* Register CTA */}
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏪</div>
        <h2 style={{
          fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '20px',
          marginBottom: '8px', color: 'var(--color-text)',
        }}>
          No place yet
        </h2>
        <p style={{ fontSize: '14px', color: 'var(--color-muted)', lineHeight: 1.6, marginBottom: '24px' }}>
          Register your place to start tracking check-ins and regulars.
        </p>
        <Link to="/onboarding" style={{
          display: 'inline-block', background: 'var(--color-accent)', color: '#000',
          textDecoration: 'none', borderRadius: '12px', padding: '13px 28px',
          fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '15px',
        }}>
          Add your place
        </Link>
      </div>

      {/* Check-in history */}
      <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '15px', color: 'var(--color-text)', marginBottom: '12px' }}>
        Your Check-In History
      </h2>
      <CheckInHistorySection />
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

export default function DashboardPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('home');

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [ownerName, setOwnerName] = useState('');
  const [venueId, setVenueId] = useState('');
  const [venue, setVenue] = useState<Venue | null>(null);
  const [checkIns, setCheckIns] = useState<DashboardCheckIn[]>([]);
  const [regulars, setRegulars] = useState<Regular[]>([]);
  const [regularsLoaded, setRegularsLoaded] = useState(false);
  const [events, setEvents] = useState<Event[]>([]);

  const todayCount = useMemo(() =>
    checkIns.filter(ci => isToday(ci.createdAt)).length,
    [checkIns]
  );

  useEffect(() => {
    if (!user) return;

    async function load() {
      setLoading(true);
      setLoadError(false);
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
      } catch (err) {
        console.error('Dashboard load error:', err);
        setLoadError(true);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [user]);

  // Load regulars lazily when that tab is selected
  useEffect(() => {
    if (tab !== 'regulars' || regularsLoaded || !venueId) return;
    getVenueRegulars(venueId).then(data => {
      setRegulars(data);
      setRegularsLoaded(true);
    });
  }, [tab, venueId, regularsLoaded]);

  // Realtime: prepend new check-ins
  useEffect(() => {
    if (!venueId) return;

    const channel = supabase
      .channel(`dashboard-checkins-${venueId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'check_ins', filter: `venue_id=eq.${venueId}` },
        payload => {
          const row = payload.new as Record<string, unknown>;
          setCheckIns(prev => [{
            id: row.id as string,
            visitorName: (row.visitor_name as string) ?? 'Anonymous',
            isGhost: (row.is_ghost as boolean) ?? false,
            isFirstVisit: (row.is_first_visit as boolean) ?? false,
            visitNumber: (row.visit_number as number) ?? 1,
            createdAt: row.created_at as string,
          }, ...prev]);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [venueId]);

  if (loading) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', minHeight: '50vh', gap: '16px',
      }}>
        <style>{`@keyframes dbSpin { to { transform: rotate(360deg); } }`}</style>
        <div style={{
          width: '36px', height: '36px', borderRadius: '50%',
          border: '3px solid rgba(57,217,138,0.2)', borderTopColor: '#39D98A',
          animation: 'dbSpin 0.8s linear infinite',
        }} />
        <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', fontFamily: 'DM Sans, sans-serif' }}>
          Loading your dashboard…
        </span>
      </div>
    );
  }

  if (loadError) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', minHeight: '50vh', padding: '32px', textAlign: 'center',
      }}>
        <div style={{ fontSize: '40px', marginBottom: '16px' }}>⚠️</div>
        <h2 style={{
          fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '18px',
          color: 'var(--color-text)', marginBottom: '8px',
        }}>
          Something went wrong
        </h2>
        <p style={{ fontSize: '14px', color: 'var(--color-muted)', marginBottom: '24px', lineHeight: 1.5 }}>
          Could not load your dashboard. Check your connection and try again.
        </p>
        <button
          onClick={() => window.location.reload()}
          style={{
            background: 'var(--color-accent)', color: '#000', border: 'none',
            borderRadius: '12px', padding: '12px 28px',
            fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '14px',
            cursor: 'pointer',
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  if (!venue || !venueId) return <NoVenueState />;

  const metrics = [
    { value: todayCount.toString(),              label: 'today',    accent: true  },
    { value: venue.followerCount.toString(),     label: 'regulars', accent: false },
    { value: events.length.toString(),           label: 'upcoming', accent: false },
  ];

  const firstName = ownerName.split(' ')[0] || 'there';

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

        {/* Header */}
        <div style={{ marginBottom: '20px' }}>
          <p style={{ fontSize: '13px', color: 'var(--color-muted)', marginBottom: '4px' }}>
            {getGreeting()}, {firstName} 👋
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

        {/* Metrics row */}
        <div style={{
          display: 'flex', gap: '10px',
          overflowX: 'auto', scrollbarWidth: 'none',
          marginLeft: '-16px', paddingLeft: '16px',
          marginRight: '-16px', paddingRight: '16px',
          paddingBottom: '4px', marginBottom: '4px',
          WebkitOverflowScrolling: 'touch',
        } as React.CSSProperties}>
          {metrics.map((m, i) => (
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

      {/* Tab bar */}
      <div style={{
        position: 'sticky', top: '56px', zIndex: 30,
        background: 'var(--color-bg)',
        borderBottom: '1px solid var(--color-border)',
        padding: '0 16px',
        display: 'flex',
        marginBottom: '20px',
      }}>
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              flex: 1, padding: '12px 4px',
              background: 'transparent', border: 'none',
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

      {/* Tab content */}
      <div style={{ padding: '0 16px 40px' }}>
        {tab === 'home' && (
          <HomeTab
            checkIns={checkIns}
            venueId={venueId}
            venueSlug={venue.slug}
            venueCreatedAt={venue.createdAt}
            venueDescription={venue.description}
            checkinCount={venue.checkinCount}
          />
        )}
        {tab === 'regulars' && (
          <RegularsTab regulars={regulars} totalCount={venue.followerCount} />
        )}
        {tab === 'events' && (
          <EventsTab
            events={events}
            venueId={venueId}
            onEventAdded={e => setEvents(prev => [e, ...prev])}
          />
        )}
        {tab === 'settings' && (
          <SettingsTab venue={venue} venueId={venueId} />
        )}
      </div>

      {/* Check-in history — always visible at the bottom */}
      <div style={{ padding: '0 16px 120px' }}>
        <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '15px', color: 'var(--color-text)', marginBottom: '12px' }}>
          Your Check-In History
        </h2>
        <CheckInHistorySection />
      </div>
    </>
  );
}
