import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Users, TrendingUp, CheckSquare } from 'lucide-react';
import { mockVenues, mockPosts } from '../lib/mockData';
import type { Venue } from '../types';

const categoryColors: Record<string, string> = {
  Barbershop: '#39D98A',
  Shisanyama: '#F5A623',
  'Spaza Shop': '#60A5FA',
  Salon: '#F472B6',
  Church: '#A78BFA',
  Tutoring: '#34D399',
};

function VenueCard({ venue }: { venue: Venue }) {
  return (
    <Link to={`/venue/${venue.slug}`} style={{ textDecoration: 'none' }}>
      <div style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: '12px',
        padding: '16px',
        marginBottom: '12px',
        cursor: 'pointer',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{
                fontSize: '11px',
                fontWeight: 600,
                color: categoryColors[venue.category] || 'var(--color-accent)',
                background: `${categoryColors[venue.category] || 'var(--color-accent)'}18`,
                padding: '2px 8px',
                borderRadius: '20px',
              }}>
                {venue.category}
              </span>
              <span style={{
                width: '6px', height: '6px', borderRadius: '50%',
                background: venue.isOpen ? '#39D98A' : '#6B7280',
                flexShrink: 0,
              }} />
              <span style={{ fontSize: '11px', color: 'var(--color-muted)' }}>
                {venue.isOpen ? 'Open now' : 'Closed'}
              </span>
            </div>
            <h3 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '17px', color: 'var(--color-text)', marginBottom: '4px' }}>
              {venue.name}
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '8px' }}>
              <MapPin size={12} color="var(--color-muted)" />
              <span style={{ fontSize: '13px', color: 'var(--color-muted)' }}>
                {venue.neighborhood}, {venue.city}
              </span>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--color-muted)', lineHeight: 1.5 }}>
              {venue.description}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '16px', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--color-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <CheckSquare size={13} color="var(--color-accent)" />
            <span style={{ fontSize: '12px', color: 'var(--color-muted)' }}>{venue.checkinCount.toLocaleString()} check-ins</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Users size={13} color="var(--color-muted)" />
            <span style={{ fontSize: '12px', color: 'var(--color-muted)' }}>{venue.followerCount} following</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function FeedPage() {
  const [activeTab, setActiveTab] = useState<'venues' | 'activity'>('venues');

  return (
    <div style={{ padding: '16px' }}>
      {/* Header */}
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '24px', marginBottom: '4px' }}>
          Your neighbourhood
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--color-muted)' }}>
          Places that matter where you are
        </p>
      </div>

      {/* Stats bar */}
      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '20px',
        padding: '12px 16px',
        background: 'var(--color-surface)',
        borderRadius: '12px',
        border: '1px solid var(--color-border)',
      }}>
        <TrendingUp size={16} color="var(--color-accent)" />
        <span style={{ fontSize: '13px', color: 'var(--color-muted)' }}>
          <span style={{ color: 'var(--color-accent)', fontWeight: 600 }}>12,155</span> check-ins across{' '}
          <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>{mockVenues.length} venues</span> today
        </span>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '16px', background: 'var(--color-surface)', borderRadius: '10px', padding: '4px' }}>
        {(['venues', 'activity'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              flex: 1,
              padding: '8px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'DM Sans, sans-serif',
              fontWeight: 600,
              fontSize: '13px',
              background: activeTab === tab ? 'var(--color-accent)' : 'transparent',
              color: activeTab === tab ? '#000' : 'var(--color-muted)',
              transition: 'all 0.15s',
            }}
          >
            {tab === 'venues' ? 'Venues' : 'Activity'}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === 'venues' ? (
        <div>
          {mockVenues.map(venue => (
            <VenueCard key={venue.id} venue={venue} />
          ))}
        </div>
      ) : (
        <div>
          {mockPosts.map(post => (
            <div key={post.id} style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '12px',
            }}>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                <div style={{
                  width: '36px', height: '36px', borderRadius: '50%',
                  background: 'var(--color-surface2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                  fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '14px', color: 'var(--color-accent)',
                }}>
                  {post.authorName[0]}
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '14px' }}>{post.authorName}</div>
                  <div style={{ fontSize: '12px', color: 'var(--color-muted)' }}>
                    {mockVenues.find(v => v.id === post.venueId)?.name}
                  </div>
                </div>
              </div>
              <p style={{ fontSize: '14px', lineHeight: 1.6, color: 'var(--color-text)' }}>{post.content}</p>
              <div style={{ display: 'flex', gap: '16px', marginTop: '12px' }}>
                <span style={{ fontSize: '12px', color: 'var(--color-muted)' }}>❤️ {post.likeCount}</span>
                <span style={{ fontSize: '12px', color: 'var(--color-muted)' }}>💬 {post.commentCount}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
