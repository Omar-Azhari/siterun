-- Per-user rate limits. The limits sit on the tables, not in the RPCs, so they apply to
-- every path: a SECURITY DEFINER function, a direct PostgREST insert, or a replayed
-- request. Requests without a signed-in user (service role, pg_cron, seeding) are not
-- limited. Supabase Auth has its own limits for sign-in, sign-up and email sending.
create table private.rate_events (
  id bigserial primary key,
  profile_id uuid not null,
  action text not null,
  at timestamptz not null default now()
);
create index rate_events_lookup on private.rate_events (profile_id, action, at desc);
revoke all on private.rate_events from public, anon, authenticated;

-- Raises PT429, which PostgREST returns as HTTP 429 Too Many Requests.
create or replace function private.rate_limit(p_action text, p_max integer, p_window interval)
returns void language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  used integer;
begin
  if uid is null then
    return;
  end if;
  select count(*) into used
  from private.rate_events
  where profile_id = uid and action = p_action and at > now() - p_window;
  if used >= p_max then
    raise exception 'Too many requests. Wait a moment and try again.' using errcode = 'PT429';
  end if;
  insert into private.rate_events (profile_id, action) values (uid, p_action);
end $$;
revoke execute on function private.rate_limit(text, integer, interval) from public, anon, authenticated;

create or replace function private.rate_limit_trigger() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform private.rate_limit(tg_argv[0], tg_argv[1]::integer, tg_argv[2]::interval);
  return new;
end $$;
revoke execute on function private.rate_limit_trigger() from public, anon, authenticated;

create trigger messages_rate_limit before insert on public.messages
  for each row execute function private.rate_limit_trigger('message', '30', '1 minute');
create trigger bookings_rate_limit before insert on public.bookings
  for each row execute function private.rate_limit_trigger('booking', '20', '1 hour');
create trigger invitations_rate_limit before insert on public.invitations
  for each row execute function private.rate_limit_trigger('invitation', '20', '1 hour');
create trigger support_tickets_rate_limit before insert on public.support_tickets
  for each row execute function private.rate_limit_trigger('support_ticket', '10', '1 hour');
create trigger payments_rate_limit before insert on public.payments
  for each row execute function private.rate_limit_trigger('payment', '20', '1 hour');
create trigger payment_methods_rate_limit before insert on public.payment_methods
  for each row execute function private.rate_limit_trigger('payment_method', '10', '1 hour');
create trigger payouts_rate_limit before insert on public.payouts
  for each row execute function private.rate_limit_trigger('payout', '10', '1 hour');
create trigger machines_rate_limit before insert on public.machines
  for each row execute function private.rate_limit_trigger('machine', '30', '1 hour');
create trigger machine_photos_rate_limit before insert on public.machine_photos
  for each row execute function private.rate_limit_trigger('machine_photo', '120', '1 hour');
create trigger compliance_documents_rate_limit before insert on public.compliance_documents
  for each row execute function private.rate_limit_trigger('compliance_document', '60', '1 hour');
create trigger reviews_rate_limit before insert on public.reviews
  for each row execute function private.rate_limit_trigger('review', '20', '1 hour');
create trigger sites_rate_limit before insert on public.sites
  for each row execute function private.rate_limit_trigger('site', '30', '1 hour');

-- Keep the table small: nothing older than a day can affect a limit.
create or replace function private.prune_rate_events() returns void
language sql security definer set search_path = '' as $$
  delete from private.rate_events where at < now() - interval '1 day'
$$;
revoke execute on function private.prune_rate_events() from public, anon, authenticated;
select cron.schedule('siterun-rate-events-prune', '17 * * * *', 'select private.prune_rate_events()');
