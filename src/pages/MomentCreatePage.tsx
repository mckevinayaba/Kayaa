/**
 * MomentCreatePage — /moments/new
 *
 * Lightweight creation flow for Neighbourhood Moments.
 * One photo or one short video + short caption + neighbourhood tag.
 * 24-hour expiry — not permanent content.
 *
 * Surface rules enforced here:
 *   Moments  = vibe, atmosphere, local context
 *   Board    = listings, selling, services, requests
 *   Alerts   = urgent danger, crime, safety warnings
 *
 * Guardrails are soft (copy-based) not hard (block-based).
 * The form routing hints steer people toward the right surface.
 */

import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Camera, Video, X, MapPin, Loader, Image as ImageIcon,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNeighbourhood } from '../contexts/NeighbourhoodContext';
import {
  uploadMomentMedia,
  createMoment,
} from '../lib/api';

// ─── Content guardrail keywords ───────────────────────────────────────────────

const ALERT_WORDS = /\b(robbery|robbery|hijack|shooting|stabbing|crime|armed|danger|emergency|fire|missing|accident|shooting|alert|suspect|attack|flee|running|gun|knife)\b/i;
const BOARD_WORDS = /\b(selling|for sale|WTS|WTB|wanted|job|hiring|room to rent|available|rent|service|price|R\d|^\d+ rand)\b/i;

function detectIntent(caption: string): 'alert' | 'board' | null {
  if (ALERT_WORDS.test(caption)) return 'alert';
  if (BOARD_WORDS.test(caption)) return 'board';
  return null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const INPUT_STYLE: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box',
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '12px',
  padding: '12px 14px',
  color: '#F0F6FC',
  fontSize: '15px', fontFamily: 'Inter, sans-serif',
  outline: 'none',
};

// ─── Upload state ─────────────────────────────────────────────────────────────

type UploadState =
  | { status: 'idle' }
  | { status: 'uploading' }
  | { status: 'done'; localUrl: string; remoteUrl: string; mediaType: 'photo' | 'video' }
  | { status: 'error'; msg: string };

// ─── Page ────────────────────────────────────────────────────────────────────

