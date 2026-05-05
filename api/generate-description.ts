/**
 * /api/generate-description
 *
 * Vercel serverless function — generates an AI description for a Kayaa venue.
 * Called by QuickAddPlace after a venue is saved, and by the batch enrichment
 * script for the initial seed data.
 *
 * Uses claude-haiku for speed and cost (fractions of a cent per description).
 * Falls back gracefully if the API key is missing or the call fails.
 */

import Anthropic from '@anthropic-ai/sdk';

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

// ─── Prompt ───────────────────────────────────────────────────────────────────

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

// ─── Handler ──────────────────────────────────────────────────────────────────

export default async function handler(req: any, res: any) {
  // CORS — allow calls from kayaa.co.za and localhost
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed' });

  const { name, type, location } = req.body ?? {};

  if (!name || !type || !location) {
    return res.status(400).json({ error: 'name, type, and location are required' });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });
  }

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const message = await client.messages.create({
      model:      'claude-haiku-4-5',
      max_tokens: 120,
      messages:   [{ role: 'user', content: buildPrompt(name, type, location) }],
    });

    const description = (message.content[0] as { text: string }).text.trim();

    return res.status(200).json({ description });
  } catch (err) {
    console.error('[generate-description]', err);
    return res.status(500).json({ error: 'Failed to generate description' });
  }
}
