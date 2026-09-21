-- Real card payments through Stripe. Card details go from the browser straight to
-- Stripe; this database only ever sees the card's brand, last four digits, expiry and
-- Stripe's id for it. The `payments` and `stripe-webhook` Edge Functions talk to Stripe
-- and call the service-only functions below.
--
-- Payments stay mocked until the owner switches over (after setting the Stripe secrets):
--   select private.put_config('payments_provider', 'stripe');
-- From then on the mock paths (make_payment, saving a card by hand) are refused, so an
-- account balance can only be cleared by a real Stripe charge.

create or replace function private.payments_provider() returns text
language sql stable security definer set search_path = '' as $$
  select coalesce(private.config('payments_provider'), 'mock')
$$;
revoke execute on function private.payments_provider() from public, anon, authenticated;

alter table public.payment_methods add column provider_ref text unique;
create unique index payments_provider_ref_key on public.payments (provider_ref) where provider_ref is not null;

create table private.stripe_customers (
  org_id uuid primary key references public.organisations (id) on delete cascade,
  customer_id text not null unique,
  created_at timestamptz not null default now()
);
revoke all on private.stripe_customers from public, anon, authenticated;

-- With Stripe on, a card row can only come from Stripe (through a trusted function).
create or replace function private.guard_payment_method() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if private.payments_provider() = 'stripe' and not private.trusted() then
    perform private.fail('Add cards through the secure card form.', '42501');
  end if;
  return new;
end $$;
revoke execute on function private.guard_payment_method() from public, anon, authenticated;
create trigger payment_methods_guard before insert on public.payment_methods
  for each row execute function private.guard_payment_method();

