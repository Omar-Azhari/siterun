-- The admin tools themselves (the enum values they use were added in the previous
-- migration, which has to be committed first).
alter table public.payments add column refunded_cents integer not null default 0 check (refunded_cents >= 0);

/** Cancels a live hire on behalf of one of the parties, e.g. after a dispute. */
create or replace function public.admin_cancel_booking(p_booking uuid, p_reason text)
returns public.bookings
language plpgsql security definer set search_path = '' as $$
declare
  a public.profiles := private.require_admin();
  b public.bookings;
  reason text := left(trim(coalesce(p_reason, '')), 300);
  title text;
begin
  if length(reason) < 5 then
    perform private.fail('Say why the hire is being cancelled.', '22023');
  end if;
  perform private.trust();
  select * into b from public.bookings where id = p_booking for update;
  if b.id is null then perform private.fail('Booking not found.', 'P0002'); end if;
  if b.status in ('cancelled', 'completed', 'declined') then
    perform private.fail('That hire is already finished.', '22023');
  end if;
  update public.bookings set status = 'cancelled', decline_reason = reason where id = b.id returning * into b;
  select m.title into title from public.machines m where m.id = b.machine_id;
  perform private.system_message(private.conversation_for(b), 'SiteRun cancelled this hire: ' || reason);
  perform private.log_event(b.id, 'cancelled', jsonb_build_object('by', 'admin', 'reason', reason));
  perform private.notify_org(b.contractor_org_id, 'booking', 'Hire Cancelled by SiteRun', title || ' · ' || b.ref, reason, '/bookings/' || b.id);
  perform private.notify_org(b.supplier_org_id, 'booking', 'Hire Cancelled by SiteRun', title || ' · ' || b.ref, reason, '/supplier/bookings/' || b.id);
  insert into public.admin_actions (admin_id, kind, title, detail, target_type, target_id)
  values (a.id, 'booking_cancelled', 'Hire cancelled', b.ref || ' · ' || reason, 'booking', b.id);
  return b;
end $$;
revoke execute on function public.admin_cancel_booking(uuid, text) from public, anon;
grant execute on function public.admin_cancel_booking(uuid, text) to authenticated;

/** Changes a hire's end date and/or total after agreeing a fix with both parties. */
create or replace function public.admin_adjust_booking(
  p_booking uuid, p_end_date date, p_total_cents integer, p_reason text
) returns public.bookings
language plpgsql security definer set search_path = '' as $$
declare
  a public.profiles := private.require_admin();
  b public.bookings;
  reason text := left(trim(coalesce(p_reason, '')), 300);
  changes text := '';
begin
  if length(reason) < 5 then
    perform private.fail('Say why the hire is being changed.', '22023');
  end if;
  perform private.trust();
  select * into b from public.bookings where id = p_booking for update;
  if b.id is null then perform private.fail('Booking not found.', 'P0002'); end if;
  if b.status in ('cancelled', 'declined') then
    perform private.fail('That hire is no longer live.', '22023');
  end if;
  if p_end_date is not null then
    if p_end_date < b.start_date then perform private.fail('The end date can’t be before the start.', '22023'); end if;
    changes := 'end date ' || to_char(b.end_date, 'FMDD Mon') || ' → ' || to_char(p_end_date, 'FMDD Mon');
  end if;
  if p_total_cents is not null then
    if p_total_cents < 0 or p_total_cents > 100000000 then perform private.fail('Enter a total between $0 and $1,000,000.', '22023'); end if;
    changes := concat_ws(', ', nullif(changes, ''), 'total ' || private.money(b.total_cents) || ' → ' || private.money(p_total_cents));
  end if;
  if changes = '' then
    perform private.fail('Change the end date or the total.', '22023');
  end if;
  begin
    update public.bookings
      set end_date = coalesce(p_end_date, end_date),
          total_cents = coalesce(p_total_cents, total_cents)
      where id = b.id returning * into b;
  exception when exclusion_violation then
    perform private.fail('The machine is booked by someone else for part of that time.', '23P01');
  end;
  perform private.system_message(private.conversation_for(b), 'SiteRun updated this hire (' || changes || '): ' || reason);
  perform private.log_event(b.id, 'adjusted', jsonb_build_object('changes', changes, 'reason', reason));
  perform private.notify_org(b.contractor_org_id, 'booking', 'Hire Updated by SiteRun', b.ref, changes, '/bookings/' || b.id);
  perform private.notify_org(b.supplier_org_id, 'booking', 'Hire Updated by SiteRun', b.ref, changes, '/supplier/bookings/' || b.id);
  insert into public.admin_actions (admin_id, kind, title, detail, target_type, target_id)
  values (a.id, 'booking_adjusted', 'Hire adjusted', b.ref || ' · ' || changes, 'booking', b.id);
  return b;
end $$;
revoke execute on function public.admin_adjust_booking(uuid, date, integer, text) from public, anon;
grant execute on function public.admin_adjust_booking(uuid, date, integer, text) to authenticated;

