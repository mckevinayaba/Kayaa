import { useEffect, useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import { X } from 'lucide-react';
import ShareCard from './ShareCard';
import type { ShareCardData, ShareCardType } from './ShareCard';

// ─── Caption builders ─────────────────────────────────────────────────────────

function buildCaption(card: ShareCardData): { text: string; url: string } {
  switch (card.type) {
    case 'place':
      return {
        text: `Check out ${card.data.name} on kayaa — https://kayaa.co.za/venue/${card.data.slug}`,
        url: `https://kayaa.co.za/venue/${card.data.slug}`,
      };
    case 'event':
      return {
        text: `${card.data.title} at ${card.data.venueName} on ${new Date(card.data.startsAt).toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short' })} — https://kayaa.co.za/venue/${card.data.venueSlug}`,
        url: `https://kayaa.co.za/venue/${card.data.venueSlug}`,
      };
    case 'job':
      return {
        text: `Opportunity: ${card.data.title} in ${card.data.neighborhood} — https://kayaa.co.za/jobs`,
        url: 'https://kayaa.co.za/jobs',
      };
    case 'skill':
      return {
        text: `${card.data.personName} offers ${card.data.skillName} in ${card.data.neighborhood}. Find them on kayaa — https://kayaa.co.za/jobs`,
        url: 'https://kayaa.co.za/jobs',
      };
    case 'milestone':
      return {
        text: `Visit ${card.data.visitNumber} at ${card.data.placeName}! I'm a regular on kayaa — https://kayaa.co.za/venue/${card.data.placeSlug}`,
        url: `https://kayaa.co.za/venue/${card.data.placeSlug}`,
      };
    case 'regular_card':
      return {
        text: `My neighbourhood regulars card on kayaa — https://kayaa.co.za`,
        url: 'https://kayaa.co.za',
      };
  }
}

function buildFilename(type: ShareCardType, card: ShareCardData): string {
  switch (card.type) {
    case 'place':        return `kayaa-place-${card.data.slug}.png`;
    case 'event':        return `kayaa-event-${card.data.title.toLowerCase().replace(/\s+/g, '-').slice(0, 30)}.png`;
    case 'job':          return `kayaa-job-${card.data.title.toLowerCase().replace(/\s+/g, '-').slice(0, 30)}.png`;
    case 'skill':        return `kayaa-skill-${card.data.skillName.toLowerCase().replace(/\s+/g, '-').slice(0, 30)}.png`;
    case 'milestone':    return `kayaa-milestone-visit-${card.data.visitNumber}.png`;
    case 'regular_card': return `kayaa-regular-card-${card.data.name.toLowerCase().replace(/\s+/g, '-')}.png`;
    default:             return `kayaa-${type}.png`;
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

type ShareModalProps = ShareCardData & {
  isOpen: boolean;
  onClose: () => void;
};

export default function ShareModal(props: ShareModalProps) {
  const { isOpen, onClose } = props;

  const cardRef = useRef<HTMLDivElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pngBlob, setPngBlob] = useState<Blob | null>(null);
  const [generating, setGenerating] = useState(false);
  const [downloadLabel, setDownloadLabel] = useState('Download image');
  const [copyLabel, setCopyLabel] = useState('Copy link');

  const { text: caption, url: shareUrl } = buildCaption(props);
  const filename = buildFilename(props.type, props);

  // Generate card image whenever modal opens
  useEffect(() => {
    if (!isOpen) {
      setPreviewUrl(null);
      setPngBlob(null);
      return;
    }

    // Wait a tick for ShareCard to mount off-screen
    const id = setTimeout(async () => {
      const el = cardRef.current?.firstElementChild as HTMLElement | null;
      if (!el) return;
      setGenerating(true);
      try {
        const canvas = await html2canvas(el, {
          backgroundColor: '#0D1117',
          scale: 2,
          logging: false,
          useCORS: true,
        });
        canvas.toBlob(blob => {
          if (!blob) return;
          setPngBlob(blob);
          setPreviewUrl(URL.createObjectURL(blob));
          setGenerating(false);
        }, 'image/png');
      } catch {
        setGenerating(false);
      }
    }, 80);

    return () => clearTimeout(id);
  }, [isOpen]);

  // Revoke preview URL on unmount to avoid memory leaks
  useEffect(() => {
    return () => { if (previewUrl) URL.revokeObjectURL(previewUrl); };
  }, [previewUrl]);

  if (!isOpen) return null;

  function handleWhatsApp() {
    window.open(`https://wa.me/?text=${encodeURIComponent(caption)}`, '_blank', 'noopener');
  }

  function handleDownload() {
    if (!pngBlob) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(pngBlob);
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    setDownloadLabel('Saved! ✓');
    setTimeout(() => setDownloadLabel('Download image'), 2500);
  }

  function handleCopyLink() {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopyLabel('Copied! ✓');
      setTimeout(() => setCopyLabel('Copy link'), 2000);
    });
  }

  async function handleNativeShare() {
    if (pngBlob && navigator.share && navigator.canShare) {
      const file = new File([pngBlob], filename, { type: 'image/png' });
      if (navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({ files: [file], text: caption, url: shareUrl });
          return;
        } catch {
          // user cancelled or unsupported — fall through
        }
      }
    }
    // Fallback: open image in new tab for manual saving
    if (previewUrl) window.open(previewUrl, '_blank', 'noopener');
  }

  // Strip the card data into just the discriminated union for ShareCard
  const cardProps = (() => {
    const { isOpen: _a, onClose: _b, ...rest } = props;
    return rest as ShareCardData;
  })();

  return (
    <>
      {/* Off-screen card for capture */}
      <ShareCard ref={cardRef} {...cardProps} />

      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 200,
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(4px)',
        }}
      />

      {/* Bottom sheet */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 201,
        background: 'var(--color-surface)',
        borderTop: '1px solid var(--color-border)',
        borderRadius: '20px 20px 0 0',
        padding: '20px 20px 40px',
        maxWidth: '480px',
        margin: '0 auto',
      }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '16px', color: 'var(--color-text)' }}>
            Share
          </span>
          <button
            onClick={onClose}
            style={{
              background: 'var(--color-bg)', border: '1px solid var(--color-border)',
              borderRadius: '50%', width: '32px', height: '32px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <X size={16} color="var(--color-muted)" />
          </button>
        </div>

        {/* Card preview */}
        <div style={{
          display: 'flex', justifyContent: 'center',
          marginBottom: '20px', minHeight: '168px', alignItems: 'center',
        }}>
          {generating || !previewUrl ? (
            <div style={{
              width: '160px', height: '160px', borderRadius: '12px',
              background: 'var(--color-bg)', border: '1px solid var(--color-border)',
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', gap: '10px',
            }}>
              <style>{`@keyframes scSpin { to { transform: rotate(360deg); } }`}</style>
              <div style={{
                width: '24px', height: '24px', borderRadius: '50%',
                border: '2px solid rgba(57,217,138,0.2)', borderTopColor: '#39D98A',
                animation: 'scSpin 0.8s linear infinite',
              }} />
              <span style={{ fontSize: '11px', color: 'var(--color-muted)', textAlign: 'center' }}>
                Creating your card…
              </span>
            </div>
          ) : (
            <img
              src={previewUrl}
              alt="Share card preview"
              style={{ width: '160px', height: '160px', borderRadius: '12px', objectFit: 'cover', display: 'block' }}
            />
          )}
        </div>

        {/* WhatsApp — primary CTA */}
        <button
          onClick={handleWhatsApp}
          style={{
            width: '100%', padding: '14px',
            background: '#25D366', border: 'none',
            borderRadius: '12px', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '15px',
            color: '#000', marginBottom: '10px',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="#000" xmlns="http://www.w3.org/2000/svg">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
          Share on WhatsApp
        </button>

        {/* Secondary actions */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
          <button
            onClick={handleDownload}
            disabled={!pngBlob}
            style={{
              flex: 1, padding: '12px 8px',
              background: 'var(--color-bg)', border: '1px solid var(--color-border)',
              borderRadius: '12px', cursor: pngBlob ? 'pointer' : 'default',
              fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: '13px',
              color: pngBlob ? 'var(--color-text)' : 'var(--color-muted)',
              opacity: pngBlob ? 1 : 0.5,
              transition: 'color 0.2s',
            }}
          >
            {downloadLabel}
          </button>
          <button
            onClick={handleCopyLink}
            style={{
              flex: 1, padding: '12px 8px',
              background: 'var(--color-bg)', border: '1px solid var(--color-border)',
              borderRadius: '12px', cursor: 'pointer',
              fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: '13px',
              color: 'var(--color-text)',
              transition: 'color 0.2s',
            }}
          >
            {copyLabel}
          </button>
          <button
            onClick={handleNativeShare}
            disabled={!pngBlob}
            style={{
              flex: 1, padding: '12px 8px',
              background: 'var(--color-bg)', border: '1px solid var(--color-border)',
              borderRadius: '12px', cursor: pngBlob ? 'pointer' : 'default',
              fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: '13px',
              color: pngBlob ? 'var(--color-text)' : 'var(--color-muted)',
              opacity: pngBlob ? 1 : 0.5,
            }}
          >
            More
          </button>
        </div>

        {/* Footer tagline */}
        <p style={{
          textAlign: 'center', fontSize: '11px',
          color: 'rgba(255,255,255,0.28)',
          fontFamily: 'DM Sans, sans-serif',
          lineHeight: 1.5,
        }}>
          Every place that makes a neighbourhood. One network.
        </p>
      </div>
    </>
  );
}
