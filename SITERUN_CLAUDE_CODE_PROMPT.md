# SiteRun — Build Prompt for Claude Code

> Paste everything below this line into Claude Code, running from your new project folder.

---

## 0. Your role and the goal

You are building **SiteRun**, an Australian construction equipment hire marketplace that connects **contractors** (who hire machines), **suppliers** (who list machines) and **SiteRun platform admins** (who approve listings and oversee the platform).

The build happens in two stages:

1. **Stage 1 — Website / web app.** A production-quality, fully functional, interactive web app that is a near pixel-perfect copy of the design boards in `./design`.
2. **Stage 2 — Native apps.** Wrap the same codebase as Android and iOS apps with Capacitor. Do **not** start Stage 2 until I confirm Stage 1 is done.

Work in the phases in section 9. **Stop at every checkpoint**, show me what you built, and wait for my "go" before moving on. Do not build on top of anything you haven't verified works.

---

## 1. Design reference files

The design folder lives at `~/Desktop/siterun` (on Windows: `%USERPROFILE%\Desktop\siterun`). First step:

1. Create `./design` in this project and copy every image from that folder into it.
2. List the files and open each one. The filenames are random, so identify each board by the big number in its title and rename them:

| File to create | Board title | What it covers |
|---|---|---|
| `design/00-brand.jpeg` | (no number) Brand sheet | Logos, app icon, tagline, values, colour palette |
| `design/01-entry-account.jpeg` | 01. Entry & Account Setup | Splash, role, sign up, log in, OTP, business profile |
| `design/02-site-team-plans.jpeg` | 02. Site Setup, Team & Plans | Create site, site details, access window, invite team, plans, sites dashboard |
| `design/03-browse-book.jpeg` | 03. Browse, Search & Book Equipment | Categories, filters, results, machine detail, book, confirmation |
| `design/04-active-hire.jpeg` | 04. Active Hire, Delivery & Smart Swap | Active hires, hire detail, live tracking, extend, off-hire, smart swap |
| `design/05-customer-ops.jpeg` | 05. Customer Operations & Admin | Bookings calendar, messages, payments, invoices, notifications, account |
| `design/07-add-machine.jpeg` | 07. Add Machine & Listing Setup | 6-step machine listing wizard |
| `design/08-compliance.jpeg` | 08. Required Documents & Compliance | Compliance checklist, upload, doc requirements, status |
| `design/09-review-go-live.jpeg` | 09. Review, Go Live & Supplier Operations | Preview, submit, live, booking requests, dispatch calendar, payouts |
| `design/10-supplier-admin.jpeg` | 10. Supplier Performance, Alerts & Platform Admin | Performance, booking detail, compliance alerts, support, admin approvals, admin dashboard |

There is **no board 06**. That's expected, don't invent one.

These images are the **source of truth for visual design**. Zoom into them (crop regions) whenever you need detail. When in doubt, match the image.

---

## 2. Tech stack (all free tiers)

- **Frontend:** Vite + React 18 + TypeScript (strict) + React Router v6
- **Styling:** Tailwind CSS with a custom theme from the tokens in section 3. No other UI kit.
- **Icons:** `lucide-react` (outline style matches the mockups). Only draw custom SVGs where Lucide has no match.
- **Animation:** `framer-motion`, subtle only (screen transitions, success checkmarks, bottom-sheet slides).
- **Forms:** `react-hook-form` + `zod`
- **Data fetching:** `@tanstack/react-query`
- **Backend:** Supabase (Postgres, Auth with email OTP, Storage, Realtime, Row Level Security, Edge Functions where needed)
- **Maps:** Leaflet + `react-leaflet` with free tiles (Esri World Imagery for the satellite look in board 02/07, a dark CartoDB tile for board 04 tracking). No Google Maps API key.
- **Charts:** `recharts` (board 10 hire trend)
- **Dates:** `date-fns`
- **PDF invoices:** `@react-pdf/renderer`
- **Testing:** Vitest for logic, Playwright for end-to-end and screenshot comparisons
- **Hosting:** Vercel (free)
- **Mobile (Stage 2):** Capacitor 6 (`@capacitor/core`, `android`, `ios`) + `@capacitor/assets` for icons/splash

Why this stack: a Vite SPA deploys easily to Vercel and wraps cleanly into Capacitor without rewriting anything.

---

## 3. Design system

