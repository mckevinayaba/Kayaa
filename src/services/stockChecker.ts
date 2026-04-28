// ─────────────────────────────────────────────────────────────────────────────
// Stock Checker Service
// Community-driven "is it in stock?" for spazas and local shops.
// Uses anonymous visitor_id — no auth required.
// ─────────────────────────────────────────────────────────────────────────────

import { supabase } from '../lib/supabase';
import { getVisitorId } from '../lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface StockItem {
  id: string;
  placeId: string;
  placeName: string;
  placeEmoji?: string;
  itemName: string;
  category: string;
  inStock: boolean;
  price?: number;
  lastUpdated: string;
  updatedBy: string;
  distanceKm?: number;
}

export type StockCategory =
  | 'groceries'
  | 'electricity'
  | 'airtime'
  | 'household'
  | 'fresh'
  | 'other';

// ─── Popular items config ─────────────────────────────────────────────────────

export const POPULAR_STOCK_ITEMS: { emoji: string; label: string; category: StockCategory }[] = [
  { emoji: '🍞', label: 'Bread',              category: 'groceries'   },
  { emoji: '🥛', label: 'Milk',               category: 'groceries'   },
  { emoji: '🥚', label: 'Eggs',               category: 'fresh'       },
  { emoji: '🧻', label: 'Toilet Paper',       category: 'household'   },
  { emoji: '🍚', label: 'Rice',               category: 'groceries'   },
  { emoji: '🛢️', label: 'Cooking Oil',        category: 'groceries'   },
  { emoji: '⚡', label: 'Prepaid Electricity', category: 'electricity' },
  { emoji: '📱', label: 'Airtime',            category: 'airtime'     },
  { emoji: '🧼', label: 'Soap',               category: 'household'   },
  { emoji: '🍗', label: 'Chicken',            category: 'fresh'       },
];

// ─── DB row → StockItem ───────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToStockItem(row: any): StockItem {
  return {
    id:          row.id,
    placeId:     row.place_id,
    placeName:   row.place_name  ?? row.place?.name  ?? 'Unknown shop',
    placeEmoji:  row.place_emoji ?? row.place?.emoji ?? '🏪',
    itemName:    row.item_name,
    category:    row.category    ?? 'other',
    inStock:     row.in_stock    ?? false,
    price:       row.price       ?? undefined,
    lastUpdated: row.last_updated ?? row.updated_at ?? new Date().toISOString(),
    updatedBy:   row.updated_by  ?? 'community',
    distanceKm:  row.distance_km ?? undefined,
  };
}

// ─── Cache (1-min TTL) ────────────────────────────────────────────────────────

const CACHE_TTL = 60_000;

function fromCache<T>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const { ts, data } = JSON.parse(raw) as { ts: number; data: T };
    if (Date.now() - ts > CACHE_TTL) return null;
    return data;
  } catch { return null; }
}

function toCache<T>(key: string, data: T): void {
  try { sessionStorage.setItem(key, JSON.stringify({ ts: Date.now(), data })); }
  catch { /* ignore */ }
}

// ─── Service ──────────────────────────────────────────────────────────────────

/** Search stock items near a GPS coordinate (falls back to city-wide). */
export async function searchNearbyStock(
  itemName: string,
  userLat: number,
  userLon: number,
  maxKm = 5,
): Promise<StockItem[]> {
  const cacheKey = `stock_${itemName}_${Math.round(userLat * 10)}_${Math.round(userLon * 10)}`;
  const cached = fromCache<StockItem[]>(cacheKey);
  if (cached) return cached;

  // Try the RPC first (requires search_nearby_stock function in DB)
  const { data: rpcData, error: rpcErr } = await supabase.rpc('search_nearby_stock', {
    search_item:     itemName,
    user_lat:        userLat,
    user_lng:        userLon,
    max_distance_km: maxKm,
  });

  if (!rpcErr && rpcData) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const items = (rpcData as any[]).map(rowToStockItem);
    toCache(cacheKey, items);
    return items;
  }

  // Fallback: plain text search without distance
  const { data, error } = await supabase
    .from('stock_items')
    .select('*')
    .ilike('item_name', `%${itemName}%`)
    .order('last_updated', { ascending: false })
    .limit(10);

  if (error || !data) return [];
  const items = data.map(rowToStockItem);
  toCache(cacheKey, items);
  return items;
}

/** Get all stock items for a single place. */
export async function getPlaceStock(placeId: string): Promise<StockItem[]> {
  const cacheKey = `stock_place_${placeId}`;
  const cached = fromCache<StockItem[]>(cacheKey);
  if (cached) return cached;

  const { data } = await supabase
    .from('stock_items')
    .select('*')
    .eq('place_id', placeId)
    .order('item_name', { ascending: true });

  const items = (data ?? []).map(rowToStockItem);
  toCache(cacheKey, items);
  return items;
}

/** Community update: mark an item in-stock or out-of-stock. */
export async function updateStock(
  placeId:   string,
  placeName: string,
  itemName:  string,
  inStock:   boolean,
  price?:    number,
): Promise<void> {
  const visitorId = getVisitorId();

  await supabase.from('stock_items').upsert(
    {
      place_id:     placeId,
      place_name:   placeName,
      item_name:    itemName,
      in_stock:     inStock,
      price:        price ?? null,
      updated_by:   visitorId,
      last_updated: new Date().toISOString(),
      category:     inferCategory(itemName),
    },
    { onConflict: 'place_id,item_name' },
  );

  // Invalidate cache
  try { sessionStorage.removeItem(`stock_place_${placeId}`); } catch { /* ignore */ }
}

/** Log a search term for "popular items in your area" analytics. */
export async function logStockSearch(itemName: string, area: string): Promise<void> {
  // Fire-and-forget — don't block UI
  supabase.from('stock_searches').upsert(
    { item_name: itemName.toLowerCase(), area, count: 1 },
    { onConflict: 'item_name,area' },
  ).then(() => { /* ignore */ });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function inferCategory(itemName: string): StockCategory {
  const lower = itemName.toLowerCase();
  if (['bread','milk','eggs','rice','flour','sugar','oil'].some(k => lower.includes(k))) return 'groceries';
  if (['electricity','prepaid','power'].some(k => lower.includes(k)))                   return 'electricity';
  if (['airtime','data','sim'].some(k => lower.includes(k)))                            return 'airtime';
  if (['chicken','meat','fish','fresh'].some(k => lower.includes(k)))                   return 'fresh';
  if (['soap','toilet','detergent','bleach'].some(k => lower.includes(k)))              return 'household';
  return 'other';
}

export function formatStockAge(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (mins < 1)    return 'just now';
  if (mins < 60)   return `${mins}m ago`;
  if (mins < 1440) return `${Math.floor(mins / 60)}h ago`;
  return `${Math.floor(mins / 1440)}d ago`;
}
