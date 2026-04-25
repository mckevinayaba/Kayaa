import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Camera, X, AlertTriangle } from 'lucide-react';
import {
  createBoardPost,
  uploadBoardImage,
  type BoardCategory,
} from '../lib/api';
import { getInteractiveUserId } from '../lib/api';
import { BOARD_CATEGORIES } from './BoardPage';
import { useCountry } from '../contexts/CountryContext';

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

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        {BOARD_CATEGORIES.map(cat => {
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

interface FormData {
  title: string;
  description: string;
  price: string;
  contactWhatsapp: string;
  images: string[];
  isUrgent: boolean;
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
  const suburb = localStorage.getItem('kayaa_suburb') ?? localStorage.getItem('kayaa_city') ?? 'your area';

  const isSafety = category === 'safety';
  const showPrice = category === 'for_sale';
  const showRate = category === 'services' || category === 'jobs';

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
    <div style={{ padding: '0 16px', paddingBottom: '100px' }}>

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
          placeholder={isSafety ? 'e.g. Armed robbery at Vilakazi St' : 'Short, clear title'}
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
            isSafety ? 'Describe what happened, location, any suspects...' :
            category === 'lost_found' ? 'Describe the item, where it was last seen...' :
            category === 'jobs' ? 'Role details, requirements, location...' :
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
            {category === 'jobs' ? 'Salary / Rate (optional)' : 'Rate / Price (optional)'}
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

      {/* Images */}
      <div style={{ marginBottom: '20px' }}>
        <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-muted)', fontFamily: 'DM Sans, sans-serif', display: 'block', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Photos (optional)
        </label>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
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
  const suburb = localStorage.getItem('kayaa_suburb') ?? localStorage.getItem('kayaa_city') ?? 'your area';
  const isSafety = category === 'safety';

  return (
    <div style={{ padding: '0 16px', paddingBottom: '100px' }}>
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
  const { selectedCountry } = useCountry();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [category, setCategory] = useState<BoardCategory>('ask');
  const [formData, setFormData] = useState<FormData>({
    title: '', description: '', price: '', contactWhatsapp: '', images: [], isUrgent: false,
  });
  const [submitting, setSubmitting] = useState(false);

  const suburb = localStorage.getItem('kayaa_suburb') ?? localStorage.getItem('kayaa_city') ?? 'your area';

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
      country_code: selectedCountry.code,
    }, uid);

    if (!error && post) {
      // Track ownership
      try {
        const mine: string[] = JSON.parse(localStorage.getItem('kayaa_board_mine') ?? '[]');
        mine.unshift(post.id);
        localStorage.setItem('kayaa_board_mine', JSON.stringify(mine.slice(0, 50)));
      } catch { /* ignore */ }
      navigate('/board');
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
