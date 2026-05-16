/**
 * SafetyReportPage — /report/safety
 *
 * Purpose-built incident reporting flow. NOT a generic board post.
 * Design principles:
 *   - Calm under stress: clear, unambiguous, no decorative noise
 *   - Two screens only (type → details) to minimise friction
 *   - Anonymous by default — reduces barrier to reporting
 *   - Image-first media (video = future)
 *   - Writes to safety_reports (structured) + user_posts (surface display)
 *
 * Downstream surfaces:
 *   - Alerts tab  (immediate — reads user_posts.category='alert')
 *   - Home feed   (reads user_posts, shows high-priority alert cards)
 *   - Board       (NOT written here — safety ≠ listings)
 */

import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Camera, X, Clock, MapPin, Shield, Loader, Video } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNeighbourhood } from '../contexts/NeighbourhoodContext';
import {
  createSafetyReport,
  uploadSafetyMedia,
  type SafetyIncidentType,
} from '../lib/api';
import VideoPlayer from '../components/VideoPlayer';

// ─── Incident type config ──────────────────────────────────────────────────────

interface IncidentConfig {
  type:    SafetyIncidentType;
  emoji:   string;
  label:   string;
  hint:    string;
  color:   string;
}

const INCIDENT_TYPES: IncidentConfig[] = [
  {
    type:  'crime',
    emoji: '🔒',
    label: 'Crime',
    hint:  'Robbery, theft, break-in, hijacking',
    color: '#EF4444',
  },
  {
    type:  'suspicious',
    emoji: '👁',
    label: 'Suspicious activity',
    hint:  'Unusual behaviour or persons of concern',
    color: '#F59E0B',
  },
  {
    type:  'violence',
    emoji: '⚠️',
    label: 'Violence or assault',
    hint:  'Physical altercation, threats, fighting',
    color: '#EF4444',
  },
  {
    type:  'missing',
    emoji: '🧍',
    label: 'Missing person',
    hint:  'Child or adult reported missing',
    color: '#A78BFA',
  },
  {
    type:  'road',
    emoji: '🚗',
    label: 'Road issue',
    hint:  'Accident, blockage, dangerous conditions',
    color: '#FBBF24',
  },
  {
    type:  'fire',
    emoji: '🔥',
    label: 'Fire or gas leak',
    hint:  'Active fire, smoke, or explosion risk',
    color: '#F97316',
  },
  {
    type:  'other',
    emoji: '📢',
    label: 'Other urgent matter',
    hint:  'Safety concern not covered above',
    color: '#60A5FA',
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function incidentCfg(type: SafetyIncidentType): IncidentConfig {
  return INCIDENT_TYPES.find(c => c.type === type) ?? INCIDENT_TYPES[6];
}

/** Round to nearest 5-min slot for the time default. */
function defaultTimeValue(): string {
  const d = new Date();
  d.setSeconds(0, 0);
  d.setMinutes(Math.floor(d.getMinutes() / 5) * 5);
  // local datetime-local value: "YYYY-MM-DDThh:mm"
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: 'none', border: 'none', cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: '6px',
        padding: '4px 0', color: 'rgba(255,255,255,0.5)',
        fontFamily: 'DM Sans, sans-serif', fontSize: '14px',
      }}
    >
      <ArrowLeft size={16} color="rgba(255,255,255,0.5)" />
      Back
    </button>
  );
}

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label style={{
      display: 'block',
      fontFamily: 'DM Sans, sans-serif', fontWeight: 700, fontSize: '12px',
      color: 'rgba(255,255,255,0.45)', letterSpacing: '0.04em',
      textTransform: 'uppercase', marginBottom: '8px',
    }}>
      {children}
      {required && <span style={{ color: '#EF4444', marginLeft: '3px' }}>*</span>}
    </label>
  );
}

const INPUT_STYLE: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box',
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '12px',
  padding: '12px 14px',
  color: '#F0F6FC',
  fontSize: '15px', fontFamily: 'DM Sans, sans-serif',
  outline: 'none',
};

// ─── Screen 1: Type selection ─────────────────────────────────────────────────