### 3.1 Brand (from `design/00-brand.jpeg`)

- **SiteRun Navy** `#0B1F44`
- **Construction Blue** `#006CFF` (primary buttons, active tabs, links, selected states)
- **Charcoal** `#2E3A46`
- **Tagline:** "Machines. People. Progress."
- **Headline:** "Keep projects moving." (with "moving." in Construction Blue)
- **Brand values:** Built for Real Work / Keep Things Moving / People at the Core / A More Productive Tomorrow

### 3.2 App UI colours (dark theme, sampled from the phone screens)

These are starting estimates. **Sample the real pixel colours from the mockups with an image tool and correct these values before writing components.**

```
--bg-app:        #050A14   /* screen background */
--bg-card:       #0D1626   /* cards, list rows */
--bg-input:      #0F1A2C   /* input fields */
--border:        #1C2A40   /* card and input borders */
--border-active: #006CFF   /* selected card outline */
--primary:       #006CFF
--primary-hover: #0A5CE0
--text:          #FFFFFF
--text-muted:    #9AA6B8
--text-subtle:   #6B7890
--success:       #22C55E   /* Available, Paid, Verified, On Site, Confirmed pill dot */
--warning:       #F5A524   /* Pending Review, In Progress, On Hold */
--danger:        #EF4444   /* Decline, Rejected, Expires soon, Log Out */
--info:          #3B82F6   /* In Transit, Planning, Upcoming */
```

The **presentation boards themselves** use a very light grey-blue background (`~#F4F7FB`) with navy headings. That style is used for the marketing landing page (section 6).

### 3.3 Typography

- UI and headings: **Inter** (check against the mockups; if headings look closer to **Plus Jakarta Sans**, use that for headings and Inter for body, and tell me which you picked).
- Screen title: ~22px semibold white. Subtitle: ~14px muted, 2 lines.
- Card title: ~15px semibold. Meta text: ~12–13px muted.
- Prices: bold, larger (`$320 / day` with "/ day" smaller and muted).

### 3.4 Recurring components (build these once, reuse everywhere)

- **AppHeader:** back arrow (or hamburger on root screens) left, SiteRun logo centred, bell icon right (with red dot when unread).
- **ScreenTitle:** title + muted subtitle.
- **PrimaryButton:** full-width, ~52px tall, 12px radius, blue, label centred with right arrow icon at the right edge.
- **SecondaryButton:** same shape, transparent, blue or white 1px border.
- **DangerOutlineButton:** red outline, red text (Decline, Log Out).
- **Card / ListRow:** dark card, 1px border, 12–14px radius, icon or thumbnail left, text middle, chevron right.
- **SelectableCard:** radio or checkmark on the right, blue border + tinted background when selected.
- **StatusPill:** small rounded pill with coloured dot (Available, On Site, In Transit, Confirmed, Hired, Paid, Verified, Pending, Pending Review, Rejected, Active, Planning, On Hold, Open, In Progress, Resolved, Ending Soon, Due in X days).
- **SegmentedTabs:** pill tab bar (e.g. All (5) / On Site (3) / In Transit (1), Monthly / Annual, Hourly / Daily / Weekly).
- **Input, Select, DateField, TimeField, PhoneField** (flag + `+61` country select), **Textarea with counter** (e.g. `62/250`), **Toggle switch**, **OTP input** (6 boxes).
- **StepIndicator:** "Step X of 6" in blue under the title (board 07).
- **StatTile:** icon, label, big number, green/red trend arrow with % (boards 09, 10).
- **Timeline:** vertical steps with filled/empty dots (board 04 delivery tracking).
- **WeekStrip calendar** and **MonthGrid calendar** (boards 05, 09).
- **BottomNav:** icon + label, active item blue.
- **SuccessState:** large green check circle with small blue/yellow/red confetti dashes (boards 03, 09).
- **EmptyState, LoadingSkeleton, ErrorState, Toast** (not in mockups, but style them to match).

Build a `/dev/components` page that shows every component in every state. This is checkpoint 1.

---

## 4. Logos, favicon and app icons

The mockups use **two different logo marks** (a house/garage icon on most boards and the "S" chevron mark on board 08 and the brand sheet). Decision: **use the "S" chevron mark from `design/00-brand.jpeg` everywhere.** It's the official brand sheet.

