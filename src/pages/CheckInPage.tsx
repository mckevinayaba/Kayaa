// ─── CheckInPage ──────────────────────────────────────────────────────────────
//
// Route: /venue/:slug/checkin
//
// Flow:
//   loading_venue  →  gps_checking  →  (auto-confirm ≤300m)  →  saving  →  celebration
//                                  →  gps_far (>300m, confirm modal)
//                                  →  gps_denied (location off → manual / QR scan)
//                                  →  qr_scanning (camera scanner)
//   saving         →  duplicate     (already checked in within 3h)
//
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, QrCode } from 'lucide-react';
import { getVenueBySlug, saveVisit, getVisitorId } from '../lib/api';
import type { UserVenueScore } from '../lib/api';
import type { Venue } from '../types';
import { haversineKm } from '../lib/geocode';
import CelebrationScreen from '../components/CelebrationScreen';

// ── Category maps ─────────────────────────────────────────────────────────────

const CAT_EMOJI: Record<string, string> = {
  Barbershop: '✂️', Shisanyama: '🔥', Tavern: '🍺', Café: '☕',
  Church: '⛪', Carwash: '🚗', 'Spaza Shop': '🏪', Salon: '💅',
  Tutoring: '📚', 'Sports Ground': '⚽', 'Home Business': '🏠',
};

const CAT_COLOR: Record<string, string> = {
  Barbershop: '#39D98A', Shisanyama: '#F5A623', Tavern: '#60A5FA',
  Café: '#F59E0B', Church: '#A78BFA', Carwash: '#34D399',
  'Spaza Shop': '#60A5FA', Salon: '#F472B6', Tutoring: '#34D399',
  'Sports Ground': '#FB923C', 'Home Business': '#94A3B8',
};

// ── Step type ─────────────────────────────────────────────────────────────────

type Step =
  | 'loading_venue'   // fetching venue from API
  | 'gps_checking'    // requesting browser location
  | 'gps_far'         // user is >300m away — needs explicit confirm
  | 'gps_denied'      // location access denied or unavailable
  | 'qr_scanning'     // QR camera scanner open
  | 'saving'          // writing check-in to DB/localStorage
  | 'duplicate'       // already checked in within last 3 hours
  | 'celebration';    // success screen

// ── Spinner ───────────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <>
      <style>{`@keyframes ciSpin { to { transform: rotate(360deg); } }`}</style>
      <div style={{
        width: '32px', height: '32px', borderRadius: '50%',
        border: '3px solid rgba(57,217,138,0.25)',
        borderTopColor: '#39D98A',
        animation: 'ciSpin 0.7s linear infinite',
      }} />
    </>
  );
}

// ── QR Scanner ────────────────────────────────────────────────────────────────
//
// Uses the native BarcodeDetector Web API (Chrome/Android).
// Falls back to a manual URL paste field on unsupported browsers.

interface QRScannerProps {
  onDetect: (venueId: string) => void;
  onClose: () => void;
}

