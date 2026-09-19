-- Performance advisor fixes: evaluate auth.uid() once per statement, index foreign
-- keys used in joins/deletes, and avoid overlapping SELECT policies on photos.

alter policy profiles_select on public.profiles using (
  id = (select auth.uid())
  or private.is_admin()
  or (org_id is not null and org_id = private.my_org())
  or (org_id is not null and private.shares_booking_with(org_id))
);
alter policy profiles_update on public.profiles using (id = (select auth.uid())) with check (id = (select auth.uid()));

alter policy sites_select on public.sites using (
  org_id = private.my_org()
  or private.is_admin()
  or exists (select 1 from public.bookings b where b.site_id = sites.id and (b.supplier_org_id = private.my_org() or b.operator_profile_id = (select auth.uid())))
);

alter policy machines_select on public.machines using (
  status = 'live'
  or supplier_org_id = private.my_org()
  or private.is_admin()
  or exists (select 1 from public.bookings b where b.machine_id = machines.id and (b.contractor_org_id = private.my_org() or b.operator_profile_id = (select auth.uid())))
);

alter policy compliance_documents_select on public.compliance_documents using (
  org_id = private.my_org() or profile_id = (select auth.uid()) or private.is_admin()
);
alter policy compliance_documents_insert on public.compliance_documents with check (
  org_id = private.my_org()
  and (
    (machine_id is not null and exists (select 1 from public.machines m where m.id = machine_id and m.supplier_org_id = private.my_org()) and private.my_account_type() <> 'operator')
    or (machine_id is null and profile_id = (select auth.uid()))
    or (machine_id is null and private.my_account_type() <> 'operator' and exists (select 1 from public.profiles p where p.id = profile_id and p.org_id = private.my_org()))
  )
);

alter policy messages_insert on public.messages with check (
  private.in_conversation(conversation_id)
  and sender_id = (select auth.uid())
  and sender_org_id = private.my_org()
  and system = false
);

alter policy notifications_select on public.notifications using (profile_id = (select auth.uid()));
alter policy notifications_update on public.notifications using (profile_id = (select auth.uid())) with check (profile_id = (select auth.uid()));

alter policy tickets_select on public.support_tickets using (
  org_id = private.my_org() or created_by = (select auth.uid()) or private.is_admin()
);
alter policy tickets_insert on public.support_tickets with check (
  created_by = (select auth.uid()) and (org_id is null or org_id = private.my_org()) and status = 'open'
);

alter policy reviews_insert on public.reviews with check (
  author_id = (select auth.uid())
  and exists (select 1 from public.bookings b where b.id = booking_id and b.contractor_org_id = private.my_org() and b.status = 'completed' and b.supplier_org_id = supplier_org_id)
);

drop policy machine_photos_write on public.machine_photos;
create policy machine_photos_insert on public.machine_photos for insert to authenticated
  with check (exists (select 1 from public.machines m where m.id = machine_photos.machine_id and m.supplier_org_id = private.my_org() and m.status in ('draft', 'rejected', 'paused')));
create policy machine_photos_update on public.machine_photos for update to authenticated
  using (exists (select 1 from public.machines m where m.id = machine_photos.machine_id and m.supplier_org_id = private.my_org() and m.status in ('draft', 'rejected', 'paused')))
  with check (exists (select 1 from public.machines m where m.id = machine_photos.machine_id and m.supplier_org_id = private.my_org() and m.status in ('draft', 'rejected', 'paused')));
create policy machine_photos_delete on public.machine_photos for delete to authenticated
  using (exists (select 1 from public.machines m where m.id = machine_photos.machine_id and m.supplier_org_id = private.my_org() and m.status in ('draft', 'rejected', 'paused')));

create index if not exists bookings_site_idx on public.bookings (site_id);
create index if not exists bookings_created_by_idx on public.bookings (created_by);
create index if not exists compliance_documents_profile_idx on public.compliance_documents (profile_id);
create index if not exists compliance_documents_requirement_idx on public.compliance_documents (requirement_id);
create index if not exists invoices_booking_idx on public.invoices (booking_id);
create index if not exists machines_category_idx on public.machines (category_id);
create index if not exists messages_sender_org_idx on public.messages (sender_org_id);
create index if not exists payments_method_idx on public.payments (method_id);
create index if not exists reviews_supplier_idx on public.reviews (supplier_org_id);
create index if not exists support_tickets_created_by_idx on public.support_tickets (created_by);