function TypeScreen({
  onSelect,
  onBack,
}: {
  onSelect: (type: SafetyIncidentType) => void;
  onBack:   () => void;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* Header */}
      <div style={{ padding: '16px 16px 0' }}>
        <BackButton onClick={onBack} />
        <div style={{ marginTop: '20px', marginBottom: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <Shield size={18} color="#EF4444" />
            <span style={{
              fontFamily: 'DM Sans, sans-serif', fontWeight: 700, fontSize: '11px',
              color: '#EF4444', letterSpacing: '0.06em', textTransform: 'uppercase',
            }}>
              Safety report
            </span>
          </div>
          <h1 style={{
            fontFamily: 'Syne, sans-serif', fontWeight: 800,
            fontSize: '22px', color: '#F0F6FC', margin: '0 0 6px',
            lineHeight: 1.2,
          }}>
            What happened?
          </h1>
          <p style={{
            fontFamily: 'DM Sans, sans-serif', fontSize: '13px',
            color: 'rgba(255,255,255,0.4)', margin: 0, lineHeight: 1.55,
          }}>
            Select the type that best describes the incident.
          </p>
        </div>
      </div>

      {/* Type list */}
      <div style={{
        flex: 1, overflowY: 'auto',
        padding: '16px 16px calc(80px + env(safe-area-inset-bottom, 0px))',
        display: 'flex', flexDirection: 'column', gap: '8px',
      }}>
        {INCIDENT_TYPES.map(cfg => (
          <button
            key={cfg.type}
            onClick={() => onSelect(cfg.type)}
            style={{
              display: 'flex', alignItems: 'center', gap: '14px',
              background: `${cfg.color}08`,
              border: `1px solid ${cfg.color}20`,
              borderRadius: '16px',
              padding: '14px 16px',
              cursor: 'pointer', textAlign: 'left',
              WebkitTapHighlightColor: 'transparent',
              transition: 'background 0.12s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = `${cfg.color}14`)}
            onMouseLeave={e => (e.currentTarget.style.background = `${cfg.color}08`)}
          >
            <div style={{
              width: '44px', height: '44px', borderRadius: '13px', flexShrink: 0,
              background: `${cfg.color}15`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '22px',
            }}>
              {cfg.emoji}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontFamily: 'Syne, sans-serif', fontWeight: 700,
                fontSize: '14px', color: '#F0F6FC', marginBottom: '2px',
              }}>
                {cfg.label}
              </div>
              <div style={{
                fontFamily: 'DM Sans, sans-serif', fontSize: '12px',
                color: 'rgba(255,255,255,0.38)', lineHeight: 1.4,
              }}>
                {cfg.hint}
              </div>
            </div>
            <span style={{ color: cfg.color, fontSize: '16px', flexShrink: 0, opacity: 0.55 }}>
              →
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Screen 2: Details form ───────────────────────────────────────────────────

function DetailsScreen({
  incidentType,
  suburb,
  onBack,
  onSubmit,
}: {
  incidentType: SafetyIncidentType;
  suburb:       string;
  onBack:       () => void;
  onSubmit:     (data: DetailsData) => Promise<void>;
}) {
  const cfg = incidentCfg(incidentType);

  const [title,       setTitle]       = useState('');
  const [details,     setDetails]     = useState('');
  const [landmark,    setLandmark]    = useState('');
  const [timeMode,    setTimeMode]    = useState<'now' | 'custom'>('now');
  const [customTime,  setCustomTime]  = useState(defaultTimeValue());
  const [mediaFile,   setMediaFile]   = useState<File | null>(null);
  const [mediaPreview,setMediaPreview]= useState<string | null>(null);
  const [mediaKind,   setMediaKind]   = useState<'photo' | 'video' | null>(null);
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [submitting,  setSubmitting]  = useState(false);
  const [error,       setError]       = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const canSubmit = title.trim().length >= 3 && details.trim().length >= 5;

  // Photo: 20MB · Video: 50MB hard, 60s soft warning
  const PHOTO_LIMIT_MB = 20;
  const VIDEO_LIMIT_MB = 50;

  function handleMedia(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const isVideo = file.type.startsWith('video/');
    const limitMB = isVideo ? VIDEO_LIMIT_MB : PHOTO_LIMIT_MB;

    if (file.size > limitMB * 1024 * 1024) {
      setError(`${isVideo ? 'Video' : 'Image'} must be under ${limitMB} MB.`);
      return;
    }

    // Soft duration check for video
    if (isVideo) {
      const vid = document.createElement('video');
      const tempUrl = URL.createObjectURL(file);
      vid.src = tempUrl;
      vid.onloadedmetadata = () => {
        if (vid.duration > 60) {
          setError('Video is over 60 seconds — consider trimming it. It will still upload.');
        }
        URL.revokeObjectURL(tempUrl);
      };
    }

    if (mediaPreview) URL.revokeObjectURL(mediaPreview);
    setMediaFile(file);
    setMediaPreview(URL.createObjectURL(file));
    setMediaKind(isVideo ? 'video' : 'photo');
    setError(null);
  }

  function removeMedia() {
    if (mediaPreview) URL.revokeObjectURL(mediaPreview);
    setMediaFile(null);
    setMediaPreview(null);
    setMediaKind(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function handleSubmit() {
    if (!canSubmit || submitting) return;
    setError(null);
    setSubmitting(true);
    await onSubmit({
      title:       title.trim(),
      details:     details.trim(),
      landmark:    landmark.trim() || undefined,
      happenedAt:  timeMode === 'now' ? new Date().toISOString() : new Date(customTime).toISOString(),
      mediaFile:   mediaFile ?? undefined,
      mediaType:   mediaKind ?? undefined,
      isAnonymous,
    });
    setSubmitting(false);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* Fixed header */}
      <div style={{
        flexShrink: 0,
        padding: '16px 16px 14px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        <BackButton onClick={onBack} />
        <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0,
            background: `${cfg.color}15`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px',
          }}>
            {cfg.emoji}
          </div>
          <div>
            <div style={{
              fontFamily: 'DM Sans, sans-serif', fontWeight: 700, fontSize: '10px',
              color: cfg.color, letterSpacing: '0.06em', textTransform: 'uppercase',
            }}>
              {cfg.label}
            </div>
            <h1 style={{
              fontFamily: 'Syne, sans-serif', fontWeight: 800,
              fontSize: '18px', color: '#F0F6FC', margin: 0, lineHeight: 1.2,
            }}>
              Report details
            </h1>
          </div>
        </div>
      </div>

      {/* Scrollable form body */}
      <div style={{
        flex: 1, overflowY: 'auto',
        padding: '20px 16px',
        display: 'flex', flexDirection: 'column', gap: '20px',
      }}>

        {/* Title */}
        <div>
          <FieldLabel required>What's the headline?</FieldLabel>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder={`e.g. "${cfg.label} spotted on Florida Rd"`}
            maxLength={120}
            style={INPUT_STYLE}
          />
          <div style={{
            fontFamily: 'DM Sans, sans-serif', fontSize: '11px',
            color: 'rgba(255,255,255,0.2)', textAlign: 'right', marginTop: '4px',
          }}>
            {title.length}/120
          </div>
        </div>

        {/* Details */}
        <div>
          <FieldLabel required>What happened?</FieldLabel>
          <textarea
            value={details}
            onChange={e => setDetails(e.target.value)}
            placeholder="Describe what you saw or experienced. Include as much detail as you safely can — this helps neighbours and community watch respond."
            rows={4}
            maxLength={1000}
            style={{ ...INPUT_STYLE, resize: 'vertical', minHeight: '100px', lineHeight: 1.55 }}
          />
          <div style={{
            fontFamily: 'DM Sans, sans-serif', fontSize: '11px',
            color: 'rgba(255,255,255,0.2)', textAlign: 'right', marginTop: '4px',
          }}>
            {details.length}/1000
          </div>
        </div>

        {/* Location / landmark */}
        <div>
          <FieldLabel>Location / landmark</FieldLabel>
          <div style={{ position: 'relative' }}>
            <MapPin
              size={14} color="rgba(255,255,255,0.25)"
              style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
            />
            <input
              type="text"
              value={landmark}
              onChange={e => setLandmark(e.target.value)}
              placeholder={suburb || 'Street, landmark, or intersection'}
              maxLength={120}
              style={{ ...INPUT_STYLE, paddingLeft: '34px' }}
            />
          </div>
          <p style={{
            fontFamily: 'DM Sans, sans-serif', fontSize: '11px',
            color: 'rgba(255,255,255,0.25)', margin: '5px 0 0', lineHeight: 1.5,
          }}>
            {suburb
              ? `Your neighbourhood (${suburb}) will be attached automatically.`
              : 'Add a nearby street or landmark to help neighbours locate the incident.'}
          </p>
        </div>

        {/* Time */}
        <div>
          <FieldLabel>When did this happen?</FieldLabel>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
            {(['now', 'custom'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => setTimeMode(mode)}
                style={{
                  flex: 1, padding: '10px', borderRadius: '10px',
                  border: `1px solid ${timeMode === mode ? 'rgba(57,217,138,0.4)' : 'rgba(255,255,255,0.1)'}`,
                  background: timeMode === mode ? 'rgba(57,217,138,0.1)' : 'rgba(255,255,255,0.03)',
                  color: timeMode === mode ? '#39D98A' : 'rgba(255,255,255,0.45)',
                  fontFamily: 'DM Sans, sans-serif', fontWeight: 700, fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                }}
              >
                <Clock size={13} />
                {mode === 'now' ? 'Right now' : 'Earlier'}
              </button>
            ))}
          </div>
          {timeMode === 'custom' && (
            <input
              type="datetime-local"
              value={customTime}
              onChange={e => setCustomTime(e.target.value)}
              max={defaultTimeValue()}
              style={INPUT_STYLE}
            />
          )}
        </div>

        {/* Photo / video upload */}
        <div>
          <FieldLabel>Photo or video (optional)</FieldLabel>
          {mediaPreview ? (
            <div style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden' }}>
              {mediaKind === 'video' ? (
                <VideoPlayer
                  src={mediaPreview}
                  maxHeight={220}
                  borderRadius={12}
                  label="Evidence clip preview"
                />
              ) : (
                <img
                  src={mediaPreview}
                  alt="Attached photo"
                  style={{ width: '100%', maxHeight: '220px', objectFit: 'cover', display: 'block' }}
                />
              )}
              <button
                onClick={removeMedia}
                style={{
                  position: 'absolute', top: '8px', right: '8px',
                  width: '28px', height: '28px', borderRadius: '50%',
                  background: 'rgba(0,0,0,0.75)', border: 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', zIndex: 2,
                }}
              >
                <X size={14} color="#fff" />
              </button>
            </div>
          ) : (
            /* Two-button picker: Photo | Video */
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => fileInputRef.current?.click()}
                style={{
                  flex: 1, padding: '16px 10px', borderRadius: '12px',
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px dashed rgba(255,255,255,0.12)',
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', gap: '6px',
                  cursor: 'pointer',
                }}
              >
                <Camera size={20} color="rgba(255,255,255,0.3)" />
                <span style={{
                  fontFamily: 'DM Sans, sans-serif', fontSize: '12px',
                  color: 'rgba(255,255,255,0.35)',
                }}>
                  Photo
                </span>
                <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '10px', color: 'rgba(255,255,255,0.2)' }}>
                  max 20 MB
                </span>
              </button>
              <button
                onClick={() => {
                  // Switch to video-first picker by changing accept
                  if (fileInputRef.current) {
                    fileInputRef.current.accept = 'video/*';
                    fileInputRef.current.click();
                    // Reset after click so next open shows all types
                    setTimeout(() => {
                      if (fileInputRef.current) fileInputRef.current.accept = 'image/*,video/*';
                    }, 500);
                  }
                }}
                style={{
                  flex: 1, padding: '16px 10px', borderRadius: '12px',
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px dashed rgba(255,255,255,0.12)',
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', gap: '6px',
                  cursor: 'pointer',
                }}
              >
                <Video size={20} color="rgba(255,255,255,0.3)" />
                <span style={{
                  fontFamily: 'DM Sans, sans-serif', fontSize: '12px',
                  color: 'rgba(255,255,255,0.35)',
                }}>
                  Video
                </span>
                <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '10px', color: 'rgba(255,255,255,0.2)' }}>
                  max 50 MB · 60 s
                </span>
              </button>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            onChange={handleMedia}
            style={{ display: 'none' }}
          />
          <p style={{
            fontFamily: 'DM Sans, sans-serif', fontSize: '11px',
            color: 'rgba(255,255,255,0.2)', margin: '6px 0 0', lineHeight: 1.5,
          }}>
            Photos and short video clips help neighbours identify suspects or hazards.
          </p>
        </div>

        {/* Anonymous toggle */}
        <div style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '14px', padding: '14px 16px',
          display: 'flex', alignItems: 'center', gap: '12px',
        }}>
          <div style={{ flex: 1 }}>
            <div style={{
              fontFamily: 'DM Sans, sans-serif', fontWeight: 700,
              fontSize: '13px', color: '#F0F6FC', marginBottom: '2px',
            }}>
              Post anonymously
            </div>
            <div style={{
              fontFamily: 'DM Sans, sans-serif', fontSize: '12px',
              color: 'rgba(255,255,255,0.35)', lineHeight: 1.5,
            }}>
              Your name won't appear on the report. Your account is still linked internally for safety purposes.
            </div>
          </div>
          {/* Toggle */}
          <button
            onClick={() => setIsAnonymous(a => !a)}
            role="switch"
            aria-checked={isAnonymous}
            style={{
              width: '44px', height: '24px', borderRadius: '12px', flexShrink: 0,
              background: isAnonymous ? '#39D98A' : 'rgba(255,255,255,0.12)',
              border: 'none', cursor: 'pointer',
              position: 'relative', transition: 'background 0.2s',
            }}
          >
            <span style={{
              position: 'absolute', top: '3px',
              left: isAnonymous ? '23px' : '3px',
              width: '18px', height: '18px', borderRadius: '50%',
              background: '#fff',
              transition: 'left 0.2s',
              boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
            }} />
          </button>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            padding: '10px 14px', borderRadius: '10px',
            background: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.25)',
            fontFamily: 'DM Sans, sans-serif', fontSize: '13px',
            color: '#FCA5A5', lineHeight: 1.5,
          }}>
            {error}
          </div>
        )}
      </div>

      {/* Fixed footer — submit */}
      <div style={{
        flexShrink: 0,
        padding: '12px 16px',
        paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        background: '#0D1117',
      }}>
        <button
          onClick={handleSubmit}
          disabled={!canSubmit || submitting}
          style={{
            width: '100%', padding: '14px',
            borderRadius: '14px', border: 'none',
            background: canSubmit && !submitting ? '#EF4444' : 'rgba(239,68,68,0.25)',
            color: canSubmit && !submitting ? '#fff' : 'rgba(255,255,255,0.3)',
            fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '15px',
            cursor: canSubmit && !submitting ? 'pointer' : 'default',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            transition: 'background 0.15s, color 0.15s',
          }}
        >
          {submitting ? (
            <>
              <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} />
              Submitting…
            </>
          ) : (
            <>
              <Shield size={16} />
              Submit safety report
            </>
          )}
        </button>
        <p style={{
          fontFamily: 'DM Sans, sans-serif', fontSize: '11px',
          color: 'rgba(255,255,255,0.2)', textAlign: 'center',
          margin: '8px 0 0', lineHeight: 1.5,
        }}>
          This report will be visible to neighbours in {suburb || 'your neighbourhood'}.
          False reports may be removed.
        </p>
      </div>
    </div>
  );
}

