import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Search, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getCategoryEmoji } from '../lib/venueUtils';

// ─── Types ────────────────────────────────────────────────────────────────────

type ClaimRole = 'owner' | 'manager' | 'representative';

const CLAIM_ROLES: { value: ClaimRole; label: string; desc: string }[] = [
  { value: 'owner',          label: 'Owner',          desc: 'This is my business'           },
  { value: 'manager',        label: 'Manager',        desc: 'I manage this place'           },
  { value: 'representative', label: 'Representative', desc: 'I act on behalf of the owner'  },
];

interface VenueResult {
  id:           string;
  name:         string;
  slug:         string;
  category:     string;
  neighborhood: string;
  city:         string;
  ownerClaimed: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function searchVenuesForClaim(query: string): Promise<VenueResult[]> {
  if (!query.trim()) return [];
  const { data } = await supabase
    .from('venues')
    .select('id, name, slug, type, location, owner_claimed')
    .ilike('name', `%${query.trim()}%`)
    .limit(8);

  return (data ?? []).map(row => {
    const parts = (row.location ?? '').split(',').map((s: string) => s.trim());
    const city         = parts.length > 1 ? parts[parts.length - 1] : row.location ?? '';
    const neighborhood = parts.length > 1 ? parts.slice(0, parts.length - 1).join(', ') : '';
    return {
      id:           row.id,
      name:         row.name,
      slug:         row.slug,
      category:     row.type ?? '',
      neighborhood,
      city,
      ownerClaimed: row.owner_claimed ?? false,
    };
  });
}

// ─── Field style ──────────────────────────────────────────────────────────────

const FIELD: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box',
  background: '#161B22',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '10px', padding: '12px 14px',
  fontFamily: 'Inter, sans-serif', fontSize: '14px',
  color: '#F0F6FC', outline: 'none',
};

// ─── Claim form (shown after a venue is selected) ─────────────────────────────

