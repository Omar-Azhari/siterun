-- Row Level Security for every table. Writes that carry business rules go through
-- security-definer functions (next migration); tables only allow simple owned writes.

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated, anon;

-- ---------------------------------------------------------------------------
-- Identity helpers (security definer so policies don't recurse)
-- ---------------------------------------------------------------------------
create or replace function private.uid() returns uuid
language sql stable as $$ select auth.uid() $$;

create or replace function private.my_org() returns uuid
language sql stable security definer set search_path = '' as $$
  select org_id from public.profiles where id = auth.uid()
$$;

create or replace function private.my_role() returns public.member_role
language sql stable security definer set search_path = '' as $$
  select role from public.org_members where profile_id = auth.uid() limit 1
$$;

create or replace function private.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select is_platform_admin from public.profiles where id = auth.uid()), false)
$$;

create or replace function private.my_account_type() returns public.account_type
language sql stable security definer set search_path = '' as $$
  select account_type from public.profiles where id = auth.uid()
$$;

create or replace function private.my_org_kind() returns public.org_kind
language sql stable security definer set search_path = '' as $$
  select o.kind from public.organisations o join public.profiles p on p.org_id = o.id where p.id = auth.uid()
$$;

-- True inside trusted server functions (they set app.bypass) or for the service role.
create or replace function private.trusted() returns boolean
language sql stable as $$
  select coalesce(current_setting('app.bypass', true), '') = 'on'
      or coalesce(auth.role(), '') = 'service_role'
      or auth.uid() is null and current_user in ('postgres', 'supabase_admin')
$$;

create or replace function private.can_see_booking(b public.bookings) returns boolean
language sql stable security definer set search_path = '' as $$
  select private.is_admin()
      or b.contractor_org_id = private.my_org()
      or b.supplier_org_id = private.my_org()
      or b.operator_profile_id = auth.uid()
$$;

create or replace function private.booking_visible(booking uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.bookings b
    where b.id = booking
      and (private.is_admin() or b.contractor_org_id = private.my_org() or b.supplier_org_id = private.my_org() or b.operator_profile_id = auth.uid())
  )
$$;

create or replace function private.in_conversation(conv uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select private.is_admin() or exists (
    select 1 from public.conversation_participants cp where cp.conversation_id = conv and cp.org_id = private.my_org()
  )
$$;

create or replace function private.shares_booking_with(org uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.bookings b
    where (b.contractor_org_id = private.my_org() and b.supplier_org_id = org)
       or (b.supplier_org_id = private.my_org() and b.contractor_org_id = org)
  )
$$;

-- ---------------------------------------------------------------------------
-- New users: create a profile from sign-up metadata. Platform admin can never be
-- set here; account_type falls back to contractor if the value is not allowed.
-- ---------------------------------------------------------------------------
create or replace function private.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  requested text := new.raw_user_meta_data ->> 'account_type';
  kind public.account_type;
begin
  kind := case when requested in ('contractor', 'supplier', 'operator', 'org_admin') then requested::public.account_type else 'contractor' end;
  insert into public.profiles (id, email, full_name, phone, account_type)
  values (
    new.id,
    lower(new.email),
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', ''),
    coalesce(new.raw_user_meta_data ->> 'phone', ''),
    kind
  )
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function private.handle_new_user();

-- Privileged profile columns can only change through trusted code.
create or replace function private.guard_profile() returns trigger
language plpgsql as $$
begin
  if not private.trusted() and (
    new.is_platform_admin is distinct from old.is_platform_admin
    or new.account_type is distinct from old.account_type
    or new.org_id is distinct from old.org_id
    or new.email is distinct from old.email
    or new.id is distinct from old.id
  ) then
    raise exception 'You can only change your name, phone and avatar.' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger profiles_guard before update on public.profiles for each row execute function private.guard_profile();

-- Listing status and approval fields only change through submit/review functions.
create or replace function private.guard_machine() returns trigger
language plpgsql as $$
begin
  if private.trusted() then
    return new;
  end if;
  if tg_op = 'INSERT' then
    if new.status <> 'draft' or new.approved_at is not null or new.submitted_at is not null then
      raise exception 'New listings start as drafts.' using errcode = '42501';
    end if;
    return new;
  end if;
  if new.status is distinct from old.status
     or new.approved_at is distinct from old.approved_at
     or new.approved_by is distinct from old.approved_by
     or new.submitted_at is distinct from old.submitted_at
     or new.supplier_org_id is distinct from old.supplier_org_id then
    raise exception 'Listing status can only change through submission and review.' using errcode = '42501';
  end if;
  if old.status in ('pending_review', 'live') then
    raise exception 'Pause this listing before editing it.' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger machines_guard before insert or update on public.machines for each row execute function private.guard_machine();

-- Document review fields only change through admin review.
create or replace function private.guard_document() returns trigger
language plpgsql as $$
begin
  if private.trusted() then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.status := 'pending';
    new.reviewed_by := null;
    new.reviewed_at := null;
    new.rejection_reason := null;
    new.uploaded_by := auth.uid();
    return new;
  end if;
  raise exception 'Documents can’t be edited after upload. Upload a new version instead.' using errcode = '42501';
end $$;
create trigger compliance_documents_guard before insert or update on public.compliance_documents for each row execute function private.guard_document();

-- ---------------------------------------------------------------------------
-- Enable RLS everywhere
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'organisations', 'profiles', 'org_members', 'invitations', 'sites', 'subscriptions', 'credit_transactions',
    'machine_categories', 'compliance_requirements', 'machines', 'machine_photos', 'compliance_documents',
    'bookings', 'booking_events', 'deliveries', 'delivery_locations', 'conversations', 'conversation_participants',
    'messages', 'invoices', 'payment_methods', 'payments', 'payouts', 'notifications', 'support_tickets',
    'reviews', 'admin_actions'
  ] loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- profiles
