import { Link } from 'react-router-dom';
import { TrendingUp, CheckSquare, Users, Calendar, ChevronRight, Plus } from 'lucide-react';
import { mockVenues, mockCheckIns, mockEvents } from '../lib/mockData';

const ownerVenue = mockVenues[0];
const recentCheckIns = mockCheckIns.filter(c => c.venueId === ownerVenue.id);
const upcomingEvents = mockEvents.filter(e => e.venueId === ownerVenue.id);

function StatCard({ label, value, sub, accent = false }: { label: string; value: string | number; sub?: string; accent?: boolean }) {
  return (
    <div style={{
      background: 'var(--color-surface)',
      border: `1px solid ${accent ? 'rgba(57,217,138,0.3)' : 'var(--color-border)'}`,
      borderRadius: '12px',
      padding: '16px',
    }}>
      <div style={{
        fontFamily: 'Syne, sans-serif',
        fontWeight: 700,
        fontSize: '28px',
        color: accent ? 'var(--color-accent)' : 'var(--color-text)',
        marginBottom: '4px',
      }}>
        {value}
      </div>
      <div style={{ fontSize: '12px', color: 'var(--color-muted)', fontWeight: 500 }}>{label}</div>
      {sub && <div style={{ fontSize: '11px', color: 'var(--color-accent)', marginTop: '4px' }}>{sub}</div>}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <div style={{ padding: '16px' }}>
      <div style={{ marginBottom: '20px' }}>
        <p style={{ fontSize: '13px', color: 'var(--color-muted)', marginBottom: '2px' }}>Owner dashboard</p>
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '22px' }}>
          {ownerVenue.name}
        </h1>
        <Link to={`/venue/${ownerVenue.slug}`} style={{ fontSize: '13px', color: 'var(--color-accent)', textDecoration: 'none' }}>
          View public page →
        </Link>
      </div>

      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '24px' }}>
        <StatCard label="Total check-ins" value={ownerVenue.checkinCount.toLocaleString()} sub="+47 this week" accent />
        <StatCard label="Followers" value={ownerVenue.followerCount} sub="+12 this week" />
        <StatCard label="Events" value={upcomingEvents.length} sub="upcoming" />
        <StatCard label="Status" value={ownerVenue.isOpen ? 'Open' : 'Closed'} />
      </div>

      {/* Weekly trend */}
      <div style={{
        background: 'var(--color-surface)', border: '1px solid var(--color-border)',
        borderRadius: '12px', padding: '16px', marginBottom: '20px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '16px' }}>
          <TrendingUp size={16} color="var(--color-accent)" />
          <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '14px' }}>Weekly check-ins</span>
        </div>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-end', height: '60px' }}>
          {[28, 45, 32, 67, 89, 54, 73].map((h, i) => (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
              <div style={{
                width: '100%',
                height: `${(h / 89) * 48}px`,
                background: i === 6 ? 'var(--color-accent)' : 'var(--color-surface2)',
                borderRadius: '4px',
              }} />
              <span style={{ fontSize: '10px', color: 'var(--color-muted)' }}>
                {['M', 'T', 'W', 'T', 'F', 'S', 'S'][i]}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Recent check-ins */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '15px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <CheckSquare size={15} color="var(--color-accent)" /> Recent check-ins
          </h2>
        </div>
        {recentCheckIns.length > 0 ? recentCheckIns.map(ci => (
          <div key={ci.id} style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '10px 0', borderBottom: '1px solid var(--color-border)',
          }}>
            <div style={{
              width: '34px', height: '34px', borderRadius: '50%',
              background: 'var(--color-surface2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '13px', color: 'var(--color-accent)',
            }}>
              {ci.userName[0]}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '14px', fontWeight: 600 }}>{ci.userName}</div>
              {ci.note && <div style={{ fontSize: '12px', color: 'var(--color-muted)' }}>{ci.note}</div>}
            </div>
            <span style={{ fontSize: '11px', color: 'var(--color-muted)' }}>
              {new Date(ci.createdAt).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })}
            </span>
          </div>
        )) : (
          <p style={{ fontSize: '14px', color: 'var(--color-muted)' }}>No check-ins yet today.</p>
        )}
      </div>

      {/* Events */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '15px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Calendar size={15} color="var(--color-accent)" /> Events
          </h2>
          <button style={{
            display: 'flex', alignItems: 'center', gap: '4px',
            background: 'transparent', border: '1px solid var(--color-border)', borderRadius: '8px',
            padding: '5px 10px', color: 'var(--color-accent)', fontSize: '12px', cursor: 'pointer',
            fontFamily: 'DM Sans, sans-serif',
          }}>
            <Plus size={13} /> Add
          </button>
        </div>
        {upcomingEvents.length > 0 ? upcomingEvents.map(event => (
          <div key={event.id} style={{
            background: 'var(--color-surface)', border: '1px solid var(--color-border)',
            borderRadius: '10px', padding: '12px', marginBottom: '8px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '2px' }}>{event.title}</div>
              <div style={{ fontSize: '12px', color: 'var(--color-muted)' }}>
                {new Date(event.startsAt).toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short' })}
              </div>
            </div>
            <ChevronRight size={16} color="var(--color-muted)" />
          </div>
        )) : (
          <p style={{ fontSize: '14px', color: 'var(--color-muted)' }}>No upcoming events. Create one!</p>
        )}
      </div>

      {/* Manage venue link */}
      <Link to="/onboarding" style={{ textDecoration: 'none' }}>
        <div style={{
          background: 'var(--color-surface)', border: '1px solid var(--color-border)',
          borderRadius: '12px', padding: '14px 16px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users size={16} color="var(--color-muted)" />
            <span style={{ fontSize: '14px', fontWeight: 600 }}>Register another venue</span>
          </div>
          <ChevronRight size={16} color="var(--color-muted)" />
        </div>
      </Link>
    </div>
  );
}
