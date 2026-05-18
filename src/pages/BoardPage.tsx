/**
 * BoardPage — /board
 *
 * The neighbourhood opportunity board.
 * One clear job: jobs, services, housing, and local notices.
 *
 * Architecture:
 *   1. Safety banner   — urgent safety posts alert at top
 *   2. Header          — title + area + "My posts" shortcut
 *   3. Tab bar         — All | Jobs | Services | Housing | Notices
 *   4. Secondary pills — For Sale · Free · Events · Lost & Found · Ask (shown when 'all' active)
 *   5. Type-specific cards — Jobs, Services, Housing, Notices, Generic
 *   6. FAB             — + Post (always visible)
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, AlertTriangle, X, MessageCircle, ChevronRight,
  Briefcase, Wrench, Home, Megaphone, ArrowRight, Send,
} from 'lucide-react';
import NudgeCard from '../components/NudgeCard';
import {
  getBoardPosts,
  updateBoardPostStatus,
  getBoardPostComments,
  addBoardPostComment,
  reportBoardPostComment,
  toggleBoardPostLike,
  isBoardPostLikedLocally,
  getVisitorId,
  searchVenuesByName,
  upsertVenueRecommendation,
  type BoardPost,
  type BoardCategory,
  type BoardPostComment,
} from '../lib/api';
import { getInteractiveUserId } from '../lib/api';
import { useCountry } from '../contexts/CountryContext';
import useLocation from '../hooks/useLocation';
import { useNeighbourhood } from '../contexts/NeighbourhoodContext';

// ── Sub-type detection ────────────────────────────────────────────────────────

function detectHousingType(post: BoardPost): string {
  const t = `${post.title} ${post.description ?? ''}`.toLowerCase();
  if (/lodge|guesthouse|guest house|bed.and.break|b&b/.test(t)) return 'Lodge';
  if (/short.?stay|per night|nightly|weekend|daily/.test(t)) return 'Short stay';
  if (/room|bachelor|flatlet|sharing|single room|double room/.test(t)) return 'Room';
  return 'Rental';
}

type JobIntent = 'hiring' | 'available' | 'task';

function detectJobIntent(post: BoardPost): JobIntent {
  const t = `${post.title} ${post.description ?? ''}`.toLowerCase();
  if (/looking for work|available for|seeking.*work|open to work|lfw:|need.*job|seeking.*position|want.*work|i.*available|hire me/.test(t)) return 'available';
  if (/task needed:|task:|need help:|help needed:|quick.*task|need.*someone|need.*a.*cleaner|need.*a.*plumber|need.*a.*person|looking.*for.*someone/.test(t)) return 'task';
  return 'hiring';
}

type ServiceIntent = 'offering' | 'seeking';

function detectServiceIntent(post: BoardPost): ServiceIntent {
  const t = `${post.title} ${post.description ?? ''}`.toLowerCase();
  if (/need help|looking for|wanted:|help needed|need a |seeking.*service|need.*someone/.test(t)) return 'seeking';
  return 'offering';
}

// ── Category config ───────────────────────────────────────────────────────────

export const BOARD_CATEGORIES: { key: BoardCategory; label: string; emoji: string; color: string }[] = [
  { key: 'jobs',          label: 'Jobs',           emoji: '💼', color: '#A78BFA' },
  { key: 'services',      label: 'Services',       emoji: '🔧', color: '#60A5FA' },
  { key: 'accommodation', label: 'Housing / Rent', emoji: '🏠', color: '#34D399' },
  { key: 'for_sale',      label: 'For Sale',       emoji: '🛍️', color: '#F5A623' },
  { key: 'free',          label: 'Free',           emoji: '🎁', color: '#39D98A' },
  { key: 'events',        label: 'Events',         emoji: '🎉', color: '#FB923C' },
  { key: 'announcements', label: 'Announcements',  emoji: '📢', color: '#F59E0B' },
  { key: 'lost_found',    label: 'Lost & Found',   emoji: '🔍', color: '#F472B6' },
  { key: 'ask',           label: 'Ask',            emoji: '❓', color: '#94A3B8' },
  { key: 'safety',        label: 'Safety',         emoji: '🚨', color: '#EF4444' },
];

function getCategoryConfig(key: string) {
  return BOARD_CATEGORIES.find(c => c.key === key) ?? {
    key: 'ask', label: key, emoji: '📌', color: '#94A3B8',
  };
}

// ── WhatsApp number normaliser ───────────────────────────────────────────────
// Converts any stored number to international format without leading + or spaces.
// South African local numbers: 0821234567 → 27821234567
// Already-international numbers (27…, 1…, etc.) returned unchanged.
// Returns null when the raw string can't be normalised to ≥10 digits.
function formatWaNumber(raw: string): string | null {
  const digits = raw.replace(/\D/g, '');
  if (!digits || digits.length < 9) return null;
  if (digits.startsWith('0') && digits.length === 10) return '27' + digits.slice(1);
  if (digits.length >= 10) return digits;
  return null;
}

// ── Geographic scope ─────────────────────────────────────────────────────────

type GeoScope = 'my_area' | 'nearby' | 'everywhere';

const GEO_SCOPES: { key: GeoScope; label: string }[] = [
  { key: 'my_area',    label: 'My area' },
  { key: 'nearby',     label: 'Nearby' },
  { key: 'everywhere', label: 'Everywhere' },
];

// ── Primary tabs ──────────────────────────────────────────────────────────────

const PRIMARY_TABS = [
  { key: 'all',          label: 'All',     color: '#39D98A' },
  { key: 'jobs',         label: 'Jobs',    color: '#A78BFA' },
  { key: 'services',     label: 'Services',color: '#60A5FA' },
  { key: 'accommodation',label: 'Housing', color: '#34D399' },
  { key: 'announcements',label: 'Notices', color: '#F59E0B' },
] as const;

// Secondary pills (shown inline when "all" is active)
const SECONDARY_CATS = ['for_sale', 'free', 'events', 'lost_found', 'ask'];

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatAge(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function isSafetyFresh(post: BoardPost): boolean {
  return post.category === 'safety' &&
    (Date.now() - new Date(post.createdAt).getTime()) < 6 * 3600000;
}

function getMineIds(): string[] {
  try { return JSON.parse(localStorage.getItem('kayaa_board_mine') ?? '[]'); }
  catch { return []; }
}

function WhatsAppCTA({ post }: { post: BoardPost }) {
  if (!post.contactWhatsapp) return null;
  const num = formatWaNumber(post.contactWhatsapp);
  if (!num) return (
    <div style={{
      marginTop: '10px', padding: '7px', textAlign: 'center',
      fontFamily: 'Inter, sans-serif', fontSize: '11px',
      color: 'rgba(255,255,255,0.22)',
    }}>
      WhatsApp unavailable
    </div>
  );
  const msg = encodeURIComponent(`Hi, I saw your post "${post.title}" on the Kayaa board`);
  return (
    <a
      href={`https://wa.me/${num}?text=${msg}`}
      target="_blank"
      rel="noopener noreferrer"
      onClick={e => e.stopPropagation()}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
        marginTop: '10px', padding: '10px',
        background: 'rgba(37,211,102,0.1)',
        border: '1px solid rgba(37,211,102,0.25)',
        borderRadius: '10px',
        color: '#25D366',
        fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '12px',
        textDecoration: 'none',
      }}
    >
      <MessageCircle size={13} />
      Contact on WhatsApp
    </a>
  );
}

// ── Neighbourhood label with optional GPS-verified indicator ─────────────────
// Green dot = poster's GPS matched this suburb at creation time.

function NeighbourhoodLabel({ name, verified }: { name: string; verified?: boolean }) {
  if (verified) {
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: '4px',
        fontFamily: 'Inter, sans-serif', fontSize: '11px', color: '#39D98A',
      }}>
        <span style={{
          width: '6px', height: '6px', borderRadius: '50%',
          background: '#39D98A', flexShrink: 0, display: 'inline-block',
        }} />
        {name}
      </span>
    );
  }
  return (
    <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>
      📍 {name}
    </span>
  );
}

// ── Reply error mapping ───────────────────────────────────────────────────────

function mapReplyError(errorCode: string | null): string {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return 'No connection. Check your data and try again.';
  }
  switch (errorCode) {
    case 'OFFLINE':   return 'No connection. Check your data and try again.';
    case 'AUTH':      return 'Please sign in first to reply.';
    case 'TOO_LONG':  return 'Your reply is too long. Keep it under 150 characters.';
    case 'POST_GONE': return 'This post is no longer open for replies.';
    default:          return 'Kayaa is having a problem right now. Try again in a moment.';
  }
}

// ── Engagement helpers ────────────────────────────────────────────────────────

/** Reaction label by post category. null = no reaction for this type. */
function getReactionConfig(category: string): { emoji: string; label: string } | null {
  if (category === 'safety' || category === 'lost_found') return { emoji: '👁', label: 'Seen' };
  if (['ask', 'announcements', 'events', 'free'].includes(category)) return { emoji: '👍', label: 'Helpful' };
  return null; // jobs, services, accommodation, for_sale — transactional, no reaction
}