create policy profiles_select on public.profiles for select to authenticated using (
  id = auth.uid()
  or private.is_admin()
  or (org_id is not null and org_id = private.my_org())
  or (org_id is not null and private.shares_booking_with(org_id))
);
create policy profiles_update on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- organisations
create policy organisations_select on public.organisations for select to authenticated using (
  id = private.my_org() or kind = 'supplier' or private.is_admin() or private.shares_booking_with(id)
);
create policy organisations_select_anon on public.organisations for select to anon using (kind = 'supplier');
create policy organisations_update on public.organisations for update to authenticated
  using (id = private.my_org() and private.my_role() = 'owner')
  with check (id = private.my_org() and private.my_role() = 'owner');

-- org_members & invitations (writes via functions)
create policy org_members_select on public.org_members for select to authenticated using (org_id = private.my_org() or private.is_admin());
create policy invitations_select on public.invitations for select to authenticated using (org_id = private.my_org() or private.is_admin());

-- sites
create policy sites_select on public.sites for select to authenticated using (
  org_id = private.my_org()
  or private.is_admin()
  or exists (select 1 from public.bookings b where b.site_id = sites.id and (b.supplier_org_id = private.my_org() or b.operator_profile_id = auth.uid()))
);
create policy sites_insert on public.sites for insert to authenticated with check (
  org_id = private.my_org() and private.my_org_kind() = 'contractor' and private.my_role() in ('owner', 'project_manager')
);
create policy sites_update on public.sites for update to authenticated
  using (org_id = private.my_org() and private.my_role() in ('owner', 'project_manager', 'site_manager'))
  with check (org_id = private.my_org());

-- subscriptions & credits (writes via functions)
create policy subscriptions_select on public.subscriptions for select to authenticated using (org_id = private.my_org() or private.is_admin());
create policy credit_transactions_select on public.credit_transactions for select to authenticated using (org_id = private.my_org() or private.is_admin());

-- catalogue config (public read)
create policy categories_read on public.machine_categories for select to anon, authenticated using (true);
create policy requirements_read on public.compliance_requirements for select to anon, authenticated using (true);

-- machines
create policy machines_select on public.machines for select to anon, authenticated using (
  status = 'live'
  or supplier_org_id = private.my_org()
  or private.is_admin()
  or exists (select 1 from public.bookings b where b.machine_id = machines.id and (b.contractor_org_id = private.my_org() or b.operator_profile_id = auth.uid()))
);
create policy machines_insert on public.machines for insert to authenticated with check (
  supplier_org_id = private.my_org() and private.my_org_kind() = 'supplier' and private.my_account_type() <> 'operator'
);
create policy machines_update on public.machines for update to authenticated
  using (supplier_org_id = private.my_org() and private.my_account_type() <> 'operator')
  with check (supplier_org_id = private.my_org());
create policy machines_delete on public.machines for delete to authenticated using (
  supplier_org_id = private.my_org() and status = 'draft' and private.my_account_type() <> 'operator'
);

-- machine photos
create policy machine_photos_select on public.machine_photos for select to anon, authenticated using (
  exists (select 1 from public.machines m where m.id = machine_photos.machine_id)
);
create policy machine_photos_write on public.machine_photos for all to authenticated
  using (exists (select 1 from public.machines m where m.id = machine_photos.machine_id and m.supplier_org_id = private.my_org() and m.status in ('draft', 'rejected', 'paused')))
  with check (exists (select 1 from public.machines m where m.id = machine_photos.machine_id and m.supplier_org_id = private.my_org() and m.status in ('draft', 'rejected', 'paused')));