// ─── Screen 3: Success ────────────────────────────────────────────────────────

function SuccessScreen({
  incidentType,
  suburb,
  onViewAlerts,
}: {
  incidentType: SafetyIncidentType;
  suburb:       string;
  onViewAlerts: () => void;
}) {
  const cfg = incidentCfg(incidentType);

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      flex: 1, padding: '32px 24px',
      textAlign: 'center',
    }}>
      <div style={{
        width: '72px', height: '72px', borderRadius: '50%',
        background: 'rgba(57,217,138,0.12)',
        border: '1.5px solid rgba(57,217,138,0.35)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '32px', marginBottom: '20px',
      }}>
        ✅
      </div>
      <h2 style={{
        fontFamily: 'Syne, sans-serif', fontWeight: 800,
        fontSize: '20px', color: '#F0F6FC', margin: '0 0 10px', lineHeight: 1.2,
      }}>
        Report submitted
      </h2>
      <p style={{
        fontFamily: 'DM Sans, sans-serif', fontSize: '14px',
        color: 'rgba(255,255,255,0.45)', margin: '0 0 8px', lineHeight: 1.6,
        maxWidth: '280px',
      }}>
        Your{' '}
        <span style={{ color: cfg.color, fontWeight: 700 }}>
          {cfg.label.toLowerCase()}
        </span>
        {' '}report is now visible to neighbours in{' '}
        <strong style={{ color: '#F0F6FC' }}>{suburb || 'your neighbourhood'}</strong>.
      </p>
      <p style={{
        fontFamily: 'DM Sans, sans-serif', fontSize: '12px',
        color: 'rgba(255,255,255,0.25)', margin: '0 0 32px', lineHeight: 1.5,
        maxWidth: '260px',
      }}>
        Stay safe. If there is an immediate danger, contact emergency services.
      </p>

      {/* Emergency numbers — SA */}
      <div style={{
        width: '100%', maxWidth: '320px',
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '14px', padding: '14px 16px',
        marginBottom: '24px', textAlign: 'left',
      }}>
        <div style={{
          fontFamily: 'DM Sans, sans-serif', fontWeight: 700, fontSize: '11px',
          color: 'rgba(255,255,255,0.3)', letterSpacing: '0.06em',
          textTransform: 'uppercase', marginBottom: '10px',
        }}>
          Emergency numbers — South Africa
        </div>
        {[
          { label: 'Police',          number: '10111' },
          { label: 'Ambulance',       number: '10177' },
          { label: 'Fire',            number: '10177' },
          { label: 'Emergency (cell)',number: '112'   },
        ].map(({ label, number }) => (
          <div key={label} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '5px 0',
            borderBottom: '1px solid rgba(255,255,255,0.05)',
          }}>
            <span style={{
              fontFamily: 'DM Sans, sans-serif', fontSize: '13px',
              color: 'rgba(255,255,255,0.5)',
            }}>
              {label}
            </span>
            <a
              href={`tel:${number}`}
              style={{
                fontFamily: 'Syne, sans-serif', fontWeight: 800,
                fontSize: '15px', color: '#39D98A',
                textDecoration: 'none',
              }}
            >
              {number}
            </a>
          </div>
        ))}
      </div>

      <button
        onClick={onViewAlerts}
        style={{
          width: '100%', maxWidth: '320px',
          padding: '13px', borderRadius: '14px', border: 'none',
          background: '#39D98A', color: '#0D1117',
          fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '14px',
          cursor: 'pointer',
        }}
      >
        View alerts for {suburb || 'your neighbourhood'}
      </button>
    </div>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface DetailsData {
  title:       string;
  details:     string;
  landmark?:   string;
  happenedAt:  string;
  mediaFile?:  File;
  mediaType?:  'photo' | 'video';
  isAnonymous: boolean;
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function SafetyReportPage() {
  const navigate = useNavigate();
  const { user }  = useAuth();
  const { displaySuburb, displayCity } = useNeighbourhood();
  const suburb = displaySuburb || displayCity || '';

  type Step = 'type' | 'details' | 'success';
  const [step,         setStep]         = useState<Step>('type');
  const [incidentType, setIncidentType] = useState<SafetyIncidentType | null>(null);
  const [globalError,  setGlobalError]  = useState<string | null>(null);

  // Redirect unauthenticated users — safety reports require an account
  if (!user) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', flex: 1,
        padding: '32px 24px', textAlign: 'center',
        minHeight: 'calc(100vh - 120px)',
      }}>
        <div style={{ fontSize: '36px', marginBottom: '16px' }}>🔒</div>
        <h2 style={{
          fontFamily: 'Syne, sans-serif', fontWeight: 800,
          fontSize: '18px', color: '#F0F6FC', margin: '0 0 8px',
        }}>
          Sign in to report
        </h2>
        <p style={{
          fontFamily: 'DM Sans, sans-serif', fontSize: '13px',
          color: 'rgba(255,255,255,0.4)', margin: '0 0 24px', lineHeight: 1.6,
          maxWidth: '260px',
        }}>
          Safety reports require an account to prevent spam and protect the community.
        </p>
        <button
          onClick={() => navigate('/welcome', { state: { next: '/report/safety' } })}
          style={{
            padding: '12px 28px', borderRadius: '12px', border: 'none',
            background: '#39D98A', color: '#0D1117',
            fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '14px',
            cursor: 'pointer',
          }}
        >
          Sign in
        </button>
      </div>
    );
  }

  function handleTypeSelect(type: SafetyIncidentType) {
    setIncidentType(type);
    setStep('details');
    setGlobalError(null);
  }

  const handleSubmit = useCallback(async (data: DetailsData) => {
    if (!incidentType) return;
    setGlobalError(null);

    try {
      // Upload media (photo or video) if present
      let mediaUrl:  string | undefined;
      let mediaType: 'photo' | 'video' | undefined = data.mediaType;
      if (data.mediaFile) {
        try {
          const result = await uploadSafetyMedia(user.id, data.mediaFile);
          mediaUrl  = result.url;
          mediaType = result.mediaType;
        } catch {
          // Non-fatal — submit without media, warn user
          setGlobalError(`${data.mediaType === 'video' ? 'Video' : 'Image'} upload failed — your report will be submitted without the attachment.`);
        }
      }

      const { error } = await createSafetyReport(user.id, {
        neighbourhood: suburb,
        incidentType,
        title:         data.title,
        details:       data.details,
        landmark:      data.landmark,
        happenedAt:    data.happenedAt,
        imageUrl:      mediaUrl,
        mediaType,
        isAnonymous:   data.isAnonymous,
      });

      if (error) {
        setGlobalError(`Could not submit report: ${error}. Please try again.`);
        return;
      }

      setStep('success');
    } catch (e) {
      setGlobalError(`Unexpected error: ${String(e)}`);
    }
  }, [incidentType, suburb, user.id]);

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      minHeight: 'calc(100vh - 56px)',  // subtract top nav
      background: 'var(--color-bg)',
    }}>

      {/* Global error banner (persists across steps) */}
      {globalError && (
        <div style={{
          padding: '10px 16px',
          background: 'rgba(239,68,68,0.1)',
          borderBottom: '1px solid rgba(239,68,68,0.2)',
          fontFamily: 'DM Sans, sans-serif', fontSize: '13px',
          color: '#FCA5A5', lineHeight: 1.5,
          display: 'flex', alignItems: 'center', gap: '8px',
        }}>
          <span style={{ flex: 1 }}>{globalError}</span>
          <button
            onClick={() => setGlobalError(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px' }}
          >
            <X size={14} color="rgba(252,165,165,0.7)" />
          </button>
        </div>
      )}

      {step === 'type' && (
        <TypeScreen
          onSelect={handleTypeSelect}
          onBack={() => navigate(-1)}
        />
      )}

      {step === 'details' && incidentType && (
        <DetailsScreen
          incidentType={incidentType}
          suburb={suburb}
          onBack={() => setStep('type')}
          onSubmit={handleSubmit}
        />
      )}

      {step === 'success' && incidentType && (
        <SuccessScreen
          incidentType={incidentType}
          suburb={suburb}
          onViewAlerts={() => navigate('/alerts')}
        />
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
