# Putting SiteRun on the App Store and Google Play

Everything that can be prepared from this machine is done: the apps target the SDK levels
both stores require, the screenshots and artwork are generated, and the listing text and
privacy answers are written out below, ready to paste.

What only you can do: create the two developer accounts, sign the builds on a machine with
Android Studio (and a Mac for iOS), and press Submit.

---

## Before you start

| Thing                         | Cost / note                                                           |
| ----------------------------- | --------------------------------------------------------------------- |
| Google Play Developer account | US$25 once. Identity checks take a few days                           |
| Apple Developer Program       | US$99 a year. A company account needs a D‑U‑N‑S number                |
| A Mac with Xcode 16+          | iOS builds cannot be made on Windows. A rented Mac in the cloud works |
| JDK 21 and Android Studio     | Capacitor 8 needs JDK 21, not 17                                      |
| The site deployed             | Both stores need working Privacy Policy and Support URLs (below)      |

The listing needs three live URLs. They come from the Vercel deployment (`LAUNCH.md`):

- Privacy policy: `https://<your-domain>/privacy`
- Account deletion: `https://<your-domain>/account-deletion` (Play requires this)
- Support: `https://<your-domain>/support`

---

## App identity

|                  |                                                          |
| ---------------- | -------------------------------------------------------- |
| App name         | SiteRun                                                  |
| Bundle / package | `au.com.siterun.app` (both stores)                       |
| Version          | 1.0.0 (Android `versionCode 1`, iOS build 1)             |
| Category         | Business (Play) · Business (App Store)                   |
| Content rating   | Everyone / 4+. There is no user-generated public content |
| Countries        | Australia to start                                       |
| Languages        | English (Australia)                                      |

## Listing text

**Play — short description** (80 characters max, currently 73):

```
Hire excavators, dumpers and lifts. Track delivery. Manage hires on site.
```

**App Store — subtitle** (30 max, currently 27):

```
Plant hire, tracked to site
```

**App Store — promotional text** (170 max):

```
Book plant from local suppliers, watch the truck on its way, and keep every hire, document and invoice in one place.
```

**Full description** (both stores; Play allows 4000 characters):

```
SiteRun is the quickest way for Australian builders and contractors to hire construction equipment — and for plant hire businesses to keep their fleet working.

FOR CONTRACTORS
• Search excavators, dumpers, scissor lifts, telehandlers, cranes and more near your site
• See day rates, wet or dry hire, and what's actually available on your dates
• Book in a couple of taps, with delivery to site or pickup from the yard
• Follow the truck on a live map and get an arrival time that updates as it drives
• Extend a hire, book a return, or swap to a different machine without a phone call
• Every invoice, document and message for a hire in one place

FOR SUPPLIERS
• List your fleet with photos, specs, rates and service area
• Accept or decline booking requests, and dispatch with one tap
• Drivers share their location so customers stop ringing to ask where the truck is
• Keep insurance, registration and inspection documents current — SiteRun warns you before they expire and pauses a listing if one lapses
• Track earnings and get paid out to your bank account

FOR OPERATORS
• Today's jobs, site contacts and access notes on your phone
• Directions to site, and one tap to share your location while you drive
• Your licences and tickets stored where the office can see they're current

WHY SITERUN
• Built for Australian sites: ABNs, GST, state-based compliance
• Suppliers are verified before their machines go live
• Card payments handled by Stripe. SiteRun never stores your card number
• Works offline for the screens you've already opened

SiteRun is free to join. Contractors pay for the hires they book; suppliers pay a service fee on completed hires.
```

**App Store keywords** (100 characters, comma-separated, no spaces):

```
plant hire,excavator,equipment hire,construction,machinery,dry hire,earthmoving,builder,tradie
```

**What's new (first release)**:

```
The first release of SiteRun: search and book plant, track deliveries live, manage documents and invoices, and run your hire fleet from your phone.
```

---

## Artwork and screenshots

Generated from the real app; re-run any time with `npm run store:shots` and
`npm run store:assets`.

