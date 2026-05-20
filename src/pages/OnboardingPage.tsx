import { useState, useRef, useEffect } from 'react';
import { Shield, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { QRCodeCanvas } from 'qrcode.react';
import { createVenue, createVenueOwner, updateVenueCoords, uploadVenueFile } from '../lib/api';
import { signInWithEmail } from '../lib/auth';
import { geocodeAddress } from '../lib/geocode';
import { useCountry } from '../contexts/CountryContext';
import { PRIMARY_CATEGORIES, getPrimaryCategory, type PrimaryKey } from '../config/categoryLabels';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toDisplaySlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 30)
    .replace(/-+$/, '');
}

function toSlug(name: string): string {
  const base = toDisplaySlug(name);
  const suffix = Math.random().toString(36).slice(2, 6);
  return base ? `${base}-${suffix}` : `place-${suffix}`;
}

function fileExt(file: File): string {
  const parts = file.name.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : 'jpg';
}
void fileExt; // kept for future use

// ─── Category picker ──────────────────────────────────────────────────────────

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
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px', marginTop: '12px' }}>
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

// ─── Shared styles ────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: '100%', background: 'var(--color-surface)',
  border: '1px solid var(--color-border)', borderRadius: '14px',
  padding: '15px 16px', color: 'var(--color-text)', fontSize: '16px',
  fontFamily: 'Inter, sans-serif', outline: 'none',
  boxSizing: 'border-box', minHeight: '52px',
};

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '15px', fontWeight: 700,
  color: 'rgba(255,255,255,0.88)', marginBottom: '8px',
};

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

// ─── Image compress ───────────────────────────────────────────────────────────

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
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob(
        blob => {
          if (!blob) { resolve(file); return; }
          resolve(new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' }));
        },
        'image/jpeg', quality,
      );
    };
    img.onerror = () => { URL.revokeObjectURL(objectUrl); resolve(file); };
    img.src = objectUrl;
  });
}

// ─── Simple Photo Manager ─────────────────────────────────────────────────────
// Clean, low-friction: one upload area when empty, thumbnails + "+" when photos added.
// No pre-allocated empty boxes.

