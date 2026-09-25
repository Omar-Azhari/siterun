# Turning on the launch features

Five features are built and deployed but need accounts or secrets that only the owner can
create. Each one is off, and harmless, until its steps are done. Do them in any order.

| Feature                              | Works now?                      | Needs                                        |
| ------------------------------------ | ------------------------------- | -------------------------------------------- |
| Live GPS for deliveries              | Yes                             | Nothing                                      |
| Error monitoring                     | Yes (Admin → More → App errors) | Nothing                                      |
| Analytics                            | Yes (Admin → More → Analytics)  | Nothing                                      |
| Admin tools (cancel, change, refund) | Yes (Admin → Bookings)          | Nothing (refunds need Stripe for real money) |
| Terms and Privacy pages              | Yes                             | Company details, then a lawyer's check       |
| Card payments (Stripe)               | Built, still mocked             | A Stripe account                             |
| Supplier payouts (Stripe)            | Built, recorded only            | The same Stripe account, with Connect        |
| Push notifications                   | Built, nothing is sent          | Firebase (Android), an Apple key (iOS)       |
| Notification emails                  | Built, nothing is sent          | A Resend account and a verified domain       |

Secrets go in **Supabase → Edge Functions → Secrets** (or `npx supabase secrets set NAME=value`).
They never go in `.env`, the repository or Vercel.

---

## 1. Card payments (Stripe)

The card form uses Stripe's own fields, so card numbers go straight from the browser to
Stripe. SiteRun stores only the brand, last four digits, expiry and Stripe's id for the card.

1. Create a Stripe account and finish **Settings → Business details** (Australian business,
   AUD). Start in **test mode**.
2. **Developers → API keys**: copy the publishable key (`pk_test_…`) and the secret key
   (`sk_test_…`).
3. Supabase Edge Function secrets:
   - `STRIPE_SECRET_KEY` = the secret key
   - `ALLOWED_ORIGINS` = the site's address(es), comma-separated, e.g.
     `https://siterun.com.au,https://www.siterun.com.au`
4. **Developers → Webhooks → Add endpoint**
   - URL: `https://<project-ref>.supabase.co/functions/v1/stripe-webhook`
   - Events: `payment_intent.succeeded`, `setup_intent.succeeded`
   - Copy the signing secret (`whsec_…`) into the Edge Function secret `STRIPE_WEBHOOK_SECRET`.
5. Vercel environment variable (and `.env` for local testing): `VITE_STRIPE_PUBLISHABLE_KEY`
   = the publishable key. Redeploy the site. The Add Card screen now shows Stripe's fields.
6. Test with Stripe's test cards: `4242 4242 4242 4242` (works), `4000 0025 0000 3155`
   (asks for 3-D Secure), `4000 0000 0000 9995` (declined). Any future expiry and CVC.
7. When it all works, switch the database off the mock so the old demo paths are refused.
   In the Supabase SQL editor:
   ```sql
   select private.put_config('payments_provider', 'stripe');
   ```
   From then on plans and SiteCredits are invoiced to the account balance and paid by card
   through Stripe; the mock "pay" and "save card" calls are rejected.
8. Going live: swap both keys for the live ones (`pk_live_…`, `sk_live_…`), add a live-mode
   webhook with the same URL and events, and update `STRIPE_WEBHOOK_SECRET`.

### Paying suppliers (Stripe Connect)

Suppliers are paid from SiteRun's Stripe balance to their own Stripe account, which they
set up themselves. SiteRun never sees or stores their bank details.

1. In Stripe, open **Connect** and enable it (Express accounts). Set the branding — name,
   colour and logo — under Connect → Settings, because suppliers see it during setup.
2. Nothing else to configure: with `payments_provider` set to `stripe`, the Payouts screen
   shows "Set Up Payouts", which sends the supplier's owner to Stripe and back.
3. A payout moves money the moment the owner taps Request Payout, so SiteRun's Stripe
   balance has to cover it. Card payments take a couple of days to settle, so a payout can
   come back with "Payments from this week haven't settled yet" — that's Stripe, not a bug.
4. Refunds: a platform admin opens **Admin → Bookings → the booking → Refund a Payment**.
   With Stripe on, the money goes back to the card; in mock mode it's recorded only.

To undo: `select private.put_config('payments_provider', 'mock');` and remove
`VITE_STRIPE_PUBLISHABLE_KEY`.

Not built yet: paying suppliers out through Stripe Connect. Payouts are still recorded and
settled outside the app.

## 2. Push notifications

Every in-app notification is also sent to the person's phones. The database hands each new
notification to the `push` Edge Function, which sends it to Android phones through Firebase
Cloud Messaging and to iPhones through Apple's push service directly (the app's push plugin
gives iPhones an Apple token, not a Firebase one). Each platform stays off until its
secrets are set.

**Android**

1. Create a Firebase project and add an Android app with package `au.com.siterun.app`.
   Download `google-services.json` into `android/app/`.
2. Firebase → Project settings → **Service accounts → Generate new private key**. Paste the
   whole JSON file's contents into the Edge Function secret `FIREBASE_SERVICE_ACCOUNT`.

