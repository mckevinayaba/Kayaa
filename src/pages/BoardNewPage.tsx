import { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Camera, X, AlertTriangle, Play } from 'lucide-react';
import {
  createBoardPost,
  uploadBoardImage,
  uploadBoardVideo,
  type BoardCategory,
  type BoardPost,
} from '../lib/api';
import { getInteractiveUserId } from '../lib/api';
import { BOARD_CATEGORIES } from './BoardPage';
import { useCountry } from '../contexts/CountryContext';
import useLocation from '../hooks/useLocation';

// ─── Video support ────────────────────────────────────────────────────────────

/** Categories that support a short video attachment in Phase 1 */
const VIDEO_CATS: BoardCategory[] = ['accommodation', 'for_sale', 'services'];

const VIDEO_MAX_BYTES = 100 * 1024 * 1024; // 100 MB hard limit
const VIDEO_ACCEPT = 'video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm';

type VideoUploadState =
  | { status: 'idle' }
  | { status: 'error'; msg: string }
  | { status: 'uploading'; localUrl: string }
  | { status: 'done'; localUrl: string; remoteUrl: string };

function VideoUpload({
  currentUrl,
  onUploaded,
  onRemove,
}: {
  currentUrl: string;
  onUploaded: (url: string) => void;
  onRemove: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<VideoUploadState>(
    currentUrl
      ? { status: 'done', localUrl: currentUrl, remoteUrl: currentUrl }
      : { status: 'idle' },
  );

  // Sync if parent clears the URL
  useEffect(() => {
    if (!currentUrl && (state.status === 'done' || state.status === 'uploading')) {
      setState({ status: 'idle' });
    }
  }, [currentUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Type check — browsers sometimes allow wrong types past the accept attr
    const ALLOWED_TYPES = ['video/mp4', 'video/quicktime', 'video/webm'];
    const ALLOWED_EXT = /\.(mp4|mov|webm)$/i;
    if (!ALLOWED_TYPES.includes(file.type) && !ALLOWED_EXT.test(file.name)) {
      setState({ status: 'error', msg: 'Only MP4, MOV, or WebM videos are supported.' });
      return;
    }

    if (file.size > VIDEO_MAX_BYTES) {
      setState({ status: 'error', msg: 'That video is too large. Try a shorter clip — 10 to 20 seconds works best.' });
      return;
    }

    const localUrl = URL.createObjectURL(file);
    setState({ status: 'uploading', localUrl });

    try {
      const uid = await getInteractiveUserId();
      const remoteUrl = await uploadBoardVideo(uid, file);
      setState({ status: 'done', localUrl, remoteUrl });
      onUploaded(remoteUrl);
    } catch {
      URL.revokeObjectURL(localUrl);
      setState({ status: 'error', msg: 'Upload failed. Check your connection and try again.' });
    }

    if (inputRef.current) inputRef.current.value = '';
  }

  function handleRemove() {
    if (state.status === 'done' || state.status === 'uploading') {
      URL.revokeObjectURL(state.localUrl);
    }
    setState({ status: 'idle' });
    onRemove();
    if (inputRef.current) inputRef.current.value = '';
  }

  const previewUrl = (state.status === 'done' || state.status === 'uploading') ? state.localUrl : '';

  return (
    <div>
      <style>{`@keyframes vidSpin { to { transform: rotate(360deg); } }`}</style>
      <input
        ref={inputRef}
        type="file"
        accept={VIDEO_ACCEPT}
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      {/* ── Idle: tap to add ── */}
      {state.status === 'idle' && (
        <button
          onClick={() => inputRef.current?.click()}
          style={{
            width: '100%', boxSizing: 'border-box',
            background: 'var(--color-surface)',
            border: '1px dashed rgba(255,255,255,0.13)',
            borderRadius: '12px', padding: '14px 16px',
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '14px',
            textAlign: 'left',
          }}
        >
          <div style={{
            width: '40px', height: '40px', borderRadius: '10px', flexShrink: 0,
            background: 'rgba(57,217,138,0.07)', border: '1px solid rgba(57,217,138,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Play size={18} color="rgba(57,217,138,0.7)" />
          </div>
          <div>
            <div style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 700, fontSize: '14px', color: 'var(--color-text)', marginBottom: '3px' }}>
              Add short video
            </div>
            <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.35)', lineHeight: 1.45 }}>
              Walkthrough, item condition, or service proof · MP4 / MOV
            </div>
          </div>
        </button>
      )}

      {/* ── Error state ── */}
      {state.status === 'error' && (
        <div style={{
          background: 'rgba(239,68,68,0.07)',
          border: '1px solid rgba(239,68,68,0.22)',
          borderRadius: '12px', padding: '14px 16px',
        }}>
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: '#F87171', margin: '0 0 8px', lineHeight: 1.5 }}>
            {state.msg}
          </p>
          <button
            onClick={() => { setState({ status: 'idle' }); inputRef.current?.click(); }}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontFamily: 'DM Sans, sans-serif', fontSize: '12px',
              color: 'rgba(255,255,255,0.4)', padding: 0,
            }}
          >
            Try a different file →
          </button>
        </div>
      )}

      {/* ── Uploading / Done: video preview ── */}
      {previewUrl && (
        <div style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden', background: '#000', lineHeight: 0 }}>
          <video
            src={previewUrl}
            preload="metadata"
            playsInline
            controls={state.status === 'done'}
            style={{ width: '100%', maxHeight: '220px', objectFit: 'contain', display: 'block' }}
          />

          {/* Uploading overlay */}
          {state.status === 'uploading' && (
            <div style={{
              position: 'absolute', inset: 0,
              background: 'rgba(0,0,0,0.6)',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: '10px',
            }}>
              <div style={{
                width: '32px', height: '32px', borderRadius: '50%',
                border: '3px solid rgba(255,255,255,0.12)',
                borderTop: '3px solid #39D98A',
                animation: 'vidSpin 0.9s linear infinite',
              }} />
              <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: 'rgba(255,255,255,0.65)' }}>
                Uploading…
              </span>
            </div>
          )}

          {/* Remove button */}
          {state.status === 'done' && (
            <button
              onClick={handleRemove}
              style={{
                position: 'absolute', top: '8px', right: '8px',
                width: '28px', height: '28px', borderRadius: '50%',
                background: 'rgba(0,0,0,0.72)', border: '1px solid rgba(255,255,255,0.18)',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: 0,
              }}
            >
              <X size={12} color="#fff" />
            </button>
          )}
        </div>
      )}

      {/* Done confirmation */}
      {state.status === 'done' && (
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: '#39D98A', margin: '6px 0 0', lineHeight: 1 }}>
          ✓ Video ready · Keep it under 20 seconds for best results
        </p>
      )}
    </div>
  );
}

