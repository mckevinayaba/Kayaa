import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Camera, X, CheckCircle } from 'lucide-react';
import { createBoardPost, uploadBoardImage, getInteractiveUserId } from '../lib/api';
import { useCountry } from '../contexts/CountryContext';

// ── Skill-specific categories ─────────────────────────────────────────────────

const SKILL_CATS = [
  { key: 'barber',       emoji: '💈', label: 'Barber' },
  { key: 'hair',         emoji: '✂️', label: 'Hair' },
  { key: 'electric',     emoji: '🔌', label: 'Electrician' },
  { key: 'plumber',      emoji: '🔧', label: 'Plumber' },
  { key: 'domestic',     emoji: '🧹', label: 'Domestic' },
  { key: 'mechanic',     emoji: '🚘', label: 'Mechanic' },
  { key: 'tutor',        emoji: '📚', label: 'Tutor' },
  { key: 'catering',     emoji: '🍳', label: 'Caterer' },
  { key: 'photo',        emoji: '📸', label: 'Photographer' },
  { key: 'dj',           emoji: '🎵', label: 'DJ' },
  { key: 'driver',       emoji: '🚗', label: 'Driver' },
  { key: 'tailor',       emoji: '👗', label: 'Tailor' },
  { key: 'construction', emoji: '🏗️', label: 'Construction' },
  { key: 'tech',         emoji: '💻', label: 'Tech' },
  { key: 'carwash',      emoji: '🚿', label: 'Car Wash' },
  { key: 'other',        emoji: '🛠️', label: 'Other' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function FieldLabel({ children, required }: { children: string; required?: boolean }) {
  return (
    <label style={{
      display: 'block',
      fontFamily: 'DM Sans, sans-serif', fontSize: '11px', fontWeight: 700,
      color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.07em',
      marginBottom: '7px',
    }}>
      {children}
      {required && <span style={{ color: '#39D98A', marginLeft: '3px' }}>*</span>}
    </label>
  );
}

function inputStyle(focused?: boolean): React.CSSProperties {
  return {
    width: '100%', boxSizing: 'border-box',
    background: '#161B22',
    border: `1px solid ${focused ? '#39D98A' : 'rgba(255,255,255,0.08)'}`,
    borderRadius: '12px', padding: '13px 14px',
    color: '#fff', fontSize: '15px',
    fontFamily: 'DM Sans, sans-serif', outline: 'none',
    transition: 'border-color 0.15s',
  };
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PostSkill() {
  const navigate = useNavigate();
  const { selectedCountry } = useCountry();
  const fileRef = useRef<HTMLInputElement>(null);

  const suburb = localStorage.getItem('kayaa_suburb') ?? localStorage.getItem('kayaa_city') ?? 'your area';

  const [skillCat,  setSkillCat]  = useState('');
  const [title,     setTitle]     = useState('');
  const [description, setDescription] = useState('');
  const [price,     setPrice]     = useState('');
  const [whatsapp,  setWhatsapp]  = useState('');
  const [availability, setAvailability] = useState('');
  const [images,    setImages]    = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done,      setDone]      = useState(false);
  const [error,     setError]     = useState('');

  // Focus tracking for border highlight
  const [focused, setFocused] = useState<string | null>(null);

  const canSubmit = title.trim().length >= 3 && skillCat !== '';

  async function handleImageAdd(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const uid = await getInteractiveUserId();
      const url = await uploadBoardImage(uid, file);
      setImages(prev => [...prev, url]);
    } catch { /* silent */ }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = '';
  }

  async function handleSubmit() {
    if (!canSubmit) return;
    setError('');
    setSubmitting(true);

    const uid = await getInteractiveUserId();

    // Merge availability into description if provided
    const fullDesc = [
      description.trim(),
      availability.trim() ? `Availability: ${availability.trim()}` : '',
    ].filter(Boolean).join('\n\n');

    // Prepend skill category emoji+label to title for better listing display
    const cat = SKILL_CATS.find(c => c.key === skillCat);
    const fullTitle = cat ? `${cat.emoji} ${title.trim()}` : title.trim();

    const { error: postError, post } = await createBoardPost({
      neighbourhood: suburb,
      category: 'services',
      title: fullTitle,
      description: fullDesc || undefined,
      price: price ? Number(price) : undefined,
      contact_whatsapp: whatsapp.trim() || undefined,
      images,
      country_code: selectedCountry.code,
    }, uid);

    if (postError || !post) {
      setError('Failed to post — please try again.');
      setSubmitting(false);
      return;
    }

    // Track ownership
    try {
      const mine: string[] = JSON.parse(localStorage.getItem('kayaa_board_mine') ?? '[]');
      mine.unshift(post.id);
      localStorage.setItem('kayaa_board_mine', JSON.stringify(mine.slice(0, 50)));
    } catch { /* noop */ }

    setDone(true);
  }

  // ── Success screen ───────────────────────────────────────────────────────────
  if (done) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 24px', gap: '16px' }}>
        <div style={{
          width: 72, height: 72, borderRadius: '50%',
          background: 'rgba(57,217,138,0.12)', border: '2px solid rgba(57,217,138,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <CheckCircle size={36} color="#39D98A" />
        </div>
        <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '22px', color: '#fff', margin: 0, textAlign: 'center' }}>
          Skill posted!
        </h2>
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: 'rgba(255,255,255,0.5)', margin: 0, textAlign: 'center' }}>
          Your service listing is now live in {suburb}
        </p>
        <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
          <button
            onClick={() => navigate('/skills')}
            style={{
              padding: '12px 24px', borderRadius: '12px',
              background: '#39D98A', border: 'none',
              fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '14px',
              color: '#000', cursor: 'pointer',
            }}
          >
            Browse Skills
          </button>
          <button
            onClick={() => { setDone(false); setTitle(''); setDescription(''); setPrice(''); setWhatsapp(''); setAvailability(''); setImages([]); setSkillCat(''); }}
            style={{
              padding: '12px 24px', borderRadius: '12px',
              background: 'transparent', border: '1px solid rgba(255,255,255,0.1)',
              fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: '14px',
              color: 'rgba(255,255,255,0.6)', cursor: 'pointer',
            }}
          >
            Post another
          </button>
        </div>
      </div>
    );
  }

  // ── Form ─────────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', paddingBottom: '80px' }}>

      {/* Header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 40,
        background: 'rgba(13,17,23,0.95)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        padding: '14px 16px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <button
          onClick={() => navigate(-1)}
          style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.07)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
        >
          <ArrowLeft size={18} color="#fff" />
        </button>
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '17px', color: '#fff', margin: 0 }}>
          Post Your Skill
        </h1>
        <button
          onClick={handleSubmit}
          disabled={!canSubmit || submitting}
          style={{
            padding: '8px 18px', borderRadius: '10px',
            background: canSubmit && !submitting ? '#39D98A' : 'rgba(255,255,255,0.08)',
            border: 'none', cursor: canSubmit && !submitting ? 'pointer' : 'default',
            fontFamily: 'DM Sans, sans-serif', fontWeight: 700, fontSize: '13px',
            color: canSubmit && !submitting ? '#000' : 'rgba(255,255,255,0.25)',
            transition: 'all 0.15s',
          }}
        >
          {submitting ? 'Posting…' : 'Post'}
        </button>
      </div>

      <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {/* Blue tip */}
        <div style={{
          background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.18)',
          borderRadius: '12px', padding: '12px 14px',
        }}>
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: '#93C5FD', margin: 0, lineHeight: 1.55 }}>
            💡 Be specific about what you offer, your pricing, and how people can reach you. Listings stay active for 30 days.
          </p>
        </div>

        {/* ── Skill category chips ────────────────────────────────────────────── */}
        <div>
          <FieldLabel required>Skill category</FieldLabel>
          <div style={{
            display: 'flex', gap: '8px',
            flexWrap: 'wrap',
          }}>
            {SKILL_CATS.map(cat => {
              const active = skillCat === cat.key;
              return (
                <button
                  key={cat.key}
                  onClick={() => setSkillCat(cat.key)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '5px',
                    padding: '7px 12px', borderRadius: '20px',
                    border: active ? 'none' : '1px solid rgba(255,255,255,0.1)',
                    background: active ? '#39D98A' : '#161B22',
                    color: active ? '#000' : 'rgba(255,255,255,0.6)',
                    fontSize: '12px', fontWeight: active ? 700 : 500,
                    fontFamily: 'DM Sans, sans-serif', cursor: 'pointer',
                    transition: 'all 0.12s',
                    flexShrink: 0,
                  }}
                >
                  <span style={{ fontSize: '13px', lineHeight: 1 }}>{cat.emoji}</span>
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Title ───────────────────────────────────────────────────────────── */}
        <div>
          <FieldLabel required>Service title</FieldLabel>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value.slice(0, 70))}
            onFocus={() => setFocused('title')}
            onBlur={() => setFocused(null)}
            placeholder={
              skillCat === 'barber'   ? 'e.g., Mobile barber — I come to you' :
              skillCat === 'tutor'    ? 'e.g., Maths tutor, Grade 8–12' :
              skillCat === 'domestic' ? 'e.g., Reliable domestic worker, 10 yrs exp' :
              'Short, clear title for your service'
            }
            style={inputStyle(focused === 'title')}
          />
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)', textAlign: 'right', marginTop: '3px', fontFamily: 'DM Sans, sans-serif' }}>
            {70 - title.length} left
          </div>
        </div>

        {/* ── Description ─────────────────────────────────────────────────────── */}
        <div>
          <FieldLabel>About your service</FieldLabel>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value.slice(0, 450))}
            onFocus={() => setFocused('desc')}
            onBlur={() => setFocused(null)}
            rows={4}
            placeholder="Describe your experience, what you offer, and why people should choose you…"
            style={{
              ...inputStyle(focused === 'desc'),
              resize: 'none',
            }}
          />
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)', textAlign: 'right', marginTop: '3px', fontFamily: 'DM Sans, sans-serif' }}>
            {450 - description.length} left
          </div>
        </div>

        {/* ── Availability ────────────────────────────────────────────────────── */}
        <div>
          <FieldLabel>Availability</FieldLabel>
          <input
            type="text"
            value={availability}
            onChange={e => setAvailability(e.target.value)}
            onFocus={() => setFocused('avail')}
            onBlur={() => setFocused(null)}
            placeholder="e.g., Tue–Sat 8am–6pm, weekends by appointment"
            style={inputStyle(focused === 'avail')}
          />
        </div>

        {/* ── Price ───────────────────────────────────────────────────────────── */}
        <div>
          <FieldLabel>Rate / Price (R)</FieldLabel>
          <input
            type="number"
            value={price}
            onChange={e => setPrice(e.target.value)}
            onFocus={() => setFocused('price')}
            onBlur={() => setFocused(null)}
            placeholder="e.g., 150"
            min="0"
            style={inputStyle(focused === 'price')}
          />
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginTop: '4px', fontFamily: 'DM Sans, sans-serif' }}>
            Leave blank if rate varies — you can mention it in the description
          </div>
        </div>

        {/* ── WhatsApp ────────────────────────────────────────────────────────── */}
        <div>
          <FieldLabel>WhatsApp number</FieldLabel>
          <input
            type="tel"
            value={whatsapp}
            onChange={e => setWhatsapp(e.target.value)}
            onFocus={() => setFocused('wa')}
            onBlur={() => setFocused(null)}
            placeholder="e.g., 0821234567"
            style={inputStyle(focused === 'wa')}
          />
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginTop: '4px', fontFamily: 'DM Sans, sans-serif' }}>
            Clients will contact you directly on WhatsApp
          </div>
        </div>

        {/* ── Photos ──────────────────────────────────────────────────────────── */}
        <div>
          <FieldLabel>Photos of your work</FieldLabel>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {images.map((img, i) => (
              <div key={i} style={{ position: 'relative', width: 76, height: 76 }}>
                <img src={img} alt="" style={{ width: 76, height: 76, borderRadius: '10px', objectFit: 'cover' }} />
                <button
                  onClick={() => setImages(prev => prev.filter((_, idx) => idx !== i))}
                  style={{
                    position: 'absolute', top: -6, right: -6,
                    width: 20, height: 20, borderRadius: '50%',
                    background: '#EF4444', border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
                  }}
                >
                  <X size={11} color="#fff" />
                </button>
              </div>
            ))}
            {images.length < 4 && (
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                style={{
                  width: 76, height: 76, borderRadius: '10px',
                  background: '#161B22',
                  border: '1px dashed rgba(255,255,255,0.12)',
                  cursor: uploading ? 'default' : 'pointer',
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', gap: 4,
                  opacity: uploading ? 0.6 : 1,
                }}
              >
                <Camera size={20} color="rgba(255,255,255,0.35)" />
                <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.3)', fontFamily: 'DM Sans, sans-serif' }}>
                  {uploading ? '…' : 'Add'}
                </span>
              </button>
            )}
          </div>
          <input
            ref={fileRef}
            type="file" accept="image/*" capture="environment"
            style={{ display: 'none' }}
            onChange={handleImageAdd}
          />
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)', marginTop: '6px', fontFamily: 'DM Sans, sans-serif' }}>
            Up to 4 photos — show examples of your work
          </div>
        </div>

        {/* ── Location pill ────────────────────────────────────────────────────── */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          padding: '10px 14px', borderRadius: '10px',
          background: '#161B22', border: '1px solid rgba(255,255,255,0.07)',
        }}>
          <span style={{ fontSize: '14px' }}>📍</span>
          <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: 'rgba(255,255,255,0.45)' }}>
            Will be posted in <strong style={{ color: '#fff' }}>{suburb}</strong>
          </span>
        </div>

        {/* ── Error ───────────────────────────────────────────────────────────── */}
        {error && (
          <div style={{
            background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
            borderRadius: '10px', padding: '10px 14px',
            fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: '#FCA5A5',
          }}>
            {error}
          </div>
        )}

        {/* ── Submit ──────────────────────────────────────────────────────────── */}
        <button
          onClick={handleSubmit}
          disabled={!canSubmit || submitting}
          style={{
            width: '100%', padding: '16px', borderRadius: '14px',
            background: canSubmit && !submitting ? '#39D98A' : 'rgba(255,255,255,0.07)',
            border: 'none',
            color: canSubmit && !submitting ? '#000' : 'rgba(255,255,255,0.2)',
            fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '16px',
            cursor: canSubmit && !submitting ? 'pointer' : 'default',
            transition: 'all 0.15s',
            boxShadow: canSubmit && !submitting ? '0 4px 20px rgba(57,217,138,0.3)' : 'none',
          }}
        >
          {submitting ? 'Posting…' : 'Post Your Skill'}
        </button>

        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.2)', textAlign: 'center', margin: 0 }}>
          By posting you agree to Kayaa's community guidelines
        </p>
      </div>
    </div>
  );
}