function ClaimForm({ venue, onBack, onDone }: {
  venue: VenueResult;
  onBack: () => void;
  onDone: () => void;
}) {
  const [form, setForm] = useState({
    name: '', email: '', phone: '',
    role: 'owner' as ClaimRole,
    message: '',
    confirmed: false,
  });
  const [status, setStatus] = useState<'idle' | 'submitting' | 'done' | 'error'>('idle');

  const canSubmit =
    form.confirmed && !!form.name.trim() && !!form.email.trim() && status !== 'submitting';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setStatus('submitting');
    try {
      const { error } = await supabase.from('claimed_requests').insert({
        venue_id:           venue.id,
        venue_name:         venue.name,
        name:               form.name.trim(),
        email:              form.email.trim().toLowerCase(),
        phone:              form.phone.trim() || null,
        role:               form.role,
        message:            form.message.trim() || null,
        is_owner_confirmed: form.confirmed,
      });
      if (error) throw error;
      setStatus('done');
    } catch {
      setStatus('error');
    }
  }

  if (status === 'done') {
    return (
      <div style={{ textAlign: 'center', padding: '48px 24px' }}>
        <div style={{ fontSize: '56px', marginBottom: '16px' }}>✅</div>
        <h2 style={{
          fontFamily: 'Inter, sans-serif', fontWeight: 800, fontSize: '20px',
          color: '#F0F6FC', margin: '0 0 10px',
        }}>
          Request received
        </h2>
        <p style={{
          fontFamily: 'Inter, sans-serif', fontSize: '14px',
          color: 'rgba(255,255,255,0.5)', lineHeight: 1.65, margin: '0 0 28px',
        }}>
          We'll review your claim for <strong style={{ color: '#F0F6FC' }}>{venue.name}</strong>{' '}
          and reply to <strong style={{ color: '#F0F6FC' }}>{form.email}</strong> within 24 hours.
        </p>
        <button
          onClick={onDone}
          style={{
            background: '#39D98A', color: '#0D1117',
            border: 'none', borderRadius: '20px', padding: '12px 32px',
            fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '14px',
            cursor: 'pointer',
          }}
        >
          Done
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Selected venue banner */}
      <button
        onClick={onBack}
        style={{
          width: '100%', textAlign: 'left',
          background: 'rgba(57,217,138,0.07)',
          border: '1px solid rgba(57,217,138,0.2)',
          borderRadius: '12px', padding: '12px 14px',
          cursor: 'pointer', marginBottom: '20px',
          display: 'flex', alignItems: 'center', gap: '10px',
        }}
      >
        <span style={{ fontSize: '20px', flexShrink: 0 }}>
          {getCategoryEmoji(venue.category)}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '14px',
            color: '#F0F6FC', lineHeight: 1.3,
            overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
          }}>
            {venue.name}
          </div>
          <div style={{
            fontFamily: 'Inter, sans-serif', fontSize: '12px',
            color: 'rgba(255,255,255,0.45)', marginTop: '2px',
          }}>
            {venue.neighborhood}{venue.city ? `, ${venue.city}` : ''}
          </div>
        </div>
        <span style={{
          fontFamily: 'Inter, sans-serif', fontSize: '11px',
          color: '#39D98A', flexShrink: 0,
        }}>
          Change ↩
        </span>
      </button>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

        {/* Role picker */}
        <div>
          <p style={{
            fontFamily: 'Inter, sans-serif', fontSize: '11px', fontWeight: 700,
            color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase',
            letterSpacing: '0.06em', margin: '0 0 8px',
          }}>
            Your role
          </p>
          <div style={{ display: 'flex', gap: '8px' }}>
            {CLAIM_ROLES.map(r => (
              <button
                key={r.value}
                type="button"
                onClick={() => setForm(f => ({ ...f, role: r.value }))}
                style={{
                  flex: 1, padding: '10px 6px', borderRadius: '10px', cursor: 'pointer',
                  background: form.role === r.value
                    ? 'rgba(57,217,138,0.1)' : 'rgba(255,255,255,0.04)',
                  border: form.role === r.value
                    ? '1.5px solid rgba(57,217,138,0.4)' : '1px solid rgba(255,255,255,0.08)',
                  transition: 'all 0.15s', textAlign: 'center',
                }}
              >
                <div style={{
                  fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '12px',
                  color: form.role === r.value ? '#39D98A' : '#F0F6FC',
                }}>
                  {r.label}
                </div>
                <div style={{
                  fontFamily: 'Inter, sans-serif', fontSize: '10px',
                  color: 'rgba(255,255,255,0.4)', marginTop: '2px',
                }}>
                  {r.desc}
                </div>
              </button>
            ))}
          </div>
        </div>

        <input
          type="text" placeholder="Your full name" value={form.name} required
          onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          style={FIELD}
        />
        <input
          type="email" placeholder="Email address" value={form.email} required
          onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
          style={FIELD}
        />
        <input
          type="tel" placeholder="Phone number (optional)" value={form.phone}
          onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
          style={FIELD}
        />
        <textarea
          placeholder='Anything that helps verify you — e.g. "I opened this barbershop in 2019" (optional)'
          value={form.message} rows={3}
          onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
          style={{ ...FIELD, resize: 'none', lineHeight: 1.5 }}
        />

        {/* Confirmation */}
        <label style={{
          display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer',
          padding: '12px 14px',
          background: 'rgba(255,255,255,0.04)',
          border: `1px solid ${form.confirmed ? 'rgba(57,217,138,0.3)' : 'rgba(255,255,255,0.08)'}`,
          borderRadius: '10px', transition: 'border-color 0.15s',
        }}>
          <input
            type="checkbox" checked={form.confirmed}
            onChange={e => setForm(f => ({ ...f, confirmed: e.target.checked }))}
            style={{ marginTop: '2px', accentColor: '#39D98A', flexShrink: 0 }}
          />
          <span style={{
            fontFamily: 'Inter, sans-serif', fontSize: '13px',
            color: 'rgba(255,255,255,0.7)', lineHeight: 1.55,
          }}>
            I confirm I am authorised to manage{' '}
            <strong style={{ color: '#F0F6FC' }}>{venue.name}</strong>{' '}
            and that this information is accurate.
          </span>
        </label>

        {status === 'error' && (
          <p style={{
            fontFamily: 'Inter, sans-serif', fontSize: '12px',
            color: '#EF4444', margin: 0,
          }}>
            Something went wrong — please try again.
          </p>
        )}

        <button
          type="submit"
          disabled={!canSubmit}
          style={{
            background: canSubmit ? '#39D98A' : 'rgba(57,217,138,0.15)',
            color: canSubmit ? '#0D1117' : 'rgba(255,255,255,0.2)',
            border: 'none', borderRadius: '12px', padding: '15px',
            fontFamily: 'Inter, sans-serif', fontWeight: 800, fontSize: '15px',
            cursor: canSubmit ? 'pointer' : 'not-allowed',
            transition: 'all 0.2s',
          }}
        >
          {status === 'submitting' ? 'Sending…' : 'Send claim request'}
        </button>
      </form>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ClaimBusinessPage() {
  const navigate = useNavigate();
  const [query,   setQuery]   = useState('');
  const [results, setResults] = useState<VenueResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<VenueResult | null>(null);
  const [claimed,  setClaimed]  = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced search
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!query.trim()) { setResults([]); setLoading(false); return; }
    setLoading(true);
    timerRef.current = setTimeout(async () => {
      const r = await searchVenuesForClaim(query);
      setResults(r);
      setLoading(false);
    }, 300);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [query]);

  if (claimed) {
    return (
      <div style={{
        minHeight: '100dvh', background: '#0D1117',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '32px 24px', textAlign: 'center',
      }}>
        <div style={{ fontSize: '56px', marginBottom: '16px' }}>✅</div>
        <h2 style={{
          fontFamily: 'Inter, sans-serif', fontWeight: 800, fontSize: '20px',
          color: '#F0F6FC', margin: '0 0 10px',
        }}>
          Claim request sent
        </h2>
        <p style={{
          fontFamily: 'Inter, sans-serif', fontSize: '14px',
          color: 'rgba(255,255,255,0.5)', lineHeight: 1.65, margin: '0 0 28px',
        }}>
          We'll be in touch within 24 hours.
        </p>
        <button
          onClick={() => navigate('/feed')}
          style={{
            background: '#39D98A', color: '#0D1117',
            border: 'none', borderRadius: '20px', padding: '12px 32px',
            fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '14px',
            cursor: 'pointer',
          }}
        >
          Back to feed
        </button>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100dvh', background: '#0D1117' }}>

      {/* Header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: 'rgba(13,17,23,0.97)', backdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        padding: '14px 16px',
        display: 'flex', alignItems: 'center', gap: '12px',
      }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: '4px',
            display: 'flex', alignItems: 'center',
          }}
        >
          <ArrowLeft size={20} color="rgba(255,255,255,0.6)" />
        </button>
        <div>
          <h1 style={{
            fontFamily: 'Inter, sans-serif', fontWeight: 800, fontSize: '17px',
            color: '#F0F6FC', margin: 0, lineHeight: 1.2,
          }}>
            Claim your business
          </h1>
          <p style={{
            fontFamily: 'Inter, sans-serif', fontSize: '12px',
            color: 'rgba(255,255,255,0.4)', margin: '2px 0 0', lineHeight: 1,
          }}>
            Already on Kayaa? Take control of your page.
          </p>
        </div>
      </div>

      <div style={{ padding: '20px 16px 80px' }}>

        {selected ? (
          // ── Step 2: Claim form ────────────────────────────────────────────
          <ClaimForm
            venue={selected}
            onBack={() => setSelected(null)}
            onDone={() => setClaimed(true)}
          />
        ) : (
          // ── Step 1: Search ────────────────────────────────────────────────
          <>
            {/* Search input */}
            <div style={{
              position: 'relative', marginBottom: '16px',
            }}>
              <Search
                size={16}
                color="rgba(255,255,255,0.35)"
                style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }}
              />
              <input
                type="text"
                placeholder="Search by business name…"
                value={query}
                onChange={e => setQuery(e.target.value)}
                autoFocus
                style={{
                  ...FIELD,
                  paddingLeft: '40px',
                  paddingRight: query ? '40px' : '14px',
                }}
              />
              {query && (
                <button
                  onClick={() => setQuery('')}
                  style={{
                    position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', padding: '4px',
                    display: 'flex', alignItems: 'center',
                  }}
                >
                  <X size={14} color="rgba(255,255,255,0.35)" />
                </button>
              )}
            </div>

            {/* Empty / prompt state */}
            {!query && (
              <p style={{
                fontFamily: 'Inter, sans-serif', fontSize: '14px',
                color: 'rgba(255,255,255,0.38)', textAlign: 'center',
                marginTop: '40px', lineHeight: 1.6,
              }}>
                Type the name of your business above to find it on Kayaa.
              </p>
            )}

            {/* Loading */}
            {loading && (
              <p style={{
                fontFamily: 'Inter, sans-serif', fontSize: '13px',
                color: 'rgba(255,255,255,0.3)', textAlign: 'center', marginTop: '24px',
              }}>
                Searching…
              </p>
            )}

            {/* Results */}
            {!loading && query && results.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
                {results.map(v => (
                  <button
                    key={v.id}
                    onClick={() => !v.ownerClaimed && setSelected(v)}
                    disabled={v.ownerClaimed}
                    style={{
                      width: '100%', textAlign: 'left',
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '12px', padding: '13px 14px',
                      cursor: v.ownerClaimed ? 'not-allowed' : 'pointer',
                      display: 'flex', alignItems: 'center', gap: '12px',
                      opacity: v.ownerClaimed ? 0.5 : 1,
                    }}
                  >
                    <span style={{ fontSize: '22px', flexShrink: 0 }}>
                      {getCategoryEmoji(v.category)}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '14px',
                        color: '#F0F6FC', lineHeight: 1.3,
                        overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
                      }}>
                        {v.name}
                      </div>
                      <div style={{
                        fontFamily: 'Inter, sans-serif', fontSize: '12px',
                        color: 'rgba(255,255,255,0.4)', marginTop: '2px',
                      }}>
                        {v.category}
                        {(v.neighborhood || v.city) && (
                          <> · {v.neighborhood || v.city}</>
                        )}
                      </div>
                    </div>
                    {v.ownerClaimed ? (
                      <span style={{
                        fontFamily: 'Inter, sans-serif', fontSize: '11px',
                        color: 'rgba(255,255,255,0.3)', flexShrink: 0,
                      }}>
                        Claimed
                      </span>
                    ) : (
                      <span style={{
                        fontFamily: 'Inter, sans-serif', fontSize: '11px',
                        color: '#39D98A', flexShrink: 0,
                      }}>
                        Claim →
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* No results */}
            {!loading && query && results.length === 0 && (
              <p style={{
                fontFamily: 'Inter, sans-serif', fontSize: '14px',
                color: 'rgba(255,255,255,0.38)', textAlign: 'center',
                marginTop: '24px', lineHeight: 1.6,
              }}>
                No businesses found matching "{query}"
              </p>
            )}

            {/* Fallback CTA */}
            {query.trim().length >= 2 && !loading && (
              <div style={{
                marginTop: '12px',
                padding: '16px', borderRadius: '12px',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.07)',
                textAlign: 'center',
              }}>
                <p style={{
                  fontFamily: 'Inter, sans-serif', fontSize: '13px',
                  color: 'rgba(255,255,255,0.45)', margin: '0 0 10px', lineHeight: 1.5,
                }}>
                  Can't find your business?
                </p>
                <Link
                  to="/onboarding"
                  style={{
                    display: 'inline-block',
                    fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '13px',
                    color: '#39D98A', textDecoration: 'none',
                  }}
                >
                  Add your business instead →
                </Link>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