1. Recreate the S chevron mark as a **clean vector SVG** by tracing the brand sheet (two parallel angled strokes, top one Construction Blue, bottom one Navy). Don't embed the JPEG. Show me the SVG next to the original before continuing.
2. Create:
   - `logo-mark.svg` (icon only)
   - `logo-horizontal.svg` (mark + "SiteRun" wordmark, navy text for light backgrounds)
   - `logo-horizontal-white.svg` (white wordmark for the dark app header)
   - `logo-lockup-tagline.svg` (with "Machines. People. Progress.")
   - `app-icon.svg` (white/blue mark on navy rounded square, matches "APP ICON" on the brand sheet)
3. Generate favicons from `logo-mark.svg`: `favicon.ico` (16/32/48), `favicon.svg`, `apple-touch-icon.png` (180), `icon-192.png`, `icon-512.png`, `icon-maskable-512.png`, plus `site.webmanifest` with theme colour `#0B1F44`.
4. In Stage 2, use `app-icon.svg` as the source for `@capacitor/assets` to generate all Android and iOS icons and splash screens.

---

## 5. Decisions where the mockups conflict

The mockups are inconsistent in places. Apply these decisions and log anything else you find in `DECISIONS.md` (don't silently guess).

1. **Logo:** S chevron mark everywhere (see section 4).
2. **Tagline:** "Machines. People. Progress." everywhere (mockups also show "Sites. Equipment. People. Progress.", "Hire. Build. Get It Done.", "List. Hire. Get It Done.", "People. Equipment. Progress.").
3. **Fix mockup typos:** "Site Acess Window" → "Site Access Window"; "Addide detailed specifications" → "Add detailed specifications"; "Melbourns" → "Melbourne".
4. **Dates:** mockups say 2025. Seed data should use dates relative to today so bookings look current.
5. **Bottom navigation** differs between boards. Use one nav per role:
   - **Contractor:** Home · Search · Hires · Messages · Account
   - **Supplier:** Home · Machines · Bookings · Payouts · Account (Compliance, Performance and Support are reachable from Home and Account)
   - **Platform admin:** Dashboard · Approvals · Suppliers · Bookings · More
6. **"Admin" on the Choose Role screen** means **organisation admin**, not SiteRun platform admin. Platform admin must **never** be self-selectable at sign-up. It's a flag set directly in the database only.
7. **Operator role** has no designed screens. Build a minimal operator area in the same style: assigned bookings list, booking detail, and their own compliance docs (HRWL, VOC, tickets, inductions from board 08 screen 5). Mark it clearly in `DECISIONS.md`.
8. **Payments are mocked** (see section 8). Show the card and bank transfer UI exactly as designed, but never collect or store real card numbers.
9. **Home screens** for contractor and supplier aren't designed. Contractor Home = Browse Equipment (board 03 screen 1) with a small "Active hires" summary strip above it. Supplier Home = Performance (board 10 screen 1) with shortcuts to Booking Requests, Add Machine and Compliance Alerts.

---

## 6. Website structure

The app is **mobile-first**. Every mockup screen must look 1:1 at a **390×844** viewport.

- **Mobile (< 768px):** exact mockup layout, bottom nav, full-width screens.
- **Tablet/desktop (≥ 768px):** same components, but with a left sidebar replacing the bottom nav, content max-width ~1200px, and list+detail views side by side where it makes sense (e.g. Messages, Bookings, Admin Approvals). Keep the dark theme, card styles, spacing ratios and typography identical.
- **Public marketing landing page at `/`** (logged-out users), using the light board style and brand sheet content: hero with "Keep projects moving." and the tagline, the "Built for the people who build." splash message, the four brand values with their icons, a "How it works" section for contractors and suppliers (reuse real phone screen components inside CSS phone frames, like the boards), a pricing section using the Starter/Pro/Enterprise plans from board 02, and CTAs to Get Started / Log In. Must be responsive and look professional.

Also build a dev-only **`/dev/screens`** index that links to every screen with seed data loaded, so each can be compared against its mockup.

---

## 7. Screen inventory (all 60 screens)

Match each screen's layout, copy, spacing, icon choices and states to the mockup. Arrows between phones on the boards show the flow order.

### Board 01 — Entry & Account Setup
1. **Splash / Welcome** `/welcome` — full-bleed excavator + building frame photo with dark gradient, centred logo, "Built for the people who build.", subtitle, Get Started button, "Already have an account? Log in".
2. **Choose Role** `/signup/role` — 4 selectable cards (Contractor, Supplier, Operator, Admin) with icons and descriptions, Continue.
3. **Sign Up** `/signup` — full name, email, phone (+61), password with show/hide, live checklist (8+ chars, number, letter), Create Account, Terms/Privacy links.
4. **Log In** `/login` — email, password, "Keep me signed in", Forgot password?, Log In, "or" divider, Continue with Google, Continue with Apple, Sign up link.
5. **OTP Verification** `/verify` — 6 digit boxes (auto-advance, paste support), resend countdown, Verify & Continue, "Your information is secure and encrypted".
6. **Business Profile** `/onboarding/business` — company name, ABN (validate 11 digits + ABN checksum, green tick when valid), contact name, business email, phone, business address (autocomplete), Complete Setup.

Also needed (style to match): Forgot password, Reset password.

### Board 02 — Site Setup, Team & Plans (contractor)
1. **Create Your First Site** `/sites/new/location` — address search, satellite map, draggable pin with address label, Confirm Location.
2. **Site Details** `/sites/new/details` — site name, address (prefilled), project type select, start date, expected duration select, Continue.
3. **Site Access Window** `/sites/new/access` — delivery hours from/to, access notes textarea (250 max with counter), site contact name + phone, Continue.
4. **Invite Team Members** `/team/invite` — email input with + button, role cards (Owner, Project Manager, Site Manager, Viewer), Invited Members list with avatar initials and role, Send Invitations.
5. **Choose Plan & SiteCredits** `/plans` — Monthly/Annual toggle (Annual "Save 20%" badge), Starter $99 (3 sites), Pro $249 (10 sites, Most Popular), Enterprise custom, optional SiteCredits packs ($500 +50, $1,000 +120, $2,500 +350), Continue.
6. **Your Sites** `/sites` — Add New Site button, search + filter, site cards with photo, location, status pill (Active/Planning/On Hold), active hires count, team members count.

### Board 03 — Browse, Search & Book (contractor)
1. **Browse Equipment** `/browse` — 2-column category grid with images (Excavators, Telehandlers, Cranes, Generators, Access, Attachments).
2. **Search & Filters** `/search` — keyword, location, start/end date, capacity range, price range, Dry/Wet hire radio, Search Equipment.
3. **Search Results** `/search/results` — "24 machines near Melbourne, VIC", sort dropdown, Filters (3) button, result cards (photo, title, make/model, price/day, Available pill), pagination text.
4. **Machine Detail** `/machines/:id` — photo carousel with counter (1/8), title, Available pill, supplier row with rating and review count, 3 spec tiles, Dry/Wet hire price cards, Key Features checklist, Book Now.
5. **Book Equipment** `/machines/:id/book` — machine summary, start/end dates, quantity, delivery option cards (Customer Pickup / Site Delivery), insurance toggle, site select, Continue.
6. **Booking Confirmed** `/bookings/:id/confirmed` — success animation, booking ID with copy button, summary card (hire period, pickup, insurance, total ex GST), supplier row, View Booking, Manage Booking.

### Board 04 — Active Hire, Delivery & Smart Swap (contractor)
1. **Active Hires** `/hires` — tabs All / On Site / In Transit with counts, hire rows with status pills (On Site, In Transit, Ending Soon).
2. **Active Hire Detail** `/hires/:id` — photo with On Site pill, title, supplier, hire period, site, rate, Extend Hire, Schedule Return, Smart Swap.
3. **Live Delivery Tracking** `/hires/:id/tracking` — machine card with In Transit pill and ETA, dark map with route line and moving truck marker, ETA badge, timeline (Picked up → In transit → Arriving at site → Delivered). Simulate movement along the route for demo bookings; update via Supabase Realtime.
4. **Extend Hire** `/hires/:id/extend` — current hire period, option cards (+3 days, +7 days, +14 days with rates, Custom dates), estimated additional cost box, Confirm Extension.
5. **Off-hire / Schedule Return** `/hires/:id/return` — collection date, Morning/Afternoon time cards, site access notes, SMS confirmation info note, Schedule Return.
6. **Smart Swap** `/hires/:id/swap` — banner "Same class. No downtime.", options: Same-Class Swap (Free), Upgrade (+$/day), Downgrade (−$/day), availability note, Confirm Smart Swap.

### Board 05 — Customer Operations (contractor)
1. **Bookings Calendar** `/bookings` — month header with arrows, week strip, day's bookings with photos, times, supplier, status pill, New Booking.
2. **Messages** `/messages` and `/messages/:conversationId` — conversation header with Online now, chat bubbles (incoming dark, outgoing blue with read ticks), timestamps, attachment button, input with send. Realtime.
3. **Payments** `/payments` — account balance with info icon, Make a Payment, saved cards (brand logo, last 4, expiry), Add Card, "or" divider, bank transfer details with copy button.
4. **Invoices & Statements** `/invoices` — Invoices/Statements tabs, invoice rows (number, date, amount, Paid / Due in X days), Download Statement (generates PDF).
5. **Notifications** `/notifications` — tabs All / Bookings / Docs with counts, typed notification rows with icons and relative time, Mark All as Read.
6. **Account & Settings** `/account` — profile card, Company Details, Team & Permissions, Payment Settings, Help & Support, Privacy & Security, Terms of Service, Log Out. Each row opens a working sub-page.

### Board 07 — Add Machine & Listing Setup (supplier, 6-step wizard, save draft on every step)
1. **Add Machine — Category** `/supplier/machines/new/category` — search, category list (Excavators, Telehandlers, Cranes, Loaders, Generators, Access Equipment, Other Plant).
2. **Machine Details** `.../details` — main photo with Change, make, model, year, serial number, registration number with helper text.
3. **Photos** `.../photos` — main photo + grid, delete buttons, Add photo tile (drag to reorder, max 10, compress before upload).
4. **Asset Specifications** `.../specs` — operating weight, bucket capacity, max reach, max dig depth, attachment chips with remove + Add attachment, fuel type. Fields adapt by category.
5. **Rates & Availability** `.../rates` — Hourly/Daily/Weekly tabs with all three rates, Dry/Wet hire cards, minimum booking period, available from date.
6. **Service Area & Delivery** `.../service-area` — map with radius circle and label, Set service area (radius slider), toggles for Offer delivery, Same-day delivery, Third-party transport, Create Listing.

### Board 08 — Required Documents & Compliance (supplier)
1. **Compliance Checklist** `/supplier/compliance` — machine type list with images, location row with Change.
2. **Upload Document** `/supplier/compliance/upload` — dashed upload zone (PDF/JPG/PNG, max 10MB, validate type and size), selected file row with remove, document type select, expiry date, notes, Upload Document.
3. **General Plant Requirements** — Insurance Certificate, Service Record, Plant Registration, Risk Assessment (SWMS), info note "Exact requirements may vary by state and machine type".
4. **Crane Requirements** — CraneSafe Certificate, 10-Year Major Inspection Report, Annual Inspection / Service Certificate, Load Chart.
5. **Operator Compliance Documents** — HRWL, VOC, Operator Tickets, Site Induction Records.
6. **Compliance Status** `/supplier/machines/:id/compliance` — machine card, each doc with expiry and Verified / Pending / Rejected, info note "All documents must be verified before this machine can go live", Review & Submit (disabled until all required docs are uploaded).

Store required-document rules per category in a config table, not hard-coded in components.

### Board 09 — Review, Go Live & Supplier Operations
1. **Preview Listing** `/supplier/machines/:id/preview` — photo with Edit, title, Ready to list pill, spec rows, Continue.
2. **Review & Submit** `.../review` — section rows with Edit links back to each wizard step, Submit for Approval, "We'll review your listing within 1 business day".
3. **Listing Live** `.../live` — success animation, live listing card, View Listing, Manage Availability. Only reachable after admin approval; send a notification when approved.
4. **Booking Requests** `/supplier/requests` — tabs New / Accepted / Past with counts, request cards (customer, project, dates, days, rate), Decline / Accept.
5. **Bookings & Dispatch** `/supplier/dispatch` — month nav, week strip, booking cards with Hired/Confirmed pills, View All Bookings, Plan Dispatch.
6. **Payouts** `/supplier/payouts` — available balance, Request Payout, Total Revenue and Completed Hires tiles with trends, recent payouts with Paid pills, View all.

### Board 10 — Supplier Performance & Platform Admin
1. **Performance** `/supplier/performance` — 30D/90D/1Y tabs, Hires, Utilisation, Revenue tiles with trends, Hire Trend bar chart, Top Performing Machines with progress bars.
2. **Booking Detail** `/supplier/bookings/:id` — Confirmed pill + booking ref, photo, customer with call button, hire period, delivery address, customer message, Decline / Accept.
3. **Compliance Alerts** `/supplier/compliance/alerts` — tabs Expiring Soon / All Documents, rows with warning (red < 21 days, amber < 30 days) or green valid, Renew Documents.
4. **Support** `/support` — help search, Report an Issue, Live Chat, Call Support (1300 number, hours in AEST), Help Articles, Submit a Request, Recent Requests with Open / In Progress / Resolved.
5. **Admin Approvals** `/admin/approvals` — tabs Machines / Documents with counts, pending listing cards, Review opens a detail page with Approve / Reject (reject requires a reason sent to the supplier).
6. **Admin Dashboard** `/admin` — 7D/30D/90D/1Y tabs, Users, Suppliers, Bookings, Payouts, Disputes tiles with trends, Recent Activity feed.

---

## 8. Functionality and backend

### 8.1 Auth and roles
- Supabase Auth: email + password, email OTP verification, Google and Apple OAuth (set up the buttons and config; I'll add provider keys myself).
- `profiles.account_type`: `contractor | supplier | operator | org_admin`. `profiles.is_platform_admin boolean default false`, only changeable by service role.
- Organisation membership roles: `owner | project_manager | site_manager | viewer` with permissions enforced in RLS (e.g. Viewer can't create bookings).
- Route guards per role. Onboarding redirects until business profile is complete.

### 8.2 Database (Supabase migrations in `supabase/migrations`)
Create tables with sensible columns, foreign keys, indexes, `created_at/updated_at`, and **RLS on every table**:

`profiles, organisations, org_members, invitations, sites, subscriptions, credit_transactions, machine_categories, machines, machine_photos, compliance_requirements, compliance_documents, bookings, booking_events, deliveries, delivery_locations, conversations, conversation_participants, messages, invoices, payments, payment_methods (brand, last4, expiry only), payouts, notifications, support_tickets, reviews, admin_actions`

Key enums: machine status `draft | pending_review | live | rejected | paused`; booking status `requested | confirmed | declined | in_transit | on_site | return_scheduled | completed | cancelled`; document status `pending | verified | rejected`; site status `active | planning | on_hold`.

### 8.3 Business rules
- All prices stored in cents, shown **ex GST**; invoices add 10% GST.
- Booking total = hire days × daily rate (e.g. 5 days × $320 = $1,600). Extension cost = extra days × tier rate (e.g. 3 × $320 = $960).
- Booking reference format `SR-YYYY-NNNN`.
- A machine can only be `live` when every required document for its category is `verified` and an admin approved it.
- Documents auto-flag as expiring (notification at 30, 14 and 7 days) via a scheduled Supabase Edge Function.
- Search only returns `live` machines, not already booked for the selected dates, within the supplier's service radius of the chosen location.
- Prevent double-booking with a Postgres exclusion constraint on machine + date range.
- Supplier Accept/Decline updates booking status, notifies the contractor, and posts a system message in the conversation.

### 8.4 Payments (mocked for now)
- Build a `PaymentsProvider` interface with a `MockPaymentsProvider` implementation so Stripe can be plugged in later.
- "Add Card" uses a mock form that saves only brand, last 4 and expiry. **Never store full card numbers or CVV**, not even in dev.
- Plans, SiteCredits purchases, Make a Payment and Request Payout all work end-to-end against the mock and create real rows in `payments` / `payouts` / `credit_transactions`.

### 8.5 Realtime, storage, notifications
- Supabase Realtime for messages, notifications and delivery location.
- Storage buckets: `machine-photos` (public read), `compliance-docs` (private, signed URLs, owner + platform admin only), `avatars`.
- In-app notifications table drives the bell badge and Notifications screen.

### 8.6 Seed data
Seed with the exact names and values in the mockups so screens match: Riverside Apartments (Campbellfield), Harbour View Estate (Geelong), Sunrise Industrial (Dandenong), Alex Turner, John Smith, Jamie Carter, BuildCo Pty Ltd, Acme Construction Pty Ltd, Turner Plant Hire (4.8, 124 reviews), Aussie Plant Hire, Metro Builders, Apex Civil, Southern Earthworks, Komatsu PC55MR, CAT 320 / 320D, JCB 8035, Thwaites 6T, Genie GS-3246, Atlas Copco 40kVA, invoices INV-1041 to INV-1045, etc. Create one demo login per role and list them in `README.md`.

**Photos:** don't use crops from the mockups (too low-res). Download free-licence construction equipment photos (Unsplash/Pexels) that match each mockup image as closely as possible, store them in `public/images`, and list sources in `CREDITS.md`.

### 8.7 Quality bar
- TypeScript strict, no `any`. ESLint + Prettier.
- Every screen has loading, empty and error states.
- Accessibility: labels on all inputs, focus states, keyboard navigation, 4.5:1 contrast for text, tap targets ≥ 44px.
- Secrets only in `.env` (add `.env.example`, never commit real keys).
- Lighthouse on the landing page: Performance ≥ 90, Accessibility ≥ 95.

---

## 9. Build phases and checkpoints

At each checkpoint: run the app, run the tests, summarise what works and what doesn't, commit to git, and **wait for my approval**.

**Phase 0 — Setup**
Copy and rename design files, scaffold the project, install deps, configure Tailwind tokens, fonts, ESLint, Vitest, Playwright. Recreate the logo SVGs and favicons.
✅ *Checkpoint 0:* show the logo SVGs beside the brand sheet, and the sampled colour values.

**Phase 1 — Design system**
Build all components from section 3.4 and the `/dev/components` page.
✅ *Checkpoint 1:* Playwright screenshots of the component page at 390px.

**Phase 2 — Static screens (no backend yet)**
Build all 60 screens with local seed data and working navigation between them, plus `/dev/screens`.
✅ *Checkpoint 2 (one board at a time):* for each board, take Playwright screenshots of its 6 screens at 390×844, place them side by side with the board image, and list any visual differences you can see. Fix differences before moving to the next board.

**Phase 3 — Backend**
Supabase schema, RLS, storage, seed script, auth flow.
✅ *Checkpoint 3:* write RLS tests proving a contractor can't read another org's bookings, a supplier can't approve their own machine, and a non-admin can't reach `/admin`.

**Phase 4 — Wire up flows**
Replace local data with Supabase, flow by flow in board order (01 → 10).
✅ *Checkpoint 4:* Playwright end-to-end tests pass for: sign up → verify → business profile → create site; search → book → supplier accepts → contractor sees confirmation; supplier adds machine → uploads docs → admin approves → machine appears in search; extend hire; send and receive a message.

**Phase 5 — Desktop layout, landing page, deploy**
Responsive sidebar layout, marketing landing page, SEO meta tags, Open Graph image, deploy to Vercel.
✅ *Checkpoint 5:* live URL, Lighthouse scores, screenshots at 390px, 768px and 1440px.

**— Stop here. Stage 1 complete. Wait for me to confirm before Stage 2. —**

**Phase 6 — Android and iOS (Stage 2)**
- Add PWA support first (manifest, service worker, offline fallback screen).
- Add Capacitor, set `appId: au.com.siterun.app`, `appName: SiteRun`.
- Generate icons and splash screens from `app-icon.svg` (splash: navy background, centred mark).
- Plugins: Status Bar (dark content on navy), Splash Screen, Keyboard, Haptics, Camera (for machine photos and document scans), Filesystem, Geolocation (tracking and site pin), Push Notifications, App (Android back button handling).
- Respect safe areas (notch, home indicator) with `env(safe-area-inset-*)`.
- Deep links for OAuth redirects and email OTP links.
- Hide the marketing landing page inside the native app; open at Splash / Welcome.
- Write `MOBILE_BUILD.md` with exact steps to run on an Android emulator, an iOS simulator, and a real device, plus store submission checklists.
✅ *Checkpoint 6:* app runs on Android emulator and iOS simulator, screenshots of 6 key screens on each.

---

## 10. Rules for you while building

- Match the mockups first. Don't "improve" the design unless I ask.
- Don't add features that aren't in the mockups or this prompt, except the necessary states and pages listed above.
- If something is unclear or the mockups contradict each other, add it to `DECISIONS.md` with your choice and move on; tell me at the next checkpoint.
- Verify before building on top: after each feature, run it and test it. Never tell me something works if you haven't run it.
- Small, focused commits with clear messages.
- Keep `README.md` updated with setup steps, env vars, demo logins and scripts.
