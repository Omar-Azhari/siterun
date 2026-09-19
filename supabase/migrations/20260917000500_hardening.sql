-- Advisor fixes: pin search_path, move btree_gist out of public, and keep the
-- RPCs away from anonymous callers (search stays public for browsing).

alter function public.touch_updated_at() set search_path = '';
alter function private.uid() set search_path = '';
alter function private.trusted() set search_path = '';
alter function private.guard_profile() set search_path = '';
alter function private.guard_machine() set search_path = '';
alter function private.guard_document() set search_path = '';
alter function private.trust() set search_path = '';
alter function private.fail(text, text) set search_path = '';
alter function private.extension_rate(integer, integer) set search_path = '';
alter function private.money(bigint) set search_path = '';
alter function private.distance_km(double precision, double precision, double precision, double precision) set search_path = '';
alter function private.pct(numeric, numeric) set search_path = '';

create schema if not exists extensions;
alter extension btree_gist set schema extensions;

do $$
declare f record;
begin
  for f in
    select p.oid::regprocedure as sig
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prosecdef and p.proname <> 'search_machines'
  loop
    execute format('revoke execute on function %s from public, anon', f.sig);
    execute format('grant execute on function %s to authenticated', f.sig);
  end loop;
end $$;

revoke execute on function public.run_document_expiry() from authenticated;

alter default privileges in schema public revoke execute on functions from public, anon;
