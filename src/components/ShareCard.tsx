import { forwardRef } from 'react';

// ─── Data types per card ──────────────────────────────────────────────────────

export interface PlaceCardData {
  name: string;
  slug: string;
  category: string;
  emoji: string;
  neighborhood: string;
  city: string;
  description: string;
  checkinCount: number;
  isOpen: boolean;
}

export interface EventCardData {
  title: string;
  venueName: string;
  venueSlug: string;
  startsAt: string;
  location: string;
  isFree: boolean;
  price?: number;
}

export interface JobCardData {
  title: string;
  jobType: string;
  neighborhood: string;
  postedBy: string;
}

export interface SkillCardData {
  skillName: string;
  personName: string;
  neighborhood: string;
  availability?: string;
}

export interface MilestoneCardData {
  visitNumber: number;
  placeName: string;
  placeSlug: string;
  message: string;
}

export interface RegularCardData {
  name: string;
  neighborhood: string;
  totalVisits: number;
  topPlaces: { name: string; visitCount: number }[];
}

export type ShareCardType = 'place' | 'event' | 'job' | 'skill' | 'milestone' | 'regular_card';

export type ShareCardData =
  | { type: 'place'; data: PlaceCardData }
  | { type: 'event'; data: EventCardData }
  | { type: 'job'; data: JobCardData }
  | { type: 'skill'; data: SkillCardData }
  | { type: 'milestone'; data: MilestoneCardData }
  | { type: 'regular_card'; data: RegularCardData };

// ─── Shared style constants ───────────────────────────────────────────────────

const BASE: React.CSSProperties = {
  width: '400px',
  height: '400px',
  background: '#0D1117',
  borderRadius: '16px',
  padding: '28px',
  boxSizing: 'border-box',
  display: 'flex',
  flexDirection: 'column',
  position: 'relative',
  fontFamily: 'DM Sans, sans-serif',
  overflow: 'hidden',
};

const WORDMARK: React.CSSProperties = {
  fontFamily: 'Syne, sans-serif',
  fontWeight: 800,
  fontSize: '13px',
  color: '#39D98A',
  letterSpacing: '-0.01em',
};

const MUTED: React.CSSProperties = {
  fontSize: '12px',
  color: 'rgba(255,255,255,0.52)',
};

const CORNER_URL: React.CSSProperties = {
  position: 'absolute',
  bottom: '22px',
  right: '28px',
  fontSize: '11px',
  color: 'rgba(255,255,255,0.35)',
  fontFamily: 'DM Sans, sans-serif',
};

function Pill({ label, color, bg }: { label: string; color: string; bg: string }) {
  return (
    <span style={{
      fontSize: '11px', fontWeight: 700, color, background: bg,
      padding: '3px 10px', borderRadius: '20px', whiteSpace: 'nowrap',
      fontFamily: 'DM Sans, sans-serif',
    }}>
      {label}
    </span>
  );
}

function formatEventDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-ZA', {
    weekday: 'short', day: 'numeric', month: 'short',
  });
}

// ─── Card layouts ─────────────────────────────────────────────────────────────

