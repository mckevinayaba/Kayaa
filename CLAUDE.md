# Kayaa — Claude Code Build Rules

## What Kayaa is
A neighbourhood place network. Every recurring place people return to gets a 
living community page. Barbershops, taverns, shisanyamas, spazas, churches, 
salons, carwashes, clinics, sports grounds, tutoring spaces, home businesses.

## NON-NEGOTIABLE RULES
- Build the PRODUCT, not a marketing landing page or pitch deck
- No investor hero sections, no narrative blocks
- The first screen a user sees must be a working product interface

## Core MVP screens — build in this exact order
1. /feed — Home feed
2. /venue/:slug — Public venue page
3. /venue/:slug/checkin — Check-in flow
4. /dashboard — Owner dashboard
5. /onboarding — Venue registration

## Tech stack
- React + Vite + TypeScript
- React Router v6
- Supabase
- Tailwind CSS
- lucide-react
- qrcode.react

## Design system — Midnight
Background: #0D1117
Surface: #161B22
Accent: #39D98A
Text muted: rgba(255,255,255,0.52)
Font display: Syne
Font body: DM Sans

## Commit rules
- One task = one commit
- Format: "feat: what was built"
- Never commit .env files
- Always commit to main
