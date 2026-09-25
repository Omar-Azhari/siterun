-- Paying suppliers through Stripe Connect. A supplier connects a Stripe account once
-- (Stripe collects their business and bank details, not SiteRun), and a payout becomes a
-- real transfer to that account. Until `payments_provider` is 'stripe' this changes
-- nothing: payouts stay recorded-only, as before.
create table private.stripe_accounts (
  org_id uuid primary key references public.organisations (id) on delete cascade,
  account_id text not null unique,
  payouts_enabled boolean not null default false,
  details_submitted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
revoke all on private.stripe_accounts from public, anon, authenticated;

alter table public.payouts add column provider_ref text unique;

-- What the supplier's Payouts screen shows, and what the payments function needs.
create or replace function public.payout_account() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  p public.profiles := private.require_supplier();
  a private.stripe_accounts;
begin
  select * into a from private.stripe_accounts where org_id = p.org_id;
  return jsonb_build_object(
    'provider', private.payments_provider(),
    'isOwner', private.my_role() = 'owner',
    'connected', a.account_id is not null,
    'detailsSubmitted', coalesce(a.details_submitted, false),
    'payoutsEnabled', coalesce(a.payouts_enabled, false)
  );
end $$;
revoke execute on function public.payout_account() from public, anon;
grant execute on function public.payout_account() to authenticated;

-- Same as payout_account, plus what only the server should decide on: the amount owed.
create or replace function public.payout_context() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  p public.profiles := private.require_supplier();
begin
  return public.payout_account()
    || jsonb_build_object(
      'org_id', p.org_id,
      'org_name', (select name from public.organisations where id = p.org_id),
      'email', p.email,
      'profile_id', p.id,
      'available_cents', (public.payout_summary() ->> 'availableCents')::int,
      'account_id', (select account_id from private.stripe_accounts where org_id = p.org_id)
    );
end $$;
revoke execute on function public.payout_context() from public, anon;
grant execute on function public.payout_context() to authenticated;

-- With Stripe on, a payout has to go through the payments function so real money moves.
create or replace function public.request_payout() returns public.payouts
language plpgsql security definer set search_path = '' as $$
declare
  p public.profiles := private.require_supplier();
  amount int;
  po public.payouts;
begin
  if private.payments_provider() = 'stripe' then
    perform private.fail('Payouts go through Stripe. Update the app and try again.', '42501');
  end if;
  perform private.trust();
  if private.my_role() <> 'owner' then perform private.fail('Only the owner can request payouts.', '42501'); end if;
  amount := (public.payout_summary() ->> 'availableCents')::int;
  if amount <= 0 then perform private.fail('There’s nothing available to pay out yet.', '22023'); end if;
  insert into public.payouts (org_id, amount_cents, status, requested_by) values (p.org_id, amount, 'processing', p.id) returning * into po;
  insert into public.admin_actions (kind, title, detail, target_type, target_id)
  values ('payout', 'Payout requested', private.money(amount) || ' to ' || (select name from public.organisations where id = p.org_id), 'payout', po.id);
  return po;
end $$;

-- ---- service role only (called by the payments Edge Function) -----------------------
create or replace function public.stripe_set_account(p_org uuid, p_account text) returns void
language sql security definer set search_path = '' as $$
  insert into private.stripe_accounts (org_id, account_id) values (p_org, p_account)
  on conflict (org_id) do nothing
$$;

create or replace function public.stripe_update_account(
  p_account text, p_payouts_enabled boolean, p_details_submitted boolean
) returns void language sql security definer set search_path = '' as $$
  update private.stripe_accounts
    set payouts_enabled = p_payouts_enabled, details_submitted = p_details_submitted, updated_at = now()
  where account_id = p_account
$$;

/** Records a payout that Stripe has already transferred. Idempotent on the transfer id. */
create or replace function public.stripe_record_payout(
  p_org uuid, p_amount integer, p_by uuid, p_transfer text
) returns public.payouts
language plpgsql security definer set search_path = '' as $$
declare po public.payouts;
begin
  perform private.trust();
  select * into po from public.payouts where provider_ref = p_transfer;
  if po.id is not null then
    return po;
  end if;
  insert into public.payouts (org_id, amount_cents, status, requested_by, paid_at, provider_ref)
  values (p_org, p_amount, 'paid', p_by, now(), p_transfer)
  returning * into po;
  insert into public.admin_actions (kind, title, detail, target_type, target_id)
  values ('payout', 'Payout sent', private.money(p_amount) || ' to ' || (select name from public.organisations where id = p_org), 'payout', po.id);
  perform private.notify_org(p_org, 'invoice', 'Payout Sent',
    private.money(p_amount) || ' is on its way to your bank account.', 'Usually 1–2 business days', '/supplier/payouts');
  return po;
end $$;

do $$
declare f text;
begin
  foreach f in array array[
    'public.stripe_set_account(uuid, text)',
    'public.stripe_update_account(text, boolean, boolean)',
    'public.stripe_record_payout(uuid, integer, uuid, text)'
  ] loop
    execute format('revoke execute on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to service_role', f);
  end loop;
end $$;