function QRScanner({ onDetect, onClose }: QRScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [msg, setMsg] = useState('Starting camera…');
  const [showManual, setShowManual] = useState(false);
  const [manualUrl, setManualUrl] = useState('');

  useEffect(() => {
    let stream: MediaStream | null = null;
    let rafId: number;
    let stopped = false;

    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
        });
        if (stopped) { stream.getTracks().forEach(t => t.stop()); return; }
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (!('BarcodeDetector' in window)) {
          setMsg('Auto-scan not supported here. Paste the check-in URL below.');
          setShowManual(true);
          return;
        }

        setMsg('Align the QR code in the frame');

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });

        async function scan() {
          if (stopped || !videoRef.current) return;
          try {
            const codes = await detector.detect(videoRef.current);
            for (const code of codes) {
              const m = (code.rawValue as string).match(/\/checkin\/([^/?#\s]+)/);
              if (m) {
                stopped = true;
                stream?.getTracks().forEach(t => t.stop());
                onDetect(m[1]);
                return;
              }
            }
          } catch { /* detector may throw on blank frames */ }
          rafId = requestAnimationFrame(scan);
        }

        videoRef.current?.addEventListener('playing', () => {
          rafId = requestAnimationFrame(scan);
        }, { once: true });

      } catch {
        setMsg("Couldn't access camera.");
        setShowManual(true);
      }
    }

    start();

    return () => {
      stopped = true;
      cancelAnimationFrame(rafId);
      stream?.getTracks().forEach(t => t.stop());
    };
  }, [onDetect]);

  function handleManual() {
    const m = manualUrl.match(/\/checkin\/([^/?#\s]+)/);
    if (m) onDetect(m[1]);
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: '#000', display: 'flex', flexDirection: 'column',
    }}>
      {/* Camera view */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <video
          ref={videoRef}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          playsInline
          muted
        />
        {/* Scan frame overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column',
          gap: '16px',
        }}>
          <div style={{
            width: '220px', height: '220px',
            border: '3px solid #39D98A', borderRadius: '20px',
            boxShadow: '0 0 0 9999px rgba(0,0,0,0.52)',
          }} />
          <p style={{ color: '#39D98A', fontSize: '13px', fontWeight: 600, textAlign: 'center' }}>
            {msg}
          </p>
        </div>
      </div>

      {/* Bottom controls */}
      <div style={{ background: '#0D1117', padding: '20px 16px 44px' }}>
        {showManual && (
          <div style={{ marginBottom: '16px' }}>
            <input
              value={manualUrl}
              onChange={e => setManualUrl(e.target.value)}
              placeholder="Paste check-in URL (…/checkin/…)"
              style={{
                width: '100%', background: '#161B22',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '10px', padding: '12px',
                color: '#fff', fontSize: '13px',
                boxSizing: 'border-box', marginBottom: '8px',
              }}
            />
            <button
              onClick={handleManual}
              style={{
                width: '100%', background: '#39D98A', color: '#000',
                border: 'none', borderRadius: '10px', padding: '12px',
                fontWeight: 700, fontFamily: 'Syne, sans-serif', fontSize: '14px',
                cursor: 'pointer',
              }}
            >
              Go
            </button>
          </div>
        )}
        <button
          onClick={onClose}
          style={{
            width: '100%', background: 'none', border: 'none',
            color: 'rgba(255,255,255,0.5)', fontSize: '14px',
            cursor: 'pointer', padding: '8px',
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function CheckInPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate  = useNavigate();

  const [venue, setVenue]       = useState<Venue | null>(null);
  const [step, setStep]         = useState<Step>('loading_venue');
  const [distanceKm, setDistKm] = useState<number | null>(null);
  const [score, setScore]       = useState<UserVenueScore | null>(null);
  const [method, setMethod]     = useState<'gps' | 'qr' | 'qr_link' | 'manual'>('gps');

  const visitorId = getVisitorId();

  // ── On mount: load venue then start GPS ─────────────────────────────────────

  useEffect(() => {
    if (!slug) return;
    getVenueBySlug(slug).then(v => {
      if (!v) { navigate('/feed', { replace: true }); return; }
      setVenue(v);
      requestGPS(v);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  // ── GPS check ───────────────────────────────────────────────────────────────

  function requestGPS(v: Venue) {
    setStep('gps_checking');

    if (!navigator.geolocation) {
      setStep('gps_denied');
      return;
    }

    // Hard timeout: show manual option after 8 s
    const timer = setTimeout(() => setStep('gps_denied'), 8000);

    navigator.geolocation.getCurrentPosition(
      pos => {
        clearTimeout(timer);
        const { latitude: uLat, longitude: uLon } = pos.coords;

        if (v.latitude != null && v.longitude != null) {
          const km = haversineKm(uLat, uLon, v.latitude, v.longitude);
          setDistKm(km);

          if (km <= 0.3) {
            // Close enough — auto-confirm
            setMethod('gps');
            doSave(v, 'gps');
          } else {
            // Far away — ask user to confirm
            setStep('gps_far');
          }
        } else {
          // Venue has no coordinates yet — accept GPS confirm as-is
          setMethod('gps');
          doSave(v, 'gps');
        }
      },
      () => {
        clearTimeout(timer);
        setStep('gps_denied');
      },
      { timeout: 7000, enableHighAccuracy: true, maximumAge: 30_000 }
    );
  }

  // ── Offline queue helpers ───────────────────────────────────────────────────
  // When the device is offline, check-ins are stored in localStorage and
  // flushed the next time the app goes online.

  function queueOfflineCheckIn(v: Venue, m: typeof method) {
    const QUEUE_KEY = 'kayaa_offline_checkins';
    try {
      const existing = JSON.parse(localStorage.getItem(QUEUE_KEY) ?? '[]') as object[];
      existing.push({ venueId: v.id, venueName: v.name, venueSlug: v.slug, venueType: v.category, visitorId, method: m, queuedAt: new Date().toISOString() });
      localStorage.setItem(QUEUE_KEY, JSON.stringify(existing));
    } catch { /* storage full — ignore */ }
  }

  // ── Save ────────────────────────────────────────────────────────────────────

  async function doSave(v: Venue, m: typeof method) {
    setStep('saving');

    // Offline: queue locally + show celebration optimistically
    if (!navigator.onLine) {
      queueOfflineCheckIn(v, m);
      const result = await saveVisit({
        venueId: v.id, venueName: v.name, venueSlug: v.slug,
        venueType: v.category, visitorId, method: m,
      });
      setScore(result.score);
      setStep('celebration'); // always celebrate — will sync on reconnect
      return;
    }

    const result = await saveVisit({
      venueId:   v.id,
      venueName: v.name,
      venueSlug: v.slug,
      venueType: v.category,
      visitorId,
      method:    m,
    });
    setScore(result.score);
    setStep(result.alreadyCheckedIn ? 'duplicate' : 'celebration');
  }

  // ── QR scan detected ─────────────────────────────────────────────────────────

  function handleQRDetect(detectedVenueId: string) {
    if (venue && detectedVenueId === venue.id) {
      // Scanned own venue's QR — check in here
      setMethod('qr');
      doSave(venue, 'qr');
    } else {
      // Different venue scanned — navigate to its QR landing page
      navigate(`/checkin/${detectedVenueId}`);
    }
  }

  // ── Render: celebration ──────────────────────────────────────────────────────

  if (step === 'celebration' && venue && score) {
    return (
      <CelebrationScreen
        venue={venue}
        score={score}
        onDismiss={() => navigate(`/venue/${venue.slug}`)}
      />
    );
  }

  const emoji = venue ? (CAT_EMOJI[venue.category] ?? '📍') : '📍';
  const color = venue ? (CAT_COLOR[venue.category] ?? '#39D98A') : '#39D98A';

  // ── Full-screen QR scanner ───────────────────────────────────────────────────

  if (step === 'qr_scanning') {
    return (
      <QRScanner
        onDetect={handleQRDetect}
        onClose={() => setStep('gps_denied')}
      />
    );
  }

  // ── Main layout ───────────────────────────────────────────────────────────────

  return (
    <div style={{ padding: '16px', paddingBottom: '48px', minHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
      <style>{`@keyframes ciPulse { 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(1.07);opacity:0.8} }`}</style>

      {/* Back button + title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '28px' }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            width: '36px', height: '36px', borderRadius: '50%',
            background: 'var(--color-surface)', border: '1px solid var(--color-border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', flexShrink: 0,
          }}
        >
          <ArrowLeft size={16} color="var(--color-text)" />
        </button>

        {venue && (
          <div>
            <div style={{ fontSize: '12px', color: 'var(--color-muted)' }}>{emoji} {venue.name}</div>
            <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '16px' }}>
              Check in
            </div>
          </div>
        )}
      </div>

      {/* Venue mini-card */}
      {venue && (
        <div style={{
          background: 'var(--color-surface)', border: '1px solid var(--color-border)',
          borderRadius: '16px', padding: '14px',
          display: 'flex', gap: '12px', alignItems: 'center',
          marginBottom: '36px',
        }}>
          <div style={{
            width: '52px', height: '52px', borderRadius: '14px', flexShrink: 0,
            background: `${color}18`, border: `1px solid ${color}30`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px',
          }}>
            {emoji}
          </div>
          <div>
            <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '16px', marginBottom: '3px' }}>
              {venue.name}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--color-muted)' }}>
              <MapPin size={11} />
              {venue.neighborhood}, {venue.city}
            </div>
          </div>
        </div>
      )}

      {/* ── Step-specific content ─────────────────────────────────────────────── */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        textAlign: 'center', gap: '20px',
      }}>

        {/* Loading venue */}
        {(step === 'loading_venue') && (
          <>
            <Spinner />
            <p style={{ color: 'var(--color-muted)', fontSize: '14px' }}>Loading…</p>
          </>
        )}

        {/* GPS checking */}
        {step === 'gps_checking' && (
          <>
            <div style={{
              width: '76px', height: '76px', borderRadius: '50%',
              background: 'rgba(57,217,138,0.08)',
              border: '2px solid rgba(57,217,138,0.28)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              animation: 'ciPulse 1.6s ease-in-out infinite',
            }}>
              <MapPin size={30} color="#39D98A" />
            </div>
            <div>
              <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '18px', marginBottom: '6px' }}>
                Verifying your location…
              </h2>
              <p style={{ fontSize: '13px', color: 'var(--color-muted)' }}>This only takes a moment</p>
            </div>
          </>
        )}

        {/* GPS far — explicit confirmation */}
        {step === 'gps_far' && venue && (
          <>
            <div style={{
              width: '76px', height: '76px', borderRadius: '50%',
              background: 'rgba(245,166,35,0.1)',
              border: '2px solid rgba(245,166,35,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '34px',
            }}>
              📍
            </div>
            <div>
              <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '18px', marginBottom: '8px' }}>
                You're{' '}
                {distanceKm != null ? `${distanceKm < 1 ? `${Math.round(distanceKm * 1000)}m` : `${distanceKm.toFixed(1)}km`}` : 'some distance'}{' '}
                away
              </h2>
              <p style={{ fontSize: '14px', color: 'var(--color-muted)', lineHeight: 1.65, maxWidth: '280px' }}>
                You're not right at{' '}
                <strong style={{ color: '#fff' }}>{venue.name}</strong>.{' '}
                Are you sure you want to check in?
              </p>
            </div>
            <div style={{ width: '100%', maxWidth: '320px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                onClick={() => { setMethod('manual'); doSave(venue, 'manual'); }}
                style={{
                  background: 'var(--color-accent)', color: '#000',
                  border: 'none', borderRadius: '14px', padding: '16px',
                  fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '16px', cursor: 'pointer',
                }}
              >
                Check In Anyway
              </button>
              <button
                onClick={() => navigate(-1)}
                style={{
                  background: 'transparent', color: 'var(--color-muted)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '14px', padding: '14px',
                  fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: '14px', cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            </div>
          </>
        )}

        {/* GPS denied — manual confirm or QR scan */}
        {step === 'gps_denied' && venue && (
          <>
            <div style={{
              width: '76px', height: '76px', borderRadius: '50%',
              background: `${color}0e`, border: `2px solid ${color}28`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '34px',
            }}>
              {emoji}
            </div>
            <div>
              <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '18px', marginBottom: '8px' }}>
                Check in at {venue.name}
              </h2>
              <p style={{ fontSize: '13px', color: 'var(--color-muted)', lineHeight: 1.65, maxWidth: '280px' }}>
                Location access is off. Confirm you're here, or scan the venue's QR code.
              </p>
            </div>
            <div style={{ width: '100%', maxWidth: '320px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                onClick={() => { setMethod('manual'); doSave(venue, 'manual'); }}
                style={{
                  background: 'var(--color-accent)', color: '#000',
                  border: 'none', borderRadius: '14px', padding: '16px',
                  fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '16px', cursor: 'pointer',
                }}
              >
                I'm Here — Check Me In
              </button>
              <button
                onClick={() => setStep('qr_scanning')}
                style={{
                  background: 'transparent', color: '#39D98A',
                  border: '1.5px solid rgba(57,217,138,0.28)',
                  borderRadius: '14px', padding: '14px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: '14px', cursor: 'pointer',
                }}
              >
                <QrCode size={16} /> Scan Venue QR Code
              </button>
            </div>
          </>
        )}

        {/* Saving */}
        {step === 'saving' && (
          <>
            <Spinner />
            <p style={{ color: 'var(--color-muted)', fontSize: '14px' }}>Checking you in…</p>
          </>
        )}

        {/* Duplicate check-in */}
        {step === 'duplicate' && venue && score && (
          <>
            <div style={{ fontSize: '52px', marginBottom: '4px' }}>✓</div>
            <div>
              <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '20px', marginBottom: '8px' }}>
                Already checked in today
              </h2>
              <p style={{ fontSize: '14px', color: 'var(--color-muted)', lineHeight: 1.65 }}>
                Visit #{score.visitCount} at {venue.name}. Come back soon!
              </p>
            </div>
            <button
              onClick={() => navigate(`/venue/${venue.slug}`)}
              style={{
                background: 'var(--color-accent)', color: '#000',
                border: 'none', borderRadius: '14px', padding: '16px 32px',
                fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '15px', cursor: 'pointer',
              }}
            >
              Back to {venue.name.split("'")[0].trim()}
            </button>
          </>
        )}

      </div>
    </div>
  );
}
