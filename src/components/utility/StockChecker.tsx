import { useState, useCallback } from 'react';
import { Search, Package, MapPin, Clock, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import {
  searchNearbyStock,
  updateStock,
  logStockSearch,
  formatStockAge,
  POPULAR_STOCK_ITEMS,
  type StockItem,
} from '../../services/stockChecker';

// ─── Update-stock mini form ───────────────────────────────────────────────────

function UpdateForm({
  placeId,
  placeName,
  itemName,
  onDone,
}: {
  placeId: string;
  placeName: string;
  itemName: string;
  onDone: () => void;
}) {
  const [inStock, setInStock] = useState<boolean | null>(null);
  const [price,   setPrice]   = useState('');
  const [saving,  setSaving]  = useState(false);

  async function submit() {
    if (inStock === null) return;
    setSaving(true);
    await updateStock(placeId, placeName, itemName, inStock, price ? Number(price) : undefined);
    setSaving(false);
    onDone();
  }

  return (
    <div style={{ marginTop: '10px', padding: '12px', background: 'rgba(57,217,138,0.06)', border: '1px solid rgba(57,217,138,0.2)', borderRadius: '10px' }}>
      <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '8px' }}>
        Update stock status:
      </div>
      <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
        {[true, false].map(val => (
          <button
            key={String(val)}
            onClick={() => setInStock(val)}
            style={{
              flex: 1, padding: '8px',
              background: inStock === val ? (val ? 'rgba(57,217,138,0.2)' : 'rgba(239,68,68,0.2)') : '#161B22',
              border: `1px solid ${inStock === val ? (val ? '#39D98A' : '#EF4444') : '#30363D'}`,
              borderRadius: '8px',
              fontFamily: 'DM Sans, sans-serif', fontSize: '13px', fontWeight: 700,
              color: inStock === val ? (val ? '#39D98A' : '#EF4444') : 'rgba(255,255,255,0.5)',
              cursor: 'pointer',
            }}
          >
            {val ? '✓ In Stock' : '✗ Out of Stock'}
          </button>
        ))}
      </div>
      {inStock === true && (
        <input
          type="number"
          placeholder="Price (optional, e.g. 14.99)"
          value={price}
          onChange={e => setPrice(e.target.value)}
          style={{
            width: '100%', boxSizing: 'border-box', marginBottom: '8px',
            background: '#0D1117', border: '1px solid #30363D', borderRadius: '8px',
            padding: '8px 10px', color: '#F0F6FC',
            fontFamily: 'DM Sans, sans-serif', fontSize: '13px', outline: 'none',
          }}
        />
      )}
      <button
        onClick={submit}
        disabled={inStock === null || saving}
        style={{
          width: '100%', padding: '9px',
          background: inStock !== null ? '#39D98A' : 'rgba(255,255,255,0.07)',
          border: 'none', borderRadius: '8px',
          fontFamily: 'DM Sans, sans-serif', fontWeight: 700, fontSize: '13px',
          color: inStock !== null ? '#000' : 'rgba(255,255,255,0.3)',
          cursor: inStock !== null ? 'pointer' : 'default',
        }}
      >
        {saving ? 'Saving…' : 'Submit Update'}
      </button>
    </div>
  );
}

// ─── Result card ──────────────────────────────────────────────────────────────

