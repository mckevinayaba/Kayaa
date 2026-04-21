import { useState, useEffect } from 'react';
import { Briefcase } from 'lucide-react';
import { getLocalJobs, createLocalJob, type LocalJob } from '../lib/api';

const JOB_TYPE_LABELS: Record<string, string> = {
  full_time: 'Full time',
  part_time: 'Part time',
  once_off: 'Once-off',
  skill_offer: 'Skill offer',
};

const JOB_TYPE_COLORS: Record<string, string> = {
  full_time: '#39D98A',
  part_time: '#60A5FA',
  once_off: '#F5A623',
  skill_offer: '#A78BFA',
};

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'hiring', label: 'Looking to hire' },
  { key: 'offering', label: 'Offering skills' },
];

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function JobsPage() {
  const neighbourhood = localStorage.getItem('kayaa_city') ?? 'Johannesburg';
  const [jobs, setJobs] = useState<LocalJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('all');
  const [showForm, setShowForm] = useState(false);

  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formType, setFormType] = useState('once_off');
  const [formContact, setFormContact] = useState('');
  const [formPaid, setFormPaid] = useState(true);
  const [formName, setFormName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getLocalJobs(neighbourhood).then(data => {
      setJobs(data);
      setLoading(false);
    });
  }, [neighbourhood]);

  const filtered =
    tab === 'all'
      ? jobs
      : tab === 'hiring'
        ? jobs.filter(j => j.jobType !== 'skill_offer')
        : jobs.filter(j => j.jobType === 'skill_offer');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formTitle.trim() || !formDesc.trim() || !formContact.trim() || submitting) return;
    setSubmitting(true);

    const newJob: LocalJob = {
      id: `local-${Date.now()}`,
      title: formTitle.trim(),
      description: formDesc.trim(),
      neighbourhood,
      jobType: formType as LocalJob['jobType'],
      contactInfo: formContact.trim(),
      isPaid: formPaid,
      postedBy: formName.trim() || 'Anonymous',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    };

    setJobs(prev => [newJob, ...prev]);
    setShowForm(false);
    setFormTitle('');
    setFormDesc('');
    setFormType('once_off');
    setFormContact('');
    setFormPaid(true);
    setFormName('');

    await createLocalJob({
      title: newJob.title,
      description: newJob.description,
      neighbourhood,
      job_type: formType,
      contact_info: formContact.trim(),
      is_paid: formPaid,
      posted_by: formName.trim() || 'Anonymous',
    });

    setSubmitting(false);
  }

  return (
    <div style={{ padding: '16px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
        <div>
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '20px', color: 'var(--color-text)', margin: 0 }}>
            Local Jobs
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--color-muted)', margin: '2px 0 0', fontFamily: 'DM Sans, sans-serif' }}>
            {neighbourhood} · What's available nearby
          </p>
        </div>
        <button
          onClick={() => setShowForm(v => !v)}
          style={{
            background: '#39D98A', color: '#000', border: 'none',
            borderRadius: '20px', padding: '8px 14px',
            fontSize: '13px', fontWeight: 700, cursor: 'pointer',
            fontFamily: 'DM Sans, sans-serif',
          }}
        >
          {showForm ? 'Cancel' : '+ Post'}
        </button>
      </div>

      {/* Inline post form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          style={{
            background: 'var(--color-surface)', border: '1px solid var(--color-border)',
            borderRadius: '14px', padding: '14px', marginTop: '14px', marginBottom: '4px',
          }}
        >
          <input
            type="text"
            placeholder="Job title *"
            value={formTitle}
            onChange={e => setFormTitle(e.target.value)}
            style={{
              width: '100%', background: 'var(--color-bg)', border: '1px solid var(--color-border)',
              borderRadius: '8px', padding: '8px 10px', color: 'var(--color-text)',
              fontSize: '13px', fontFamily: 'DM Sans, sans-serif',
              boxSizing: 'border-box', marginBottom: '8px', outline: 'none',
            }}
          />

          <select
            value={formType}
            onChange={e => setFormType(e.target.value)}
            style={{
              width: '100%', background: 'var(--color-bg)', border: '1px solid var(--color-border)',
              borderRadius: '8px', padding: '8px 10px', color: 'var(--color-text)',
              fontSize: '13px', fontFamily: 'DM Sans, sans-serif',
              boxSizing: 'border-box', marginBottom: '8px',
            }}
          >
            {Object.entries(JOB_TYPE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>

          <textarea
            placeholder="Describe the role or what you're offering *"
            value={formDesc}
            onChange={e => setFormDesc(e.target.value)}
            rows={3}
            style={{
              width: '100%', background: 'var(--color-bg)', border: '1px solid var(--color-border)',
              borderRadius: '8px', padding: '8px 10px', color: 'var(--color-text)',
              fontSize: '13px', fontFamily: 'DM Sans, sans-serif',
              resize: 'none', boxSizing: 'border-box', marginBottom: '8px', outline: 'none',
            }}
          />

          <input
            type="text"
            placeholder="Contact (phone, WhatsApp or email) *"
            value={formContact}
            onChange={e => setFormContact(e.target.value)}
            style={{
              width: '100%', background: 'var(--color-bg)', border: '1px solid var(--color-border)',
              borderRadius: '8px', padding: '8px 10px', color: 'var(--color-text)',
              fontSize: '13px', fontFamily: 'DM Sans, sans-serif',
              boxSizing: 'border-box', marginBottom: '8px', outline: 'none',
            }}
          />

          <input
            type="text"
            placeholder="Your name (optional)"
            value={formName}
            onChange={e => setFormName(e.target.value)}
            style={{
              width: '100%', background: 'var(--color-bg)', border: '1px solid var(--color-border)',
              borderRadius: '8px', padding: '8px 10px', color: 'var(--color-text)',
              fontSize: '13px', fontFamily: 'DM Sans, sans-serif',
              boxSizing: 'border-box', marginBottom: '10px', outline: 'none',
            }}
          />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--color-muted)', cursor: 'pointer' }}>
              <input type="checkbox" checked={formPaid} onChange={e => setFormPaid(e.target.checked)} />
              Paid opportunity
            </label>
            <button
              type="submit"
              disabled={!formTitle.trim() || !formDesc.trim() || !formContact.trim() || submitting}
              style={{
                background: (formTitle.trim() && formDesc.trim() && formContact.trim()) ? '#39D98A' : 'var(--color-border)',
                color: (formTitle.trim() && formDesc.trim() && formContact.trim()) ? '#000' : 'var(--color-muted)',
                border: 'none', borderRadius: '20px', padding: '8px 16px',
                fontSize: '13px', fontWeight: 700,
                cursor: (formTitle.trim() && formDesc.trim() && formContact.trim()) ? 'pointer' : 'default',
                fontFamily: 'DM Sans, sans-serif',
              }}
            >
              Post job
            </button>
          </div>

          <div style={{ fontSize: '11px', color: 'var(--color-muted)', marginTop: '8px' }}>
            📍 {neighbourhood} · Listed for 30 days
          </div>
        </form>
      )}

      {/* Tab bar */}
      <div style={{
        display: 'flex', gap: '6px', overflowX: 'auto', scrollbarWidth: 'none',
        marginLeft: '-16px', paddingLeft: '16px',
        marginRight: '-16px', paddingRight: '16px',
        paddingBottom: '4px', marginTop: '14px', marginBottom: '14px',
      } as React.CSSProperties}>
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              flexShrink: 0, padding: '6px 13px', borderRadius: '20px',
              border: tab === t.key ? 'none' : '1px solid var(--color-border)',
              background: tab === t.key ? '#39D98A' : 'var(--color-surface)',
              color: tab === t.key ? '#000' : 'var(--color-muted)',
              fontSize: '12px', fontWeight: 600,
              fontFamily: 'DM Sans, sans-serif', cursor: 'pointer', whiteSpace: 'nowrap',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Job listings */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--color-muted)', fontSize: '14px', fontFamily: 'DM Sans, sans-serif' }}>
          Loading...
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0' }}>
          <div style={{ marginBottom: '12px' }}><Briefcase size={32} color="var(--color-border)" /></div>
          <div style={{ color: 'var(--color-muted)', fontSize: '14px', fontFamily: 'DM Sans, sans-serif' }}>
            {tab === 'all' ? 'No jobs posted yet.' : 'Nothing in this category yet.'}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {filtered.map(job => {
            const color = JOB_TYPE_COLORS[job.jobType] ?? '#94A3B8';
            const isEmail = job.contactInfo.includes('@');
            const contactHref = isEmail
              ? `mailto:${job.contactInfo}`
              : `https://wa.me/${job.contactInfo.replace(/\D/g, '')}`;

            return (
              <div key={job.id} style={{
                background: 'var(--color-surface)', border: '1px solid var(--color-border)',
                borderRadius: '14px', padding: '14px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{
                      fontSize: '11px', fontWeight: 600, color,
                      background: `${color}18`, padding: '2px 8px', borderRadius: '20px',
                    }}>
                      {JOB_TYPE_LABELS[job.jobType] ?? job.jobType}
                    </span>
                    {job.isPaid && (
                      <span style={{
                        fontSize: '11px', fontWeight: 600, color: '#39D98A',
                        background: 'rgba(57,217,138,0.1)', padding: '2px 8px', borderRadius: '20px',
                      }}>
                        Paid
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--color-muted)', flexShrink: 0 }}>
                    {formatRelativeTime(job.createdAt)}
                  </span>
                </div>

                <div style={{
                  fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '14px',
                  color: 'var(--color-text)', marginBottom: '4px',
                }}>
                  {job.title}
                </div>

                <p style={{
                  fontSize: '13px', color: 'var(--color-muted)', margin: '0 0 10px',
                  lineHeight: 1.5, fontFamily: 'DM Sans, sans-serif',
                  display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                } as React.CSSProperties}>
                  {job.description}
                </p>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: '12px', color: 'var(--color-muted)', display: 'flex', gap: '8px', fontFamily: 'DM Sans, sans-serif' }}>
                    <span>👤 {job.postedBy}</span>
                    <span>·</span>
                    <span>📍 {job.neighbourhood}</span>
                  </div>
                  <a
                    href={contactHref}
                    style={{
                      fontSize: '12px', fontWeight: 700, color: '#39D98A',
                      textDecoration: 'none', fontFamily: 'DM Sans, sans-serif',
                    }}
                  >
                    Contact →
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
