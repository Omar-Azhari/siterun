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

| Token | Brief estimate | Sampled / used | Where sampled |
|---|---|---|---|
| `app` (screen bg) | `#050A14` | `#011020` | Dominant colour in boards 01, 04, 05, 07 |
| `card` | `#0D1626` | `#04182B` | Card interiors, boards 04/05 |
| `card-2` | – | `#051C2E` | Cards have a faint vertical gradient to this |
| `input` | `#0F1A2C` | `#0A2439` | Input interiors, board 01 screen 6 |
| `selected` | – | `#002349` | Selected card tint, boards 02/09 |
| `line` (card border) | `#1C2A40` | `#1A2D3E` | Card edge profile, board 05 |
| `line-input` | – | `#2A3F50` | Input edges are lighter than card edges |
| `muted` | `#9AA6B8` | `#AEB9C9` | Subtitle and meta text (brightest glyph pixels) |
| `subtle` | `#6B7890` | `#7F8A9B` | Inactive bottom-nav labels |
| primary / status colours | as briefed | unchanged | Buttons sample at `#0060FC`–`#006CFF`, so the brand blue `#006CFF` is kept |

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
- **Supplier lifecycle actions were added** (not on the boards): *Mark Dispatched → Mark Delivered/Picked Up → Mark Collected & Invoice*, available from Plan Dispatch and Booking Detail. Completing a hire raises the tax invoice. Without these, hires could never move between the designed states.

### Content and data
- **Photos** come from Unsplash (Unsplash License) via the website search, because the API needs a key. Sources and photographers are in `CREDITS.md`. Pexels wasn't needed.
- **Demo emails use `.test` domains** (e.g. `alex@acme.test` instead of `alex@acme.com`), so no real address can ever receive mail.
- **Dates are relative to today.** The seed reproduces the mockups' shape (5 active hires, 4 requests, INV-1041…1045, $12,480 available payout) rather than their literal May–June 2025 dates.
- **Invoice rows show totals including GST.** The mockup amounts ($3,200, $1,680…) are used as the ex-GST hire value. Invoices add 10%, so rows read $3,520.00 etc. **Account Balance** = unpaid invoices including GST ($4,620.00 in the seed, not $12,480).
- **Admin dashboard numbers are live counts** from the database (e.g. Users 7), not the mockup's platform-scale figures (1,248). Trends compare the selected period with the previous one.
- **Site names:** board 04 uses "Riverside Estate" while board 02 uses "Riverside Apartments". The seed uses Riverside Apartments everywhere. Board 04's other sites (Warehouse Project A, Airport Upgrade, Retail Fitout, Civic Centre) exist as additional Acme sites.
- **Board 05 calendar** shows the *supplier* name under each booking (the mockup shows customer names, which doesn't make sense for a contractor).
- **Booking references** use `SR-YYYY-NNNN` everywhere, including the supplier booking detail (mockup: `#BK-7842`). Support tickets keep the mockup's `#SR-4582` style.
- **Compliance Status (board 08 #6)** shows the requirements configured for the machine's category. The mockup lists crane and operator documents on an excavator; ours shows general-plant documents (and crane documents only for cranes). Operator documents live on the operator's profile.
- **Board 10 booking detail** shows the real status ("New Request" with Decline/Accept). The mockup shows "Confirmed" with Decline/Accept at the same time.
- **Browse Equipment** shows all 8 categories (the six on the board plus Loaders and Other Plant, which appear on board 07).
- **"Booking Confirmed!" vs "Booking Requested!"** New bookings wait for supplier acceptance, so the confirmation screen says *Requested* until the supplier accepts, then *Confirmed*.

### UI details
- **Type scale is about 15% larger than the brief** (titles 26px, body and inputs 16px). The mockups' text is larger relative to screen width than the brief's sizes, and 16px inputs prevent iOS zoom-on-focus.
- **Map tiles:** CARTO basemaps now return "API key required", so the dark tracking map uses **Esri Dark Gray Canvas** and the street toggle uses **Esri World Street Map**. Address search and reverse geocoding use **Photon** (OSM, no key) with an offline suburb list as fallback.
- **Rates step tabs** (Hourly/Daily/Weekly) choose the *main pricing unit* (that rate becomes required). All three rate fields stay visible as in the mockup. A daily rate is always required because search and booking price per day.
- **Hire type on the listing wizard** is multi-select (a machine can be offered dry *and* wet), with a wet-hire daily rate field when Wet is ticked.
- **Operator documents** are uploaded per person (HRWL, VOC, tickets, inductions). Operators manage their own from `/operator/documents`.
- **Login** has a collapsed "Demo accounts" panel in demo mode only.
- **Live listings must be paused before editing**, so changes can't bypass review.