// ─── Step 1: Category picker ──────────────────────────────────────────────────

function CategoryPicker({ onSelect }: { onSelect: (cat: BoardCategory) => void }) {
  return (
    <div style={{ padding: '16px', paddingBottom: '60px' }}>
      <h1 style={{
        fontFamily: 'Syne, sans-serif', fontWeight: 800,
        fontSize: '22px', color: 'var(--color-text)',
        margin: '0 0 6px',
      }}>
        What are you posting?
      </h1>
      <p style={{ fontSize: '13px', color: 'var(--color-muted)', margin: '0 0 20px', fontFamily: 'DM Sans, sans-serif' }}>
        Choose a category to get started
      </p>

      {/* Hero cards — Services + Housing, side by side */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
        <button
          onClick={() => onSelect('services')}
          style={{
            display: 'flex', flexDirection: 'column', gap: '8px',
            background: 'linear-gradient(135deg, rgba(96,165,250,0.14) 0%, rgba(57,217,138,0.06) 100%)',
            border: '1px solid rgba(96,165,250,0.3)',
            borderRadius: '16px', padding: '16px',
            cursor: 'pointer', textAlign: 'left',
          }}
        >
          <div style={{ fontSize: '28px' }}>🔧</div>
          <div>
            <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '13px', color: 'var(--color-text)', marginBottom: '2px' }}>
              Offer a Service
            </div>
            <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: '#60A5FA' }}>
              Barber · tutor · plumber
            </div>
          </div>
        </button>
        <button
          onClick={() => onSelect('accommodation')}
          style={{
            display: 'flex', flexDirection: 'column', gap: '8px',
            background: 'linear-gradient(135deg, rgba(52,211,153,0.14) 0%, rgba(52,211,153,0.04) 100%)',
            border: '1px solid rgba(52,211,153,0.3)',
            borderRadius: '16px', padding: '16px',
            cursor: 'pointer', textAlign: 'left',
          }}
        >
          <div style={{ fontSize: '28px' }}>🏠</div>
          <div>
            <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '13px', color: 'var(--color-text)', marginBottom: '2px' }}>
              List a Place
            </div>
            <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: '#34D399' }}>
              Room · rental · short stay
            </div>
          </div>
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        {BOARD_CATEGORIES.filter(c => c.key !== 'services' && c.key !== 'accommodation').map(cat => {
          const isSafety = cat.key === 'safety';
          return (
            <button
              key={cat.key}
              onClick={() => onSelect(cat.key)}
              style={{
                background: isSafety ? 'rgba(239,68,68,0.08)' : 'var(--color-surface)',
                border: `1px solid ${isSafety ? 'rgba(239,68,68,0.3)' : 'var(--color-border)'}`,
                borderRadius: '16px',
                padding: '18px 14px',
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex', flexDirection: 'column', gap: '8px',
              }}
            >
              <span style={{ fontSize: '28px' }}>{cat.emoji}</span>
              <div>
                <div style={{
                  fontFamily: 'Syne, sans-serif', fontWeight: 700,
                  fontSize: '13px',
                  color: isSafety ? '#EF4444' : 'var(--color-text)',
                }}>
                  {cat.label}
                </div>
                {isSafety && (
                  <div style={{ fontSize: '11px', color: 'rgba(239,68,68,0.7)', marginTop: '2px', fontFamily: 'DM Sans, sans-serif' }}>
                    Expires in 48h
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Step 2: Details form ─────────────────────────────────────────────────────

type JobSubType = 'hiring' | 'available' | 'task';
type ServiceSubType = 'offering' | 'seeking';
type HousingSubType = 'room' | 'rental' | 'short_stay' | 'lodge';

const HOUSING_SUB_TYPES: { key: HousingSubType; label: string; emoji: string; hint: string }[] = [
  { key: 'room',       label: 'Room',        emoji: '🛏️', hint: 'Single/double room, bachelor flat, flatlet' },
  { key: 'rental',     label: 'Rental',      emoji: '🏡', hint: 'Full house, apartment or cottage to rent' },
  { key: 'short_stay', label: 'Short stay',  emoji: '🌙', hint: 'Nightly or weekend rate' },
  { key: 'lodge',      label: 'Lodge/Guest', emoji: '🏨', hint: 'Lodge, guesthouse, B&B' },
];

const JOB_SUB_TYPES: { key: JobSubType; label: string; emoji: string; color: string; hint: string; titleHint: string }[] = [
  { key: 'hiring',    label: 'Hiring',              emoji: '💼', color: '#A78BFA', hint: 'Post a job opening or vacancy',       titleHint: 'e.g. Hiring a cashier for a spaza shop' },
  { key: 'available', label: 'Looking for work',    emoji: '🙋', color: '#34D399', hint: 'I\'m available — let me find work',   titleHint: 'e.g. Looking for work: experienced barber' },
  { key: 'task',      label: 'Quick task / Gig',   emoji: '⚡', color: '#F59E0B', hint: 'One-off task, not a full-time job',   titleHint: 'e.g. Need someone to paint a fence this weekend' },
];

const SERVICE_SUB_TYPES: { key: ServiceSubType; label: string; emoji: string; color: string; hint: string; titleHint: string }[] = [
  { key: 'offering', label: 'Offering a service',  emoji: '🔧', color: '#60A5FA', hint: 'Tell neighbours what you do',  titleHint: 'e.g. Professional plumber — fast, affordable' },
  { key: 'seeking',  label: 'Need a service',       emoji: '🔍', color: '#FBBF24', hint: 'Find someone to help you',    titleHint: 'e.g. Need a reliable electrician in Soweto' },
];

interface FormData {
  title: string;
  description: string;
  price: string;
  contactWhatsapp: string;
  images: string[];
  /** Phase-1 video: single optional short clip (accommodation/for_sale/services) */
  videoUrl: string;
  isUrgent: boolean;
  housingSubType: HousingSubType;
  jobSubType: JobSubType;
  serviceSubType: ServiceSubType;
}

function DetailsForm({
  category,
  formData,
  setFormData,
  onNext,
}: {
  category: BoardCategory;
  formData: FormData;
  setFormData: React.Dispatch<React.SetStateAction<FormData>>;
  onNext: () => void;
  onBack: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const { suburb: s, city: c } = useLocation();
  const suburb = s || c || 'your area';

  const isSafety   = category === 'safety';
  const isHousing  = category === 'accommodation';
  const isJob      = category === 'jobs';
  const isService  = category === 'services';
  const showPrice  = category === 'for_sale';
  const showRate   = (isJob && formData.jobSubType !== 'task') || isService;
  const isShortStay = isHousing && (formData.housingSubType === 'short_stay' || formData.housingSubType === 'lodge');

  const activeSub = isJob
    ? JOB_SUB_TYPES.find(s => s.key === formData.jobSubType)!
    : isService
      ? SERVICE_SUB_TYPES.find(s => s.key === formData.serviceSubType)!
      : null;

  async function handleImageAdd(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const uid = await getInteractiveUserId();
      const url = await uploadBoardImage(uid, file);
      setFormData(prev => ({ ...prev, images: [...prev.images, url] }));
    } catch {
      // silent fail — image just won't appear
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = '';
  }

  function removeImage(idx: number) {
    setFormData(prev => ({ ...prev, images: prev.images.filter((_, i) => i !== idx) }));
  }

  const canProceed = formData.title.trim().length >= 3;

  return (
    <div style={{ padding: '0 16px', paddingBottom: 'calc(80px + env(safe-area-inset-bottom, 0px))' }}>

      {/* Housing: sub-type picker + hint */}
      {isHousing && (
        <div style={{ marginBottom: '16px' }}>
          <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-muted)', fontFamily: 'DM Sans, sans-serif', display: 'block', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Type of listing *
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
            {HOUSING_SUB_TYPES.map(sub => {
              const active = formData.housingSubType === sub.key;
              return (
                <button
                  key={sub.key}
                  onClick={() => setFormData(prev => ({ ...prev, housingSubType: sub.key }))}
                  style={{
                    padding: '12px 10px', borderRadius: '12px', cursor: 'pointer', textAlign: 'left',
                    background: active ? 'rgba(52,211,153,0.12)' : 'var(--color-surface)',
                    border: `1px solid ${active ? '#34D399' : 'var(--color-border)'}`,
                    transition: 'all 0.15s',
                  }}
                >
                  <div style={{ fontSize: '18px', marginBottom: '4px' }}>{sub.emoji}</div>
                  <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '12px', color: active ? '#34D399' : 'var(--color-text)', marginBottom: '2px' }}>
                    {sub.label}
                  </div>
                  <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '10px', color: 'rgba(255,255,255,0.35)', lineHeight: 1.3 }}>
                    {sub.hint}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Jobs: sub-type picker */}
      {isJob && (
        <div style={{ marginBottom: '16px' }}>
          <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-muted)', fontFamily: 'DM Sans, sans-serif', display: 'block', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            What are you posting? *
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {JOB_SUB_TYPES.map(sub => {
              const active = formData.jobSubType === sub.key;
              return (
                <button
                  key={sub.key}
                  onClick={() => setFormData(prev => ({ ...prev, jobSubType: sub.key }))}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '12px 14px', borderRadius: '12px', cursor: 'pointer', textAlign: 'left',
                    background: active ? `${sub.color}12` : 'var(--color-surface)',
                    border: `1px solid ${active ? sub.color : 'var(--color-border)'}`,
                    transition: 'all 0.15s',
                  }}
                >
                  <span style={{ fontSize: '22px', flexShrink: 0 }}>{sub.emoji}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '13px', color: active ? sub.color : 'var(--color-text)', marginBottom: '2px' }}>
                      {sub.label}
                    </div>
                    <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.38)' }}>
                      {sub.hint}
                    </div>
                  </div>
                  <div style={{ width: '18px', height: '18px', borderRadius: '50%', border: `2px solid ${active ? sub.color : 'rgba(255,255,255,0.15)'}`, background: active ? sub.color : 'transparent', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {active && <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#000' }} />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Services: sub-type picker */}
      {isService && (
        <div style={{ marginBottom: '16px' }}>
          <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-muted)', fontFamily: 'DM Sans, sans-serif', display: 'block', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            What are you posting? *
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            {SERVICE_SUB_TYPES.map(sub => {
              const active = formData.serviceSubType === sub.key;
              return (
                <button
                  key={sub.key}
                  onClick={() => setFormData(prev => ({ ...prev, serviceSubType: sub.key }))}
                  style={{
                    flex: 1, padding: '14px 10px', borderRadius: '12px', cursor: 'pointer', textAlign: 'left',
                    background: active ? `${sub.color}12` : 'var(--color-surface)',
                    border: `1px solid ${active ? sub.color : 'var(--color-border)'}`,
                    transition: 'all 0.15s',
                  }}
                >
                  <div style={{ fontSize: '22px', marginBottom: '6px' }}>{sub.emoji}</div>
                  <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '12px', color: active ? sub.color : 'var(--color-text)', marginBottom: '3px' }}>
                    {sub.label}
                  </div>
                  <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '10px', color: 'rgba(255,255,255,0.35)', lineHeight: 1.3 }}>
                    {sub.hint}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Services: Post Your Skills hint */}
      {category === 'services' && (
        <div style={{
          background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.2)',
          borderRadius: '12px', padding: '12px 14px', marginBottom: '16px',
        }}>
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: '#93C5FD', margin: 0, lineHeight: 1.5 }}>
            💡 Tip: Be specific about what you offer, your price, and how to reach you. Posts stay active for 30 days.
          </p>
        </div>
      )}

      {/* Safety urgency toggle */}
      {isSafety && (
        <div style={{
          background: formData.isUrgent ? 'rgba(239,68,68,0.12)' : 'var(--color-surface)',
          border: `1px solid ${formData.isUrgent ? 'rgba(239,68,68,0.4)' : 'var(--color-border)'}`,
          borderRadius: '14px', padding: '14px',
          marginBottom: '16px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <AlertTriangle size={18} color={formData.isUrgent ? '#EF4444' : 'var(--color-muted)'} />
            <div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: formData.isUrgent ? '#EF4444' : 'var(--color-text)', fontFamily: 'DM Sans, sans-serif' }}>
                Mark as Urgent
              </div>
              <div style={{ fontSize: '11px', color: 'var(--color-muted)', fontFamily: 'DM Sans, sans-serif' }}>
                Shows a red alert banner to everyone
              </div>
            </div>
          </div>
          <button
            onClick={() => setFormData(prev => ({ ...prev, isUrgent: !prev.isUrgent }))}
            style={{
              width: '44px', height: '24px', borderRadius: '12px',
              background: formData.isUrgent ? '#EF4444' : 'var(--color-border)',
              border: 'none', cursor: 'pointer', position: 'relative',
              transition: 'background 0.2s',
            }}
          >
            <div style={{
              position: 'absolute',
              top: '3px',
              left: formData.isUrgent ? '23px' : '3px',
              width: '18px', height: '18px',
              borderRadius: '50%', background: '#fff',
              transition: 'left 0.2s',
            }} />
          </button>
        </div>
      )}

      {/* Title */}
      <div style={{ marginBottom: '14px' }}>
        <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-muted)', fontFamily: 'DM Sans, sans-serif', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          {isSafety ? 'Alert title *' : 'Title *'}
        </label>
        <input
          type="text"
          value={formData.title}
          onChange={e => setFormData(prev => ({ ...prev, title: e.target.value.slice(0, 80) }))}
          placeholder={
            isSafety   ? 'e.g. Armed robbery at Vilakazi St' :
            activeSub  ? activeSub.titleHint :
            'Short, clear title'
          }
          style={{
            width: '100%', boxSizing: 'border-box',
            background: 'var(--color-surface)',
            border: `1px solid ${isSafety ? 'rgba(239,68,68,0.3)' : 'var(--color-border)'}`,
            borderRadius: '12px', padding: '13px 14px',
            color: 'var(--color-text)', fontSize: '15px',
            fontFamily: 'DM Sans, sans-serif', outline: 'none',
          }}
        />
        <div style={{ fontSize: '11px', color: 'var(--color-muted)', textAlign: 'right', marginTop: '3px', fontFamily: 'DM Sans, sans-serif' }}>
          {80 - formData.title.length} left
        </div>
      </div>

      {/* Description */}
      <div style={{ marginBottom: '14px' }}>
        <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-muted)', fontFamily: 'DM Sans, sans-serif', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Details
        </label>
        <textarea
          value={formData.description}
          onChange={e => setFormData(prev => ({ ...prev, description: e.target.value.slice(0, 500) }))}
          placeholder={
            isSafety    ? 'Describe what happened, location, any suspects...' :
            isHousing   ? 'Size, availability, what\'s included, house rules...' :
            isJob && formData.jobSubType === 'available' ? 'Your experience, skills, availability — convince them to hire you...' :
            isJob && formData.jobSubType === 'task'      ? 'What needs doing, when, budget, any requirements...' :
            isJob       ? 'Role details, requirements, what you\'re offering...' :
            isService && formData.serviceSubType === 'seeking' ? 'What do you need, your area, timeline, budget...' :
            isService   ? 'What you offer, your experience, area you cover...' :
            category === 'lost_found' ? 'Describe the item, where it was last seen...' :
            'More details (optional)'
          }
          rows={4}
          style={{
            width: '100%', boxSizing: 'border-box',
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '12px', padding: '13px 14px',
            color: 'var(--color-text)', fontSize: '14px',
            fontFamily: 'DM Sans, sans-serif', outline: 'none',
            resize: 'none',
          }}
        />
        <div style={{ fontSize: '11px', color: 'var(--color-muted)', textAlign: 'right', marginTop: '3px', fontFamily: 'DM Sans, sans-serif' }}>
          {500 - formData.description.length} left
        </div>
      </div>

      {/* Price (housing) */}
      {isHousing && (
        <div style={{ marginBottom: '14px' }}>
          <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-muted)', fontFamily: 'DM Sans, sans-serif', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {isShortStay ? 'Rate per night (R)' : 'Monthly rent (R)'}
          </label>
          <input
            type="number"
            value={formData.price}
            onChange={e => setFormData(prev => ({ ...prev, price: e.target.value }))}
            placeholder={isShortStay ? 'e.g. 350' : 'e.g. 3500'}
            min="0"
            style={{
              width: '100%', boxSizing: 'border-box',
              background: 'var(--color-surface)', border: '1px solid rgba(52,211,153,0.25)',
              borderRadius: '12px', padding: '13px 14px',
              color: 'var(--color-text)', fontSize: '15px',
              fontFamily: 'DM Sans, sans-serif', outline: 'none',
            }}
          />
          <div style={{ fontSize: '11px', color: '#34D399', marginTop: '3px', fontFamily: 'DM Sans, sans-serif' }}>
            {isShortStay ? 'Per night / nightly rate' : 'Per calendar month — leave blank if negotiable'}
          </div>
        </div>
      )}

      {/* Price (for_sale) */}
      {showPrice && (
        <div style={{ marginBottom: '14px' }}>
          <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-muted)', fontFamily: 'DM Sans, sans-serif', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Price (R)
          </label>
          <input
            type="number"
            value={formData.price}
            onChange={e => setFormData(prev => ({ ...prev, price: e.target.value }))}
            placeholder="e.g. 500"
            min="0"
            style={{
              width: '100%', boxSizing: 'border-box',
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: '12px', padding: '13px 14px',
              color: 'var(--color-text)', fontSize: '15px',
              fontFamily: 'DM Sans, sans-serif', outline: 'none',
            }}
          />
        </div>
      )}

      {/* Rate (services/jobs) */}
      {showRate && (
        <div style={{ marginBottom: '14px' }}>
          <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-muted)', fontFamily: 'DM Sans, sans-serif', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {isJob && formData.jobSubType === 'available' ? 'Expected rate / salary (optional)' :
             isJob ? 'Salary / Rate offered (optional)' :
             'Rate / Price (optional)'}
          </label>
          <input
            type="number"
            value={formData.price}
            onChange={e => setFormData(prev => ({ ...prev, price: e.target.value }))}
            placeholder="e.g. 200"
            min="0"
            style={{
              width: '100%', boxSizing: 'border-box',
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: '12px', padding: '13px 14px',
              color: 'var(--color-text)', fontSize: '15px',
              fontFamily: 'DM Sans, sans-serif', outline: 'none',
            }}
          />
        </div>
      )}

      {/* WhatsApp contact */}
      <div style={{ marginBottom: '14px' }}>
        <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-muted)', fontFamily: 'DM Sans, sans-serif', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          WhatsApp Number (optional)
        </label>
        <input
          type="tel"
          value={formData.contactWhatsapp}
          onChange={e => setFormData(prev => ({ ...prev, contactWhatsapp: e.target.value }))}
          placeholder="e.g. 0821234567"
          style={{
            width: '100%', boxSizing: 'border-box',
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '12px', padding: '13px 14px',
            color: 'var(--color-text)', fontSize: '15px',
            fontFamily: 'DM Sans, sans-serif', outline: 'none',
          }}
        />
        <div style={{ fontSize: '11px', color: 'var(--color-muted)', marginTop: '4px', fontFamily: 'DM Sans, sans-serif' }}>
          People will contact you directly on WhatsApp
        </div>
      </div>

      {/* ── Media section ───────────────────────────────────────────────── */}
      <div style={{ marginBottom: '20px' }}>
        {/* Section header */}
        <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-muted)', fontFamily: 'DM Sans, sans-serif', display: 'block', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          {VIDEO_CATS.includes(category) ? 'Media (optional)' : 'Photos (optional)'}
        </label>
        {VIDEO_CATS.includes(category) && (
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: 'rgba(255,255,255,0.35)', margin: '0 0 12px', lineHeight: 1.45 }}>
            Add photos or a short video — short clips build trust faster than long descriptions.
          </p>
        )}

        {/* Photos row */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: VIDEO_CATS.includes(category) ? '14px' : '0' }}>
          {formData.images.map((img, i) => (
            <div key={i} style={{ position: 'relative', width: '72px', height: '72px' }}>
              <img src={img} alt="" style={{ width: '72px', height: '72px', borderRadius: '10px', objectFit: 'cover' }} />
              <button
                onClick={() => removeImage(i)}
                style={{
                  position: 'absolute', top: '-6px', right: '-6px',
                  width: '20px', height: '20px', borderRadius: '50%',
                  background: '#EF4444', border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
                }}
              >
                <X size={11} color="#fff" />
              </button>
            </div>
          ))}
          {formData.images.length < 4 && (
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              style={{
                width: '72px', height: '72px', borderRadius: '10px',
                background: 'var(--color-surface)',
                border: '1px dashed var(--color-border)',
                cursor: uploading ? 'default' : 'pointer',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px',
                opacity: uploading ? 0.6 : 1,
              }}
            >
              <Camera size={18} color="var(--color-muted)" />
              <span style={{ fontSize: '9px', color: 'var(--color-muted)', fontFamily: 'DM Sans, sans-serif' }}>
                {uploading ? '…' : 'Add'}
              </span>
            </button>
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handleImageAdd} />

        {/* Short video — Phase 1 categories only */}
        {VIDEO_CATS.includes(category) && (
          <div>
            <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.28)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '8px' }}>
              Short video
              <span style={{ marginLeft: '7px', fontWeight: 400, textTransform: 'none', letterSpacing: 0, fontSize: '10px', color: 'rgba(255,255,255,0.22)' }}>
                optional · 10–20 seconds
              </span>
            </div>
            <VideoUpload
              currentUrl={formData.videoUrl}
              onUploaded={url => setFormData(prev => ({ ...prev, videoUrl: url }))}
              onRemove={() => setFormData(prev => ({ ...prev, videoUrl: '' }))}
            />
          </div>
        )}
      </div>

      {/* Neighbourhood indicator */}
      <div style={{
        background: 'var(--color-surface)', border: '1px solid var(--color-border)',
        borderRadius: '12px', padding: '10px 14px',
        fontSize: '13px', color: 'var(--color-muted)',
        fontFamily: 'DM Sans, sans-serif', marginBottom: '20px',
      }}>
        📍 This will be posted in <strong style={{ color: 'var(--color-text)' }}>{suburb}</strong>
      </div>

      {/* Next button */}
      <button
        onClick={onNext}
        disabled={!canProceed}
        style={{
          width: '100%', padding: '16px',
          background: canProceed ? (isSafety ? '#EF4444' : '#39D98A') : 'var(--color-border)',
          color: canProceed ? '#000' : 'var(--color-muted)',
          border: 'none', borderRadius: '14px',
          fontSize: '16px', fontWeight: 800,
          cursor: canProceed ? 'pointer' : 'default',
          fontFamily: 'DM Sans, sans-serif',
        }}
      >
        Preview post →
      </button>
    </div>
  );
}

