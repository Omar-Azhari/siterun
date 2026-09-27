# Decisions log

Choices made where the mockups or brief were unclear or contradictory. Newest items are added at the bottom of each section.

## From the brief (section 5)

1. **Logo:** S-chevron mark from `design/00-brand.jpeg` everywhere. The house/garage mark on boards 01–05, 07, 09, 10 is not used.
2. **Tagline:** "Machines. People. Progress." everywhere.
3. **Typos fixed:** "Site Acess Window" → "Site Access Window"; "Addide detailed specifications" → "Add detailed specifications"; "Melbourns" → "Melbourne".
4. **Dates:** seed data is relative to today, not the 2025 dates in the mockups.
5. **Bottom nav:** one nav per role (Contractor / Supplier / Platform admin), as set out in the brief.
6. **"Admin" on Choose Role** means organisation admin. Platform admin can only be set in the database.
7. **Operator role:** a minimal area in the same style (not designed in the mockups).
8. **Payments:** mocked. Only brand, last 4 and expiry are stored.
9. **Home screens:** Contractor Home = Browse Equipment plus an active-hires strip. Supplier Home = Performance plus shortcuts.

## Phase 0

### Typography

- **Headings: Plus Jakarta Sans. Body: Inter.** The board titles and the "SiteRun" wordmark have Plus Jakarta Sans's heavy geometric shapes (single-storey feel, tight apertures). Inter is closer for body text and UI labels. Both are self-hosted through `@fontsource-variable`, so they also work offline in the Capacitor app.

### Colour tokens (sampled from the phone screens)

Values came from colour histograms over whole phone-screen regions and pixel profiles across card and input edges, not single pixels. JPEG compression shifts values by roughly ±3.

| Token                    | Brief estimate | Sampled / used | Where sampled                                                              |
| ------------------------ | -------------- | -------------- | -------------------------------------------------------------------------- |
| `app` (screen bg)        | `#050A14`      | `#011020`      | Dominant colour in boards 01, 04, 05, 07                                   |
| `card`                   | `#0D1626`      | `#04182B`      | Card interiors, boards 04/05                                               |
| `card-2`                 | –              | `#051C2E`      | Cards have a faint vertical gradient to this                               |
| `input`                  | `#0F1A2C`      | `#0A2439`      | Input interiors, board 01 screen 6                                         |
| `selected`               | –              | `#002349`      | Selected card tint, boards 02/09                                           |
| `line` (card border)     | `#1C2A40`      | `#1A2D3E`      | Card edge profile, board 05                                                |
| `line-input`             | –              | `#2A3F50`      | Input edges are lighter than card edges                                    |
| `muted`                  | `#9AA6B8`      | `#AEB9C9`      | Subtitle and meta text (brightest glyph pixels)                            |
| `subtle`                 | `#6B7890`      | `#7F8A9B`      | Inactive bottom-nav labels                                                 |
| primary / status colours | as briefed     | unchanged      | Buttons sample at `#0060FC`–`#006CFF`, so the brand blue `#006CFF` is kept |

The mockup background is a deep navy-black rather than the neutral near-black in the brief. All text tokens pass 4.5:1 on `app` and `card`.

### Logo and icons

- The mark was traced by hand into three paths (blue top stroke, navy chevron, navy lower bar) and checked against a 4× crop of the brand sheet with a difference overlay (`scripts/trace-mark.mjs`).
- The "SiteRun" wordmark and the tagline are **converted to outlines** from Plus Jakarta Sans ExtraBold (800) and SemiBold (600), so the SVGs don't depend on installed fonts.
- The brand sheet has no white-wordmark variant. `logo-horizontal-white.svg` follows the app icon's scheme: blue top stroke, **white** chevron, white text.
- `favicon.svg` switches its navy strokes to white when the browser UI is dark, so the mark stays visible on dark tab bars. `favicon.ico` (16/32/48) uses the navy version.
- `apple-touch-icon.png`, `icon-192.png` and `icon-512.png` use the **opaque app icon** (navy square) rather than the transparent mark, because iOS fills transparent areas with black. `icon-maskable-512.png` is full-bleed navy with the mark inside the 80% safe zone.
- Extra files beyond the brief: `logo-mark-white.svg`, `logo-lockup-tagline-white.svg`, and `app-icon-full.svg` (square corners, the source for store icons in Stage 2).

