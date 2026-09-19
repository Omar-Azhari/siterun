# Handoff: where the work stopped

Read README.md and DECISIONS.md first. They describe the stack, scripts, Supabase setup and every decision made.

## Status
- Stage 1 (web), Phases 0–5, is built, tested and committed on `main`.
- Supabase project `kixhozwbtxiqzoknxlje` (ap-southeast-2) has all migrations in `supabase/migrations` applied and the demo seed loaded. Keys are in `.env` (not committed).
- Not deployed yet. Vercel CLI isn't logged in and the repo has no Git remote.
- Stage 2 (Capacitor apps) not started. The brief says to wait for the owner to sign off Stage 1.

## Full-site audit (done)
Run against the production build on Supabase (`npm run build`, `npx vite preview --port 4173`, then `npx playwright test --config playwright.audit.config.ts`). Specs are in `e2e-audit/`.

- Pass 1, pages (`pages.spec.ts`): 101 pages as every role. Clean except "Preview not available" on seeded documents that have no file (expected).
- Pass 2, features (`features.spec.ts`): every data-changing feature. All work. Sign-up and forgot-password on Supabase can't be automated because Supabase rejects `.test` addresses and needs SMTP (owner setup).
- Pass 3, visuals (`visual.spec.ts`): key screens at 768 and 1440 px look right.

Bugs found and fixed during the audit:
1. Site edit page crashed (time formatter got an empty value while loading).
2. Payment settings called a supplier-only function for contractors (403).
3. Supplier-uploaded machine photos were broken in every thumbnail (`thumb()` in `src/lib/images.ts`).
4. Cancel booking, card removal and account deletion used the browser's native `confirm()` popup; now an in-app sheet (`ConfirmSheet`).
5. Google/Apple buttons sent users to a raw JSON error when the provider isn't enabled; now a clear message.
6. Demo tracking trip ended after 90 minutes; a cron job restarts it every two hours (migration `20260919001000`, demo only).
7. Leftover e2e test data removed from the database.

After an audit run, restore the demo data in the Supabase SQL editor:
`select private.audit_restore(); select private.audit_cleanup_new_rows();`
(Baseline is in `private.audit_baseline`; refresh it only when the data is clean.)

## Next steps
1. Owner actions: deploy to Vercel; Supabase auth email template with `{{ .Token }}`, SMTP, Site URL/redirects; Google/Apple keys (README).
2. After the owner signs off Stage 1: Stage 2 (Capacitor apps), Phase 6 in the brief.
3. Before real launch: real payments (Stripe), real GPS, legal copy for Terms/Privacy, hide demo logins, Supabase Pro plan, error monitoring.

## Rules from the owner
- Match the design boards exactly and don't make it look AI-made (no filler text, cute greetings, emoji, gratuitous gradients).
- Work through everything without stopping for approval, except anything publishing or irreversible.
- Payments stay mocked; never store full card numbers or CVV. Platform admin is a database flag only.
- Small commits, keep README.md and DECISIONS.md updated.
