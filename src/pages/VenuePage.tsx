import { useParams, Link } from 'react-router-dom';
import { MapPin, Clock, Users, CheckSquare, Calendar, ChevronRight } from 'lucide-react';
import { mockVenues, mockPosts, mockEvents } from '../lib/mockData';

export default function VenuePage() {
  const { slug } = useParams<{ slug: string }>();
  const venue = mockVenues.find(v => v.slug === slug);

  if (!venue) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', flexDirection: 'column', gap: '12px' }}>
        <span style={{ fontSize: '40px' }}>🔍</span>
        <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700 }}>Venue not found</h2>
        <Link to="/feed" style={{ color: 'var(--color-accent)', fontSize: '14px' }}>Back to feed</Link>
      </div>
    );
  }

  const venuePosts = mockPosts.filter(p => p.venueId === venue.id);
  const venueEvents = mockEvents.filter(e => e.venueId === venue.id);

  return (
    <div>
      {/* Cover */}
      <div style={{
        height: '200px',
        background: 'linear-gradient(135deg, var(--color-surface2) 0%, #0D1117 100%)',
        display: 'flex',
        alignItems: 'flex-end',
        padding: '16px',
        position: 'relative',
      }}>
        <div style={{
          position: 'absolute', top: '16px', left: '16px',
          background: 'rgba(13,17,23,0.7)', borderRadius: '20px', padding: '4px 10px',
          backdropFilter: 'blur(8px)',
        }}>
          <span style={{ fontSize: '12px', color: 'var(--color-accent)', fontWeight: 600 }}>{venue.category}</span>
        </div>
        <div style={{
          width: '60px', height: '60px', borderRadius: '16px',
          background: 'var(--color-surface)',
          border: '2px solid var(--color-border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '24px', color: 'var(--color-accent)',
        }}>
          {venue.name[0]}
        </div>
      </div>

      {/* Info */}
      <div style={{ padding: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '22px', marginBottom: '6px' }}>
              {venue.name}
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
              <MapPin size={13} color="var(--color-muted)" />
              <span style={{ fontSize: '13px', color: 'var(--color-muted)' }}>{venue.address}, {venue.neighborhood}</span>
            </div>
            {venue.openHours && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Clock size={13} color="var(--color-muted)" />
                <span style={{ fontSize: '13px', color: 'var(--color-muted)' }}>{venue.openHours}</span>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{
              width: '8px', height: '8px', borderRadius: '50%',
              background: venue.isOpen ? '#39D98A' : '#6B7280',
            }} />
            <span style={{ fontSize: '13px', fontWeight: 600, color: venue.isOpen ? '#39D98A' : '#6B7280' }}>
              {venue.isOpen ? 'Open' : 'Closed'}
            </span>
          </div>
        </div>

        <p style={{ fontSize: '14px', color: 'var(--color-muted)', lineHeight: 1.6, marginBottom: '16px' }}>
          {venue.description}
        </p>

        {/* Stats */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
          <div style={{
            flex: 1, background: 'var(--color-surface)', border: '1px solid var(--color-border)',
            borderRadius: '10px', padding: '12px', textAlign: 'center',
          }}>
            <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '20px', color: 'var(--color-accent)' }}>
              {venue.checkinCount.toLocaleString()}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--color-muted)' }}>Check-ins</div>
          </div>
          <div style={{
            flex: 1, background: 'var(--color-surface)', border: '1px solid var(--color-border)',
            borderRadius: '10px', padding: '12px', textAlign: 'center',
          }}>
            <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '20px', color: 'var(--color-text)' }}>
              {venue.followerCount}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--color-muted)' }}>Followers</div>
          </div>
        </div>

        {/* Check-in CTA */}
        <Link to={`/venue/${venue.slug}/checkin`} style={{ textDecoration: 'none', display: 'block', marginBottom: '24px' }}>
          <div style={{
            background: 'var(--color-accent)',
            color: '#000',
            borderRadius: '12px',
            padding: '14px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontWeight: 700,
            fontSize: '15px',
            fontFamily: 'Syne, sans-serif',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckSquare size={18} />
              Check in here
            </div>
            <ChevronRight size={18} />
          </div>
        </Link>

        {/* Tags */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '24px' }}>
          {venue.tags.map(tag => (
            <span key={tag} style={{
              fontSize: '12px', color: 'var(--color-muted)',
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: '20px', padding: '4px 10px',
            }}>
              {tag}
            </span>
          ))}
        </div>

        {/* Events */}
        {venueEvents.length > 0 && (
          <div style={{ marginBottom: '24px' }}>
            <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '16px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Calendar size={16} color="var(--color-accent)" /> Upcoming events
            </h2>
            {venueEvents.map(event => (
              <div key={event.id} style={{
                background: 'var(--color-surface)', border: '1px solid var(--color-border)',
                borderRadius: '10px', padding: '14px', marginBottom: '8px',
              }}>
                <div style={{ fontWeight: 600, fontSize: '15px', marginBottom: '4px' }}>{event.title}</div>
                <div style={{ fontSize: '13px', color: 'var(--color-muted)', marginBottom: '6px' }}>{event.description}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', color: 'var(--color-muted)' }}>
                    {new Date(event.startsAt).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })}
                  </span>
                  <span style={{
                    fontSize: '12px', fontWeight: 600,
                    color: event.isFree ? 'var(--color-accent)' : 'var(--color-amber)',
                  }}>
                    {event.isFree ? 'Free' : `R${event.price}`}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Posts */}
        {venuePosts.length > 0 && (
          <div>
            <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '16px', marginBottom: '12px' }}>
              Community posts
            </h2>
            {venuePosts.map(post => (
              <div key={post.id} style={{
                background: 'var(--color-surface)', border: '1px solid var(--color-border)',
                borderRadius: '10px', padding: '14px', marginBottom: '8px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <div style={{
                    width: '32px', height: '32px', borderRadius: '50%',
                    background: 'var(--color-surface2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '13px', color: 'var(--color-accent)',
                  }}>
                    {post.authorName[0]}
                  </div>
                  <span style={{ fontWeight: 600, fontSize: '13px' }}>{post.authorName}</span>
                </div>
                <p style={{ fontSize: '13px', color: 'var(--color-muted)', lineHeight: 1.5 }}>{post.content}</p>
                <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--color-muted)' }}>❤️ {post.likeCount}</span>
                  <span style={{ fontSize: '12px', color: 'var(--color-muted)' }}>💬 {post.commentCount}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {venuePosts.length === 0 && venueEvents.length === 0 && (
          <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--color-muted)' }}>
            <Users size={32} style={{ margin: '0 auto 8px', display: 'block', opacity: 0.4 }} />
            <p style={{ fontSize: '14px' }}>No community activity yet. Check in to start it.</p>
          </div>
        )}
      </div>
    </div>
  );
}