-- Marks unpaid invoices paid, oldest due first, and records the payment. Idempotent on
-- the provider reference, so a Stripe webhook and the app confirming the same charge
-- only count it once.
create or replace function private.apply_payment(p_org uuid, p_amount integer, p_method uuid, p_ref text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  remaining int := p_amount;
  inv record;
begin
  perform private.trust();
  if p_ref is not null and exists (select 1 from public.payments where provider_ref = p_ref) then
    return;
  end if;
  for inv in select * from public.invoices where org_id = p_org and status <> 'paid' order by due_date, issued_at loop
    exit when remaining < inv.amount_cents + inv.gst_cents;
    update public.invoices set status = 'paid' where id = inv.id;
    remaining := remaining - (inv.amount_cents + inv.gst_cents);
  end loop;
  insert into public.payments (org_id, amount_cents, method_id, kind, description, provider_ref)
  values (p_org, p_amount, p_method, 'balance', 'Account payment', p_ref);
end $$;
revoke execute on function private.apply_payment(uuid, integer, uuid, text) from public, anon, authenticated;

create or replace function public.make_payment(p_amount integer, p_method uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  p public.profiles := private.me();
begin
  if private.payments_provider() = 'stripe' then
    perform private.fail('Card payments go through Stripe. Update the app and try again.', '42501');
  end if;
  if not exists (select 1 from public.payment_methods where id = p_method and org_id = p.org_id) then
    perform private.fail('Choose a saved card.', '22023');
  end if;
  if p_amount is null or p_amount <= 0 then
    perform private.fail('Enter an amount above $0.', '22023');
  end if;
  if p_amount > public.account_balance() then
    perform private.fail('That’s more than your balance.', '22023');
  end if;
  perform private.apply_payment(p.org_id, p_amount, p_method, null);
end $$;

-- An invoice for something bought in the app (plans, SiteCredits), numbered like hire
-- invoices. Amount and GST are passed separately because pack prices already include GST.
create or replace function private.issue_invoice(p_org uuid, p_description text, p_amount integer, p_gst integer)
returns public.invoices language plpgsql security definer set search_path = '' as $$
declare
  n int;
  inv public.invoices;
begin
  perform private.trust();
  select 1046 + count(*) into n from public.invoices where org_id = p_org;
  insert into public.invoices (number, org_id, issued_at, due_date, amount_cents, gst_cents, status, lines)
  values (
    'INV-' || n || case when exists (select 1 from public.invoices where number = 'INV-' || n) then '-' || substr(gen_random_uuid()::text, 1, 4) else '' end,
    p_org, current_date, current_date, p_amount, p_gst, 'due',
    jsonb_build_array(jsonb_build_object('description', p_description, 'amountCents', p_amount))
  )
  returning * into inv;
  return inv;
end $$;
revoke execute on function private.issue_invoice(uuid, text, integer, integer) from public, anon, authenticated;

-- With Stripe on, plans and SiteCredits are invoiced to the account balance (paid by card
-- through Stripe) instead of being recorded as instant mock charges.
create or replace function public.subscribe_plan(p_plan public.plan_id, p_period public.billing_period, p_credits_pack integer)
returns public.subscriptions
language plpgsql security definer set search_path = '' as $$
declare
  p public.profiles := private.me();
  s public.subscriptions;
  monthly int := case p_plan when 'starter' then 9900 when 'pro' then 24900 else 0 end;
  amount int;
  method uuid;
  bonus int;
  invoiced boolean := private.payments_provider() = 'stripe';
begin
  perform private.trust();
  if private.my_role() <> 'owner' then
    perform private.fail('Only the organisation owner can manage billing.', '42501');
  end if;
  select id into method from public.payment_methods where org_id = p.org_id order by is_default desc, created_at limit 1;
  insert into public.subscriptions (org_id, plan, period, status, renews_at)
  values (p.org_id, p_plan, p_period, 'active', current_date + case when p_period = 'annual' then 365 else 30 end)
  on conflict (org_id) do update set plan = excluded.plan, period = excluded.period, status = 'active', renews_at = excluded.renews_at
  returning * into s;
  if monthly > 0 then
    if method is null then
      perform private.fail('Add a card before choosing a paid plan.', '22023');
    end if;
    amount := case when p_period = 'annual' then round(monthly * 12 * 0.8) else monthly end;
    if invoiced then
      perform private.issue_invoice(p.org_id, initcap(p_plan::text) || ' plan (' || p_period || ')', amount, round(amount * 0.1)::int);
    else
      insert into public.payments (org_id, amount_cents, method_id, kind, description)
      values (p.org_id, amount + round(amount * 0.1), method, 'subscription', initcap(p_plan::text) || ' plan (' || p_period || ')');
    end if;
  end if;
  if p_credits_pack is not null then
    bonus := case p_credits_pack when 50000 then 5000 when 100000 then 12000 when 250000 then 35000 end;
    if bonus is null then
      perform private.fail('Unknown SiteCredits pack.', '22023');
    end if;
    if method is null then
      perform private.fail('Add a card before buying SiteCredits.', '22023');
    end if;
    if invoiced then
      -- Pack prices include GST.
      perform private.issue_invoice(p.org_id, 'SiteCredits pack', p_credits_pack - round(p_credits_pack / 11.0)::int, round(p_credits_pack / 11.0)::int);
    else
      insert into public.payments (org_id, amount_cents, method_id, kind, description) values (p.org_id, p_credits_pack, method, 'credits', 'SiteCredits pack');
    end if;
    insert into public.credit_transactions (org_id, credits, amount_cents, description)
    values (p.org_id, (p_credits_pack + bonus) / 100, p_credits_pack, 'SiteCredits pack (+' || bonus / 100 || ' bonus)');
    update public.subscriptions set credits_balance = credits_balance + (p_credits_pack + bonus) / 100 where org_id = p.org_id returning * into s;
  end if;
  return s;
end $$;

-- What the payments function needs to know about the signed-in caller. Runs as the
-- caller, so it can only ever describe their own organisation.
create or replace function public.payment_context() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  p public.profiles := private.me();
begin
  if p.org_id is null then
    perform private.fail('Set up your business first.', '22023');
  end if;
  return jsonb_build_object(
    'org_id', p.org_id,
    'org_name', (select name from public.organisations where id = p.org_id),
    'email', p.email,
    'can_manage_cards', private.my_role() in ('owner', 'project_manager'),
    'balance', public.account_balance(),
    'customer_id', (select customer_id from private.stripe_customers where org_id = p.org_id),
    'provider', private.payments_provider()
  );
end $$;
revoke execute on function public.payment_context() from public, anon;
grant execute on function public.payment_context() to authenticated;

-- Called by the payments function, as the caller, before it asks Stripe for anything:
-- card setups and charges share one per-user limit.
create or replace function public.payment_attempt() returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform private.rate_limit('payment_attempt', 30, '1 hour');
end $$;
revoke execute on function public.payment_attempt() from public, anon;
grant execute on function public.payment_attempt() to authenticated;

-- ---- service role only (called by the Edge Functions) ------------------------------
create or replace function public.stripe_set_customer(p_org uuid, p_customer text) returns void
language sql security definer set search_path = '' as $$
  insert into private.stripe_customers (org_id, customer_id) values (p_org, p_customer)
  on conflict (org_id) do nothing
$$;

create or replace function public.stripe_org_for_customer(p_customer text) returns uuid
language sql stable security definer set search_path = '' as $$
  select org_id from private.stripe_customers where customer_id = p_customer
$$;

create or replace function public.stripe_record_card(
  p_org uuid, p_ref text, p_brand public.card_brand, p_last4 text, p_exp_month integer, p_exp_year integer
) returns public.payment_methods
language plpgsql security definer set search_path = '' as $$
declare
  pm public.payment_methods;
begin
  perform private.trust();
  select * into pm from public.payment_methods where provider_ref = p_ref;
  if pm.id is not null then
    return pm;
  end if;
  insert into public.payment_methods (org_id, brand, last4, exp_month, exp_year, is_default, provider_ref)
  values (p_org, p_brand, p_last4, p_exp_month, p_exp_year,
          not exists (select 1 from public.payment_methods where org_id = p_org), p_ref)
  returning * into pm;
  return pm;
end $$;

create or replace function public.stripe_card(p_org uuid, p_method uuid) returns public.payment_methods
language sql stable security definer set search_path = '' as $$
  select * from public.payment_methods where id = p_method and org_id = p_org
$$;

create or replace function public.stripe_delete_card(p_org uuid, p_method uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform private.trust();
  delete from public.payment_methods where id = p_method and org_id = p_org;
end $$;

create or replace function public.stripe_apply_payment(p_org uuid, p_amount integer, p_card_ref text, p_intent text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform private.apply_payment(p_org, p_amount,
    (select id from public.payment_methods where provider_ref = p_card_ref and org_id = p_org), p_intent);
end $$;

do $$
declare f text;
begin
  foreach f in array array[
    'public.stripe_set_customer(uuid, text)',
    'public.stripe_org_for_customer(text)',
    'public.stripe_record_card(uuid, text, public.card_brand, text, integer, integer)',
    'public.stripe_card(uuid, uuid)',
    'public.stripe_delete_card(uuid, uuid)',
    'public.stripe_apply_payment(uuid, integer, text, text)'
  ] loop
    execute format('revoke execute on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to service_role', f);
  end loop;
end $$;
