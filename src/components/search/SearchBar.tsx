import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Mic, X, MapPin, Clock } from 'lucide-react';
import { useDebounce } from '../../hooks/useDebounce';
import { haversineKm } from '../../lib/geocode';
import type { Venue } from '../../types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SearchResult {
  id: string;
  slug: string;
  type: 'place';
  title: string;
  subtitle: string;
  icon: string;
  badges: string[];
  distanceKm?: number;
  locality?: string; // shown when search scope is wider than My Area
  status: 'open' | 'busy' | 'quiet' | 'closed';
  score: number;
}

export interface SearchBarProps {
  /** Already-loaded venue list for client-side search */
  venues?: Venue[];
  userLat?: number;
  userLon?: number;
  placeholder?: string;
  autoFocus?: boolean;
  /** Current browsing neighbourhood — enables scoped search */
  neighbourhood?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CAT_EMOJI: Record<string, string> = {
  Barbershop: '✂️', Shisanyama: '🔥', Tavern: '🍺', Café: '☕',
  Church: '⛪', Carwash: '🚗', 'Spaza Shop': '🏪', Salon: '💅',
  Tutoring: '📚', 'Sports Ground': '⚽', 'Home Business': '🏠',
};

const RECENT_KEY = 'kayaa_recent_searches';
const MAX_RECENT = 6;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function matchScore(venue: Venue, q: string): number {
  const lq = q.toLowerCase().trim();
  if (!lq) return 0;
  const name  = venue.name.toLowerCase();
  const cat   = venue.category.toLowerCase();
  const area  = `${venue.neighborhood} ${venue.city}`.toLowerCase();
  const desc  = venue.description.toLowerCase();
  if (name === lq)           return 5;
  if (name.startsWith(lq))  return 4;
  if (name.includes(lq))    return 3;
  if (cat.includes(lq))     return 2;
  if (area.includes(lq))    return 1;
  if (desc.includes(lq))    return 0.5;
  return 0;
}

function statusColor(s: string): string {
  return s === 'busy' ? '#F97316' : s === 'open' ? '#39D98A' : s === 'quiet' ? '#60A5FA' : '#4B5563';
}

function statusText(s: string): string {
  return s === 'busy' ? 'Busy' : s === 'open' ? 'Open' : s === 'quiet' ? 'Quiet' : 'Closed';
}

function fmtDist(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)}m` : `${km.toFixed(1)}km`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function SearchBar({
  venues = [],
  userLat,
  userLon,
  placeholder,
  autoFocus = false,
  neighbourhood,
}: SearchBarProps) {
  const navigate = useNavigate();

  // Scope: my_area → current suburb only · nearby → ≤30 km GPS radius · everywhere → all
  const [searchScope, setSearchScope] = useState<'my_area' | 'nearby' | 'everywhere'>(
    neighbourhood ? 'my_area' : 'everywhere',
  );

  // Reset scope when neighbourhood prop changes
  const prevNeighbourhoodRef = useRef(neighbourhood);
  useEffect(() => {
    if (prevNeighbourhoodRef.current !== neighbourhood) {
      prevNeighbourhoodRef.current = neighbourhood;
      setSearchScope(neighbourhood ? 'my_area' : 'everywhere');
    }
  }, [neighbourhood]);

  const resolvedPlaceholder = placeholder ??
    (neighbourhood && searchScope === 'my_area'
      ? `Search in ${neighbourhood}…`
      : searchScope === 'nearby'
        ? 'Search nearby places…'
        : 'Search places, areas, categories…');

  const [query,    setQuery]    = useState('');
  const [isOpen,   setIsOpen]   = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [results,  setResults]  = useState<SearchResult[]>([]);
  const [recents,  setRecents]  = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]'); } catch { return []; }
  });

  const debouncedQ   = useDebounce(query, 280);
  const inputRef     = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  // ── Speech Recognition setup ────────────────────────────────────────────────
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = 'en-ZA';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onresult = (e: any) => {
      const transcript: string = e.results[0][0].transcript;
      setQuery(transcript);
      setIsListening(false);
      setIsOpen(true);
    };
    rec.onerror = () => setIsListening(false);
    rec.onend   = () => setIsListening(false);
    recognitionRef.current = rec;
  }, []);

  // ── Client-side fuzzy search ────────────────────────────────────────────────
  useEffect(() => {
    if (!debouncedQ.trim() || debouncedQ.length < 2) { setResults([]); return; }

    // Build pool based on scope
    let pool: Venue[];
    if (searchScope === 'my_area' && neighbourhood) {
      pool = venues.filter(v =>
        v.neighborhood?.toLowerCase().includes(neighbourhood.toLowerCase()) ||
        v.city?.toLowerCase().includes(neighbourhood.toLowerCase())
      );
    } else if (searchScope === 'nearby' && userLat != null && userLon != null) {
      pool = venues.filter(v =>
        v.latitude != null && v.longitude != null &&
        haversineKm(userLat!, userLon!, v.latitude, v.longitude) <= 30
      );
    } else if (searchScope === 'nearby' && neighbourhood) {
      // No GPS — fall back to same general area
      pool = venues.filter(v =>
        v.neighborhood?.toLowerCase().includes(neighbourhood.toLowerCase()) ||
        v.city?.toLowerCase().includes(neighbourhood.toLowerCase())
      );
    } else {
      pool = venues;
    }

    const scored: SearchResult[] = [];
    for (const v of pool) {
      const score = matchScore(v, debouncedQ);
      if (!score) continue;
      const dist =
        userLat != null && userLon != null && v.latitude != null && v.longitude != null
          ? haversineKm(userLat, userLon, v.latitude, v.longitude)
          : undefined;
      const badges: string[] = [];
      if (v.isVerified) badges.push('✓ Verified');
      if ((v.checkinsToday ?? 0) > 5) badges.push(`${v.checkinsToday} today`);
      // Short address — first segment before the first comma
      const shortAddr = v.address?.trim() ? v.address.split(',')[0].trim() : null;
      // Subtitle: category · neighbourhood (city) [· street address when scope is wider]
      const areaPart = v.neighborhood ? `${v.neighborhood}${v.city ? `, ${v.city}` : ''}` : (v.city ?? '');
      const subtitle = [v.category, areaPart, searchScope !== 'my_area' ? shortAddr : null]
        .filter(Boolean)
        .join(' · ');
      // Locality label shown on result chip when scope is wider than My Area
      const locality =
        searchScope === 'my_area'
          ? undefined
          : searchScope === 'nearby'
            ? (v.neighborhood ? `Nearby · ${v.neighborhood}` : 'Nearby')
            : (v.neighborhood ? `In ${v.neighborhood}` : (v.city ? `In ${v.city}` : undefined));
      scored.push({
        id: v.id, slug: v.slug, type: 'place',
        title: v.name,
        subtitle,
        icon: CAT_EMOJI[v.category] ?? '📍',
        badges, distanceKm: dist, locality,
        status: (v.venueStatus ?? (v.isOpen ? 'open' : 'closed')) as SearchResult['status'],
        score,
      });
    }
    scored
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        if (a.distanceKm != null && b.distanceKm != null) return a.distanceKm - b.distanceKm;
        return 0;
      })
      .splice(8); // keep at most 8

    setResults(scored);
  }, [debouncedQ, venues, userLat, userLon, searchScope, neighbourhood]);

  // ── Close on outside click ──────────────────────────────────────────────────
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Handlers ────────────────────────────────────────────────────────────────

  function toggleVoice() {
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      try { recognitionRef.current.start(); setIsListening(true); } catch { /* already started */ }
    }
  }

  function saveRecent(title: string) {
    const next = [title, ...recents.filter(s => s !== title)].slice(0, MAX_RECENT);
    setRecents(next);
    try { localStorage.setItem(RECENT_KEY, JSON.stringify(next)); } catch { /* quota */ }
  }

  function clearRecents() {
    setRecents([]);
    localStorage.removeItem(RECENT_KEY);
  }

  function selectResult(r: SearchResult) {
    saveRecent(r.title);
    setIsOpen(false);
    setQuery('');
    navigate(`/venue/${r.slug}`);
  }

  function clickRecent(term: string) {
    setQuery(term);
    setIsOpen(true);
    inputRef.current?.focus();
  }

  // ── Derived ─────────────────────────────────────────────────────────────────

  const showDropdown =
    isOpen && (
      results.length > 0 ||
      (query.length === 0 && recents.length > 0) ||
      (debouncedQ.length >= 2 && results.length === 0)
    );

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>

      {/* ── Input row ─────────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center',
        background: 'var(--color-surface2)',
        border: `1px solid ${isOpen ? 'rgba(57,217,138,0.4)' : 'var(--color-border)'}`,
        borderRadius: showDropdown ? '14px 14px 0 0' : '14px',
        padding: '0 4px 0 14px',
        transition: 'border-color 0.15s',
        boxShadow: isOpen ? '0 0 0 3px rgba(57,217,138,0.06)' : 'none',
      }}>
        {isListening
          ? <span style={{ fontSize: '15px', lineHeight: 1, flexShrink: 0 }}>🎙️</span>
          : <Search size={15} color="var(--color-muted)" style={{ flexShrink: 0 }} />}

        <input
          ref={inputRef}
          type="search"
          value={query}
          autoFocus={autoFocus}
          autoComplete="off"
          onChange={e => { setQuery(e.target.value); setIsOpen(true); }}
          onFocus={() => setIsOpen(true)}
          placeholder={isListening ? 'Listening…' : resolvedPlaceholder}
          aria-label="Search places"
          aria-expanded={showDropdown}
          aria-autocomplete="list"
          role="combobox"
          style={{
            flex: 1, background: 'transparent', border: 'none', outline: 'none',
            color: isListening ? '#39D98A' : 'var(--color-text)',
            fontSize: '16px', fontFamily: 'Inter, sans-serif',
            padding: '12px 8px',
            // Remove default search-input clear button (handled manually)
            WebkitAppearance: 'none',
          }}
        />

        {/* Clear button */}
        {query && (
          <button
            onClick={() => { setQuery(''); setResults([]); inputRef.current?.focus(); }}
            aria-label="Clear"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px', display: 'flex', color: 'var(--color-muted)' }}
          >
            <X size={14} />
          </button>
        )}

        {/* Voice button */}
        <button
          onClick={toggleVoice}
          aria-label={isListening ? 'Stop voice search' : 'Search by voice'}
          title={recognitionRef.current ? undefined : 'Voice search not supported in this browser'}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: '36px', height: '36px', borderRadius: '10px', border: 'none',
            background: isListening ? 'rgba(239,68,68,0.12)' : 'transparent',
            color: isListening ? '#EF4444' : 'var(--color-muted)',
            cursor: recognitionRef.current ? 'pointer' : 'default',
            flexShrink: 0,
            transition: 'background 0.15s, color 0.15s',
            opacity: recognitionRef.current ? 1 : 0.35,
          }}
        >
          <Mic size={15} />
        </button>
      </div>

      {/* ── Dropdown ──────────────────────────────────────────────────────── */}
      {showDropdown && (
        <div
          role="listbox"
          aria-label="Search results"
          style={{
            position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 300,
            background: 'var(--color-surface2)',
            border: '1px solid rgba(57,217,138,0.2)',
            borderTop: '1px solid var(--color-border)',
            borderRadius: '0 0 14px 14px',
            maxHeight: '360px', overflowY: 'auto',
            boxShadow: '0 20px 48px rgba(0,0,0,0.6)',
          }}
        >

          {/* Scope toggle — always visible so users can widen/narrow search intentionally */}
          <div style={{ padding: '8px 14px 6px', borderBottom: '1px solid var(--color-border)', display: 'flex', gap: '6px' }}>
            {([
              { key: 'my_area'    as const, label: neighbourhood ? `In ${neighbourhood}` : 'My Area', disabled: !neighbourhood },
              { key: 'nearby'     as const, label: 'Nearby',     disabled: false },
              { key: 'everywhere' as const, label: 'Everywhere', disabled: false },
            ]).map(({ key, label, disabled }) => {
              const active = searchScope === key;
              return (
                <button
                  key={key}
                  onClick={() => { if (!disabled) setSearchScope(key); }}
                  style={{
                    padding: '4px 10px', borderRadius: '20px', border: 'none',
                    cursor: disabled ? 'default' : 'pointer',
                    background: active ? 'rgba(57,217,138,0.15)' : 'rgba(255,255,255,0.06)',
                    color: active ? '#39D98A' : disabled ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.45)',
                    fontFamily: 'Inter, sans-serif', fontSize: '11px', fontWeight: 700,
                    transition: 'all 0.15s',
                    opacity: disabled ? 0.45 : 1,
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Recent searches */}
          {query.length === 0 && recents.length > 0 && (
            <div style={{ padding: '10px 14px 6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.28)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Recent
                </span>
                <button
                  onClick={clearRecents}
                  style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.28)', fontSize: '11px', cursor: 'pointer', fontFamily: 'Inter, sans-serif', padding: '2px 0' }}
                >
                  Clear
                </button>
              </div>
              {recents.map((term, i) => (
                <button
                  key={i}
                  onClick={() => clickRecent(term)}
                  style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', background: 'none', border: 'none', padding: '8px 0', cursor: 'pointer', textAlign: 'left' }}
                >
                  <Clock size={12} color="rgba(255,255,255,0.28)" style={{ flexShrink: 0 }} />
                  <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: 'rgba(255,255,255,0.65)' }}>{term}</span>
                </button>
              ))}
              {results.length === 0 && (
                <div style={{ height: '1px', background: 'var(--color-border)', margin: '6px 0 2px' }} />
              )}
            </div>
          )}

          {/* Results list */}
          {results.length > 0 && (
            <div style={{ padding: '6px 8px 8px' }}>
              {results.map(r => (
                <button
                  key={r.id}
                  role="option"
                  aria-selected={false}
                  onClick={() => selectResult(r)}
                  style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', background: 'none', border: 'none', borderRadius: '10px', padding: '9px 8px', cursor: 'pointer', textAlign: 'left' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                >
                  {/* Category icon */}
                  <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(57,217,138,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '17px', flexShrink: 0 }}>
                    {r.icon}
                  </div>

                  {/* Text */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
                      <span style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '13px', color: 'var(--color-text)' }}>
                        {r.title}
                      </span>
                      {/* Status dot */}
                      <span
                        title={statusText(r.status)}
                        style={{ width: '6px', height: '6px', borderRadius: '50%', background: statusColor(r.status), flexShrink: 0, display: 'inline-block' }}
                      />
                      {/* Badges */}
                      {r.badges.slice(0, 2).map((b, i) => (
                        <span key={i} style={{ fontSize: '10px', fontWeight: 600, color: '#39D98A', background: 'rgba(57,217,138,0.1)', borderRadius: '20px', padding: '1px 6px', flexShrink: 0 }}>
                          {b}
                        </span>
                      ))}
                    </div>
                    <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: 'var(--color-muted)', marginTop: '1px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {r.subtitle}
                    </div>
                  </div>

                  {/* Locality label (Nearby · Berea / In Yeoville) — shown for wider scopes */}
                  {r.locality && !r.distanceKm && (
                    <span style={{
                      fontFamily: 'Inter, sans-serif', fontSize: '10px', fontWeight: 600,
                      color: 'rgba(255,255,255,0.35)', background: 'rgba(255,255,255,0.06)',
                      borderRadius: '10px', padding: '2px 7px', flexShrink: 0, whiteSpace: 'nowrap',
                    }}>
                      {r.locality}
                    </span>
                  )}

                  {/* Distance */}
                  {r.distanceKm != null && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '2px', flexShrink: 0 }}>
                      <MapPin size={10} color="var(--color-muted)" />
                      <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: 'var(--color-muted)' }}>
                        {fmtDist(r.distanceKm)}
                      </span>
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* No results — escalating scope CTAs */}
          {debouncedQ.length >= 2 && results.length === 0 && (
            <div style={{ padding: '20px 16px', textAlign: 'center' }}>
              <div style={{ fontSize: '24px', marginBottom: '6px' }}>🔍</div>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: 'var(--color-muted)', margin: '0 0 10px' }}>
                No results for <strong style={{ color: 'var(--color-text)' }}>"{debouncedQ}"</strong>
                {searchScope === 'my_area' && neighbourhood ? ` in ${neighbourhood}` : searchScope === 'nearby' ? ' nearby' : ''}
              </p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', flexWrap: 'wrap' }}>
                {searchScope === 'my_area' && (
                  <button
                    onClick={() => setSearchScope('nearby')}
                    style={{
                      padding: '6px 14px', borderRadius: '20px', border: 'none',
                      background: 'rgba(57,217,138,0.12)', color: '#39D98A',
                      fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Try Nearby
                  </button>
                )}
                {(searchScope === 'my_area' || searchScope === 'nearby') && (
                  <button
                    onClick={() => setSearchScope('everywhere')}
                    style={{
                      padding: '6px 14px', borderRadius: '20px', border: 'none',
                      background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.5)',
                      fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Search Everywhere
                  </button>
                )}
                {searchScope === 'everywhere' && (
                  <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: 'rgba(255,255,255,0.28)', margin: 0 }}>
                    Try a different name, area, or category
                  </p>
                )}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}

