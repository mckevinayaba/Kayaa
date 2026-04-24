import { useState, useEffect } from 'react';
import { Briefcase, Share2, Sparkles } from 'lucide-react';
import { getLocalJobs, createLocalJob, type LocalJob } from '../lib/api';
import ShareModal from '../components/ShareModal';

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
  { key: 'all',      label: 'All' },
  { key: 'hiring',   label: 'Hiring' },
  { key: 'skills',   label: 'Skills' },
];

const AVAILABILITY_OPTIONS = ['Weekdays', 'Weekends', 'Anytime'];

const INPUT_STYLE: React.CSSProperties = {
  width: '100%', background: 'var(--color-bg)', border: '1px solid var(--color-border)',
  borderRadius: '8px', padding: '8px 10px', color: 'var(--color-text)',
  fontSize: '13px', fontFamily: 'DM Sans, sans-serif',
  boxSizing: 'border-box', marginBottom: '8px', outline: 'none',
};

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ─── Job card ─────────────────────────────────────────────────────────────────

function JobCard({ job, onShare }: { job: LocalJob; onShare: (j: LocalJob) => void }) {
  const color = JOB_TYPE_COLORS[job.jobType] ?? '#94A3B8';
  const isEmail = job.contactInfo.includes('@');
  const contactHref = isEmail
    ? `mailto:${job.contactInfo}`
    : `https://wa.me/${job.contactInfo.replace(/\D/g, '')}`;

  return (
    <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '14px', padding: '14px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '11px', fontWeight: 600, color, background: `${color}18`, padding: '2px 8px', borderRadius: '20px' }}>
            {JOB_TYPE_LABELS[job.jobType] ?? job.jobType}
          </span>
          {job.isPaid && (
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#39D98A', background: 'rgba(57,217,138,0.1)', padding: '2px 8px', borderRadius: '20px' }}>
              Paid
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '11px', color: 'var(--color-muted)', flexShrink: 0 }}>{formatRelativeTime(job.createdAt)}</span>
          <button onClick={() => onShare(job)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '2px', display: 'flex' }}>
            <Share2 size={14} color="var(--color-muted)" />
          </button>
        </div>
      </div>
      <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '14px', color: 'var(--color-text)', marginBottom: '4px' }}>
        {job.title}
      </div>
      <p style={{
        fontSize: '13px', color: 'var(--color-muted)', margin: '0 0 10px',
        lineHeight: 1.5, fontFamily: 'DM Sans, sans-serif',
        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
      } as React.CSSProperties}>
        {job.description}
      </p>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: '12px', color: 'var(--color-muted)', display: 'flex', gap: '8px', fontFamily: 'DM Sans, sans-serif' }}>
          <span>👤 {job.postedBy}</span>
          <span>·</span>
          <span>📍 {job.neighbourhood}</span>
        </div>
        <a href={contactHref} style={{ fontSize: '12px', fontWeight: 700, color: '#39D98A', textDecoration: 'none', fontFamily: 'DM Sans, sans-serif' }}>
          Contact →
        </a>
      </div>
    </div>
  );
}

// ─── Skill card ───────────────────────────────────────────────────────────────

