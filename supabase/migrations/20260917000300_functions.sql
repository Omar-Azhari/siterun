-- Read views and business functions. Functions are SECURITY DEFINER with an empty
-- search_path; each checks the caller before acting and sets app.bypass so the guard
-- triggers let trusted changes through.

-- ---------------------------------------------------------------------------
-- Read models (security_invoker: the caller's RLS applies)
-- ---------------------------------------------------------------------------
create or replace view public.machine_details with (security_invoker = true) as
select
  m.*,
  o.name as supplier_name,
  o.rating as supplier_rating,
  o.review_count as supplier_reviews,
  coalesce((select array_agg(p.url order by p.sort_order, p.created_at) from public.machine_photos p where p.machine_id = m.id), '{}') as photos
from public.machines m
join public.organisations o on o.id = m.supplier_org_id;

create or replace view public.booking_details with (security_invoker = true) as
select
  b.*,
  to_jsonb(md) as machine,
  to_jsonb(s) as site,
  to_jsonb(c) as contractor,
  to_jsonb(su) as supplier,
  coalesce(case when cr.org_id = b.contractor_org_id then cr.full_name end, nullif(s.contact_name, ''), c.contact_name) as contact_name,
  coalesce(case when cr.org_id = b.contractor_org_id then cr.phone end, nullif(s.contact_phone, ''), c.phone) as contact_phone,
  coalesce(s.address || ', ' || s.suburb || ' ' || s.state || ' ' || s.postcode, c.address) as delivery_address,
  (b.end_date - b.start_date + 1) as days
from public.bookings b
join public.machine_details md on md.id = b.machine_id
join public.organisations c on c.id = b.contractor_org_id
join public.organisations su on su.id = b.supplier_org_id
left join public.sites s on s.id = b.site_id
left join public.profiles cr on cr.id = b.created_by;

create or replace view public.conversation_list with (security_invoker = true) as
select
  cv.id,
  cv.booking_id,
  cv.subtitle,
  coalesce(lm.body, cv.last_message) as last_message,
  coalesce(lm.created_at, cv.last_message_at) as last_message_at,
  other.name as title,
  other.id as other_org_id,
  (select count(*) from public.messages x
    where x.conversation_id = cv.id and not x.system and x.read_at is null
      and coalesce(x.sender_org_id, '00000000-0000-0000-0000-000000000000') <> private.my_org())::int as unread_count,
  array(select org_id from public.conversation_participants where conversation_id = cv.id) as participant_org_ids
from public.conversations cv
left join lateral (
  select m.body, m.created_at from public.messages m where m.conversation_id = cv.id order by m.created_at desc limit 1
) lm on true
left join lateral (
  select o.id, o.name from public.conversation_participants p join public.organisations o on o.id = p.org_id
  where p.conversation_id = cv.id and p.org_id <> coalesce(private.my_org(), '00000000-0000-0000-0000-000000000000')
  limit 1
) other on true;

grant select on public.machine_details, public.booking_details, public.conversation_list to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Internal helpers
-- ---------------------------------------------------------------------------
create or replace function private.trust() returns void
language sql as $$ select set_config('app.bypass', 'on', true) $$;

create or replace function private.fail(msg text, code text default 'P0001') returns void
language plpgsql as $$
begin
  raise exception '%', msg using errcode = code;
end $$;

create or replace function private.me() returns public.profiles
language plpgsql stable security definer set search_path = '' as $$
declare p public.profiles;
begin
  select * into p from public.profiles where id = auth.uid();
  if p.id is null then
    raise exception 'Please log in to continue.' using errcode = '28000';
  end if;
  return p;
end $$;

create or replace function private.notify_org(org uuid, kind public.notification_type, title text, body text, detail text, link text)
returns void language sql security definer set search_path = '' as $$
  insert into public.notifications (profile_id, type, title, body, detail, link)
  select p.id, kind, title, body, detail, link
  from public.profiles p
  where p.org_id = org and p.account_type <> 'operator'
$$;

create or replace function private.notify_admins(kind public.notification_type, title text, body text, detail text, link text)
returns void language sql security definer set search_path = '' as $$
  insert into public.notifications (profile_id, type, title, body, detail, link)
  select p.id, kind, title, body, detail, link from public.profiles p where p.is_platform_admin
$$;

create or replace function private.conversation_for(b public.bookings) returns uuid
language plpgsql security definer set search_path = '' as $$
declare conv uuid;
begin
  select id into conv from public.conversations where booking_id = b.id;
  if conv is null then
    insert into public.conversations (booking_id, subtitle)
    values (b.id, (select title from public.machines where id = b.machine_id) || ' · ' || b.ref)
    returning id into conv;
    insert into public.conversation_participants (conversation_id, org_id)
    values (conv, b.contractor_org_id), (conv, b.supplier_org_id)
    on conflict do nothing;
  end if;
  return conv;
end $$;

create or replace function private.system_message(conv uuid, body text) returns void
language sql security definer set search_path = '' as $$
  insert into public.messages (conversation_id, sender_name, body, system) values (conv, 'SiteRun', body, true);
  update public.conversations set last_message = body, last_message_at = now() where id = conv;
$$;

create or replace function private.log_event(b uuid, kind text, data jsonb default '{}') returns void
language sql security definer set search_path = '' as $$
  insert into public.booking_events (booking_id, kind, actor_id, data) values (b, kind, auth.uid(), data)
$$;

create or replace function private.extension_rate(daily integer, days integer) returns integer
language sql immutable as $$
  select case when days >= 14 then greatest(daily - 4000, 0) when days >= 7 then greatest(daily - 2000, 0) else daily end
$$;

create or replace function private.money(cents bigint) returns text
language sql immutable as $$ select '$' || to_char(cents / 100.0, 'FM999,999,990') $$;

create or replace function private.require_contractor_writer() returns public.profiles
language plpgsql security definer set search_path = '' as $$
declare p public.profiles;
begin
  p := private.me();
  if private.my_org_kind() is distinct from 'contractor' then
    perform private.fail('Only contractor accounts can hire equipment.', '42501');
  end if;
  if private.my_role() = 'viewer' then
    perform private.fail('Viewers can’t create or change bookings.', '42501');
  end if;
  return p;
end $$;

create or replace function private.require_supplier() returns public.profiles
language plpgsql security definer set search_path = '' as $$
declare p public.profiles;
begin
  p := private.me();
  if private.my_org_kind() is distinct from 'supplier' or p.account_type = 'operator' then
    perform private.fail('Supplier access only.', '42501');
  end if;
  return p;
end $$;

create or replace function private.require_admin() returns public.profiles
language plpgsql security definer set search_path = '' as $$
declare p public.profiles;
begin
  p := private.me();
  if not p.is_platform_admin then
    perform private.fail('Platform admin access only.', '42501');
  end if;
  return p;
end $$;

-- ---------------------------------------------------------------------------
-- Onboarding & team
-- ---------------------------------------------------------------------------
create or replace function public.complete_business_profile(p_company_name text, p_abn text, p_contact_name text, p_email text, p_phone text, p_address text)
returns public.organisations
language plpgsql security definer set search_path = '' as $$
declare
  p public.profiles := private.me();
  o public.organisations;
  digits text := regexp_replace(p_abn, '\D', '', 'g');
  weights int[] := array[10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19];
  total int := 0;
begin
  perform private.trust();
  if p.org_id is not null then
    perform private.fail('Your business profile is already set up.', '23505');
  end if;
  if length(digits) <> 11 then
    perform private.fail('Enter a valid 11-digit ABN.', '22023');
  end if;
  for i in 1..11 loop
    total := total + (substr(digits, i, 1)::int - case when i = 1 then 1 else 0 end) * weights[i];
  end loop;
  if total % 89 <> 0 then
    perform private.fail('Enter a valid 11-digit ABN.', '22023');
  end if;
  insert into public.organisations (kind, name, abn, contact_name, email, phone, address, created_by)
  values (
    case when p.account_type in ('supplier', 'operator') then 'supplier'::public.org_kind else 'contractor'::public.org_kind end,
    trim(p_company_name), substr(digits, 1, 2) || ' ' || substr(digits, 3, 3) || ' ' || substr(digits, 6, 3) || ' ' || substr(digits, 9, 3),
    trim(p_contact_name), lower(trim(p_email)), trim(p_phone), trim(p_address), p.id
  )
  returning * into o;
  update public.profiles set org_id = o.id where id = p.id;
  insert into public.org_members (org_id, profile_id, name, email, role) values (o.id, p.id, p.full_name, p.email, 'owner');
  -- Pending invitations for other emails are accepted at sign-in (accept_invitations).
  if o.kind = 'supplier' then
    insert into public.admin_actions (kind, title, detail, target_type, target_id) values ('supplier_registered', 'New supplier registration', o.name, 'organisation', o.id);
  end if;
  return o;
end $$;

-- Joins an organisation the user was invited to (called after sign-up/login).
create or replace function public.accept_invitations() returns integer
language plpgsql security definer set search_path = '' as $$
declare
  p public.profiles := private.me();
  inv public.invitations;
begin
  perform private.trust();
  if p.org_id is not null then
    return 0;
  end if;
  select * into inv from public.invitations where lower(email) = lower(p.email) and status = 'pending' order by created_at limit 1;
  if inv.id is null then
    return 0;
  end if;
  update public.profiles set org_id = inv.org_id where id = p.id;
  insert into public.org_members (org_id, profile_id, name, email, role)
  values (inv.org_id, p.id, p.full_name, p.email, inv.role)
  on conflict (org_id, email) do update set profile_id = excluded.profile_id, role = excluded.role;
  update public.invitations set status = 'accepted' where id = inv.id;
  return 1;
end $$;

create or replace function public.invite_members(invites jsonb) returns setof public.invitations
language plpgsql security definer set search_path = '' as $$
declare
  p public.profiles := private.me();
  item jsonb;
  e text;
begin
  perform private.trust();
  if private.my_role() not in ('owner', 'project_manager') then
    perform private.fail('Only owners and project managers can invite people.', '42501');
  end if;
  for item in select * from jsonb_array_elements(invites) loop
    e := lower(trim(item ->> 'email'));
    if e !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
      perform private.fail('Enter a valid email address: ' || e, '22023');
    end if;
    return query
      insert into public.invitations (org_id, email, role, invited_by)
      values (p.org_id, e, (item ->> 'role')::public.member_role, p.id)
      on conflict (org_id, lower(email)) where status = 'pending' do update set role = excluded.role
      returning *;
  end loop;
end $$;

create or replace function public.update_member_role(member uuid, new_role public.member_role) returns void
language plpgsql security definer set search_path = '' as $$
declare p public.profiles := private.me();
begin
  perform private.trust();
  if private.my_role() <> 'owner' then
    perform private.fail('Only owners can change roles.', '42501');
  end if;
  update public.org_members set role = new_role where id = member and org_id = p.org_id and profile_id is distinct from p.id;
  if not found then
    perform private.fail('Member not found.', 'P0002');
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Plans & payments (mock provider: rows are real, no card is charged)
-- ---------------------------------------------------------------------------
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
    insert into public.payments (org_id, amount_cents, method_id, kind, description)
    values (p.org_id, amount + round(amount * 0.1), method, 'subscription', initcap(p_plan::text) || ' plan (' || p_period || ')');
  end if;
  if p_credits_pack is not null then
    bonus := case p_credits_pack when 50000 then 5000 when 100000 then 12000 when 250000 then 35000 end;
    if bonus is null then
      perform private.fail('Unknown SiteCredits pack.', '22023');
    end if;
    if method is null then
      perform private.fail('Add a card before buying SiteCredits.', '22023');
    end if;
    insert into public.payments (org_id, amount_cents, method_id, kind, description) values (p.org_id, p_credits_pack, method, 'credits', 'SiteCredits pack');
    insert into public.credit_transactions (org_id, credits, amount_cents, description)
    values (p.org_id, (p_credits_pack + bonus) / 100, p_credits_pack, 'SiteCredits pack (+' || bonus / 100 || ' bonus)');
    update public.subscriptions set credits_balance = credits_balance + (p_credits_pack + bonus) / 100 where org_id = p.org_id returning * into s;
  end if;
  return s;
end $$;

create or replace function public.account_balance() returns integer
language sql stable security definer set search_path = '' as $$
  select coalesce(sum(amount_cents + gst_cents), 0)::int from public.invoices where org_id = private.my_org() and status <> 'paid'
$$;

create or replace function public.make_payment(p_amount integer, p_method uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  p public.profiles := private.me();
  remaining int := p_amount;
  inv record;
begin
  perform private.trust();
  if not exists (select 1 from public.payment_methods where id = p_method and org_id = p.org_id) then
    perform private.fail('Choose a saved card.', '22023');
  end if;
  if p_amount is null or p_amount <= 0 then
    perform private.fail('Enter an amount above $0.', '22023');
  end if;
  if p_amount > public.account_balance() then
    perform private.fail('That’s more than your balance.', '22023');
  end if;
  for inv in select * from public.invoices where org_id = p.org_id and status <> 'paid' order by due_date loop
    exit when remaining < inv.amount_cents + inv.gst_cents;
    update public.invoices set status = 'paid' where id = inv.id;
    remaining := remaining - (inv.amount_cents + inv.gst_cents);
  end loop;
  insert into public.payments (org_id, amount_cents, method_id, kind, description) values (p.org_id, p_amount, p_method, 'balance', 'Account payment');
end $$;

-- ---------------------------------------------------------------------------
-- Search (live only, free for the dates, within the supplier's service radius)
-- ---------------------------------------------------------------------------
create or replace function private.distance_km(lat1 double precision, lng1 double precision, lat2 double precision, lng2 double precision)
returns double precision language sql immutable as $$
  select 2 * 6371 * asin(sqrt(
    power(sin(radians(lat2 - lat1) / 2), 2) + cos(radians(lat1)) * cos(radians(lat2)) * power(sin(radians(lng2 - lng1) / 2), 2)
  ))
$$;

create or replace function public.search_machines(
  p_q text default null, p_category_slug text default null, p_lat double precision default null, p_lng double precision default null,
  p_start_date date default null, p_end_date date default null, p_min_tonnes numeric default null, p_max_tonnes numeric default null,
  p_min_price integer default null, p_max_price integer default null, p_hire public.hire_type default null,
  p_sort text default 'relevance', p_page integer default 1, p_page_size integer default 10
) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare result jsonb;
begin
  with matches as (
    select m.id,
      case when p_hire = 'wet' then coalesce(m.rate_wet_daily, m.rate_daily) else m.rate_daily end as price,
      o.rating,
      case when p_lat is null then 0 else private.distance_km(p_lat, p_lng, m.lat, m.lng) end as km
    from public.machines m
    join public.organisations o on o.id = m.supplier_org_id
    join public.machine_categories c on c.id = m.category_id
    where m.status = 'live'
      and (p_category_slug is null or c.slug = p_category_slug)
      and (p_q is null or p_q = '' or (m.title || ' ' || m.make || ' ' || m.model || ' ' || c.name || ' ' || o.name) ilike '%' || regexp_replace(trim(p_q), 's$', '') || '%')
      and (p_hire is null or p_hire = any (m.hire_types))
      and (p_min_tonnes is null or m.capacity_tonnes is null or m.capacity_tonnes >= p_min_tonnes)
      and (p_max_tonnes is null or m.capacity_tonnes is null or m.capacity_tonnes <= p_max_tonnes)
      and (p_lat is null or private.distance_km(p_lat, p_lng, m.lat, m.lng) <= m.service_radius_km)
      and (p_start_date is null or p_end_date is null or not exists (
        select 1 from public.bookings b
        where b.machine_id = m.id
          and b.status in ('confirmed', 'in_transit', 'on_site', 'return_scheduled')
          and daterange(b.start_date, b.end_date, '[]') && daterange(p_start_date, p_end_date, '[]')
      ))
  ), priced as (
    select * from matches
    where (p_min_price is null or price >= p_min_price * 100) and (p_max_price is null or price <= p_max_price * 100)
  ), ordered as (
    select id, row_number() over (
      order by
        case when p_sort = 'price_asc' then price end asc,
        case when p_sort = 'price_desc' then price end desc,
        case when p_sort = 'rating' then rating end desc nulls last,
        km asc
    ) as rn
    from priced
  )
  select jsonb_build_object(
    'total', (select count(*) from priced),
    'ids', coalesce((select jsonb_agg(id order by rn) from ordered where rn > (greatest(p_page, 1) - 1) * p_page_size and rn <= greatest(p_page, 1) * p_page_size), '[]')
  ) into result;
  return result;
end $$;

-- ---------------------------------------------------------------------------
-- Bookings
-- ---------------------------------------------------------------------------
create or replace function public.create_booking(
  p_machine uuid, p_start_date date, p_end_date date, p_quantity integer, p_hire public.hire_type,
  p_delivery public.delivery_method, p_insurance boolean, p_site uuid, p_message text default ''
) returns public.bookings
language plpgsql security definer set search_path = '' as $$
declare
  p public.profiles := private.require_contractor_writer();
  m public.machines;
  b public.bookings;
  rate int;
  conv uuid;
begin
  perform private.trust();
  select * into m from public.machines where id = p_machine and status = 'live';
  if m.id is null then perform private.fail('This machine is no longer available.', 'P0002'); end if;
  if p_end_date < p_start_date then perform private.fail('End date must be on or after the start date.', '22023'); end if;
  if p_start_date < current_date then perform private.fail('Start date can’t be in the past.', '22023'); end if;
  if p_quantity not between 1 and 5 then perform private.fail('Quantity must be between 1 and 5.', '22023'); end if;
  if not p_hire = any (m.hire_types) then perform private.fail('That hire type isn’t offered for this machine.', '22023'); end if;
  if p_site is not null and not exists (select 1 from public.sites where id = p_site and org_id = p.org_id) then
    perform private.fail('Choose one of your sites.', '22023');
  end if;
  if exists (
    select 1 from public.bookings x where x.machine_id = m.id and x.status in ('confirmed', 'in_transit', 'on_site', 'return_scheduled')
      and daterange(x.start_date, x.end_date, '[]') && daterange(p_start_date, p_end_date, '[]')
  ) then
    perform private.fail('This machine is already booked for those dates.', '23P01');
  end if;
  rate := case when p_hire = 'wet' then coalesce(m.rate_wet_daily, m.rate_daily) else m.rate_daily end;
  insert into public.bookings (
    ref, machine_id, contractor_org_id, supplier_org_id, site_id, created_by, start_date, end_date, quantity,
    hire_type, delivery, insurance, daily_rate, total_cents, customer_message
  ) values (
    'SR-' || extract(year from p_start_date)::int || '-' || lpad(nextval('public.booking_ref_seq')::text, 4, '0'),
    m.id, p.org_id, m.supplier_org_id, p_site, p.id, p_start_date, p_end_date, p_quantity,
    p_hire, p_delivery, p_insurance, rate, (p_end_date - p_start_date + 1) * rate * p_quantity, coalesce(left(p_message, 500), '')
  ) returning * into b;
  conv := private.conversation_for(b);
  perform private.system_message(conv, 'Booking request ' || b.ref || ' sent to ' || (select name from public.organisations where id = m.supplier_org_id) || '.');
  if coalesce(p_message, '') <> '' then
    insert into public.messages (conversation_id, sender_id, sender_org_id, sender_name, body) values (conv, p.id, p.org_id, p.full_name, left(p_message, 2000));
  end if;
  perform private.log_event(b.id, 'requested');
  perform private.notify_org(m.supplier_org_id, 'booking', 'New Booking Request',
    (select name from public.organisations where id = p.org_id) || ' · ' || m.title, (b.end_date - b.start_date + 1) || ' days', '/supplier/bookings/' || b.id);
  return b;
end $$;

create or replace function public.respond_to_booking(booking uuid, accept boolean, reason text default null) returns public.bookings
language plpgsql security definer set search_path = '' as $$
declare
  p public.profiles := private.require_supplier();
  b public.bookings;
  title text;
  org_name text;
begin
  perform private.trust();
  select * into b from public.bookings where id = booking and supplier_org_id = p.org_id for update;
  if b.id is null then perform private.fail('Booking not found.', 'P0002'); end if;
  if b.status <> 'requested' then perform private.fail('This request has already been answered.', '23P01'); end if;
  select m.title into title from public.machines m where m.id = b.machine_id;
  select name into org_name from public.organisations where id = p.org_id;
  begin
    update public.bookings
      set status = case when accept then 'confirmed'::public.booking_status else 'declined'::public.booking_status end,
          decline_reason = case when accept then null else coalesce(nullif(trim(reason), ''), 'Not available for those dates.') end
      where id = b.id returning * into b;
  exception when exclusion_violation then
    perform private.fail('You already have a confirmed booking for this machine on those dates.', '23P01');
  end;
  perform private.system_message(private.conversation_for(b),
    case when accept then 'Booking ' || b.ref || ' was confirmed by ' || org_name || '.'
         else 'Booking ' || b.ref || ' was declined by ' || org_name || '. ' || b.decline_reason end);
  perform private.log_event(b.id, case when accept then 'confirmed' else 'declined' end, jsonb_build_object('reason', b.decline_reason));
  perform private.notify_org(b.contractor_org_id, 'booking',
    case when accept then 'Booking Confirmed' else 'Booking Declined' end, title,
    case when accept then to_char(b.start_date, 'Dy, FMDD Mon YYYY') else b.decline_reason end,
    '/bookings/' || b.id || '/confirmed');
  return b;
end $$;

create or replace function public.advance_booking(booking uuid, to_status public.booking_status) returns public.bookings
language plpgsql security definer set search_path = '' as $$
declare
  p public.profiles := private.require_supplier();
  b public.bookings;
  m public.machines;
  s public.sites;
  conv uuid;
  n int;
begin
  perform private.trust();
  select * into b from public.bookings where id = booking and supplier_org_id = p.org_id for update;
  if b.id is null then perform private.fail('Booking not found.', 'P0002'); end if;
  if not (
    (to_status = 'in_transit' and b.status = 'confirmed')
    or (to_status = 'on_site' and b.status in ('confirmed', 'in_transit'))
    or (to_status = 'completed' and b.status in ('on_site', 'return_scheduled'))
  ) then
    perform private.fail('Can’t move a ' || replace(b.status::text, '_', ' ') || ' booking to ' || replace(to_status::text, '_', ' ') || '.', '22023');
  end if;
  select * into m from public.machines where id = b.machine_id;
  select * into s from public.sites where id = b.site_id;
  update public.bookings set status = to_status where id = b.id returning * into b;
  conv := private.conversation_for(b);
  if to_status = 'in_transit' then
    insert into public.deliveries (booking_id, stage, origin, destination, route, progress, picked_up_at, eta)
    values (
      b.id, 'in_transit',
      jsonb_build_object('label', m.suburb || ', ' || m.state, 'lat', m.lat, 'lng', m.lng),
      jsonb_build_object('label', coalesce(s.name || ', ' || s.suburb || ', ' || s.state, 'Site'), 'lat', coalesce(s.lat, m.lat), 'lng', coalesce(s.lng, m.lng)),
      (select jsonb_agg(jsonb_build_array(
          m.lat + (coalesce(s.lat, m.lat) - m.lat) * t / 8.0 + sin(pi() * t / 8.0) * 0.01,
          m.lng + (coalesce(s.lng, m.lng) - m.lng) * t / 8.0 - sin(pi() * t / 8.0) * 0.01) order by t)
        from generate_series(0, 8) t),
      0.05, now(), now() + interval '90 minutes'
    )
    on conflict (booking_id) do update set stage = 'in_transit', progress = 0.05, picked_up_at = now(), eta = now() + interval '90 minutes', delivered_at = null;
    perform private.system_message(conv, m.title || ' has left the yard and is on its way.');
    perform private.notify_org(b.contractor_org_id, 'delivery', 'Delivery Update', 'Machine out for delivery', m.title, '/hires/' || b.id || '/tracking');
  elsif to_status = 'on_site' then
    update public.deliveries set stage = 'delivered', progress = 1, delivered_at = now() where booking_id = b.id;
    perform private.system_message(conv, m.title || ' was delivered to site.');
    perform private.notify_org(b.contractor_org_id, 'delivery', 'Machine Delivered', m.title, 'Now on site', '/hires/' || b.id);
  else
    select 1046 + count(*) into n from public.invoices where org_id = b.contractor_org_id;
    insert into public.invoices (number, org_id, booking_id, issued_at, due_date, amount_cents, gst_cents, status, lines)
    values (
      'INV-' || n || case when exists (select 1 from public.invoices where number = 'INV-' || n) then '-' || substr(b.id::text, 1, 4) else '' end,
      b.contractor_org_id, b.id, current_date, current_date + 14, b.total_cents, round(b.total_cents * 0.1), 'due',
      jsonb_build_array(jsonb_build_object('description', m.title || ' (' || m.make || ' ' || m.model || '), ' || b.start_date || ' to ' || b.end_date, 'amountCents', b.total_cents))
    );
    perform private.system_message(conv, 'Hire ' || b.ref || ' is complete. Your invoice has been issued.');
    perform private.notify_org(b.contractor_org_id, 'invoice', 'New Invoice', 'A new invoice is available', private.money(round(b.total_cents * 1.1)::bigint), '/invoices');
  end if;
  perform private.log_event(b.id, to_status::text);
  return b;
end $$;

create or replace function private.my_booking_for_change(booking uuid) returns public.bookings
language plpgsql security definer set search_path = '' as $$
declare
  p public.profiles := private.require_contractor_writer();
  b public.bookings;
begin
  select * into b from public.bookings where id = booking and contractor_org_id = p.org_id for update;
  if b.id is null then perform private.fail('Booking not found.', 'P0002'); end if;
  return b;
end $$;

create or replace function public.extend_hire(booking uuid, new_end date) returns public.bookings
language plpgsql security definer set search_path = '' as $$
declare
  b public.bookings := private.my_booking_for_change(booking);
  extra int;
  title text;
begin
  perform private.trust();
  if b.status not in ('confirmed', 'in_transit', 'on_site', 'return_scheduled') then perform private.fail('Only active hires can be extended.', '22023'); end if;
  if new_end <= b.end_date then perform private.fail('Choose an end date after the current one.', '22023'); end if;
  extra := new_end - b.end_date;
  begin
    update public.bookings
      set end_date = new_end,
          total_cents = total_cents + extra * private.extension_rate(daily_rate, extra) * quantity,
          status = case when status = 'return_scheduled' then 'on_site'::public.booking_status else status end,
          collection = case when status = 'return_scheduled' then null else collection end
      where id = b.id returning * into b;
  exception when exclusion_violation then
    perform private.fail('The machine is booked by someone else for part of that time.', '23P01');
  end;
  select m.title into title from public.machines m where m.id = b.machine_id;
  perform private.system_message(private.conversation_for(b), 'Hire ' || b.ref || ' extended by ' || extra || ' days to ' || to_char(new_end, 'Dy FMDD Mon') || '.');
  perform private.log_event(b.id, 'extended', jsonb_build_object('days', extra));
  perform private.notify_org(b.supplier_org_id, 'booking', 'Hire Extended', title || ' · ' || b.ref, '+' || extra || ' days', '/supplier/bookings/' || b.id);
  return b;
end $$;

create or replace function public.schedule_return(booking uuid, collect_on date, slot text, notes text default '') returns public.bookings
language plpgsql security definer set search_path = '' as $$
declare
  b public.bookings := private.my_booking_for_change(booking);
  title text;
begin
  perform private.trust();
  if b.status not in ('on_site', 'return_scheduled') then perform private.fail('Only machines on site can be returned.', '22023'); end if;
  if collect_on < current_date then perform private.fail('Collection date can’t be in the past.', '22023'); end if;
  if slot not in ('morning', 'afternoon') then perform private.fail('Choose morning or afternoon.', '22023'); end if;
  update public.bookings
    set status = 'return_scheduled', collection = jsonb_build_object('date', collect_on, 'slot', slot, 'notes', left(coalesce(notes, ''), 250))
    where id = b.id returning * into b;
  select m.title into title from public.machines m where m.id = b.machine_id;
  perform private.system_message(private.conversation_for(b), 'Collection requested for ' || to_char(collect_on, 'Dy FMDD Mon') || ' (' || slot || ').');
  perform private.log_event(b.id, 'return_scheduled', b.collection);
  perform private.notify_org(b.supplier_org_id, 'booking', 'Return Scheduled', title || ' · ' || b.ref, to_char(collect_on, 'FMDD Mon') || ', ' || slot, '/supplier/bookings/' || b.id);
  return b;
end $$;

create or replace function public.smart_swap(booking uuid, option text) returns public.bookings
language plpgsql security definer set search_path = '' as $$
declare
  b public.bookings := private.my_booking_for_change(booking);
  delta int := case option when 'same' then 0 when 'upgrade' then 5000 when 'downgrade' then -4000 end;
  label text := case option when 'same' then 'Same-Class Swap' when 'upgrade' then 'Upgrade' when 'downgrade' then 'Downgrade' end;
  from_day date;
begin
  perform private.trust();
  if delta is null then perform private.fail('Unknown swap option.', '22023'); end if;
  if b.status not in ('confirmed', 'in_transit', 'on_site', 'return_scheduled') then perform private.fail('Only active hires can be swapped.', '22023'); end if;
  from_day := greatest(current_date, b.start_date);
  update public.bookings
    set daily_rate = greatest(daily_rate + delta, 0),
        total_cents = (from_day - start_date) * daily_rate * quantity + (end_date - from_day + 1) * greatest(daily_rate + delta, 0) * quantity
    where id = b.id returning * into b;
  perform private.system_message(private.conversation_for(b), 'Smart Swap requested: ' || label || '. The supplier will confirm availability and collection details.');
  perform private.log_event(b.id, 'smart_swap', jsonb_build_object('option', option));
  perform private.notify_org(b.supplier_org_id, 'booking', 'Smart Swap Requested', label || ' · ' || b.ref, 'Confirm availability', '/supplier/bookings/' || b.id);
  return b;
end $$;

create or replace function public.cancel_booking(booking uuid) returns public.bookings
language plpgsql security definer set search_path = '' as $$
declare b public.bookings := private.my_booking_for_change(booking);
begin
  perform private.trust();
  if b.status not in ('requested', 'confirmed') then perform private.fail('This booking can no longer be cancelled.', '22023'); end if;
  update public.bookings set status = 'cancelled' where id = b.id returning * into b;
  perform private.system_message(private.conversation_for(b), 'Booking ' || b.ref || ' was cancelled by the customer.');
  perform private.log_event(b.id, 'cancelled');
  perform private.notify_org(b.supplier_org_id, 'booking', 'Booking Cancelled', b.ref, '', '/supplier/bookings/' || b.id);
  return b;
end $$;

-- ---------------------------------------------------------------------------
-- Messaging
-- ---------------------------------------------------------------------------
create or replace function public.open_conversation(booking uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare b public.bookings;
begin
  perform private.trust();
  select * into b from public.bookings where id = booking;
  if b.id is null or not private.can_see_booking(b) then perform private.fail('Booking not found.', 'P0002'); end if;
  return private.conversation_for(b);
end $$;

create or replace function public.mark_conversation_read(conv uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not private.in_conversation(conv) then perform private.fail('Conversation not found.', 'P0002'); end if;
  update public.messages set read_at = now()
  where conversation_id = conv and read_at is null and coalesce(sender_org_id, '00000000-0000-0000-0000-000000000000') <> private.my_org();
end $$;

-- Notify the other participants and bump the conversation when a user posts.
create or replace function private.after_message() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  org_name text;
  other uuid;
begin
  update public.conversations set last_message = coalesce(nullif(new.body, ''), '📎 ' || new.attachment_name), last_message_at = new.created_at where id = new.conversation_id;
  if new.system then
    return new;
  end if;
  select name into org_name from public.organisations where id = new.sender_org_id;
  for other in select org_id from public.conversation_participants where conversation_id = new.conversation_id and org_id <> new.sender_org_id loop
    perform private.notify_org(other, 'message', 'New Message', 'From ' || org_name,
      '“' || left(new.body, 40) || case when length(new.body) > 40 then '…' else '' end || '”', '/messages/' || new.conversation_id);
  end loop;
  return new;
end $$;
create trigger messages_after_insert after insert on public.messages for each row execute function private.after_message();

create or replace function public.mark_all_notifications_read() returns void
language sql security definer set search_path = '' as $$
  update public.notifications set read = true where profile_id = auth.uid() and not read
$$;

-- ---------------------------------------------------------------------------
-- Listings & compliance
-- ---------------------------------------------------------------------------
create or replace function private.missing_requirements(m public.machines, include_pending boolean)
returns text[] language sql stable security definer set search_path = '' as $$
  select coalesce(array_agg(r.name order by r.sort_order), '{}')
  from public.compliance_requirements r
  join public.machine_categories c on c.id = m.category_id and r."group" = any (c.requirement_groups)
  left join lateral (
    select d.status, d.expiry_date from public.compliance_documents d
    where d.machine_id = m.id and d.requirement_id = r.id
    order by d.uploaded_at desc limit 1
  ) ld on true
  where r.required
    and not coalesce(
      (ld.status = 'verified' and (ld.expiry_date is null or ld.expiry_date >= current_date))
      or (include_pending and ld.status = 'pending'),
      false)
$$;

create or replace function public.submit_machine(machine uuid) returns public.machines
language plpgsql security definer set search_path = '' as $$
declare
  p public.profiles := private.require_supplier();
  m public.machines;
  missing text[] := '{}';
  docs text[];
begin
  perform private.trust();
  select * into m from public.machines where id = machine and supplier_org_id = p.org_id for update;
  if m.id is null then perform private.fail('Listing not found.', 'P0002'); end if;
  if m.status not in ('draft', 'rejected') then perform private.fail('Only drafts can be submitted.', '22023'); end if;
  if m.make = '' or m.model = '' then missing := missing || 'machine details'; end if;
  if not exists (select 1 from public.machine_photos where machine_id = m.id) then missing := missing || 'at least one photo'; end if;
  if m.rate_daily <= 0 then missing := missing || 'a daily rate'; end if;
  docs := private.missing_requirements(m, true);
  if array_length(docs, 1) > 0 then missing := missing || ('documents: ' || array_to_string(docs, ', ')); end if;
  if array_length(missing, 1) > 0 then
    perform private.fail('Add ' || array_to_string(missing, '; ') || ' before submitting.', '22023');
  end if;
  update public.machines set status = 'pending_review', submitted_at = now(), rejection_reason = null where id = m.id returning * into m;
  perform private.notify_admins('listing', 'Listing Submitted', m.title || ' · ' || (select name from public.organisations where id = m.supplier_org_id), 'Awaiting review', '/admin/approvals/machines/' || m.id);
  return m;
end $$;

create or replace function public.set_machine_paused(machine uuid, paused boolean) returns public.machines
language plpgsql security definer set search_path = '' as $$
declare
  p public.profiles := private.require_supplier();
  m public.machines;
begin
  perform private.trust();
  select * into m from public.machines where id = machine and supplier_org_id = p.org_id;
  if m.id is null then perform private.fail('Listing not found.', 'P0002'); end if;
  if paused and m.status <> 'live' then perform private.fail('Only live listings can be paused.', '22023'); end if;
  if not paused and m.status <> 'paused' then perform private.fail('This listing isn’t paused.', '22023'); end if;
  if not paused and array_length(private.missing_requirements(m, false), 1) > 0 then
    perform private.fail('A required document has expired or been rejected. Upload a new copy first.', '22023');
  end if;
  update public.machines set status = case when paused then 'paused'::public.machine_status else 'live'::public.machine_status end where id = m.id returning * into m;
  return m;
end $$;

create or replace function public.review_machine(machine uuid, approve boolean, reason text default null) returns public.machines
language plpgsql security definer set search_path = '' as $$
declare
  a public.profiles := private.require_admin();
  m public.machines;
  org_name text;
  missing text[];
begin
  perform private.trust();
  select * into m from public.machines where id = machine for update;
  if m.id is null then perform private.fail('Listing not found.', 'P0002'); end if;
  if m.status <> 'pending_review' then perform private.fail('This listing isn’t waiting for review.', '23P01'); end if;
  select name into org_name from public.organisations where id = m.supplier_org_id;
  if approve then
    missing := private.missing_requirements(m, false);
    if array_length(missing, 1) > 0 then
      perform private.fail('Verify these documents first: ' || array_to_string(missing, ', ') || '.', '22023');
    end if;
    update public.machines set status = 'live', approved_at = now(), approved_by = a.id where id = m.id returning * into m;
    perform private.notify_org(m.supplier_org_id, 'listing', 'Your listing is live!', m.title || ' · ' || m.make || ' ' || m.model, 'Now visible to customers', '/supplier/machines/' || m.id || '/live');
    insert into public.admin_actions (admin_id, kind, title, detail, target_type, target_id) values (a.id, 'machine_approved', 'Machine approved', m.title || ' – ' || org_name, 'machine', m.id);
  else
    if coalesce(trim(reason), '') = '' then perform private.fail('Add a reason so the supplier knows what to fix.', '22023'); end if;
    update public.machines set status = 'rejected', rejection_reason = trim(reason) where id = m.id returning * into m;
    perform private.notify_org(m.supplier_org_id, 'listing', 'Listing Needs Changes', m.title || ' · ' || m.make || ' ' || m.model, trim(reason), '/supplier/machines/' || m.id || '/review');
    insert into public.admin_actions (admin_id, kind, title, detail, target_type, target_id) values (a.id, 'machine_rejected', 'Machine rejected', m.title || ' – ' || org_name, 'machine', m.id);
  end if;
  return m;
end $$;

create or replace function public.review_document(doc uuid, approve boolean, reason text default null) returns public.compliance_documents
language plpgsql security definer set search_path = '' as $$
declare
  a public.profiles := private.require_admin();
  d public.compliance_documents;
  req_name text;
  org_name text;
begin
  perform private.trust();
  if not approve and coalesce(trim(reason), '') = '' then perform private.fail('Add a reason so the supplier knows what to fix.', '22023'); end if;
  update public.compliance_documents
    set status = case when approve then 'verified'::public.document_status else 'rejected'::public.document_status end,
        rejection_reason = case when approve then null else trim(reason) end,
        reviewed_by = a.id, reviewed_at = now()
    where id = doc returning * into d;
  if d.id is null then perform private.fail('Document not found.', 'P0002'); end if;
  select name into req_name from public.compliance_requirements where id = d.requirement_id;
  select name into org_name from public.organisations where id = d.org_id;
  perform private.notify_org(d.org_id, 'document', case when approve then 'Document Verified' else 'Document Rejected' end, req_name,
    case when approve then 'Verified by SiteRun' else trim(reason) end,
    case when d.machine_id is not null then '/supplier/machines/' || d.machine_id || '/compliance' else '/supplier/compliance/alerts' end);
  if d.profile_id is not null then
    insert into public.notifications (profile_id, type, title, body, detail, link)
    values (d.profile_id, 'document', case when approve then 'Document Verified' else 'Document Rejected' end, req_name, case when approve then 'Verified by SiteRun' else trim(reason) end, '/operator/documents');
  end if;
  insert into public.admin_actions (admin_id, kind, title, detail, target_type, target_id)
  values (a.id, case when approve then 'document_verified'::public.admin_action_kind else 'document_rejected'::public.admin_action_kind end,
    case when approve then 'Document verified' else 'Document rejected' end, req_name || ' – ' || org_name, 'document', d.id);
  return d;
end $$;

create or replace function private.after_document_insert() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform private.notify_admins('document', 'Document Uploaded',
    (select name from public.compliance_requirements where id = new.requirement_id) || ' · ' || (select name from public.organisations where id = new.org_id),
    'Awaiting verification', '/admin/approvals/documents/' || new.id);
  return new;
end $$;
create trigger compliance_documents_after_insert after insert on public.compliance_documents for each row execute function private.after_document_insert();

-- Daily job: warn at 30, 14 and 7 days before expiry.
create or replace function public.run_document_expiry() returns integer
language plpgsql security definer set search_path = '' as $$
declare
  d record;
  sent int := 0;
  mark int;
begin
  perform private.trust();
  for d in
    select cd.*, r.name as req_name, (cd.expiry_date - current_date) as days_left
    from public.compliance_documents cd
    join public.compliance_requirements r on r.id = cd.requirement_id
    where cd.status = 'verified' and cd.expiry_date is not null and cd.expiry_date - current_date <= 30
  loop
    mark := case when d.days_left <= 7 then 7 when d.days_left <= 14 then 14 else 30 end;
    continue when mark = any (d.expiry_notified);
    perform private.notify_org(d.org_id, 'document', 'Document Expiring', d.req_name,
      case when d.days_left < 0 then 'Expired' else 'Expires in ' || d.days_left || ' days' end, '/supplier/compliance/alerts');
    if d.profile_id is not null then
      insert into public.notifications (profile_id, type, title, body, detail, link)
      values (d.profile_id, 'document', 'Document Expiring', d.req_name, 'Expires in ' || d.days_left || ' days', '/operator/documents');
    end if;
    update public.compliance_documents set expiry_notified = expiry_notified || mark where id = d.id;
    sent := sent + 1;
  end loop;
  -- Expired required documents take live listings offline.
  update public.machines m set status = 'paused'
  where m.status = 'live' and array_length(private.missing_requirements(m, false), 1) > 0;
  return sent;
end $$;
revoke execute on function public.run_document_expiry() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Supplier money & analytics
-- ---------------------------------------------------------------------------
create or replace function public.payout_summary() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  p public.profiles := private.require_supplier();
  earned bigint;
  paid bigint;
  opening int;
  cur record;
  prev record;
begin
  select coalesce(sum(round(total_cents * 0.9)), 0) into earned from public.bookings where supplier_org_id = p.org_id and status = 'completed';
  select coalesce(sum(amount_cents), 0) into paid from public.payouts where org_id = p.org_id;
  select opening_earnings_cents into opening from public.organisations where id = p.org_id;
  select coalesce(sum(total_cents), 0) as revenue, count(*) as hires into cur from public.bookings
    where supplier_org_id = p.org_id and status = 'completed' and end_date > current_date - 30 and end_date <= current_date;
  select coalesce(sum(total_cents), 0) as revenue, count(*) as hires into prev from public.bookings
    where supplier_org_id = p.org_id and status = 'completed' and end_date > current_date - 60 and end_date <= current_date - 30;
  return jsonb_build_object(
    'availableCents', greatest(0, opening + earned - paid),
    'totalRevenueCents', cur.revenue,
    'revenueTrend', case when prev.revenue = 0 then case when cur.revenue > 0 then 100 else 0 end else round((cur.revenue - prev.revenue) * 100.0 / prev.revenue) end,
    'completedHires', cur.hires,
    'completedTrend', case when prev.hires = 0 then case when cur.hires > 0 then 100 else 0 end else round((cur.hires - prev.hires) * 100.0 / prev.hires) end
  );
end $$;

create or replace function public.request_payout() returns public.payouts
language plpgsql security definer set search_path = '' as $$
declare
  p public.profiles := private.require_supplier();
  amount int;
  po public.payouts;
begin
  perform private.trust();
  if private.my_role() <> 'owner' then perform private.fail('Only the owner can request payouts.', '42501'); end if;
  amount := (public.payout_summary() ->> 'availableCents')::int;
  if amount <= 0 then perform private.fail('There’s nothing available to pay out yet.', '22023'); end if;
  insert into public.payouts (org_id, amount_cents, status, requested_by) values (p.org_id, amount, 'processing', p.id) returning * into po;
  insert into public.admin_actions (kind, title, detail, target_type, target_id)
  values ('payout', 'Payout requested', private.money(amount) || ' to ' || (select name from public.organisations where id = p.org_id), 'payout', po.id);
  return po;
end $$;

create or replace function public.supplier_performance(range_key text) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  p public.profiles := private.require_supplier();
  days int := case range_key when '90d' then 90 when '1y' then 365 else 30 end;
  from_d date := current_date - days;
  prev_d date := current_date - 2 * days;
  cur_hires int; prev_hires int; cur_rev bigint; prev_rev bigint;
  cur_util int; prev_util int;
  trend jsonb; top jsonb;
begin
  create temp table if not exists _perf (id uuid, machine_id uuid, start_date date, end_date date, total_cents int) on commit drop;
  truncate _perf;
  insert into _perf select id, machine_id, start_date, end_date, total_cents from public.bookings
    where supplier_org_id = p.org_id and status in ('confirmed', 'in_transit', 'on_site', 'return_scheduled', 'completed');

  select count(*), coalesce(sum(total_cents), 0) into cur_hires, cur_rev from _perf where start_date > from_d and start_date <= current_date;
  select count(*), coalesce(sum(total_cents), 0) into prev_hires, prev_rev from _perf where start_date > prev_d and start_date <= from_d;

  select least(100, round(coalesce(sum(greatest(0, least(end_date, current_date) - greatest(start_date, from_d + 1) + 1)), 0) * 100.0
      / (greatest(count(distinct machine_id), 1) * days)))
    into cur_util from _perf where start_date > from_d and start_date <= current_date;
  select least(100, round(coalesce(sum(greatest(0, least(end_date, from_d) - greatest(start_date, prev_d + 1) + 1)), 0) * 100.0
      / (greatest(count(distinct machine_id), 1) * days)))
    into prev_util from _perf where start_date > prev_d and start_date <= from_d;

  if range_key = '1y' then
    select jsonb_agg(jsonb_build_object('label', to_char(mo, 'Mon'), 'hires',
      (select count(*) from _perf x where x.start_date >= mo and x.start_date < mo + interval '1 month')) order by mo)
    into trend from generate_series(date_trunc('month', current_date) - interval '11 months', date_trunc('month', current_date), interval '1 month') mo;
  else
    select jsonb_agg(jsonb_build_object('label', to_char(d, 'FMDD Mon'), 'hires',
      (select count(*) from _perf x where x.start_date <= (d + case when days = 30 then 0 else 6 end)::date and x.end_date >= d::date)) order by d)
    into trend from generate_series(from_d + 1, current_date, case when days = 30 then interval '1 day' else interval '7 days' end) d;
  end if;

  select coalesce(jsonb_agg(t order by (t ->> 'hires')::int desc), '[]') into top from (
    select jsonb_build_object(
      'machineId', x.machine_id,
      'title', (select title from public.machines where id = x.machine_id),
      'hires', count(*),
      'utilisation', least(100, round(sum(greatest(0, least(x.end_date, current_date) - greatest(x.start_date, from_d + 1) + 1)) * 125.0 / days))
    ) as t
    from _perf x where x.start_date > from_d and x.start_date <= current_date
    group by x.machine_id order by count(*) desc limit 3
  ) s;

  return jsonb_build_object(
    'hires', cur_hires,
    'hiresTrend', case when prev_hires = 0 then case when cur_hires > 0 then 100 else 0 end else round((cur_hires - prev_hires) * 100.0 / prev_hires) end,
    'utilisation', coalesce(cur_util, 0),
    'utilisationTrend', coalesce(cur_util, 0) - coalesce(prev_util, 0),
    'revenueCents', cur_rev,
    'revenueTrend', case when prev_rev = 0 then case when cur_rev > 0 then 100 else 0 end else round((cur_rev - prev_rev) * 100.0 / prev_rev) end,
    'trend', coalesce(trend, '[]'),
    'topMachines', top
  );
end $$;

create or replace function public.admin_stats(range_key text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  days int := case range_key when '7d' then 7 when '90d' then 90 when '1y' then 365 else 30 end;
  f timestamptz := now() - make_interval(days => days);
  pf timestamptz := now() - make_interval(days => 2 * days);
  r jsonb;
begin
  perform private.require_admin();
  with c as (
    select
      (select count(*) from public.profiles) as users,
      (select count(*) from public.profiles where created_at > f) as users_cur,
      (select count(*) from public.profiles where created_at > pf and created_at <= f) as users_prev,
      (select count(*) from public.organisations where kind = 'supplier') as suppliers,
      (select count(*) from public.organisations where kind = 'supplier' and created_at > f) as sup_cur,
      (select count(*) from public.organisations where kind = 'supplier' and created_at > pf and created_at <= f) as sup_prev,
      (select count(*) from public.bookings where created_at > f) as bk_cur,
      (select count(*) from public.bookings where created_at > pf and created_at <= f) as bk_prev,
      (select coalesce(sum(amount_cents), 0) from public.payouts where coalesce(paid_at, requested_at) > f) as po_cur,
      (select coalesce(sum(amount_cents), 0) from public.payouts where coalesce(paid_at, requested_at) > pf and coalesce(paid_at, requested_at) <= f) as po_prev,
      (select count(*) from public.admin_actions where kind = 'dispute' and created_at > f) as dis_cur,
      (select count(*) from public.admin_actions where kind = 'dispute' and created_at > pf and created_at <= f) as dis_prev
  )
  select jsonb_build_object(
    'users', users, 'usersTrend', private.pct(users_cur, users_prev),
    'suppliers', suppliers, 'suppliersTrend', private.pct(sup_cur, sup_prev),
    'bookings', bk_cur, 'bookingsTrend', private.pct(bk_cur, bk_prev),
    'payoutsCents', po_cur, 'payoutsTrend', private.pct(po_cur, po_prev),
    'disputes', dis_cur, 'disputesTrend', private.pct(dis_cur, dis_prev)
  ) into r from c;
  return r;
end $$;

create or replace function private.pct(cur numeric, prev numeric) returns integer
language sql immutable as $$
  select case when prev = 0 then case when cur > 0 then 100 else 0 end else round((cur - prev) * 100 / prev)::int end
$$;

-- Everything in private is internal; expose only the public API functions.
revoke execute on all functions in schema private from public;
grant execute on all functions in schema private to authenticated, anon;
