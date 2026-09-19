# Handoff: where the work stopped

Read README.md and DECISIONS.md first. They describe the stack, scripts, Supabase setup and every decision made.

## Status
- Stage 1 (web), Phases 0–5, is built, tested and committed on `main`.
- Supabase project `kixhozwbtxiqzoknxlje` (ap-southeast-2) has all migrations in `supabase/migrations` applied and the demo seed loaded. Keys are in `.env` (not committed).
- Not deployed yet. Vercel CLI isn't logged in and the repo has no Git remote.
- Stage 2 (Capacitor apps) not started. The brief says to wait for the owner to sign off Stage 1.

## In progress: full-site audit (owner asked "check every feature, list what doesn't work")
Pass 1 (open every page as every role against the Supabase build) is done:
`npx playwright test --config playwright.audit.config.ts` (needs `npm run build` then `npx vite preview --port 4173` running). Results: `docs/audit/pages.json`. 101 pages, 4 issues:

1. FIXED (uncommitted before this file): `/sites/:id/edit` crashed with "Cannot read properties of undefined (reading 'split')". `formatTime()` in `src/lib/format.ts` now accepts empty values.
2. FIXED: `/account/payment-settings` as a contractor called `payout_summary` (supplier-only, 403). `usePayoutSummary(enabled)` now only runs for suppliers.
3. OPEN: supplier `/supplier/machines` and `/supplier/compliance` show a broken photo (`net::ERR_BLOCKED_BY_ORB`) for a leftover e2e test machine `f8851623-8707-48a3-939e-5bbe1276c875` (make `E2EMU7ZZH20`, paused). The file exists in storage bucket `machine-photos`. Two jobs: (a) delete that leftover machine; (b) find out why the public URL is blocked. Open the URL directly; likely the object is served with a bad content-type or the bucket's public read isn't working. Uploaded photos must display for real suppliers.
4. EXPECTED: `/admin/approvals/documents/:id` says "Preview not available" for seeded documents (they have no file). Fine.

## Next steps
1. Re-run pass 1 after the fixes (`npm run build`, restart preview, run the audit config) and confirm 0 issues.
2. Pass 2: exercise every feature that changes data, on Supabase, as the right role, and note failures. Not yet covered by `e2e-flows`:
   - contractor: create site, edit site, invite team member, change member role, subscribe to a plan / buy SiteCredits, add and remove card, make a payment, download invoice PDF, cancel booking, schedule return, smart swap, mark notifications read, support ticket, profile and company edits, password change, message attachment.
   - supplier: decline a request, dispatch → delivered → collected (invoice raised), request payout, pause/unpause listing, edit a rejected listing, upload an operator document.
   - operator: view jobs, upload own documents.
   - admin: reject a document, reject a listing, suppliers list, bookings list.
   - auth on Supabase: sign up (email OTP needs the dashboard template, see README), forgot/reset password, "keep me signed in" off.
   Clean up any test data afterwards (the flows spec shows how: cancel bookings, pause listings) or delete it with SQL.
3. Pass 3: visual check at 390, 768 and 1440 px against the boards in `design/`.
4. Give the owner a plain list of everything that doesn't work, then fix it.
5. Owner actions still pending: deploy to Vercel, Supabase auth email template + SMTP + URLs, OAuth keys (README).

## Rules from the owner
- Match the design boards exactly and don't make it look AI-made (no filler text, cute greetings, emoji, gratuitous gradients).
- Work through everything without stopping for approval, except anything publishing or irreversible.
- Payments stay mocked; never store full card numbers or CVV. Platform admin is a database flag only.
- Small commits, keep README.md and DECISIONS.md updated.
