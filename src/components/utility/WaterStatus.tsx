import { useState, useEffect } from 'react';
import { Droplet, AlertTriangle, CheckCircle, Clock, RefreshCw } from 'lucide-react';
import { supabase } from '../../lib/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

interface WaterOutage {
  id: string;
  affected_areas: string[];
  start_time: string;
  end_time: string;
  reason: string | null;
}

type WaterState = 'on' | 'off' | 'scheduled';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' });
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-ZA', {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function durationHours(start: string, end: string): number {
  return Math.round((new Date(end).getTime() - new Date(start).getTime()) / 3_600_000);
}

// ─── WaterStatus ──────────────────────────────────────────────────────────────

export function WaterStatus({ area }: { area: string }) {
  const [state,     setState]     = useState<WaterState>('on');
  const [outage,    setOutage]    = useState<WaterOutage | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [spinning,  setSpinning]  = useState(false);

  async function fetchStatus() {
    setSpinning(true);
    const now = new Date().toISOString();

    const { data } = await supabase
      .from('water_outages')
      .select('*')
      .contains('affected_areas', [area])
      .gte('end_time', now)
      .order('start_time', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (data) {
      const active = new Date(data.start_time) <= new Date();
      setState(active ? 'off' : 'scheduled');
      setOutage(data as WaterOutage);
    } else {
      setState('on');
      setOutage(null);
    }

    setLoading(false);
    setSpinning(false);
  }

  useEffect(() => {
    fetchStatus();
  }, [area]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Normal ────────────────────────────────────────────────────────────────

  if (!loading && state === 'on') {
    return (
      <div style={{
        padding: '14px 16px',
        background: 'rgba(96,165,250,0.08)',
        border: '1px solid rgba(96,165,250,0.2)',
        borderRadius: '14px',
        display: 'flex', alignItems: 'center', gap: '12px',
      }}>
        <Droplet size={22} color="#60A5FA" style={{ flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '14px', color: '#60A5FA' }}>
            Water Supply Normal
          </div>
          <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: 'rgba(96,165,250,0.7)', marginTop: '1px' }}>
            No outages reported in {area}
          </div>
        </div>
        <CheckCircle size={18} color="#60A5FA" style={{ flexShrink: 0 }} />
      </div>
    );
  }

  // ── Active outage ─────────────────────────────────────────────────────────

  if (!loading && state === 'off') {
    return (
      <div style={{
        padding: '14px 16px',
        background: 'rgba(239,68,68,0.08)',
        border: '1px solid rgba(239,68,68,0.25)',
        borderRadius: '14px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: outage ? '10px' : '0' }}>
          <AlertTriangle size={22} color="#EF4444" style={{ flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '14px', color: '#EF4444' }}>
              Water Outage Active
            </div>
            <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: 'rgba(239,68,68,0.7)', marginTop: '1px' }}>
              No water in {area}
            </div>
          </div>
          <button
            onClick={fetchStatus}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', flexShrink: 0 }}
          >
            <RefreshCw size={14} color="rgba(239,68,68,0.5)"
              style={spinning ? { animation: 'spin 1s linear infinite' } : {}} />
          </button>
        </div>

        {outage && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: 'rgba(255,255,255,0.65)' }}>
              <Clock size={13} color="rgba(255,255,255,0.4)" />
              Estimated restoration: <strong style={{ color: '#fff' }}>{formatTime(outage.end_time)}</strong>
            </div>
            {outage.reason && (
              <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: 'rgba(255,255,255,0.4)', paddingLeft: '19px' }}>
                Reason: {outage.reason}
              </div>
            )}
          </div>
        )}
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ── Scheduled outage ──────────────────────────────────────────────────────

  if (!loading && state === 'scheduled') {
    const hrs = outage ? durationHours(outage.start_time, outage.end_time) : 0;
    return (
      <div style={{
        padding: '14px 16px',
        background: 'rgba(251,191,36,0.08)',
        border: '1px solid rgba(251,191,36,0.25)',
        borderRadius: '14px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: outage ? '10px' : '0' }}>
          <Droplet size={22} color="#FBBF24" style={{ flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '14px', color: '#FBBF24' }}>
              Scheduled Outage
            </div>
            <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: 'rgba(251,191,36,0.7)', marginTop: '1px' }}>
              {area}
            </div>
          </div>
          <button
            onClick={fetchStatus}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', flexShrink: 0 }}
          >
            <RefreshCw size={14} color="rgba(251,191,36,0.5)"
              style={spinning ? { animation: 'spin 1s linear infinite' } : {}} />
          </button>
        </div>

        {outage && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: 'rgba(255,255,255,0.65)' }}>
              <Clock size={13} color="rgba(255,255,255,0.4)" />
              Starts: <strong style={{ color: '#fff' }}>{formatDateTime(outage.start_time)}</strong>
            </div>
            <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: 'rgba(255,255,255,0.4)', paddingLeft: '19px' }}>
              Duration: {hrs} {hrs === 1 ? 'hour' : 'hours'}
              {outage.reason ? ` · ${outage.reason}` : ''}
            </div>
          </div>
        )}
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ── Loading skeleton ──────────────────────────────────────────────────────

  return (
    <div style={{
      height: '60px',
      background: 'rgba(255,255,255,0.04)',
      borderRadius: '14px',
      border: '1px solid rgba(255,255,255,0.06)',
    }} />
  );
}
