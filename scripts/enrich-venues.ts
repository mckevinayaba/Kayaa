/**
 * enrich-venues.ts
 *
 * Batch script — generates AI descriptions for all seeded venues
 * that still have thin/placeholder descriptions.
 *
 * Uses Google Gemini Flash (FREE — no credit card needed).
 * Get a free key at: https://aistudio.google.com/app/apikey
 *
 * Run:
 *   npx tsx scripts/enrich-venues.ts
 *
 * Requires GEMINI_API_KEY in your .env file.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient }        from '@supabase/supabase-js';
import * as fs                 from 'fs';
import * as path               from 'path';
import * as url                from 'url';

// ─── Load .env ────────────────────────────────────────────────────────────────

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const envPath   = path.join(__dirname, '..', '.env');

if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
    if (!process.env[key]) process.env[key] = val;
  }
}

// ─── Validate ─────────────────────────────────────────────────────────────────

const SUPABASE_URL      = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const GEMINI_API_KEY    = process.env.GEMINI_API_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌  Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env');
  process.exit(1);
}
if (!GEMINI_API_KEY) {
  console.error('❌  Missing GEMINI_API_KEY in .env');
  console.error('    Get a free key at: https://aistudio.google.com/app/apikey');
  console.error('    Then add to .env:  GEMINI_API_KEY=AIza...');
  process.exit(1);
}

// ─── Clients ──────────────────────────────────────────────────────────────────

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const genAI    = new GoogleGenerativeAI(GEMINI_API_KEY);
const model    = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

// ─── Category labels ──────────────────────────────────────────────────────────

const TYPE_LABEL: Record<string, string> = {
  barbershop: 'barbershop',
  salon:      'hair salon',
  spaza:      'spaza shop',
  food:       'shisanyama or local food spot',
  tavern:     'tavern',
  church:     'church',
  carwash:    'car wash',
  mechanic:   'auto mechanic',
  market:     'fresh produce market',
  gym:        'gym',
  other:      'local business',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isThinDescription(desc: string): boolean {
  if (!desc || desc.length < 60) return true;
  if (/^[A-Za-z\s]+in [A-Za-z\s]+\.$/.test(desc.trim())) return true;
  return false;
}

function buildPrompt(name: string, type: string, location: string): string {
  const typeLabel = TYPE_LABEL[type] ?? type;
  return `You write short, honest descriptions for neighbourhood places in South Africa.

Write 1–2 sentences (20–35 words) describing this place:
Name: ${name}
Type: ${typeLabel}
Location: ${location}

Rules:
- Warm, local, community tone — like a neighbour describing it to another neighbour
- South African English (not American)
- No marketing buzzwords, no exclamation marks
- Do not start with the place name
- Reference what makes this type of place genuinely useful to the community

Return ONLY the description text. Nothing else.`;
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🔍  Fetching venues from Supabase…\n');

  const { data: venues, error } = await supabase
    .from('venues')
    .select('id, slug, name, type, location, description')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('❌  Supabase error:', error.message);
    process.exit(1);
  }

  const toEnrich = (venues ?? []).filter(v => isThinDescription(v.description ?? ''));

  console.log(`📍  ${venues?.length ?? 0} total venues`);
  console.log(`✨  ${toEnrich.length} need AI descriptions\n`);

  if (toEnrich.length === 0) {
    console.log('✅  All venues already have rich descriptions. Nothing to do.');
    return;
  }

  let updated = 0;
  let failed  = 0;

  for (const venue of toEnrich) {
    process.stdout.write(`  → ${venue.name} (${venue.location})… `);

    try {
      const result      = await model.generateContent(buildPrompt(venue.name, venue.type ?? 'other', venue.location ?? ''));
      const description = result.response.text().trim();

      const { error: updateErr } = await supabase
        .from('venues')
        .update({ description })
        .eq('slug', venue.slug);

      if (updateErr) {
        console.log(`❌  ${updateErr.message}`);
        failed++;
      } else {
        console.log(`✅`);
        console.log(`     "${description}"\n`);
        updated++;
      }
    } catch (err: any) {
      console.log(`❌  ${err?.message ?? 'unknown error'}`);
      failed++;
    }

    // Gemini free tier: 15 RPM — stay safely under with 1 req/4s
    await sleep(4100);
  }

  console.log(`─────────────────────────────────`);
  console.log(`✅  Updated: ${updated}`);
  if (failed > 0) console.log(`❌  Failed:  ${failed}`);
  console.log(`─────────────────────────────────`);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
