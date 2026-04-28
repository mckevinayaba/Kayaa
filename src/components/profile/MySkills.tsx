// Placeholder — skills schema not yet in DB.
// Wire up when the skills/services table is added in a future phase.

interface MySkillsProps {
  visitorId: string;
}

export function MySkills({ visitorId: _visitorId }: MySkillsProps) {
  return (
    <div style={{ textAlign: 'center', padding: '40px 0' }}>
      <div style={{ fontSize: '48px', marginBottom: '12px' }}>🛠️</div>
      <h3 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '16px', color: '#fff', marginBottom: '8px' }}>
        Skills coming soon
      </h3>
      <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: 'rgba(255,255,255,0.45)', lineHeight: 1.6 }}>
        Post services you offer — plumbing, tutoring, hair — and let your neighbourhood find you.
      </p>
    </div>
  );
}