function PlaceCard({ data }: { data: PlaceCardData }) {
  const statusLabel = !data.isOpen ? 'Closed' : data.checkinCount > 1000 ? 'Busy now' : 'Open now';
  const statusColor = !data.isOpen ? '#6B7280' : '#39D98A';
  const desc = data.description.length > 72 ? data.description.slice(0, 69) + '…' : data.description;

  return (
    <div style={BASE}>
      {/* Top row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
        <span style={WORDMARK}>kayaa</span>
      </div>

      {/* Avatar */}
      <div style={{
        width: '64px', height: '64px', borderRadius: '50%',
        background: 'rgba(57,217,138,0.12)', border: '1.5px solid rgba(57,217,138,0.3)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '32px', marginBottom: '16px',
      }}>
        {data.emoji}
      </div>

      {/* Name */}
      <h2 style={{
        fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '26px',
        color: '#FFFFFF', lineHeight: 1.15, marginBottom: '10px',
        maxWidth: '100%', overflow: 'hidden',
        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
      } as React.CSSProperties}>
        {data.name}
      </h2>

      {/* Badges row */}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap' }}>
        <Pill label={data.category} color="#39D98A" bg="rgba(57,217,138,0.12)" />
        <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: statusColor, flexShrink: 0 }} />
        <span style={{ fontSize: '12px', color: statusColor, fontWeight: 600 }}>{statusLabel}</span>
      </div>

      {/* Location */}
      <p style={{ ...MUTED, marginBottom: '6px' }}>{data.neighborhood}, {data.city}</p>

      {/* Regulars */}
      <p style={{ fontSize: '13px', color: '#39D98A', fontWeight: 600, marginBottom: '10px' }}>
        {data.checkinCount.toLocaleString()} regulars
      </p>

      {/* Description */}
      <p style={{ ...MUTED, fontSize: '13px', lineHeight: 1.5, marginBottom: 0, flex: 1 }}>{desc}</p>

      <span style={CORNER_URL}>kayaa.co.za/venue/{data.slug}</span>
    </div>
  );
}

function EventCard({ data }: { data: EventCardData }) {
  return (
    <div style={BASE}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '36px' }}>
        <span style={WORDMARK}>kayaa</span>
        <Pill label="Happening" color="#39D98A" bg="rgba(57,217,138,0.12)" />
      </div>

      <h2 style={{
        fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '28px',
        color: '#FFFFFF', lineHeight: 1.15, marginBottom: '10px',
        overflow: 'hidden', display: '-webkit-box',
        WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
      } as React.CSSProperties}>
        {data.title}
      </h2>

      <p style={{ fontSize: '14px', color: '#39D98A', fontWeight: 600, marginBottom: '16px' }}>
        @ {data.venueName}
      </p>

      <p style={{ ...MUTED, marginBottom: '6px' }}>📅 {formatEventDate(data.startsAt)}</p>
      <p style={{ ...MUTED, marginBottom: '16px' }}>📍 {data.location}</p>

      <div>
        {data.isFree ? (
          <Pill label="Free entry" color="#39D98A" bg="rgba(57,217,138,0.12)" />
        ) : (
          <Pill label={`R${data.price}`} color="#F5A623" bg="rgba(245,166,35,0.12)" />
        )}
      </div>

      <span style={CORNER_URL}>kayaa.co.za/venue/{data.venueSlug}</span>
    </div>
  );
}

const JOB_TYPE_LABELS: Record<string, string> = {
  full_time: 'Full time', part_time: 'Part time', once_off: 'Once-off', skill_offer: 'Skill offer',
};

function JobCard({ data }: { data: JobCardData }) {
  return (
    <div style={BASE}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '36px' }}>
        <span style={WORDMARK}>kayaa</span>
        <Pill label="Opportunity" color="#F5A623" bg="rgba(245,166,35,0.12)" />
      </div>

      <h2 style={{
        fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '28px',
        color: '#FFFFFF', lineHeight: 1.15, marginBottom: '12px',
        overflow: 'hidden', display: '-webkit-box',
        WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
      } as React.CSSProperties}>
        {data.title}
      </h2>

      <div style={{ marginBottom: '12px' }}>
        <Pill
          label={JOB_TYPE_LABELS[data.jobType] ?? data.jobType}
          color="#F5A623"
          bg="rgba(245,166,35,0.12)"
        />
      </div>

      <p style={{ ...MUTED, marginBottom: '6px' }}>📍 {data.neighborhood}</p>
      <p style={{ ...MUTED }}>👤 Posted by {data.postedBy}</p>

      <span style={CORNER_URL}>kayaa.co.za/jobs</span>
    </div>
  );
}