| File                                       | Where it goes                               |
| ------------------------------------------ | ------------------------------------------- |
| `docs/store/play/1080x1920/*.png` (7)      | Play → phone screenshots (2 minimum)        |
| `docs/store/app-store/1290x2796/*.png` (7) | App Store → iPhone 6.7"                     |
| `docs/store/app-store/1320x2868/*.png` (7) | App Store → iPhone 6.9"                     |
| `docs/store/play-feature-graphic.png`      | Play → feature graphic (required, 1024×500) |
| `docs/store/play-icon-512.png`             | Play → app icon                             |
| `docs/store/app-store-icon-1024.png`       | App Store Connect → app icon (no alpha)     |

The screens shown, in order: search results, a machine, live tracking, active hires,
supplier fleet, payouts, compliance documents.

---

## Privacy answers

### Google Play — Data safety

Everything below is collected, all of it is encrypted in transit, and all of it can be
deleted by asking (Account → Privacy & Security, or the account deletion page). None of it
is sold or shared for advertising, and none of it goes to a data broker.

| Data type                         | Collected | Shared | Why                                                                                          |
| --------------------------------- | --------- | ------ | -------------------------------------------------------------------------------------------- |
| Name, email address, phone number | Yes       | No     | Account, and contact between the two businesses on a booking                                 |
| Business details (ABN, address)   | Yes       | No     | Verifying suppliers, invoices                                                                |
| Approximate and precise location  | Yes       | Yes    | Finding equipment nearby; a driver's live location is shown to the customer on that delivery |
| Photos                            | Yes       | No     | Machine photos and compliance documents                                                      |
| Files and documents               | Yes       | No     | Insurance, registration, inspection records                                                  |
| Messages (in-app)                 | Yes       | No     | Talking about a booking                                                                      |
| Payment info                      | Yes       | Yes    | Card brand, last four and expiry only; the card itself goes to Stripe                        |
| App activity (searches, views)    | Yes       | No     | Showing the platform team what people look for                                               |
| Crash logs and diagnostics        | Yes       | No     | Fixing faults                                                                                |
| Device identifiers (push token)   | Yes       | No     | Sending notifications                                                                        |

**Data deletion URL**: `https://<your-domain>/account-deletion`

### Apple — App Privacy

Used to **link to the user's identity**, never for tracking, and never for advertising:

- Contact Info (name, email, phone), Identifiers (account and push token)
- User Content (photos, documents, messages)
- Location (precise — app functionality)
- Financial Info (card brand, last 4, expiry; Stripe holds the card)
- Usage Data and Diagnostics (analytics and crash reports — App Functionality / Analytics)

Answer **No** to "Used for tracking" everywhere: SiteRun has no third-party analytics, no
advertising SDKs, and no cross-app tracking.

---

## Play Console → App content → App access

Choose **All or some functionality is restricted**, then add these three entries. Play
keeps them for every future review, so they need to keep working: check both logins on the
built app before each submission.

| Field                | Entry 1                               | Entry 2                              |
| -------------------- | ------------------------------------- | ------------------------------------ |
| Name of instructions | Contractor account (hiring equipment) | Supplier account (listing equipment) |
| Username             | `alex@acme.test`                      | `jordan@turnerplant.test`            |
| Password             | `SiteRun!2026`                        | `SiteRun!2026`                       |
| Any other details    | see below                             | see below                            |

**Entry 1 — other details:**

```
Sign in on the Log In screen with the email and password above. This account is a
contractor: it can search equipment, book it, follow a delivery on the tracking map, and
see its invoices and documents. Nothing else is needed — no code, no verification email.
```

**Entry 2 — other details:**

```
Sign in on the Log In screen with the email and password above. This account is an
equipment supplier: it can list machines, accept booking requests, dispatch a delivery and
share the driver's live location, and see payouts. To see background location: open
Bookings, open a confirmed booking, tap "Mark Dispatched", then tap "Share Live Location".
```

