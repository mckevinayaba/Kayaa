import { useState, useRef, useCallback, useEffect } from 'react';
// react-router-dom not needed after magic-link auth — no navigate calls remain
import { ArrowLeft, Shield, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { QRCodeCanvas } from 'qrcode.react';
import { createVenue, createVenueOwner, updateVenueCoords, uploadVenueFile } from '../lib/api';
import { signInWithEmail } from '../lib/auth';
import { geocodeAddress } from '../lib/geocode';
import { useCountry } from '../contexts/CountryContext';
import { PRIMARY_CATEGORIES, getPrimaryCategory, type PrimaryKey } from '../config/categoryLabels';

// ─── Data ─────────────────────────────────────────────────────────────────────

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Deterministic slug — used for display/preview only */
function toDisplaySlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 30)
    .replace(/-+$/, '');
}

/**
 * Submission slug — appends a 4-char random suffix so that two places with
 * similar names never collide on the `slug UNIQUE` constraint.
 */
function toSlug(name: string): string {
  const base = toDisplaySlug(name);
  const suffix = Math.random().toString(36).slice(2, 6);
  return base ? `${base}-${suffix}` : `place-${suffix}`;
}

function fileExt(file: File): string {
  const parts = file.name.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : 'jpg';
}

// ─── Shared components ────────────────────────────────────────────────────────

function StepIndicator({ current }: { current: 1 | 2 | 3 | 4 }) {
  const labels = ['Your business', 'Media', 'About you', "You're live"];
  return (
    <div style={{ marginBottom: '28px' }}>
      <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
        {[1, 2, 3, 4].map(n => (
          <div key={n} style={{
            flex: 1, height: '3px', borderRadius: '2px',
            background: n <= current ? 'var(--color-accent)' : 'var(--color-border)',
            transition: 'background 0.3s',
          }} />
        ))}
      </div>
      <p style={{ fontSize: '12px', color: 'var(--color-muted)' }}>
        Step {current} of 4 · {labels[current - 1]}
      </p>
    </div>
  );
}

// ─── Two-step category picker ─────────────────────────────────────────────────

function PrimaryCategoryGrid({
  selected, onSelect,
}: { selected: PrimaryKey | ''; onSelect: (key: PrimaryKey) => void }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
      {PRIMARY_CATEGORIES.map(({ key, label, emoji }) => {
        const isSelected = selected === key;
        return (
          <button key={key} onClick={() => onSelect(key)} style={{
            display: 'flex', flexDirection: 'row', alignItems: 'center',
            gap: '10px', padding: '14px 14px',
            borderRadius: '14px',
            background: isSelected ? 'rgba(57,217,138,0.08)' : 'var(--color-surface)',
            border: `1.5px solid ${isSelected ? 'var(--color-accent)' : 'var(--color-border)'}`,
            cursor: 'pointer', transition: 'all 0.15s',
            textAlign: 'left',
          }}>
            <span style={{ fontSize: '22px', lineHeight: 1, flexShrink: 0 }}>{emoji}</span>
            <span style={{
              fontSize: '12px', fontWeight: 600, lineHeight: 1.3,
              color: isSelected ? 'var(--color-accent)' : 'var(--color-text)',
              transition: 'color 0.15s',
            }}>{label}</span>
          </button>
        );
      })}
    </div>
  );
}

function SubtypeChips({
  subtypes, selected, onSelect,
}: { subtypes: string[]; selected: string; onSelect: (s: string) => void }) {
  return (
    <div style={{
      display: 'flex', flexWrap: 'wrap', gap: '7px',
      marginTop: '12px',
    }}>
      {subtypes.map(sub => {
        const isSelected = selected === sub;
        return (
          <button key={sub} onClick={() => onSelect(sub)} style={{
            padding: '7px 14px', borderRadius: '20px',
            border: `1.5px solid ${isSelected ? 'var(--color-accent)' : 'var(--color-border)'}`,
            background: isSelected ? 'rgba(57,217,138,0.1)' : 'var(--color-surface)',
            color: isSelected ? 'var(--color-accent)' : 'var(--color-muted)',
            fontSize: '13px', fontWeight: 600, fontFamily: 'Inter, sans-serif',
            cursor: 'pointer', transition: 'all 0.15s',
          }}>
            {sub}
          </button>
        );
      })}
    </div>
  );
}

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div onClick={() => onChange(!checked)} style={{
      width: '46px', height: '26px', borderRadius: '13px', flexShrink: 0,
      background: checked ? 'var(--color-accent)' : 'var(--color-surface2)',
      border: `1px solid ${checked ? 'var(--color-accent)' : 'var(--color-border)'}`,
      position: 'relative', cursor: 'pointer', transition: 'background 0.2s, border-color 0.2s',
    }}>
      <div style={{
        position: 'absolute', top: '4px', left: checked ? '23px' : '4px',
        width: '16px', height: '16px', borderRadius: '50%',
        background: checked ? '#000' : '#6B7280', transition: 'left 0.2s',
      }} />
    </div>
  );
}

// ─── Input styles ─────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: '100%', background: 'var(--color-surface)',
  border: '1px solid var(--color-border)', borderRadius: '14px',
  padding: '15px 16px', color: 'var(--color-text)', fontSize: '16px',
  fontFamily: 'Inter, sans-serif', outline: 'none',
  boxSizing: 'border-box', minHeight: '52px',
};

// Larger, higher-contrast labels — easier to read on mobile
const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '15px', fontWeight: 700,
  color: 'rgba(255,255,255,0.88)', marginBottom: '8px',
};

// Helper text below a label
const hintStyle: React.CSSProperties = {
  fontSize: '13px', color: 'var(--color-muted)',
  marginBottom: '10px', marginTop: '-4px', lineHeight: 1.55,
};

function errorStyle(show: boolean): React.CSSProperties {
  return {
    fontSize: '13px', color: '#F87171',
    marginTop: '7px', minHeight: '18px',
    visibility: show ? 'visible' : 'hidden',
    fontFamily: 'Inter, sans-serif',
  };
}

// ─── Cover Photo Upload ───────────────────────────────────────────────────────

/** Compress an image to max 1280px on the longest side, JPEG 80%. */
async function compressImage(file: File, maxPx = 1280, quality = 0.8): Promise<File> {
  return new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob(
        (blob) => {
          if (!blob) { resolve(file); return; }
          const name = file.name.replace(/\.\w+$/, '') + '.jpg';
          resolve(new File([blob], name, { type: 'image/jpeg' }));
        },
        'image/jpeg',
        quality,
      );
    };
    img.onerror = () => { URL.revokeObjectURL(objectUrl); resolve(file); };
    img.src = objectUrl;
  });
}

interface CoverPhotoUploadProps {
  sessionId: string;
  onUploaded: (url: string) => void;
  currentUrl: string;
}