function ResultCard({ item, searchQuery }: { item: StockItem; searchQuery: string }) {
  const [updating, setUpdating] = useState(false);
  const [localItem, setLocalItem] = useState(item);

  const borderColor = localItem.inStock ? 'rgba(57,217,138,0.25)' : 'rgba(239,68,68,0.25)';
  const bgColor     = localItem.inStock ? 'rgba(57,217,138,0.06)' : 'rgba(239,68,68,0.06)';
  const statusColor = localItem.inStock ? '#39D98A' : '#EF4444';

  return (
    <div style={{ background: bgColor, border: `1px solid ${borderColor}`, borderRadius: '12px', padding: '14px' }}>
      {/* Top row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '8px' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
            <span style={{ fontSize: '18px' }}>{localItem.placeEmoji}</span>
            <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '14px', color: '#F0F6FC' }}>
              {localItem.placeName}
            </span>
          </div>
          {localItem.distanceKm !== undefined && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
              <MapPin size={10} color="rgba(255,255,255,0.35)" />
              <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>
                {localItem.distanceKm < 1
                  ? `${Math.round(localItem.distanceKm * 1000)}m away`
                  : `${localItem.distanceKm.toFixed(1)}km away`}
              </span>
            </div>
          )}
        </div>
        {localItem.inStock
          ? <CheckCircle size={20} color="#39D98A" />
          : <XCircle    size={20} color="#EF4444" />
        }
      </div>

      {/* Status + price + age */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', fontWeight: 700, color: statusColor }}>
          {localItem.inStock ? 'In Stock' : 'Out of Stock'}
          {localItem.inStock && localItem.price ? ` · R${localItem.price}` : ''}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
          <Clock size={10} color="rgba(255,255,255,0.3)" />
          <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>
            {formatStockAge(localItem.lastUpdated)}
          </span>
        </div>
      </div>

      {/* "Update stock" toggle */}
      {updating ? (
        <UpdateForm
          placeId={localItem.placeId}
          placeName={localItem.placeName}
          itemName={searchQuery}
          onDone={() => {
            setUpdating(false);
            // Optimistic refresh
            setLocalItem(prev => ({ ...prev, lastUpdated: new Date().toISOString() }));
          }}
        />
      ) : (
        <button
          onClick={() => setUpdating(true)}
          style={{
            marginTop: '10px', width: '100%', padding: '7px',
            background: 'transparent', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '8px',
            fontFamily: 'DM Sans, sans-serif', fontSize: '12px',
            color: 'rgba(255,255,255,0.35)', cursor: 'pointer',
          }}
        >
          ✏️ Update stock info
        </button>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface StockCheckerProps {
  /** Pre-fill the area label for log analytics */
  area?: string;
}

export function StockChecker({ area = '' }: StockCheckerProps) {
  const [query,   setQuery]   = useState('');
  const [results, setResults] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const doSearch = useCallback(async (item: string) => {
    if (!item.trim()) return;
    setQuery(item);
    setLoading(true);
    setSearched(true);
    setResults([]);

    // Log search analytics (fire-and-forget)
    if (area) logStockSearch(item, area);

    const run = async (lat: number, lon: number) => {
      const data = await searchNearbyStock(item, lat, lon);
      setResults(data);
      setLoading(false);
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => run(pos.coords.latitude, pos.coords.longitude),
        ()  => run(-26.2041, 28.0473), // JHB fallback
        { timeout: 4000 },
      );
    } else {
      run(-26.2041, 28.0473);
    }
  }, [area]);

  return (
    <div style={{ background: '#161B22', border: '1px solid #21262D', borderRadius: '16px', padding: '16px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <div>
          <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '17px', color: '#F0F6FC', margin: '0 0 2px' }}>
            Is It In Stock?
          </h2>
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: 'rgba(255,255,255,0.4)', margin: 0 }}>
            Check nearby spazas &amp; shops
          </p>
        </div>
        <div style={{
          width: '38px', height: '38px', borderRadius: '12px', flexShrink: 0,
          background: 'rgba(57,217,138,0.12)', border: '1px solid rgba(57,217,138,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Package size={18} color="#39D98A" />
        </div>
      </div>

      {/* Search bar */}
      <div style={{ position: 'relative', marginBottom: '12px' }}>
        <Search size={15} color="rgba(255,255,255,0.35)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && doSearch(query)}
          placeholder="Search for bread, milk, eggs…"
          style={{
            width: '100%', boxSizing: 'border-box',
            background: '#0D1117', border: '1px solid #30363D',
            borderRadius: '10px', padding: '10px 40px 10px 36px',
            color: '#F0F6FC', fontFamily: 'DM Sans, sans-serif', fontSize: '14px',
            outline: 'none',
          }}
        />
        {query && (
          <button
            onClick={() => doSearch(query)}
            style={{
              position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)',
              background: '#39D98A', border: 'none', borderRadius: '7px',
              padding: '4px 10px', cursor: 'pointer',
              fontFamily: 'DM Sans, sans-serif', fontWeight: 700, fontSize: '12px', color: '#000',
            }}
          >
            Go
          </button>
        )}
      </div>

      {/* Popular item chips */}
      {!searched && (
        <>
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginBottom: '8px' }}>
            Popular searches:
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '4px' }}>
            {POPULAR_STOCK_ITEMS.map(item => (
              <button
                key={item.label}
                onClick={() => doSearch(item.label)}
                style={{
                  padding: '5px 11px', borderRadius: '20px',
                  background: '#0D1117', border: '1px solid #30363D',
                  fontFamily: 'DM Sans, sans-serif', fontSize: '12px', fontWeight: 600,
                  color: 'rgba(255,255,255,0.65)', cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                {item.emoji} {item.label}
              </button>
            ))}
          </div>
        </>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '28px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
          <RefreshCw size={20} color="#39D98A" style={{ animation: 'spin 1s linear infinite' }} />
          <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: 'rgba(255,255,255,0.45)' }}>
            Checking nearby spazas…
          </span>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {/* Results */}
      {!loading && searched && results.length > 0 && (
        <>
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: 'rgba(255,255,255,0.45)', margin: '12px 0 8px' }}>
            {results.length} {results.length === 1 ? 'place' : 'places'} with{' '}
            <strong style={{ color: '#F0F6FC' }}>{query}</strong>
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {results.map(r => (
              <ResultCard key={r.id} item={r} searchQuery={query} />
            ))}
          </div>
        </>
      )}

      {/* Empty state */}
      {!loading && searched && results.length === 0 && (
        <div style={{ textAlign: 'center', padding: '28px 16px', background: '#0D1117', borderRadius: '12px', marginTop: '8px' }}>
          <Package size={32} color="rgba(255,255,255,0.15)" style={{ marginBottom: '8px' }} />
          <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: 'rgba(255,255,255,0.45)', marginBottom: '4px' }}>
            No stock info yet for <strong style={{ color: '#F0F6FC' }}>{query}</strong>
          </div>
          <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: 'rgba(255,255,255,0.25)' }}>
            Be the first to update your local spaza!
          </div>
        </div>
      )}

      {/* Reset */}
      {searched && !loading && (
        <button
          onClick={() => { setQuery(''); setResults([]); setSearched(false); }}
          style={{
            marginTop: '12px', width: '100%', padding: '8px',
            background: 'transparent', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '8px',
            fontFamily: 'DM Sans, sans-serif', fontSize: '12px',
            color: 'rgba(255,255,255,0.3)', cursor: 'pointer',
          }}
        >
          ← New search
        </button>
      )}
    </div>
  );
}