Add a third entry only if a reviewer asks about the platform admin screens; they are for
SiteRun staff, not customers, and the flag is set in the database, never at sign-up.

## Play Console → App content → Content rating

The questionnaire is IARC's. Start it with your own email address and pick the category
**Utility, Productivity, Communication, or Other** — SiteRun is a business tool, not a
social app or a game.

| Question                                                                         | Answer                                                                      |
| -------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Violence (realistic, fantasy, or against characters)                             | No                                                                          |
| Sexuality or nudity                                                              | No                                                                          |
| Language (profanity, crude humour)                                               | No                                                                          |
| Controlled substances (drugs, alcohol, tobacco)                                  | No                                                                          |
| Gambling, simulated gambling, or contests                                        | No                                                                          |
| Horror, fear or disturbing content                                               | No                                                                          |
| Does the app let users interact or exchange content?                             | **Yes** — messages between the two businesses on a booking                  |
| Can users share their location with other users?                                 | **Yes** — a driver shares live location during a delivery                   |
| Does the app share the user's personal information?                              | **Yes** — name and phone are shared with the other business on that booking |
| Does the app contain user-generated content shown publicly?                      | No — listings are reviewed by SiteRun before they go live                   |
| Does the app let users purchase digital goods?                                   | See the note below before answering                                         |
| Is the app a news app? Does it provide COVID-19 tracing? Is it a government app? | No, no, no                                                                  |
| Does the app provide financial features (loans, investing, crypto, banking)?     | No                                                                          |
| Does the app contain ads?                                                        | No                                                                          |

Expected outcome: **PEGI 3 / ESRB Everyone / USK 0 / ACB G**, with the interactive
elements "Users Interact", "Shares Location" and "Shares Info".

Elsewhere under App content, answer: target audience **18+ only** (it is a trade tool, and
an ABN is required), no appeal to children, no ads, no government affiliation, no
COVID-19 features, and no data shared with third parties for advertising.

### Before you answer "digital goods": the plans screen is a policy risk

The app currently sells two things by card, inside the app: **plan subscriptions**
(Starter $99/month, Pro $249/month) and **SiteCredits** (prepaid hire credit).

- Equipment hire itself is a **physical service** between two businesses. Both stores allow
  that to be paid outside their billing, and the review note in this file says so.
- A **subscription that unlocks features in the app** is a digital service. Google Play's
  Payments policy and Apple's guideline 3.1.1 normally require their own billing for that,
  taking 15–30%. Apple's enterprise carve-out (3.1.3(c)) and Play's B2B allowances are
  narrower than they look, and "credits" reads to a reviewer like in-app currency.

Two honest ways through, and this needs your decision before submitting:

1. **Take plans and SiteCredits out of the phone apps** (recommended). The apps still show
   which plan the organisation is on, but buying or upgrading happens on the website. This
   is what most B2B marketplaces do, it's a small change here, and it removes the argument
   entirely. Answer **No** to digital goods.
2. **Keep selling them in the apps** and add Play Billing and Apple IAP for those two
   items only. That is real work on both platforms, and both stores take their cut of every
   plan and credit pack. Answer **Yes** to digital goods.

Until that's decided, don't submit with plans purchasable in the app and "No" ticked: that
mismatch is the kind of thing that gets an account warned, not just an app rejected.

## Permissions: what to say when they ask

**Background location (the one both stores question).** Only drivers use it, only during a
delivery, and only after tapping "Share Live Location".

```
Only delivery drivers use location, and only while they are delivering hired equipment.
The driver taps "Share Live Location" on the booking, the customer sees the truck's
position and arrival time on their tracking map, and sharing stops when the driver taps
Stop or the delivery is marked delivered. Background access is needed because a driver's
phone locks in the cab during the drive. Android shows a notification for the whole time
sharing is on.
```

Play also wants a short screen recording of that flow; record the operator booking screen:
tap Share Live Location, lock the phone, unlock, tap Stop Sharing.