function SimplePhotoManager({ sessionId, photos, onUpdate }: {
  sessionId: string;
  photos: string[];
  onUpdate: (photos: string[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  async function handleFile(file: File) {
    if (!file.type.startsWith('image/')) { setError('Please select an image file.'); return; }
    if (file.size > 10 * 1024 * 1024) { setError('File too large. Max 10 MB.'); return; }
    setError(''); setUploading(true);
    try {
      const compressed = await compressImage(file);
      const path = `covers/${sessionId}/${Date.now()}.jpg`;
      const url = await uploadVenueFile(path, compressed);
      onUpdate([...photos, url]);
    } catch {
      setError('Upload failed. Tap to try again.');
    } finally {
      setUploading(false);
    }
  }

  function removePhoto(idx: number) {
    onUpdate(photos.filter((_, i) => i !== idx));
  }

  return (
    <div>
      <style>{`@keyframes obSpin { to { transform: rotate(360deg); } }`}</style>
      <input
        ref={inputRef} type="file" accept="image/*"
        style={{ display: 'none' }}
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }}
      />

      {/* ── No photos yet — single large tap area ── */}
      {photos.length === 0 && (
        <div
          onClick={() => !uploading && inputRef.current?.click()}
          style={{
            border: '1.5px dashed rgba(255,255,255,0.15)',
            borderRadius: '14px', padding: '22px 16px',
            display: 'flex', alignItems: 'center', gap: '14px',
            cursor: uploading ? 'default' : 'pointer',
            background: 'var(--color-surface)',
            opacity: uploading ? 0.7 : 1,
            transition: 'opacity 0.15s',
          }}
        >
          {uploading ? (
            <div style={{
              width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0,
              border: '3px solid rgba(57,217,138,0.2)', borderTopColor: '#39D98A',
              animation: 'obSpin 0.8s linear infinite',
            }} />
          ) : (
            <div style={{
              width: '44px', height: '44px', borderRadius: '12px', flexShrink: 0,
              background: 'rgba(57,217,138,0.08)', border: '1px solid rgba(57,217,138,0.18)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px',
            }}>
              📷
            </div>
          )}
          <div>
            <div style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '14px', color: 'var(--color-text)' }}>
              {uploading ? 'Uploading…' : 'Add a photo'}
            </div>
            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: 'var(--color-muted)', marginTop: '2px' }}>
              Any photo works — we'll resize it automatically
            </div>
          </div>
        </div>
      )}

      {/* ── Photos added — thumbnails row + "+" button ── */}
      {photos.length > 0 && (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          {photos.map((url, i) => (
            <div key={i} style={{ position: 'relative', width: '72px', height: '72px', borderRadius: '10px', overflow: 'hidden', flexShrink: 0 }}>
              <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              {/* Cover badge on first photo */}
              {i === 0 && (
                <div style={{
                  position: 'absolute', bottom: '4px', left: '4px',
                  background: 'rgba(57,217,138,0.9)', color: '#000',
                  fontSize: '9px', fontWeight: 700, padding: '1px 5px',
                  borderRadius: '20px', fontFamily: 'Inter, sans-serif',
                }}>
                  Cover
                </div>
              )}
              {/* Remove button */}
              <button
                onClick={() => removePhoto(i)}
                style={{
                  position: 'absolute', top: '4px', right: '4px',
                  width: '20px', height: '20px', borderRadius: '50%',
                  background: 'rgba(0,0,0,0.7)', border: 'none',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <X size={11} color="#fff" />
              </button>
            </div>
          ))}

          {/* Add more "+" button */}
          {!uploading && photos.length < 8 && (
            <button
              onClick={() => inputRef.current?.click()}
              style={{
                width: '72px', height: '72px', borderRadius: '10px', flexShrink: 0,
                border: '1.5px dashed rgba(255,255,255,0.18)',
                background: 'var(--color-surface)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '24px', color: 'rgba(255,255,255,0.35)',
                cursor: 'pointer',
              }}
              aria-label="Add another photo"
            >
              +
            </button>
          )}

          {/* Spinner while uploading more */}
          {uploading && (
            <div style={{
              width: '72px', height: '72px', borderRadius: '10px', flexShrink: 0,
              background: 'var(--color-surface)', border: '1px solid var(--color-border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <div style={{
                width: '22px', height: '22px', borderRadius: '50%',
                border: '3px solid rgba(57,217,138,0.2)', borderTopColor: '#39D98A',
                animation: 'obSpin 0.8s linear infinite',
              }} />
            </div>
          )}
        </div>
      )}

      {error && (
        <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: '#F87171', marginTop: '6px' }}>
          {error}
        </p>
      )}
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
  ownerName: string;
  ownerPhone: string;
  ownerEmail: string;
  privacyAgreed: boolean;
}

const DRAFT_KEY = 'kayaa_place_draft';