### Tooling

- **React 18 is pinned** as the brief requires, so `react-leaflet` is pinned to v4 (v5 needs React 19).
- **TypeScript 6.0** (not 7.x) because `typescript-eslint` supports TS < 6.1 only.
- **Tailwind v4** with tokens in `@theme` (`src/index.css`) rather than a `tailwind.config.js`.
- `design/` holds the renamed boards. The original `siterun/` folder and `siterun.zip` are git-ignored.

## Phase 1

### Component library

- **Two tab styles.** The boards use two visually different tab bars: separate bordered pills (04 Active Hires, 09 Booking Requests, 10 Performance) and one joined bar (02 Monthly/Annual, 05 Invoices/Statements, 07 Hourly/Daily/Weekly). `SegmentedTabs` takes `variant="split" | "joined"`.
- **Secondary button** is a dark card fill with a blue 1px border (board 04 "Schedule Return", board 09 "Plan Dispatch"). A separate neutral `outline` variant matches the grey-bordered social sign-in buttons on board 01.
- **Status pill looks** follow the mockups where shown. Statuses the mockups don't show (Declined, Cancelled, Draft, Paused) use danger or neutral styling. "Confirmed" appears as a blue check on boards 09/10 and a green check on board 03 (booking confirmation), so both exist: `confirmed` (blue) and `booking_confirmed` (green).
- **Selected card** = blue border plus a navy-to-blue tint gradient, sampled from boards 02, 04 and 09.
- **Bottom-nav active state:** blue label, with the outline icon filled at about 22% opacity to match the "filled" active icons in the mockups while staying in the Lucide style.
- **Date and time fields** display "Mon, 26 May 2025" and "7:00 AM" (mockup format) with the native picker layered invisibly on top, so phones get the OS picker. Native date inputs can't be formatted like the mockup.
- **Selects are native `<select>`** styled to match. This works best on mobile and with screen readers.
- **Phone field** offers Australia (+61) and New Zealand (+64). Flags are inline SVG because Lucide has none.
- **Extra components** not listed in the brief but needed by several screens: `Chip` (attachments), `ProgressBar` (top machines), `Slider` (service radius), `Checkbox`, `CopyButton`, `Price`, `Badge`, `Avatar`, `InfoNote`, `BottomSheet` (filters), `Screen` layout.
- **`tailwind-merge`** was added so a component's `className` can override its base utilities (e.g. widths and heights). Without it the phone field's country picker took the full row. It's a class-merging utility, not a UI kit.

### Navigation

- **Operator bottom nav** (not in the mockups): Home · Bookings · Documents · Messages · Account.
- **Supplier "Bookings"** opens Bookings & Dispatch (`/supplier/dispatch`). Booking Requests and Booking Detail highlight the same tab.
- **Contractor "Account"** stays highlighted on sub-pages reached from Account (Payments, Invoices, Sites, Team, Plans, Support, Notifications). Board 05 shows those as separate tabs, but the brief sets a five-item contractor nav.

## Phase 2

### Architecture

- **One `Api` interface, two backends.** Screens call `src/data/api.ts` through React Query hooks. `DemoApi` (in-browser, persisted to localStorage, reseeded daily) is used when Supabase env vars are missing. It also powers `/dev/screens` and the board screenshot suite. Its permission checks mirror the RLS policies, so behaviour matches production.
- **Demo mode is a feature, not a stub.** Every flow works without a backend: sign-up, OTP (code `123456`, shown on screen), bookings, supplier accept/decline, dispatch/delivery/collection, invoices, payouts, admin approval.
- **Supplier lifecycle actions were added** (not on the boards): _Mark Dispatched → Mark Delivered/Picked Up → Mark Collected & Invoice_, available from Plan Dispatch and Booking Detail. Completing a hire raises the tax invoice. Without these, hires could never move between the designed states.

