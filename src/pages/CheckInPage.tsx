import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { CheckSquare, ArrowLeft, Share2 } from 'lucide-react';
import { mockVenues } from '../lib/mockData';

type Step = 'confirm' | 'note' | 'done';

export default function CheckInPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const venue = mockVenues.find(v => v.slug === slug);
  const [step, setStep] = useState<Step>('confirm');
  const [note, setNote] = useState('');

  if (!venue) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', flexDirection: 'column', gap: '12px' }}>
        <span style={{ fontSize: '40px' }}>🔍</span>
        <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700 }}>Venue not found</h2>
        <Link to="/feed" style={{ color: 'var(--color-accent)', fontSize: '14px' }}>Back to feed</Link>
      </div>
    );
  }

  return (
    <div style={{ padding: '16px' }}>
      {/* Back */}
      <Link to={`/venue/${slug}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--color-muted)', textDecoration: 'none', fontSize: '14px', marginBottom: '24px' }}>
        <ArrowLeft size={16} /> {venue.name}
      </Link>

      {step === 'confirm' && (
        <div>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div style={{
              width: '80px', height: '80px', borderRadius: '20px',
              background: 'var(--color-surface)',
              border: '2px solid var(--color-border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px',
              fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '32px', color: 'var(--color-accent)',
            }}>
              {venue.name[0]}
            </div>
            <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '22px', marginBottom: '6px' }}>
              Check in to
            </h1>
            <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '20px', color: 'var(--color-accent)', marginBottom: '8px' }}>
              {venue.name}
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--color-muted)' }}>
              {venue.neighborhood}, {venue.city}
            </p>
          </div>

          <div style={{
            background: 'var(--color-surface)', border: '1px solid var(--color-border)',
            borderRadius: '12px', padding: '16px', marginBottom: '24px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '13px', color: 'var(--color-muted)' }}>Total check-ins</span>
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-accent)' }}>
                {venue.checkinCount.toLocaleString()}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '13px', color: 'var(--color-muted)' }}>Status</span>
              <span style={{ fontSize: '13px', fontWeight: 600, color: venue.isOpen ? '#39D98A' : '#6B7280' }}>
                {venue.isOpen ? 'Open now' : 'Closed'}
              </span>
            </div>
          </div>

          <button
            onClick={() => setStep('note')}
            style={{
              width: '100%', padding: '16px',
              background: 'var(--color-accent)', color: '#000',
              border: 'none', borderRadius: '12px',
              fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '16px',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            }}
          >
            <CheckSquare size={20} />
            Yes, I'm here
          </button>
        </div>
      )}

      {step === 'note' && (
        <div>
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '22px', marginBottom: '8px' }}>
            Add a note?
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--color-muted)', marginBottom: '24px' }}>
            Optional — share what you're doing or recommend something
          </p>

          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="e.g. Fresh fade today 💈 Ask for Uncle Dee..."
            maxLength={160}
            style={{
              width: '100%', minHeight: '120px',
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: '12px', padding: '14px',
              color: 'var(--color-text)', fontSize: '14px',
              fontFamily: 'DM Sans, sans-serif',
              resize: 'vertical', outline: 'none',
              marginBottom: '8px',
            }}
          />
          <div style={{ fontSize: '12px', color: 'var(--color-muted)', textAlign: 'right', marginBottom: '24px' }}>
            {note.length}/160
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => setStep('done')}
              style={{
                flex: 1, padding: '14px',
                background: 'transparent', color: 'var(--color-muted)',
                border: '1px solid var(--color-border)', borderRadius: '12px',
                fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: '14px',
                cursor: 'pointer',
              }}
            >
              Skip
            </button>
            <button
              onClick={() => setStep('done')}
              style={{
                flex: 2, padding: '14px',
                background: 'var(--color-accent)', color: '#000',
                border: 'none', borderRadius: '12px',
                fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '15px',
                cursor: 'pointer',
              }}
            >
              Check in
            </button>
          </div>
        </div>
      )}

      {step === 'done' && (
        <div style={{ textAlign: 'center', paddingTop: '40px' }}>
          <div style={{
            width: '80px', height: '80px', borderRadius: '50%',
            background: 'rgba(57, 217, 138, 0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px',
            border: '2px solid var(--color-accent)',
          }}>
            <CheckSquare size={36} color="var(--color-accent)" />
          </div>

          <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '24px', marginBottom: '8px' }}>
            You're checked in!
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--color-muted)', marginBottom: '8px' }}>
            {venue.name}
          </p>
          {note && (
            <div style={{
              background: 'var(--color-surface)', border: '1px solid var(--color-border)',
              borderRadius: '10px', padding: '12px', margin: '16px 0', textAlign: 'left',
            }}>
              <p style={{ fontSize: '14px', color: 'var(--color-text)' }}>"{note}"</p>
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px', marginTop: '32px' }}>
            <button
              onClick={() => navigate(`/venue/${slug}`)}
              style={{
                flex: 1, padding: '14px',
                background: 'transparent', color: 'var(--color-text)',
                border: '1px solid var(--color-border)', borderRadius: '12px',
                fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: '14px',
                cursor: 'pointer',
              }}
            >
              View venue
            </button>
            <button
              style={{
                flex: 1, padding: '14px',
                background: 'var(--color-surface2)', color: 'var(--color-text)',
                border: '1px solid var(--color-border)', borderRadius: '12px',
                fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: '14px',
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
              }}
            >
              <Share2 size={15} /> Share
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