function CoverPhotoUpload({ sessionId, onUploaded, currentUrl }: CoverPhotoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<string>(currentUrl || '');
  const [uploaded, setUploaded] = useState(!!currentUrl);

  async function handleFile(file: File) {
    if (!file.type.startsWith('image/')) { setError('Please select an image file.'); return; }
    if (file.size > 10 * 1024 * 1024) { setError('File too large. Maximum 10MB.'); return; }

    setError('');
    setProcessing(true);
    setUploaded(false);

    try {
      const compressed = await compressImage(file);
      const localUrl = URL.createObjectURL(compressed);
      setPreview(localUrl);

      const path = `covers/${sessionId}/cover.jpg`;
      const url = await uploadVenueFile(path, compressed);
      onUploaded(url);
      setUploaded(true);
    } catch {
      setError('Upload failed. Tap to try again.');
      setPreview('');
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div>
      <style>{`@keyframes obSpin { to { transform: rotate(360deg); } }`}</style>
      <input
        ref={inputRef} type="file" accept="image/*"
        style={{ display: 'none' }}
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }}
      />

      <div
        onClick={() => !processing && inputRef.current?.click()}
        style={{
          height: '200px', borderRadius: '12px', overflow: 'hidden',
          border: `1.5px dashed ${error ? '#F87171' : preview ? '#39D98A' : '#333'}`,
          background: preview ? 'transparent' : '#1a1a1a',
          position: 'relative', cursor: processing ? 'default' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        {/* Preview image — always cover */}
        {preview && (
          <img
            src={preview} alt=""
            style={{
              position: 'absolute', inset: 0, width: '100%', height: '100%',
              objectFit: 'cover', objectPosition: 'center', display: 'block',
            }}
          />
        )}

        {/* Scrim for overlay legibility */}
        {preview && (
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 55%)' }} />
        )}

        {/* Processing spinner overlay */}
        {processing && (
          <div style={{
            position: 'absolute', inset: 0,
            background: preview ? 'rgba(13,17,23,0.5)' : '#1a1a1a',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: '10px',
          }}>
            <div style={{
              width: '28px', height: '28px', borderRadius: '50%',
              border: '3px solid rgba(57,217,138,0.25)',
              borderTopColor: '#39D98A',
              animation: 'obSpin 0.8s linear infinite',
            }} />
            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: 'rgba(255,255,255,0.55)' }}>
              Sorting your photo...
            </span>
          </div>
        )}

        {/* Empty state */}
        {!preview && !processing && (
          <div style={{ textAlign: 'center', padding: '32px 20px' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>📷</div>
            <div style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '15px', color: 'var(--color-text)', marginBottom: '6px' }}>
              Tap to add a photo of your business
            </div>
            <div style={{ fontSize: '12px', color: 'var(--color-muted)' }}>
              JPG, PNG or HEIC · Max 10MB
            </div>
          </div>
        )}

        {/* ✓ Photo ready — bottom right */}
        {preview && uploaded && !processing && (
          <div style={{
            position: 'absolute', bottom: '10px', right: '10px',
            background: 'rgba(57,217,138,0.92)', color: '#000',
            fontSize: '11px', fontWeight: 700, padding: '4px 10px',
            borderRadius: '20px', fontFamily: 'Inter, sans-serif',
          }}>
            ✓ Photo ready
          </div>
        )}

        {/* Change photo — bottom left overlay */}
        {preview && !processing && (
          <button
            onClick={e => { e.stopPropagation(); inputRef.current?.click(); }}
            style={{
              position: 'absolute', bottom: '10px', left: '10px',
              background: 'rgba(13,17,23,0.72)', border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '20px', padding: '4px 10px',
              fontFamily: 'Inter, sans-serif', fontSize: '11px', fontWeight: 600,
              color: 'rgba(255,255,255,0.85)', cursor: 'pointer',
            }}
          >
            Change photo
          </button>
        )}
      </div>

      {error && <p style={{ fontSize: '12px', color: '#F87171', marginTop: '6px' }}>{error}</p>}
    </div>
  );
}

// ─── Gallery Upload (Step 2) ──────────────────────────────────────────────────

interface GalleryUploadProps {
  sessionId: string;
  coverUrl: string;
  galleryImages: string[];  // additional images (slots 2-8)
  onUpdate: (images: string[]) => void;
}

