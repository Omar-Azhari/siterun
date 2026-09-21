# Security

How SiteRun is protected, what was checked on 21 September 2026, and the three settings
only the project owner can turn on.

## The short version

- There is no application server. The browser (or the app) talks to Supabase directly with
  a **publishable key**, which is public by design. Every rule is enforced in Postgres:
  Row Level Security on all 27 tables, `SECURITY DEFINER` functions that check the caller
  before acting, guard triggers, and per-user rate limits.
- Secrets never reach the repository or the bundle. `.env` has never been committed and
  the service role key is not used anywhere in the project.
- Responses carry a strict Content-Security-Policy with no inline scripts.

## Keys and environment variables

| Variable                 | Public? | Notes                                                     |
| ------------------------ | ------- | --------------------------------------------------------- |
| `VITE_SUPABASE_URL`      | Yes     | Project URL, visible in every request                     |
| `VITE_SUPABASE_ANON_KEY` | Yes     | `sb_publishable_…`. RLS is the boundary, not this key     |
| `VITE_SHOW_DEMO_LOGINS`  | Yes     | Leave empty in production or the seeded logins are listed |
| `VITE_BACKEND`           | Yes     | `demo` forces the in-browser backend                      |
| `VITE_SITE_URL`          | Yes     | Canonical and social tags                                 |
| `VITE_PUSH_ENABLED`      | Yes     | Push registration in the apps                             |

Anything prefixed `VITE_` is compiled into the JavaScript bundle, so only public values
may use that prefix. The service role key has no `VITE_` name and is never read by the
app; it belongs in the Supabase dashboard and, if a server piece is ever added, in that
server's environment only. `.env` is git-ignored (`.env`, `.env.*`, except
`.env.example`).

## Authentication and authorisation

- Supabase Auth issues the session. Passwords are hashed by Supabase with bcrypt; the app
  never sees, stores or logs a password.
- The client only decides what to _show_. Every rule is also enforced in the database, so
  a crafted request gets the same answer as the UI:
  - **RLS** on all 27 public tables (100% coverage, every table has at least one policy).
  - Reads use tables and `security_invoker` views, so the caller's policies apply.
  - Writes with business rules go through `SECURITY DEFINER` functions that start with a
    caller check — `private.require_admin()`, `private.require_supplier()`,
    `private.require_contractor_writer()`, `private.my_booking_for_change()`,
    `private.can_see_booking()`, `private.in_conversation()`, `private.my_org()`. All 27
    functions were re-verified against this list.
  - Triggers stop clients setting listing status, document review fields or profile flags
    directly.
- **Platform admin** is `profiles.is_platform_admin`, set in the database only. Sign-up
  metadata can never set it, the sign-up screen has no such option, and `require_admin()`
  rejects everyone else with `42501`. `npm run test:rls` covers this.
- `public.search_machines` is the one function anonymous visitors may call. It returns
  live listings only, which is what the public search page shows.
- The dev pages (`/dev/brand`, `/dev/components`, `/dev/screens`) are compiled out of
  production builds — the route only exists when `import.meta.env.DEV` is true, and no dev
  chunk appears in `dist/`.

## Input handling and XSS

- React escapes everything it renders. The project contains no `dangerouslySetInnerHTML`,
  no `innerHTML`, no `eval`, no `new Function` and no `document.write`.
- Forms validate with zod schemas on the client and again in the database (checks,
  enums, length limits, `char(4)` for card last-four).
- No page reads a URL, redirect or `next` parameter and navigates to it, so there is no
  open-redirect surface.
- The two links that open a new tab use `rel="noreferrer"`.
- Uploads go to Supabase Storage. `compliance-docs` and `message-attachments` are private
  and read through short-lived signed URLs; `machine-photos` and `avatars` are public
  buckets holding images the listing already shows. Every bucket has a size limit (2–10 MB)
  and an allowed MIME list (images, plus PDF for documents), and the policies on
  `storage.objects` scope each file to its folder: the owning organisation for compliance
  documents and photos, the conversation for attachments, the user's own id for avatars.

## Rate limits

`private.rate_limit()` counts a user's recent actions and raises `PT429`, which PostgREST
returns as HTTP 429. The limits are triggers on the tables rather than code inside each
function, so they apply to every path — an RPC, a direct PostgREST insert, or a replayed
request. Requests with no signed-in user (service role, `pg_cron`, seeding) are not
limited.

| Action               | Limit per user |
| -------------------- | -------------- |
| Messages             | 30 per minute  |
| Bookings             | 20 per hour    |
| Invitations          | 20 per hour    |
| Support tickets      | 10 per hour    |
| Payments             | 20 per hour    |
| Saved cards          | 10 per hour    |
| Payout requests      | 10 per hour    |
| Machine listings     | 30 per hour    |
| Machine photos       | 120 per hour   |
| Compliance documents | 60 per hour    |
| Reviews              | 20 per hour    |
| Sites                | 30 per hour    |

Sign-in, sign-up, OTP and email sending are rate limited by Supabase Auth itself
(Authentication → Rate limits in the dashboard). The in-browser demo backend has no limits
and needs none: it never leaves the visitor's own browser.

