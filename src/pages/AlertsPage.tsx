import { useState, useEffect } from 'react';
import { Bell, ShieldAlert, Zap, Droplet, RefreshCw } from 'lucide-react';
import { useNeighbourhood } from '../contexts/NeighbourhoodContext';
import { getSafetyAlerts } from '../lib/api';
import type { UserPost } from '../lib/api';
import { LoadSheddingWidget } from '../components/safety/LoadSheddingWidget';
import { WaterStatus } from '../components/utility/WaterStatus';

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function AlertsPage() {
  const { displaySuburb, displayCity } = useNeighbourhood();
  const suburb = displaySuburb || displayCity || '';

  const [alerts,  setAlerts]  = useState<UserPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [spinning, setSpinning] = useState(false);

  async function load() {
    if (!suburb) { setLoading(false); return; }
    setSpinning(true);
    const data = await getSafetyAlerts(suburb);
    setAlerts(data ?? []);
    setLoading(false);
    setSpinning(false);
  }

  useEffect(() => { load(); }, [suburb]); // eslint-disable-line

  return (
    <div style={{ padding: '16px 16px 32px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '22px', color: '#F0F6FC', margin: 0 }}>
            Alerts
          </h1>
          {suburb && (
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: 'rgba(255,255,255,0.4)', margin: '2px 0 0' }}>
              {suburb}
            </p>
          )}
        </div>
        <button
          onClick={load}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px' }}
        >
          <RefreshCw
            size={18}
            color="rgba(255,255,255,0.3)"
            style={spinning ? { animation: 'spin 1s linear infinite' } : {}}
          />
        </button>
      </div>

      {/* Utility status — always shown */}
      <div style={{ marginBottom: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
          <Zap size={13} color="rgba(255,255,255,0.3)" />
          <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Load Shedding
          </span>
        </div>
        <LoadSheddingWidget compact />
      </div>

      {suburb && (
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
            <Droplet size={13} color="rgba(255,255,255,0.3)" />
            <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Water
            </span>
          </div>
          <WaterStatus area={suburb} />
        </div>
      )}

      {/* Divider */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
        <ShieldAlert size={14} color="rgba(255,255,255,0.25)" />
        <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Safety alerts
        </span>
        <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.06)' }} />
      </div>

      {/* Safety alerts list */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {[1, 2].map(i => (
            <div key={i} style={{ height: '80px', background: 'rgba(255,255,255,0.04)', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.06)' }} />
          ))}
        </div>
      ) : alerts.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {alerts.map(alert => (
            <div
              key={alert.id}
              style={{
                padding: '14px 16px',
                background: 'rgba(239,68,68,0.06)',
                border: '1px solid rgba(239,68,68,0.15)',
                borderRadius: '14px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <div style={{
                  width: '32px', height: '32px', borderRadius: '10px',
                  background: 'rgba(239,68,68,0.12)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, marginTop: '1px',
                }}>
                  <ShieldAlert size={16} color="#EF4444" />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{
                    fontFamily: 'DM Sans, sans-serif',
                    fontSize: '14px',
                    color: 'rgba(255,255,255,0.85)',
                    margin: '0 0 4px',
                    lineHeight: 1.5,
                  }}>
                    {alert.content}
                  </p>
                  <span style={{
                    fontFamily: 'DM Sans, sans-serif',
                    fontSize: '12px',
                    color: 'rgba(255,255,255,0.3)',
                  }}>
                    {alert.createdAt ? timeAgo(alert.createdAt) : ''}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Empty state */
        <div style={{
          padding: '40px 24px',
          textAlign: 'center',
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: '16px',
        }}>
          <Bell size={32} color="rgba(255,255,255,0.15)" style={{ marginBottom: '14px' }} />
          <p style={{
            fontFamily: 'Syne, sans-serif', fontWeight: 700,
            fontSize: '16px', color: 'rgba(255,255,255,0.5)',
            margin: '0 0 8px',
          }}>
            {suburb ? `No alerts in ${suburb} yet` : 'Set your neighbourhood to see alerts'}
          </p>
          <p style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '13px', color: 'rgba(255,255,255,0.25)',
            margin: 0, lineHeight: 1.6,
          }}>
            {suburb
              ? `Safety alerts and local updates for ${suburb} will appear here.`
              : 'Tap the location in the top bar to set your area.'}
          </p>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