// ─── Step 3: Preview + submit ─────────────────────────────────────────────────

function PreviewStep({
  category,
  formData,
  onSubmit,
  onBack,
  submitting,
}: {
  category: BoardCategory;
  formData: FormData;
  onSubmit: () => void;
  onBack: () => void;
  submitting: boolean;
}) {
  const cat = BOARD_CATEGORIES.find(c => c.key === category)!;
  const { suburb: s, city: c } = useLocation();
  const suburb = s || c || 'your area';
  const isSafety = category === 'safety';

  return (
    <div style={{ padding: '0 16px', paddingBottom: 'calc(80px + env(safe-area-inset-bottom, 0px))' }}>
      <div style={{ marginBottom: '16px' }}>
        <div style={{ fontSize: '12px', color: 'var(--color-muted)', fontFamily: 'DM Sans, sans-serif', marginBottom: '4px' }}>
          This is how your post will look
        </div>
      </div>

      {/* Preview card */}
      <div style={{
        background: 'var(--color-surface)',
        border: `1px solid ${isSafety ? 'rgba(239,68,68,0.4)' : 'var(--color-border)'}`,
        borderRadius: '16px',
        padding: '16px',
        marginBottom: '20px',
        borderLeft: isSafety ? '3px solid #EF4444' : undefined,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <span style={{
            fontSize: '12px', fontWeight: 700,
            color: isSafety ? '#EF4444' : cat.color,
            background: isSafety ? 'rgba(239,68,68,0.12)' : `${cat.color}18`,
            padding: '3px 10px', borderRadius: '20px',
          }}>
            {cat.emoji} {cat.label}
          </span>
          <span style={{ fontSize: '11px', color: 'var(--color-muted)', fontFamily: 'DM Sans, sans-serif' }}>just now</span>
        </div>

        <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '16px', color: 'var(--color-text)', marginBottom: formData.description ? '6px' : '10px', lineHeight: 1.3 }}>
          {formData.title}
        </div>

        {formData.description && (
          <p style={{ fontSize: '13px', color: 'var(--color-muted)', margin: '0 0 10px', lineHeight: 1.55, fontFamily: 'DM Sans, sans-serif' }}>
            {formData.description}
          </p>
        )}

        {formData.price && (
          <div style={{ fontSize: '18px', fontWeight: 800, color: '#39D98A', marginBottom: '10px', fontFamily: 'DM Sans, sans-serif' }}>
            R{Number(formData.price).toLocaleString()}
          </div>
        )}

        {/* Video preview (if any) */}
        {formData.videoUrl && (
          <div style={{ borderRadius: '10px', overflow: 'hidden', background: '#000', marginBottom: '10px', lineHeight: 0 }}>
            <video
              src={formData.videoUrl}
              preload="metadata"
              playsInline
              controls
              style={{ width: '100%', maxHeight: '180px', objectFit: 'contain', display: 'block' }}
            />
          </div>
        )}

        {/* First photo (if any) */}
        {formData.images.length > 0 && (
          <div style={{
            borderRadius: '10px', overflow: 'hidden',
            height: '160px', marginBottom: '10px',
          }}>
            <img src={formData.images[0]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
        )}

        <div style={{ fontSize: '11px', color: 'var(--color-muted)', fontFamily: 'DM Sans, sans-serif', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <span>📍 {suburb}</span>
          {formData.contactWhatsapp && <span>· 💬 WhatsApp</span>}
          {formData.videoUrl && <span>· 🎬 Video</span>}
          {formData.images.length > 1 && <span>· 📷 {formData.images.length}</span>}
        </div>
      </div>

      {/* Submit */}
      <button
        onClick={onSubmit}
        disabled={submitting}
        style={{
          width: '100%', padding: '16px',
          background: submitting ? 'var(--color-border)' : (isSafety ? '#EF4444' : '#39D98A'),
          color: submitting ? 'var(--color-muted)' : '#000',
          border: 'none', borderRadius: '14px',
          fontSize: '16px', fontWeight: 800,
          cursor: submitting ? 'default' : 'pointer',
          fontFamily: 'DM Sans, sans-serif',
          marginBottom: '10px',
        }}
      >
        {submitting ? 'Posting…' : `Post to ${suburb}`}
      </button>

      <button
        onClick={onBack}
        disabled={submitting}
        style={{
          width: '100%', padding: '14px',
          background: 'transparent', border: 'none',
          color: 'var(--color-muted)', fontSize: '14px',
          cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
        }}
      >
        ← Edit details
      </button>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function BoardNewPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { selectedCountry } = useCountry();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [category, setCategory] = useState<BoardCategory>('ask');

  // Pre-select category from query param (e.g. ?cat=services from "Post Your Skills" CTA)
  useEffect(() => {
    const cat = searchParams.get('cat') as BoardCategory | null;
    if (cat && ['for_sale','free','services','jobs','lost_found','announcements','ask','events','accommodation','safety'].includes(cat)) {
      setCategory(cat);
      setStep(2);
    }
  }, [searchParams]);
  const [formData, setFormData] = useState<FormData>({
    title: '', description: '', price: '', contactWhatsapp: '', images: [], videoUrl: '',
    isUrgent: false, housingSubType: 'rental', jobSubType: 'hiring', serviceSubType: 'offering',
  });
  const [submitting, setSubmitting] = useState(false);
  const [successPost, setSuccessPost] = useState<BoardPost | null>(null);

  const { suburb: s, city: c } = useLocation();
  const suburb = s || c || 'your area';

  async function handleSubmit() {
    setSubmitting(true);
    const uid = await getInteractiveUserId();
    const { error, post } = await createBoardPost({
      neighbourhood: suburb,
      category,
      title: formData.title.trim(),
      description: formData.description.trim() || undefined,
      price: formData.price ? Number(formData.price) : undefined,
      contact_whatsapp: formData.contactWhatsapp.trim() || undefined,
      images: formData.images,
      video_url: formData.videoUrl || undefined,
      country_code: selectedCountry.code,
    }, uid);

    if (!error && post) {
      // Track ownership
      try {
        const mine: string[] = JSON.parse(localStorage.getItem('kayaa_board_mine') ?? '[]');
        mine.unshift(post.id);
        localStorage.setItem('kayaa_board_mine', JSON.stringify(mine.slice(0, 50)));
      } catch { /* ignore */ }
      setSuccessPost(post);
    } else {
      setSubmitting(false);
    }
  }

  function selectCategory(cat: BoardCategory) {
    setCategory(cat);
    setStep(2);
  }

  const stepTitle = step === 1 ? 'New post' : step === 2 ? 'Add details' : 'Preview';
  const cat = BOARD_CATEGORIES.find(c => c.key === category);

  // ── Post-submit success screen ──────────────────────────────────────────────
  if (successPost) {
    const successCat  = BOARD_CATEGORIES.find(c => c.key === successPost.category);
    const emoji       = successCat?.emoji ?? '📌';
    const boardUrl    = `https://kayaa.co.za/board`;

    // WhatsApp message tailored by category
    let waText = '';
    if (['jobs'].includes(successPost.category)) {
      waText = `💼 Job going in ${successPost.neighbourhood}: "${successPost.title}". Pass it on if you know someone 👉 ${boardUrl}`;
    } else if (['services'].includes(successPost.category)) {
      waText = `🛠️ Service available in ${successPost.neighbourhood}: "${successPost.title}". Find it on Kayaa 👉 ${boardUrl}`;
    } else if (['accommodation'].includes(successPost.category)) {
      waText = `🏠 Place available in ${successPost.neighbourhood}: "${successPost.title}". See it on Kayaa 👉 ${boardUrl}`;
    } else if (['for_sale', 'free'].includes(successPost.category)) {
      waText = `${emoji} "${successPost.title}" listed in ${successPost.neighbourhood}. Check it out on Kayaa 👉 ${boardUrl}`;
    } else {
      waText = `${emoji} "${successPost.title}" — posted in ${successPost.neighbourhood} on Kayaa 👉 ${boardUrl}`;
    }

    return (
      <div style={{
        minHeight: '100vh', background: 'var(--color-bg)',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', padding: '32px 24px', textAlign: 'center',
      }}>
        {/* Success checkmark */}
        <div style={{
          width: '72px', height: '72px', borderRadius: '50%',
          background: 'rgba(57,217,138,0.12)', border: '2px solid #39D98A',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '32px', marginBottom: '20px',
        }}>
          ✅
        </div>

        <h1 style={{
          fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '22px',
          color: 'var(--color-text)', margin: '0 0 8px',
        }}>
          Post published!
        </h1>
        <p style={{
          fontFamily: 'DM Sans, sans-serif', fontSize: '14px',
          color: 'var(--color-muted)', margin: '0 0 32px', lineHeight: 1.55,
          maxWidth: '280px',
        }}>
          Your post is live in {successPost.neighbourhood}. Share it with locals to get noticed faster.
        </p>

        {/* WhatsApp share CTA */}
        <button
          onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(waText)}`, '_blank', 'noopener')}
          style={{
            width: '100%', maxWidth: '320px',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
            padding: '15px 20px', borderRadius: '14px',
            background: '#25D366', border: 'none', cursor: 'pointer',
            marginBottom: '12px',
            WebkitTapHighlightColor: 'transparent',
          } as React.CSSProperties}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="#000">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
          <span style={{
            fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '15px', color: '#000',
          }}>
            Share on WhatsApp
          </span>
        </button>

        <button
          onClick={() => navigate('/board')}
          style={{
            width: '100%', maxWidth: '320px',
            padding: '14px 20px', borderRadius: '14px',
            background: 'transparent',
            border: '1px solid var(--color-border)',
            cursor: 'pointer',
            fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: '14px',
            color: 'var(--color-muted)',
            WebkitTapHighlightColor: 'transparent',
          } as React.CSSProperties}
        >
          Go to board
        </button>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>

      {/* Top bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '12px',
        padding: '14px 16px',
        borderBottom: '1px solid var(--color-border)',
        position: 'sticky', top: 0, background: 'var(--color-bg)', zIndex: 10,
      }}>
        <button
          onClick={() => step === 1 ? navigate('/board') : setStep(s => (s - 1) as 1 | 2 | 3)}
          style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex' }}
        >
          <ArrowLeft size={20} color="var(--color-text)" />
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '17px', color: 'var(--color-text)' }}>
            {stepTitle}
          </div>
          {step > 1 && cat && (
            <div style={{ fontSize: '12px', color: 'var(--color-muted)', fontFamily: 'DM Sans, sans-serif' }}>
              {cat.emoji} {cat.label}
            </div>
          )}
        </div>
        {/* Step indicators */}
        <div style={{ display: 'flex', gap: '4px' }}>
          {[1, 2, 3].map(s => (
            <div key={s} style={{
              width: s <= step ? '20px' : '6px', height: '6px',
              borderRadius: '3px',
              background: s <= step ? '#39D98A' : 'var(--color-border)',
              transition: 'width 0.2s',
            }} />
          ))}
        </div>
      </div>

      {/* Steps */}
      {step === 1 && <CategoryPicker onSelect={selectCategory} />}
      {step === 2 && (
        <DetailsForm
          category={category}
          formData={formData}
          setFormData={setFormData}
          onNext={() => setStep(3)}
          onBack={() => setStep(1)}
        />
      )}
      {step === 3 && (
        <PreviewStep
          category={category}
          formData={formData}
          onSubmit={handleSubmit}
          onBack={() => setStep(2)}
          submitting={submitting}
        />
      )}
    </div>
  );
}
