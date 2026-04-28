import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, MessageCircle, AlertTriangle, Trash2, CheckCircle,
  Heart, Send, Share2,
} from 'lucide-react';
import {
  getBoardPost,
  updateBoardPostStatus,
  deleteBoardPost,
  getBoardPostComments,
  addBoardPostComment,
  isBoardPostLikedLocally,
  toggleBoardPostLike,
  type BoardPost,
  type BoardPostComment,
} from '../lib/api';
import { getInteractiveUserId, getVisitorId } from '../lib/api';
import { BOARD_CATEGORIES } from './BoardPage';
import { PlaceShareModal } from '../components/place/ShareModal';

function formatAge(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function formatExpiry(iso: string): string {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff < 0) return 'expired';
  const hrs = Math.floor(diff / 3600000);
  if (hrs < 24) return `expires in ${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `expires in ${days}d`;
}

function getMineIds(): string[] {
  try { return JSON.parse(localStorage.getItem('kayaa_board_mine') ?? '[]'); }
  catch { return []; }
}

export default function BoardPostPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const commentInputRef = useRef<HTMLInputElement>(null);

  const [post,       setPost]       = useState<BoardPost | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [userId,     setUserId]     = useState('');
  const [mineIds,    setMineIds]    = useState<string[]>([]);
  const [activeImg,  setActiveImg]  = useState(0);
  const [confirming, setConfirming] = useState<'taken' | 'resolved' | 'delete' | null>(null);
  const [actioning,  setActioning]  = useState(false);

  // Likes
  const [liked,      setLiked]      = useState(false);
  const [likeCount,  setLikeCount]  = useState(0);
  const [liking,     setLiking]     = useState(false);

  // Comments
  const [comments,   setComments]   = useState<BoardPostComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [sending,    setSending]    = useState(false);
  const [shareOpen,  setShareOpen]  = useState(false);

  // Visitor name for comment attribution
  const visitorName = (() => {
    try { return JSON.parse(localStorage.getItem('kayaa_profile') ?? '{}').name ?? null; }
    catch { return null; }
  })();

  useEffect(() => {
    getInteractiveUserId().then(setUserId);
    setMineIds(getMineIds());
    if (!id) return;

    getBoardPost(id).then(p => {
      setPost(p);
      if (p) {
        setLikeCount(p.likesCount ?? 0);
        setLiked(isBoardPostLikedLocally(p.id));
      }
      setLoading(false);
    });

    getBoardPostComments(id).then(setComments);
  }, [id]);

  async function handleLike() {
    if (!post || liking) return;
    setLiking(true);
    const vid = getVisitorId();
    const nowLiked = await toggleBoardPostLike(post.id, vid);
    setLiked(nowLiked);
    setLikeCount(c => nowLiked ? c + 1 : Math.max(0, c - 1));
    setLiking(false);
  }

  async function handleComment() {
    if (!post || !newComment.trim() || sending) return;
    setSending(true);
    const vid = getVisitorId();
    const comment = await addBoardPostComment(post.id, vid, newComment.trim(), visitorName ?? undefined);
    if (comment) {
      setComments(prev => [...prev, comment]);
      setNewComment('');
    }
    setSending(false);
  }

  const isMine = post ? (mineIds.includes(post.id) || post.userId === userId) : false;
  const cat = post ? (BOARD_CATEGORIES.find(c => c.key === post.category) ?? { emoji: '📌', label: post.category, color: '#94A3B8' }) : null;
  const isFreshSafety = post?.category === 'safety' && (Date.now() - new Date(post.createdAt).getTime()) < 6 * 3600000;

  async function handleAction(action: 'taken' | 'resolved' | 'delete') {
    if (!post) return;
    setActioning(true);
    if (action === 'delete') {
      await deleteBoardPost(post.id, userId);
    } else {
      await updateBoardPostStatus(post.id, action, userId);
    }
    setActioning(false);
    navigate('/board');
  }

  if (loading) {
    return (
      <div style={{ padding: '16px', textAlign: 'center', paddingTop: '80px', color: 'var(--color-muted)', fontFamily: 'DM Sans, sans-serif' }}>
        Loading…
      </div>
    );
  }

  if (!post) {
    return (
      <div style={{ padding: '16px', textAlign: 'center', paddingTop: '80px' }}>
        <div style={{ fontSize: '13px', color: 'var(--color-muted)', fontFamily: 'DM Sans, sans-serif', marginBottom: '16px' }}>
          This post no longer exists.
        </div>
        <button
          onClick={() => navigate('/board')}
          style={{ background: '#39D98A', color: '#000', border: 'none', borderRadius: '20px', padding: '10px 20px', fontWeight: 700, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}
        >
          Back to Board
        </button>
      </div>
    );
  }

  return (
    <>
    <div style={{ paddingBottom: '160px', minHeight: '100vh', background: 'var(--color-bg)' }}>

      {/* Safety strip */}
      {isFreshSafety && (
        <div style={{ background: '#EF4444', padding: '10px 16px', display: 'flex', gap: '8px', alignItems: 'center' }}>
          <AlertTriangle size={16} color="#fff" />
          <span style={{ fontSize: '13px', fontWeight: 700, color: '#fff', fontFamily: 'DM Sans, sans-serif' }}>
            Active safety alert · posted {formatAge(post.createdAt)}
          </span>
        </div>
      )}

      {/* Back nav */}
      <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <button
          onClick={() => navigate('/board')}
          style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
        >
          <ArrowLeft size={20} color="var(--color-text)" />
        </button>
        <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: 'var(--color-muted)' }}>
          The Board
        </span>
      </div>

      <div style={{ padding: '0 16px' }}>

        {/* Category badge */}
        {cat && (
          <div style={{ marginBottom: '10px' }}>
            <span style={{
              fontSize: '12px', fontWeight: 700,
              color: isFreshSafety ? '#EF4444' : cat.color,
              background: isFreshSafety ? 'rgba(239,68,68,0.12)' : `${cat.color}18`,
              padding: '3px 10px', borderRadius: '20px',
            }}>
              {cat.emoji} {cat.label}
            </span>
          </div>
        )}

        {/* Title */}
        <h1 style={{
          fontFamily: 'Syne, sans-serif', fontWeight: 800,
          fontSize: '22px', color: 'var(--color-text)',
          margin: '0 0 8px', lineHeight: 1.3,
        }}>
          {post.title}
        </h1>

        {/* Meta */}
        <div style={{ display: 'flex', gap: '10px', fontSize: '12px', color: 'var(--color-muted)', fontFamily: 'DM Sans, sans-serif', marginBottom: '16px', flexWrap: 'wrap' }}>
          <span>📍 {post.neighbourhood}</span>
          <span>· {formatAge(post.createdAt)}</span>
          {post.expiresAt && (
            <span>· ⏳ {formatExpiry(post.expiresAt)}</span>
          )}
          {post.status !== 'active' && (
            <span style={{ color: '#F5A623', fontWeight: 700 }}>· {post.status.toUpperCase()}</span>
          )}
        </div>

        {/* Price */}
        {post.price != null && (
          <div style={{
            fontSize: '28px', fontWeight: 800,
            color: '#39D98A', marginBottom: '16px',
            fontFamily: 'DM Sans, sans-serif',
          }}>
            R{post.price.toLocaleString()}
          </div>
        )}

        {/* Images */}
        {post.images.length > 0 && (
          <div style={{ marginBottom: '18px' }}>
            <div style={{
              borderRadius: '14px', overflow: 'hidden',
              background: 'var(--color-surface)',
              aspectRatio: '16/9', marginBottom: '8px',
            }}>
              <img
                src={post.images[activeImg]}
                alt=""
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
            {post.images.length > 1 && (
              <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', scrollbarWidth: 'none' } as React.CSSProperties}>
                {post.images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImg(i)}
                    style={{
                      flexShrink: 0, width: '52px', height: '52px',
                      borderRadius: '8px', overflow: 'hidden',
                      border: `2px solid ${i === activeImg ? '#39D98A' : 'transparent'}`,
                      padding: 0, cursor: 'pointer', background: 'none',
                    }}
                  >
                    <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Description */}
        {post.description && (
          <div style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '14px', padding: '14px',
            marginBottom: '18px',
          }}>
            <p style={{
              fontSize: '14px', color: 'var(--color-text)',
              lineHeight: 1.65, margin: 0,
              fontFamily: 'DM Sans, sans-serif',
              whiteSpace: 'pre-wrap',
            }}>
              {post.description}
            </p>
          </div>
        )}

        {/* WhatsApp CTA */}
        {post.contactWhatsapp && post.status === 'active' && (
          <a
            href={`https://wa.me/${post.contactWhatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(`Hi, I saw your post "${post.title}" on the Kayaa board (${post.neighbourhood})`)}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: '8px',
              background: '#25D366', color: '#000',
              borderRadius: '14px', padding: '16px',
              fontSize: '16px', fontWeight: 800,
              fontFamily: 'DM Sans, sans-serif', textDecoration: 'none',
              marginBottom: '12px',
            }}
          >
            <MessageCircle size={20} />
            Message on WhatsApp
          </a>
        )}

        {/* ── Action bar: like · comment · share ─────────────────────────── */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '4px',
          padding: '12px 0',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          marginBottom: '16px',
        }}>
          {/* Like */}
          <button
            onClick={handleLike}
            disabled={liking}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              background: 'none', border: 'none', cursor: liking ? 'default' : 'pointer',
              padding: '8px 12px', borderRadius: '10px',
              color: liked ? '#F87171' : 'rgba(255,255,255,0.45)',
              fontFamily: 'DM Sans, sans-serif', fontSize: '13px', fontWeight: 600,
              transition: 'color 0.15s',
            }}
          >
            <Heart
              size={18}
              color={liked ? '#F87171' : 'rgba(255,255,255,0.45)'}
              fill={liked ? '#F87171' : 'none'}
              style={{ transition: 'all 0.15s' }}
            />
            {likeCount > 0 ? likeCount : 'Like'}
          </button>

          {/* Comment */}
          <button
            onClick={() => commentInputRef.current?.focus()}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '8px 12px', borderRadius: '10px',
              color: 'rgba(255,255,255,0.45)',
              fontFamily: 'DM Sans, sans-serif', fontSize: '13px', fontWeight: 600,
            }}
          >
            <MessageCircle size={18} color="rgba(255,255,255,0.45)" />
            {comments.length > 0 ? comments.length : 'Comment'}
          </button>

          {/* Share */}
          <button
            onClick={() => setShareOpen(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '8px 12px', borderRadius: '10px',
              color: 'rgba(255,255,255,0.45)',
              fontFamily: 'DM Sans, sans-serif', fontSize: '13px', fontWeight: 600,
            }}
          >
            <Share2 size={18} color="rgba(255,255,255,0.45)" />
            Share
          </button>

          {/* Report */}
          <a
            href={`mailto:hello@kayaa.co.za?subject=Report board post&body=Post ID: ${post.id}%0ATitle: ${encodeURIComponent(post.title)}%0A%0APlease describe the issue:`}
            style={{
              display: 'flex', alignItems: 'center',
              marginLeft: 'auto',
              padding: '8px 10px', borderRadius: '10px',
              color: 'rgba(255,255,255,0.2)', textDecoration: 'none',
              fontFamily: 'DM Sans, sans-serif', fontSize: '12px',
            }}
          >
            Report
          </a>
        </div>

        {/* ── Comments ───────────────────────────────────────────────────── */}
        <div style={{ marginBottom: '80px' }}>
          <h2 style={{
            fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '15px',
            color: 'var(--color-text)', margin: '0 0 14px',
          }}>
            Comments {comments.length > 0 ? `(${comments.length})` : ''}
          </h2>

          {comments.length === 0 ? (
            <div style={{
              textAlign: 'center', padding: '24px 0',
              fontFamily: 'DM Sans, sans-serif', fontSize: '13px',
              color: 'rgba(255,255,255,0.3)',
            }}>
              No comments yet — be the first!
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {comments.map(c => {
                const initial = (c.visitorName ?? 'A')[0].toUpperCase();
                return (
                  <div key={c.id} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                    {/* Avatar */}
                    <div style={{
                      width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                      background: 'rgba(57,217,138,0.1)', border: '1px solid rgba(57,217,138,0.15)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '13px', color: '#39D98A',
                    }}>
                      {initial}
                    </div>
                    {/* Body */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                        <span style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 700, fontSize: '13px', color: 'var(--color-text)' }}>
                          {c.visitorName ?? 'Anonymous'}
                        </span>
                        <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>
                          {formatAge(c.createdAt)}
                        </span>
                      </div>
                      <p style={{
                        fontFamily: 'DM Sans, sans-serif', fontSize: '13px',
                        color: 'rgba(255,255,255,0.75)', lineHeight: 1.5, margin: 0,
                      }}>
                        {c.content}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Share modal */}
        {shareOpen && (
          <PlaceShareModal
            place={{
              id: post.id, name: post.title, slug: post.id,
              tagline: post.neighbourhood, emoji: cat?.emoji ?? '📌', category: cat?.label ?? post.category,
            }}
            onClose={() => setShareOpen(false)}
          />
        )}

        {/* Owner controls */}
        {isMine && post.status === 'active' && (
          <div style={{ marginTop: '8px' }}>
            <div style={{
              fontSize: '11px', color: 'var(--color-muted)',
              fontFamily: 'DM Sans, sans-serif', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px',
            }}>
              Your post
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              {(post.category === 'for_sale' || post.category === 'free' || post.category === 'accommodation') ? (
                <button
                  onClick={() => setConfirming('taken')}
                  style={{
                    flex: 1, background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '12px', padding: '12px',
                    color: 'var(--color-text)', fontSize: '13px', fontWeight: 700,
                    cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                  }}
                >
                  <CheckCircle size={15} /> Mark as Taken
                </button>
              ) : (
                <button
                  onClick={() => setConfirming('resolved')}
                  style={{
                    flex: 1, background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '12px', padding: '12px',
                    color: 'var(--color-text)', fontSize: '13px', fontWeight: 700,
                    cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                  }}
                >
                  <CheckCircle size={15} /> Mark Resolved
                </button>
              )}
              <button
                onClick={() => setConfirming('delete')}
                style={{
                  background: 'rgba(239,68,68,0.1)',
                  border: '1px solid rgba(239,68,68,0.2)',
                  borderRadius: '12px', padding: '12px 16px',
                  color: '#EF4444', fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '4px',
                }}
              >
                <Trash2 size={15} />
              </button>
            </div>
          </div>
        )}

        {/* Confirm overlay */}
        {confirming && (
          <div style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex', alignItems: 'flex-end',
          }}>
            <div style={{
              background: 'var(--color-surface)',
              borderRadius: '20px 20px 0 0',
              padding: '24px 20px 40px',
              width: '100%', boxSizing: 'border-box',
            }}>
              <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '18px', color: 'var(--color-text)', marginBottom: '8px' }}>
                {confirming === 'delete' ? 'Delete this post?' : confirming === 'taken' ? 'Mark as taken?' : 'Mark as resolved?'}
              </div>
              <div style={{ fontSize: '13px', color: 'var(--color-muted)', fontFamily: 'DM Sans, sans-serif', marginBottom: '20px' }}>
                {confirming === 'delete'
                  ? 'This will permanently remove the post from the board.'
                  : 'This post will be moved off the board and shown as closed.'}
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => setConfirming(null)}
                  disabled={actioning}
                  style={{
                    flex: 1, background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '12px', padding: '14px',
                    color: 'var(--color-muted)', fontSize: '14px', fontWeight: 700,
                    cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleAction(confirming)}
                  disabled={actioning}
                  style={{
                    flex: 1,
                    background: confirming === 'delete' ? '#EF4444' : '#39D98A',
                    border: 'none', borderRadius: '12px', padding: '14px',
                    color: '#000', fontSize: '14px', fontWeight: 800,
                    cursor: actioning ? 'default' : 'pointer',
                    fontFamily: 'DM Sans, sans-serif',
                    opacity: actioning ? 0.6 : 1,
                  }}
                >
                  {actioning ? 'Working…' : confirming === 'delete' ? 'Delete' : 'Confirm'}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>

    {/* ── Fixed comment input bar ─────────────────────────────────────────── */}
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 60,
      background: 'rgba(13,17,23,0.97)', backdropFilter: 'blur(14px)',
      borderTop: '1px solid rgba(255,255,255,0.07)',
      padding: '10px 16px',
      paddingBottom: 'calc(10px + env(safe-area-inset-bottom))',
      display: 'flex', gap: '10px', alignItems: 'center',
    }}>
      {/* Visitor avatar */}
      <div style={{
        width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
        background: 'rgba(57,217,138,0.1)', border: '1px solid rgba(57,217,138,0.2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '12px', color: '#39D98A',
      }}>
        {visitorName ? visitorName[0].toUpperCase() : '?'}
      </div>

      <input
        ref={commentInputRef}
        type="text"
        value={newComment}
        onChange={e => setNewComment(e.target.value.slice(0, 300))}
        onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleComment()}
        placeholder="Add a comment…"
        style={{
          flex: 1,
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '20px',
          padding: '9px 16px',
          color: '#fff', fontSize: '14px',
          fontFamily: 'DM Sans, sans-serif',
          outline: 'none',
        }}
      />

      <button
        onClick={handleComment}
        disabled={!newComment.trim() || sending}
        style={{
          width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
          background: newComment.trim() ? '#39D98A' : 'rgba(255,255,255,0.07)',
          border: 'none', cursor: newComment.trim() ? 'pointer' : 'default',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'background 0.15s',
          opacity: sending ? 0.6 : 1,
        }}
      >
        <Send size={16} color={newComment.trim() ? '#000' : 'rgba(255,255,255,0.3)'} />
      </button>
    </div>
    </>
  );
}
