# SiteRun

Australian construction equipment hire marketplace. It connects contractors, suppliers and SiteRun platform admins.
*Machines. People. Progress.*

Status: **Phases 0–4 complete** (design system, all screens, Supabase backend, wired flows with end-to-end tests). See `DECISIONS.md` for design and technical decisions.

## Stack

Vite + React 18 + TypeScript (strict), React Router 6, Tailwind CSS 4, lucide-react, framer-motion, react-hook-form + zod, TanStack Query, Supabase (Postgres, Auth, Storage, Realtime, pg_cron), Leaflet, Recharts, date-fns, @react-pdf/renderer. Tests use Vitest and Playwright. Hosting is on Vercel. Capacitor comes in Stage 2.

## Setup

```bash
npm install
cp .env.example .env    # fill in the Supabase URL and anon/publishable key
npx playwright install chromium
npm run dev             # http://localhost:5173
```

Without Supabase values in `.env` the app runs on an in-browser demo store with the same data and rules, so every screen works offline.

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Start the dev server on port 5173 |
| `npm run build` | Type-check and build for production |
| `npm run typecheck` | TypeScript only |
| `npm run lint` | ESLint |
| `npm run format` | Prettier |
| `npm test` | Vitest unit tests (offline) |
| `npm run test:rls` | Row Level Security tests against the Supabase project in `.env`, signed in as the seeded accounts |
| `npm run e2e` | Playwright: component gallery, every screen against the design boards, and sign-up → verify → business profile → first site. Runs on the demo backend (port 5174) |
| `npm run e2e:flows` | Playwright against Supabase (port 5175): search → book → supplier accepts → confirmation; extend hire; realtime messaging; supplier lists a machine → uploads documents → admin approves → machine appears in search; admin area guard |
| `npm run db:seed:sql` | Regenerate `supabase/seed.sql` from the demo seed |
| `npm run brand:assets` | Regenerate logos, favicons and icons from the traced mark |

## Environment variables

| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon or publishable key (public). Never the service role key |
| `VITE_SHOW_DEMO_LOGINS` | `true` lists the seeded demo logins on the login screen. Leave empty in production |
| `VITE_BACKEND` | `demo` forces the in-browser demo backend even when Supabase values are set |

Never commit `.env`.

## Supabase

Migrations live in `supabase/migrations` (schema, RLS, business functions, storage/realtime/cron, hardening). Apply them in order with the Supabase CLI (`supabase db push`) or the SQL editor, then load the demo data:

```bash
npm run db:seed:sql     # writes supabase/seed.sql (dates relative to when it runs)
psql "$DATABASE_URL" -f supabase/seed.sql
```

`seed.sql` **wipes all app data and every `*.test` user** before loading, so only run it on a demo project.

How it fits together:

- Every table has RLS. Reads go through tables and `security_invoker` views (`machine_details`, `booking_details`, `conversation_list`), so the caller's policies apply.
- Anything with business rules (bookings, extensions, reviews, approvals, payouts, plans) is a `SECURITY DEFINER` function that checks the caller first. Triggers stop clients changing listing status, document review fields or profile flags directly.
- Platform admin is `profiles.is_platform_admin`, set in the database only. Sign-up metadata can never set it.
- Payments are mocked. Only card brand, last four digits and expiry are stored (`payment_methods.last4` is `char(4)`).
- Storage buckets: `machine-photos` (public), `avatars` (public), `compliance-docs` and `message-attachments` (private, signed URLs).
- Realtime: messages, notifications, deliveries and bookings.
- pg_cron: `siterun-document-expiry` (daily 20:00 UTC, 06:00 AEST) warns at 30/14/7 days and pauses listings with expired required documents; `siterun-simulate-deliveries` moves in-transit trucks along their route every 20 seconds.

### Auth settings (Supabase dashboard)

1. **Email OTP.** Authentication → Emails → *Confirm signup*: include `{{ .Token }}` so users get the 6-digit code the Verify screen asks for, for example `Your SiteRun code is {{ .Token }}`. The link in the same email also works.
2. **SMTP.** The built-in sender only mails project members and is rate limited. Add your own SMTP provider before inviting real users.
3. **URL configuration.** Set the Site URL to the deployed domain and add `http://localhost:5173/**` to the redirect URLs (used by email links, password reset and OAuth).
4. **Google / Apple.** Authentication → Providers: add the client ID and secret for each. The buttons on the login screen work once a provider is enabled.

## Project layout

```
design/            Source-of-truth design boards (00-brand … 10-supplier-admin)
public/            Favicons, PWA icons, web manifest, brand SVGs, photos (public/images)
scripts/           Brand assets, photo fetch, board comparison, seed SQL generator
supabase/          Migrations, seed, RLS tests
src/components/    ui (design system), layout, navigation, domain, brand
src/data/          Api interface, React Query hooks, demo backend, Supabase backend
src/pages/         Screens by area (auth, browse, bookings, hires, supplier, admin, operator …)
src/lib/           Pure logic (ABN, money, booking maths, cards, PDFs)
e2e/               Playwright on the demo backend
e2e-flows/         Playwright on Supabase
docs/checkpoints/  Checkpoint screenshots and board comparisons
```

## Dev pages

- `/dev/brand`: logos, colour tokens and type samples
- `/dev/components`: every UI component in every state
- `/dev/screens`: every screen, grouped by board, with a role switcher (demo backend only)

## Demo logins

All accounts use the password `SiteRun!2026` (demo backend and the seeded Supabase project). In demo mode the verification code is `123456`.

| Role | Email | Organisation |
|---|---|---|
| Contractor | alex@acme.test | Acme Construction Pty Ltd |
| Supplier | jordan@turnerplant.test | Turner Plant Hire |
| Operator | sam@turnerplant.test | Turner Plant Hire |
| Organisation admin | priya@buildco.test | BuildCo Pty Ltd |
| Platform admin | admin@siterun.test | SiteRun |
| New user (no business profile yet) | jamie.carter@buildco.test | — |
