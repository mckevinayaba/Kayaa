import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Camera, Upload, Trash2, Check, X, Star } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { getVenueOwnerByUserId, uploadVenueFile } from '../lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Photo {
  url: string;
  isCover: boolean;
}

// ─── Photo card ───────────────────────────────────────────────────────────────

function PhotoCard({
  photo,
  onDelete,
  onSetCover,
}: {
  photo: Photo;
  onDelete: (url: string) => void;
  onSetCover: (url: string) => void;
}) {
  const [confirm, setConfirm] = useState(false);

  return (
    <div style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden', aspectRatio: '1', background: '#161B22' }}>
      <img
        src={photo.url}
        alt="Venue photo"
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        loading="lazy"
      />

      {/* Cover badge */}
      {photo.isCover && (
        <div style={{
          position: 'absolute', top: '6px', left: '6px',
          background: '#FBBF24', borderRadius: '6px',
          padding: '2px 7px',
          fontFamily: 'DM Sans, sans-serif', fontWeight: 700, fontSize: '10px', color: '#000',
          display: 'flex', alignItems: 'center', gap: '3px',
        }}>
          <Star size={9} fill="#000" />
          Cover
        </div>
      )}

      {/* Action overlay */}
      <div style={{
        position: 'absolute', top: '6px', right: '6px',
        display: 'flex', flexDirection: 'column', gap: '4px',
      }}>
        {/* Set cover */}
        {!photo.isCover && (
          <button
            onClick={() => onSetCover(photo.url)}
            style={{
              background: 'rgba(13,17,23,0.8)', border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '8px', padding: '5px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
            title="Set as cover"
          >
            <Star size={13} color="#FBBF24" />
          </button>
        )}

        {/* Delete */}
        {confirm ? (
          <div style={{ display: 'flex', gap: '3px' }}>
            <button
              onClick={() => onDelete(photo.url)}
              style={{
                background: '#EF4444', border: 'none', borderRadius: '8px',
                padding: '5px', cursor: 'pointer', display: 'flex',
              }}
            >
              <Check size={12} color="#fff" />
            </button>
            <button
              onClick={() => setConfirm(false)}
              style={{
                background: 'rgba(13,17,23,0.8)', border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: '8px', padding: '5px', cursor: 'pointer', display: 'flex',
              }}
            >
              <X size={12} color="rgba(255,255,255,0.6)" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirm(true)}
            style={{
              background: 'rgba(13,17,23,0.8)', border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '8px', padding: '5px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Trash2 size={13} color="#F87171" />
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Upload button ────────────────────────────────────────────────────────────

function UploadSlot({ onUpload }: { onUpload: (file: File) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function handleFiles(files: FileList | null) {
    if (!files) return;
    const file = files[0];
    if (!file || !file.type.startsWith('image/')) return;
    onUpload(file);
  }

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={e => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={e => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}
      style={{
        aspectRatio: '1', borderRadius: '12px', cursor: 'pointer',
        border: `2px dashed ${dragging ? '#39D98A' : '#30363D'}`,
        background: dragging ? 'rgba(57,217,138,0.05)' : 'rgba(255,255,255,0.02)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '6px',
        transition: 'all 0.15s',
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={e => handleFiles(e.target.files)}
      />
      <Upload size={20} color="rgba(57,217,138,0.6)" />
      <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.35)', textAlign: 'center', lineHeight: 1.4, padding: '0 8px' }}>
        Tap to upload
      </span>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div style={{ padding: '70px 16px 16px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
        {Array(6).fill(0).map((_, i) => (
          <div key={i} style={{ aspectRatio: '1', background: 'rgba(255,255,255,0.04)', borderRadius: '12px' }} />
        ))}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function VenuePhotos() {
  const { user }  = useAuth();
  const navigate  = useNavigate();

  const [venueId,     setVenueId]     = useState<string | null>(null);
  const [venueSlug,   setVenueSlug]   = useState('');
  const [photos,      setPhotos]      = useState<Photo[]>([]);
  const [coverUrl,    setCoverUrl]     = useState<string | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [uploading,   setUploading]   = useState(false);
  const [savedMsg,    setSavedMsg]    = useState('');
  const [errorMsg,    setErrorMsg]    = useState('');

  useEffect(() => {
    if (!user) return;
    (async () => {
      const ownership = await getVenueOwnerByUserId(user.id);
      if (!ownership) { setLoading(false); return; }
      setVenueId(ownership.venueId);

      const { data } = await supabase
        .from('venues')
        .select('cover_image, gallery_images, slug')
        .eq('id', ownership.venueId)
        .single();

      if (data) {
        setVenueSlug(data.slug ?? '');
        const cover = data.cover_image ?? null;
        setCoverUrl(cover);

        let gallery: string[] = [];
        if (Array.isArray(data.gallery_images)) {
          gallery = data.gallery_images as string[];
        } else if (typeof data.gallery_images === 'string') {
          try { gallery = JSON.parse(data.gallery_images); } catch { gallery = []; }
        }

        // Build unified list: cover + gallery (dedup)
        const all = [...new Set([...(cover ? [cover] : []), ...gallery])];
        setPhotos(all.map(url => ({ url, isCover: url === cover })));
      }
      setLoading(false);
    })();
  }, [user]);

  async function handleUpload(file: File) {
    if (!venueId) return;
    if (photos.length >= 12) {
      setErrorMsg('Maximum 12 photos allowed. Delete one first.');
      setTimeout(() => setErrorMsg(''), 3000);
      return;
    }

    setUploading(true);
    setErrorMsg('');
    try {
      const ext  = file.name.split('.').pop() ?? 'jpg';
      const path = `venues/${venueId}/${Date.now()}.${ext}`;
      const url  = await uploadVenueFile(path, file);

      // If no cover yet, make this the cover
      const isFirstPhoto = photos.length === 0;
      const newPhotos = [...photos, { url, isCover: isFirstPhoto }];
      setPhotos(newPhotos);

      if (isFirstPhoto) {
        setCoverUrl(url);
        await supabase.from('venues').update({ cover_image: url }).eq('id', venueId);
      }

      // Always update gallery_images
      await supabase.from('venues')
        .update({ gallery_images: newPhotos.map(p => p.url) })
        .eq('id', venueId);

      setSavedMsg('Photo uploaded!');
      setTimeout(() => setSavedMsg(''), 2500);
    } catch (e) {
      setErrorMsg('Upload failed. Check your internet and try again.');
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(url: string) {
    if (!venueId) return;
    const newPhotos = photos.filter(p => p.url !== url);

    // If we deleted the cover, assign next photo as cover
    let newCover = coverUrl;
    if (url === coverUrl) {
      newCover = newPhotos.length > 0 ? newPhotos[0].url : null;
      setCoverUrl(newCover);
      newPhotos.forEach((p, i) => { p.isCover = i === 0; });
    }

    setPhotos(newPhotos);

    await supabase.from('venues').update({
      cover_image:    newCover,
      gallery_images: newPhotos.map(p => p.url),
    }).eq('id', venueId);
  }

  async function handleSetCover(url: string) {
    if (!venueId) return;
    const newPhotos = photos.map(p => ({ ...p, isCover: p.url === url }));
    setPhotos(newPhotos);
    setCoverUrl(url);

    await supabase.from('venues').update({ cover_image: url }).eq('id', venueId);
    setSavedMsg('Cover photo updated!');
    setTimeout(() => setSavedMsg(''), 2500);
  }

  if (loading) return <Skeleton />;

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
          Manage Photos
        </h1>
        <Camera size={18} color="rgba(167,139,250,0.7)" />
      </div>

      <div style={{ padding: '16px' }}>

        {/* ── Upload status messages ─────────────────────────────────────── */}
        {savedMsg && (
          <div style={{ marginBottom: '12px', padding: '10px 14px', background: 'rgba(57,217,138,0.08)', border: '1px solid rgba(57,217,138,0.25)', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Check size={14} color="#39D98A" />
            <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: '#39D98A' }}>{savedMsg}</span>
          </div>
        )}
        {errorMsg && (
          <div style={{ marginBottom: '12px', padding: '10px 14px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <X size={14} color="#F87171" />
            <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: '#F87171' }}>{errorMsg}</span>
          </div>
        )}

        {/* ── Upload spinner ─────────────────────────────────────────────── */}
        {uploading && (
          <div style={{ marginBottom: '12px', padding: '10px 14px', background: 'rgba(96,165,250,0.06)', border: '1px solid rgba(96,165,250,0.2)', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '14px', height: '14px', borderRadius: '50%', border: '2px solid rgba(96,165,250,0.3)', borderTop: '2px solid #60A5FA', animation: 'spin 0.8s linear infinite' }} />
            <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>Uploading…</span>
          </div>
        )}
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

        {/* ── Tips ──────────────────────────────────────────────────────── */}
        <div style={{ marginBottom: '16px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {[
            '⭐ Star = cover photo',
            '📐 Square photos work best',
            `📷 ${photos.length}/12 photos`,
          ].map(tip => (
            <span key={tip} style={{
              fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.4)',
              background: '#161B22', border: '1px solid #21262D', borderRadius: '20px',
              padding: '4px 10px',
            }}>
              {tip}
            </span>
          ))}
        </div>

        {/* ── No venue ─────────────────────────────────────────────────── */}
        {!venueId && (
          <div style={{ textAlign: 'center', padding: '60px 16px', fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: 'rgba(255,255,255,0.4)' }}>
            No venue found. <a href="/onboarding" style={{ color: '#39D98A' }}>Add your place first.</a>
          </div>
        )}

        {/* ── Photo grid ────────────────────────────────────────────────── */}
        {venueId && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '20px' }}>
            {photos.map(p => (
              <PhotoCard
                key={p.url}
                photo={p}
                onDelete={handleDelete}
                onSetCover={handleSetCover}
              />
            ))}
            {photos.length < 12 && !uploading && (
              <UploadSlot onUpload={handleUpload} />
            )}
          </div>
        )}

        {/* ── Empty state ────────────────────────────────────────────────── */}
        {venueId && photos.length === 0 && !uploading && (
          <div style={{
            textAlign: 'center', padding: '48px 24px',
            background: '#161B22', border: '1px dashed #30363D',
            borderRadius: '16px',
          }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>📷</div>
            <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '16px', color: '#F0F6FC', marginBottom: '6px' }}>
              No photos yet
            </div>
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: 'rgba(255,255,255,0.4)', lineHeight: 1.6, marginBottom: '0', maxWidth: '260px', margin: '0 auto' }}>
              Venues with photos get 2× more profile views. Upload a cover photo to get started.
            </p>
          </div>
        )}

        {/* ── View public page ─────────────────────────────────────────── */}
        {venueId && venueSlug && photos.length > 0 && (
          <a
            href={`/venue/${venueSlug}`}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              padding: '13px', borderRadius: '12px', textDecoration: 'none',
              background: 'rgba(255,255,255,0.04)', border: '1px solid #21262D',
              fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: '13px', color: 'rgba(255,255,255,0.5)',
            }}
          >
            View your public venue page →
          </a>
        )}

      </div>
    </div>
  );
}
