# Security

How SiteRun is protected, what was checked on 21 September 2026, and the three settings
only the project owner can turn on.

## The short version

- The browser (or the app) talks to Supabase directly with a **publishable key**, which is
  public by design. Every rule is enforced in Postgres: Row Level Security on every table,
  `SECURITY DEFINER` functions that check the caller before acting, guard triggers, and
  per-user rate limits.
- Three Edge Functions hold the only server-side secrets: `payments` and `stripe-webhook`
  (Stripe) and `push` (Firebase and Apple). Each authenticates its caller itself; see
  [Edge Functions](#edge-functions).
- Secrets never reach the repository or the bundle. `.env` has never been committed, and
  the service role key is used only inside the Edge Functions, where Supabase provides it.
- Responses carry a strict Content-Security-Policy with no inline scripts.

## Keys and environment variables

| Variable                      | Public? | Notes                                                     |
| ----------------------------- | ------- | --------------------------------------------------------- |
| `VITE_SUPABASE_URL`           | Yes     | Project URL, visible in every request                     |
| `VITE_SUPABASE_ANON_KEY`      | Yes     | `sb_publishable_…`. RLS is the boundary, not this key     |
| `VITE_SHOW_DEMO_LOGINS`       | Yes     | Leave empty in production or the seeded logins are listed |
| `VITE_BACKEND`                | Yes     | `demo` forces the in-browser backend                      |
| `VITE_SITE_URL`               | Yes     | Canonical and social tags                                 |
| `VITE_PUSH_ENABLED`           | Yes     | Push registration in the apps                             |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Yes     | Stripe's publishable key, meant for browsers              |

Anything prefixed `VITE_` is compiled into the JavaScript bundle, so only public values
may use that prefix. `.env` is git-ignored (`.env`, `.env.*`, except `.env.example`).

Server secrets live only in **Supabase → Edge Functions → Secrets**: `STRIPE_SECRET_KEY`,
`STRIPE_WEBHOOK_SECRET`, `FIREBASE_SERVICE_ACCOUNT`, `APNS_KEY` (with `APNS_KEY_ID`,
`APNS_TEAM_ID`) and `ALLOWED_ORIGINS`. The shared secret that lets the database call the
push function was generated inside the database and is kept in Supabase Vault; nobody needs
to copy it anywhere.

## Authentication and authorisation

- Supabase Auth issues the session. Passwords are hashed by Supabase with bcrypt; the app
  never sees, stores or logs a password.
- The client only decides what to _show_. Every rule is also enforced in the database, so
  a crafted request gets the same answer as the UI:
  - **RLS** on all 30 public tables (100% coverage, every table has at least one policy).
  - Reads use tables and `security_invoker` views, so the caller's policies apply.
  - Writes with business rules go through `SECURITY DEFINER` functions that start with a
    caller check — `private.require_admin()`, `private.require_supplier()`,
    `private.require_contractor_writer()`, `private.my_booking_for_change()`,
    `private.can_see_booking()`, `private.in_conversation()`, `private.my_org()`. Every
    function the app can call was re-verified against this list; the ones for Stripe and
    push can only be called by the service role inside the Edge Functions.
  - Triggers stop clients setting listing status, document review fields or profile flags
    directly.
- **Platform admin** is `profiles.is_platform_admin`, set in the database only. Sign-up
  metadata can never set it, the sign-up screen has no such option, and `require_admin()`
  rejects everyone else with `42501`. `npm run test:rls` covers this.
- Anonymous visitors may call three functions: `search_machines` (live listings only, what
  the public search page shows), `log_client_error` (crash reports) and `track_event`
  (usage counts). The last two are capped per hour, per person and overall.
- The dev pages (`/dev/brand`, `/dev/components`, `/dev/screens`) are compiled out of
  production builds — the route only exists when `import.meta.env.DEV` is true, and no dev
  chunk appears in `dist/`.

## Input handling and XSS

- React escapes everything it renders. The project contains no `dangerouslySetInnerHTML`,
  no `innerHTML`, no `eval`, no `new Function` and no `document.write`.
- Forms validate with zod schemas on the client and again in the database (checks,
  enums, length limits, `char(4)` for card last-four).
- Two screens follow a `?next=` path (after sign-in and after saving a card), and a tapped
  push notification opens its `link`. All three go through `safeNextPath()`, which accepts
  only a path on this site: a single leading `/`, not `//` or `/\` (which browsers treat
  as another host), and no control characters. The push function applies the same rule
  before sending.
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

| Action                         | Limit per user                                        |
| ------------------------------ | ----------------------------------------------------- |
| Messages                       | 30 per minute                                         |
| Bookings                       | 20 per hour                                           |
| Invitations                    | 20 per hour                                           |
| Support tickets                | 10 per hour                                           |
| Payments                       | 20 per hour                                           |
| Saved cards                    | 10 per hour                                           |
| Payout requests                | 10 per hour                                           |
| Machine listings               | 30 per hour                                           |
| Machine photos                 | 120 per hour                                          |
| Compliance documents           | 60 per hour                                           |
| Reviews                        | 20 per hour                                           |
| Sites                          | 30 per hour                                           |
| Live location updates          | 720 per hour (one every 5 s)                          |
| Stripe card setups and charges | 30 per hour                                           |
| Error reports                  | 60 per hour, and 300 per hour across all visitors     |
| Usage events (analytics)       | 600 per hour, and 20,000 per hour across all visitors |

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
  for Supabase (REST, storage, realtime websocket, Edge Functions), the ArcGIS map tiles,
  the Photon geocoder, and Stripe (`js.stripe.com` for its script and card fields,
  `api.stripe.com`, `hooks.stripe.com` for 3-D Secure). Stripe's card fields use the
  system font rather than a Google web font, so Google stays off the list. `style-src`
  keeps `'unsafe-inline'` because React sets inline styles for layout.
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

- Supabase's REST, Auth, Storage and Realtime endpoints handle their own CORS and require
  the `Authorization` header, which a cross-origin page cannot obtain.
- The `payments` function echoes `Access-Control-Allow-Origin` only for the site's own
  origins (`ALLOWED_ORIGINS`), the apps (`capacitor://localhost`, `https://localhost`) and
  local development. Any other origin gets no CORS header, so a browser won't hand it the
  response. CORS isn't what protects it, though: every call also needs a valid session.
- `stripe-webhook` and `push` are server-to-server and send no CORS headers at all.
- The site itself sets no `Access-Control-Allow-Origin`, and
  `Cross-Origin-Resource-Policy: same-origin` stops other sites embedding its assets.

## Edge Functions

| Function         | Who may call it                              | How that is checked                                                                                                                                                                                  |
| ---------------- | -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `payments`       | A signed-in user, for their own organisation | The user's session token; the database then works out their organisation (`payment_context`), so a request can't name someone else's. Adding or removing cards needs the owner or a project manager. |
| `stripe-webhook` | Stripe                                       | Stripe's signature (`STRIPE_WEBHOOK_SECRET`); unsigned or altered requests get 400. The customer must also match the organisation on record.                                                         |
| `push`           | The database                                 | A 64-character secret from Vault, compared in constant time.                                                                                                                                         |

All three are deployed with Supabase's gateway JWT check off because they authenticate in
code (the webhook and the database can't send a user token, and the app's new-style
publishable key isn't a JWT).

Payments specifically:

- Card numbers never touch SiteRun: they are typed into Stripe's own fields (iframes from
  `js.stripe.com`) and sent straight to Stripe.
- Amounts are checked against the balance the database reports, and a payment is recorded
  only after Stripe says it succeeded. Recording is idempotent on Stripe's payment id, so
  the app and the webhook can both confirm the same charge safely.
- Each charge carries an idempotency key, so a double tap or a retried request charges once.
- Once `payments_provider` is switched to `stripe`, the database refuses the old mock
  paths: `make_payment` and inserting a card row by hand. Only the service-role functions
  the Edge Functions call can record cards and payments.

## Debug output

No `console.log`, no devtools panel, no verbose client flag; source maps are not emitted.
Database errors reach the UI as the short message the function raised, never a stack
trace. `VITE_SHOW_DEMO_LOGINS` must stay empty in production — it is the only switch that
changes what the app reveals.

## Dependencies

`npm audit --omit=dev` reports **0 vulnerabilities**: nothing that ships to a browser or a
phone has a known advisory.

- `react-router-dom` 6 → 7.18.4, fixing the open-redirect and the
  `deserializeErrors` advisories. The v6 `future` flags are v7 defaults and were removed;
  `StaticRouter` now comes from `react-router`.
- `@capacitor/assets` was removed from `devDependencies`. It pulled in an unpatched
  `sharp`, `xcode` and `uuid` and is only needed when regenerating app icons, which
  `npm run native:assets` does through `npx`.

**One known dev-only advisory stands:** `tar`, pulled in by `@capacitor/cli` 6. Pinning it
forward broke `npx cap sync` — the Capacitor 6 CLI uses tar v6's default export, which v7
doesn't have — so the pin was removed. `tar` runs only on a developer's machine, when the
CLI unpacks plugin templates, and never on the site or in the apps. It clears when
Capacitor is upgraded to 8, which is a native-release job (`MOBILE_BUILD.md`).

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

1. _SECURITY DEFINER functions are callable by signed-in users (40) and by anonymous
   visitors (3)._ That is the design: each function checks the caller first.
   `search_machines` is the public search, and `log_client_error` and `track_event` take
   crash reports and usage counts from signed-out visitors too (both capped). The
   service-only functions for Stripe, payouts, push and email are not callable by either
   role. Re-verified function by function.
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
4. Keep the service role key and the Stripe, Firebase and Apple keys out of the app and
   the repository: they belong only in Supabase's Edge Function secrets (`LAUNCH.md`).

## What admins can do, and what it leaves behind

Platform admins can cancel a hire, change its dates or total, and refund a payment. Each
one needs a written reason, messages both organisations, writes a booking event, and
records the admin's id in `admin_actions`. There is no way to change a hire quietly.

## What people are counted doing

`analytics_events` holds four kinds of row — search, machine view, booking started,
booking — with the search text, the category, the machine, and the organisation when the
person is signed in. No IP addresses, no cookies, no third-party analytics and no tracking
across other sites. Platform admins are the only readers, and rows are deleted after 180
days.

## What is still mocked

- Card payments stay mocked until the owner adds the Stripe keys and switches
  `payments_provider` (`LAUNCH.md`). In either mode no card number, CVC or bank detail is
  ever stored — only the card brand, expiry and last four digits.
- Supplier payouts move real money only once Stripe is switched on; until then they are
  recorded as before.

## Reporting a problem

Email the address on the deployed `/support` page. Please include the URL, the account
role and what you expected instead.