/**
 * Records money returned to a customer. With Stripe on, the payments Edge Function refunds
 * the charge first and then calls this through record_refund(); in mock mode the admin
 * screen calls it directly.
 */
create or replace function private.record_refund(
  p_admin uuid, p_payment uuid, p_amount integer, p_reason text, p_ref text
) returns public.payments
language plpgsql security definer set search_path = '' as $$
declare
  pay public.payments;
  org_name text;
begin
  perform private.trust();
  select * into pay from public.payments where id = p_payment for update;
  if pay.id is null then perform private.fail('Payment not found.', 'P0002'); end if;
  if pay.kind = 'refund' then perform private.fail('That is already a refund.', '22023'); end if;
  if p_amount is null or p_amount <= 0 or p_amount > pay.amount_cents - pay.refunded_cents then
    perform private.fail('Refund up to ' || private.money(pay.amount_cents - pay.refunded_cents) || '.', '22023');
  end if;
  if p_ref is not null and exists (select 1 from public.payments where provider_ref = p_ref) then
    return pay;
  end if;
  update public.payments set refunded_cents = refunded_cents + p_amount where id = pay.id returning * into pay;
  insert into public.payments (org_id, amount_cents, method_id, kind, description, provider_ref)
  values (pay.org_id, p_amount, pay.method_id, 'refund', left('Refund: ' || p_reason, 200), p_ref);
  select name into org_name from public.organisations where id = pay.org_id;
  perform private.notify_org(pay.org_id, 'invoice', 'Refund Issued',
    private.money(p_amount) || ' has been refunded to your card.', p_reason, '/payments');
  insert into public.admin_actions (admin_id, kind, title, detail, target_type, target_id)
  values (p_admin, 'refund', 'Refund issued', private.money(p_amount) || ' to ' || org_name || ' · ' || p_reason, 'payment', pay.id);
  return pay;
end $$;
revoke execute on function private.record_refund(uuid, uuid, integer, text, text) from public, anon, authenticated;

create or replace function public.admin_refund_payment(p_payment uuid, p_amount integer, p_reason text)
returns public.payments
language plpgsql security definer set search_path = '' as $$
declare
  a public.profiles := private.require_admin();
  reason text := left(trim(coalesce(p_reason, '')), 200);
begin
  if length(reason) < 5 then
    perform private.fail('Say why the money is being refunded.', '22023');
  end if;
  if private.payments_provider() = 'stripe' then
    perform private.fail('Refunds go through Stripe. Update the app and try again.', '42501');
  end if;
  return private.record_refund(a.id, p_payment, p_amount, reason, null);
end $$;
revoke execute on function public.admin_refund_payment(uuid, integer, text) from public, anon;
grant execute on function public.admin_refund_payment(uuid, integer, text) to authenticated;

/** The payments an admin can refund for one booking's organisation. */
create or replace function public.admin_payments(p_booking uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  b public.bookings;
begin
  perform private.require_admin();
  select * into b from public.bookings where id = p_booking;
  if b.id is null then perform private.fail('Booking not found.', 'P0002'); end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', p.id, 'amountCents', p.amount_cents, 'refundedCents', p.refunded_cents,
      'kind', p.kind, 'description', p.description, 'createdAt', p.created_at
    ) order by p.created_at desc)
    from public.payments p
    where p.org_id = b.contractor_org_id and p.kind <> 'refund' and p.amount_cents > p.refunded_cents
  ), '[]'::jsonb);
end $$;
revoke execute on function public.admin_payments(uuid) from public, anon;
grant execute on function public.admin_payments(uuid) to authenticated;

-- Refunds are recorded by the Edge Function after Stripe confirms them.
create or replace function public.stripe_record_refund(
  p_admin uuid, p_payment uuid, p_amount integer, p_reason text, p_ref text
) returns public.payments
language plpgsql security definer set search_path = '' as $$
begin
  return private.record_refund(p_admin, p_payment, p_amount, p_reason, p_ref);
end $$;
revoke execute on function public.stripe_record_refund(uuid, uuid, integer, text, text) from public, anon, authenticated;
grant execute on function public.stripe_record_refund(uuid, uuid, integer, text, text) to service_role;

/** What the payments function needs to refund through Stripe, for a platform admin. */
create or replace function public.admin_refund_context(p_payment uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  a public.profiles := private.require_admin();
  pay public.payments;
begin
  select * into pay from public.payments where id = p_payment;
  if pay.id is null then perform private.fail('Payment not found.', 'P0002'); end if;
  return jsonb_build_object(
    'admin_id', a.id,
    'payment_id', pay.id,
    'provider_ref', pay.provider_ref,
    'refundable_cents', pay.amount_cents - pay.refunded_cents,
    'provider', private.payments_provider()
  );
end $$;
revoke execute on function public.admin_refund_context(uuid) from public, anon;
grant execute on function public.admin_refund_context(uuid) to authenticated;