-- compliance documents (owner org, the operator themself, platform admins)
create policy compliance_documents_select on public.compliance_documents for select to authenticated using (
  org_id = private.my_org() or profile_id = auth.uid() or private.is_admin()
);
create policy compliance_documents_insert on public.compliance_documents for insert to authenticated with check (
  org_id = private.my_org()
  and (
    (machine_id is not null and exists (select 1 from public.machines m where m.id = machine_id and m.supplier_org_id = private.my_org()) and private.my_account_type() <> 'operator')
    or (machine_id is null and profile_id = auth.uid())
    or (machine_id is null and private.my_account_type() <> 'operator' and exists (select 1 from public.profiles p where p.id = profile_id and p.org_id = private.my_org()))
  )
);

-- bookings (writes via functions)
create policy bookings_select on public.bookings for select to authenticated using (private.can_see_booking(bookings));
create policy booking_events_select on public.booking_events for select to authenticated using (private.booking_visible(booking_id));
create policy deliveries_select on public.deliveries for select to authenticated using (private.booking_visible(booking_id));
create policy delivery_locations_select on public.delivery_locations for select to authenticated using (private.booking_visible(booking_id));
create policy delivery_locations_insert on public.delivery_locations for insert to authenticated with check (
  exists (select 1 from public.bookings b where b.id = booking_id and b.supplier_org_id = private.my_org() and b.status = 'in_transit')
);

-- messaging
create policy conversations_select on public.conversations for select to authenticated using (private.in_conversation(id));
create policy participants_select on public.conversation_participants for select to authenticated using (private.in_conversation(conversation_id));
create policy messages_select on public.messages for select to authenticated using (private.in_conversation(conversation_id));
create policy messages_insert on public.messages for insert to authenticated with check (
  private.in_conversation(conversation_id)
  and sender_id = auth.uid()
  and sender_org_id = private.my_org()
  and system = false
);

-- money
create policy invoices_select on public.invoices for select to authenticated using (org_id = private.my_org() or private.is_admin());
create policy payment_methods_select on public.payment_methods for select to authenticated using (org_id = private.my_org());
create policy payment_methods_insert on public.payment_methods for insert to authenticated with check (org_id = private.my_org() and private.my_role() in ('owner', 'project_manager'));
create policy payment_methods_delete on public.payment_methods for delete to authenticated using (org_id = private.my_org() and private.my_role() in ('owner', 'project_manager'));
create policy payments_select on public.payments for select to authenticated using (org_id = private.my_org() or private.is_admin());
create policy payouts_select on public.payouts for select to authenticated using (org_id = private.my_org() or private.is_admin());

-- notifications
create policy notifications_select on public.notifications for select to authenticated using (profile_id = auth.uid());
create policy notifications_update on public.notifications for update to authenticated using (profile_id = auth.uid()) with check (profile_id = auth.uid());

-- support
create policy tickets_select on public.support_tickets for select to authenticated using (
  org_id = private.my_org() or created_by = auth.uid() or private.is_admin()
);
create policy tickets_insert on public.support_tickets for insert to authenticated with check (
  created_by = auth.uid() and (org_id is null or org_id = private.my_org()) and status = 'open'
);

-- reviews
create policy reviews_select on public.reviews for select to anon, authenticated using (true);
create policy reviews_insert on public.reviews for insert to authenticated with check (
  author_id = auth.uid()
  and exists (select 1 from public.bookings b where b.id = booking_id and b.contractor_org_id = private.my_org() and b.status = 'completed' and b.supplier_org_id = supplier_org_id)
);

-- admin feed
create policy admin_actions_select on public.admin_actions for select to authenticated using (private.is_admin());

-- Only expose what the API needs
revoke insert, update, delete on public.bookings, public.booking_events, public.deliveries, public.invoices, public.payments,
  public.payouts, public.subscriptions, public.credit_transactions, public.org_members, public.invitations,
  public.admin_actions, public.conversations, public.conversation_participants from anon, authenticated;
revoke update, delete on public.messages, public.compliance_documents from anon, authenticated;
revoke insert, delete on public.notifications, public.profiles, public.organisations from anon, authenticated;
revoke all on public.machine_categories, public.compliance_requirements from anon, authenticated;
grant select on public.machine_categories, public.compliance_requirements to anon, authenticated;