/** Whether a "Follow updates" toggle makes sense for this post type. */
function isFollowable(category: string): boolean {
  return category === 'safety';
}

/** Whether a "Reply" shortcut belongs in the action bar for this post type. */
function hasReplyAction(category: string): boolean {
  return category === 'lost_found' || category === 'ask';
}

function isFollowedLocally(postId: string): boolean {
  try {
    const arr: string[] = JSON.parse(localStorage.getItem('kayaa_followed_posts') ?? '[]');
    return arr.includes(postId);
  } catch { return false; }
}

function toggleFollowLocally(postId: string): boolean {
  try {
    let arr: string[] = JSON.parse(localStorage.getItem('kayaa_followed_posts') ?? '[]');
    const was = arr.includes(postId);
    arr = was ? arr.filter(id => id !== postId) : [...new Set([...arr, postId])];
    localStorage.setItem('kayaa_followed_posts', JSON.stringify(arr));
    return !was;
  } catch { return false; }
}

// ── Post action bar (reactions · share · follow) ──────────────────────────────

function PostActionBar({ post, onToggleReplies }: { post: BoardPost; onToggleReplies?: () => void }) {
  const reactionCfg = getReactionConfig(post.category);
  const followable  = isFollowable(post.category);
  const replyable   = hasReplyAction(post.category);

  const [reacted,      setReacted]      = useState(() => isBoardPostLikedLocally(post.id));
  const [count,        setCount]        = useState(post.likesCount);
  const [following,    setFollowing]    = useState(() => isFollowedLocally(post.id));
  const [sharing,      setSharing]      = useState(false);
  const [copyDone,     setCopyDone]     = useState(false);
  const [showFallback, setShowFallback] = useState(false);

  async function handleReact() {
    const next = !reacted;
    setReacted(next);
    setCount(c => Math.max(0, c + (next ? 1 : -1)));
    await toggleBoardPostLike(post.id, getVisitorId());
  }

  function handleFollow() {
    setFollowing(toggleFollowLocally(post.id));
  }

  async function handleShare() {
    const url  = `https://kayaa.co.za/board/${post.id}`;
    const data = { title: post.title, text: `${post.title} — ${post.neighbourhood}`, url };
    if (typeof navigator !== 'undefined' && navigator.share) {
      setSharing(true);
      try { await navigator.share(data); } catch { /* user cancelled */ }
      setSharing(false);
    } else {
      setShowFallback(f => !f);
    }
  }

  async function handleCopyLink() {
    const url = `https://kayaa.co.za/board/${post.id}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopyDone(true);
      setTimeout(() => setCopyDone(false), 2000);
    } catch { /* noop */ }
  }

  // Share fallback: if post has a contact number, open direct chat; otherwise use share sheet
  const directNum  = post.contactWhatsapp ? formatWaNumber(post.contactWhatsapp) : null;
  const shareText  = `${post.title} — ${post.neighbourhood}\nhttps://kayaa.co.za/board/${post.id}`;
  const waUrl = directNum
    ? `https://wa.me/${directNum}?text=${encodeURIComponent(`Hi, I saw your post "${post.title}" on the Kayaa board`)}`
    : `https://wa.me/?text=${encodeURIComponent(shareText)}`;

  const btnBase: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: '5px',
    border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px',
    padding: '5px 11px', cursor: 'pointer',
    background: 'none', transition: 'all 0.15s',
    WebkitTapHighlightColor: 'transparent',
  };

  return (
    <div style={{ background: 'rgba(255,255,255,0.015)', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', flexWrap: 'wrap' }}>

        {/* Reaction: Seen / Helpful */}
        {reactionCfg && (
          <button onClick={handleReact} style={{
            ...btnBase,
            background: reacted ? 'rgba(57,217,138,0.1)' : 'none',
            border: `1px solid ${reacted ? 'rgba(57,217,138,0.3)' : 'rgba(255,255,255,0.08)'}`,
          }}>
            <span style={{ fontSize: '13px' }}>{reactionCfg.emoji}</span>
            <span style={{
              fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 600,
              color: reacted ? '#39D98A' : 'rgba(255,255,255,0.4)',
            }}>
              {reactionCfg.label}{count > 0 ? ` ${count}` : ''}
            </span>
          </button>
        )}

        {/* Share */}
        <button onClick={handleShare} style={btnBase}>
          <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>↗</span>
          <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.4)' }}>
            {sharing ? 'Opening…' : 'Share'}
          </span>
        </button>

        {/* Follow updates — Safety only */}
        {followable && (
          <button onClick={handleFollow} style={{
            ...btnBase,
            background: following ? 'rgba(167,139,250,0.1)' : 'none',
            border: `1px solid ${following ? 'rgba(167,139,250,0.28)' : 'rgba(255,255,255,0.08)'}`,
          }}>
            <span style={{ fontSize: '13px' }}>{following ? '✓' : '🔔'}</span>
            <span style={{
              fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 600,
              color: following ? '#A78BFA' : 'rgba(255,255,255,0.4)',
            }}>
              {following ? 'Following' : 'Follow updates'}
            </span>
          </button>
        )}

        {/* Reply — Lost & Found and Ask */}
        {replyable && (
          <button onClick={onToggleReplies} style={btnBase}>
            <span style={{ fontSize: '13px' }}>💬</span>
            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.4)' }}>
              Reply
            </span>
          </button>
        )}
      </div>

      {/* Share fallback (native share unavailable) */}
      {showFallback && (
        <div style={{ padding: '0 14px 10px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setShowFallback(false)}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              background: 'rgba(37,211,102,0.1)', border: '1px solid rgba(37,211,102,0.25)',
              borderRadius: '20px', padding: '6px 14px',
              color: '#25D366', fontFamily: 'Inter, sans-serif',
              fontSize: '12px', fontWeight: 700, textDecoration: 'none',
            }}
          >
            WhatsApp
          </a>
          <button
            onClick={handleCopyLink}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '20px', padding: '6px 14px',
              color: copyDone ? '#39D98A' : 'rgba(255,255,255,0.55)',
              fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            {copyDone ? '✓ Copied' : 'Copy link'}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Type-specific cards ───────────────────────────────────────────────────────

const JOB_INTENT_CFG: Record<JobIntent, { label: string; color: string; bg: string; border: string }> = {
  hiring:    { label: '💼 Hiring',           color: '#A78BFA', bg: 'var(--color-surface)',      border: 'rgba(167,139,250,0.18)' },
  available: { label: '🙋 Looking for work', color: '#34D399', bg: 'rgba(52,211,153,0.05)',    border: 'rgba(52,211,153,0.2)'  },
  task:      { label: '⚡ Quick task',       color: '#F59E0B', bg: 'rgba(245,158,11,0.05)',    border: 'rgba(245,158,11,0.2)'  },
};

const SVC_INTENT_CFG: Record<ServiceIntent, { label: string; color: string }> = {
  offering: { label: '🔧 Offering',  color: '#60A5FA' },
  seeking:  { label: '🔍 Seeking',   color: '#FBBF24' },
};

function JobCard({ post, isMine, onMarkResolved }: {
  post: BoardPost;
  isMine: boolean;
  onMarkResolved: (id: string) => void;
}) {
  const navigate = useNavigate();
  const intent = detectJobIntent(post);
  const cfg    = JOB_INTENT_CFG[intent];

  return (
    <div
      onClick={() => navigate(`/board/${post.id}`)}
      style={{
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
        borderRadius: '14px',
        padding: '14px',
        cursor: 'pointer',
        borderLeft: `3px solid ${cfg.color}`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
          <Briefcase size={13} color={cfg.color} />
          <span style={{
            fontFamily: 'Inter, sans-serif', fontSize: '11px', fontWeight: 700,
            color: cfg.color, background: `${cfg.color}18`,
            padding: '1px 8px', borderRadius: '10px',
          }}>
            {cfg.label}
          </span>
        </div>
        <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>
          {formatAge(post.createdAt)}
        </span>
      </div>

      <div style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '15px', color: '#F0F6FC', marginBottom: '4px', lineHeight: 1.3 }}>
        {post.title}
      </div>

      {post.description && (
        <p style={{
          fontFamily: 'Inter, sans-serif', fontSize: '13px', color: 'rgba(255,255,255,0.52)',
          margin: '0 0 8px', lineHeight: 1.55,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        } as React.CSSProperties}>
          {post.description}
        </p>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <NeighbourhoodLabel name={post.neighbourhood} verified={post.isLocalVerified} />
          {post.price != null && (
            <span style={{
              fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 700,
              color: cfg.color, background: `${cfg.color}18`,
              padding: '2px 8px', borderRadius: '10px',
            }}>
              R{post.price.toLocaleString()}/mo
            </span>
          )}
        </div>
        {isMine && post.status === 'active' && (
          <button
            onClick={e => { e.stopPropagation(); onMarkResolved(post.id); }}
            style={{
              background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: '20px',
              padding: '4px 10px', fontSize: '11px', color: 'rgba(255,255,255,0.45)',
              cursor: 'pointer', fontFamily: 'Inter, sans-serif',
            }}
          >
            Resolve
          </button>
        )}
      </div>

      <WhatsAppCTA post={post} />
    </div>
  );
}

function ServiceCard({ post, isMine, onMarkResolved }: {
  post: BoardPost;
  isMine: boolean;
  onMarkResolved: (id: string) => void;
}) {
  const navigate = useNavigate();
  const svcIntent = detectServiceIntent(post);
  const svcCfg   = SVC_INTENT_CFG[svcIntent];

  return (
    <div
      onClick={() => navigate(`/board/${post.id}`)}
      style={{
        background: 'var(--color-surface)',
        border: '1px solid rgba(96,165,250,0.18)',
        borderRadius: '14px',
        padding: '14px',
        cursor: 'pointer',
        borderLeft: '3px solid #60A5FA',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
          <Wrench size={13} color={svcCfg.color} />
          <span style={{
            fontFamily: 'Inter, sans-serif', fontSize: '11px', fontWeight: 700,
            color: svcCfg.color, background: `${svcCfg.color}18`,
            padding: '1px 8px', borderRadius: '10px',
          }}>
            {svcCfg.label}
          </span>
        </div>
        <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>
          {formatAge(post.createdAt)}
        </span>
      </div>

      <div style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '15px', color: '#F0F6FC', marginBottom: '4px', lineHeight: 1.3 }}>
        {post.title}
      </div>

      {post.description && (
        <p style={{
          fontFamily: 'Inter, sans-serif', fontSize: '13px', color: 'rgba(255,255,255,0.52)',
          margin: '0 0 8px', lineHeight: 1.55,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        } as React.CSSProperties}>
          {post.description}
        </p>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <NeighbourhoodLabel name={post.neighbourhood} verified={post.isLocalVerified} />
          {post.videoUrl && (
            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: 'rgba(96,165,250,0.7)', background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.18)', borderRadius: '20px', padding: '1px 7px' }}>
              🎬 Video
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {post.price != null && (
            <span style={{
              fontFamily: 'Inter, sans-serif', fontSize: '13px', fontWeight: 700, color: '#60A5FA',
            }}>
              R{post.price.toLocaleString()}
            </span>
          )}
          {isMine && post.status === 'active' && (
            <button
              onClick={e => { e.stopPropagation(); onMarkResolved(post.id); }}
              style={{
                background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: '20px',
                padding: '4px 10px', fontSize: '11px', color: 'rgba(255,255,255,0.45)',
                cursor: 'pointer', fontFamily: 'Inter, sans-serif',
              }}
            >
              Resolve
            </button>
          )}
        </div>
      </div>

      <WhatsAppCTA post={post} />
    </div>
  );
}

function HousingListCard({ post, isMine, onMarkTaken }: {
  post: BoardPost;
  isMine: boolean;
  onMarkTaken: (id: string) => void;
}) {
  const navigate = useNavigate();
  const subType  = detectHousingType(post);
  const isShort  = subType === 'Short stay' || subType === 'Lodge';
  const priceLabel = post.price != null
    ? `R${post.price.toLocaleString()}${isShort ? '/night' : '/month'}`
    : 'Price on request';

  return (
    <div
      onClick={() => navigate(`/board/${post.id}`)}
      style={{
        background: 'var(--color-surface)',
        border: '1px solid rgba(52,211,153,0.18)',
        borderRadius: '14px',
        padding: '14px',
        cursor: 'pointer',
        borderLeft: '3px solid #34D399',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
          <Home size={13} color="#34D399" />
          <span style={{
            fontFamily: 'Inter, sans-serif', fontSize: '11px', fontWeight: 700,
            color: '#34D399', background: 'rgba(52,211,153,0.12)',
            padding: '1px 8px', borderRadius: '10px',
          }}>
            {subType}
          </span>
        </div>
        <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>
          {formatAge(post.createdAt)}
        </span>
      </div>

      <div style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '15px', color: '#F0F6FC', marginBottom: '4px', lineHeight: 1.3 }}>
        {post.title}
      </div>

      <div style={{ fontFamily: 'Inter, sans-serif', fontWeight: 800, fontSize: '16px', color: '#34D399', marginBottom: '6px' }}>
        {priceLabel}
      </div>

      {post.description && (
        <p style={{
          fontFamily: 'Inter, sans-serif', fontSize: '13px', color: 'rgba(255,255,255,0.52)',
          margin: '0 0 8px', lineHeight: 1.55,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        } as React.CSSProperties}>
          {post.description}
        </p>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <NeighbourhoodLabel name={post.neighbourhood} verified={post.isLocalVerified} />
          {post.videoUrl && (
            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: 'rgba(52,211,153,0.7)', background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.18)', borderRadius: '20px', padding: '1px 7px' }}>
              🎬 Video
            </span>
          )}
        </div>
        {isMine && post.status === 'active' && (
          <button
            onClick={e => { e.stopPropagation(); onMarkTaken(post.id); }}
            style={{
              background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: '20px',
              padding: '4px 10px', fontSize: '11px', color: 'rgba(255,255,255,0.45)',
              cursor: 'pointer', fontFamily: 'Inter, sans-serif',
            }}
          >
            Mark taken
          </button>
        )}
      </div>

      <WhatsAppCTA post={post} />
    </div>
  );
}

function NoticeCard({ post }: { post: BoardPost }) {
  const navigate = useNavigate();
  return (
    <div
      onClick={() => navigate(`/board/${post.id}`)}
      style={{
        background: 'rgba(245,158,11,0.05)',
        border: '1px solid rgba(245,158,11,0.2)',
        borderRadius: '14px',
        padding: '14px',
        cursor: 'pointer',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
          <Megaphone size={13} color="#F59E0B" />
          <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', fontWeight: 700, color: '#F59E0B' }}>
            Notice
          </span>
        </div>
        <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>
          {formatAge(post.createdAt)}
        </span>
      </div>

      <div style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '15px', color: '#F0F6FC', marginBottom: '6px', lineHeight: 1.3 }}>
        {post.title}
      </div>

      {post.description && (
        <p style={{
          fontFamily: 'Inter, sans-serif', fontSize: '13px', color: 'rgba(255,255,255,0.6)',
          margin: '0 0 8px', lineHeight: 1.6,
          display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        } as React.CSSProperties}>
          {post.description}
        </p>
      )}

      <NeighbourhoodLabel name={post.neighbourhood} verified={post.isLocalVerified} />
    </div>
  );
}

function GenericCard({ post, isMine, onMarkTaken, onMarkResolved }: {
  post: BoardPost;
  isMine: boolean;
  onMarkTaken: (id: string) => void;
  onMarkResolved: (id: string) => void;
}) {
  const navigate = useNavigate();
  const cat   = getCategoryConfig(post.category);
  const fresh = isSafetyFresh(post);

  return (
    <div
      onClick={() => navigate(`/board/${post.id}`)}
      style={{
        background: fresh ? 'rgba(239,68,68,0.06)' : 'var(--color-surface)',
        border: `1px solid ${fresh ? 'rgba(239,68,68,0.3)' : 'var(--color-border)'}`,
        borderRadius: '14px',
        padding: '14px',
        cursor: 'pointer',
        ...(fresh ? { borderLeft: '3px solid #EF4444' } : {}),
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <span style={{
          fontSize: '11px', fontWeight: 700,
          color: fresh ? '#EF4444' : cat.color,
          background: fresh ? 'rgba(239,68,68,0.12)' : `${cat.color}18`,
          padding: '2px 8px', borderRadius: '20px',
          fontFamily: 'Inter, sans-serif',
        }}>
          {cat.emoji} {cat.label}
        </span>
        <span style={{ fontSize: '11px', color: 'var(--color-muted)', fontFamily: 'Inter, sans-serif' }}>
          {formatAge(post.createdAt)}
        </span>
      </div>

      <div style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '14px', color: 'var(--color-text)', marginBottom: post.description ? '4px' : '8px', lineHeight: 1.35 }}>
        {post.title}
      </div>

      {post.description && (
        <p style={{
          fontSize: '13px', color: 'var(--color-muted)', margin: '0 0 10px', lineHeight: 1.55,
          fontFamily: 'Inter, sans-serif',
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        } as React.CSSProperties}>
          {post.description}
        </p>
      )}

      {post.price != null && (
        <div style={{ fontSize: '15px', fontWeight: 700, color: '#39D98A', marginBottom: '10px', fontFamily: 'Inter, sans-serif' }}>
          R{post.price.toLocaleString()}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <NeighbourhoodLabel name={post.neighbourhood} verified={post.isLocalVerified} />
          {post.images.length > 0 && <span style={{ fontSize: '11px', color: 'var(--color-muted)' }}>· 📷 {post.images.length}</span>}
          {post.videoUrl && <span style={{ fontSize: '11px', color: 'rgba(57,217,138,0.6)', background: 'rgba(57,217,138,0.07)', border: '1px solid rgba(57,217,138,0.15)', borderRadius: '20px', padding: '1px 7px' }}>🎬 Video</span>}
          {post.commentsCount > 0 && <span style={{ fontSize: '11px', color: 'var(--color-muted)' }}>· 💬 {post.commentsCount}</span>}
        </div>

        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }} onClick={e => e.stopPropagation()}>
          {post.contactWhatsapp && (() => {
            const wn = formatWaNumber(post.contactWhatsapp);
            if (!wn) return null;
            return (
              <a
                href={`https://wa.me/${wn}?text=${encodeURIComponent(`Hi, I saw your post "${post.title}" on the Kayaa board`)}`}
                target="_blank" rel="noopener noreferrer"
                style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#25D366', color: '#000', borderRadius: '20px', padding: '5px 10px', fontSize: '11px', fontWeight: 700, fontFamily: 'Inter, sans-serif', textDecoration: 'none' }}
              >
                <MessageCircle size={12} /> WhatsApp
              </a>
            );
          })()}
          {isMine && post.status === 'active' && (
            <button
              onClick={() => (post.category === 'for_sale' || post.category === 'free' || post.category === 'accommodation') ? onMarkTaken(post.id) : onMarkResolved(post.id)}
              style={{ background: 'var(--color-border)', color: 'var(--color-muted)', border: 'none', borderRadius: '20px', padding: '5px 10px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}
            >
              {post.category === 'for_sale' || post.category === 'free' || post.category === 'accommodation' ? 'Mark taken' : 'Resolve'}
            </button>
          )}
          <ChevronRight size={14} color="var(--color-muted)" />
        </div>
      </div>
    </div>
  );
}

// ── Ask card ──────────────────────────────────────────────────────────────────

function AskCard({ post, replyCount, onToggleReplies, repliesOpen }: {
  post: BoardPost;
  replyCount: number;
  onToggleReplies: () => void;
  repliesOpen: boolean;
}) {
  return (
    <div style={{
      background: 'rgba(148,115,250,0.05)',
      border: '1px solid rgba(148,115,250,0.22)',
      borderRadius: '14px',
      borderLeft: '3px solid #A78BFA',
      overflow: 'hidden',
    }}>
      <div style={{ padding: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span style={{
            fontSize: '11px', fontWeight: 700, color: '#A78BFA',
            background: 'rgba(167,139,250,0.14)', padding: '2px 9px',
            borderRadius: '20px', fontFamily: 'Inter, sans-serif',
          }}>
            ❓ Ask
          </span>
          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', fontFamily: 'Inter, sans-serif' }}>
            {formatAge(post.createdAt)}
          </span>
        </div>

        <div style={{
          fontFamily: 'Inter, sans-serif', fontWeight: 700,
          fontSize: '15px', color: '#F0F6FC',
          marginBottom: '10px', lineHeight: 1.4,
        }}>
          {post.title}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <NeighbourhoodLabel name={post.neighbourhood} verified={post.isLocalVerified} />
          <button
            onClick={onToggleReplies}
            style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              background: 'none', border: 'none', cursor: 'pointer',
              fontFamily: 'Inter, sans-serif', fontSize: '12px',
              fontWeight: 700,
              color: replyCount > 0 ? '#A78BFA' : 'rgba(255,255,255,0.35)',
              padding: 0,
            }}
          >
            <MessageCircle size={13} />
            {replyCount > 0
              ? `${replyCount} neighbour${replyCount !== 1 ? 's' : ''} answered`
              : 'Be the first to reply'}
            {repliesOpen ? ' ↑' : ' →'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Inline reply section ──────────────────────────────────────────────────────

/** "Nomsa Mahlangu" → "Nomsa M." · null → "Neighbour" */
function formatDisplayName(raw: string | null): string {
  if (!raw || !raw.trim()) return 'Neighbour';
  const parts = raw.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.`;
}

type ReportState = 'idle' | 'asking' | 'done';

function ReplyItem({ reply, onReport }: {
  reply: BoardPostComment & { hidden?: boolean };
  onReport: (id: string, reason: 'spam' | 'harmful') => void;
}) {
  const [reportState, setReportState] = useState<ReportState>('idle');
  if (reply.hidden) return null;

  return (
    <div style={{
      padding: '10px 0',
      borderBottom: '1px solid rgba(255,255,255,0.05)',
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '4px' }}>
        <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', fontWeight: 700, color: 'var(--color-text)' }}>
          {formatDisplayName(reply.visitorName)}
        </span>
        <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>
          {formatAge(reply.createdAt)}
        </span>
      </div>

      <p style={{
        fontFamily: 'Inter, sans-serif', fontSize: '14px',
        color: 'rgba(240,246,252,0.82)', margin: '0 0 6px', lineHeight: 1.5,
      }}>
        {reply.content}
      </p>

      {/* Report */}
      {reportState === 'idle' && (
        <button
          onClick={() => setReportState('asking')}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontFamily: 'Inter, sans-serif', fontSize: '11px',
            color: 'rgba(255,255,255,0.2)', padding: 0,
          }}
        >
          Report
        </button>
      )}
      {reportState === 'asking' && (
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>
            Report this reply?
          </span>
          {(['spam', 'harmful'] as const).map(reason => (
            <button
              key={reason}
              onClick={() => { onReport(reply.id, reason); setReportState('done'); }}
              style={{
                padding: '3px 10px', borderRadius: '20px',
                border: '1px solid rgba(239,68,68,0.3)',
                background: 'rgba(239,68,68,0.08)',
                color: '#EF4444',
                fontFamily: 'Inter, sans-serif', fontSize: '11px', fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {reason === 'spam' ? 'Spam' : 'Harmful'}
            </button>
          ))}
          <button
            onClick={() => setReportState('idle')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.2)', fontSize: '11px', fontFamily: 'Inter, sans-serif' }}
          >
            Cancel
          </button>
        </div>
      )}
      {reportState === 'done' && (
        <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.25)' }}>
          Reported — thanks
        </span>
      )}
    </div>
  );
}

interface InlineReplySectionProps {
  postId: string;
  commentsCount: number;
  isOpen: boolean;
  onToggle: () => void;
  accent?: string;
  /** When true the toggle-bar row is hidden (card already has its own toggle) */
  noToggleBar?: boolean;
  /** The board category — used to show venue-tagging nudge on Ask posts */
  category?: string;
}

function InlineReplySection({ postId, commentsCount, isOpen, onToggle, accent = '#39D98A', noToggleBar = false, category }: InlineReplySectionProps) {
  const { displaySuburb: neighbourhood = '', displayCity: city = '' } = useNeighbourhood();
  const [replies, setReplies] = useState<(BoardPostComment & { hidden?: boolean })[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  // ── Ask-post venue-tag nudge ──────────────────────────────────────────────
  const [showTagNudge,   setShowTagNudge]   = useState(false);
  const [tagQuery,       setTagQuery]       = useState('');
  const [tagResults,     setTagResults]     = useState<{ id: string; name: string; slug: string; category: string }[]>([]);
  const [tagSaving,      setTagSaving]      = useState(false);
  const [tagDone,        setTagDone]        = useState('');  // venue name after saving
  const [lastReplyText,  setLastReplyText]  = useState('');  // text of the reply that was just sent

  const visitorName = (() => {
    try { return JSON.parse(localStorage.getItem('kayaa_profile') ?? '{}').name ?? null; }
    catch { return null; }
  })();

  // Load replies when first opened
  useEffect(() => {
    if (!isOpen || loaded) return;
    setLoading(true);
    getBoardPostComments(postId).then(r => {
      setReplies(r);
      setLoaded(true);
      setLoading(false);
    });
  }, [isOpen, loaded, postId]);

  async function handleSend() {
    const text = replyText.trim();
    if (!text || text.length < 2) { setSendError('Add a short reply first.'); return; }
    setSending(true);
    setSendError('');
    const vid = getVisitorId();
    const { comment, errorCode } = await addBoardPostComment(postId, vid, text, visitorName ?? undefined);
    if (comment) {
      setReplies(prev => [...prev, comment]);
      setLastReplyText(text);
      setReplyText(''); // only clear on success
      // Show venue-tag nudge on Ask posts after a successful reply
      if (category === 'ask') {
        setShowTagNudge(true);
        setTagDone('');
        setTagQuery('');
        setTagResults([]);
      }
    } else {
      // reply text is deliberately kept so the user can retry
      setSendError(mapReplyError(errorCode));
    }
    setSending(false);
  }

  // Debounced venue search for tag nudge
  useEffect(() => {
    if (!tagQuery.trim()) { setTagResults([]); return; }
    const t = setTimeout(() => {
      searchVenuesByName(tagQuery, neighbourhood, city)
        .then(setTagResults)
        .catch(() => {});
    }, 300);
    return () => clearTimeout(t);
  }, [tagQuery, neighbourhood, city]);

  async function handleTagVenue(venue: { id: string; name: string }) {
    setTagSaving(true);
    const displayName = visitorName ? `${visitorName.split(' ')[0]} ${visitorName.split(' ').slice(-1)[0]?.[0] ?? ''}.`.trim() : null;
    await upsertVenueRecommendation(venue.id, lastReplyText.slice(0, 120) || null, [], displayName, 'ask_reply');
    setTagDone(venue.name);
    setTagSaving(false);
  }

  async function handleReport(commentId: string, reason: 'spam' | 'harmful') {
    const vid = getVisitorId();
    await reportBoardPostComment(commentId, vid, reason);
    // After 1 local report, hide immediately in UI (conservative approach)
    setReplies(prev => prev.map(r => r.id === commentId ? { ...r, hidden: true } : r));
  }

  const visibleReplies = replies.filter(r => !r.hidden);

  return (
    <div style={{
      borderTop: `1px solid rgba(255,255,255,0.07)`,
      background: 'rgba(255,255,255,0.02)',
    }}>
      {/* Toggle row — hidden when parent card already owns the toggle (e.g. AskCard) */}
      {!noToggleBar && (
        <button
          onClick={onToggle}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: '6px',
            padding: '10px 14px', background: 'none', border: 'none',
            cursor: 'pointer', textAlign: 'left',
            fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 600,
            color: commentsCount > 0 ? accent : 'rgba(255,255,255,0.3)',
          }}
        >
          <MessageCircle size={13} color={commentsCount > 0 ? accent : 'rgba(255,255,255,0.3)'} />
          {commentsCount > 0
            ? (isOpen ? `Hide replies` : `View ${commentsCount} ${commentsCount === 1 ? 'reply' : 'replies'}`)
            : 'Be the first to reply'}
        </button>
      )}

      {isOpen && (
        <div style={{ padding: '0 14px 12px' }}>
          {/* Replies list */}
          {loading && (
            <div style={{ padding: '8px 0', fontFamily: 'Inter, sans-serif', fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>
              Loading…
            </div>
          )}

          {!loading && loaded && visibleReplies.length === 0 && (
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: 'rgba(255,255,255,0.28)', margin: '4px 0 10px', lineHeight: 1.5 }}>
              No replies yet. Be the first to reply.
            </p>
          )}

          {visibleReplies.map(r => (
            <ReplyItem key={r.id} reply={r} onReport={handleReport} />
          ))}

          {/* Reply input */}
          <div style={{ marginTop: visibleReplies.length > 0 ? '10px' : '4px', display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
            <textarea
              value={replyText}
              onChange={e => { setReplyText(e.target.value.slice(0, 150)); setSendError(''); }}
              placeholder={sending ? '' : 'Add what you know...'}
              disabled={sending}
              rows={2}
              style={{
                flex: 1, background: 'var(--color-surface)',
                border: `1px solid ${sendError ? '#F87171' : 'var(--color-border)'}`,
                borderRadius: '10px', padding: '10px 12px',
                color: 'var(--color-text)', fontSize: '14px',
                fontFamily: 'Inter, sans-serif', outline: 'none',
                resize: 'none', lineHeight: 1.45,
                opacity: sending ? 0.6 : 1,
              }}
            />
            <button
              onClick={handleSend}
              disabled={!replyText.trim() || sending}
              style={{
                width: '40px', height: '40px', borderRadius: '10px',
                background: replyText.trim() && !sending ? accent : 'var(--color-border)',
                border: 'none', cursor: replyText.trim() && !sending ? 'pointer' : 'default',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, transition: 'background 0.15s',
              }}
              aria-label="Reply"
            >
              <Send size={16} color={replyText.trim() && !sending ? '#000' : 'rgba(255,255,255,0.3)'} />
            </button>
          </div>

          {/* Status / error row */}
          {sending && (
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: 'rgba(255,255,255,0.35)', margin: '4px 0 0' }}>
              Sending reply…
            </p>
          )}
          {!sending && sendError && (
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: '#F87171', margin: '4px 0 0' }}>
              {sendError}
            </p>
          )}

          {/* ── Ask-post venue-tag nudge ── */}
          {showTagNudge && !sending && (
            <div style={{
              marginTop: '12px', padding: '12px 14px',
              background: 'rgba(167,139,250,0.06)',
              border: '1px solid rgba(167,139,250,0.2)',
              borderRadius: '12px',
            }}>
              {tagDone ? (
                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: '#A78BFA', margin: 0 }}>
                  ✅ Recommended {tagDone}
                </p>
              ) : (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 700, color: 'rgba(167,139,250,0.9)', margin: 0 }}>
                      Mentioned a place? Tag it to recommend it 👍
                    </p>
                    <button
                      onClick={() => setShowTagNudge(false)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: 'rgba(255,255,255,0.3)', fontSize: '14px' }}
                    >✕</button>
                  </div>
                  <input
                    type="text"
                    value={tagQuery}
                    onChange={e => setTagQuery(e.target.value)}
                    placeholder="Search place name…"
                    style={{
                      width: '100%', boxSizing: 'border-box',
                      background: 'var(--color-surface)', border: '1px solid var(--color-border)',
                      borderRadius: '8px', padding: '9px 12px',
                      fontFamily: 'Inter, sans-serif', fontSize: '13px', color: 'var(--color-text)',
                      outline: 'none',
                    }}
                  />
                  {tagResults.length > 0 && (
                    <div style={{ marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {tagResults.map(v => (
                        <button
                          key={v.id}
                          onClick={() => handleTagVenue(v)}
                          disabled={tagSaving}
                          style={{
                            display: 'block', width: '100%', textAlign: 'left',
                            padding: '8px 12px', borderRadius: '8px',
                            background: 'var(--color-surface2)', border: '1px solid var(--color-border)',
                            cursor: 'pointer',
                            fontFamily: 'Inter, sans-serif', fontSize: '13px', color: 'var(--color-text)',
                          }}
                        >
                          {v.name}
                          <span style={{ color: 'rgba(255,255,255,0.35)', marginLeft: '6px', fontSize: '11px' }}>{v.category}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Skeleton loader ───────────────────────────────────────────────────────────

function PostSkeleton() {
  return (
    <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '14px', padding: '14px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
        <div style={{ width: '60px', height: '18px', background: 'rgba(255,255,255,0.06)', borderRadius: '10px' }} />
        <div style={{ width: '40px', height: '18px', background: 'rgba(255,255,255,0.04)', borderRadius: '10px' }} />
      </div>
      <div style={{ width: '80%', height: '16px', background: 'rgba(255,255,255,0.06)', borderRadius: '6px', marginBottom: '8px' }} />
      <div style={{ width: '100%', height: '13px', background: 'rgba(255,255,255,0.04)', borderRadius: '6px', marginBottom: '4px' }} />
      <div style={{ width: '65%', height: '13px', background: 'rgba(255,255,255,0.04)', borderRadius: '6px' }} />
    </div>
  );
}

// ── Smart card dispatcher ─────────────────────────────────────────────────────

function PostCard({ post, isMine, onMarkTaken, onMarkResolved, isExpanded, onToggleExpand }: {
  post: BoardPost;
  isMine: boolean;
  onMarkTaken: (id: string) => void;
  onMarkResolved: (id: string) => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
}) {
  // Ask posts: AskCard owns the reply toggle; action bar sits between card and replies
  if (post.category === 'ask') {
    return (
      <div style={{ borderRadius: '14px', overflow: 'hidden' }}>
        <AskCard
          post={post}
          replyCount={post.commentsCount}
          onToggleReplies={onToggleExpand}
          repliesOpen={isExpanded}
        />
        <PostActionBar post={post} onToggleReplies={onToggleExpand} />
        {isExpanded && (
          <InlineReplySection
            postId={post.id}
            commentsCount={post.commentsCount}
            isOpen={isExpanded}
            onToggle={onToggleExpand}
            accent="#A78BFA"
            noToggleBar
            category="ask"
          />
        )}
      </div>
    );
  }

  // All other post types: card → action bar → reply section
  let card: React.ReactNode;
  if (post.category === 'jobs')
    card = <JobCard post={post} isMine={isMine} onMarkResolved={onMarkResolved} />;
  else if (post.category === 'services')
    card = <ServiceCard post={post} isMine={isMine} onMarkResolved={onMarkResolved} />;
  else if (post.category === 'accommodation')
    card = <HousingListCard post={post} isMine={isMine} onMarkTaken={onMarkTaken} />;
  else if (post.category === 'announcements' || (post as { category: string }).category === 'announcer')
    card = <NoticeCard post={post} />;
  else
    card = <GenericCard post={post} isMine={isMine} onMarkTaken={onMarkTaken} onMarkResolved={onMarkResolved} />;

  return (
    <div style={{ borderRadius: '14px', overflow: 'hidden' }}>
      {card}
      <PostActionBar post={post} onToggleReplies={onToggleExpand} />
      <InlineReplySection
        postId={post.id}
        commentsCount={post.commentsCount}
        isOpen={isExpanded}
        onToggle={onToggleExpand}
      />
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function BoardPage() {
  const navigate = useNavigate();
  const { suburb, city } = useLocation();
  const { displaySuburb } = useNeighbourhood();
  const headerSuburb = displaySuburb || suburb || '';
  const display = suburb || city;
  const { selectedCountry } = useCountry();

  const [posts,           setPosts]           = useState<BoardPost[]>([]);
  const [loading,         setLoading]         = useState(true);
  const [geoScope,        setGeoScope]        = useState<GeoScope>('my_area');
  const [activeTab,       setActiveTab]       = useState<string>('all');
  const [secondaryFilter, setSecondaryFilter] = useState<string | null>(null);
  const [mineIds,         setMineIds]         = useState<string[]>([]);
  const [safetyDismissed, setSafetyDismissed] = useState(false);
  const [userId,          setUserId]          = useState('');
  const [expandedPostId,  setExpandedPostId]  = useState<string | null>(null);
  const [boardHintDismissed, setBoardHintDismissed] = useState(
    () => { try { return localStorage.getItem('kayaa_board_hint_seen') === 'true'; } catch { return false; } }
  );

  const toggleExpand = useCallback((id: string) => {
    setExpandedPostId(prev => prev === id ? null : id);
  }, []);

  useEffect(() => {
    getInteractiveUserId().then(setUserId);
    setMineIds(getMineIds());
  }, []);

  // When primary tab changes reset secondary filter
  useEffect(() => { setSecondaryFilter(null); }, [activeTab]);

  useEffect(() => {
    setLoading(true);
    // Resolve which category to fetch — category and geo scope are independent axes
    const fetchCat = secondaryFilter ?? (activeTab === 'all' ? undefined : activeTab);
    getBoardPosts(suburb, city, fetchCat, selectedCountry.code, geoScope).then(({ posts: p }) => {
      setPosts(p);
      setLoading(false);
    });
  }, [suburb, city, activeTab, secondaryFilter, selectedCountry.code, geoScope]);

  const freshSafetyPosts = posts.filter(isSafetyFresh);
  const showSafetyBanner = freshSafetyPosts.length > 0 && !safetyDismissed;

  async function handleMarkTaken(id: string) {
    setPosts(prev => prev.filter(p => p.id !== id));
    await updateBoardPostStatus(id, 'taken', userId);
  }

  async function handleMarkResolved(id: string) {
    setPosts(prev => prev.filter(p => p.id !== id));
    await updateBoardPostStatus(id, 'resolved', userId);
  }

  // Current active label for empty states
  const activeLabel = secondaryFilter
    ? getCategoryConfig(secondaryFilter).label
    : PRIMARY_TABS.find(t => t.key === activeTab)?.label ?? 'All';

  return (
    <div style={{ paddingBottom: 'calc(80px + env(safe-area-inset-bottom, 0px))', minHeight: '100vh', background: 'var(--color-bg)' }}>

      {/* ── Safety banner ── */}
      {showSafetyBanner && (
        <div style={{
          background: 'rgba(239,68,68,0.12)', borderBottom: '1px solid rgba(239,68,68,0.3)',
          padding: '12px 16px', display: 'flex', alignItems: 'flex-start', gap: '10px',
        }}>
          <AlertTriangle size={18} color="#EF4444" style={{ flexShrink: 0, marginTop: '1px' }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#EF4444', fontFamily: 'Inter, sans-serif' }}>
              {freshSafetyPosts.length} safety alert{freshSafetyPosts.length > 1 ? 's' : ''} in your area
            </div>
            <div style={{ fontSize: '12px', color: 'rgba(239,68,68,0.7)', fontFamily: 'Inter, sans-serif', marginTop: '2px' }}>
              {freshSafetyPosts[0].title}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }} onClick={e => e.stopPropagation()}>
            <button
              onClick={() => navigate('/alerts')}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '2px', flexShrink: 0, fontFamily: 'Inter, sans-serif', fontSize: '11px', color: '#EF4444', fontWeight: 700 }}
            >
              Alerts →
            </button>
            <button
              onClick={() => setSafetyDismissed(true)}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '2px', flexShrink: 0 }}
            >
              <X size={16} color="#EF4444" />
            </button>
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <div style={{ padding: '16px 16px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{
              fontFamily: 'Inter, sans-serif', fontSize: '11px', fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.1em',
              color: 'rgba(255,255,255,0.35)', margin: '0 0 4px',
            }}>
              Community board
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h1 style={{
                fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '26px',
                color: '#FFFFFF', margin: 0, letterSpacing: '-0.01em',
              }}>
                {headerSuburb ? `${headerSuburb} Board` : 'Community Board'}
              </h1>
              <button
                onClick={() => navigate('/')}
                style={{
                  display: 'flex', alignItems: 'center', gap: '4px',
                  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '20px', padding: '4px 10px',
                  fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.45)',
                  cursor: 'pointer', fontFamily: 'Inter, sans-serif', flexShrink: 0,
                  WebkitTapHighlightColor: 'transparent',
                } as React.CSSProperties}
                aria-label="Change neighbourhood"
              >
                Change area
              </button>
            </div>
          </div>
          <button
            onClick={() => navigate('/board/mine')}
            style={{
              background: 'transparent', border: '1px solid var(--color-border)',
              borderRadius: '20px', padding: '6px 12px',
              fontSize: '12px', fontWeight: 600, color: 'var(--color-muted)',
              cursor: 'pointer', fontFamily: 'Inter, sans-serif', flexShrink: 0,
            }}
          >
            My posts
          </button>
        </div>
      </div>

      {/* ── First-visit hint ── */}
      {!boardHintDismissed && !loading && (
        <div style={{ padding: '0 16px 12px', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: 'rgba(255,255,255,0.4)', margin: 0, lineHeight: 1.55, flex: 1 }}>
            This is the {display || 'community'} board. Post anything useful — safety alerts, announcements, lost items, or events.
          </p>
          <button
            onClick={() => { try { localStorage.setItem('kayaa_board_hint_seen', 'true'); } catch { /* ignore */ } setBoardHintDismissed(true); }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.25)', padding: 0, flexShrink: 0, fontSize: '14px', lineHeight: 1 }}
            aria-label="Dismiss"
          >×</button>
        </div>
      )}

      {/* ── Geographic scope pills ── */}
      <div style={{
        display: 'flex', gap: '6px', padding: '0 16px 10px',
        overflowX: 'auto', scrollbarWidth: 'none',
        WebkitOverflowScrolling: 'touch',
      } as React.CSSProperties}>
        {GEO_SCOPES.map(s => {
          const active = geoScope === s.key;
          return (
            <button
              key={s.key}
              onClick={() => setGeoScope(s.key)}
              style={{
                flexShrink: 0, padding: '6px 16px', borderRadius: '20px',
                border: `1px solid ${active ? '#39D98A' : 'rgba(255,255,255,0.1)'}`,
                background: active ? 'rgba(57,217,138,0.1)' : 'rgba(255,255,255,0.04)',
                color: active ? '#39D98A' : 'rgba(255,255,255,0.45)',
                fontFamily: 'Inter, sans-serif', fontSize: '12px',
                fontWeight: active ? 700 : 500, cursor: 'pointer',
                WebkitTapHighlightColor: 'transparent',
              } as React.CSSProperties}
            >
              {s.label}
            </button>
          );
        })}
      </div>

      {/* ── Primary tab bar ── */}
      <div style={{
        display: 'flex', gap: '0',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        overflowX: 'auto', scrollbarWidth: 'none',
        paddingLeft: '16px',
        WebkitOverflowScrolling: 'touch',
      } as React.CSSProperties}>
        {PRIMARY_TABS.map(tab => {
          const active = activeTab === tab.key && secondaryFilter === null;
          return (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key); setSecondaryFilter(null); }}
              style={{
                flexShrink: 0,
                padding: '10px 14px',
                background: 'transparent',
                border: 'none',
                borderBottom: active ? `2px solid ${tab.color}` : '2px solid transparent',
                color: active ? tab.color : 'rgba(255,255,255,0.4)',
                fontFamily: 'Inter, sans-serif',
                fontWeight: active ? 700 : 500,
                fontSize: '13px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'color 0.15s, border-color 0.15s',
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── Housing deep-link banner (shown when Housing tab is active) ── */}
      {activeTab === 'accommodation' && secondaryFilter === null && (
        <div style={{ padding: '12px 16px 0' }}>
          <button
            onClick={() => navigate('/housing')}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '12px 14px',
              background: 'rgba(52,211,153,0.07)',
              border: '1px solid rgba(52,211,153,0.2)',
              borderRadius: '12px',
              cursor: 'pointer',
              WebkitTapHighlightColor: 'transparent',
            } as React.CSSProperties}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '18px' }}>🏠</span>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '13px', color: '#34D399' }}>
                  Full housing board
                </div>
                <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.38)', marginTop: '1px' }}>
                  Rooms · Rentals · Short stays · Lodges
                </div>
              </div>
            </div>
            <ArrowRight size={16} color="#34D399" />
          </button>
        </div>
      )}

      {/* ── Secondary category pills (visible when 'all' is active) ── */}
      {activeTab === 'all' && (
        <div style={{
          display: 'flex', gap: '6px', padding: '10px 16px 0',
          overflowX: 'auto', scrollbarWidth: 'none',
          WebkitOverflowScrolling: 'touch',
        } as React.CSSProperties}>
          {SECONDARY_CATS.map(key => {
            const cat    = getCategoryConfig(key);
            const active = secondaryFilter === key;
            return (
              <button
                key={key}
                onClick={() => setSecondaryFilter(active ? null : key)}
                style={{
                  flexShrink: 0, padding: '5px 12px',
                  borderRadius: '20px',
                  border: `1px solid ${active ? cat.color : 'rgba(255,255,255,0.1)'}`,
                  background: active ? `${cat.color}18` : 'rgba(255,255,255,0.04)',
                  color: active ? cat.color : 'rgba(255,255,255,0.45)',
                  fontSize: '12px', fontWeight: active ? 700 : 500,
                  fontFamily: 'Inter, sans-serif', cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                {cat.emoji} {cat.label}
              </button>
            );
          })}
        </div>
      )}

      {/* ── Feed ── */}
      <div style={{ padding: '12px 16px 0' }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <PostSkeleton />
            <PostSkeleton />
            <PostSkeleton />
          </div>
        ) : posts.length === 0 ? (
          <div style={{ paddingTop: '8px' }}>
            {activeTab === 'all' && !secondaryFilter ? (
              <NudgeCard
                emoji="💬"
                title={`Nothing posted in ${geoScope === 'my_area' ? (display || 'your area') : geoScope === 'nearby' ? 'your area or nearby' : 'any area'} yet.`}
                body="The conversation starts with you."
                ctaLabel="Start the first post"
                onCta={() => navigate('/board/new')}
                accent="#39D98A"
              />
            ) : activeTab === 'jobs' ? (
              <NudgeCard
                emoji="💼"
                title="No jobs posted yet"
                body={`No job listings in ${geoScope === 'my_area' ? (display || 'your area') : 'this area'} yet. Know of a position? Post it and help your neighbours find work.`}
                ctaLabel="Post a job"
                onCta={() => navigate('/board/new?cat=jobs')}
                accent="#A78BFA"
              />
            ) : activeTab === 'services' ? (
              <NudgeCard
                emoji="🔧"
                title="No services listed"
                body={`No services in ${geoScope === 'my_area' ? (display || 'your area') : 'this area'} yet. Do you fix, clean, build, teach or care? Let your neighbourhood know.`}
                ctaLabel="List your service"
                onCta={() => navigate('/board/new?cat=services')}
                accent="#60A5FA"
              />
            ) : activeTab === 'accommodation' ? (
              <NudgeCard
                emoji="🏠"
                title="No housing listings"
                body={`No rooms or rentals posted in ${geoScope === 'my_area' ? (display || 'your area') : 'this area'} yet. Know a place to stay? Post it.`}
                ctaLabel="Post a listing"
                onCta={() => navigate('/board/new?cat=accommodation')}
                accent="#34D399"
              />
            ) : activeTab === 'announcements' ? (
              <NudgeCard
                emoji="📢"
                title="No notices posted"
                body={`Nothing announced in ${geoScope === 'my_area' ? (display || 'your area') : 'this area'} yet. Have something to share with your neighbours?`}
                ctaLabel="Post a notice"
                onCta={() => navigate('/board/new?cat=announcements')}
                accent="#F59E0B"
              />
            ) : secondaryFilter === 'ask' ? (
              <NudgeCard
                emoji="❓"
                title={`No questions asked in ${geoScope === 'my_area' ? (display || 'your area') : 'this area'} yet`}
                body="Need to know a good mechanic, a cheap plumber, or what that new place on the corner is? Ask your neighbours."
                ctaLabel={`Ask ${display || 'the neighbourhood'}`}
                onCta={() => navigate(`/board/new?cat=ask`)}
                accent="#A78BFA"
              />
            ) : (
              <NudgeCard
                emoji={getCategoryConfig(secondaryFilter ?? activeTab).emoji}
                title={`No ${activeLabel} posts in ${geoScope === 'my_area' ? (display || 'your area') : 'this area'}`}
                body="Nothing here yet — you could be the first to post in this category."
                ctaLabel={`Post ${activeLabel}`}
                onCta={() => navigate(`/board/new?cat=${secondaryFilter ?? activeTab}`)}
                accent={getCategoryConfig(secondaryFilter ?? activeTab).color}
              />
            )}

            {/* Scope expansion nudges */}
            {geoScope === 'my_area' && (
              <div style={{ display: 'flex', gap: '8px', marginTop: '14px', justifyContent: 'center', flexWrap: 'wrap' }}>
                <button
                  onClick={() => setGeoScope('nearby')}
                  style={{ padding: '8px 16px', borderRadius: '20px', border: '1px solid rgba(57,217,138,0.25)', background: 'rgba(57,217,138,0.06)', color: '#39D98A', fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                >
                  See nearby posts
                </button>
                <button
                  onClick={() => setGeoScope('everywhere')}
                  style={{ padding: '8px 16px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.45)', fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                >
                  See all areas
                </button>
              </div>
            )}
            {geoScope === 'nearby' && (
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: '14px' }}>
                <button
                  onClick={() => setGeoScope('everywhere')}
                  style={{ padding: '8px 16px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.45)', fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                >
                  See all areas
                </button>
              </div>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {posts.map(post => (
              <PostCard
                key={post.id}
                post={post}
                isMine={mineIds.includes(post.id) || post.userId === userId}
                onMarkTaken={handleMarkTaken}
                onMarkResolved={handleMarkResolved}
                isExpanded={expandedPostId === post.id}
                onToggleExpand={() => toggleExpand(post.id)}
              />
            ))}
            <p style={{ textAlign: 'center', fontFamily: 'Inter, sans-serif', fontSize: '12px', color: 'rgba(255,255,255,0.2)', marginTop: '8px', marginBottom: 0 }}>
              {posts.length} post{posts.length !== 1 ? 's' : ''} · {geoScope === 'my_area' ? (display || 'your area') : geoScope === 'nearby' ? `${display || 'your area'} + nearby` : 'all areas'}
            </p>
          </div>
        )}

        {/* Bottom CTA — always visible */}
        <button
          onClick={() => navigate('/board/new')}
          style={{
            width: '100%', marginTop: '16px',
            border: '1px dashed rgba(57,217,138,0.25)',
            borderRadius: '14px', padding: '16px',
            background: 'transparent', cursor: 'pointer',
            fontFamily: 'Inter, sans-serif', fontSize: '13px', fontWeight: 600,
            color: 'rgba(57,217,138,0.7)',
            WebkitTapHighlightColor: 'transparent',
          } as React.CSSProperties}
        >
          + Post to the {headerSuburb || 'Community'} Board
        </button>
      </div>

      {/* ── FAB ── */}
      <button
        onClick={() => navigate('/board/new')}
        style={{
          position: 'fixed', bottom: '80px', right: '20px',
          width: '56px', height: '56px', borderRadius: '50%',
          background: '#39D98A', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 20px rgba(57,217,138,0.4)', zIndex: 50,
        }}
        aria-label="Post something"
      >
        <Plus size={24} color="#000" strokeWidth={2.5} />
      </button>
    </div>
  );
}
