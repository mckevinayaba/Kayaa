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

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, AlertTriangle, X, MessageCircle, ChevronRight,
  Briefcase, Wrench, Home, Megaphone, ArrowRight,
} from 'lucide-react';
import NudgeCard from '../components/NudgeCard';
import {
  getBoardPosts,
  updateBoardPostStatus,
  type BoardPost,
  type BoardCategory,
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
  const num = post.contactWhatsapp.replace(/\D/g, '');
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
        fontFamily: 'DM Sans, sans-serif', fontWeight: 700, fontSize: '12px',
        textDecoration: 'none',
      }}
    >
      <MessageCircle size={13} />
      Contact on WhatsApp
    </a>
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
            fontFamily: 'DM Sans, sans-serif', fontSize: '11px', fontWeight: 700,
            color: cfg.color, background: `${cfg.color}18`,
            padding: '1px 8px', borderRadius: '10px',
          }}>
            {cfg.label}
          </span>
        </div>
        <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>
          {formatAge(post.createdAt)}
        </span>
      </div>

      <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '15px', color: '#F0F6FC', marginBottom: '4px', lineHeight: 1.3 }}>
        {post.title}
      </div>

      {post.description && (
        <p style={{
          fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: 'rgba(255,255,255,0.52)',
          margin: '0 0 8px', lineHeight: 1.55,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        } as React.CSSProperties}>
          {post.description}
        </p>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>
            📍 {post.neighbourhood}
          </span>
          {post.price != null && (
            <span style={{
              fontFamily: 'DM Sans, sans-serif', fontSize: '12px', fontWeight: 700,
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
              cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
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
            fontFamily: 'DM Sans, sans-serif', fontSize: '11px', fontWeight: 700,
            color: svcCfg.color, background: `${svcCfg.color}18`,
            padding: '1px 8px', borderRadius: '10px',
          }}>
            {svcCfg.label}
          </span>
        </div>
        <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>
          {formatAge(post.createdAt)}
        </span>
      </div>

      <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '15px', color: '#F0F6FC', marginBottom: '4px', lineHeight: 1.3 }}>
        {post.title}
      </div>

      {post.description && (
        <p style={{
          fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: 'rgba(255,255,255,0.52)',
          margin: '0 0 8px', lineHeight: 1.55,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        } as React.CSSProperties}>
          {post.description}
        </p>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>
            📍 {post.neighbourhood}
          </span>
          {post.videoUrl && (
            <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: 'rgba(96,165,250,0.7)', background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.18)', borderRadius: '20px', padding: '1px 7px' }}>
              🎬 Video
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {post.price != null && (
            <span style={{
              fontFamily: 'Syne, sans-serif', fontSize: '13px', fontWeight: 700, color: '#60A5FA',
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
                cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
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
            fontFamily: 'DM Sans, sans-serif', fontSize: '11px', fontWeight: 700,
            color: '#34D399', background: 'rgba(52,211,153,0.12)',
            padding: '1px 8px', borderRadius: '10px',
          }}>
            {subType}
          </span>
        </div>
        <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>
          {formatAge(post.createdAt)}
        </span>
      </div>

      <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '15px', color: '#F0F6FC', marginBottom: '4px', lineHeight: 1.3 }}>
        {post.title}
      </div>

      <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '16px', color: '#34D399', marginBottom: '6px' }}>
        {priceLabel}
      </div>

      {post.description && (
        <p style={{
          fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: 'rgba(255,255,255,0.52)',
          margin: '0 0 8px', lineHeight: 1.55,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        } as React.CSSProperties}>
          {post.description}
        </p>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>
            📍 {post.neighbourhood}
          </span>
          {post.videoUrl && (
            <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: 'rgba(52,211,153,0.7)', background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.18)', borderRadius: '20px', padding: '1px 7px' }}>
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
              cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
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
          <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', fontWeight: 700, color: '#F59E0B' }}>
            Notice
          </span>
        </div>
        <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>
          {formatAge(post.createdAt)}
        </span>
      </div>

      <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '15px', color: '#F0F6FC', marginBottom: '6px', lineHeight: 1.3 }}>
        {post.title}
      </div>

      {post.description && (
        <p style={{
          fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: 'rgba(255,255,255,0.6)',
          margin: '0 0 8px', lineHeight: 1.6,
          display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        } as React.CSSProperties}>
          {post.description}
        </p>
      )}

      <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>
        📍 {post.neighbourhood}
      </span>
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
          fontFamily: 'DM Sans, sans-serif',
        }}>
          {cat.emoji} {cat.label}
        </span>
        <span style={{ fontSize: '11px', color: 'var(--color-muted)', fontFamily: 'DM Sans, sans-serif' }}>
          {formatAge(post.createdAt)}
        </span>
      </div>

      <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '14px', color: 'var(--color-text)', marginBottom: post.description ? '4px' : '8px', lineHeight: 1.35 }}>
        {post.title}
      </div>

      {post.description && (
        <p style={{
          fontSize: '13px', color: 'var(--color-muted)', margin: '0 0 10px', lineHeight: 1.55,
          fontFamily: 'DM Sans, sans-serif',
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        } as React.CSSProperties}>
          {post.description}
        </p>
      )}

      {post.price != null && (
        <div style={{ fontSize: '15px', fontWeight: 700, color: '#39D98A', marginBottom: '10px', fontFamily: 'DM Sans, sans-serif' }}>
          R{post.price.toLocaleString()}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '11px', color: 'var(--color-muted)', fontFamily: 'DM Sans, sans-serif' }}>
            📍 {post.neighbourhood}
          </span>
          {post.images.length > 0 && <span style={{ fontSize: '11px', color: 'var(--color-muted)' }}>· 📷 {post.images.length}</span>}
          {post.videoUrl && <span style={{ fontSize: '11px', color: 'rgba(57,217,138,0.6)', background: 'rgba(57,217,138,0.07)', border: '1px solid rgba(57,217,138,0.15)', borderRadius: '20px', padding: '1px 7px' }}>🎬 Video</span>}
          {post.commentsCount > 0 && <span style={{ fontSize: '11px', color: 'var(--color-muted)' }}>· 💬 {post.commentsCount}</span>}
        </div>

        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }} onClick={e => e.stopPropagation()}>
          {post.contactWhatsapp && (
            <a
              href={`https://wa.me/${post.contactWhatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(`Hi, I saw your post "${post.title}" on the Kayaa board`)}`}
              target="_blank" rel="noopener noreferrer"
              style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#25D366', color: '#000', borderRadius: '20px', padding: '5px 10px', fontSize: '11px', fontWeight: 700, fontFamily: 'DM Sans, sans-serif', textDecoration: 'none' }}
            >
              <MessageCircle size={12} /> WhatsApp
            </a>
          )}
          {isMine && post.status === 'active' && (
            <button
              onClick={() => (post.category === 'for_sale' || post.category === 'free' || post.category === 'accommodation') ? onMarkTaken(post.id) : onMarkResolved(post.id)}
              style={{ background: 'var(--color-border)', color: 'var(--color-muted)', border: 'none', borderRadius: '20px', padding: '5px 10px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}
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

function PostCard({ post, isMine, onMarkTaken, onMarkResolved }: {
  post: BoardPost;
  isMine: boolean;
  onMarkTaken: (id: string) => void;
  onMarkResolved: (id: string) => void;
}) {
  if (post.category === 'jobs')          return <JobCard post={post} isMine={isMine} onMarkResolved={onMarkResolved} />;
  if (post.category === 'services')      return <ServiceCard post={post} isMine={isMine} onMarkResolved={onMarkResolved} />;
  if (post.category === 'accommodation') return <HousingListCard post={post} isMine={isMine} onMarkTaken={onMarkTaken} />;
  if (post.category === 'announcements' || (post as { category: string }).category === 'announcer') {
    return <NoticeCard post={post} />;
  }
  return <GenericCard post={post} isMine={isMine} onMarkTaken={onMarkTaken} onMarkResolved={onMarkResolved} />;
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
  const [boardHintDismissed, setBoardHintDismissed] = useState(
    () => { try { return localStorage.getItem('kayaa_board_hint_seen') === 'true'; } catch { return false; } }
  );

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
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#EF4444', fontFamily: 'DM Sans, sans-serif' }}>
              {freshSafetyPosts.length} safety alert{freshSafetyPosts.length > 1 ? 's' : ''} in your area
            </div>
            <div style={{ fontSize: '12px', color: 'rgba(239,68,68,0.7)', fontFamily: 'DM Sans, sans-serif', marginTop: '2px' }}>
              {freshSafetyPosts[0].title}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }} onClick={e => e.stopPropagation()}>
            <button
              onClick={() => navigate('/alerts')}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '2px', flexShrink: 0, fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: '#EF4444', fontWeight: 700 }}
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
          <div>
            <p style={{
              fontFamily: 'DM Sans, sans-serif', fontSize: '11px', fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.1em',
              color: 'rgba(255,255,255,0.35)', margin: '0 0 4px',
            }}>
              Community board
            </p>
            <h1 style={{
              fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '26px',
              color: '#FFFFFF', margin: 0, letterSpacing: '-0.01em',
            }}>
              {headerSuburb ? `${headerSuburb} Board` : 'Community Board'}
            </h1>
          </div>
          <button
            onClick={() => navigate('/board/mine')}
            style={{
              background: 'transparent', border: '1px solid var(--color-border)',
              borderRadius: '20px', padding: '6px 12px',
              fontSize: '12px', fontWeight: 600, color: 'var(--color-muted)',
              cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
            }}
          >
            My posts
          </button>
        </div>
      </div>

      {/* ── First-visit hint ── */}
      {!boardHintDismissed && !loading && (
        <div style={{ padding: '0 16px 12px', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: 'rgba(255,255,255,0.4)', margin: 0, lineHeight: 1.55, flex: 1 }}>
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
                fontFamily: 'DM Sans, sans-serif', fontSize: '12px',
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
                fontFamily: 'DM Sans, sans-serif',
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
                <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '13px', color: '#34D399' }}>
                  Full housing board
                </div>
                <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.38)', marginTop: '1px' }}>
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
                  fontFamily: 'DM Sans, sans-serif', cursor: 'pointer',
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
                  style={{ padding: '8px 16px', borderRadius: '20px', border: '1px solid rgba(57,217,138,0.25)', background: 'rgba(57,217,138,0.06)', color: '#39D98A', fontFamily: 'DM Sans, sans-serif', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                >
                  See nearby posts
                </button>
                <button
                  onClick={() => setGeoScope('everywhere')}
                  style={{ padding: '8px 16px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.45)', fontFamily: 'DM Sans, sans-serif', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                >
                  See all areas
                </button>
              </div>
            )}
            {geoScope === 'nearby' && (
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: '14px' }}>
                <button
                  onClick={() => setGeoScope('everywhere')}
                  style={{ padding: '8px 16px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.45)', fontFamily: 'DM Sans, sans-serif', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
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
              />
            ))}
            <p style={{ textAlign: 'center', fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: 'rgba(255,255,255,0.2)', marginTop: '8px', marginBottom: 0 }}>
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
            fontFamily: 'DM Sans, sans-serif', fontSize: '13px', fontWeight: 600,
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