function SkillCard({ data }: { data: SkillCardData }) {
  return (
    <div style={BASE}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '36px' }}>
        <span style={WORDMARK}>kayaa</span>
        <Pill label="Skill available" color="#9D7FEA" bg="rgba(157,127,234,0.12)" />
      </div>

      <h2 style={{
        fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '28px',
        color: '#FFFFFF', lineHeight: 1.15, marginBottom: '10px',
        overflow: 'hidden', display: '-webkit-box',
        WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
      } as React.CSSProperties}>
        {data.skillName}
      </h2>

      <p style={{ fontSize: '14px', color: '#39D98A', fontWeight: 600, marginBottom: '12px' }}>
        {data.personName}
      </p>

      <p style={{ ...MUTED, marginBottom: '6px' }}>📍 {data.neighborhood}</p>
      {data.availability && (
        <p style={{ ...MUTED, marginBottom: '6px' }}>🕐 {data.availability}</p>
      )}
      <p style={{ ...MUTED, marginTop: '8px' }}>Contact via kayaa</p>

      <span style={CORNER_URL}>kayaa.co.za/jobs</span>
    </div>
  );
}

function MilestoneCard({ data }: { data: MilestoneCardData }) {
  return (
    <div style={BASE}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <span style={WORDMARK}>kayaa</span>
      </div>

      {/* Checkmark circle */}
      <div style={{
        width: '72px', height: '72px', borderRadius: '50%',
        background: 'rgba(57,217,138,0.15)', border: '2px solid rgba(57,217,138,0.4)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '32px', marginBottom: '20px',
      }}>
        ✓
      </div>

      <h2 style={{
        fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '40px',
        color: '#FFFFFF', lineHeight: 1, marginBottom: '10px',
      }}>
        Visit {data.visitNumber}
      </h2>

      <p style={{ fontSize: '16px', color: '#39D98A', fontWeight: 600, marginBottom: '10px' }}>
        {data.placeName}
      </p>

      <p style={{ ...MUTED, fontSize: '14px', lineHeight: 1.5 }}>{data.message}</p>

      <span style={CORNER_URL}>kayaa.co.za/venue/{data.placeSlug}</span>
    </div>
  );
}

function RegularCardCard({ data }: { data: RegularCardData }) {
  const initial = data.name.trim()[0]?.toUpperCase() ?? '?';

  return (
    <div style={BASE}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <span style={WORDMARK}>kayaa</span>
      </div>

      {/* Avatar */}
      <div style={{
        width: '64px', height: '64px', borderRadius: '50%',
        background: 'rgba(57,217,138,0.15)', border: '2px solid rgba(57,217,138,0.4)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '28px',
        color: '#39D98A', marginBottom: '14px',
      }}>
        {initial}
      </div>

      <h2 style={{
        fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '22px',
        color: '#FFFFFF', lineHeight: 1.2, marginBottom: '4px',
      }}>
        {data.name}'s Regular Card
      </h2>

      <p style={{ fontSize: '13px', color: '#39D98A', fontWeight: 600, marginBottom: '16px' }}>
        {data.neighborhood} Regular
      </p>

      {/* Top places */}
      <div style={{ flex: 1 }}>
        {data.topPlaces.slice(0, 3).map((p, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.75)' }}>{p.name}</span>
            <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>{p.visitCount} visits</span>
          </div>
        ))}
      </div>

      <p style={{ ...MUTED, fontSize: '12px' }}>
        {data.totalVisits} check-ins total
      </p>

      <span style={CORNER_URL}>kayaa.co.za</span>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

const ShareCard = forwardRef<HTMLDivElement, ShareCardData>((props, ref) => {
  return (
    <div
      ref={ref}
      style={{
        position: 'fixed',
        left: '-9999px',
        top: '-9999px',
        zIndex: -1,
        pointerEvents: 'none',
      }}
    >
      {props.type === 'place'        && <PlaceCard data={props.data} />}
      {props.type === 'event'        && <EventCard data={props.data} />}
      {props.type === 'job'          && <JobCard data={props.data} />}
      {props.type === 'skill'        && <SkillCard data={props.data} />}
      {props.type === 'milestone'    && <MilestoneCard data={props.data} />}
      {props.type === 'regular_card' && <RegularCardCard data={props.data} />}
    </div>
  );
});

ShareCard.displayName = 'ShareCard';
export default ShareCard;
