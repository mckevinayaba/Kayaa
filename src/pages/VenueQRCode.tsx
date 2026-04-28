import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Download, Printer, Copy, Check, Share2 } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { useAuth } from '../contexts/AuthContext';
import { getVenueOwnerByUserId, getVenueById } from '../lib/api';
import type { Venue } from '../types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function checkinUrl(venueId: string): string {
  return `${window.location.origin}/checkin/${venueId}`;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function VenueQRCode() {
  const { user }  = useAuth();
  const navigate  = useNavigate();
  const qrRef     = useRef<HTMLDivElement>(null);

  const [venue,   setVenue]   = useState<Venue | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied,  setCopied]  = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const ownership = await getVenueOwnerByUserId(user.id);
      if (!ownership) { setLoading(false); return; }
      const v = await getVenueById(ownership.venueId);
      setVenue(v);
      setLoading(false);
    })();
  }, [user]);

  // ── Download PNG ──────────────────────────────────────────────────────────
  function downloadQR() {
    if (!venue) return;
    const sourceCanvas = qrRef.current?.querySelector('canvas') as HTMLCanvasElement | null;
    if (!sourceCanvas) return;

    const size = 512;
    const out  = document.createElement('canvas');
    out.width  = size;
    out.height = size;
    const ctx  = out.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);
    ctx.drawImage(sourceCanvas, 0, 0, size, size);

    const a = document.createElement('a');
    a.href     = out.toDataURL('image/png');
    a.download = `kayaa-qr-${venue.slug}.png`;
    a.click();
  }

  // ── Print card ────────────────────────────────────────────────────────────
  function printCard() {
    if (!venue) return;
    const canvas  = qrRef.current?.querySelector('canvas') as HTMLCanvasElement | null;
    const dataUrl = canvas ? canvas.toDataURL('image/png') : '';
    const win     = window.open('', '_blank');
    if (!win) return;

    win.document.write(`
      <!DOCTYPE html><html><head>
        <title>Kayaa Check-In Card — ${venue.name}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans&display=swap');
          * { margin:0; padding:0; box-sizing:border-box; }
          body { background:#fff; display:flex; align-items:center; justify-content:center; min-height:100vh; font-family:'DM Sans',sans-serif; }
          .card { width:148mm; border:2.5px solid #39D98A; border-radius:16px; padding:24px; display:flex; flex-direction:column; align-items:center; gap:12px; text-align:center; }
          .badge { background:#39D98A; color:#000; font-family:'Syne',sans-serif; font-weight:800; font-size:11px; padding:4px 14px; border-radius:20px; text-transform:uppercase; letter-spacing:0.05em; }
          h1 { font-family:'Syne',sans-serif; font-weight:800; font-size:20px; color:#0D1117; }
          .sub { font-size:12px; color:#555; line-height:1.5; }
          img { width:200px; height:200px; }
          .url { font-size:10px; color:#888; margin-top:2px; }
          @media print { body { margin:0; } }
        </style>
      </head><body>
        <div class="card">
          <div class="badge">Check in here 📍</div>
          <h1>${venue.name}</h1>
          <p class="sub">${venue.neighborhood}, ${venue.city}</p>
          ${dataUrl ? `<img src="${dataUrl}" alt="QR Code" />` : ''}
          <p class="sub">Scan with your phone camera to check in and earn your regular badge on Kayaa</p>
          <div class="url">kayaa.co.za/checkin/${venue.id.slice(0, 8)}…</div>
        </div>
        <script>window.onload = () => window.print();<\/script>
      </body></html>
    `);
    win.document.close();
  }

  // ── Copy link ─────────────────────────────────────────────────────────────
  async function copyLink() {
    if (!venue) return;
    await navigator.clipboard.writeText(checkinUrl(venue.id));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // ── Skeleton ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ padding: '70px 16px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
        <div style={{ width: '240px', height: '240px', background: 'rgba(255,255,255,0.04)', borderRadius: '20px' }} />
        <div style={{ width: '200px', height: '20px', background: 'rgba(255,255,255,0.04)', borderRadius: '8px' }} />
      </div>
    );
  }

  if (!venue) {
    return (
      <div style={{ padding: '80px 24px', textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏪</div>
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: 'rgba(255,255,255,0.5)', marginBottom: '16px' }}>
          No venue found. Add your place first.
        </p>
        <Link to="/onboarding" style={{ color: '#39D98A', fontFamily: 'DM Sans, sans-serif', fontWeight: 700, fontSize: '14px', textDecoration: 'none' }}>
          Add Your Place →
        </Link>
      </div>
    );
  }

  const qrValue = checkinUrl(venue.id);

  return (
    <div style={{ paddingBottom: '100px' }}>

      {/* ── Sticky header ─────────────────────────────────────────────── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 40,
        background: 'rgba(13,17,23,0.94)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid #21262D',
        padding: '12px 16px',
        display: 'flex', alignItems: 'center', gap: '12px',
      }}>
        <button
          onClick={() => navigate(-1)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
        >
          <ArrowLeft size={20} color="rgba(255,255,255,0.6)" />
        </button>
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '16px', color: '#F0F6FC', margin: 0, flex: 1 }}>
          Check-In QR Code
        </h1>
        <button
          onClick={() => { if (navigator.share) { navigator.share({ title: venue.name, url: qrValue }); } else { copyLink(); } }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px', display: 'flex', alignItems: 'center' }}
        >
          <Share2 size={18} color="rgba(255,255,255,0.5)" />
        </button>
      </div>

      <div style={{ padding: '24px 16px' }}>

        {/* ── Venue name ────────────────────────────────────────────────── */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '20px', color: '#F0F6FC', marginBottom: '4px' }}>
            {venue.name}
          </div>
          <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>
            {venue.neighborhood}, {venue.city}
          </div>
        </div>

        {/* ── QR code ───────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
          <div
            ref={qrRef}
            style={{
              background: '#ffffff', padding: '20px',
              borderRadius: '20px', boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
              display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '12px',
            }}
          >
            <QRCodeCanvas value={qrValue} size={220} level="M" marginSize={0} />
            <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '10px', color: '#555', textAlign: 'center', maxWidth: '220px', lineHeight: 1.4 }}>
              Scan to check in · kayaa.co.za
            </div>
          </div>
        </div>

        {/* ── URL chip ─────────────────────────────────────────────────── */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          background: '#161B22', border: '1px solid #21262D',
          borderRadius: '12px', padding: '10px 14px', marginBottom: '20px',
        }}>
          <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: 'rgba(255,255,255,0.5)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {qrValue}
          </span>
          <button
            onClick={copyLink}
            style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              padding: '5px 10px', borderRadius: '8px', border: 'none',
              background: copied ? 'rgba(57,217,138,0.15)' : 'rgba(255,255,255,0.07)',
              fontFamily: 'DM Sans, sans-serif', fontWeight: 700, fontSize: '11px',
              color: copied ? '#39D98A' : 'rgba(255,255,255,0.5)',
              cursor: 'pointer', flexShrink: 0,
            }}
          >
            {copied ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy</>}
          </button>
        </div>

        {/* ── Action buttons ────────────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
          <button
            onClick={downloadQR}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              width: '100%', padding: '16px', borderRadius: '14px', border: 'none',
              background: '#39D98A',
              fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '15px', color: '#000',
              cursor: 'pointer',
            }}
          >
            <Download size={16} />
            Download QR as PNG
          </button>
          <button
            onClick={printCard}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              width: '100%', padding: '16px', borderRadius: '14px',
              background: 'transparent', border: '1px solid #30363D',
              fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '15px', color: '#F0F6FC',
              cursor: 'pointer',
            }}
          >
            <Printer size={16} />
            Print Check-In Card
          </button>
        </div>

        {/* ── Placement tips ─────────────────────────────────────────────── */}
        <div style={{
          background: '#161B22', border: '1px solid #21262D',
          borderRadius: '14px', padding: '16px',
        }}>
          <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '13px', color: '#F0F6FC', marginBottom: '10px' }}>
            📌 Placement tips
          </div>
          {[
            'Stick at eye level at your counter or entrance',
            'Print at least A5 size — easier to scan from a distance',
            'Works with any smartphone camera — no app required',
            'The link never changes — print once, keep forever',
            'Place a second copy near the exit to catch last-minute check-ins',
          ].map((tip, i) => (
            <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: i < 4 ? '8px' : '0' }}>
              <span style={{ color: '#39D98A', fontSize: '12px', flexShrink: 0, marginTop: '1px' }}>✓</span>
              <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>
                {tip}
              </span>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
