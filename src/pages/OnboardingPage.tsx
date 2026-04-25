import { useState, useRef, useCallback } from 'react';
// react-router-dom not needed after magic-link auth — no navigate calls remain
import { ArrowLeft, Shield, X } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { createVenue, createVenueOwner, updateVenueCoords, uploadVenueFile } from '../lib/api';
import { signInWithEmail } from '../lib/auth';
import { geocodeAddress } from '../lib/geocode';
import { useCountry } from '../contexts/CountryContext';

// ─── Data ─────────────────────────────────────────────────────────────────────

const SA_PROVINCES = [
  'Gauteng', 'Western Cape', 'KwaZulu-Natal', 'Eastern Cape',
  'Limpopo', 'Mpumalanga', 'North West', 'Free State', 'Northern Cape',
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 14)
    .replace(/-+$/, '');
}

function fileExt(file: File): string {
  const parts = file.name.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : 'jpg';
}

// ─── Shared components ────────────────────────────────────────────────────────

function StepIndicator({ current }: { current: 1 | 2 | 3 | 4 }) {
  const labels = ['Your place', 'Media', 'About you', "You're live"];
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

function VenueTypeGrid({ selected, onSelect, items }: {
  selected: string; onSelect: (label: string) => void;
  items: { emoji: string; label: string }[];
}) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
      {items.map(({ emoji, label }) => {
        const isSelected = selected === label;
        return (
          <button key={label} onClick={() => onSelect(label)} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', gap: '6px', padding: '14px 8px',
            borderRadius: '14px',
            background: isSelected ? 'rgba(57,217,138,0.08)' : 'var(--color-surface)',
            border: `1.5px solid ${isSelected ? 'var(--color-accent)' : 'var(--color-border)'}`,
            cursor: 'pointer', transition: 'all 0.15s', minHeight: '80px',
          }}>
            <span style={{ fontSize: '26px', lineHeight: 1 }}>{emoji}</span>
            <span style={{
              fontSize: '11px', fontWeight: 600, textAlign: 'center', lineHeight: 1.2,
              color: isSelected ? 'var(--color-accent)' : 'var(--color-muted)',
              transition: 'color 0.15s',
            }}>{label}</span>
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
  padding: '15px 16px', color: 'var(--color-text)', fontSize: '15px',
  fontFamily: 'DM Sans, sans-serif', outline: 'none',
  boxSizing: 'border-box', minHeight: '52px',
};

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '13px', fontWeight: 600,
  color: 'var(--color-muted)', marginBottom: '8px',
};

function errorStyle(show: boolean): React.CSSProperties {
  return { fontSize: '12px', color: '#F87171', marginTop: '5px', minHeight: '16px', visibility: show ? 'visible' : 'hidden' };
}

// ─── Cover Photo Upload ───────────────────────────────────────────────────────

interface CoverPhotoUploadProps {
  sessionId: string;
  onUploaded: (url: string) => void;
  currentUrl: string;
}

function CoverPhotoUpload({ sessionId, onUploaded, currentUrl }: CoverPhotoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<string>(currentUrl || '');

  async function handleFile(file: File) {
    if (!file.type.startsWith('image/')) { setError('Please select an image file.'); return; }
    if (file.size > 10 * 1024 * 1024) { setError('File too large. Maximum 10MB.'); return; }

    setError('');
    setUploading(true);
    setPreview(URL.createObjectURL(file)); // show local preview immediately

    try {
      const path = `covers/${sessionId}/cover.${fileExt(file)}`;
      const url = await uploadVenueFile(path, file);
      onUploaded(url);
    } catch {
      setError('Upload failed. Tap to try again.');
      setPreview('');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <style>{`@keyframes progScan { 0%{left:-45%} 100%{left:100%} }`}</style>
      <input
        ref={inputRef} type="file" accept="image/*"
        style={{ display: 'none' }}
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
      />

      <div
        onClick={() => inputRef.current?.click()}
        style={{
          minHeight: '200px', borderRadius: '16px', overflow: 'hidden',
          border: `1.5px dashed ${error ? '#F87171' : preview ? '#39D98A' : '#333'}`,
          background: preview ? 'transparent' : '#1a1a1a',
          position: 'relative', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        {preview ? (
          <>
            <img src={preview} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 60%)' }} />
            <div style={{
              position: 'absolute', bottom: '12px', left: '12px',
              background: 'rgba(57,217,138,0.9)', color: '#000',
              fontSize: '11px', fontWeight: 700, padding: '4px 10px',
              borderRadius: '20px', fontFamily: 'Syne, sans-serif',
            }}>
              Cover photo ✓
            </div>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '32px 20px' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>📷</div>
            <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '15px', color: 'var(--color-text)', marginBottom: '6px' }}>
              Tap to add your place photo
            </div>
            <div style={{ fontSize: '12px', color: 'var(--color-muted)' }}>
              JPG, PNG or HEIC · Max 10MB
            </div>
          </div>
        )}
      </div>

      {/* Progress bar */}
      {uploading && (
        <div style={{ height: '3px', background: 'var(--color-border)', borderRadius: '2px', overflow: 'hidden', marginTop: '4px', position: 'relative' }}>
          <div style={{
            position: 'absolute', top: 0, height: '100%', width: '45%',
            background: '#39D98A', borderRadius: '2px',
            animation: 'progScan 1.2s ease-in-out infinite',
          }} />
        </div>
      )}

      {/* Change link after upload */}
      {preview && !uploading && (
        <button
          onClick={e => { e.stopPropagation(); inputRef.current?.click(); }}
          style={{ background: 'none', border: 'none', color: 'var(--color-accent)', fontSize: '13px', cursor: 'pointer', marginTop: '8px', padding: 0 }}
        >
          Change photo
        </button>
      )}

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
    if (file.size > 100 * 1024 * 1024) {
      setError('This video is too large. Please use a shorter clip or compress it first.');
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
      if (vid.duration > 60) {
        setWarning('This video is longer than 60 seconds. It will still upload but consider trimming it.');
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
        capture="user"
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
            <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '14px', color: 'var(--color-text)', marginBottom: '6px' }}>
              Tap to add your place video
            </div>
            <div style={{ fontSize: '12px', color: 'var(--color-muted)' }}>
              MP4 or MOV · Max 100MB · Up to 60 seconds
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

const empty: FormData = {
  venueName: '', venueType: '', streetAddress: '', suburb: '', city: '',
  province: 'Gauteng', description: '',
  coverImageUrl: '', galleryImages: [], introVideoUrl: '',
  ownerName: '', ownerPhone: '', ownerEmail: '', privacyAgreed: false,
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const { selectedCountry, categoryLabels, callingCode } = useCountry();
  const venueTypeItems = [
    ...categoryLabels.map(c => ({ emoji: c.emoji, label: c.label })),
    { emoji: '➕', label: 'Other' },
  ];
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [form, setForm] = useState<FormData>(empty);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData | 'privacy' | 'cover' | 'submit', string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const qrWrapRef = useRef<HTMLDivElement>(null);
  // Stable session ID for Storage paths across re-renders
  const sessionId = useRef(`s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`);

  const slug = toSlug(form.venueName);
  const qrUrl = `https://kayaa.co.za/checkin/${slug}`;

  function set(key: keyof FormData) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm(f => ({ ...f, [key]: e.target.value }));
      setErrors(er => ({ ...er, [key]: undefined }));
    };
  }

  // ── Step 1 → 2 ────────────────────────────────────────────────────────────
  const goStep2 = useCallback(() => {
    const errs: typeof errors = {};
    if (!form.venueName.trim())                   errs.venueName   = 'Give your place a name';
    else if (form.venueName.trim().length < 3)    errs.venueName   = 'Name must be at least 3 characters';
    else if (/^\d+$/.test(form.venueName.trim())) errs.venueName   = 'Name cannot be numbers only';
    if (!form.venueType)                          errs.venueType   = 'Pick a type for your place';
    if (!form.suburb.trim())                      errs.suburb      = 'Add the suburb your place is in';
    else if (form.suburb.trim().length < 3)       errs.suburb      = 'Enter a specific suburb, not just a city';
    if (!form.city.trim())                        errs.city        = 'Add the city';
    if (!form.description.trim())                 errs.description = 'Add a short description of your place';
    else if (form.description.trim().length < 20) errs.description = 'Description must be at least 20 characters';
    if (!form.coverImageUrl)                      errs.cover       = 'Please add a photo of your place to continue.';
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setStep(2); window.scrollTo(0, 0);
  }, [form]);

  // ── Step 2 → 3 ────────────────────────────────────────────────────────────
  function goStep3() { setStep(3); window.scrollTo(0, 0); }

  // ── Step 3 → 4 (create venue + owner) ────────────────────────────────────
  async function goStep4() {
    const errs: typeof errors = {};
    if (!form.ownerName.trim())  errs.ownerName  = "We need your name";
    if (!form.ownerEmail.trim()) errs.ownerEmail = 'Add your email so you can sign in';
    if (!form.privacyAgreed)     errs.privacy    = 'Please agree to continue';
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setSubmitting(true); setErrors({});

    const suburb = form.suburb.trim();
    const city   = form.city.trim();
    const fullAddress = [form.streetAddress.trim(), suburb, city, form.province].filter(Boolean).join(', ');

    // All gallery images: cover is slot 0, additional slots 1–7
    const allGallery = [form.coverImageUrl, ...form.galleryImages].filter(Boolean);

    const { row: venueRow, error: venueErr } = await createVenue({
      name: form.venueName.trim(),
      type: form.venueType,
      slug,
      location: `${suburb}, ${city}`,
      address: fullAddress,
      province: form.province,
      description: form.description.trim() || undefined,
      cover_image: form.coverImageUrl || undefined,
      gallery_images: allGallery.length > 0 ? allGallery : undefined,
      intro_video: form.introVideoUrl || undefined,
      country_code: selectedCountry.code,
    });

    if (venueErr || !venueRow) {
      setErrors({ submit: 'Could not create your place. Please try again.' });
      setSubmitting(false);
      return;
    }

    const { error: ownerErr } = await createVenueOwner({
      name: form.ownerName.trim(),
      phone: form.ownerPhone.trim(),
      email: form.ownerEmail.trim() || undefined,
      venue_id: venueRow.id,
    });
    if (ownerErr) console.error('Owner creation failed:', ownerErr);

    localStorage.setItem('kayaa_venue_id', venueRow.id);
    localStorage.setItem('kayaa_pending_email', form.ownerEmail.trim());

    geocodeAddress(fullAddress).then(coords => {
      if (coords) updateVenueCoords(venueRow.id, coords.lat, coords.lng).catch(() => {});
    }).catch(() => {});

    signInWithEmail(form.ownerEmail.trim()).catch(() => {});

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
    a.download = `${slug}-kayaa-qr.png`;
    a.click();
  }

  // ─── Step 4: Live! ─────────────────────────────────────────────────────────
  if (step === 4) {
    return (
      <>
        <style>{`
          @keyframes scaleIn { from{transform:scale(0.3);opacity:0} to{transform:scale(1);opacity:1} }
          @keyframes fadeUp  { from{transform:translateY(14px);opacity:0} to{transform:translateY(0);opacity:1} }
          .ob-icon{animation:scaleIn 0.45s cubic-bezier(0.34,1.56,0.64,1) forwards}
          .ob-h1  {animation:fadeUp 0.35s ease 0.3s both}
          .ob-sub {animation:fadeUp 0.35s ease 0.45s both}
          .ob-slug{animation:fadeUp 0.35s ease 0.55s both}
          .ob-qr  {animation:fadeUp 0.35s ease 0.65s both}
          .ob-cta {animation:fadeUp 0.35s ease 0.8s both}
        `}</style>
        <div style={{ padding: '24px 16px 100px', textAlign: 'center' }}>
          <StepIndicator current={4} />
          <div className="ob-icon" style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(57,217,138,0.12)', border: '2px solid var(--color-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: '36px' }}>✓</div>
          <h1 className="ob-h1" style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '30px', color: 'var(--color-text)', marginBottom: '8px' }}>You're live.</h1>
          <p className="ob-sub" style={{ fontSize: '16px', color: 'var(--color-muted)', marginBottom: '4px' }}>
            <span style={{ color: 'var(--color-accent)', fontWeight: 700 }}>{form.venueName}</span>{' '}is now on Kayaa.
          </p>
          <div className="ob-slug" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '10px', padding: '8px 14px', marginBottom: '28px' }}>
            <span style={{ fontSize: '12px', color: 'var(--color-muted)' }}>kayaa.co.za/</span>
            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-accent)', fontFamily: 'DM Sans, sans-serif' }}>{slug}</span>
          </div>
          <div className="ob-qr" style={{ marginBottom: '28px' }}>
            <div ref={qrWrapRef} onClick={downloadQR} style={{ display: 'inline-block', padding: '16px', borderRadius: '16px', background: '#fff', cursor: 'pointer', boxShadow: '0 4px 24px rgba(0,0,0,0.3)' }} title="Tap to download">
              <QRCodeCanvas value={qrUrl} size={180} level="M" marginSize={0} />
            </div>
            <p style={{ fontSize: '12px', color: 'var(--color-muted)', marginTop: '10px' }}>Print this and put it on your counter, mirror, or door</p>
            <p style={{ fontSize: '11px', color: 'var(--color-accent)', marginTop: '4px' }}>Tap the QR code to download</p>
          </div>
          <div className="ob-cta">
            {/* Magic link was sent in goStep4 — guide owner to check email */}
            <div style={{ background: 'rgba(57,217,138,0.08)', border: '1px solid rgba(57,217,138,0.25)', borderRadius: '16px', padding: '18px 16px', marginBottom: '16px', textAlign: 'center' }}>
              <div style={{ fontSize: '28px', marginBottom: '10px' }}>✉️</div>
              <p style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '15px', color: 'var(--color-text)', margin: '0 0 6px' }}>
                Check your email to access your dashboard
              </p>
              <p style={{ fontSize: '13px', color: 'var(--color-muted)', margin: 0, lineHeight: 1.6 }}>
                We sent a sign-in link to <strong style={{ color: 'var(--color-text)' }}>{form.ownerEmail}</strong>.
                Tap the link in that email to sign in.
              </p>
            </div>
            <a
              href="https://mail.google.com"
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', minHeight: '52px', background: 'var(--color-accent)', color: '#000', border: 'none', borderRadius: '14px', fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '16px', cursor: 'pointer', textDecoration: 'none', boxSizing: 'border-box' } as React.CSSProperties}
            >
              Open Gmail
            </a>
          </div>
        </div>
      </>
    );
  }

  // ─── Step 3: About you ─────────────────────────────────────────────────────
  if (step === 3) {
    return (
      <div style={{ padding: '16px 16px 100px' }}>
        <style>{`@keyframes obSpin { to { transform: rotate(360deg); } }`}</style>
        <StepIndicator current={3} />
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '24px', marginBottom: '6px' }}>Now about you</h1>
        <p style={{ fontSize: '14px', color: 'var(--color-muted)', marginBottom: '28px' }}>
          So we know who to talk to when{' '}
          <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>{form.venueName}</span>{' '}goes live.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', marginBottom: '24px' }}>
          <div>
            <label style={labelStyle}>Your name</label>
            <input type="text" value={form.ownerName} onChange={set('ownerName')} placeholder="What do people call you?" autoComplete="given-name"
              style={{ ...inputStyle, border: `1px solid ${errors.ownerName ? '#F87171' : 'var(--color-border)'}` }} />
            <p style={errorStyle(!!errors.ownerName)}>{errors.ownerName}</p>
          </div>
          <div>
            <label style={labelStyle}>Your WhatsApp number</label>
            <input type="tel" value={form.ownerPhone} onChange={set('ownerPhone')} placeholder={`+${callingCode} 71 000 0000`} autoComplete="tel"
              style={{ ...inputStyle, border: '1px solid var(--color-border)' }} />
          </div>
          <div>
            <label style={labelStyle}>Your email address</label>
            <input type="email" value={form.ownerEmail} onChange={set('ownerEmail')} placeholder="you@example.com" autoComplete="email"
              style={{ ...inputStyle, border: `1px solid ${errors.ownerEmail ? '#F87171' : 'var(--color-border)'}` }} />
            <p style={errorStyle(!!errors.ownerEmail)}>{errors.ownerEmail}</p>
          </div>

          <div style={{ background: 'rgba(57,217,138,0.05)', border: '1px solid rgba(57,217,138,0.2)', borderRadius: '14px', padding: '14px 16px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
            <Shield size={16} color="var(--color-accent)" style={{ marginTop: '1px', flexShrink: 0 }} />
            <p style={{ fontSize: '13px', color: 'var(--color-muted)', lineHeight: 1.55, margin: 0 }}>
              Your information is protected under <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>POPIA</span>{' '}and never shared without your consent.
            </p>
          </div>

          <div style={{ background: 'var(--color-surface)', border: `1px solid ${errors.privacy ? '#F87171' : 'var(--color-border)'}`, borderRadius: '14px', padding: '14px 16px', display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text)', marginBottom: '2px' }}>I agree to the Kayaa terms</p>
              <p style={{ fontSize: '12px', color: 'var(--color-muted)' }}>You're in control of your place data, always.</p>
            </div>
            <ToggleSwitch checked={form.privacyAgreed} onChange={v => { setForm(f => ({ ...f, privacyAgreed: v })); setErrors(er => ({ ...er, privacy: undefined })); }} />
          </div>
          {errors.privacy && <p style={{ fontSize: '12px', color: '#F87171', marginTop: '-10px' }}>{errors.privacy}</p>}
        </div>

        {errors.submit && <p style={{ fontSize: '13px', color: '#F87171', marginBottom: '12px', textAlign: 'center' }}>{errors.submit}</p>}

        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => { setStep(2); window.scrollTo(0, 0); }} disabled={submitting} style={{ width: '52px', height: '52px', borderRadius: '14px', flexShrink: 0, background: 'var(--color-surface)', border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: submitting ? 'default' : 'pointer' }}>
            <ArrowLeft size={18} color="var(--color-text)" />
          </button>
          <button onClick={goStep4} disabled={submitting} style={{ flex: 1, minHeight: '52px', background: submitting ? 'rgba(57,217,138,0.6)' : 'var(--color-accent)', color: '#000', border: 'none', borderRadius: '14px', fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '16px', cursor: submitting ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            {submitting ? (
              <><span style={{ width: '16px', height: '16px', borderRadius: '50%', border: '2px solid rgba(0,0,0,0.3)', borderTopColor: '#000', display: 'inline-block', animation: 'obSpin 0.7s linear infinite' }} />Creating…</>
            ) : 'Create my Kayaa →'}
          </button>
        </div>
      </div>
    );
  }

  // ─── Step 2: Show your place (media) ──────────────────────────────────────
  if (step === 2) {
    return (
      <div style={{ padding: '16px 16px 100px' }}>
        <StepIndicator current={2} />
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '24px', marginBottom: '6px' }}>Show your place</h1>
        <p style={{ fontSize: '14px', color: 'var(--color-muted)', marginBottom: '28px' }}>
          More photos and a short video help people feel your vibe before they visit.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', marginBottom: '28px' }}>
          {/* Gallery */}
          <div>
            <div style={{ marginBottom: '4px' }}>
              <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '15px', color: 'var(--color-text)' }}>Gallery photos</span>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--color-muted)', marginBottom: '14px', lineHeight: 1.5 }}>
              Add up to 8 photos — the inside, the chairs, the energy. Optional, but it makes a big difference.
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '15px', color: 'var(--color-text)' }}>Add a short video</span>
              <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-muted)', background: 'var(--color-surface)', border: '1px solid var(--color-border)', padding: '2px 8px', borderRadius: '20px' }}>Optional</span>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--color-muted)', marginBottom: '14px', lineHeight: 1.5 }}>
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
          <button onClick={() => { setStep(1); window.scrollTo(0, 0); }} style={{ width: '52px', height: '52px', borderRadius: '14px', flexShrink: 0, background: 'var(--color-surface)', border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <ArrowLeft size={18} color="var(--color-text)" />
          </button>
          <button onClick={goStep3} style={{ flex: 1, minHeight: '52px', background: 'var(--color-accent)', color: '#000', border: 'none', borderRadius: '14px', fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '16px', cursor: 'pointer' }}>
            Continue →
          </button>
        </div>
      </div>
    );
  }

  // ─── Step 1: Your venue ─────────────────────────────────────────────────────
  return (
    <div style={{ padding: '16px 16px 100px' }}>
      <StepIndicator current={1} />

      <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '24px', marginBottom: '6px' }}>
        Tell us about your place
      </h1>
      <p style={{ fontSize: '14px', color: 'var(--color-muted)', marginBottom: '28px' }}>
        Every great neighbourhood spot deserves its own page.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '28px' }}>
        {/* Venue name */}
        <div>
          <label style={labelStyle}>What's your place called?</label>
          <input type="text" value={form.venueName} onChange={set('venueName')} placeholder="e.g. Uncle Dee's Barbershop" autoComplete="organization"
            style={{ ...inputStyle, border: `1px solid ${errors.venueName ? '#F87171' : 'var(--color-border)'}` }} />
          <p style={errorStyle(!!errors.venueName)}>{errors.venueName}</p>
        </div>

        {/* Venue type grid */}
        <div>
          <label style={labelStyle}>What kind of place is it?</label>
          <VenueTypeGrid selected={form.venueType} onSelect={v => { setForm(f => ({ ...f, venueType: v })); setErrors(er => ({ ...er, venueType: undefined })); }} items={venueTypeItems} />
          <p style={errorStyle(!!errors.venueType)}>{errors.venueType}</p>
        </div>

        {/* Street address */}
        <div>
          <label style={labelStyle}>Street address <span style={{ color: 'var(--color-muted)', fontWeight: 400 }}>(optional)</span></label>
          <input type="text" value={form.streetAddress} onChange={set('streetAddress')} placeholder="e.g. 12 Vilakazi Street" autoComplete="street-address"
            style={{ ...inputStyle, border: '1px solid var(--color-border)' }} />
        </div>

        {/* Suburb + City */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Suburb *</label>
            <input type="text" value={form.suburb} onChange={set('suburb')} placeholder="e.g. Orlando West"
              style={{ ...inputStyle, border: `1px solid ${errors.suburb ? '#F87171' : 'var(--color-border)'}` }} />
            <p style={errorStyle(!!errors.suburb)}>{errors.suburb}</p>
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>City *</label>
            <input type="text" value={form.city} onChange={set('city')} placeholder="e.g. Johannesburg"
              list="city-options"
              style={{ ...inputStyle, border: `1px solid ${errors.city ? '#F87171' : 'var(--color-border)'}` }} />
            <datalist id="city-options">
              {selectedCountry.launch_cities.map(c => <option key={c} value={c} />)}
            </datalist>
            <p style={errorStyle(!!errors.city)}>{errors.city}</p>
          </div>
        </div>

        {/* Province */}
        <div>
          <label style={labelStyle}>Province *</label>
          <select value={form.province} onChange={e => setForm(f => ({ ...f, province: e.target.value }))}
            style={{ ...inputStyle, appearance: 'none', WebkitAppearance: 'none', cursor: 'pointer' } as React.CSSProperties}>
            {SA_PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>

        {/* Description */}
        <div>
          <label style={labelStyle}>Describe your place in one line</label>
          <textarea value={form.description} onChange={set('description')} placeholder="e.g. Best fades in Soweto, open 7 days a week" maxLength={200}
            style={{ ...inputStyle, minHeight: '80px', resize: 'vertical', lineHeight: 1.5, border: `1px solid ${errors.description ? '#F87171' : 'var(--color-border)'}` }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: '4px' }}>
            <p style={{ fontSize: '12px', color: '#F87171', margin: 0, visibility: errors.description ? 'visible' : 'hidden' }}>{errors.description ?? ' '}</p>
            <span style={{ fontSize: '11px', color: 'var(--color-muted)', flexShrink: 0, marginLeft: '8px' }}>{form.description.length}/200</span>
          </div>
        </div>

        {/* Cover photo — REQUIRED */}
        <div>
          <label style={{ ...labelStyle, color: 'var(--color-text)', fontSize: '15px', fontFamily: 'Syne, sans-serif', fontWeight: 700 }}>
            Add a photo of your place
          </label>
          <p style={{ fontSize: '13px', color: 'var(--color-muted)', marginBottom: '12px', lineHeight: 1.5 }}>
            Required. It can be your sign, your shopfront, or the inside. A real photo makes people trust your place immediately.
          </p>
          <CoverPhotoUpload
            sessionId={sessionId.current}
            currentUrl={form.coverImageUrl}
            onUploaded={url => {
              setForm(f => ({ ...f, coverImageUrl: url }));
              setErrors(er => ({ ...er, cover: undefined }));
            }}
          />
          {errors.cover && (
            <p style={{ fontSize: '12px', color: '#F87171', marginTop: '8px' }}>{errors.cover}</p>
          )}
        </div>
      </div>

      {/* Continue button — disabled until cover uploaded */}
      <button
        onClick={goStep2}
        style={{
          width: '100%', minHeight: '56px',
          background: form.coverImageUrl ? 'var(--color-accent)' : 'rgba(57,217,138,0.3)',
          color: form.coverImageUrl ? '#000' : 'rgba(0,0,0,0.5)',
          border: 'none', borderRadius: '14px',
          fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '16px',
          cursor: form.coverImageUrl ? 'pointer' : 'default',
          transition: 'background 0.2s, color 0.2s',
        }}
      >
        Continue →
      </button>
      {errors.cover && !form.coverImageUrl && (
        <p style={{ fontSize: '12px', color: '#F87171', marginTop: '8px', textAlign: 'center' }}>
          {errors.cover}
        </p>
      )}
    </div>
  );
}