### Content and data

- **Photos** come from Unsplash (Unsplash License) via the website search, because the API needs a key. Sources and photographers are in `CREDITS.md`. Pexels wasn't needed.
- **Demo emails use `.test` domains** (e.g. `alex@acme.test` instead of `alex@acme.com`), so no real address can ever receive mail.
- **Dates are relative to today.** The seed reproduces the mockups' shape (5 active hires, 4 requests, INV-1041…1045, $12,480 available payout) rather than their literal May–June 2025 dates.
- **Invoice rows show totals including GST.** The mockup amounts ($3,200, $1,680…) are used as the ex-GST hire value. Invoices add 10%, so rows read $3,520.00 etc. **Account Balance** = unpaid invoices including GST ($4,620.00 in the seed, not $12,480).
- **Admin dashboard numbers are live counts** from the database (e.g. Users 7), not the mockup's platform-scale figures (1,248). Trends compare the selected period with the previous one.
- **Site names:** board 04 uses "Riverside Estate" while board 02 uses "Riverside Apartments". The seed uses Riverside Apartments everywhere. Board 04's other sites (Warehouse Project A, Airport Upgrade, Retail Fitout, Civic Centre) exist as additional Acme sites.
- **Board 05 calendar** shows the _supplier_ name under each booking (the mockup shows customer names, which doesn't make sense for a contractor).
- **Booking references** use `SR-YYYY-NNNN` everywhere, including the supplier booking detail (mockup: `#BK-7842`). Support tickets keep the mockup's `#SR-4582` style.
- **Compliance Status (board 08 #6)** shows the requirements configured for the machine's category. The mockup lists crane and operator documents on an excavator; ours shows general-plant documents (and crane documents only for cranes). Operator documents live on the operator's profile.
- **Board 10 booking detail** shows the real status ("New Request" with Decline/Accept). The mockup shows "Confirmed" with Decline/Accept at the same time.
- **Browse Equipment** shows all 8 categories (the six on the board plus Loaders and Other Plant, which appear on board 07).
- **"Booking Confirmed!" vs "Booking Requested!"** New bookings wait for supplier acceptance, so the confirmation screen says _Requested_ until the supplier accepts, then _Confirmed_.

### UI details

- **Type scale is about 15% larger than the brief** (titles 26px, body and inputs 16px). The mockups' text is larger relative to screen width than the brief's sizes, and 16px inputs prevent iOS zoom-on-focus.
- **Map tiles:** CARTO basemaps now return "API key required", so the dark tracking map uses **Esri Dark Gray Canvas** and the street toggle uses **Esri World Street Map**. Address search and reverse geocoding use **Photon** (OSM, no key) with an offline suburb list as fallback.
- **Rates step tabs** (Hourly/Daily/Weekly) choose the _main pricing unit_ (that rate becomes required). All three rate fields stay visible as in the mockup. A daily rate is always required because search and booking price per day.
- **Hire type on the listing wizard** is multi-select (a machine can be offered dry _and_ wet), with a wet-hire daily rate field when Wet is ticked.
- **Operator documents** are uploaded per person (HRWL, VOC, tickets, inductions). Operators manage their own from `/operator/documents`.
- **Login** has a collapsed "Demo accounts" panel in demo mode, or on Supabase when `VITE_SHOW_DEMO_LOGINS=true`.
- **Live listings must be paused before editing**, so changes can't bypass review.

## Phase 3

### Database

- **Supabase project `SiteRun`** (ap-southeast-2, Sydney) holds the schema. Migrations are applied in order from `supabase/migrations`.
- **Keys are UUIDs** throughout. The demo seed's readable ids (`org-acme`, `b-hire-tele`) become stable UUIDs (md5 of the id), so reseeding keeps links working.
- **Business rules live in `SECURITY DEFINER` functions** (`create_booking`, `respond_to_booking`, `advance_booking`, `extend_hire`, `review_machine` …). Each one checks the caller, then sets a transaction-local `app.bypass` flag so guard triggers allow the change. Clients can't change listing status, approval fields, document review fields, `is_platform_admin`, `account_type` or `org_id` directly.
- **No double booking** is enforced twice: `create_booking`/`respond_to_booking` check overlaps, and an exclusion constraint on `(machine_id, daterange)` covers confirmed, in-transit, on-site and return-scheduled bookings.
- **RLS on every table**, without `FORCE`, so definer functions (owned by `postgres`) can do their checks. Views use `security_invoker` so the caller's policies apply. Policy helpers live in a `private` schema that PostgREST doesn't expose.
- **Anonymous visitors** can call `search_machines` and read live listings, categories and supplier names. Every other function needs a signed-in user (`EXECUTE` revoked from `anon`).
- **Advisor fixes:** `search_path` pinned on every function, `btree_gist` moved to the `extensions` schema, `auth.uid()` wrapped in `select` inside policies, indexes on foreign keys used in joins. "Unused index" notices are expected on a fresh database.

### Scheduled jobs

- **Document expiry uses pg_cron**, not an Edge Function: `run_document_expiry()` runs daily at 20:00 UTC (06:00 AEST), warns at 30/14/7 days (each once) and pauses live listings whose required documents have expired. Keeping it in SQL means no extra deploy and it uses the same rules as `submit_machine`.
- **Delivery tracking is simulated** by pg_cron every 20 seconds: in-transit trucks move along their route over a 90 minute trip from pickup, writing `delivery_locations` and updating `deliveries` (realtime). A real deployment swaps this for driver GPS inserts; the `delivery_locations` insert policy already allows the supplier to post positions for its in-transit bookings. Old points are pruned after two days.

### Seed

- `supabase/seed.sql` is generated from the same `buildSeed()` the demo store uses (`npm run db:seed:sql`), with every date written relative to when the SQL runs. Generated booking refs skip SR-…-7842/7843, which the boards show on specific bookings.
- **Demo accounts** are real Supabase users with the password `SiteRun!2026` and confirmed emails. `admin@siterun.test` gets `is_platform_admin` from the seed, not from sign-up.

### Auth

- **Email verification uses Supabase's 6-digit OTP** (`verifyOtp`, type `signup`). The dashboard's _Confirm signup_ template must include `{{ .Token }}` (README). The email link also works: it signs the user in and the Verify screen moves on.
- **"Keep me signed in"** controls where the Supabase session is stored: localStorage when ticked, sessionStorage when not.
- **Invitations** are accepted automatically at sign-in and after verification (`accept_invitations`), matching on email.
- **Google and Apple** buttons call `signInWithOAuth`. They work once the providers are enabled in the dashboard.

## Phase 4

- **Sign-up → verify is automated on the demo backend only.** On Supabase the 6-digit code arrives by email, and the built-in sender only mails project members, so a test can't read it. The Supabase suite covers everything after verification using the seeded accounts.
- **e2e-flows run against the live demo project** and tidy up after themselves (the test booking is cancelled, the test listing paused). Dates are one to three years out so runs never overlap real demo data.
- **Fixed while wiring:** creating a site no longer bounces back to step 1 while the next page loads, and Book waits for the user's sites before Continue is enabled.

## Phase 5

- **Desktop layout (768px and up):** a fixed left sidebar replaces the bottom nav and the menu drawer. Main destinations come first, then a "More" group with the drawer's links. Content stays a centred column (max 672px), because every screen was designed for phone width.
- **Landing page at `/`** for signed-out visitors, using the brand board's copy ("Keep projects moving.", the four brand values, the tagline lockup). Signed-in visitors go straight to their home. The mobile Welcome screen stays at `/welcome`.
- **The landing page is prerendered** at build time (`scripts/prerender.mjs` renders it with `renderToString` and the client hydrates it), so the hero paints before any JavaScript runs. Other routes are served `app.html`, a clean shell, via `vercel.json` (and the same rewrite in `vite preview`).
- **Startup performance:** the backend (supabase-js or the demo store) is its own chunk behind a deferred Api, so the first screen doesn't wait for it; public pages render immediately when no session is stored; framer-motion's animation features load after first paint (`LazyMotion`); Login validates without zod. Photos under dark overlays use the 480px files on phones.
- **Lighthouse (mobile, simulated throttling, `vite preview`):** landing 92–93 performance / 100 accessibility / 100 best practices / 100 SEO; login 90 / 100; welcome 91 / 100; sign-up 89–90 / 100. Signed-in screens weren't measured (Lighthouse can't sign in).
- **Link colour:** the brand blue (#006CFF) is 4.2:1 on the app background, below AA for small text. `text-primary` now uses #3386FF (4.6:1 or better on every background). Buttons keep the brand blue.
- **robots.txt** allows only the landing and legal pages; app screens are behind sign-in.
- **Deploy:** `vercel.json` is ready (Vite, SPA rewrites, immutable asset caching, security headers). Deploying needs a Vercel login or a connected Git repository (see README).

## Phase 6 (Stage 2)

- **PWA:** `vite-plugin-pwa` (Workbox) precaches the app shell and caches photos and lazy chunks at runtime. The heavy PDF and chart chunks are left out of the precache so the first load stays small. The service worker is registered only on the web; inside Capacitor the files are already local.
- **Offline:** a bar appears when the device drops offline. Cached screens keep working; anything needing the server shows its normal error state.
- **Capacitor 6** with `appId au.com.siterun.app`. `@capacitor/browser` was added beyond the brief's plugin list: Google and Apple block OAuth inside web views, so sign-in opens the system browser and returns on the deep link.
- **Deep links** use the custom scheme `au.com.siterun.app://` (login, verify, reset-password). Universal/App Links need a live domain and store-signed app, so they're a post-deploy step.
- **Status bar** uses Capacitor's `Style.Dark`, which means light icons on the navy background (the brief's "dark content on navy" reads as the dark style).
- **Push notifications are off** unless `VITE_PUSH_ENABLED=true`: registering without Firebase or APNs credentials crashes on Android. Tokens are stored in `push_tokens`; sending needs a server piece.
- **Native platform detection reads `window.Capacitor` once at startup**, because `@capacitor/core` replaces that global with its own instance when the first plugin loads, and on the web that instance reports "not native".
- **The marketing page never shows in the apps**: they open at Welcome.
- **Not run on a device here.** This machine has no Android SDK and iOS needs a Mac, so Checkpoint 6's emulator screenshots are outstanding. The native code paths were verified in a simulated Capacitor shell (`e2e-audit/native.spec.ts`).

## Phase 7 (security hardening)

- **The database is the security boundary**, not the client. The publishable key is public
  by design, so every rule lives in Postgres: RLS on all 27 tables, `SECURITY DEFINER`
  functions that check the caller first, guard triggers, and rate limits. `SECURITY.md`
  is the full report.
- **Rate limits are triggers on the tables, not code inside each function.** A limit in
  `create_booking` would miss a direct PostgREST insert; a trigger catches both. They
  raise `PT429`, which PostgREST turns into HTTP 429. Requests with no signed-in user
  (service role, `pg_cron`, `seed.sql`) are skipped, otherwise seeding would trip them.
- **Content-Security-Policy with no inline scripts.** Two things had to change for
  `script-src 'self'` to hold: the landing page's boot guard moved from an inline
  `<script>` to `/boot.js`, and Vite no longer inlines small fonts as `data:` URLs
  (`build.assetsInlineLimit`), which keeps `font-src 'self'`. `style-src` still needs
  `'unsafe-inline'` because React writes inline styles. Two directives had to be widened
  after the audit run caught them: `script-src` needs `'wasm-unsafe-eval'` because
  `@react-pdf/renderer` compiles a WebAssembly module (without it the invoice download
  silently never starts), and `frame-src` needs `https://*.supabase.co` and `blob:` for the
  document preview iframe on the admin review screen.
- **Dev pages are compiled out of production.** `/dev/*` is a single lazy route that only
  exists when `import.meta.env.DEV` is true, so no dev chunk ships.
- **react-router-dom 6 → 7.18.4** to clear the open-redirect and `deserializeErrors`
  advisories. The v6 `future` flags are v7 defaults, and `StaticRouter` moved to
  `react-router` (the prerender script). No other code changed: 108 demo e2e, 5 flow and
  101 page checks pass on v7.
- **`@capacitor/assets` removed from devDependencies.** It pulled in an unpatched `sharp`,
  `xcode` and `uuid` for a script that runs a few times a year; `npm run native:assets`
  fetches it with `npx` instead. `tar` is pinned with `overrides` for the Capacitor CLI.
  `npm audit` is now clean with and without dev dependencies.
- **The demo backend hashes passwords** (PBKDF2-SHA256, 150k iterations, random salt) even
  though it is a localStorage store, because people reuse real passwords when trying a
  demo. The seeded accounts keep the published demo password as a plain value and
  `verifyPassword` accepts both forms. Supabase Auth hashes with bcrypt; the app never
  stores a password.
- **Left alone on purpose:** the Supabase advisors' "SECURITY DEFINER function is callable"
  warnings (that is the design — each one checks the caller, and `search_machines` is the
  public search) and the INFO-level index suggestions (audit columns nothing filters on).
- **Owner actions, dashboard only:** leaked-password protection, admin MFA, and leaving
  `VITE_SHOW_DEMO_LOGINS` unset in production.

## Phase 8 (launch features)

- **Stripe through Edge Functions, cards in Stripe's own fields.** The Add Card screen
  mounts Stripe's card number, expiry and CVC fields (iframes) styled like the app's inputs,
  so the card never passes through SiteRun's code or database. The `payments` function
  creates SetupIntents and PaymentIntents; the database records only brand, last four,
  expiry and Stripe's id. A webhook confirms payments too, idempotently, in case the browser
  closes mid-payment.
- **Mock until switched.** With no Stripe key the app keeps the mock card form (demo and
  today's Supabase project). The database refuses the mock paths only after
  `private.put_config('payments_provider', 'stripe')`, so switching is one deliberate step.
- **Plans and SiteCredits are invoiced when Stripe is on**, and paid by card from the
  account balance like hire invoices, rather than charged separately. One payment path is
  easier to secure and reconcile. SiteCredits pack prices already include GST, so their
  invoices split GST out instead of adding it.
- **Card fields use the system font.** Loading Inter into Stripe's fields means Stripe.js
  fetching a Google Fonts stylesheet from our page, which the CSP blocks and the privacy
  policy doesn't cover. The difference is barely visible.
- **Push goes to Apple directly for iPhones.** Capacitor's push plugin returns an APNs token
  on iOS, not a Firebase one, so the `push` function signs its own Apple provider token
  (ES256) and calls APNs, and uses Firebase HTTP v1 for Android. No native iOS changes or
  Firebase iOS SDK needed.
- **The database triggers pushes.** A trigger on `notifications` calls the function
  through `pg_net` with a secret generated in the database and kept in Vault, so every
  notification the app already creates reaches phones with no extra code, and nobody else
  can trigger a push.
- **GPS is foreground only.** The driver taps Share Live Location on the booking; the phone
  sends a position every 6–20 s while SiteRun is open (screen kept awake where supported).
  Background location needs a third-party plugin and "always" permission, which the stores
  scrutinise; left out. The first real fix switches the delivery from the simulated route
  to GPS, and the simulator leaves it alone after that. ETA uses the straight-line distance
  × 1.3 at the phone's speed (or 45 km/h).
- **Error monitoring in our own database, not a third-party service.** Reports go to
  `client_errors` (deduplicated per day, capped, 90-day retention) and platform admins read
  them at `/admin/errors`. No extra vendor, no extra privacy disclosure, works in the demo
  too. A Sentry-style service can still be added later.
- **A crash screen** replaces a blank page: an error boundary around the routes shows
  "Something went wrong" with Reload and reports the error. It resets when the route changes.
- **Legal pages rewritten** for what the app actually does (Stripe, live location,
  overseas providers, retention, OAIC complaints). Company name, ABN and contact details
  live in `src/lib/company.ts` and are left off the pages while empty. They still need a
  lawyer's review.
- **`?next=` paths are validated** (`safeNextPath`): the old check accepted `//host`.
  `pushState` would have refused to leave the site, so it wasn't exploitable, but it's now
  closed properly for sign-in, saving a card and tapped push notifications.

## Phase 9 (running the business)

- **Suppliers are paid through Stripe Connect Express.** They set up their own Stripe
  account; SiteRun never sees bank details, only whether Stripe will pay that account yet.
  A payout is a transfer from SiteRun's balance, recorded against the transfer id so a
  retry can't pay twice. Payouts stay recorded-only until `payments_provider` is `stripe`.
- **Refunds and hire fixes belong to platform admins, not suppliers.** A dispute usually
  needs someone neutral to cancel a hire, change its dates or price, or hand money back.
  Every action needs a written reason, messages both organisations, writes to the booking's
  history and lands in the admin activity feed.
- **Refunds are recorded on the payment**, not as a negative one: `payments.refunded_cents`
  plus a `refund` row for the history. With Stripe on, the Edge Function refunds the charge
  first and records it against the Stripe refund id.
- **Notification emails reuse the notification table.** Anything already worth a bell in the
  app is worth an email, so a second trigger on `notifications` posts to an `email` Edge
  Function (Resend). Chat messages are the exception: they'd be a firehose, and push already
  covers them. Turning email off is a real setting on the profile that the server checks,
  not a browser preference.
- **Analytics is four counters in our own database** (search, machine view, booking started,
  booking) rather than a third-party service: no extra vendor in the privacy policy, no
  cookie banner, and it works the same in the demo. Kept 180 days.
- **Background GPS uses `@capacitor-community/background-geolocation`.** Capacitor's own
  Geolocation stops when the app is backgrounded, which is useless for a driver whose phone
  locks in the cab. Android shows a permanent notification while sharing, which is what
  makes it allowed, and both stores need a written reason at review (`LAUNCH.md`).
- **The `tar` override from the security pass had to go.** Pinning `tar` to v7 patched a
  dev-only advisory but broke `npx cap sync`: the Capacitor 6 CLI imports tar's v6 default
  export, so `cap sync` died with "Cannot read properties of undefined". The lock now
  resolves the CLI's own `tar@6`, and the advisory is back to being a known, dev-only one
  until Capacitor is upgraded to v8.

## Phase 10 (store submission)

- **Capacitor 6 → 8.** Google Play now requires new apps to target Android 16 (API 36);
  Capacitor 6 tops out at 34. `npx cap migrate` moved the native projects: minSdk 24,
  compile/target SDK 36, AGP 8.13, iOS deployment target 15, and the UIScene split
  (`SceneDelegate.swift`) that Capacitor 8.5 adopts. The Gradle wrapper step failed for
  want of a JDK, so `gradle-wrapper.properties` was set to 8.13 by hand. None of it has
  been compiled here — no Android SDK, no Mac — so the first real build is the first test.
- **Store screenshots come from the app, not a mockup tool.** `e2e-store/` drives the demo
  backend at three exact pixel sizes (Play 1080×1920, iPhone 6.7" and 6.9") so the pictures
  can never drift from what the app looks like. Re-run with `npm run store:shots`.
- **A 360px layout bug turned up in the first screenshots**: on the narrowest common
  Android phone, the hire card squeezed the machine name to "6t D…" and ran the arrival
  time over the status pill. The card now wraps the arrival and chevron onto their own line
  below 390px. The boards were drawn at 390, so nothing had caught it.
- **`/account-deletion` is a public page** because Play requires a deletion route that
  works without installing the app. It repeats what the in-app request does and what the
  law makes us keep.
- **Listing text, Data safety and App Privacy answers live in `STORE.md`**, written from
  what the app actually collects rather than filled in at submission time. The background
  location justification is there too: it is the most common reason an app like this is
  rejected.
