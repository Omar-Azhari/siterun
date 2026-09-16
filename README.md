# SiteRun

Australian construction equipment hire marketplace. It connects contractors, suppliers and SiteRun platform admins.
*Machines. People. Progress.*

Status: **Phase 1 (design system) complete.** See `DECISIONS.md` for design decisions.

## Stack

Vite + React 18 + TypeScript (strict), React Router 6, Tailwind CSS 4, lucide-react, framer-motion, react-hook-form + zod, TanStack Query, Supabase, Leaflet, Recharts, date-fns, @react-pdf/renderer. Tests use Vitest and Playwright. Hosting is on Vercel. Capacitor comes in Stage 2.

## Setup

```bash
npm install
cp .env.example .env    # fill in Supabase values (needed from Phase 3)
npx playwright install chromium
npm run dev             # http://localhost:5173
```

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Start the dev server on port 5173 |
| `npm run build` | Type-check and build for production |
| `npm run typecheck` | TypeScript only |
| `npm run lint` | ESLint |
| `npm run format` | Prettier |
| `npm test` | Vitest unit tests |
| `npm run e2e` | Playwright tests (starts the dev server automatically; 390×844 viewport) |
| `npm run brand:assets` | Regenerate logos, favicons and icons from the traced mark |

## Environment variables

| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon (public) key |

Never commit `.env`.

## Project layout

```
design/            Source-of-truth design boards (00-brand … 10-supplier-admin)
public/brand/      Logo SVGs and app icon
public/            Favicons, PWA icons, web manifest
scripts/           Brand asset generation and comparison tools
src/components/ui/          Design-system components (barrel: `@/components/ui`)
src/components/layout/      Screen shell (header, sticky footer, bottom nav)
src/components/navigation/  Per-role bottom nav config
src/components/brand/       Logo (uses the generated mark paths)
src/lib/           Pure logic (e.g. ABN validation)
src/pages/dev/     Dev-only pages (/dev/brand; later /dev/components, /dev/screens)
e2e/               Playwright tests
docs/checkpoints/  Checkpoint screenshots
```

## Dev pages

- `/dev/brand`: logos, colour tokens and type samples (checkpoint 0)
- `/dev/components`: every UI component in every state (checkpoint 1)

## Demo logins

Added in Phase 3.