function SkillCard({ job, onShare }: { job: LocalJob; onShare: (j: LocalJob) => void }) {
  const initial = job.postedBy.trim()[0]?.toUpperCase() ?? '?';
  const isEmail = job.contactInfo.includes('@');
  const contactHref = isEmail
    ? `mailto:${job.contactInfo}`
    : `https://wa.me/${job.contactInfo.replace(/\D/g, '')}`;

  return (
    <div style={{ background: 'var(--color-surface)', border: '1px solid rgba(157,127,234,0.2)', borderRadius: '14px', padding: '14px' }}>
      <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
        {/* Purple avatar */}
        <div style={{
          width: '44px', height: '44px', borderRadius: '50%', flexShrink: 0,
          background: 'rgba(157,127,234,0.15)', border: '1.5px solid rgba(157,127,234,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '18px', color: '#9D7FEA',
        }}>
          {initial}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
            <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '15px', color: 'var(--color-text)', lineHeight: 1.2 }}>
              {job.title}
            </div>
            <button onClick={() => onShare(job)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '2px', display: 'flex', flexShrink: 0 }}>
              <Share2 size={14} color="var(--color-muted)" />
            </button>
          </div>
          <span style={{ fontSize: '11px', fontWeight: 700, color: '#9D7FEA', background: 'rgba(157,127,234,0.12)', padding: '2px 8px', borderRadius: '20px', display: 'inline-block', marginBottom: '6px' }}>
            Skill offer
          </span>
          <p style={{
            fontSize: '13px', color: 'var(--color-muted)', margin: '0 0 8px',
            lineHeight: 1.5, fontFamily: 'DM Sans, sans-serif',
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
          } as React.CSSProperties}>
            {job.description}
          </p>
          <div style={{ fontSize: '12px', color: 'var(--color-muted)', fontFamily: 'DM Sans, sans-serif', marginBottom: '10px' }}>
            <span>👤 {job.postedBy}</span>
            <span style={{ margin: '0 6px' }}>·</span>
            <span>📍 {job.neighbourhood}</span>
            {job.isPaid && <><span style={{ margin: '0 6px' }}>·</span><span style={{ color: '#39D98A' }}>Paid</span></>}
          </div>
          <a
            href={contactHref}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '4px',
              fontSize: '12px', fontWeight: 700, color: '#9D7FEA',
              background: 'rgba(157,127,234,0.1)', border: '1px solid rgba(157,127,234,0.2)',
              borderRadius: '20px', padding: '5px 12px', textDecoration: 'none',
              fontFamily: 'DM Sans, sans-serif',
            }}
          >
            Get in touch →
          </a>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function JobsPage() {
  const neighbourhood = localStorage.getItem('kayaa_suburb') ?? localStorage.getItem('kayaa_city') ?? 'Johannesburg';

  const [jobs, setJobs] = useState<LocalJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [shareJob, setShareJob] = useState<LocalJob | null>(null);
  const [justPostedSkill, setJustPostedSkill] = useState<LocalJob | null>(null);

  // Job form
  const [formTitle, setFormTitle]     = useState('');
  const [formDesc, setFormDesc]       = useState('');
  const [formType, setFormType]       = useState('once_off');
  const [formContact, setFormContact] = useState('');
  const [formPaid, setFormPaid]       = useState(true);
  const [formName, setFormName]       = useState('');
  const [submitting, setSubmitting]   = useState(false);

  // Skill form
  const [showSkillForm, setShowSkillForm]         = useState(false);
  const [skillName, setSkillName]                 = useState('');
  const [skillDesc, setSkillDesc]                 = useState('');
  const [skillPersonName, setSkillPersonName]     = useState('');
  const [skillNeighbourhood, setSkillNeighbourhood] = useState(neighbourhood);
  const [skillContact, setSkillContact]           = useState('');
  const [skillAvailability, setSkillAvailability] = useState('Anytime');
  const [skillPaid, setSkillPaid]                 = useState(true);
  const [skillSubmitting, setSkillSubmitting]     = useState(false);

  useEffect(() => {
    getLocalJobs(neighbourhood).then(data => {
      setJobs(data);
      setLoading(false);
    });
  }, [neighbourhood]);

  const filtered =
    tab === 'all'     ? jobs :
    tab === 'hiring'  ? jobs.filter(j => j.jobType !== 'skill_offer') :
                        jobs.filter(j => j.jobType === 'skill_offer');

  async function handleJobSubmit(e: React.FormEvent) {
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
    setFormTitle(''); setFormDesc(''); setFormType('once_off');
    setFormContact(''); setFormPaid(true); setFormName('');

    await createLocalJob({
      title: newJob.title, description: newJob.description, neighbourhood,
      job_type: formType, contact_info: formContact.trim(),
      is_paid: formPaid, posted_by: formName.trim() || 'Anonymous',
    });
    setSubmitting(false);
  }

  async function handleSkillSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!skillName.trim() || !skillContact.trim() || skillSubmitting) return;
    setSkillSubmitting(true);

    const newSkill: LocalJob = {
      id: `local-skill-${Date.now()}`,
      title: skillName.trim(),
      description: skillDesc.trim(),
      neighbourhood: skillNeighbourhood.trim() || neighbourhood,
      jobType: 'skill_offer',
      contactInfo: skillContact.trim(),
      isPaid: skillPaid,
      postedBy: skillPersonName.trim() || 'Anonymous',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    };

    setJobs(prev => [newSkill, ...prev]);
    setShowSkillForm(false);
    setSkillName(''); setSkillDesc(''); setSkillPersonName('');
    setSkillContact(''); setSkillAvailability('Anytime'); setSkillPaid(true);

    await createLocalJob({
      title: newSkill.title,
      description: `${newSkill.description}${skillAvailability ? ` · Available: ${skillAvailability}` : ''}`.trim(),
      neighbourhood: newSkill.neighbourhood,
      job_type: 'skill_offer',
      contact_info: skillContact.trim(),
      is_paid: skillPaid,
      posted_by: skillPersonName.trim() || 'Anonymous',
    });

    setSkillSubmitting(false);
    setJustPostedSkill(newSkill);
  }

  return (
    <div style={{ padding: '16px' }}>

      {/* Share modals */}
      {shareJob && (
        shareJob.jobType === 'skill_offer' ? (
          <ShareModal
            type="skill"
            data={{ skillName: shareJob.title, personName: shareJob.postedBy, neighborhood: shareJob.neighbourhood }}
            isOpen={!!shareJob}
            onClose={() => setShareJob(null)}
          />
        ) : (
          <ShareModal
            type="job"
            data={{ title: shareJob.title, jobType: shareJob.jobType, neighborhood: shareJob.neighbourhood, postedBy: shareJob.postedBy }}
            isOpen={!!shareJob}
            onClose={() => setShareJob(null)}
          />
        )
      )}

      {/* Post-skill share modal */}
      {justPostedSkill && (
        <ShareModal
          type="skill"
          data={{ skillName: justPostedSkill.title, personName: justPostedSkill.postedBy, neighborhood: justPostedSkill.neighbourhood }}
          isOpen={!!justPostedSkill}
          onClose={() => setJustPostedSkill(null)}
        />
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
        <div>
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '20px', color: 'var(--color-text)', margin: 0 }}>
            {tab === 'skills' ? 'Local Skills' : 'Local Jobs'}
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--color-muted)', margin: '2px 0 0', fontFamily: 'DM Sans, sans-serif' }}>
            {neighbourhood} · Local opportunities
          </p>
        </div>
        {tab !== 'skills' ? (
          <button
            onClick={() => setShowForm(v => !v)}
            style={{ background: '#39D98A', color: '#000', border: 'none', borderRadius: '20px', padding: '8px 14px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}
          >
            {showForm ? 'Cancel' : '+ Post'}
          </button>
        ) : (
          <button
            onClick={() => setShowSkillForm(v => !v)}
            style={{ background: 'rgba(157,127,234,0.12)', color: '#9D7FEA', border: '1px solid rgba(157,127,234,0.3)', borderRadius: '20px', padding: '8px 14px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}
          >
            {showSkillForm ? 'Cancel' : '+ Post a skill'}
          </button>
        )}
      </div>

      {/* Job post form */}
      {showForm && tab !== 'skills' && (
        <form onSubmit={handleJobSubmit} style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '14px', padding: '14px', marginTop: '14px', marginBottom: '4px' }}>
          <input type="text" placeholder="Job title *" value={formTitle} onChange={e => setFormTitle(e.target.value)} style={INPUT_STYLE} />
          <select value={formType} onChange={e => setFormType(e.target.value)} style={{ ...INPUT_STYLE }}>
            {Object.entries(JOB_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <textarea placeholder="Describe the role *" value={formDesc} onChange={e => setFormDesc(e.target.value)} rows={3} style={{ ...INPUT_STYLE, resize: 'none' }} />
          <input type="text" placeholder="Contact (phone, WhatsApp or email) *" value={formContact} onChange={e => setFormContact(e.target.value)} style={INPUT_STYLE} />
          <input type="text" placeholder="Your name (optional)" value={formName} onChange={e => setFormName(e.target.value)} style={INPUT_STYLE} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--color-muted)', cursor: 'pointer' }}>
              <input type="checkbox" checked={formPaid} onChange={e => setFormPaid(e.target.checked)} /> Paid opportunity
            </label>
            <button type="submit" disabled={!formTitle.trim() || !formDesc.trim() || !formContact.trim() || submitting}
              style={{ background: (formTitle.trim() && formDesc.trim() && formContact.trim()) ? '#39D98A' : 'var(--color-border)', color: (formTitle.trim() && formDesc.trim() && formContact.trim()) ? '#000' : 'var(--color-muted)', border: 'none', borderRadius: '20px', padding: '8px 16px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
              Post job
            </button>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--color-muted)', marginTop: '8px' }}>📍 {neighbourhood} · Listed for 30 days</div>
        </form>
      )}

      {/* Skill post form */}
      {showSkillForm && tab === 'skills' && (
        <form onSubmit={handleSkillSubmit} style={{ background: 'var(--color-surface)', border: '1px solid rgba(157,127,234,0.2)', borderRadius: '14px', padding: '14px', marginTop: '14px', marginBottom: '4px' }}>
          <input type="text" placeholder="What is your skill? e.g. Hair braiding, Plumbing, Tutoring *" value={skillName} onChange={e => setSkillName(e.target.value)} style={INPUT_STYLE} />
          <textarea
            placeholder="Tell us more (optional)"
            value={skillDesc}
            onChange={e => setSkillDesc(e.target.value.slice(0, 150))}
            rows={3}
            style={{ ...INPUT_STYLE, resize: 'none' }}
          />
          <div style={{ fontSize: '11px', color: 'var(--color-muted)', textAlign: 'right', marginTop: '-6px', marginBottom: '8px' }}>{skillDesc.length}/150</div>
          <input type="text" placeholder="Your name *" value={skillPersonName} onChange={e => setSkillPersonName(e.target.value)} style={INPUT_STYLE} />
          <input type="text" placeholder="Your neighbourhood" value={skillNeighbourhood} onChange={e => setSkillNeighbourhood(e.target.value)} style={INPUT_STYLE} />
          <input type="text" placeholder="Contact number or WhatsApp *" value={skillContact} onChange={e => setSkillContact(e.target.value)} style={INPUT_STYLE} />

          {/* Availability chips */}
          <div style={{ marginBottom: '10px' }}>
            <div style={{ fontSize: '12px', color: 'var(--color-muted)', marginBottom: '6px' }}>Available:</div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {AVAILABILITY_OPTIONS.map(opt => (
                <button
                  key={opt} type="button"
                  onClick={() => setSkillAvailability(opt)}
                  style={{
                    padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 600,
                    cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
                    background: skillAvailability === opt ? 'rgba(157,127,234,0.15)' : 'transparent',
                    border: `1px solid ${skillAvailability === opt ? 'rgba(157,127,234,0.5)' : 'var(--color-border)'}`,
                    color: skillAvailability === opt ? '#9D7FEA' : 'var(--color-muted)',
                  }}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--color-muted)', cursor: 'pointer' }}>
              <input type="checkbox" checked={skillPaid} onChange={e => setSkillPaid(e.target.checked)} /> Paid work
            </label>
            <button
              type="submit"
              disabled={!skillName.trim() || !skillContact.trim() || skillSubmitting}
              style={{
                background: (skillName.trim() && skillContact.trim()) ? '#9D7FEA' : 'var(--color-border)',
                color: (skillName.trim() && skillContact.trim()) ? '#fff' : 'var(--color-muted)',
                border: 'none', borderRadius: '20px', padding: '8px 16px',
                fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Syne, sans-serif',
              }}
            >
              Post my skill
            </button>
          </div>
        </form>
      )}

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', scrollbarWidth: 'none', marginLeft: '-16px', paddingLeft: '16px', marginRight: '-16px', paddingRight: '16px', paddingBottom: '4px', marginTop: '14px', marginBottom: '14px' } as React.CSSProperties}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            flexShrink: 0, padding: '6px 13px', borderRadius: '20px',
            border: tab === t.key ? 'none' : '1px solid var(--color-border)',
            background: tab === t.key ? (t.key === 'skills' ? '#9D7FEA' : '#39D98A') : 'var(--color-surface)',
            color: tab === t.key ? (t.key === 'skills' ? '#fff' : '#000') : 'var(--color-muted)',
            fontSize: '12px', fontWeight: 600, fontFamily: 'DM Sans, sans-serif', cursor: 'pointer', whiteSpace: 'nowrap',
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Listings */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--color-muted)', fontSize: '14px', fontFamily: 'DM Sans, sans-serif' }}>Loading...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0' }}>
          <div style={{ marginBottom: '12px' }}>
            {tab === 'skills' ? <Sparkles size={32} color="rgba(157,127,234,0.4)" /> : <Briefcase size={32} color="var(--color-border)" />}
          </div>
          <div style={{ color: 'var(--color-muted)', fontSize: '14px', fontFamily: 'DM Sans, sans-serif' }}>
            {tab === 'skills' ? 'No skills posted yet. Be the first!' : tab === 'all' ? 'No jobs posted yet.' : 'Nothing in this category yet.'}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {filtered.map(job =>
            job.jobType === 'skill_offer' && tab === 'skills'
              ? <SkillCard key={job.id} job={job} onShare={setShareJob} />
              : <JobCard   key={job.id} job={job} onShare={setShareJob} />
          )}
        </div>
      )}
    </div>
  );
}