const empty: FormData = {
  venueName: '', venueType: '', streetAddress: '', suburb: '', city: '',
  province: 'Gauteng', description: '',
  ownerName: '', ownerPhone: '', ownerEmail: '', privacyAgreed: false,
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const { selectedCountry } = useCountry();
  const { user } = useAuth();
  const [step, setStep] = useState<1 | 4>(1);
  const [primaryCat, setPrimaryCat] = useState<PrimaryKey | ''>('');
  const [form, setForm] = useState<FormData>(empty);
  const [photos, setPhotos] = useState<string[]>([]); // all photos (cover first)
  const [errors, setErrors] = useState<Partial<Record<keyof FormData | 'privacy' | 'submit', string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);
  const [finalSlug, setFinalSlug] = useState('');
  const [showQr, setShowQr] = useState(false);
  const qrWrapRef = useRef<HTMLDivElement>(null);
  const sessionId = useRef(`s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`);

  // Check for saved draft on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.venueName) setHasDraft(true);
      }
    } catch { /* ignore */ }
  }, []);

  // Auto-save draft
  useEffect(() => {
    if (!form.venueName && !form.venueType) return;
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...form, photos })); } catch { /* ignore */ }
    setDraftSaved(true);
    const t = setTimeout(() => setDraftSaved(false), 2000);
    return () => clearTimeout(t);
  }, [form, photos]);

  // Pre-fill from auth
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
  const qrUrl = `https://kayaa.africa/checkin/${finalSlug || displaySlug}`;

  function set(key: keyof FormData) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm(f => ({ ...f, [key]: e.target.value }));
      setErrors(er => ({ ...er, [key]: undefined }));
    };
  }

  // ── Submit — all validation in one pass ───────────────────────────────────
  async function handleSubmit() {
    const errs: typeof errors = {};
    if (!form.venueName.trim())                    errs.venueName  = 'Please add your business name';
    else if (form.venueName.trim().length < 3)     errs.venueName  = 'Name must be at least 3 characters';
    else if (/^\d+$/.test(form.venueName.trim()))  errs.venueName  = 'Name cannot be numbers only';
    if (!primaryCat)                               errs.venueType  = 'Please tell us what type of business you run';
    else if (!form.venueType) {
      const cat = PRIMARY_CATEGORIES.find(c => c.key === primaryCat);
      errs.venueType = cat && cat.subtypes.length > 0 ? 'Please pick the specific type' : 'Please pick your business type';
    }
    if (!form.ownerPhone.trim())                   errs.ownerPhone = 'Please add your phone number';
    else if (form.ownerPhone.trim().replace(/\D/g, '').length < 9)
                                                   errs.ownerPhone = 'Please enter a valid phone number';
    if (!form.suburb.trim())                       errs.suburb     = 'Please add your neighbourhood or area';
    else if (form.suburb.trim().length < 3)        errs.suburb     = 'Please enter a specific neighbourhood, not just a city';
    if (!form.city.trim())                         errs.city       = 'Please add your city';
    if (!form.ownerName.trim())                    errs.ownerName  = 'Please add your name';
    if (!form.privacyAgreed)                       errs.privacy    = 'Please agree to continue';

    if (Object.keys(errs).length) {
      setErrors(errs);
      const fieldOrder: (keyof typeof errs)[] = ['venueName', 'venueType', 'ownerPhone', 'suburb', 'city', 'ownerName', 'privacy'];
      const firstKey = fieldOrder.find(k => errs[k]);
      if (firstKey) {
        const el = document.querySelector(`[data-field="${firstKey}"]`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    setSubmitting(true); setErrors({});

    const suburb = form.suburb.trim();
    const city   = form.city.trim();
    const fullAddress = [form.streetAddress.trim(), suburb, city, form.province].filter(Boolean).join(', ');
    const slug = toSlug(form.venueName);
    setFinalSlug(slug);

    const venuePayload = {
      name:            form.venueName.trim(),
      type:            form.venueType,
      slug,
      location:        `${suburb}, ${city}`,
      address:         fullAddress,
      description:     form.description.trim() || undefined,
      cover_image:     photos[0] || undefined,
      gallery_images:  photos.length > 0 ? photos : undefined,
      phone_number:    form.ownerPhone.trim() || undefined,
      whatsapp_number: form.ownerPhone.trim() || undefined,
      country_code:    selectedCountry.code,
      owner_user_id:   user?.id || undefined,
      is_active:       true,
    };

    console.log('[Kayaa] Submitting venue payload:', JSON.stringify(venuePayload, null, 2));

    const firstAttempt = await createVenue(venuePayload);
    let venueRow = firstAttempt.row;
    let venueErr = firstAttempt.error;

    if (venueErr?.code === '23505' && venueErr.message?.includes('slug')) {
      const retrySlug = toSlug(form.venueName);
      setFinalSlug(retrySlug);
      const retry = await createVenue({ ...venuePayload, slug: retrySlug });
      venueRow = retry.row; venueErr = retry.error;
    }

    if (venueErr || !venueRow) {
      console.error('[Kayaa] Venue creation failed:', venueErr);
      const code    = venueErr?.code ?? '';
      const message = (venueErr?.message ?? '').toLowerCase();
      let msg: string;
      if (!venueErr)                                                                      msg = 'Could not save your business. Database permissions error — contact Kayaa support. (Error: RLS block)';
      else if (code === 'PGRST116' || message.includes('0 rows'))                        msg = 'Could not save your business. Database permissions error (PGRST116). Contact Kayaa support.';
      else if (code === '42501' || message.includes('permission denied'))                 msg = 'Database permission denied. Please contact Kayaa support.';
      else if (code === '23505')                                                          msg = 'A business with this name already exists on Kayaa. Try a slightly different name.';
      else if (code === '23502')                                                          msg = `A required field is missing. Details: ${venueErr.message}`;
      else if (message.includes('failed to fetch') || message.includes('network'))       msg = 'No internet connection. Check your signal and try again.';
      else                                                                                msg = `Submission failed — ${venueErr.message} (code: ${code || 'unknown'})`;
      setErrors({ submit: msg });
      setSubmitting(false);
      return;
    }

    const venueId = venueRow.id;
    const { error: ownerErr } = await createVenueOwner({
      name: form.ownerName.trim(), phone: form.ownerPhone.trim(),
      email: form.ownerEmail.trim() || undefined, venue_id: venueId,
    });
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

  // ─── Step 4: Live! ────────────────────────────────────────────────────────
  if (step === 4) {
    const waShareText = encodeURIComponent(
      `${form.venueName} is now on Kayaa. Find us here → https://kayaa.africa/venue/${finalSlug}`
    );
    return (
      <>
        <style>{`
          @keyframes popIn  { from{transform:scale(0.4);opacity:0} to{transform:scale(1);opacity:1} }
          @keyframes riseUp { from{transform:translateY(18px);opacity:0} to{transform:translateY(0);opacity:1} }
          .s4-tick { animation: popIn  0.4s cubic-bezier(0.34,1.56,0.64,1) forwards }
          .s4-name { animation: riseUp 0.3s ease 0.28s both }
          .s4-line { animation: riseUp 0.3s ease 0.4s  both }
          .s4-ctas { animation: riseUp 0.3s ease 0.55s both }
        `}</style>
        <div style={{ padding: '48px 20px 100px', textAlign: 'center', maxWidth: '380px', margin: '0 auto' }}>
          <div className="s4-tick" style={{ width: '88px', height: '88px', borderRadius: '50%', background: '#39D98A', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 28px' }}>
            <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
              <path d="M10 22L18 30L34 14" stroke="#0D1117" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h1 className="s4-name" style={{ fontFamily: 'Inter, sans-serif', fontWeight: 800, fontSize: '26px', color: '#F0F6FC', margin: '0 0 6px', lineHeight: 1.2 }}>
            {form.venueName}
          </h1>
          <p className="s4-line" style={{ fontFamily: 'Inter, sans-serif', fontSize: '16px', color: '#39D98A', fontWeight: 600, margin: '0 0 6px' }}>
            Your place is live.
          </p>
          <p className="s4-line" style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', color: 'rgba(255,255,255,0.45)', margin: '0 0 36px', lineHeight: 1.5 }}>
            People in {form.suburb || form.city || 'your area'} can find you now.
          </p>
          <div className="s4-ctas" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <a href={`/venue/${finalSlug}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', minHeight: '56px', background: '#39D98A', color: '#0D1117', borderRadius: '16px', textDecoration: 'none', fontFamily: 'Inter, sans-serif', fontWeight: 800, fontSize: '17px', boxSizing: 'border-box' } as React.CSSProperties}>
              See your place
            </a>
            <a href={`https://wa.me/?text=${waShareText}`} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', width: '100%', minHeight: '52px', background: 'rgba(37,211,102,0.08)', color: '#25D366', border: '1.5px solid rgba(37,211,102,0.3)', borderRadius: '16px', textDecoration: 'none', fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '15px', boxSizing: 'border-box' } as React.CSSProperties}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="#25D366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              Share on WhatsApp
            </a>
            <button onClick={() => setShowQr(q => !q)} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px', padding: '14px', width: '100%', cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontSize: '14px', fontWeight: 600, color: 'rgba(255,255,255,0.5)' }}>
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
            <button
              onClick={() => { setForm(empty); setPhotos([]); setStep(1); setPrimaryCat(''); window.scrollTo(0, 0); try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ } }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontSize: '13px', color: 'rgba(255,255,255,0.3)', padding: '8px 0' }}
            >
              Add another business
            </button>
            {form.ownerEmail && (
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: 'rgba(255,255,255,0.28)', lineHeight: 1.5, margin: '4px 0 0' }}>
                We sent a sign-in link to {form.ownerEmail}
              </p>
            )}
          </div>
        </div>
      </>
    );
  }

  // ─── Single-page form ─────────────────────────────────────────────────────
  return (
    <div style={{ padding: '20px 16px 100px' }}>
      <style>{`@keyframes obSpin { to { transform: rotate(360deg); } }`}</style>

      <h1 style={{ fontFamily: 'Inter, sans-serif', fontWeight: 800, fontSize: '26px', marginBottom: '6px', color: 'var(--color-text)' }}>
        Add your business
      </h1>
      <p style={{ fontSize: '15px', color: 'var(--color-muted)', marginBottom: '24px', lineHeight: 1.5 }}>
        Free. Fill in what you have — you can update everything later.
      </p>

      {/* Draft resume banner */}
      {hasDraft && (
        <div style={{ background: 'rgba(57,217,138,0.07)', border: '1px solid rgba(57,217,138,0.25)', borderRadius: '12px', padding: '14px 16px', marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
          <div>
            <div style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '14px', color: 'var(--color-accent)' }}>You have a saved draft</div>
            <div style={{ fontSize: '13px', color: 'var(--color-muted)', marginTop: '2px' }}>Continue where you left off?</div>
          </div>
          <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
            <button
              onClick={() => {
                try {
                  const raw = localStorage.getItem(DRAFT_KEY);
                  if (raw) {
                    const parsed = JSON.parse(raw) as FormData & { photos?: string[] };
                    setForm({ venueName: parsed.venueName ?? '', venueType: parsed.venueType ?? '', streetAddress: parsed.streetAddress ?? '', suburb: parsed.suburb ?? '', city: parsed.city ?? '', province: parsed.province ?? 'Gauteng', description: parsed.description ?? '', ownerName: parsed.ownerName ?? '', ownerPhone: parsed.ownerPhone ?? '', ownerEmail: parsed.ownerEmail ?? '', privacyAgreed: parsed.privacyAgreed ?? false });
                    if (parsed.photos) setPhotos(parsed.photos);
                    if (parsed.venueType) { const pk = getPrimaryCategory(parsed.venueType) as PrimaryKey; setPrimaryCat(pk); }
                  }
                } catch { /* ignore */ }
                setHasDraft(false);
              }}
              style={{ background: 'var(--color-accent)', color: '#000', border: 'none', borderRadius: '8px', padding: '8px 14px', fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}
            >
              Resume
            </button>
            <button
              onClick={() => { try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ } setHasDraft(false); }}
              style={{ background: 'none', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '8px 12px', fontFamily: 'Inter, sans-serif', fontSize: '13px', color: 'var(--color-muted)', cursor: 'pointer' }}
            >
              Discard
            </button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', marginBottom: '32px' }}>

        {/* ── Business name ─────────────────────────────────────────────── */}
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

        {/* ── Describe your business ────────────────────────────────────── */}
        <div>
          <label style={labelStyle}>
            Describe your business{' '}
            <span style={{ fontSize: '12px', fontWeight: 500, color: '#39D98A', background: 'rgba(57,217,138,0.1)', border: '1px solid rgba(57,217,138,0.2)', borderRadius: '20px', padding: '1px 8px', verticalAlign: 'middle' }}>
              Recommended
            </span>
          </label>
          <p style={hintStyle}>What makes your place special? A sentence or two helps customers choose you.</p>
          <textarea
            value={form.description}
            onChange={set('description')}
            placeholder="e.g. Best fades in Soweto. Open 7 days. Quick cuts, no appointment needed."
            maxLength={200}
            rows={3}
            style={{ ...inputStyle, minHeight: '80px', resize: 'none', lineHeight: 1.55 }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
            <span style={{ fontSize: '11px', color: form.description.length > 160 ? '#FBBF24' : 'var(--color-muted)' }}>
              {form.description.length}/200
            </span>
          </div>
        </div>

        {/* ── What do you do? ───────────────────────────────────────────── */}
        <div data-field="venueType">
          <label style={labelStyle}>What do you do?</label>
          <p style={hintStyle}>Pick the closest type for your business.</p>
          <PrimaryCategoryGrid
            selected={primaryCat}
            onSelect={key => {
              setPrimaryCat(key);
              const cat = PRIMARY_CATEGORIES.find(c => c.key === key)!;
              setForm(f => ({ ...f, venueType: cat.subtypes.length === 0 && key !== 'other' ? cat.label : '' }));
              setErrors(er => ({ ...er, venueType: undefined }));
            }}
          />
          {primaryCat && primaryCat !== 'other' && (() => {
            const cat = PRIMARY_CATEGORIES.find(c => c.key === primaryCat)!;
            if (cat.subtypes.length === 0) return null;
            return (
              <div style={{ marginTop: '4px' }}>
                <p style={{ fontSize: '13px', color: 'var(--color-muted)', margin: '10px 0 0' }}>Which type fits best?</p>
                <SubtypeChips
                  subtypes={cat.subtypes}
                  selected={form.venueType}
                  onSelect={sub => { setForm(f => ({ ...f, venueType: sub })); setErrors(er => ({ ...er, venueType: undefined })); }}
                />
              </div>
            );
          })()}
          {primaryCat === 'other' && (
            <div style={{ marginTop: '12px' }}>
              <input
                type="text" value={form.venueType}
                onChange={e => { setForm(f => ({ ...f, venueType: e.target.value })); setErrors(er => ({ ...er, venueType: undefined })); }}
                placeholder="e.g. Driving School, Music Studio, Photography Studio…"
                style={{ ...inputStyle, border: `1px solid ${errors.venueType ? '#F87171' : 'var(--color-border)'}` }}
              />
            </div>
          )}
          <p style={errorStyle(!!errors.venueType)}>{errors.venueType}</p>
        </div>

        {/* ── Phone number ──────────────────────────────────────────────── */}
        <div data-field="ownerPhone">
          <label style={labelStyle}>Your phone number</label>
          <p style={hintStyle}>So customers can call or WhatsApp you directly. We'll show it on your business page.</p>
          <input
            type="tel" value={form.ownerPhone} onChange={set('ownerPhone')}
            placeholder="e.g. 082 123 4567"
            autoComplete="tel"
            style={{ ...inputStyle, border: `1px solid ${errors.ownerPhone ? '#F87171' : 'var(--color-border)'}` }}
          />
          <p style={errorStyle(!!errors.ownerPhone)}>{errors.ownerPhone}</p>
        </div>

        {/* ── Where are you based? ──────────────────────────────────────── */}
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

        {/* ── Business address — directly under "Where are you based?" ──── */}
        <div data-field="streetAddress">
          <label style={labelStyle}>
            Business address{' '}
            <span style={{ fontSize: '13px', fontWeight: 400, color: 'var(--color-muted)' }}>(optional)</span>
          </label>
          <p style={hintStyle}>Street name or nearby landmark — helps customers find you.</p>
          <input
            type="text"
            value={form.streetAddress}
            onChange={set('streetAddress')}
            placeholder="e.g. 12 Main Street, Berea  ·  or  ·  Next to the taxi rank"
            autoComplete="street-address"
            style={{ ...inputStyle, border: `1px solid ${errors.streetAddress ? '#F87171' : 'var(--color-border)'}` }}
          />
          <p style={errorStyle(!!errors.streetAddress)}>{errors.streetAddress}</p>
        </div>

        {/* ── Photos — simplified, no empty box grid ────────────────────── */}
        <div>
          <label style={labelStyle}>
            Add a photo{' '}
            <span style={{ fontSize: '13px', fontWeight: 400, color: 'var(--color-muted)' }}>(optional)</span>
          </label>
          <p style={hintStyle}>Any photo works. You can add more photos later.</p>
          <SimplePhotoManager
            sessionId={sessionId.current}
            photos={photos}
            onUpdate={setPhotos}
          />
        </div>

        {/* ── Divider — about the owner ─────────────────────────────────── */}
        <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '4px' }}>
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: 'var(--color-muted)', margin: '0 0 0' }}>
            Almost done — just tell us who runs this business.
          </p>
        </div>

        {/* ── Your name ─────────────────────────────────────────────────── */}
        <div data-field="ownerName">
          <label style={labelStyle}>Your name</label>
          <p style={hintStyle}>The name people know you by.</p>
          <input
            type="text" value={form.ownerName} onChange={set('ownerName')}
            placeholder="e.g. Sipho, Mama Thembi"
            autoComplete="given-name"
            style={{ ...inputStyle, border: `1px solid ${errors.ownerName ? '#F87171' : 'var(--color-border)'}` }}
          />
          <p style={errorStyle(!!errors.ownerName)}>{errors.ownerName}</p>
        </div>

        {/* ── Email (optional) ──────────────────────────────────────────── */}
        <div>
          <label style={labelStyle}>
            Email address{' '}
            <span style={{ fontSize: '13px', fontWeight: 400, color: 'var(--color-muted)' }}>(optional)</span>
          </label>
          <p style={hintStyle}>For account recovery. We won't spam you.</p>
          <input
            type="email" value={form.ownerEmail} onChange={set('ownerEmail')}
            placeholder="you@example.com"
            autoComplete="email"
            style={{ ...inputStyle, border: '1px solid var(--color-border)' }}
          />
        </div>

        {/* ── POPIA notice + agree toggle ───────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ background: 'rgba(57,217,138,0.05)', border: '1px solid rgba(57,217,138,0.2)', borderRadius: '14px', padding: '14px 16px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
            <Shield size={16} color="var(--color-accent)" style={{ marginTop: '1px', flexShrink: 0 }} />
            <p style={{ fontSize: '13px', color: 'var(--color-muted)', lineHeight: 1.55, margin: 0 }}>
              Your information is protected under{' '}
              <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>POPIA</span>{' '}
              and never shared without your consent.
            </p>
          </div>
          <div
            data-field="privacy"
            style={{ background: 'var(--color-surface)', border: `1px solid ${errors.privacy ? '#F87171' : 'var(--color-border)'}`, borderRadius: '14px', padding: '16px', display: 'flex', gap: '12px', alignItems: 'center' }}
          >
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-text)', margin: '0 0 3px' }}>I agree to the Kayaa terms</p>
              <p style={{ fontSize: '13px', color: 'var(--color-muted)', margin: 0 }}>You're in control of your place data, always.</p>
            </div>
            <ToggleSwitch
              checked={form.privacyAgreed}
              onChange={v => { setForm(f => ({ ...f, privacyAgreed: v })); setErrors(er => ({ ...er, privacy: undefined })); }}
            />
          </div>
          {errors.privacy && (
            <p style={{ fontSize: '13px', color: '#F87171', marginTop: '-8px' }}>{errors.privacy}</p>
          )}
        </div>

      </div>

      {/* Submit error */}
      {errors.submit && (
        <p style={{ fontSize: '13px', color: '#F87171', marginBottom: '16px', textAlign: 'center', lineHeight: 1.5 }}>
          {errors.submit}
        </p>
      )}

      {/* ── Single submit button ──────────────────────────────────────────── */}
      <button
        onClick={handleSubmit}
        disabled={submitting}
        style={{
          width: '100%', minHeight: '58px',
          background: submitting ? 'rgba(57,217,138,0.6)' : 'var(--color-accent)',
          color: '#000', border: 'none', borderRadius: '14px',
          fontFamily: 'Inter, sans-serif', fontWeight: 800, fontSize: '18px',
          cursor: submitting ? 'default' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
        }}
      >
        {submitting ? (
          <>
            <span style={{ width: '18px', height: '18px', borderRadius: '50%', border: '2px solid rgba(0,0,0,0.3)', borderTopColor: '#000', display: 'inline-block', animation: 'obSpin 0.7s linear infinite' }} />
            Creating your page…
          </>
        ) : (
          <>
            Add my business
            {draftSaved && <span style={{ fontSize: '11px', fontWeight: 400, color: 'rgba(0,0,0,0.5)' }}>Draft saved ✓</span>}
          </>
        )}
      </button>

      <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: 'rgba(255,255,255,0.25)', textAlign: 'center', marginTop: '16px', lineHeight: 1.5 }}>
        Need help?{' '}
        <a href="https://wa.me/27000000000?text=Hi%2C+I+need+help+adding+my+business+to+Kayaa" target="_blank" rel="noopener noreferrer" style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'underline' }}>
          WhatsApp us
        </a>
      </p>
    </div>
  );
}
