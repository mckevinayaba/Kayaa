import { useState, useRef, useEffect, useMemo } from 'react';
import { Shield, X, Search, ChevronRight, ChevronLeft } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { QRCodeCanvas } from 'qrcode.react';
import { createVenue, createVenueOwner, updateVenueCoords, uploadVenueFile } from '../lib/api';
import { signInWithEmail } from '../lib/auth';
import { geocodeAddress } from '../lib/geocode';
import { useCountry } from '../contexts/CountryContext';
import {
  BUSINESS_TYPE_GROUPS,
  BUSINESS_TEMPLATES,
  getRecommendedTemplates,
  getTemplate,
  templateStorageKey,
  type TemplateId,
} from '../lib/businessTemplates';

// ─── Slug helpers ─────────────────────────────────────────────────────────────

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
void fileExt;

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
          }}
        >
          {uploading ? (
            <div style={{ width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0, border: '3px solid rgba(57,217,138,0.2)', borderTopColor: '#39D98A', animation: 'obSpin 0.8s linear infinite' }} />
          ) : (
            <div style={{ width: '44px', height: '44px', borderRadius: '12px', flexShrink: 0, background: 'rgba(57,217,138,0.08)', border: '1px solid rgba(57,217,138,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
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

      {photos.length > 0 && (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          {photos.map((url, i) => (
            <div key={i} style={{ position: 'relative', width: '72px', height: '72px', borderRadius: '10px', overflow: 'hidden', flexShrink: 0 }}>
              <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              {i === 0 && (
                <div style={{ position: 'absolute', bottom: '4px', left: '4px', background: 'rgba(57,217,138,0.9)', color: '#000', fontSize: '9px', fontWeight: 700, padding: '1px 5px', borderRadius: '20px', fontFamily: 'Inter, sans-serif' }}>
                  Cover
                </div>
              )}
              <button
                onClick={() => removePhoto(i)}
                style={{ position: 'absolute', top: '4px', right: '4px', width: '20px', height: '20px', borderRadius: '50%', background: 'rgba(0,0,0,0.7)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={11} color="#fff" />
              </button>
            </div>
          ))}
          {!uploading && photos.length < 8 && (
            <button
              onClick={() => inputRef.current?.click()}
              style={{ width: '72px', height: '72px', borderRadius: '10px', flexShrink: 0, border: '1.5px dashed rgba(255,255,255,0.18)', background: 'var(--color-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', color: 'rgba(255,255,255,0.35)', cursor: 'pointer' }}
              aria-label="Add another photo"
            >
              +
            </button>
          )}
          {uploading && (
            <div style={{ width: '72px', height: '72px', borderRadius: '10px', flexShrink: 0, background: 'var(--color-surface)', border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: '22px', height: '22px', borderRadius: '50%', border: '3px solid rgba(57,217,138,0.2)', borderTopColor: '#39D98A', animation: 'obSpin 0.8s linear infinite' }} />
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

// ─── Toggle switch ────────────────────────────────────────────────────────────

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div onClick={() => onChange(!checked)} style={{ width: '46px', height: '26px', borderRadius: '13px', flexShrink: 0, background: checked ? 'var(--color-accent)' : 'var(--color-surface2)', border: `1px solid ${checked ? 'var(--color-accent)' : 'var(--color-border)'}`, position: 'relative', cursor: 'pointer', transition: 'background 0.2s, border-color 0.2s' }}>
      <div style={{ position: 'absolute', top: '4px', left: checked ? '23px' : '4px', width: '16px', height: '16px', borderRadius: '50%', background: checked ? '#000' : '#6B7280', transition: 'left 0.2s' }} />
    </div>
  );
}

// ─── Shared input styles ──────────────────────────────────────────────────────

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
  return { fontSize: '13px', color: '#F87171', marginTop: '7px', minHeight: '18px', visibility: show ? 'visible' : 'hidden', fontFamily: 'Inter, sans-serif' };
}

// ─── Form state ───────────────────────────────────────────────────────────────

interface FormData {
  venueName:        string;
  categoryGroup:    string;
  venueType:        string;
  secondaryType:    string;
  customTypeOther:  string;
  selectedTemplate: string;
  streetAddress:    string;
  suburb:           string;
  city:             string;
  province:         string;
  description:      string;
  ownerName:        string;
  ownerPhone:       string;
  ownerEmail:       string;
  privacyAgreed:    boolean;
}

const DRAFT_KEY = 'kayaa_place_draft';

const empty: FormData = {
  venueName: '', categoryGroup: '', venueType: '', secondaryType: '',
  customTypeOther: '', selectedTemplate: '', streetAddress: '',
  suburb: '', city: '', province: 'Gauteng', description: '',
  ownerName: '', ownerPhone: '', ownerEmail: '', privacyAgreed: false,
};

// Step total (excludes success screen)
const TOTAL_STEPS = 6;

// ─── Step progress bar ────────────────────────────────────────────────────────

function StepBar({ current, total }: { current: number; total: number }) {
  return (
    <div style={{ marginBottom: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 700, color: 'var(--color-muted)' }}>
          Step {current} of {total}
        </span>
      </div>
      <div style={{ height: '4px', background: 'var(--color-surface)', borderRadius: '2px', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${(current / total) * 100}%`, background: 'var(--color-accent)', borderRadius: '2px', transition: 'width 0.3s ease' }} />
      </div>
    </div>
  );
}

// ─── Business Type Selector (Step 2) ─────────────────────────────────────────

function BusinessTypeSelector({
  selectedGroup,
  selectedType,
  customTypeOther,
  onSelect,
  onCustomChange,
}: {
  selectedGroup: string;
  selectedType:  string;
  customTypeOther: string;
  onSelect: (group: string, type: string) => void;
  onCustomChange: (val: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [expandedGroup, setExpandedGroup] = useState<string | null>(() => {
    if (selectedGroup) return selectedGroup;
    return null;
  });

  // Filtered groups + types when searching
  const filtered = useMemo(() => {
    if (!query.trim()) return null;
    const q = query.toLowerCase();
    return BUSINESS_TYPE_GROUPS
      .map(g => ({ ...g, types: g.types.filter(t => t.toLowerCase().includes(q) || g.label.toLowerCase().includes(q)) }))
      .filter(g => g.types.length > 0);
  }, [query]);

  const displayGroups = filtered ?? BUSINESS_TYPE_GROUPS;

  return (
    <div>
      {/* Search */}
      <div style={{ position: 'relative', marginBottom: '16px' }}>
        <Search size={16} color="var(--color-muted)" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' } as React.CSSProperties} />
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search — e.g. Barbershop, Spaza, Restaurant…"
          style={{ ...inputStyle, paddingLeft: '42px' }}
        />
      </div>

      {/* Groups / types */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {displayGroups.map(group => {
          const isExpanded = !!filtered || expandedGroup === group.key;
          const hasSelection = selectedGroup === group.key;

          return (
            <div key={group.key}>
              {/* Group header */}
              {!filtered && (
                <button
                  onClick={() => setExpandedGroup(prev => prev === group.key ? null : group.key)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '12px 14px', borderRadius: '12px',
                    background: hasSelection ? 'rgba(57,217,138,0.08)' : 'var(--color-surface)',
                    border: `1.5px solid ${hasSelection ? 'rgba(57,217,138,0.4)' : 'var(--color-border)'}`,
                    cursor: 'pointer', textAlign: 'left',
                    transition: 'background 0.15s, border-color 0.15s',
                  }}
                >
                  <span style={{ fontSize: '20px', flexShrink: 0 }}>{group.emoji}</span>
                  <span style={{ flex: 1, fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '14px', color: hasSelection ? 'var(--color-accent)' : 'var(--color-text)' }}>
                    {group.label}
                  </span>
                  {hasSelection && (
                    <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-accent)', background: 'rgba(57,217,138,0.15)', borderRadius: '20px', padding: '2px 8px', flexShrink: 0 }}>
                      {selectedType}
                    </span>
                  )}
                  <ChevronRight
                    size={16}
                    color="var(--color-muted)"
                    style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0)', transition: 'transform 0.2s', flexShrink: 0 } as React.CSSProperties}
                  />
                </button>
              )}

              {/* Types — shown when group is expanded or search is active */}
              {isExpanded && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px', padding: filtered ? '0' : '10px 4px 4px' }}>
                  {/* Group label when in search mode */}
                  {filtered && (
                    <div style={{ width: '100%', fontFamily: 'Inter, sans-serif', fontSize: '11px', fontWeight: 700, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>
                      {group.emoji} {group.label}
                    </div>
                  )}
                  {group.types.map(type => {
                    const isSelected = selectedGroup === group.key && selectedType === type;
                    return (
                      <button
                        key={type}
                        onClick={() => {
                          onSelect(group.key, type);
                          setExpandedGroup(group.key);
                        }}
                        style={{
                          padding: '8px 14px', borderRadius: '20px',
                          border: `1.5px solid ${isSelected ? 'var(--color-accent)' : 'var(--color-border)'}`,
                          background: isSelected ? 'rgba(57,217,138,0.1)' : 'var(--color-surface)',
                          color: isSelected ? 'var(--color-accent)' : 'var(--color-muted)',
                          fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: '13px',
                          cursor: 'pointer', transition: 'all 0.15s',
                        }}
                      >
                        {type}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Custom type input for "Other" */}
      {selectedGroup === 'other' && (
        <div style={{ marginTop: '12px' }}>
          <input
            type="text"
            value={customTypeOther}
            onChange={e => onCustomChange(e.target.value)}
            placeholder="e.g. Driving School, Music Studio, Photography Studio…"
            style={inputStyle}
          />
        </div>
      )}
    </div>
  );
}

// ─── Template Selector (Step 3) ───────────────────────────────────────────────

function TemplateSelector({
  businessType,
  selected,
  onSelect,
}: {
  businessType:  string;
  selected:      string;
  onSelect:      (id: string) => void;
}) {
  const recommended = useMemo(
    () => getRecommendedTemplates(businessType),
    [businessType],
  );

  function TemplateCard({ id, isRec }: { id: TemplateId; isRec: boolean }) {
    const tmpl = getTemplate(id);
    const isSelected = selected === id;
    return (
      <button
        onClick={() => onSelect(id)}
        style={{
          width: '100%', textAlign: 'left', padding: '0',
          background: 'none', border: 'none', cursor: 'pointer',
          borderRadius: '16px', overflow: 'hidden',
          outline: isSelected ? `2px solid ${tmpl.accentColor}` : '2px solid transparent',
          outlineOffset: '2px',
          transition: 'outline-color 0.15s',
        }}
      >
        {/* Mini hero preview */}
        <div style={{
          height: '80px',
          background: tmpl.heroBg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          position: 'relative',
          borderRadius: '14px 14px 0 0',
        }}>
          <span style={{ fontSize: '32px' }}>{tmpl.emoji}</span>
          {isRec && (
            <span style={{
              position: 'absolute', top: '8px', right: '8px',
              fontFamily: 'Inter, sans-serif', fontSize: '9px', fontWeight: 800,
              background: tmpl.accentColor, color: '#000',
              borderRadius: '20px', padding: '2px 8px', textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}>
              Recommended
            </span>
          )}
          {isSelected && (
            <span style={{
              position: 'absolute', top: '8px', left: '8px',
              fontSize: '16px',
            }}>
              ✓
            </span>
          )}
        </div>
        {/* Card body */}
        <div style={{
          padding: '12px 14px',
          background: isSelected ? `${tmpl.accentColor}12` : 'var(--color-surface)',
          border: `1px solid ${isSelected ? tmpl.accentColor + '40' : 'var(--color-border)'}`,
          borderTop: 'none', borderRadius: '0 0 14px 14px',
          transition: 'background 0.15s',
        }}>
          <div style={{ fontFamily: 'Inter, sans-serif', fontWeight: 800, fontSize: '14px', color: 'var(--color-text)', marginBottom: '4px' }}>
            {tmpl.name}
          </div>
          <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: tmpl.accentColor, fontWeight: 600, marginBottom: '4px', fontStyle: 'italic' }}>
            "{tmpl.tagline}"
          </div>
          <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: 'var(--color-muted)', lineHeight: 1.5 }}>
            {tmpl.description}
          </div>
        </div>
      </button>
    );
  }

  return (
    <div>
      {/* Recommended */}
      {recommended.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', fontWeight: 700, color: 'var(--color-muted)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Recommended for you
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: recommended.length >= 2 ? '1fr 1fr' : '1fr', gap: '10px' }}>
            {recommended.map(id => (
              <TemplateCard key={id} id={id} isRec />
            ))}
          </div>
        </div>
      )}

      {/* All templates */}
      <div>
        <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', fontWeight: 700, color: 'var(--color-muted)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          All templates
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          {BUSINESS_TEMPLATES.filter(t => !recommended.includes(t.id)).map(tmpl => (
            <TemplateCard key={tmpl.id} id={tmpl.id} isRec={false} />
          ))}
        </div>
      </div>

      {/* Start fresh */}
      <button
        onClick={() => onSelect('start-fresh')}
        style={{
          width: '100%', marginTop: '12px', padding: '14px',
          background: selected === 'start-fresh' ? 'rgba(255,255,255,0.06)' : 'none',
          border: `1.5px solid ${selected === 'start-fresh' ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)'}`,
          borderRadius: '12px', cursor: 'pointer', textAlign: 'center',
          fontFamily: 'Inter, sans-serif', fontSize: '14px', fontWeight: 700,
          color: selected === 'start-fresh' ? 'var(--color-text)' : 'var(--color-muted)',
          transition: 'all 0.15s',
        }}
      >
        {selected === 'start-fresh' ? '✓ ' : ''}Start fresh — blank page
      </button>
    </div>
  );
}

// ─── Nav buttons ──────────────────────────────────────────────────────────────

function NavRow({
  onBack, onNext, nextLabel = 'Next', nextDisabled = false, submitting = false,
}: {
  onBack?: () => void;
  onNext: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  submitting?: boolean;
}) {
  return (
    <div style={{ display: 'flex', gap: '10px', marginTop: '32px' }}>
      {onBack && (
        <button
          onClick={onBack}
          style={{
            flexShrink: 0, width: '48px', height: '56px',
            background: 'var(--color-surface)', border: '1px solid var(--color-border)',
            borderRadius: '14px', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <ChevronLeft size={20} color="var(--color-muted)" />
        </button>
      )}
      <button
        onClick={onNext}
        disabled={nextDisabled || submitting}
        style={{
          flex: 1, height: '56px',
          background: nextDisabled || submitting ? 'rgba(57,217,138,0.35)' : 'var(--color-accent)',
          color: '#000', border: 'none', borderRadius: '14px',
          fontFamily: 'Inter, sans-serif', fontWeight: 800, fontSize: '17px',
          cursor: nextDisabled || submitting ? 'default' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
          transition: 'background 0.15s',
        }}
      >
        {submitting ? (
          <>
            <span style={{ width: '18px', height: '18px', borderRadius: '50%', border: '2px solid rgba(0,0,0,0.3)', borderTopColor: '#000', display: 'inline-block', animation: 'obSpin 0.7s linear infinite' }} />
            Creating your page…
          </>
        ) : nextLabel}
      </button>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const { selectedCountry } = useCountry();
  const { user } = useAuth();

  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5 | 6 | 7>(1);
  const [form, setForm] = useState<FormData>(empty);
  const [photos, setPhotos] = useState<string[]>([]);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData | 'privacy' | 'submit' | 'type', string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);
  const [finalSlug, setFinalSlug] = useState('');
  const [showQr, setShowQr] = useState(false);
  const qrWrapRef = useRef<HTMLDivElement>(null);
  const sessionId = useRef(`s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`);

  const displaySlug = toDisplaySlug(form.venueName);
  const qrUrl = `https://kayaa.africa/checkin/${finalSlug || displaySlug}`;

  // Check for saved draft
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

  function set(key: keyof FormData) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm(f => ({ ...f, [key]: e.target.value }));
      setErrors(er => ({ ...er, [key]: undefined }));
    };
  }

  function goBack() {
    setStep(s => Math.max(1, s - 1) as typeof s);
    window.scrollTo(0, 0);
  }

  function goNext(nextStep: typeof step) {
    setStep(nextStep);
    window.scrollTo(0, 0);
  }

  // ── Step validation ────────────────────────────────────────────────────────

  function validateStep1(): boolean {
    const errs: typeof errors = {};
    if (!form.venueName.trim())                    errs.venueName = 'Please add your business name';
    else if (form.venueName.trim().length < 3)     errs.venueName = 'Name must be at least 3 characters';
    else if (/^\d+$/.test(form.venueName.trim()))  errs.venueName = 'Name cannot be numbers only';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function validateStep2(): boolean {
    const type = form.categoryGroup === 'other' ? (form.customTypeOther.trim() || 'Other') : form.venueType;
    if (!form.categoryGroup || !type) {
      setErrors({ type: 'Please pick your business type' });
      return false;
    }
    setErrors({});
    return true;
  }

  function validateStep3(): boolean {
    if (!form.selectedTemplate) {
      setErrors({ selectedTemplate: 'Please choose a template or select "Start fresh"' });
      return false;
    }
    setErrors({});
    return true;
  }

  function validateStep4(): boolean {
    const errs: typeof errors = {};
    if (!form.ownerPhone.trim())                   errs.ownerPhone = 'Please add your phone number';
    else if (form.ownerPhone.trim().replace(/\D/g, '').length < 9) errs.ownerPhone = 'Please enter a valid phone number';
    if (!form.suburb.trim())                       errs.suburb     = 'Please add your neighbourhood or area';
    else if (form.suburb.trim().length < 3)        errs.suburb     = 'Please enter a specific neighbourhood, not just a city';
    if (!form.city.trim())                         errs.city       = 'Please add your city';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function validateStep6(): boolean {
    const errs: typeof errors = {};
    if (!form.ownerName.trim())  errs.ownerName = 'Please add your name';
    if (!form.privacyAgreed)     errs.privacy   = 'Please agree to continue';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  // ── Submit ─────────────────────────────────────────────────────────────────

  async function handleSubmit() {
    if (!validateStep6()) return;
    setSubmitting(true); setErrors({});

    const effectiveType = form.categoryGroup === 'other'
      ? (form.customTypeOther.trim() || 'Other')
      : form.venueType;

    const suburb     = form.suburb.trim();
    const city       = form.city.trim();
    const fullAddress = [form.streetAddress.trim(), suburb, city, form.province].filter(Boolean).join(', ');
    const slug = toSlug(form.venueName);
    setFinalSlug(slug);

    const venuePayload = {
      name:            form.venueName.trim(),
      type:            effectiveType,
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
      const code    = venueErr?.code ?? '';
      const message = (venueErr?.message ?? '').toLowerCase();
      let msg: string;
      if (!venueErr)                                                                      msg = 'Could not save your business. Database permissions error — contact Kayaa support.';
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

    // Persist template choice in localStorage
    if (form.selectedTemplate && form.selectedTemplate !== 'start-fresh') {
      try { localStorage.setItem(templateStorageKey(slug), form.selectedTemplate); } catch { /* ignore */ }
    }
    localStorage.setItem('kayaa_venue_id', venueId);
    localStorage.setItem('kayaa_pending_email', form.ownerEmail.trim());
    try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }

    geocodeAddress(fullAddress).then(coords => {
      if (coords) updateVenueCoords(venueId, coords.lat, coords.lng).catch(() => {});
    }).catch(() => {});

    if (form.ownerEmail.trim()) signInWithEmail(form.ownerEmail.trim()).catch(() => {});

    setSubmitting(false);
    goNext(7);
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

  // ─── Step 7: Success ───────────────────────────────────────────────────────
  if (step === 7) {
    const waShareText = encodeURIComponent(
      `${form.venueName} is now on Kayaa. Find us here → https://kayaa.africa/venue/${finalSlug}`
    );
    return (
      <>
        <style>{`
          @keyframes popIn  { from{transform:scale(0.4);opacity:0} to{transform:scale(1);opacity:1} }
          @keyframes riseUp { from{transform:translateY(18px);opacity:0} to{transform:translateY(0);opacity:1} }
          .s7-tick { animation: popIn  0.4s cubic-bezier(0.34,1.56,0.64,1) forwards }
          .s7-name { animation: riseUp 0.3s ease 0.28s both }
          .s7-line { animation: riseUp 0.3s ease 0.4s  both }
          .s7-ctas { animation: riseUp 0.3s ease 0.55s both }
        `}</style>
        <div style={{ padding: '48px 20px 100px', textAlign: 'center', maxWidth: '380px', margin: '0 auto' }}>
          <div className="s7-tick" style={{ width: '88px', height: '88px', borderRadius: '50%', background: '#39D98A', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 28px' }}>
            <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
              <path d="M10 22L18 30L34 14" stroke="#0D1117" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h1 className="s7-name" style={{ fontFamily: 'Inter, sans-serif', fontWeight: 800, fontSize: '26px', color: '#F0F6FC', margin: '0 0 6px', lineHeight: 1.2 }}>
            {form.venueName}
          </h1>
          <p className="s7-line" style={{ fontFamily: 'Inter, sans-serif', fontSize: '16px', color: '#39D98A', fontWeight: 600, margin: '0 0 6px' }}>
            Your place is live.
          </p>
          <p className="s7-line" style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', color: 'rgba(255,255,255,0.45)', margin: '0 0 36px', lineHeight: 1.5 }}>
            People in {form.suburb || form.city || 'your area'} can find you now.
          </p>
          <div className="s7-ctas" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
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
              onClick={() => { setForm(empty); setPhotos([]); setStep(1); window.scrollTo(0, 0); try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ } }}
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

  // ─── Wrapper ───────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: '20px 16px 100px' }}>
      <style>{`@keyframes obSpin { to { transform: rotate(360deg); } }`}</style>

      {/* Draft resume banner */}
      {hasDraft && step === 1 && (
        <div style={{ background: 'rgba(57,217,138,0.07)', border: '1px solid rgba(57,217,138,0.25)', borderRadius: '12px', padding: '14px 16px', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
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
                    setForm({
                      venueName: parsed.venueName ?? '',
                      categoryGroup: parsed.categoryGroup ?? '',
                      venueType: parsed.venueType ?? '',
                      secondaryType: parsed.secondaryType ?? '',
                      customTypeOther: parsed.customTypeOther ?? '',
                      selectedTemplate: parsed.selectedTemplate ?? '',
                      streetAddress: parsed.streetAddress ?? '',
                      suburb: parsed.suburb ?? '',
                      city: parsed.city ?? '',
                      province: parsed.province ?? 'Gauteng',
                      description: parsed.description ?? '',
                      ownerName: parsed.ownerName ?? '',
                      ownerPhone: parsed.ownerPhone ?? '',
                      ownerEmail: parsed.ownerEmail ?? '',
                      privacyAgreed: parsed.privacyAgreed ?? false,
                    });
                    if (parsed.photos) setPhotos(parsed.photos);
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

      <StepBar current={step} total={TOTAL_STEPS} />

      {/* ─── Step 1: Business Basics ─────────────────────────────────────── */}
      {step === 1 && (
        <div>
          <h1 style={{ fontFamily: 'Syne, Inter, sans-serif', fontWeight: 800, fontSize: '26px', marginBottom: '6px', color: 'var(--color-text)' }}>
            Add your business
          </h1>
          <p style={{ fontSize: '15px', color: 'var(--color-muted)', marginBottom: '28px', lineHeight: 1.5 }}>
            Free. Fill in what you have — you can always update later.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Business name */}
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

            {/* Description */}
            <div>
              <label style={labelStyle}>
                Describe your business{' '}
                <span style={{ fontSize: '12px', fontWeight: 500, color: '#39D98A', background: 'rgba(57,217,138,0.1)', border: '1px solid rgba(57,217,138,0.2)', borderRadius: '20px', padding: '1px 8px', verticalAlign: 'middle' }}>
                  Recommended
                </span>
              </label>
              <p style={hintStyle}>What makes your place special? One or two sentences helps customers choose you.</p>
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
          </div>

          <NavRow
            onNext={() => { if (validateStep1()) goNext(2); }}
            nextLabel="Next →"
          />
        </div>
      )}

      {/* ─── Step 2: Business Type ────────────────────────────────────────── */}
      {step === 2 && (
        <div>
          <h1 style={{ fontFamily: 'Syne, Inter, sans-serif', fontWeight: 800, fontSize: '26px', marginBottom: '6px', color: 'var(--color-text)' }}>
            What type of business?
          </h1>
          <p style={{ fontSize: '15px', color: 'var(--color-muted)', marginBottom: '24px', lineHeight: 1.5 }}>
            Choose the type that best describes what you do.
          </p>

          <BusinessTypeSelector
            selectedGroup={form.categoryGroup}
            selectedType={form.venueType}
            customTypeOther={form.customTypeOther}
            onSelect={(group, type) => {
              setForm(f => ({ ...f, categoryGroup: group, venueType: type, selectedTemplate: '' }));
              setErrors(er => ({ ...er, type: undefined }));
            }}
            onCustomChange={val => setForm(f => ({ ...f, customTypeOther: val }))}
          />

          {errors.type && (
            <p style={{ fontSize: '13px', color: '#F87171', marginTop: '12px' }}>{errors.type}</p>
          )}

          {/* Optional secondary type */}
          {form.venueType && form.categoryGroup !== 'other' && (
            <div style={{ marginTop: '20px' }}>
              <label style={{ ...labelStyle, fontSize: '13px' }}>
                Secondary type{' '}
                <span style={{ fontWeight: 400, color: 'var(--color-muted)' }}>(optional)</span>
              </label>
              <p style={hintStyle}>Do you do anything else? e.g. Barbershop + Nail Studio</p>
              <input
                type="text"
                value={form.secondaryType}
                onChange={set('secondaryType')}
                placeholder="e.g. Nail studio, Catering, Car wash…"
                style={inputStyle}
              />
            </div>
          )}

          <NavRow
            onBack={goBack}
            onNext={() => { if (validateStep2()) goNext(3); }}
            nextLabel="Next →"
          />
        </div>
      )}

      {/* ─── Step 3: Template ─────────────────────────────────────────────── */}
      {step === 3 && (
        <div>
          <h1 style={{ fontFamily: 'Syne, Inter, sans-serif', fontWeight: 800, fontSize: '26px', marginBottom: '6px', color: 'var(--color-text)' }}>
            How should your page look?
          </h1>
          <p style={{ fontSize: '15px', color: 'var(--color-muted)', marginBottom: '24px', lineHeight: 1.5 }}>
            Pick a template — your content goes in, the layout does the rest.
          </p>

          <TemplateSelector
            businessType={form.venueType}
            selected={form.selectedTemplate}
            onSelect={id => {
              setForm(f => ({ ...f, selectedTemplate: id }));
              setErrors(er => ({ ...er, selectedTemplate: undefined }));
            }}
          />

          {errors.selectedTemplate && (
            <p style={{ fontSize: '13px', color: '#F87171', marginTop: '12px' }}>{errors.selectedTemplate}</p>
          )}

          <NavRow
            onBack={goBack}
            onNext={() => { if (validateStep3()) goNext(4); }}
            nextLabel="Next →"
          />
        </div>
      )}

      {/* ─── Step 4: Location & Contact ───────────────────────────────────── */}
      {step === 4 && (
        <div>
          <h1 style={{ fontFamily: 'Syne, Inter, sans-serif', fontWeight: 800, fontSize: '26px', marginBottom: '6px', color: 'var(--color-text)' }}>
            Where are you & how to reach you?
          </h1>
          <p style={{ fontSize: '15px', color: 'var(--color-muted)', marginBottom: '28px', lineHeight: 1.5 }}>
            Customers need to find you and contact you.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Phone */}
            <div data-field="ownerPhone">
              <label style={labelStyle}>Your phone number</label>
              <p style={hintStyle}>Customers will call or WhatsApp you directly. Shown on your page.</p>
              <input
                type="tel" value={form.ownerPhone} onChange={set('ownerPhone')}
                placeholder="e.g. 082 123 4567"
                autoComplete="tel"
                style={{ ...inputStyle, border: `1px solid ${errors.ownerPhone ? '#F87171' : 'var(--color-border)'}` }}
              />
              <p style={errorStyle(!!errors.ownerPhone)}>{errors.ownerPhone}</p>
            </div>

            {/* Location */}
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

            {/* Street address */}
            <div>
              <label style={labelStyle}>
                Street address{' '}
                <span style={{ fontSize: '13px', fontWeight: 400, color: 'var(--color-muted)' }}>(optional)</span>
              </label>
              <p style={hintStyle}>Helps customers find you. Street name or nearby landmark.</p>
              <input
                type="text" value={form.streetAddress} onChange={set('streetAddress')}
                placeholder="e.g. 12 Main Street  ·  Next to the taxi rank"
                autoComplete="street-address"
                style={inputStyle}
              />
            </div>
          </div>

          <NavRow
            onBack={goBack}
            onNext={() => { if (validateStep4()) goNext(5); }}
            nextLabel="Next →"
          />
        </div>
      )}

      {/* ─── Step 5: Photos ───────────────────────────────────────────────── */}
      {step === 5 && (
        <div>
          <h1 style={{ fontFamily: 'Syne, Inter, sans-serif', fontWeight: 800, fontSize: '26px', marginBottom: '6px', color: 'var(--color-text)' }}>
            Add a photo
          </h1>
          <p style={{ fontSize: '15px', color: 'var(--color-muted)', marginBottom: '28px', lineHeight: 1.5 }}>
            A photo makes your page 3× more likely to be visited. Any photo works — you can add more later.
          </p>

          <SimplePhotoManager
            sessionId={sessionId.current}
            photos={photos}
            onUpdate={setPhotos}
          />

          <NavRow
            onBack={goBack}
            onNext={() => goNext(6)}
            nextLabel={photos.length > 0 ? 'Next →' : 'Skip for now →'}
          />
        </div>
      )}

      {/* ─── Step 6: About you + Publish ─────────────────────────────────── */}
      {step === 6 && (
        <div>
          <h1 style={{ fontFamily: 'Syne, Inter, sans-serif', fontWeight: 800, fontSize: '26px', marginBottom: '6px', color: 'var(--color-text)' }}>
            Almost done
          </h1>
          <p style={{ fontSize: '15px', color: 'var(--color-muted)', marginBottom: '28px', lineHeight: 1.5 }}>
            Just tell us who runs this business — then we'll publish your page.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Owner name */}
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

            {/* Email */}
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
                style={inputStyle}
              />
            </div>

            {/* Summary card */}
            <div style={{ background: 'rgba(57,217,138,0.05)', border: '1px solid rgba(57,217,138,0.18)', borderRadius: '14px', padding: '16px' }}>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 700, color: 'var(--color-accent)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 10px' }}>
                Your page summary
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {[
                  { label: 'Business', value: form.venueName },
                  { label: 'Type', value: form.categoryGroup === 'other' ? (form.customTypeOther || 'Other') : form.venueType },
                  { label: 'Template', value: form.selectedTemplate === 'start-fresh' ? 'Start fresh' : (BUSINESS_TEMPLATES.find(t => t.id === form.selectedTemplate)?.name ?? '—') },
                  { label: 'Area', value: [form.suburb, form.city].filter(Boolean).join(', ') || '—' },
                  { label: 'Photos', value: photos.length > 0 ? `${photos.length} photo${photos.length > 1 ? 's' : ''}` : 'None yet' },
                ].map(row => (
                  <div key={row.label} style={{ display: 'flex', gap: '8px' }}>
                    <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: 'var(--color-muted)', width: '70px', flexShrink: 0 }}>{row.label}</span>
                    <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', fontWeight: 600, color: 'var(--color-text)', flex: 1 }}>{row.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* POPIA + privacy toggle */}
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

          {errors.submit && (
            <p style={{ fontSize: '13px', color: '#F87171', marginTop: '16px', textAlign: 'center', lineHeight: 1.5 }}>
              {errors.submit}
            </p>
          )}

          <NavRow
            onBack={goBack}
            onNext={handleSubmit}
            nextLabel="Publish my page →"
            submitting={submitting}
          />

          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: 'rgba(255,255,255,0.25)', textAlign: 'center', marginTop: '16px', lineHeight: 1.5 }}>
            Need help?{' '}
            <a href="https://wa.me/27000000000?text=Hi%2C+I+need+help+adding+my+business+to+Kayaa" target="_blank" rel="noopener noreferrer" style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'underline' }}>
              WhatsApp us
            </a>
          </p>
        </div>
      )}
    </div>
  );
}