- **Camera / photos**: machine photos for listings and photographing compliance documents.
- **Notifications**: booking requests, dispatches and deliveries, document expiry.
- **Location (while in use)**: "Use my location" when adding a site, and searching nearby.

---

## Review notes (paste into both consoles)

```
SiteRun is a marketplace for hiring construction equipment in Australia. Reviewers can
sign in with the demo account below; it has bookings, documents and invoices already set up.

Contractor (books equipment): alex@acme.test / SiteRun!2026
Supplier (lists equipment):   jordan@turnerplant.test / SiteRun!2026

To see live delivery tracking: sign in as the supplier, open Bookings, open a confirmed
booking, tap "Mark Dispatched", then tap "Share Live Location". Sign in as the contractor
and open the hire's Tracking screen.

Payments are in test mode. No real card is charged. Test card 4242 4242 4242 4242, any
future expiry, any CVC.

Equipment hire is a physical service between two businesses, so payments are handled by
Stripe rather than in-app purchase.
```

---

## Building and submitting

### Android

```bash
npm run build
npx cap sync android
```

1. Create the signing key once, and keep it (losing it means never updating the app again):
   ```bash
   keytool -genkey -v -keystore siterun-release.jks -alias siterun -keyalg RSA -keysize 2048 -validity 10000
   ```
2. Put the passwords in `android/key.properties` (git-ignored) as in `MOBILE_BUILD.md`.
3. Build the bundle:
   ```bash
   cd android && ./gradlew bundleRelease
   ```
   The file is `android/app/build/outputs/bundle/release/app-release.aab`.
4. Play Console → Create app → fill the listing from this file → upload the `.aab` to
   **Internal testing** first. Install it on a real phone from the tester link.
5. Complete: Data safety, content rating questionnaire, target audience (18+, business),
   government app declaration (no), ads (no), and the background location form.
6. Promote to Production. First reviews usually take a few days.

### iOS (needs a Mac)

```bash
npm run build
npx cap sync ios
cd ios/App && pod install && cd ../..
npx cap open ios
```

1. In Xcode → Signing & Capabilities: pick your team; add **Push Notifications**;
   Background Modes → Location updates and Remote notifications (already in `Info.plist`).
2. App Store Connect → new app, bundle ID `au.com.siterun.app`, fill the listing.
3. Xcode → Product → Archive → Distribute App → App Store Connect.
4. Send it to TestFlight and install it on a real iPhone before submitting.
5. Answer App Privacy, add the review notes above, then Submit for Review.

### Next versions

- Android: raise `versionCode` (must always increase) and `versionName` in
  `android/app/build.gradle`.
- iOS: raise `CURRENT_PROJECT_VERSION` (build) and `MARKETING_VERSION` in Xcode.
- Then `npm run build && npx cap sync`, rebuild, upload.

---

## Things that will get it rejected

- **Sign in with Apple is missing.** Apple requires it wherever Google sign-in is offered.
  The button exists; enable Apple as a provider in Supabase and in the Apple Developer
  portal before submitting (`README.md` → Auth settings).
- **A privacy policy URL that doesn't load.** Deploy the site first.
- **Background location with no explanation.** Use the wording above and the screen
  recording; this is the single most common reason a hire-and-delivery app gets bounced.
- **Demo account that doesn't work.** Check both logins on the built app before submitting.
- **Payments looking like in-app purchase.** Equipment hire itself is a physical service
  between two businesses, which both stores allow to be paid outside their billing, and the
  review note says so. The plan subscriptions and SiteCredits on the Plans screen are a
  different matter — decide that one before submitting (see "Before you answer 'digital
  goods'").

## Still untested here

The apps are configured, synced and ready to build, but **no build has been run on this
machine**: there is no Android SDK and no Mac. The Capacitor 8 upgrade (needed for Play's
Android 16 requirement) changed native project files, so the first `./gradlew bundleRelease`
and the first Xcode archive are also the first real test of them. Do that before anything
else on the submission list.
