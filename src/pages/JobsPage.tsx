/**
 * JobsPage — /jobs
 *
 * Shows local_jobs for the detected suburb.
 * If no real jobs exist, seed listings keep the page alive.
 * Seed data is display-only — never saved to Supabase.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { getLocalJobs } from '../lib/api';
import type { LocalJob } from '../lib/api';
import { useNeighbourhood } from '../contexts/NeighbourhoodContext';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ─── Normalised display type ─────────────────────────────────────────────────

interface DisplayJob {
  id: string;
  typeLabel: 'Hiring' | 'Skills';
  title: string;
  description?: string;
  neighbourhood: string;
  timeDisplay: string;
  isSeed?: boolean;
}

// ─── Card ─────────────────────────────────────────────────────────────────────

function JobCard({ job, onClick }: { job: DisplayJob; onClick?: () => void }) {
  const isSkill = job.typeLabel === 'Skills';
  const badgeColor  = isSkill ? '#39D98A' : '#A78BFA';
  const borderColor = isSkill ? 'rgba(57,217,138,0.15)'  : 'rgba(167,139,250,0.15)';

  return (
    <div
      onClick={onClick}
      style={{
        background: 'var(--color-surface)',
        border: `1px solid ${borderColor}`,
        borderLeft: `3px solid ${badgeColor}`,
        borderRadius: '14px',
        padding: '14px',
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <span style={{
          fontFamily: 'DM Sans, sans-serif', fontSize: '11px', fontWeight: 700,
          color: badgeColor, background: `${badgeColor}18`,
          borderRadius: '20px', padding: '2px 8px',
        }}>
          {isSkill ? '💡 Skills' : '💼 Hiring'}
        </span>
        <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>
          {job.timeDisplay}
        </span>
      </div>

      <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '15px', color: '#F0F6FC', lineHeight: 1.3, marginBottom: '4px' }}>
        {job.title}
      </div>

      {job.description && (
        <p style={{
          fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: 'rgba(255,255,255,0.52)',
          margin: '0 0 8px', lineHeight: 1.55,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        } as React.CSSProperties}>
          {job.description}
        </p>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>
          📍 {job.neighbourhood}
        </span>
        {job.isSeed && (
          <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '10px', color: 'rgba(255,255,255,0.18)' }}>example</span>
        )}
      </div>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function JobSkeleton() {
  return (
    <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '14px', padding: '14px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
        <div style={{ width: '60px', height: '18px', background: 'rgba(255,255,255,0.06)', borderRadius: '10px' }} />
        <div style={{ width: '40px', height: '18px', background: 'rgba(255,255,255,0.04)', borderRadius: '10px' }} />
      </div>
      <div style={{ width: '80%', height: '16px', background: 'rgba(255,255,255,0.06)', borderRadius: '6px', marginBottom: '8px' }} />
      <div style={{ width: '100%', height: '13px', background: 'rgba(255,255,255,0.04)', borderRadius: '6px', marginBottom: '4px' }} />
      <div style={{ width: '65%', height: '13px', background: 'rgba(255,255,255,0.04)', borderRadius: '6px' }} />
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

type Filter = 'all' | 'Hiring' | 'Skills';

export default function JobsPage() {
  const navigate = useNavigate();
  const { displaySuburb: suburb } = useNeighbourhood();

  const [realJobs, setRealJobs] = useState<LocalJob[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [filter,   setFilter]   = useState<Filter>('all');
  const [jobsHintDismissed, setJobsHintDismissed] = useState(
    () => { try { return localStorage.getItem('kayaa_jobs_hint_seen') === 'true'; } catch { return false; } }
  );

  useEffect(() => {
    setLoading(true);
    if (!suburb) { setLoading(false); return; }
    getLocalJobs(suburb)
      .then(jobs => { setRealJobs(jobs); setLoading(false); })
      .catch(() => { setLoading(false); });
  }, [suburb]);

  // Normalise to DisplayJob — real listings only
  const allJobs: DisplayJob[] = loading
    ? []
    : realJobs.map(j => ({
        id: j.id,
        typeLabel: j.jobType === 'skill_offer' ? 'Skills' as const : 'Hiring' as const,
        title: j.title,
        description: j.description,
        neighbourhood: j.neighbourhood,
        timeDisplay: timeAgo(j.createdAt),
      }));

  const filtered = filter === 'all' ? allJobs : allJobs.filter(j => j.typeLabel === filter);

  const isSeedMode = !loading && realJobs.length === 0;

  return (
    <div style={{ paddingBottom: 'calc(80px + env(safe-area-inset-bottom, 0px))', minHeight: '100vh', background: 'var(--color-bg)' }}>

      {/* ── Header ── */}
      <div style={{ padding: '16px 16px 0' }}>
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.35)', margin: '0 0 4px' }}>
          {suburb ? `${suburb} · Jobs & Skills` : 'Jobs & Skills'}
        </p>
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '26px', color: '#FFFFFF', margin: '0 0 4px', letterSpacing: '-0.01em' }}>
          {suburb ? `${suburb} Jobs` : 'Local Jobs'}
        </h1>
        {!isSeedMode && !loading && (
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: 'rgba(255,255,255,0.35)', margin: '0 0 12px' }}>
            {realJobs.length} listing{realJobs.length !== 1 ? 's' : ''} in {suburb || 'your area'}
          </p>
        )}
        {!jobsHintDismissed && !loading && (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '12px' }}>
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: 'rgba(255,255,255,0.4)', margin: 0, lineHeight: 1.55, flex: 1 }}>
              Jobs and skills in {suburb || 'your area'}. Post a job or offer your skills. It's free.
            </p>
            <button
              onClick={() => { try { localStorage.setItem('kayaa_jobs_hint_seen', 'true'); } catch { /* ignore */ } setJobsHintDismissed(true); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.25)', padding: 0, flexShrink: 0, fontSize: '14px', lineHeight: 1 }}
              aria-label="Dismiss"
            >×</button>
          </div>
        )}
      </div>

      {/* ── Filter chips ── */}
      <div style={{ display: 'flex', gap: '8px', padding: '0 16px 12px', overflowX: 'auto', scrollbarWidth: 'none' } as React.CSSProperties}>
        {(['all', 'Hiring', 'Skills'] as Filter[]).map(f => {
          const active = filter === f;
          const color  = f === 'Skills' ? '#39D98A' : f === 'Hiring' ? '#A78BFA' : '#39D98A';
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                flexShrink: 0, padding: '6px 14px', borderRadius: '20px',
                border: `1px solid ${active ? color : 'rgba(255,255,255,0.1)'}`,
                background: active ? `${color}18` : 'rgba(255,255,255,0.04)',
                color: active ? color : 'rgba(255,255,255,0.45)',
                fontFamily: 'DM Sans, sans-serif', fontSize: '12px',
                fontWeight: active ? 700 : 500, cursor: 'pointer',
                WebkitTapHighlightColor: 'transparent',
              } as React.CSSProperties}
            >
              {f === 'all' ? 'All' : f === 'Hiring' ? '💼 Hiring' : '💡 Skills'}
            </button>
          );
        })}
      </div>

      {/* ── Job list ── */}
      <div style={{ padding: '0 16px' }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <JobSkeleton /><JobSkeleton /><JobSkeleton />
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ border: '1.5px dashed rgba(255,255,255,0.10)', borderRadius: '16px', padding: '28px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: '32px', marginBottom: '10px' }}>💼</div>
            <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '15px', color: 'var(--color-text)', marginBottom: '6px' }}>
              No jobs posted yet.
            </div>
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: 'var(--color-muted)', lineHeight: 1.6, margin: '0 0 16px' }}>
              Know someone hiring? Or have a skill to offer?
            </p>
            <button
              onClick={() => navigate('/board/new')}
              style={{ background: 'rgba(167,139,250,0.1)', color: '#A78BFA', border: '1px solid rgba(167,139,250,0.3)', borderRadius: '10px', padding: '10px 20px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', fontWeight: 700, fontSize: '13px' }}
            >
              Post a job or skill
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {filtered.map(job => <JobCard key={job.id} job={job} />)}
          </div>
        )}

        {/* Always-visible post CTA */}
        <button
          onClick={() => navigate('/board/new')}
          style={{
            width: '100%', marginTop: '20px',
            border: '1px dashed rgba(167,139,250,0.3)',
            borderRadius: '14px', padding: '16px',
            background: 'transparent', cursor: 'pointer',
            fontFamily: 'DM Sans, sans-serif', fontSize: '13px', fontWeight: 600,
            color: 'rgba(167,139,250,0.7)',
            WebkitTapHighlightColor: 'transparent',
          } as React.CSSProperties}
        >
          + Post a job or skill in {suburb || 'your area'}
        </button>
      </div>

      {/* ── FAB ── */}
      <button
        onClick={() => navigate('/board/new')}
        style={{ position: 'fixed', bottom: '80px', right: '20px', width: '56px', height: '56px', borderRadius: '50%', background: '#A78BFA', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 20px rgba(167,139,250,0.4)', zIndex: 50 }}
        aria-label="Post a job"
      >
        <Plus size={24} color="#fff" strokeWidth={2.5} />
      </button>
    </div>
  );
}
