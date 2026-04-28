import { useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Settings, MapPin, Heart, MessageSquare, Briefcase,
  CheckCircle, Plus, ChevronRight, LogOut, Share2,
} from 'lucide-react';
import { getUserCheckInHistoryLocal, getVisitorId, calcBadgeTier } from '../lib/api';
import { getLocalProfile } from './EditProfile';
import { AchievementBadges }  from '../components/profile/AchievementBadges';
import { MyCheckIns }         from '../components/profile/MyCheckIns';
import { MyRegulars }         from '../components/profile/MyRegulars';
import { MyPosts }            from '../components/profile/MyPosts';
import { MySkills }           from '../components/profile/MySkills';

// ── Constants ─────────────────────────────────────────────────────────────────

const BADGE_ICON: Record<string, string>  = { newcomer: '🌱', regular: '⭐', loyal: '🔥', legend: '👑' };
const BADGE_COLOR: Record<string, string> = { newcomer: '#34D399', regular: '#F5A623', loyal: '#F97316', legend: '#A855F7' };
const BADGE_LABEL: Record<string, string> = { newcomer: 'Newcomer', regular: 'Regular', loyal: 'Loyal', legend: 'Legend' };

type Tab = 'checkins' | 'regulars' | 'posts' | 'skills';

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'checkins', label: 'Check-ins', icon: <CheckCircle size={15} /> },
  { id: 'regulars', label: 'Regulars',  icon: <Heart        size={15} /> },
  { id: 'posts',    label: 'Posts',     icon: <MessageSquare size={15} /> },
  { id: 'skills',   label: 'Skills',    icon: <Briefcase    size={15} /> },
];

// ── Share Kayaa helper ────────────────────────────────────────────────────────

