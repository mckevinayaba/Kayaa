import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Zap, TrendingUp, Star, CheckCircle2 } from 'lucide-react';

// ─── Plan config ──────────────────────────────────────────────────────────────

const PLANS = [
  {
    tier: 'free',
    name: 'Free',
    price: 'R0 / month',
    tagline: 'Everything you need to get started',
    accent: 'rgba(255,255,255,0.4)',
    bg: 'rgba(255,255,255,0.03)',
    border: 'rgba(255,255,255,0.1)',
    badge: null,
    features: [
      'Public venue page',
      'QR code check-ins',
      'Community check-in feed',
      'Opening hours & contact',
      'Basic analytics',
      'Event listings',
      'Regulars tracking',
    ],
    available: true,
  },
  {
    tier: 'starter',
    name: 'Starter',
    price: 'Coming soon',
    tagline: 'More reach for growing places',
    accent: '#39D98A',
    bg: 'rgba(57,217,138,0.05)',
    border: 'rgba(57,217,138,0.25)',
    badge: 'SOON',
    features: [
      'Everything in Free',
      'Priority placement in neighbourhood feed',
      'Verified owner badge',
      'Direct message regulars',
      'Promotional post pinning',
      'Weekly performance digest',
    ],
    available: false,
  },
  {
    tier: 'pro',
    name: 'Pro',
    price: 'Coming soon',
    tagline: 'For places that run on community',
    accent: '#FBBF24',
    bg: 'rgba(251,191,36,0.05)',
    border: 'rgba(251,191,36,0.25)',
    badge: 'SOON',
    features: [
      'Everything in Starter',
      'Featured placement across city',
      'Sponsored category spotlight',
      'Partner integrations',
      'Advanced regulars insights',
      'Custom neighbourhood pin',
    ],
    available: false,
  },
] as const;

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function VenueBoostPage() {
  const navigate = useNavigate();

  const waNumber  = import.meta.env.VITE_KAYAA_WA_NUMBER ?? '27600000000';
  const waMessage = encodeURIComponent('Hi Kayaa, I want to know when paid plans launch for venue owners.');

  return (
    <div style={{ paddingBottom: '100px' }}>

      {/* ── Sticky header ───────────────────────────────────────────────── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 40,
        background: 'rgba(13,17,23,0.94)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--color-border)',
        padding: '12px 16px',
        display: 'flex', alignItems: 'center', gap: '12px',
      }}>
        <button
          onClick={() => navigate(-1)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex' }}
        >
          <ArrowLeft size={20} color="rgba(255,255,255,0.6)" />
        </button>
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '16px', color: '#F0F6FC', margin: 0 }}>
          Boost Your Place
        </h1>
      </div>

      <div style={{ padding: '20px 16px' }}>

        {/* ── Hero ───────────────────────────────────────────────────────── */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(57,217,138,0.08) 0%, rgba(251,191,36,0.05) 100%)',
          border: '1px solid rgba(57,217,138,0.15)',
          borderRadius: '18px', padding: '24px 20px', marginBottom: '28px', textAlign: 'center',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '10px' }}>
            <Zap size={20} color="#39D98A" />
            <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '20px', color: '#F0F6FC' }}>
              Plans launching soon
            </span>
          </div>
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: 'rgba(255,255,255,0.55)', lineHeight: 1.65, margin: '0 0 18px' }}>
            Kayaa is building paid plans for owners who want more reach in their neighbourhood.
            Everything that exists today stays free — always.
          </p>
          <a
            href={`https://wa.me/${waNumber}?text=${waMessage}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              padding: '12px 24px', borderRadius: '12px', textDecoration: 'none',
              background: 'rgba(37,211,102,0.12)', border: '1px solid rgba(37,211,102,0.3)',
              fontFamily: 'DM Sans, sans-serif', fontWeight: 700, fontSize: '13px',
              color: '#25D366',
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="#25D366">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            Notify me when plans launch
          </a>
        </div>

        {/* ── Plan cards ──────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {PLANS.map(plan => (
            <div
              key={plan.tier}
              style={{
                background: plan.bg,
                border: `1px solid ${plan.border}`,
                borderRadius: '16px', padding: '18px 18px 16px',
                opacity: plan.available ? 1 : 0.85,
              }}
            >
              {/* Header row */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '6px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '17px', color: plan.accent }}>
                      {plan.name}
                    </span>
                    {plan.badge && (
                      <span style={{
                        fontFamily: 'DM Sans, sans-serif', fontWeight: 800, fontSize: '9px',
                        color: '#0D1117', background: plan.accent,
                        borderRadius: '5px', padding: '2px 6px', letterSpacing: '0.04em',
                      }}>
                        {plan.badge}
                      </span>
                    )}
                    {plan.available && (
                      <span style={{
                        fontFamily: 'DM Sans, sans-serif', fontWeight: 700, fontSize: '9px',
                        color: '#39D98A', background: 'rgba(57,217,138,0.12)',
                        border: '1px solid rgba(57,217,138,0.25)',
                        borderRadius: '5px', padding: '2px 6px',
                      }}>
                        ACTIVE
                      </span>
                    )}
                  </div>
                  <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: 'rgba(255,255,255,0.4)', margin: '3px 0 0', lineHeight: 1.4 }}>
                    {plan.tagline}
                  </p>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '12px' }}>
                  {plan.tier === 'free'
                    ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <TrendingUp size={13} color="#39D98A" />
                        <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '13px', color: '#39D98A' }}>
                          Free forever
                        </span>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Star size={12} color={plan.accent as string} />
                        <span style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 700, fontSize: '12px', color: plan.accent as string }}>
                          {plan.price}
                        </span>
                      </div>
                    )
                  }
                </div>
              </div>

              {/* Feature list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '7px', marginTop: '14px' }}>
                {plan.features.map(f => (
                  <div key={f} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle2
                      size={13}
                      color={plan.available ? '#39D98A' : 'rgba(255,255,255,0.2)'}
                      style={{ flexShrink: 0 }}
                    />
                    <span style={{
                      fontFamily: 'DM Sans, sans-serif', fontSize: '13px',
                      color: plan.available ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.4)',
                      lineHeight: 1.4,
                    }}>
                      {f}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* ── Footer note ──────────────────────────────────────────────────── */}
        <p style={{
          fontFamily: 'DM Sans, sans-serif', fontSize: '12px',
          color: 'rgba(255,255,255,0.25)', textAlign: 'center',
          lineHeight: 1.6, marginTop: '24px',
        }}>
          Free features will never be moved to paid tiers.{'\n'}Paid plans only add new reach and visibility tools.
        </p>

      </div>
    </div>
  );
}