**iPhone**

1. Apple Developer portal → Identifiers → `au.com.siterun.app`: tick **Push Notifications**.
   In Xcode, **Signing & Capabilities → + Capability → Push Notifications**.
2. Apple Developer portal → **Keys → +**, tick Apple Push Notifications service, download
   the `.p8` file (it can only be downloaded once).
3. Edge Function secrets: `APNS_KEY` = the `.p8` file's contents, `APNS_KEY_ID` = the key's
   ID, `APNS_TEAM_ID` = your team ID (top right of the developer portal). For builds run
   straight from Xcode also set `APNS_ENV=sandbox`; remove it for TestFlight and App Store.

**Both**

1. Build the apps with `VITE_PUSH_ENABLED=true`, then `npm run build && npx cap sync`.
2. Tell the database where the function is (already done for the demo project; needed on
   any new project):
   ```sql
   select private.put_config('push_function_url', 'https://<project-ref>.supabase.co/functions/v1/push');
   ```

The function is called only by the database, with a secret the database generated and keeps
in Vault; nothing else can trigger a push. Tokens that Firebase or Apple report as dead are
deleted, and signing out removes that phone's token.

## 3. Notification emails

Every notification the app already shows (bookings, deliveries, invoices, documents,
listings) is also emailed, unless the person turns email off under Account → Privacy &
Security. Chat messages are never emailed.

1. Create a [Resend](https://resend.com) account and verify the domain you'll send from
   (it walks you through the DNS records). A verified domain is what keeps the mail out of
   spam folders.
2. **API keys → Create API key** (sending permission is enough).
3. Supabase Edge Function secrets:
   - `RESEND_API_KEY` = that key
   - `EMAIL_FROM` = the sender, e.g. `SiteRun <notifications@siterun.com.au>`
   - `SITE_URL` = the deployed site, e.g. `https://siterun.com.au` (used for the button in
     the email)
4. Tell the database where the function is (already done for the demo project):
   ```sql
   select private.put_config('email_function_url', 'https://<project-ref>.supabase.co/functions/v1/email');
   ```

To stop all emails again: `select private.put_config('email_function_url', '');` — or leave
the secrets unset.

## 4. Live GPS

Nothing to set up. When a supplier marks a delivery **Dispatched**, the driver (the
assigned operator, or anyone in the supplier's team) sees **Share Live Location** on the
booking. The customer's tracking map then follows the phone instead of the planned route,
with an arrival time from the real distance left.

- Positions are sent about every 6–20 seconds, only while sharing is on, and only while
  the delivery is in transit. Each position is kept for two days.
- In the apps, sharing keeps going when the phone is locked or the driver switches apps.
  Android shows a notification for the whole trip (that's what makes background location
  allowed), and it stops when the driver taps Stop Sharing or the delivery ends.
- On the website, sharing only runs while the tab is open.
- The app stores ask why an app needs background location. The answer for both: "Drivers
  share their location with the customer while delivering hired equipment, and only while
  a delivery is in progress." Android also needs the declaration form for
  `ACCESS_BACKGROUND_LOCATION`, and iOS needs the "location" background mode, which is
  already in `Info.plist`.
- **Not tested on a device.** The plugin ships native code for both platforms, and this
  machine can't build either app.

## 5. Error monitoring

Nothing to set up. Crashes and unhandled errors on the website and in the apps are reported
automatically and listed under **Admin → More → App errors**, newest first, with a count,
the page, the app version and the stack trace. Only the error itself is sent: no form
contents, query strings or tokens. Reports are kept for 90 days.

A crashing screen shows "Something went wrong" with a Reload button instead of a blank page.

## 6. Analytics

Nothing to set up. **Admin → More → Analytics** shows searches, machine views, started
bookings and bookings for the last 7 days to a year, the funnel between them, the busiest
searches and categories, and the most viewed machines with how many of those views became
hires. Counts only, kept for 180 days, stored in SiteRun's own database — no third-party
analytics service, no cookies, nothing shared.

## 7. Admin tools

Nothing to set up. **Admin → Bookings → a booking** can:

- **Cancel the hire** on both parties' behalf, with a reason they both see.
- **Change the dates or total** after a dispute, again with a reason.
- **Refund a payment**, fully or partly.

Each one messages both organisations, writes to the booking's history and shows up in the
admin activity feed with the admin's name attached.

## 8. Terms and Privacy

The pages at `/terms` and `/privacy` now cover the real service: the marketplace model,
bookings and GST, Stripe payments, supplier compliance, operators and live location, the
Australian Consumer Law, and the Privacy Act (what's collected, who it's shared with,
overseas disclosure, retention, access and complaints to the OAIC).

1. Fill in `src/lib/company.ts`: legal entity name, ABN, privacy contact email and postal
   address. Empty values are left off the pages.
2. **Have a lawyer review both pages before launch.** They are written to match what the
   app actually does, but they are not legal advice.
3. Change the "Last updated" date in `src/pages/LegalPage.tsx` whenever the text changes.