function shareKayaa() {
  const text = 'Discover the places in your neighbourhood on Kayaa — https://kayaa.co.za';
  if (navigator.share) {
    navigator.share({ title: 'Kayaa', text }).catch(() => {});
  } else {
    navigator.clipboard?.writeText('https://kayaa.co.za').catch(() => {});
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const navigate   = useNavigate();
  const visitorId  = getVisitorId();
  const history    = useMemo(() => getUserCheckInHistoryLocal(visitorId), [visitorId]);
  const [tab, setTab] = useState<Tab>('checkins');
  const localProfile = getLocalProfile();

  const totalVisits   = history.reduce((s, h) => s + h.visitCount, 0);
  const uniquePlaces  = history.length;
  const regularsCount = history.filter(h => h.visitCount >= 3).length;
  const topBadgeTier  = calcBadgeTier(totalVisits);

  const stats = {
    checkins: totalVisits,
    places:   uniquePlaces,
    regulars: regularsCount,
    posts:    0, // loaded async inside MyPosts
  };

  return (
    <div style={{ minHeight: '100vh', paddingBottom: '100px' }}>

      {/* ── Sticky header ─────────────────────────────────────────────────── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 40,
        background: 'rgba(13,17,23,0.95)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        padding: '14px 16px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '20px', color: '#fff', margin: 0 }}>
          Profile
        </h1>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={shareKayaa}
            style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(255,255,255,0.07)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
          >
            <Share2 size={16} color="rgba(255,255,255,0.7)" />
          </button>
          <Link
            to="/dashboard"
            style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(255,255,255,0.07)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', textDecoration: 'none' }}
          >
            <Settings size={16} color="rgba(255,255,255,0.7)" />
          </Link>
        </div>
      </div>

      {/* ── Avatar + identity ─────────────────────────────────────────────── */}
      <div style={{ padding: '24px 16px 0', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '20px' }}>
          {/* Avatar circle */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <div style={{
              width: '80px', height: '80px', borderRadius: '50%',
              background: `${BADGE_COLOR[topBadgeTier]}18`,
              border: `2.5px solid ${BADGE_COLOR[topBadgeTier]}40`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '36px',
            }}>
              {BADGE_ICON[topBadgeTier]}
            </div>
            {/* Tier badge pill */}
            <div style={{
              position: 'absolute', bottom: '-6px', left: '50%', transform: 'translateX(-50%)',
              background: `${BADGE_COLOR[topBadgeTier]}22`,
              border: `1px solid ${BADGE_COLOR[topBadgeTier]}50`,
              borderRadius: '20px', padding: '2px 8px',
              fontFamily: 'DM Sans, sans-serif', fontSize: '9px', fontWeight: 700,
              color: BADGE_COLOR[topBadgeTier], whiteSpace: 'nowrap',
            }}>
              {BADGE_LABEL[topBadgeTier]}
            </div>
          </div>

          {/* Info */}
          <div style={{ flex: 1, paddingTop: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '20px', color: '#fff', margin: 0 }}>
                {localProfile.name || 'Kayaa Member'}
              </h2>
              <button
                onClick={() => navigate('/profile/edit')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', opacity: 0.45, lineHeight: 1, fontSize: '14px' }}
                title="Edit profile"
              >
                ✏️
              </button>
            </div>
            {(localProfile.neighborhood || localProfile.city) && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '5px', marginBottom: '4px' }}>
                <MapPin size={13} color="rgba(255,255,255,0.4)" />
                <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>
                  {[localProfile.neighborhood, localProfile.city].filter(Boolean).join(', ')}
                </span>
              </div>
            )}
            {localProfile.bio && (
              <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: 'rgba(255,255,255,0.55)', margin: '5px 0 0', lineHeight: 1.5 }}>
                {localProfile.bio}
              </p>
            )}
            <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.2)', marginTop: '6px' }}>
              ID …{visitorId.slice(-6)}
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px', marginBottom: '20px' }}>
          {[
            { label: 'Check-ins', value: totalVisits },
            { label: 'Places',    value: uniquePlaces },
            { label: 'Regulars',  value: regularsCount },
          ].map(({ label, value }) => (
            <div key={label} style={{ textAlign: 'center', padding: '10px 4px' }}>
              <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '22px', color: '#fff' }}>
                {value}
              </div>
              <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>
                {label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Achievements ─────────────────────────────────────────────────── */}
      <div style={{ paddingTop: '20px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <AchievementBadges stats={stats} />
      </div>

      {/* ── Quick actions ──────────────────────────────────────────────────── */}
      <div style={{ padding: '20px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <h3 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '15px', color: '#fff', marginBottom: '12px' }}>
          Quick Actions
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>

          {/* ── ADD YOUR PLACE — growth engine ─────────────────────────────── */}
          <button
            onClick={() => navigate('/onboarding')}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '14px 16px', borderRadius: '14px',
              background: '#39D98A', border: 'none',
              cursor: 'pointer',
              boxShadow: '0 4px 20px rgba(57,217,138,0.35)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Plus size={22} color="#000" />
              </div>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '15px', color: '#000' }}>
                  Add Your Place
                </div>
                <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: 'rgba(0,0,0,0.6)', marginTop: '1px' }}>
                  List your business on Kayaa
                </div>
              </div>
            </div>
            <ChevronRight size={20} color="rgba(0,0,0,0.5)" />
          </button>

          {/* My Check-ins */}
          <ActionRow
            icon={<CheckCircle size={18} color="#60A5FA" />}
            iconBg="rgba(96,165,250,0.12)"
            label="My Check-ins"
            sub={`${totalVisits} visit${totalVisits !== 1 ? 's' : ''} across ${uniquePlaces} place${uniquePlaces !== 1 ? 's' : ''}`}
            onClick={() => setTab('checkins')}
            active={tab === 'checkins'}
          />

          {/* My Regulars */}
          <ActionRow
            icon={<Heart size={18} color="#F472B6" />}
            iconBg="rgba(244,114,182,0.12)"
            label="My Regulars"
            sub={regularsCount > 0 ? `${regularsCount} favourite place${regularsCount !== 1 ? 's' : ''}` : 'Visit a place 3× to become a regular'}
            onClick={() => setTab('regulars')}
            active={tab === 'regulars'}
          />

          {/* My Posts */}
          <ActionRow
            icon={<MessageSquare size={18} color="#A78BFA" />}
            iconBg="rgba(167,139,250,0.12)"
            label="My Posts"
            sub="Questions, stories & announcements"
            onClick={() => setTab('posts')}
            active={tab === 'posts'}}
          />

          {/* My Skills */}
          <ActionRow
            icon={<Briefcase size={18} color="#FCD34D" />}
            iconBg="rgba(252,211,77,0.12)"
            label="My Skills"
            sub="Services you offer in the neighbourhood"
            onClick={() => setTab('skills')}
            active={tab === 'skills'}
          />
        </div>
      </div>

      {/* ── Tab content ───────────────────────────────────────────────────── */}
      <div style={{ padding: '20px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        {/* Tab selector */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '18px', overflowX: 'auto', scrollbarWidth: 'none' }}>
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '7px 14px', borderRadius: '20px', flexShrink: 0,
                background: tab === t.id ? '#39D98A' : 'rgba(255,255,255,0.06)',
                border: 'none', cursor: 'pointer',
                fontFamily: 'DM Sans, sans-serif', fontWeight: 700, fontSize: '13px',
                color: tab === t.id ? '#000' : 'rgba(255,255,255,0.55)',
                transition: 'background 0.15s',
              }}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        {/* Panel */}
        {tab === 'checkins' && <MyCheckIns history={history} />}
        {tab === 'regulars' && <MyRegulars history={history} />}
        {tab === 'posts'    && <MyPosts    visitorId={visitorId} />}
        {tab === 'skills'   && <MySkills   visitorId={visitorId} />}
      </div>

      {/* ── Settings & more ───────────────────────────────────────────────── */}
      <div style={{ padding: '20px 16px' }}>
        <h3 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '15px', color: '#fff', marginBottom: '12px' }}>
          More
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>

          <SettingsRow label="Edit Profile"       onClick={() => navigate('/profile/edit')} />
          <SettingsRow label="Privacy Settings"  onClick={() => navigate('/settings/privacy')} />
          <SettingsRow label="Venue Dashboard"   onClick={() => navigate('/dashboard')} />
          <SettingsRow label="Explore Kayaa"     onClick={() => navigate('/explore')} />
          <SettingsRow label="Help & Support"    onClick={() => navigate('/help')} />
          <SettingsRow label="Share Kayaa"       onClick={shareKayaa} />
          <SettingsRow
            label="Report an issue"
            onClick={() => {
              window.location.href = 'mailto:hello@kayaa.co.za?subject=Issue%20Report';
            }}
          />

          {/* Sign out (clears localStorage — anonymous only) */}
          <button
            onClick={() => {
              if (!confirm('Clear your local check-in history? This cannot be undone.')) return;
              localStorage.clear();
              window.location.href = '/feed';
            }}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              padding: '14px', borderRadius: '14px',
              background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
              fontFamily: 'DM Sans, sans-serif', fontWeight: 700, fontSize: '14px',
              color: '#EF4444', cursor: 'pointer',
            }}
          >
            <LogOut size={16} />
            Clear local data
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ActionRow({
  icon, iconBg, label, sub, onClick, active,
}: {
  icon:    React.ReactNode;
  iconBg:  string;
  label:   string;
  sub:     string;
  onClick: () => void;
  active:  boolean;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '13px 14px', borderRadius: '14px',
        background: active ? 'rgba(57,217,138,0.06)' : 'rgba(255,255,255,0.03)',
        border: `1px solid ${active ? 'rgba(57,217,138,0.2)' : 'rgba(255,255,255,0.07)'}`,
        cursor: 'pointer', textAlign: 'left',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {icon}
        </div>
        <div>
          <div style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 700, fontSize: '14px', color: active ? '#39D98A' : '#fff' }}>
            {label}
          </div>
          <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: 'rgba(255,255,255,0.35)', marginTop: '1px' }}>
            {sub}
          </div>
        </div>
      </div>
      <ChevronRight size={16} color={active ? '#39D98A' : 'rgba(255,255,255,0.3)'} />
    </button>
  );
}

function SettingsRow({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 16px', borderRadius: '14px',
        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
        cursor: 'pointer',
      }}
    >
      <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: 'rgba(255,255,255,0.75)' }}>
        {label}
      </span>
      <ChevronRight size={16} color="rgba(255,255,255,0.3)" />
    </button>
  );
}
