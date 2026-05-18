/**
 * UtilityReportPage — /report/utility/:type
 *
 * Structured local reporting for power and water infrastructure issues.
 * type = 'power' | 'water'
 *
 * Two-screen flow:
 *   Step 1 — pick the issue type
 *   Step 2 — fill in details (area, when, note, optional photo)
 *   Step 3 — success confirmation
 *
 * Power color: #FBBF24 (amber)
 * Water color: #60A5FA (blue)
 */

import { useState, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Camera, Loader, MapPin, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNeighbourhood } from '../contexts/NeighbourhoodContext';
import {
  createUtilityReport,
  checkUtilityDuplicate,
  uploadUtilityPhoto,
} from '../lib/api';
import type {
  UtilityCategory,
  UtilityIssueType,
} from '../lib/api';

// ─── Issue type definitions ───────────────────────────────────────────────────

interface IssueOption {
  value: UtilityIssueType;
  label: string;
  icon:  string;
  desc:  string;
  isRestoration?: boolean;
}

const POWER_ISSUES: IssueOption[] = [
  { value: 'power_out',     icon: '⚡', label: 'Power out',        desc: 'Complete outage — no electricity' },
  { value: 'load_shedding', icon: '🔁', label: 'Load shedding',    desc: 'Scheduled rolling blackout active' },
  { value: 'flickering',    icon: '💡', label: 'Flickering',       desc: 'Lights or power cutting in and out' },
  { value: 'streetlights',  icon: '🔦', label: 'Streetlights out', desc: 'Street or park lights not working' },
  { value: 'power_restored',icon: '✅', label: 'Power restored',   desc: 'Power is back on in this area', isRestoration: true },
];

const WATER_ISSUES: IssueOption[] = [
  { value: 'no_water',      icon: '🚱', label: 'No water',         desc: 'Taps completely dry' },
  { value: 'low_pressure',  icon: '📉', label: 'Low pressure',     desc: 'Water is trickling or slow' },
  { value: 'dirty_water',   icon: '🟤', label: 'Dirty water',      desc: 'Discoloured or cloudy water from tap' },
  { value: 'leak_burst',    icon: '💧', label: 'Leak / burst pipe', desc: 'Visible pipe burst or road flooding' },
  { value: 'water_restored',icon: '✅', label: 'Water restored',   desc: 'Water supply is back to normal', isRestoration: true },
];

// ─── Theme per category ───────────────────────────────────────────────────────

const THEME = {
  power: {
    color:      '#FBBF24',
    colorFaint: 'rgba(251,191,36,0.08)',
    colorBorder:'rgba(251,191,36,0.2)',
    label:      'Power',
    icon:       '⚡',
    issues:     POWER_ISSUES,
  },
  water: {
    color:      '#60A5FA',
    colorFaint: 'rgba(96,165,250,0.08)',
    colorBorder:'rgba(96,165,250,0.2)',
    label:      'Water',
    icon:       '💧',
    issues:     WATER_ISSUES,
  },
} as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (diff < 1)  return 'just now';
  if (diff < 60) return `${diff}m ago`;
  return `${Math.floor(diff / 60)}h ago`;
}

// ─── Component ────────────────────────────────────────────────────────────────

type Step = 'pick' | 'details' | 'success';

