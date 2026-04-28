import { useState } from 'react';
import { MessageCircle, Send, CheckCircle, ExternalLink } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { getVisitorId } from '../../lib/api';
import { Link } from 'react-router-dom';

// ─── Suggestion chips ─────────────────────────────────────────────────────────

const QUICK_SUGGESTIONS = [
  { emoji: '🐕', text: 'Lost dog in the area' },
  { emoji: '🔧', text: 'Anyone know a good plumber?' },
  { emoji: '💡', text: 'Is load shedding on now?' },
  { emoji: '🏥', text: 'What time does the clinic open?' },
  { emoji: '🚕', text: "What's the taxi fare to town?" },
  { emoji: '🛒', text: 'Anyone selling braai wood?' },
];

// ─── Types ────────────────────────────────────────────────────────────────────

interface QuickAskProps {
  neighbourhood?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function QuickAsk({ neighbourhood = 'Randburg' }: QuickAskProps) {
  const [question, setQuestion] = useState('');
  const [saving,   setSaving]   = useState(false);
  const [postedId, setPostedId] = useState<string | null>(null);

  async function post(text: string) {
    const trimmed = text.trim();
    if (!trimmed || saving) return;
    setSaving(true);

    const visitorId = getVisitorId();
    const expires = new Date(Date.now() + 7 * 24 * 3600_000).toISOString();

    const { data } = await supabase
      .from('board_posts')
      .insert({
        neighbourhood,
        category:          'ask',
        title:             trimmed.slice(0, 80),
        description:       null,
        status:            'active',
        images:            [],
        is_quick_question: true,
        country_code:      'ZA',
        expires_at:        expires,
        user_id:           null,        // anonymous
        // store visitor_id in description for later if needed
        ...(visitorId ? { description: `[visitor:${visitorId}]` } : {}),
      })
      .select('id')
      .single();

    setSaving(false);

    if (data?.id) {
      setPostedId(data.id);
      setQuestion('');
    }
  }

  // ── Confirmation state ────────────────────────────────────────────────────

  if (postedId) {
    return (
      <div style={{ background: '#161B22', border: '1px solid #21262D', borderRadius: '16px', padding: '16px' }}>
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          padding: '20px 0', gap: '10px',
        }}>
          <CheckCircle size={36} color="#39D98A" />
          <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '15px', color: '#F0F6FC' }}>
            Question posted!
          </div>
          <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: 'rgba(255,255,255,0.5)', textAlign: 'center', lineHeight: 1.5 }}>
            Your neighbours can now see and answer it on the Board.
          </div>
          <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
            <button
              onClick={() => setPostedId(null)}
              style={{
                padding: '8px 16px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)',
                background: 'transparent', fontFamily: 'DM Sans, sans-serif', fontSize: '12px',
                color: 'rgba(255,255,255,0.5)', cursor: 'pointer',
              }}
            >
              Ask another
            </button>
            <Link
              to={`/board/${postedId}`}
              style={{
                display: 'flex', alignItems: 'center', gap: '5px',
                padding: '8px 16px', borderRadius: '20px', border: 'none',
                background: 'rgba(57,217,138,0.15)',
                fontFamily: 'DM Sans, sans-serif', fontWeight: 700, fontSize: '12px',
                color: '#39D98A', textDecoration: 'none',
              }}
            >
              <ExternalLink size={12} />
              View on Board
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── Main form ─────────────────────────────────────────────────────────────

  return (
    <div style={{ background: '#161B22', border: '1px solid #21262D', borderRadius: '16px', padding: '16px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <div>
          <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '17px', color: '#F0F6FC', margin: '0 0 2px' }}>
            Quick Ask
          </h2>
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: 'rgba(255,255,255,0.4)', margin: 0 }}>
            Ask your neighbours anything
          </p>
        </div>
        <div style={{
          width: '36px', height: '36px', borderRadius: '12px',
          background: 'rgba(167,139,250,0.12)', border: '1px solid rgba(167,139,250,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <MessageCircle size={17} color="#A78BFA" />
        </div>
      </div>

      {/* Suggestion chips */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
        {QUICK_SUGGESTIONS.map(s => (
          <button
            key={s.text}
            onClick={() => post(s.text)}
            disabled={saving}
            style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              padding: '6px 11px', borderRadius: '20px',
              background: '#0D1117', border: '1px solid #30363D',
              fontFamily: 'DM Sans, sans-serif', fontSize: '12px', fontWeight: 600,
              color: 'rgba(255,255,255,0.65)', cursor: saving ? 'default' : 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            <span>{s.emoji}</span>
            <span>{s.text}</span>
          </button>
        ))}
      </div>

      {/* Custom input */}
      <div style={{ position: 'relative' }}>
        <MessageCircle
          size={14}
          color="rgba(255,255,255,0.3)"
          style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
        />
        <input
          type="text"
          value={question}
          onChange={e => setQuestion(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') post(question); }}
          placeholder="Ask your own question…"
          maxLength={80}
          style={{
            width: '100%', boxSizing: 'border-box',
            background: '#0D1117', border: '1px solid #30363D',
            borderRadius: '10px', padding: '11px 44px 11px 34px',
            color: '#F0F6FC', fontFamily: 'DM Sans, sans-serif', fontSize: '14px',
            outline: 'none',
          }}
        />
        <button
          onClick={() => post(question)}
          disabled={!question.trim() || saving}
          style={{
            position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)',
            width: '28px', height: '28px', borderRadius: '8px', border: 'none',
            background: question.trim() ? '#A78BFA' : 'rgba(255,255,255,0.06)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: question.trim() ? 'pointer' : 'default',
          }}
        >
          <Send size={13} color={question.trim() ? '#000' : 'rgba(255,255,255,0.2)'} />
        </button>
      </div>

      {saving && (
        <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: 'rgba(255,255,255,0.4)', textAlign: 'center', marginTop: '8px' }}>
          Posting to the Board…
        </div>
      )}

      {/* Footer hint */}
      <div style={{ marginTop: '10px', fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.25)', textAlign: 'center' }}>
        Posts anonymously · lives on the Board for 7 days
      </div>
    </div>
  );
}
