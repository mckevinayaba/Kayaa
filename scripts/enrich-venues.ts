/**
 * enrich-venues.ts
 *
 * One-time batch script — generates AI descriptions for all seeded venues
 * that still have thin/placeholder descriptions.
 *
 * Run from the project root:
 *   npx tsx scripts/enrich-venues.ts
 *
 * Requires ANTHROPIC_API_KEY in your .env file.
 *
 * What it does:
 *   1. Fetches all venues from Supabase
 *   2. Filters to those with thin descriptions (< 60 chars, or still the
 *      placeholder format "X in Y.")
 *   3. Calls Claude Haiku for each venue to generate a real description
 *   4. Updates the venue record in Supabase
 *   5. Prints a summary of what was updated
 *
 * Safe to re-run — already-enriched venues are skipped.
 * Rate-limited to 1 req/s to respect Nominatim / Anthropic limits.
 */

import Anthropic   from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import * as fs     from 'fs';
import * as path   from 'path';
import * as url    from 'url';

// ─── Load .env manually (no dotenv dependency needed) ─────────────────────────

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

// ─── Validate env vars ────────────────────────────────────────────────────────

const SUPABASE_URL      = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌  Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env');
  process.exit(1);
}

if (!ANTHROPIC_API_KEY) {
  console.error('❌  Missing ANTHROPIC_API_KEY in .env');
  console.error('    Add it:  ANTHROPIC_API_KEY=sk-ant-...');
  process.exit(1);
}

// ─── Clients ──────────────────────────────────────────────────────────────────

const supabase   = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const anthropic  = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

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
  clinic:     'community clinic',
  school:     'school',
  other:      'local business',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isThinDescription(desc: string): boolean {
  if (!desc || desc.length < 60) return true;
  // Matches our old placeholder format: "Barbershop in Berea." or "Place in X."
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
  console.log('🔍  Fetching venues from Supabase…');

  const { data: venues, error } = await supabase
    .from('venues')
    .select('id, slug, name, type, location, description')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('❌  Supabase error:', error.message);
    process.exit(1);
  }

  const toEnrich = (venues ?? []).filter(v => isThinDescription(v.description ?? ''));

  console.log(`📍  Found ${venues?.length ?? 0} total venues`);
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
      const message = await anthropic.messages.create({
        model:      'claude-haiku-4-5',
        max_tokens: 120,
        messages: [{
          role:    'user',
          content: buildPrompt(venue.name, venue.type ?? 'other', venue.location ?? ''),
        }],
      });

      const description = (message.content[0] as { text: string }).text.trim();

      const { error: updateErr } = await supabase
        .from('venues')
        .update({ description })
        .eq('slug', venue.slug);

      if (updateErr) {
        console.log(`❌  update failed: ${updateErr.message}`);
        failed++;
      } else {
        console.log(`✅`);
        console.log(`     "${description}"`);
        updated++;
      }
    } catch (err: any) {
      console.log(`❌  AI error: ${err?.message ?? 'unknown'}`);
      failed++;
    }

    // Rate limit: 1 request per second to stay within Anthropic free tier limits
    await sleep(1100);
  }

  console.log(`\n─────────────────────────────────`);
  console.log(`✅  Updated: ${updated}`);
  console.log(`❌  Failed:  ${failed}`);
  console.log(`─────────────────────────────────`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
