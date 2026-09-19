-- Audit helper (not a migration). The audit baseline lives in private.audit_baseline and
-- private.audit_restore() puts the demo data back after e2e-audit runs:
--   select private.audit_restore();
-- The function body is in the Supabase project; see HANDOFF.md.
select private.audit_restore();