The session lives in `localStorage`, or in `sessionStorage` when "Remember me" is off, and
OAuth uses the PKCE flow (supabase-js default).

## Response headers (`vercel.json`, mirrored in `vite preview`)

- `Content-Security-Policy`: `default-src 'self'`, `script-src 'self' 'wasm-unsafe-eval'`
  (no inline scripts and no JavaScript `eval`; WebAssembly is allowed because the PDF
  renderer compiles a module), `object-src 'none'`, `frame-ancestors 'none'`,
  `base-uri 'self'`, `form-action 'self'`, `frame-src 'self' blob: https://*.supabase.co`
  (the document review screen previews an uploaded file in an iframe), and an allow-list
  for Supabase (REST, storage, realtime websocket), the ArcGIS map tiles and the Photon
  geocoder. `style-src` keeps `'unsafe-inline'` because React sets inline styles for
  layout.
- `Strict-Transport-Security` (2 years, `includeSubDomains`, `preload`)
- `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`,
  `Referrer-Policy: strict-origin-when-cross-origin`
- `Cross-Origin-Opener-Policy: same-origin-allow-popups` (OAuth popups),
  `Cross-Origin-Resource-Policy: same-origin`
- `Permissions-Policy`: camera and geolocation for this origin only; microphone,
  payment, USB and topics off
- `X-Permitted-Cross-Domain-Policies: none`

The boot guard that used to be an inline `<script>` is now `/boot.js`, so no page needs a
CSP nonce or hash. Fonts are emitted as files rather than inlined as `data:` URLs, so
`font-src` stays `'self'`.

Verified against a production build with these headers on
(`npx playwright test --config playwright.audit.config.ts`): all 101 screens load with no
CSP violations and no console errors, and the 23 data-changing features still work. Two
things the first strict draft broke, both found by that run and fixed above: invoice PDFs
(WebAssembly) and the document preview iframe.

## CORS

There is no custom API to configure. Supabase's REST, Auth, Storage and Realtime
endpoints handle their own CORS and require the `Authorization` header, which a
cross-origin page cannot obtain. The site itself sets no `Access-Control-Allow-Origin`, so
no other origin can read a response from it. `Cross-Origin-Resource-Policy: same-origin`
stops other sites embedding its assets.

## Debug output

No `console.log`, no devtools panel, no verbose client flag; source maps are not emitted.
Database errors reach the UI as the short message the function raised, never a stack
trace. `VITE_SHOW_DEMO_LOGINS` must stay empty in production — it is the only switch that
changes what the app reveals.

## Dependencies

`npm audit` reports **0 vulnerabilities** (with and without dev dependencies).

- `react-router-dom` 6 → 7.18.4, fixing the open-redirect and the
  `deserializeErrors` advisories. The v6 `future` flags are v7 defaults and were removed;
  `StaticRouter` now comes from `react-router`.
- `tar` is pinned through `overrides` to `^7.5.22` for the Capacitor CLI (build tooling),
  which closes the path-traversal advisory.
- `@capacitor/assets` was removed from `devDependencies`. It pulled in an unpatched
  `sharp`, `xcode` and `uuid` and is only needed when regenerating app icons, which
  `npm run native:assets` does through `npx`.

## Exposed files

`dist/` holds only the app: two HTML files, hashed assets, icons, the manifest, the
service worker, `boot.js`, `robots.txt` and the public photos. No source maps, no `.env`,
no TypeScript, no Markdown, no dev-page chunks. `.vercelignore` keeps the design boards,
docs, native projects, migrations and test suites off the deployment. `robots.txt` allows
the landing and legal pages only.

## Git history

Scanned all 27 commits for `sb_secret_`, `service_role` keys, JWTs, private keys, Stripe
live keys and AWS access keys: nothing found. `.env` and its variants have never been
added in any commit. The only `service_role` match is the phrase inside an RLS policy.

## Supabase advisors

`security`: the two remaining warnings are expected.

1. _SECURITY DEFINER functions are callable by signed-in users (26) and by anonymous
   visitors (1)._ That is the design: each function checks the caller first, and
   `search_machines` is the public search. Re-verified function by function.
2. _Leaked password protection disabled._ Owner action, below.

`performance`: only INFO items — indexes on audit columns (`*_by` foreign keys) that no
query filters on, and indexes not yet used by the demo data volume.

## Owner actions (dashboard only)

1. **Authentication → Passwords:** turn on _leaked password protection_ (checks
   HaveIBeenPwned) and set a minimum length of at least 8 with mixed character
   requirements.
2. **Authentication → Multi-factor:** enable TOTP before real platform admins exist.
3. **Vercel → Environment variables:** leave `VITE_SHOW_DEMO_LOGINS` unset in production,
   and set `VITE_SITE_URL` to the real domain so the CSP-friendly canonical tags match.
4. Keep the service role key out of the app project entirely; if a server piece is added
   later (for example push sending), give it its own environment.

## What is still mocked

Payments. No real card number, CVV or bank detail is collected or stored anywhere — only
the card brand, expiry and last four digits. Replacing this with Stripe means a server
piece: the card must go straight to Stripe from the browser, never through this database.

## Reporting a problem

Email the address on the deployed `/support` page. Please include the URL, the account
role and what you expected instead.
