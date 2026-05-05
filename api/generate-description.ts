/**
 * /api/generate-description
 *
 * Vercel serverless function — generates an AI description for a Kayaa venue.
 * Uses Google Gemini Flash (free tier: 1,500 req/day, no credit card needed).
 *
 * Get a free API key at: https://aistudio.google.com/app/apikey
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

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
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed' });

  const { name, type, location } = req.body ?? {};

  if (!name || !type || !location) {
    return res.status(400).json({ error: 'name, type, and location are required' });
  }

  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ error: 'GEMINI_API_KEY not configured' });
  }

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model  = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const result = await model.generateContent(buildPrompt(name, type, location));
    const description = result.response.text().trim();

    return res.status(200).json({ description });
  } catch (err) {
    console.error('[generate-description]', err);
    return res.status(500).json({ error: 'Failed to generate description' });
  }
}