function GalleryUpload({ sessionId, coverUrl, galleryImages, onUpdate }: GalleryUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploadingSlot, setUploadingSlot] = useState<number | null>(null);
  const [errors, setErrors] = useState<Record<number, string>>({});
  const [pendingSlot, setPendingSlot] = useState<number | null>(null);

  // Slot 0 = cover (fixed), slots 1-7 = additional
  const allSlots = [coverUrl, ...galleryImages]; // length 1-8
  void (8 - allSlots.length); // how many more can be added

  async function handleFile(file: File, slotIdx: number) {
    if (!file.type.startsWith('image/')) { setErrors(e => ({ ...e, [slotIdx]: 'Images only' })); return; }
    if (file.size > 10 * 1024 * 1024) { setErrors(e => ({ ...e, [slotIdx]: 'Max 10MB' })); return; }
    setErrors(e => ({ ...e, [slotIdx]: '' }));
    setUploadingSlot(slotIdx);
    try {
      const path = `gallery/${sessionId}/${slotIdx}.${fileExt(file)}`;
      const url = await uploadVenueFile(path, file);
      const newGallery = [...galleryImages];
      newGallery[slotIdx - 1] = url; // slot 1 → index 0 in galleryImages
      onUpdate(newGallery.filter(Boolean));
    } catch {
      setErrors(e => ({ ...e, [slotIdx]: 'Upload failed' }));
    } finally {
      setUploadingSlot(null);
    }
  }

  function removeSlot(slotIdx: number) {
    const newGallery = galleryImages.filter((_, i) => i !== slotIdx - 1);
    onUpdate(newGallery);
  }

  const extraCount = galleryImages.filter(Boolean).length;
  const progressText =
    extraCount === 0 ? 'Your cover photo is set. Add more to bring your place to life.' :
    extraCount <= 2 ? 'Good start — add a few more to fill your gallery.' :
    extraCount <= 5 ? 'Looking great! Your place is coming alive.' :
    extraCount <= 6 ? 'Almost full gallery! 🔥' :
    'Gallery complete. Your place looks incredible.';

  return (
    <div>
      <style>{`@keyframes progScan2 { 0%{left:-45%} 100%{left:100%} }`}</style>
      <input
        ref={inputRef} type="file" accept="image/*"
        style={{ display: 'none' }}
        onChange={e => {
          const f = e.target.files?.[0];
          if (f && pendingSlot != null) handleFile(f, pendingSlot);
        }}
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
        {/* Slot 0: Cover (fixed, not removable) */}
        <div style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden', aspectRatio: '1', background: '#1a1a1a' }}>
          <img src={coverUrl} alt="Cover" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          <div style={{ position: 'absolute', bottom: '6px', left: '6px', background: 'rgba(57,217,138,0.9)', color: '#000', fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '20px' }}>
            Cover
          </div>
        </div>

        {/* Slots 1-7: Additional photos */}
        {Array.from({ length: 7 }, (_, i) => i + 1).map(slotIdx => {
          const imgUrl = galleryImages[slotIdx - 1];
          const isUploading = uploadingSlot === slotIdx;
          return (
            <div key={slotIdx} style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden', aspectRatio: '1', background: '#1a1a1a', border: '1px dashed #333', cursor: imgUrl || isUploading ? 'default' : 'pointer' }}
              onClick={() => {
                if (!imgUrl && !isUploading) {
                  setPendingSlot(slotIdx);
                  setTimeout(() => inputRef.current?.click(), 0);
                }
              }}
            >
              {imgUrl ? (
                <>
                  <img src={imgUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button
                    onClick={e => { e.stopPropagation(); removeSlot(slotIdx); }}
                    style={{ position: 'absolute', top: '6px', right: '6px', width: '24px', height: '24px', borderRadius: '50%', background: 'rgba(0,0,0,0.7)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '14px', lineHeight: 1 }}
                  >
                    <X size={12} color="#fff" />
                  </button>
                </>
              ) : isUploading ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', position: 'relative' }}>
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '3px', background: 'var(--color-border)', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', height: '100%', width: '45%', background: '#39D98A', animation: 'progScan2 1.2s ease-in-out infinite' }} />
                  </div>
                  <div style={{ fontSize: '20px', opacity: 0.4 }}>📷</div>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                  <span style={{ fontSize: '28px', color: '#555' }}>+</span>
                </div>
              )}
              {errors[slotIdx] && (
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(248,113,113,0.15)', display: 'flex', alignItems: 'flex-end', padding: '6px' }}>
                  <span style={{ fontSize: '10px', color: '#F87171' }}>{errors[slotIdx]}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p style={{ fontSize: '13px', color: 'var(--color-muted)', lineHeight: 1.5 }}>{progressText}</p>
    </div>
  );
}

// ─── Video Upload (Step 2) ────────────────────────────────────────────────────

interface VideoUploadProps {
  sessionId: string;
  onUploaded: (url: string) => void;
  currentUrl: string;
}

function VideoUpload({ sessionId, onUploaded, currentUrl }: VideoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');
  const [previewUrl, setPreviewUrl] = useState(currentUrl || '');
  const [fileName, setFileName] = useState('');
  const [fileSize, setFileSize] = useState('');

  async function handleFile(file: File) {
    if (!file.type.startsWith('video/')) { setError('Please select a video file.'); return; }
    if (file.size > 50 * 1024 * 1024) {
      setError('Video must be under 50 MB. Please trim or compress the clip first.');
      return;
    }

    setError('');
    setWarning('');
    const localUrl = URL.createObjectURL(file);
    setPreviewUrl(localUrl);
    setFileName(file.name);
    setFileSize(`${(file.size / 1024 / 1024).toFixed(1)} MB`);

    // Check duration if available
    const vid = document.createElement('video');
    vid.src = localUrl;
    vid.onloadedmetadata = () => {
      if (vid.duration > 90) {
        setWarning('Video is over 90 seconds — consider trimming it to show the best moment. It will still upload.');
      }
    };

    setUploading(true);
    try {
      const path = `videos/${sessionId}/intro.${fileExt(file)}`;
      const url = await uploadVenueFile(path, file);
      onUploaded(url);
    } catch {
      setError('Upload failed. Please try again.');
      setPreviewUrl('');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <style>{`@keyframes progScan3 { 0%{left:-45%} 100%{left:100%} }`}</style>
      <input
        ref={inputRef} type="file" accept="video/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
      />

      {previewUrl ? (
        <div>
          <div style={{ borderRadius: '14px', overflow: 'hidden', position: 'relative', background: '#000', marginBottom: '8px' }}>
            <video
              src={previewUrl} muted controls
              style={{ width: '100%', display: 'block', maxHeight: '240px', objectFit: 'contain' }}
            />
            {!uploading && currentUrl && (
              <div style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(57,217,138,0.9)', color: '#000', fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: '20px' }}>
                Video added ✓
              </div>
            )}
          </div>
          {uploading && (
            <div style={{ height: '3px', background: 'var(--color-border)', borderRadius: '2px', overflow: 'hidden', marginBottom: '8px', position: 'relative' }}>
              <div style={{ position: 'absolute', height: '100%', width: '45%', background: '#39D98A', animation: 'progScan3 1.2s ease-in-out infinite' }} />
            </div>
          )}
          <div style={{ fontSize: '12px', color: 'var(--color-muted)', marginBottom: '6px' }}>
            {fileName} · {fileSize}
          </div>
          {warning && <p style={{ fontSize: '12px', color: '#F5A623', marginBottom: '6px' }}>{warning}</p>}
          {!uploading && (
            <button
              onClick={() => { setPreviewUrl(''); setFileName(''); setFileSize(''); onUploaded(''); }}
              style={{ background: 'none', border: 'none', color: '#F87171', fontSize: '13px', cursor: 'pointer', padding: 0 }}
            >
              Remove video
            </button>
          )}
        </div>
      ) : (
        <div
          onClick={() => inputRef.current?.click()}
          style={{
            minHeight: '140px', borderRadius: '16px',
            border: '1.5px dashed #333', background: '#1a1a1a',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <div style={{ textAlign: 'center', padding: '24px 20px' }}>
            <div style={{ fontSize: '40px', marginBottom: '10px' }}>🎥</div>
            <div style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '14px', color: 'var(--color-text)', marginBottom: '6px' }}>
              Tap to add your place video
            </div>
            <div style={{ fontSize: '12px', color: 'var(--color-muted)' }}>
              MP4 or MOV · Max 50 MB · Up to 90 seconds
            </div>
          </div>
        </div>
      )}

      {error && <p style={{ fontSize: '12px', color: '#F87171', marginTop: '6px' }}>{error}</p>}
    </div>
  );
}

// ─── Form state ───────────────────────────────────────────────────────────────

interface FormData {
  venueName: string;
  venueType: string;
  streetAddress: string;
  suburb: string;
  city: string;
  province: string;
  description: string;
  coverImageUrl: string;
  galleryImages: string[];
  introVideoUrl: string;
  ownerName: string;
  ownerPhone: string;
  ownerEmail: string;
  privacyAgreed: boolean;
}

const DRAFT_KEY = 'kayaa_place_draft';

const empty: FormData = {
  venueName: '', venueType: '', streetAddress: '', suburb: '', city: '',
  province: 'Gauteng', description: '',
  coverImageUrl: '', galleryImages: [], introVideoUrl: '',
  ownerName: '', ownerPhone: '', ownerEmail: '', privacyAgreed: false,
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const { selectedCountry } = useCountry();
  const { user } = useAuth();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  // Two-step category picker state
  const [primaryCat, setPrimaryCat] = useState<PrimaryKey | ''>('');
  const [form, setForm] = useState<FormData>(empty);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData | 'privacy' | 'cover' | 'submit', string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);
  const [finalSlug, setFinalSlug] = useState('');
  const [showQr, setShowQr] = useState(false);
  const qrWrapRef = useRef<HTMLDivElement>(null);
  // Stable session ID for Storage paths across re-renders
  const sessionId = useRef(`s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`);

  // Check for saved draft on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as FormData;
        if (parsed.venueName) setHasDraft(true);
      }
    } catch { /* ignore */ }
  }, []);

  // Auto-save draft on every form change (skip empty form)
  useEffect(() => {
    if (!form.venueName && !form.venueType) return;
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(form)); } catch { /* ignore */ }
    setDraftSaved(true);
    const t = setTimeout(() => setDraftSaved(false), 2000);
    return () => clearTimeout(t);
  }, [form]);

  // Pre-fill contact fields from authenticated user (runs once on sign-in)
  useEffect(() => {
    if (!user) return;
    const name = (user.user_metadata?.full_name || user.user_metadata?.name || '').split(' ')[0];
    setForm(f => ({
      ...f,
      ownerName:  f.ownerName  || name,
      ownerEmail: f.ownerEmail || (user.email ?? ''),
    }));
  }, [user]);

  const displaySlug = toDisplaySlug(form.venueName);
  const qrUrl = `https://kayaa.co.za/checkin/${finalSlug || displaySlug}`;

  function set(key: keyof FormData) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm(f => ({ ...f, [key]: e.target.value }));
      setErrors(er => ({ ...er, [key]: undefined }));
    };
  }

  // ── Step 1 → 2 ────────────────────────────────────────────────────────────
  const goStep2 = useCallback(() => {
    const errs: typeof errors = {};
    if (!form.venueName.trim())                   errs.venueName  = 'Please add your business name';
    else if (form.venueName.trim().length < 3)    errs.venueName  = 'Name must be at least 3 characters';
    else if (/^\d+$/.test(form.venueName.trim())) errs.venueName  = 'Name cannot be numbers only';
    if (!primaryCat)                               errs.venueType  = 'Please tell us what type of business you run';
    else if (!form.venueType) {
      const cat = PRIMARY_CATEGORIES.find(c => c.key === primaryCat);
      if (cat && cat.subtypes.length > 0)          errs.venueType  = 'Please pick the specific type';
      else                                          errs.venueType  = 'Please pick your business type';
    }
    if (!form.ownerPhone.trim())                   errs.ownerPhone = 'Please add your phone number';
    else if (form.ownerPhone.trim().replace(/\D/g, '').length < 9)
                                                   errs.ownerPhone = 'Please enter a valid phone number';
    if (!form.suburb.trim())                       errs.suburb     = 'Please add your neighbourhood or area';
    else if (form.suburb.trim().length < 3)        errs.suburb     = 'Please enter a specific neighbourhood, not just a city';
    if (!form.city.trim())                         errs.city       = 'Please add your city';
    // description, address, cover photo are optional
    if (Object.keys(errs).length) {
      setErrors(errs);
      // Scroll to the first field with an error
      const fieldOrder: (keyof typeof errs)[] = ['venueName', 'venueType', 'ownerPhone', 'suburb', 'city'];
      const firstKey = fieldOrder.find(k => errs[k]);
      if (firstKey) {
        const el = document.querySelector(`[data-field="${firstKey}"]`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }
    setStep(2); window.scrollTo(0, 0);
  }, [form, primaryCat]);

  // ── Step 2 → 3 ────────────────────────────────────────────────────────────
  function goStep3() { setStep(3); window.scrollTo(0, 0); }

  // ── Step 3 → 4 (create venue + owner) ────────────────────────────────────
  async function goStep4() {
    const errs: typeof errors = {};
    if (!form.ownerName.trim())  errs.ownerName  = 'Please add your name';
    // ownerPhone is validated in Step 1 — always present by the time we reach Step 3
    if (!form.privacyAgreed)     errs.privacy    = 'Please agree to continue';
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setSubmitting(true); setErrors({});

    const suburb = form.suburb.trim();
    const city   = form.city.trim();
    const fullAddress = [form.streetAddress.trim(), suburb, city, form.province].filter(Boolean).join(', ');

    // Generate a collision-proof slug at submission time (random 4-char suffix)
    const slug = toSlug(form.venueName);
    setFinalSlug(slug);

    // All gallery images: cover is slot 0, additional slots 1–7
    const allGallery = [form.coverImageUrl, ...form.galleryImages].filter(Boolean);

    // owner_user_id is optional — the form works without authentication.
    // The owner claims their business later via the magic link sent to their email.
    // is_active: true ensures the venue immediately appears in the feed.
    // All feed queries filter on is_active = true so we must set it explicitly.
    const venuePayload = {
      name: form.venueName.trim(),
      type: form.venueType,
      slug,
      location: `${suburb}, ${city}`,
      address: fullAddress,            // fullAddress already contains province e.g. "Berea, Johannesburg, Gauteng"
      description: form.description.trim() || undefined,
      cover_image: form.coverImageUrl || undefined,
      gallery_images: allGallery.length > 0 ? allGallery : undefined,
      intro_video: form.introVideoUrl || undefined,
      // Phone captured in Step 1 — written to venues table so the page shows call/WhatsApp buttons
      phone_number:    form.ownerPhone.trim() || undefined,
      whatsapp_number: form.ownerPhone.trim() || undefined,
      country_code: selectedCountry.code,
      owner_user_id: user?.id || undefined,
      is_active: true,
    };

    // Log exact payload so any failure can be diagnosed in the browser console
    console.log('[Kayaa] Submitting venue payload:', JSON.stringify(venuePayload, null, 2));
    console.log('[Kayaa] Auth user:', user?.id ?? 'anonymous (no session)');

    // First attempt
    const firstAttempt = await createVenue(venuePayload);
    let venueRow = firstAttempt.row;
    let venueErr = firstAttempt.error;

    // Slug collision (extremely rare): auto-retry once with a fresh slug
    if (venueErr?.code === '23505' && venueErr.message?.includes('slug')) {
      const retrySlug = toSlug(form.venueName);
      setFinalSlug(retrySlug);
      const retry = await createVenue({ ...venuePayload, slug: retrySlug });
      venueRow = retry.row;
      venueErr = retry.error;
    }

    if (venueErr || !venueRow) {
      // ── Full diagnostic log — check browser console (F12) for details ─
      console.error('[Kayaa] ❌ Venue creation failed');
      console.error('[Kayaa] Error code    :', venueErr?.code ?? 'none');
      console.error('[Kayaa] Error message :', venueErr?.message ?? 'null row returned (RLS silent block?)');
      console.error('[Kayaa] Full error    :', JSON.stringify(venueErr ?? null));
      console.error('[Kayaa] Payload sent  :', JSON.stringify(venuePayload));

      // ── If null error + null row = silent RLS block ───────────────────
      // Supabase returns PGRST116 when INSERT is blocked by Row Level Security
      // and the policy produces zero rows. Fix: run this SQL in Supabase:
      //
      //   CREATE POLICY "Allow venue registration"
      //   ON public.venues FOR INSERT
      //   TO anon, authenticated
      //   WITH CHECK (true);
      //
      if (!venueErr) {
        console.error('[Kayaa] No error returned but row is null.');
        console.error('[Kayaa] This is almost always a Supabase RLS (Row Level Security) block.');
        console.error('[Kayaa] Run this SQL in Supabase → SQL Editor:');
        console.error(`
  CREATE POLICY "Allow venue registration"
  ON public.venues FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);
        `);
      }

      // ── Map to user-facing message ────────────────────────────────────
      const code    = venueErr?.code ?? '';
      const message = (venueErr?.message ?? '').toLowerCase();
      let msg: string;

      if (!venueErr) {
        // Silent RLS block — no error object, no row
        msg = 'Could not save your business. This is a database permissions issue — please contact Kayaa support. (Error: RLS block)';
      } else if (code === 'PGRST116' || message.includes('0 rows') || message.includes('multiple (or no)')) {
        // PGRST116 = Supabase couldn't return a row — almost always RLS
        msg = 'Could not save your business. Database permissions error (PGRST116). Please contact Kayaa support.';
      } else if (code === '42501' || message.includes('permission denied') || message.includes('rls') || message.includes('policy')) {
        msg = 'Database permission denied. Please contact Kayaa support.';
      } else if (code === '23505') {
        msg = 'A business with this name or link already exists on Kayaa. Try a slightly different name.';
      } else if (code === '23502') {
        // NOT NULL constraint — log which column failed
        console.error('[Kayaa] Missing required column. Check which field is NOT NULL in the venues table.');
        msg = `A required field is missing. Details: ${venueErr.message}`;
      } else if (code === '42703') {
        console.error('[Kayaa] Column does not exist in venues table. Check the payload for wrong column names.');
        msg = `Column not found in database. Details: ${venueErr.message}`;
      } else if (message.includes('failed to fetch') || message.includes('network') || message.includes('networkerror')) {
        msg = 'No internet connection. Check your signal and try again.';
      } else {
        // Show the raw error so it can be diagnosed
        msg = `Submission failed — ${venueErr.message} (code: ${code || 'unknown'})`;
      }

      setErrors({ submit: msg });
      setSubmitting(false);
      return;
    }

    const venueId = venueRow.id;

    const { error: ownerErr } = await createVenueOwner({
      name: form.ownerName.trim(),
      phone: form.ownerPhone.trim(),
      email: form.ownerEmail.trim() || undefined,
      venue_id: venueId,
    });
    // Non-fatal: venue is live even if owner record fails
    if (ownerErr) console.warn('Owner record creation failed:', ownerErr.message);

    localStorage.setItem('kayaa_venue_id', venueId);
    localStorage.setItem('kayaa_pending_email', form.ownerEmail.trim());
    try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }

    geocodeAddress(fullAddress).then(coords => {
      if (coords) updateVenueCoords(venueId, coords.lat, coords.lng).catch(() => {});
    }).catch(() => {});

    if (form.ownerEmail.trim()) signInWithEmail(form.ownerEmail.trim()).catch(() => {});

    setSubmitting(false);
    setStep(4);
    window.scrollTo(0, 0);
  }

  // ── QR download ──────────────────────────────────────────────────────────
  function downloadQR() {
    const canvas = qrWrapRef.current?.querySelector('canvas') as HTMLCanvasElement | null;
    if (!canvas) return;
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = `${finalSlug}-kayaa-qr.png`;
    a.click();
  }

  // ─── Step 4: Live! ─────────────────────────────────────────────────────────
  if (step === 4) {
    const waShareText = encodeURIComponent(
      `${form.venueName} is now on Kayaa. Find us here → https://kayaa.co.za/venue/${finalSlug}`
    );

    return (
      <>
        <style>{`
          @keyframes popIn   { from{transform:scale(0.4);opacity:0} to{transform:scale(1);opacity:1} }
          @keyframes riseUp  { from{transform:translateY(18px);opacity:0} to{transform:translateY(0);opacity:1} }
          .s4-tick { animation: popIn  0.4s cubic-bezier(0.34,1.56,0.64,1) forwards }
          .s4-name { animation: riseUp 0.3s ease 0.28s both }
          .s4-line { animation: riseUp 0.3s ease 0.4s  both }
          .s4-ctas { animation: riseUp 0.3s ease 0.55s both }
        `}</style>

        <div style={{ padding: '48px 20px 100px', textAlign: 'center', maxWidth: '380px', margin: '0 auto' }}>

          {/* ── Big green tick ── */}
          <div className="s4-tick" style={{
            width: '88px', height: '88px', borderRadius: '50%',
            background: '#39D98A', display: 'flex', alignItems: 'center',
            justifyContent: 'center', margin: '0 auto 28px',
          }}>
            <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
              <path d="M10 22L18 30L34 14" stroke="#0D1117" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>

          {/* ── Name ── */}
          <h1 className="s4-name" style={{
            fontFamily: 'Inter, sans-serif', fontWeight: 800, fontSize: '26px',
            color: '#F0F6FC', margin: '0 0 6px', lineHeight: 1.2,
          }}>
            {form.venueName}
          </h1>

          {/* ── One-liner ── */}
          <p className="s4-line" style={{
            fontFamily: 'Inter, sans-serif', fontSize: '16px',
            color: '#39D98A', fontWeight: 600, margin: '0 0 6px',
          }}>
            Your place is live.
          </p>
          <p className="s4-line" style={{
            fontFamily: 'Inter, sans-serif', fontSize: '14px',
            color: 'rgba(255,255,255,0.45)', margin: '0 0 36px', lineHeight: 1.5,
          }}>
            People in {form.suburb || form.city || 'your area'} can find you now.
          </p>

          {/* ── CTAs ── */}
          <div className="s4-ctas" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

            {/* PRIMARY — see your place */}
            <a
              href={`/venue/${finalSlug}`}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: '100%', minHeight: '56px',
                background: '#39D98A', color: '#0D1117',
                borderRadius: '16px', textDecoration: 'none',
                fontFamily: 'Inter, sans-serif', fontWeight: 800, fontSize: '17px',
                boxSizing: 'border-box',
              } as React.CSSProperties}
            >
              See your place
            </a>

            {/* SECONDARY — WhatsApp share */}
            <a
              href={`https://wa.me/?text=${waShareText}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                width: '100%', minHeight: '52px',
                background: 'rgba(37,211,102,0.08)', color: '#25D366',
                border: '1.5px solid rgba(37,211,102,0.3)',
                borderRadius: '16px', textDecoration: 'none',
                fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '15px',
                boxSizing: 'border-box',
              } as React.CSSProperties}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="#25D366">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              Share on WhatsApp
            </a>

            {/* QR code — collapsed by default, tap to reveal */}
            <button
              onClick={() => setShowQr(q => !q)}
              style={{
                background: 'none', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '14px', padding: '14px',
                width: '100%', cursor: 'pointer',
                fontFamily: 'Inter, sans-serif', fontSize: '14px', fontWeight: 600,
                color: 'rgba(255,255,255,0.5)',
              }}
            >
              {showQr ? 'Hide QR code' : '📱 Get your QR code'}
            </button>

            {showQr && (
              <div style={{ background: 'var(--color-surface)', borderRadius: '16px', padding: '20px', textAlign: 'center' }}>
                <div ref={qrWrapRef} onClick={downloadQR} style={{ display: 'inline-block', padding: '14px', borderRadius: '12px', background: '#fff', cursor: 'pointer' }} title="Tap to save">
                  <QRCodeCanvas value={qrUrl} size={160} level="M" marginSize={0} />
                </div>
                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: 'rgba(255,255,255,0.4)', margin: '10px 0 0', lineHeight: 1.5 }}>
                  Print this and put it at your counter.<br />Tap to save.
                </p>
              </div>
            )}

            {/* Add another — small, quiet */}
            <button
              onClick={() => { setForm(empty); setStep(1); window.scrollTo(0, 0); try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ } }}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontFamily: 'Inter, sans-serif', fontSize: '13px',
                color: 'rgba(255,255,255,0.3)', padding: '8px 0',
              }}
            >
              Add another business
            </button>

            {/* Email notice — small, below the fold, only if provided */}
            {form.ownerEmail && (
              <p style={{
                fontFamily: 'Inter, sans-serif', fontSize: '12px',
                color: 'rgba(255,255,255,0.28)', lineHeight: 1.5, margin: '4px 0 0',
              }}>
                We sent a sign-in link to {form.ownerEmail}
              </p>
            )}
          </div>
        </div>
      </>
    );
  }

  // ─── Step 3: About you ─────────────────────────────────────────────────────
  if (step === 3) {
    return (
      <div style={{ padding: '20px 16px 100px' }}>
        <style>{`@keyframes obSpin { to { transform: rotate(360deg); } }`}</style>
        <StepIndicator current={3} />
        <h1 style={{ fontFamily: 'Inter, sans-serif', fontWeight: 800, fontSize: '26px', marginBottom: '6px', color: 'var(--color-text)' }}>
          Last step
        </h1>
        <p style={{ fontSize: '15px', color: 'var(--color-muted)', marginBottom: '28px', lineHeight: 1.5 }}>
          Who runs <span style={{ color: 'var(--color-text)', fontWeight: 700 }}>{form.venueName}</span>?
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginBottom: '28px' }}>

          {/* Owner name */}
          <div>
            <label style={labelStyle}>Your name</label>
            <p style={hintStyle}>The name people know you by.</p>
            <input
              type="text" value={form.ownerName}
              onChange={set('ownerName')}
              placeholder="e.g. Sipho, Mama Thembi"
              autoComplete="given-name"
              style={{ ...inputStyle, border: `1px solid ${errors.ownerName ? '#F87171' : 'var(--color-border)'}` }}
            />
            <p style={errorStyle(!!errors.ownerName)}>{errors.ownerName}</p>
          </div>

          {/* Phone — read-only display of what was entered in Step 1 */}
          <div style={{
            background: 'rgba(57,217,138,0.06)',
            border: '1px solid rgba(57,217,138,0.2)',
            borderRadius: '14px', padding: '14px 16px',
          }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#39D98A', marginBottom: '3px' }}>
              ✓ Phone number saved
            </div>
            <div style={{ fontSize: '15px', color: 'var(--color-text)', fontFamily: 'Inter, sans-serif' }}>
              {form.ownerPhone}
            </div>
            <button
              onClick={() => { setStep(1); window.scrollTo(0, 0); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', color: 'var(--color-muted)', padding: '4px 0 0', fontFamily: 'Inter, sans-serif' }}
            >
              Change phone number
            </button>
          </div>

          {/* Email */}
          <div>
            <label style={labelStyle}>
              Email address{' '}
              <span style={{ fontSize: '13px', fontWeight: 400, color: 'var(--color-muted)' }}>(optional)</span>
            </label>
            <p style={hintStyle}>For account recovery and updates. We won't spam you.</p>
            <input
              type="email" value={form.ownerEmail}
              onChange={set('ownerEmail')}
              placeholder="you@example.com"
              autoComplete="email"
              style={{ ...inputStyle, border: '1px solid var(--color-border)' }}
            />
          </div>

          {/* POPIA notice */}
          <div style={{
            background: 'rgba(57,217,138,0.05)',
            border: '1px solid rgba(57,217,138,0.2)',
            borderRadius: '14px', padding: '14px 16px',
            display: 'flex', gap: '10px', alignItems: 'flex-start',
          }}>
            <Shield size={16} color="var(--color-accent)" style={{ marginTop: '1px', flexShrink: 0 }} />
            <p style={{ fontSize: '13px', color: 'var(--color-muted)', lineHeight: 1.55, margin: 0 }}>
              Your information is protected under{' '}
              <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>POPIA</span>{' '}
              and never shared without your consent.
            </p>
          </div>

          {/* Agree toggle */}
          <div style={{
            background: 'var(--color-surface)',
            border: `1px solid ${errors.privacy ? '#F87171' : 'var(--color-border)'}`,
            borderRadius: '14px', padding: '16px',
            display: 'flex', gap: '12px', alignItems: 'center',
          }}>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-text)', margin: '0 0 3px' }}>
                I agree to the Kayaa terms
              </p>
              <p style={{ fontSize: '13px', color: 'var(--color-muted)', margin: 0 }}>
                You're in control of your place data, always.
              </p>
            </div>
            <ToggleSwitch
              checked={form.privacyAgreed}
              onChange={v => { setForm(f => ({ ...f, privacyAgreed: v })); setErrors(er => ({ ...er, privacy: undefined })); }}
            />
          </div>
          {errors.privacy && (
            <p style={{ fontSize: '13px', color: '#F87171', marginTop: '-16px' }}>{errors.privacy}</p>
          )}
        </div>

        {errors.submit && (
          <p style={{ fontSize: '13px', color: '#F87171', marginBottom: '16px', textAlign: 'center', lineHeight: 1.5 }}>
            {errors.submit}
          </p>
        )}

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => { setStep(2); window.scrollTo(0, 0); }}
            disabled={submitting}
            style={{
              width: '52px', height: '52px', borderRadius: '14px', flexShrink: 0,
              background: 'var(--color-surface)', border: '1px solid var(--color-border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: submitting ? 'default' : 'pointer',
            }}
          >
            <ArrowLeft size={18} color="var(--color-text)" />
          </button>
          <button
            onClick={goStep4}
            disabled={submitting}
            style={{
              flex: 1, minHeight: '56px',
              background: submitting ? 'rgba(57,217,138,0.6)' : 'var(--color-accent)',
              color: '#000', border: 'none', borderRadius: '14px',
              fontFamily: 'Inter, sans-serif', fontWeight: 800, fontSize: '17px',
              cursor: submitting ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            }}
          >
            {submitting ? (
              <>
                <span style={{
                  width: '16px', height: '16px', borderRadius: '50%',
                  border: '2px solid rgba(0,0,0,0.3)', borderTopColor: '#000',
                  display: 'inline-block', animation: 'obSpin 0.7s linear infinite',
                }} />
                Creating your page…
              </>
            ) : (
              'Add my business →'
            )}
          </button>
        </div>
      </div>
    );
  }

  // ─── Step 2: Show your place (media + description) ────────────────────────
  if (step === 2) {
    return (
      <div style={{ padding: '20px 16px 100px' }}>
        <StepIndicator current={2} />
        <h1 style={{ fontFamily: 'Inter, sans-serif', fontWeight: 800, fontSize: '26px', marginBottom: '6px', color: 'var(--color-text)' }}>
          Show your place
        </h1>
        <p style={{ fontSize: '15px', color: 'var(--color-muted)', marginBottom: '28px', lineHeight: 1.5 }}>
          All of this is optional. Add what you have — you can update everything later.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', marginBottom: '28px' }}>

          {/* Description — moved from Step 1 */}
          <div>
            <label style={labelStyle}>
              Describe your business{' '}
              <span style={{ fontSize: '13px', fontWeight: 400, color: 'var(--color-muted)' }}>(optional)</span>
            </label>
            <p style={hintStyle}>
              What makes your place special? Keep it short and honest.
            </p>
            <textarea
              value={form.description}
              onChange={set('description')}
              placeholder="e.g. Best fades in Soweto. Open 7 days. Quick cuts, no appointment needed."
              maxLength={200}
              style={{ ...inputStyle, minHeight: '90px', resize: 'vertical', lineHeight: 1.55 }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
              <span style={{ fontSize: '11px', color: 'var(--color-muted)' }}>{form.description.length}/200</span>
            </div>
          </div>

          {/* Street address — moved from Step 1 */}
          <div>
            <label style={labelStyle}>
              Exact address or location{' '}
              <span style={{ fontSize: '13px', fontWeight: 400, color: 'var(--color-muted)' }}>(optional)</span>
            </label>
            <p style={hintStyle}>
              Street name, landmark, or just describe where to find you.
            </p>
            <input
              type="text"
              value={form.streetAddress}
              onChange={set('streetAddress')}
              placeholder="e.g. Next to the taxi rank, Corner of Claim and Lily"
              autoComplete="street-address"
              style={{ ...inputStyle, border: '1px solid var(--color-border)' }}
            />
          </div>

          {/* Gallery */}
          <div>
            <label style={labelStyle}>
              More photos{' '}
              <span style={{ fontSize: '13px', fontWeight: 400, color: 'var(--color-muted)' }}>(optional)</span>
            </label>
            <p style={hintStyle}>
              The inside, the chairs, the energy. More photos help people feel your place.
            </p>
            <GalleryUpload
              sessionId={sessionId.current}
              coverUrl={form.coverImageUrl}
              galleryImages={form.galleryImages}
              onUpdate={imgs => setForm(f => ({ ...f, galleryImages: imgs }))}
            />
          </div>

          {/* Video */}
          <div>
            <label style={labelStyle}>
              Short video{' '}
              <span style={{ fontSize: '13px', fontWeight: 400, color: 'var(--color-muted)' }}>(optional)</span>
            </label>
            <p style={hintStyle}>
              15–60 seconds. Show the chairs. Play the music. Let people feel the energy.
            </p>
            <VideoUpload
              sessionId={sessionId.current}
              currentUrl={form.introVideoUrl}
              onUploaded={url => setForm(f => ({ ...f, introVideoUrl: url }))}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => { setStep(1); window.scrollTo(0, 0); }}
            style={{
              width: '52px', height: '52px', borderRadius: '14px', flexShrink: 0,
              background: 'var(--color-surface)', border: '1px solid var(--color-border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
            }}
          >
            <ArrowLeft size={18} color="var(--color-text)" />
          </button>
          <button
            onClick={goStep3}
            style={{
              flex: 1, minHeight: '56px',
              background: 'var(--color-accent)', color: '#000',
              border: 'none', borderRadius: '14px',
              fontFamily: 'Inter, sans-serif', fontWeight: 800, fontSize: '17px',
              cursor: 'pointer',
            }}
          >
            Continue →
          </button>
        </div>
      </div>
    );
  }

  // ─── Step 1: Your venue ─────────────────────────────────────────────────────
  return (
    <div style={{ padding: '20px 16px 100px' }}>
      <StepIndicator current={1} />

      <h1 style={{ fontFamily: 'Inter, sans-serif', fontWeight: 800, fontSize: '26px', marginBottom: '6px', color: 'var(--color-text)' }}>
        Add your business
      </h1>
      <p style={{ fontSize: '15px', color: 'var(--color-muted)', marginBottom: '24px', lineHeight: 1.5 }}>
        Free. Takes 2 minutes.
      </p>

      {/* Draft resume banner */}
      {hasDraft && (
        <div style={{
          background: 'rgba(57,217,138,0.07)', border: '1px solid rgba(57,217,138,0.25)',
          borderRadius: '12px', padding: '14px 16px', marginBottom: '24px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px',
        }}>
          <div>
            <div style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '14px', color: 'var(--color-accent)' }}>
              You have a saved draft
            </div>
            <div style={{ fontSize: '13px', color: 'var(--color-muted)', marginTop: '2px' }}>
              Continue where you left off?
            </div>
          </div>
          <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
            <button
              onClick={() => {
                try {
                  const raw = localStorage.getItem(DRAFT_KEY);
                  if (raw) {
                    const parsed = JSON.parse(raw) as FormData;
                    setForm(parsed);
                    if (parsed.venueType) {
                      const pk = getPrimaryCategory(parsed.venueType) as PrimaryKey;
                      setPrimaryCat(pk);
                    }
                  }
                } catch { /* ignore */ }
                setHasDraft(false);
              }}
              style={{
                background: 'var(--color-accent)', color: '#000',
                border: 'none', borderRadius: '8px', padding: '8px 14px',
                fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '13px', cursor: 'pointer',
              }}
            >
              Resume
            </button>
            <button
              onClick={() => { try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ } setHasDraft(false); }}
              style={{
                background: 'none', border: '1px solid var(--color-border)',
                borderRadius: '8px', padding: '8px 12px',
                fontFamily: 'Inter, sans-serif', fontSize: '13px', color: 'var(--color-muted)', cursor: 'pointer',
              }}
            >
              Discard
            </button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', marginBottom: '32px' }}>

        {/* 1. Business name */}
        <div data-field="venueName">
          <label style={labelStyle}>Business name</label>
          <p style={hintStyle}>The name people know you by.</p>
          <input
            type="text" value={form.venueName} onChange={set('venueName')}
            placeholder="e.g. Sipho's Cuts, Mama Thembi's Kitchen, Corner Spaza"
            autoComplete="organization"
            style={{ ...inputStyle, border: `1px solid ${errors.venueName ? '#F87171' : 'var(--color-border)'}` }}
          />
          <p style={errorStyle(!!errors.venueName)}>{errors.venueName}</p>
        </div>

        {/* 2. What do you do? */}
        <div data-field="venueType">
          <label style={labelStyle}>What do you do?</label>
          <p style={hintStyle}>Pick the closest type for your business.</p>

          <PrimaryCategoryGrid
            selected={primaryCat}
            onSelect={key => {
              setPrimaryCat(key);
              const cat = PRIMARY_CATEGORIES.find(c => c.key === key)!;
              if (cat.subtypes.length === 0 && key !== 'other') {
                setForm(f => ({ ...f, venueType: cat.label }));
              } else {
                setForm(f => ({ ...f, venueType: '' }));
              }
              setErrors(er => ({ ...er, venueType: undefined }));
            }}
          />

          {/* Subtype chips */}
          {primaryCat && primaryCat !== 'other' && (() => {
            const cat = PRIMARY_CATEGORIES.find(c => c.key === primaryCat)!;
            if (cat.subtypes.length === 0) return null;
            return (
              <div style={{ marginTop: '4px' }}>
                <p style={{ fontSize: '13px', color: 'var(--color-muted)', margin: '10px 0 0' }}>
                  Which type fits best?
                </p>
                <SubtypeChips
                  subtypes={cat.subtypes}
                  selected={form.venueType}
                  onSelect={sub => {
                    setForm(f => ({ ...f, venueType: sub }));
                    setErrors(er => ({ ...er, venueType: undefined }));
                  }}
                />
              </div>
            );
          })()}

          {/* Free text for "Other" */}
          {primaryCat === 'other' && (
            <div style={{ marginTop: '12px' }}>
              <input
                type="text"
                value={form.venueType}
                onChange={e => { setForm(f => ({ ...f, venueType: e.target.value })); setErrors(er => ({ ...er, venueType: undefined })); }}
                placeholder="e.g. Driving School, Music Studio, Photography Studio…"
                style={{ ...inputStyle, border: `1px solid ${errors.venueType ? '#F87171' : 'var(--color-border)'}` }}
              />
            </div>
          )}

          <p style={errorStyle(!!errors.venueType)}>{errors.venueType}</p>
        </div>

        {/* 3. Phone number — moved to Step 1 so it lands in venues.phone_number */}
        <div data-field="ownerPhone">
          <label style={labelStyle}>Your phone number</label>
          <p style={hintStyle}>
            So customers can call or WhatsApp you directly. We'll show it on your business page.
          </p>
          <input
            type="tel" value={form.ownerPhone} onChange={set('ownerPhone')}
            placeholder="e.g. 082 123 4567"
            autoComplete="tel"
            style={{ ...inputStyle, border: `1px solid ${errors.ownerPhone ? '#F87171' : 'var(--color-border)'}` }}
          />
          <p style={errorStyle(!!errors.ownerPhone)}>{errors.ownerPhone}</p>
        </div>

        {/* 4. Where are you based? — stacked (not side by side) for readability */}
        <div>
          <label style={labelStyle}>Where are you based?</label>
          <p style={hintStyle}>Your neighbourhood, then your city.</p>

          <div data-field="suburb" style={{ marginBottom: '10px' }}>
            <input
              type="text" value={form.suburb} onChange={set('suburb')}
              placeholder="Neighbourhood — e.g. Berea, Orlando West, Alex"
              style={{ ...inputStyle, border: `1px solid ${errors.suburb ? '#F87171' : 'var(--color-border)'}` }}
            />
            <p style={errorStyle(!!errors.suburb)}>{errors.suburb}</p>
          </div>

          <div data-field="city">
            <input
              type="text" value={form.city} onChange={set('city')}
              placeholder="City — e.g. Johannesburg"
              list="city-options"
              style={{ ...inputStyle, border: `1px solid ${errors.city ? '#F87171' : 'var(--color-border)'}` }}
            />
            <datalist id="city-options">
              {selectedCountry.launch_cities.map(c => <option key={c} value={c} />)}
            </datalist>
            <p style={errorStyle(!!errors.city)}>{errors.city}</p>
          </div>
        </div>

        {/* 5. Photo — clearly optional, non-blocking */}
        <div>
          <label style={labelStyle}>
            Add a photo{' '}
            <span style={{ fontSize: '13px', fontWeight: 400, color: 'var(--color-muted)' }}>(optional)</span>
          </label>
          <p style={hintStyle}>
            Any photo works — we'll make it smaller for faster loading. You can add more photos later.
          </p>
          <CoverPhotoUpload
            sessionId={sessionId.current}
            currentUrl={form.coverImageUrl}
            onUploaded={url => {
              setForm(f => ({ ...f, coverImageUrl: url }));
              setErrors(er => ({ ...er, cover: undefined }));
            }}
          />
          {/* No-photo fallback hint */}
          {!form.coverImageUrl && (
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.28)', marginTop: '8px', lineHeight: 1.5 }}>
              No photo yet? No problem — your page will still look good.
            </p>
          )}
        </div>
      </div>

      {/* Continue button */}
      <button
        onClick={goStep2}
        style={{
          width: '100%', minHeight: '56px',
          background: 'var(--color-accent)', color: '#000',
          border: 'none', borderRadius: '14px',
          fontFamily: 'Inter, sans-serif', fontWeight: 800, fontSize: '17px',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
        }}
      >
        Continue
        {draftSaved && (
          <span style={{ fontSize: '11px', fontWeight: 400, color: 'rgba(0,0,0,0.55)' }}>Draft saved ✓</span>
        )}
      </button>

      {/* Quiet help fallback */}
      <p style={{
        fontFamily: 'Inter, sans-serif', fontSize: '12px',
        color: 'rgba(255,255,255,0.25)', textAlign: 'center',
        marginTop: '16px', lineHeight: 1.5,
      }}>
        Need help? WhatsApp us at{' '}
        <a
          href="https://wa.me/27000000000?text=Hi%2C+I+need+help+adding+my+business+to+Kayaa"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'underline' }}
        >
          send us a message
        </a>
        .
      </p>
    </div>
  );
}