export default function UtilityReportPage() {
  const navigate    = useNavigate();
  const { type }    = useParams<{ type: string }>();
  const { user }    = useAuth();
  const { displaySuburb, displayCity } = useNeighbourhood();

  const category   = (type === 'water' ? 'water' : 'power') as UtilityCategory;
  const theme      = THEME[category];
  const neighbourhood = displaySuburb || displayCity || '';

  // ── step state ──
  const [step,        setStep]        = useState<Step>('pick');
  const [issueType,   setIssueType]   = useState<UtilityIssueType | null>(null);
  const [areaDetail,  setAreaDetail]  = useState('');
  const [startedWhen, setStartedWhen] = useState<'now' | 'earlier'>('now');
  const [note,        setNote]        = useState('');
  const [photoFile,   setPhotoFile]   = useState<File | null>(null);
  const [photoPreview,setPhotoPreview]= useState<string | null>(null);
  const [dupCount,    setDupCount]    = useState(0);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState('');
  const [submitTime,  setSubmitTime]  = useState('');

  const fileRef = useRef<HTMLInputElement>(null);

  // ── photo picker ──
  const handlePhoto = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 20 * 1024 * 1024) { setError('Photo must be under 20 MB.'); return; }
    setPhotoFile(f);
    setPhotoPreview(URL.createObjectURL(f));
    setError('');
  }, []);

  const removePhoto = useCallback(() => {
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoFile(null);
    setPhotoPreview(null);
  }, [photoPreview]);

  // ── step 1 → step 2 ──
  const selectIssue = useCallback(async (opt: IssueOption) => {
    if (!user) { navigate('/welcome'); return; }
    setIssueType(opt.value);
    // check dups in background
    if (!opt.isRestoration) {
      const n = await checkUtilityDuplicate(neighbourhood, opt.value);
      setDupCount(n);
    } else {
      setDupCount(0);
    }
    setStep('details');
  }, [user, neighbourhood, navigate]);

  // ── submit ──
  const handleSubmit = useCallback(async () => {
    if (!user || !issueType) return;
    if (!areaDetail.trim()) { setError('Please enter the street or area affected.'); return; }

    setLoading(true);
    setError('');
    try {
      let photoUrl: string | undefined;
      if (photoFile) {
        const up = await uploadUtilityPhoto(user.id, photoFile);
        if ('error' in up) { setError(up.error); setLoading(false); return; }
        photoUrl = up.url;
      }
      const { error: err } = await createUtilityReport(user.id, {
        neighbourhood,
        category,
        issueType,
        areaDetail: areaDetail.trim(),
        startedWhen,
        note: note.trim() || undefined,
        photoUrl,
      });
      if (err) { setError(err); setLoading(false); return; }
      setSubmitTime(new Date().toISOString());
      setStep('success');
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [user, issueType, areaDetail, startedWhen, note, photoFile, neighbourhood, category]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────────

  const selectedOption = theme.issues.find(o => o.value === issueType);

  return (
    <div style={{
      minHeight: '100dvh',
      background: '#0D1117',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'Inter, sans-serif',
    }}>

      {/* ── Header ── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: '#0D1117',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        padding: '14px 16px',
        display: 'flex', alignItems: 'center', gap: '12px',
      }}>
        <button
          onClick={() => step === 'details' ? setStep('pick') : navigate(-1)}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'rgba(255,255,255,0.6)', padding: '4px', display: 'flex',
          }}
          aria-label="Back"
        >
          <ArrowLeft size={20} />
        </button>

        <div style={{ flex: 1 }}>
          <p style={{
            fontFamily: 'Inter, sans-serif', fontWeight: 700,
            fontSize: '16px', color: '#F0F6FC', margin: 0, lineHeight: 1.2,
          }}>
            {step === 'success'
              ? 'Report submitted'
              : `${theme.icon} Report ${theme.label} issue`}
          </p>
          {neighbourhood && step !== 'success' && (
            <p style={{
              fontSize: '12px', color: 'rgba(255,255,255,0.35)',
              margin: '2px 0 0', display: 'flex', alignItems: 'center', gap: '4px',
            }}>
              <MapPin size={10} />
              {neighbourhood}
            </p>
          )}
        </div>

        {/* colour dot */}
        <div style={{
          width: '10px', height: '10px', borderRadius: '50%',
          background: theme.color, flexShrink: 0,
        }} />
      </div>

      {/* ── Content ── */}
      <div style={{ flex: 1, overflow: 'auto', padding: '0 0 120px' }}>

        {/* ═══ STEP 1 — issue picker ═══════════════════════════════════════════ */}
        {step === 'pick' && (
          <div style={{ padding: '20px 16px 0' }}>
            <p style={{
              fontSize: '13px', color: 'rgba(255,255,255,0.4)',
              margin: '0 0 20px', lineHeight: 1.6,
            }}>
              What's happening with {category === 'power' ? 'electricity' : 'water'} in your area?
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {theme.issues.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => selectIssue(opt)}
                  style={{
                    background: opt.isRestoration
                      ? 'rgba(57,217,138,0.06)'
                      : theme.colorFaint,
                    border: `1px solid ${opt.isRestoration ? 'rgba(57,217,138,0.2)' : theme.colorBorder}`,
                    borderRadius: '14px',
                    padding: '14px 16px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    width: '100%',
                  }}
                >
                  <span style={{ fontSize: '24px', flexShrink: 0 }}>{opt.icon}</span>
                  <div>
                    <p style={{
                      fontFamily: 'Inter, sans-serif', fontWeight: 700,
                      fontSize: '14px',
                      color: opt.isRestoration ? '#39D98A' : theme.color,
                      margin: 0,
                    }}>
                      {opt.label}
                    </p>
                    <p style={{
                      fontSize: '12px', color: 'rgba(255,255,255,0.4)',
                      margin: '2px 0 0',
                    }}>
                      {opt.desc}
                    </p>
                  </div>
                  <span style={{
                    marginLeft: 'auto',
                    color: 'rgba(255,255,255,0.2)',
                    fontSize: '18px', flexShrink: 0,
                  }}>›</span>
                </button>
              ))}
            </div>

            <p style={{
              marginTop: '24px',
              fontSize: '11px', color: 'rgba(255,255,255,0.2)',
              textAlign: 'center', lineHeight: 1.6,
            }}>
              Reports are shared with neighbours in {neighbourhood || 'your area'}.
            </p>
          </div>
        )}

        {/* ═══ STEP 2 — details ════════════════════════════════════════════════ */}
        {step === 'details' && selectedOption && (
          <div style={{ padding: '20px 16px 0' }}>

            {/* Selected issue badge */}
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              background: selectedOption.isRestoration ? 'rgba(57,217,138,0.08)' : theme.colorFaint,
              border: `1px solid ${selectedOption.isRestoration ? 'rgba(57,217,138,0.2)' : theme.colorBorder}`,
              borderRadius: '100px',
              padding: '6px 14px',
              marginBottom: '20px',
            }}>
              <span style={{ fontSize: '14px' }}>{selectedOption.icon}</span>
              <span style={{
                fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '13px',
                color: selectedOption.isRestoration ? '#39D98A' : theme.color,
              }}>
                {selectedOption.label}
              </span>
            </div>

            {/* Dup count notice */}
            {dupCount > 0 && !selectedOption.isRestoration && (
              <div style={{
                background: theme.colorFaint,
                border: `1px solid ${theme.colorBorder}`,
                borderRadius: '12px',
                padding: '10px 14px',
                marginBottom: '16px',
                display: 'flex', alignItems: 'center', gap: '8px',
              }}>
                <span style={{ fontSize: '16px' }}>📢</span>
                <p style={{
                  margin: 0, fontSize: '13px',
                  color: theme.color,
                  fontFamily: 'Inter, sans-serif', fontWeight: 600,
                }}>
                  {dupCount} {dupCount === 1 ? 'person has' : 'people have'} already reported this — your report adds to the count.
                </p>
              </div>
            )}

            {/* ── Area / street ── */}
            <label style={{ display: 'block', marginBottom: '16px' }}>
              <span style={{
                display: 'block', fontSize: '12px', fontWeight: 600,
                color: 'rgba(255,255,255,0.5)', marginBottom: '6px',
                textTransform: 'uppercase', letterSpacing: '0.05em',
              }}>
                Street or area affected *
              </span>
              <input
                value={areaDetail}
                onChange={e => setAreaDetail(e.target.value.slice(0, 80))}
                placeholder="e.g. Main Road near the school, or Ext 4"
                style={{
                  width: '100%', boxSizing: 'border-box',
                  background: '#161B22',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '12px', padding: '12px 14px',
                  color: '#F0F6FC', fontSize: '14px',
                  fontFamily: 'Inter, sans-serif',
                  outline: 'none',
                }}
              />
            </label>

            {/* ── When started ── */}
            <div style={{ marginBottom: '16px' }}>
              <span style={{
                display: 'block', fontSize: '12px', fontWeight: 600,
                color: 'rgba(255,255,255,0.5)', marginBottom: '8px',
                textTransform: 'uppercase', letterSpacing: '0.05em',
              }}>
                When did this start?
              </span>
              <div style={{ display: 'flex', gap: '10px' }}>
                {(['now', 'earlier'] as const).map(w => (
                  <button
                    key={w}
                    onClick={() => setStartedWhen(w)}
                    style={{
                      flex: 1, padding: '10px 0',
                      borderRadius: '12px',
                      border: `1px solid ${startedWhen === w ? theme.color : 'rgba(255,255,255,0.1)'}`,
                      background: startedWhen === w ? theme.colorFaint : '#161B22',
                      color: startedWhen === w ? theme.color : 'rgba(255,255,255,0.45)',
                      fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: '14px',
                      cursor: 'pointer',
                    }}
                  >
                    {w === 'now' ? 'Just now' : 'Earlier today'}
                  </button>
                ))}
              </div>
            </div>

            {/* ── Note ── */}
            <label style={{ display: 'block', marginBottom: '16px' }}>
              <span style={{
                display: 'block', fontSize: '12px', fontWeight: 600,
                color: 'rgba(255,255,255,0.5)', marginBottom: '6px',
                textTransform: 'uppercase', letterSpacing: '0.05em',
              }}>
                Short note (optional)
              </span>
              <textarea
                value={note}
                onChange={e => setNote(e.target.value.slice(0, 200))}
                placeholder="Any extra detail that might help neighbours…"
                rows={3}
                style={{
                  width: '100%', boxSizing: 'border-box',
                  background: '#161B22',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '12px', padding: '12px 14px',
                  color: '#F0F6FC', fontSize: '14px',
                  fontFamily: 'Inter, sans-serif',
                  resize: 'none', outline: 'none',
                }}
              />
              <span style={{
                display: 'block', textAlign: 'right',
                fontSize: '11px', color: 'rgba(255,255,255,0.2)',
                marginTop: '4px',
              }}>
                {note.length}/200
              </span>
            </label>

            {/* ── Photo ── */}
            <div style={{ marginBottom: '20px' }}>
              <span style={{
                display: 'block', fontSize: '12px', fontWeight: 600,
                color: 'rgba(255,255,255,0.5)', marginBottom: '8px',
                textTransform: 'uppercase', letterSpacing: '0.05em',
              }}>
                Photo (optional · up to 20 MB)
              </span>

              {photoPreview ? (
                <div style={{ position: 'relative', display: 'inline-block' }}>
                  <img
                    src={photoPreview}
                    alt="Preview"
                    style={{
                      width: '120px', height: '120px',
                      objectFit: 'cover', borderRadius: '12px',
                      border: '1px solid rgba(255,255,255,0.08)',
                    }}
                  />
                  <button
                    onClick={removePhoto}
                    style={{
                      position: 'absolute', top: '6px', right: '6px',
                      width: '22px', height: '22px', borderRadius: '50%',
                      background: 'rgba(0,0,0,0.7)', border: 'none',
                      cursor: 'pointer', display: 'flex',
                      alignItems: 'center', justifyContent: 'center',
                      color: '#fff',
                    }}
                    aria-label="Remove photo"
                  >
                    <X size={12} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => fileRef.current?.click()}
                  style={{
                    width: '100%', padding: '16px',
                    background: '#161B22',
                    border: '1px dashed rgba(255,255,255,0.14)',
                    borderRadius: '12px', cursor: 'pointer',
                    display: 'flex', alignItems: 'center',
                    justifyContent: 'center', gap: '8px',
                    color: 'rgba(255,255,255,0.35)',
                    fontFamily: 'Inter, sans-serif', fontSize: '14px',
                  }}
                >
                  <Camera size={16} />
                  Add a photo
                </button>
              )}

              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handlePhoto}
                style={{ display: 'none' }}
              />

              <p style={{
                marginTop: '6px', fontSize: '11px',
                color: 'rgba(255,255,255,0.2)', lineHeight: 1.5,
              }}>
                Only share photos relevant to the issue. Do not show people's faces.
              </p>
            </div>

            {/* Error */}
            {error && (
              <p style={{
                fontSize: '13px', color: '#EF4444',
                background: 'rgba(239,68,68,0.06)',
                border: '1px solid rgba(239,68,68,0.15)',
                borderRadius: '10px', padding: '10px 14px',
                marginBottom: '12px',
              }}>
                {error}
              </p>
            )}
          </div>
        )}

        {/* ═══ STEP 3 — success ════════════════════════════════════════════════ */}
        {step === 'success' && (
          <div style={{
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            minHeight: '60dvh', padding: '32px 24px',
            textAlign: 'center',
          }}>
            <div style={{
              width: '72px', height: '72px', borderRadius: '50%',
              background: theme.colorFaint, border: `1px solid ${theme.colorBorder}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '32px', marginBottom: '20px',
            }}>
              {selectedOption?.icon ?? theme.icon}
            </div>

            <h2 style={{
              fontFamily: 'Inter, sans-serif', fontWeight: 800,
              fontSize: '20px', color: '#F0F6FC',
              margin: '0 0 10px',
            }}>
              Report sent
            </h2>

            <p style={{
              fontSize: '14px', color: 'rgba(255,255,255,0.45)',
              lineHeight: 1.65, maxWidth: '280px', margin: '0 0 6px',
            }}>
              Neighbours in {neighbourhood} can now see this {theme.label.toLowerCase()} report.
            </p>

            {submitTime && (
              <p style={{
                fontSize: '12px', color: 'rgba(255,255,255,0.22)',
                margin: '0 0 32px',
              }}>
                Submitted {timeAgo(submitTime)}
              </p>
            )}

            <button
              onClick={() => navigate('/alerts')}
              style={{
                width: '100%', maxWidth: '300px', minHeight: '52px',
                background: theme.color, color: '#0D1117',
                border: 'none', borderRadius: '14px',
                fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '16px',
                cursor: 'pointer', marginBottom: '10px',
              }}
            >
              View Alerts
            </button>

            <button
              onClick={() => navigate('/feed')}
              style={{
                width: '100%', maxWidth: '300px', minHeight: '48px',
                background: 'transparent', color: 'rgba(255,255,255,0.4)',
                border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px',
                fontFamily: 'Inter, sans-serif', fontWeight: 500, fontSize: '15px',
                cursor: 'pointer',
              }}
            >
              Back to Feed
            </button>
          </div>
        )}
      </div>

      {/* ── Sticky CTA (details step only) ── */}
      {step === 'details' && (
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          padding: '16px',
          background: 'linear-gradient(to top, #0D1117 80%, transparent)',
        }}>
          <button
            onClick={handleSubmit}
            disabled={loading || !areaDetail.trim()}
            style={{
              width: '100%', minHeight: '54px',
              background: (!loading && areaDetail.trim()) ? theme.color : 'rgba(255,255,255,0.08)',
              color: (!loading && areaDetail.trim()) ? '#0D1117' : 'rgba(255,255,255,0.25)',
              border: 'none', borderRadius: '14px',
              fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '16px',
              cursor: (!loading && areaDetail.trim()) ? 'pointer' : 'default',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              transition: 'background 0.2s, color 0.2s',
            }}
          >
            {loading
              ? <><Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> Submitting…</>
              : `${theme.icon} Submit ${theme.label} report`}
          </button>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