export default function MomentCreatePage() {
  const navigate  = useNavigate();
  const { user }  = useAuth();
  const { displaySuburb, displayCity } = useNeighbourhood();
  const neighbourhood = displaySuburb || displayCity || '';

  const [caption,    setCaption]    = useState('');
  const [venueName,  setVenueName]  = useState('');
  const [upload,     setUpload]     = useState<UploadState>({ status: 'idle' });
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  // Routing hint based on caption content
  const intent = detectIntent(caption);

  const canSubmit =
    upload.status === 'done' &&
    caption.trim().length >= 3 &&
    !submitting;

  // ── Auth gate ────────────────────────────────────────────────────────────────
  if (!user) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', flex: 1,
        padding: '32px 24px', textAlign: 'center',
        minHeight: 'calc(100vh - 120px)',
      }}>
        <div style={{ fontSize: '36px', marginBottom: '16px' }}>📸</div>
        <h2 style={{
          fontFamily: 'Inter, sans-serif', fontWeight: 800,
          fontSize: '18px', color: '#F0F6FC', margin: '0 0 8px',
        }}>
          Sign in to share
        </h2>
        <p style={{
          fontFamily: 'Inter, sans-serif', fontSize: '13px',
          color: 'rgba(255,255,255,0.4)', margin: '0 0 24px', lineHeight: 1.6,
          maxWidth: '260px',
        }}>
          Neighbourhood Moments are tied to your area. Sign in to share what's happening nearby.
        </p>
        <button
          onClick={() => navigate('/welcome', { state: { next: '/moments/new' } })}
          style={{
            padding: '12px 28px', borderRadius: '12px', border: 'none',
            background: '#39D98A', color: '#0D1117',
            fontFamily: 'Inter, sans-serif', fontWeight: 800, fontSize: '14px',
            cursor: 'pointer',
          }}
        >
          Sign in
        </button>
      </div>
    );
  }

  // ── Media handling ───────────────────────────────────────────────────────────

  async function handleFile(file: File) {
    if (!user) return;
    const isVideo = file.type.startsWith('video/');

    // Size limits: photo 20 MB, video 50 MB
    const limitMB = isVideo ? 50 : 20;
    if (file.size > limitMB * 1024 * 1024) {
      setError(`${isVideo ? 'Video' : 'Photo'} must be under ${limitMB} MB.`);
      return;
    }

    // Revoke previous local URL
    if (upload.status === 'done') {
      URL.revokeObjectURL(upload.localUrl);
    }

    setError(null);
    setUpload({ status: 'uploading' });

    try {
      const localUrl = URL.createObjectURL(file);
      const { url: remoteUrl, mediaType } = await uploadMomentMedia(user.id, file);
      setUpload({ status: 'done', localUrl, remoteUrl, mediaType });
    } catch {
      setUpload({ status: 'error', msg: 'Upload failed. Check your connection and try again.' });
    }
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = '';
  }

  function handleVideoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = '';
  }

  function removeMedia() {
    if (upload.status === 'done') URL.revokeObjectURL(upload.localUrl);
    setUpload({ status: 'idle' });
    setError(null);
  }

  // ── Submit ───────────────────────────────────────────────────────────────────

  const handleSubmit = useCallback(async () => {
    if (!canSubmit || upload.status !== 'done') return;
    setError(null);
    setSubmitting(true);

    const { error: apiError } = await createMoment(user.id, {
      neighbourhood,
      caption: caption.trim(),
      mediaUrl: upload.remoteUrl,
      mediaType: upload.mediaType,
      venueName: venueName.trim() || undefined,
      isAnonymous: false,
    });

    setSubmitting(false);

    if (apiError) {
      setError('Could not post your moment. Please try again.');
      return;
    }

    // Navigate back to feed — moment will appear in strip after reload
    navigate('/feed');
  }, [canSubmit, upload, caption, neighbourhood, venueName, user.id, navigate]);

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      minHeight: 'calc(100vh - 56px)',
      background: 'var(--color-bg)',
    }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{
        flexShrink: 0,
        padding: '16px 16px 14px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '4px 0', color: 'rgba(255,255,255,0.5)',
            fontFamily: 'Inter, sans-serif', fontSize: '14px',
          }}
        >
          <ArrowLeft size={16} color="rgba(255,255,255,0.5)" />
          Back
        </button>
        <div style={{ marginTop: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{
              display: 'inline-block', width: '7px', height: '7px', borderRadius: '50%',
              background: '#39D98A', boxShadow: '0 0 6px rgba(57,217,138,0.7)',
            }} />
            <span style={{
              fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '11px',
              color: '#39D98A', letterSpacing: '0.06em', textTransform: 'uppercase',
            }}>
              Neighbourhood Moment
            </span>
          </div>
          <h1 style={{
            fontFamily: 'Inter, sans-serif', fontWeight: 800,
            fontSize: '20px', color: '#F0F6FC', margin: '0 0 4px', lineHeight: 1.2,
          }}>
            What's happening nearby?
          </h1>
          <p style={{
            fontFamily: 'Inter, sans-serif', fontSize: '13px',
            color: 'rgba(255,255,255,0.38)', margin: 0, lineHeight: 1.5,
          }}>
            Gone in 24 hours. Just a slice of now.
          </p>
        </div>
      </div>

      {/* ── Scrollable form body ─────────────────────────────────────────────── */}
      <div style={{
        flex: 1, overflowY: 'auto',
        padding: '20px 16px',
        display: 'flex', flexDirection: 'column', gap: '20px',
      }}>

        {/* ── Media picker / preview ─────────────────────────────────────────── */}
        <div>
          <label style={{
            display: 'block',
            fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '12px',
            color: 'rgba(255,255,255,0.45)', letterSpacing: '0.04em',
            textTransform: 'uppercase', marginBottom: '10px',
          }}>
            Photo or video <span style={{ color: '#EF4444' }}>*</span>
          </label>

          {upload.status === 'done' ? (
            /* Preview */
            <div style={{ position: 'relative', borderRadius: '14px', overflow: 'hidden' }}>
              {upload.mediaType === 'video' ? (
                <video
                  src={upload.localUrl}
                  preload="metadata"
                  playsInline
                  controls
                  style={{ width: '100%', maxHeight: '260px', objectFit: 'contain', display: 'block', background: '#000' }}
                />
              ) : (
                <img
                  src={upload.localUrl}
                  alt="Moment preview"
                  style={{ width: '100%', maxHeight: '260px', objectFit: 'cover', display: 'block' }}
                />
              )}
              <button
                onClick={removeMedia}
                style={{
                  position: 'absolute', top: '10px', right: '10px',
                  width: '30px', height: '30px', borderRadius: '50%',
                  background: 'rgba(0,0,0,0.7)', border: 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', zIndex: 2,
                }}
              >
                <X size={15} color="#fff" />
              </button>
            </div>
          ) : upload.status === 'uploading' ? (
            /* Uploading spinner */
            <div style={{
              height: '160px', borderRadius: '14px',
              background: 'rgba(255,255,255,0.03)',
              border: '1px dashed rgba(255,255,255,0.12)',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: '12px',
            }}>
              <Loader size={22} color="rgba(255,255,255,0.3)" style={{ animation: 'spin 1s linear infinite' }} />
              <span style={{
                fontFamily: 'Inter, sans-serif', fontSize: '13px',
                color: 'rgba(255,255,255,0.35)',
              }}>
                Uploading…
              </span>
            </div>
          ) : (
            /* Two-button picker */
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => photoInputRef.current?.click()}
                style={{
                  flex: 1, padding: '20px 10px', borderRadius: '14px',
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px dashed rgba(255,255,255,0.12)',
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', gap: '8px',
                  cursor: 'pointer',
                }}
              >
                <div style={{
                  width: '44px', height: '44px', borderRadius: '12px',
                  background: 'rgba(57,217,138,0.07)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Camera size={20} color="rgba(57,217,138,0.6)" />
                </div>
                <span style={{
                  fontFamily: 'Inter, sans-serif', fontWeight: 600,
                  fontSize: '13px', color: 'rgba(255,255,255,0.55)',
                }}>
                  Photo
                </span>
                <span style={{
                  fontFamily: 'Inter, sans-serif', fontSize: '10px',
                  color: 'rgba(255,255,255,0.22)',
                }}>
                  up to 20 MB
                </span>
              </button>

              <button
                onClick={() => videoInputRef.current?.click()}
                style={{
                  flex: 1, padding: '20px 10px', borderRadius: '14px',
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px dashed rgba(255,255,255,0.12)',
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', gap: '8px',
                  cursor: 'pointer',
                }}
              >
                <div style={{
                  width: '44px', height: '44px', borderRadius: '12px',
                  background: 'rgba(96,165,250,0.07)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Video size={20} color="rgba(96,165,250,0.55)" />
                </div>
                <span style={{
                  fontFamily: 'Inter, sans-serif', fontWeight: 600,
                  fontSize: '13px', color: 'rgba(255,255,255,0.55)',
                }}>
                  Video
                </span>
                <span style={{
                  fontFamily: 'Inter, sans-serif', fontSize: '10px',
                  color: 'rgba(255,255,255,0.22)',
                }}>
                  best under 20 sec
                </span>
              </button>
            </div>
          )}

          {/* Error */}
          {upload.status === 'error' && (
            <div style={{
              marginTop: '10px', padding: '10px 14px', borderRadius: '10px',
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.25)',
              fontFamily: 'Inter, sans-serif', fontSize: '13px',
              color: '#FCA5A5',
            }}>
              {upload.msg}
            </div>
          )}

          <p style={{
            fontFamily: 'Inter, sans-serif', fontSize: '11px',
            color: 'rgba(255,255,255,0.22)', margin: '6px 0 0', lineHeight: 1.5,
          }}>
            One photo or one short clip. Show what the area looks or feels like right now.
          </p>

          {/* Hidden inputs */}
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            onChange={handlePhotoChange}
            style={{ display: 'none' }}
          />
          <input
            ref={videoInputRef}
            type="file"
            accept="video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm"
            onChange={handleVideoChange}
            style={{ display: 'none' }}
          />
        </div>

        {/* ── Caption ──────────────────────────────────────────────────────────── */}
        <div>
          <label style={{
            display: 'block',
            fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '12px',
            color: 'rgba(255,255,255,0.45)', letterSpacing: '0.04em',
            textTransform: 'uppercase', marginBottom: '8px',
          }}>
            Caption <span style={{ color: '#EF4444' }}>*</span>
          </label>
          <textarea
            value={caption}
            onChange={e => setCaption(e.target.value.slice(0, 120))}
            placeholder={'e.g. "Queue at Home Affairs this morning." or "Power is back in the area."'}
            rows={3}
            style={{ ...INPUT_STYLE, resize: 'none', lineHeight: 1.55 }}
          />
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginTop: '4px',
          }}>
            <span style={{
              fontFamily: 'Inter, sans-serif', fontSize: '11px',
              color: 'rgba(255,255,255,0.2)',
            }}>
              Keep it short and specific.
            </span>
            <span style={{
              fontFamily: 'Inter, sans-serif', fontSize: '11px',
              color: caption.length > 100 ? '#F59E0B' : 'rgba(255,255,255,0.2)',
            }}>
              {caption.length}/120
            </span>
          </div>
        </div>

        {/* ── Routing guardrail hint ────────────────────────────────────────────── */}
        {intent === 'alert' && (
          <div style={{
            padding: '12px 14px', borderRadius: '12px',
            background: 'rgba(239,68,68,0.07)',
            border: '1px solid rgba(239,68,68,0.2)',
            display: 'flex', gap: '10px', alignItems: 'flex-start',
          }}>
            <span style={{ fontSize: '16px', flexShrink: 0 }}>🚨</span>
            <div style={{ flex: 1 }}>
              <p style={{
                fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '13px',
                color: '#F87171', margin: '0 0 4px',
              }}>
                Looks like a safety issue?
              </p>
              <p style={{
                fontFamily: 'Inter, sans-serif', fontSize: '12px',
                color: 'rgba(255,255,255,0.4)', margin: '0 0 8px', lineHeight: 1.5,
              }}>
                Crime, robbery, missing persons, and urgent danger belong in Alerts — where neighbours can act quickly.
              </p>
              <button
                onClick={() => navigate('/report/safety')}
                style={{
                  background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)',
                  borderRadius: '8px', padding: '6px 12px', cursor: 'pointer',
                  fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '12px',
                  color: '#F87171',
                }}
              >
                Report safety incident instead →
              </button>
            </div>
          </div>
        )}

        {intent === 'board' && (
          <div style={{
            padding: '12px 14px', borderRadius: '12px',
            background: 'rgba(167,139,250,0.07)',
            border: '1px solid rgba(167,139,250,0.2)',
            display: 'flex', gap: '10px', alignItems: 'flex-start',
          }}>
            <span style={{ fontSize: '16px', flexShrink: 0 }}>📋</span>
            <div style={{ flex: 1 }}>
              <p style={{
                fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '13px',
                color: '#A78BFA', margin: '0 0 4px',
              }}>
                Selling or offering something?
              </p>
              <p style={{
                fontFamily: 'Inter, sans-serif', fontSize: '12px',
                color: 'rgba(255,255,255,0.4)', margin: '0 0 8px', lineHeight: 1.5,
              }}>
                Listings, jobs, services, and rentals belong on Board — they stay visible for longer and reach the right people.
              </p>
              <button
                onClick={() => navigate('/board/new')}
                style={{
                  background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.25)',
                  borderRadius: '8px', padding: '6px 12px', cursor: 'pointer',
                  fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '12px',
                  color: '#A78BFA',
                }}
              >
                Post to Board instead →
              </button>
            </div>
          </div>
        )}

        {/* ── Neighbourhood (read-only) ─────────────────────────────────────────── */}
        <div>
          <label style={{
            display: 'block',
            fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '12px',
            color: 'rgba(255,255,255,0.45)', letterSpacing: '0.04em',
            textTransform: 'uppercase', marginBottom: '8px',
          }}>
            Neighbourhood
          </label>
          <div style={{
            ...INPUT_STYLE,
            display: 'flex', alignItems: 'center', gap: '8px',
            opacity: 0.7, cursor: 'default',
          }}>
            <MapPin size={14} color="rgba(57,217,138,0.6)" />
            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '15px', color: '#F0F6FC' }}>
              {neighbourhood || 'Your neighbourhood'}
            </span>
          </div>
          <p style={{
            fontFamily: 'Inter, sans-serif', fontSize: '11px',
            color: 'rgba(255,255,255,0.2)', margin: '5px 0 0',
          }}>
            Set automatically from your area.
          </p>
        </div>

        {/* ── Optional place name ───────────────────────────────────────────────── */}
        <div>
          <label style={{
            display: 'block',
            fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '12px',
            color: 'rgba(255,255,255,0.45)', letterSpacing: '0.04em',
            textTransform: 'uppercase', marginBottom: '8px',
          }}>
            Place name <span style={{ fontWeight: 400, color: 'rgba(255,255,255,0.2)', textTransform: 'none', letterSpacing: 0 }}>(optional)</span>
          </label>
          <div style={{ position: 'relative' }}>
            <ImageIcon
              size={14} color="rgba(255,255,255,0.25)"
              style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
            />
            <input
              type="text"
              value={venueName}
              onChange={e => setVenueName(e.target.value.slice(0, 60))}
              placeholder="e.g. Berea Park Café, Home Affairs Berea…"
              maxLength={60}
              style={{ ...INPUT_STYLE, paddingLeft: '36px' }}
            />
          </div>
          <p style={{
            fontFamily: 'Inter, sans-serif', fontSize: '11px',
            color: 'rgba(255,255,255,0.2)', margin: '5px 0 0', lineHeight: 1.5,
          }}>
            Adds place context to your moment. Useful when the photo is clearly about one spot.
          </p>
        </div>

        {/* ── What belongs here ─────────────────────────────────────────────────── */}
        <div style={{
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: '14px', padding: '14px 16px',
        }}>
          <p style={{
            fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '11px',
            color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase',
            letterSpacing: '0.06em', margin: '0 0 10px',
          }}>
            Moments are for local vibe
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            {[
              '✅ Queue at the taxi rank',
              '✅ Power back on in the area',
              '✅ This café is full tonight',
              '✅ Market busy this morning',
              '✅ Street quiet right now',
              '❌ Crime or danger → use Alerts',
              '❌ Selling something → use Board',
            ].map(line => (
              <p key={line} style={{
                fontFamily: 'Inter, sans-serif', fontSize: '12px',
                color: line.startsWith('✅') ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.25)',
                margin: 0, lineHeight: 1.5,
              }}>
                {line}
              </p>
            ))}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            padding: '10px 14px', borderRadius: '10px',
            background: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.25)',
            fontFamily: 'Inter, sans-serif', fontSize: '13px',
            color: '#FCA5A5', lineHeight: 1.5,
          }}>
            {error}
          </div>
        )}
      </div>

      {/* ── Fixed footer ─────────────────────────────────────────────────────────── */}
      <div style={{
        flexShrink: 0,
        padding: '12px 16px',
        paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        background: '#0D1117',
      }}>
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          style={{
            width: '100%', padding: '14px',
            borderRadius: '14px', border: 'none',
            background: canSubmit ? '#39D98A' : 'rgba(57,217,138,0.2)',
            color: canSubmit ? '#0D1117' : 'rgba(57,217,138,0.35)',
            fontFamily: 'Inter, sans-serif', fontWeight: 800, fontSize: '15px',
            cursor: canSubmit ? 'pointer' : 'default',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            transition: 'background 0.15s, color 0.15s',
          }}
        >
          {submitting ? (
            <>
              <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} />
              Posting…
            </>
          ) : (
            <>
              ✦ Share this moment
            </>
          )}
        </button>
        <p style={{
          fontFamily: 'Inter, sans-serif', fontSize: '11px',
          color: 'rgba(255,255,255,0.18)', textAlign: 'center',
          margin: '8px 0 0', lineHeight: 1.5,
        }}>
          Visible to neighbours in {neighbourhood || 'your area'} · disappears in 24 hours.
        </p>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
