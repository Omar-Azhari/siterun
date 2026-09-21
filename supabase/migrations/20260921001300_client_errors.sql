-- Error reports from the website and apps. Browsers send them through
-- log_client_error(); only platform admins can read them. The same error on the same day
-- is one row with a count, so a crash loop can't flood the table.
create table public.client_errors (
  id bigint generated always as identity primary key,
  fingerprint text not null,
  day date not null default current_date,
  message text not null,
  stack text not null default '',
  url text not null default '',
  release text not null default '',
  platform text not null default '',
  user_agent text not null default '',
  profile_id uuid references public.profiles (id) on delete set null,
  count integer not null default 1,
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  unique (fingerprint, day)
);
create index client_errors_last_seen_idx on public.client_errors (last_seen desc);
create index client_errors_profile_idx on public.client_errors (profile_id) where profile_id is not null;

alter table public.client_errors enable row level security;
-- No insert, update or delete policies: rows are written only by log_client_error().
create policy client_errors_admin_read on public.client_errors for select to authenticated
  using ((select private.is_admin()));

create or replace function public.log_client_error(
  p_message text, p_stack text, p_url text, p_release text, p_platform text, p_user_agent text
) returns void language plpgsql security definer set search_path = '' as $$
declare
  msg text := left(coalesce(nullif(trim(p_message), ''), 'Unknown error'), 500);
  trace text := left(coalesce(p_stack, ''), 4000);
  -- Drop the query string and fragment: they can carry tokens.
  page text := left(split_part(split_part(coalesce(p_url, ''), '#', 1), '?', 1), 300);
  recent integer;
begin
  -- Anonymous visitors aren't rate limited per user, so cap the whole table too.
  select count(*) into recent from public.client_errors where last_seen > now() - interval '1 hour';
  if recent >= 300 then
    return;
  end if;
  begin
    perform private.rate_limit('client_error', 60, '1 hour');
  exception when others then
    return;
  end;
  insert into public.client_errors (fingerprint, message, stack, url, release, platform, user_agent, profile_id)
  values (
    md5(msg || '|' || split_part(trace, E'\n', 1) || '|' || split_part(trace, E'\n', 2)),
    msg, trace, page,
    left(coalesce(p_release, ''), 40), left(coalesce(p_platform, ''), 20), left(coalesce(p_user_agent, ''), 300),
    auth.uid()
  )
  on conflict (fingerprint, day) do update
    set count = public.client_errors.count + 1,
        last_seen = now(),
        url = excluded.url,
        profile_id = coalesce(excluded.profile_id, public.client_errors.profile_id);
end $$;
revoke execute on function public.log_client_error(text, text, text, text, text, text) from public;
grant execute on function public.log_client_error(text, text, text, text, text, text) to anon, authenticated;

-- Error reports are kept for 90 days (Privacy Policy).
select cron.schedule('siterun-prune-client-errors', '40 3 * * *',
  $$delete from public.client_errors where last_seen < now() - interval '90 days'$$);
