-- Storage buckets, realtime publication and scheduled jobs.

-- ---------------------------------------------------------------------------
-- Storage
--   machine-photos      public read; suppliers write under <org_id>/...
--   compliance-docs     private; owner org (+ platform admins) under <org_id>/...
--   avatars             public read; users write under <user_id>/...
--   message-attachments private; conversation participants under <conversation_id>/...
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('machine-photos', 'machine-photos', true, 8388608, array['image/jpeg', 'image/png', 'image/webp']),
  ('compliance-docs', 'compliance-docs', false, 10485760, array['application/pdf', 'image/jpeg', 'image/png']),
  ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp']),
  ('message-attachments', 'message-attachments', false, 10485760, array['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "machine photos are public" on storage.objects for select to anon, authenticated
  using (bucket_id = 'machine-photos');
create policy "suppliers upload machine photos" on storage.objects for insert to authenticated
  with check (bucket_id = 'machine-photos' and (storage.foldername(name))[1] = private.my_org()::text and private.my_org_kind() = 'supplier');
create policy "suppliers manage machine photos" on storage.objects for delete to authenticated
  using (bucket_id = 'machine-photos' and (storage.foldername(name))[1] = private.my_org()::text);

create policy "compliance docs readable by owner and admins" on storage.objects for select to authenticated
  using (bucket_id = 'compliance-docs' and ((storage.foldername(name))[1] = private.my_org()::text or private.is_admin()));
create policy "compliance docs uploaded by owner org" on storage.objects for insert to authenticated
  with check (bucket_id = 'compliance-docs' and (storage.foldername(name))[1] = private.my_org()::text);

create policy "avatars are public" on storage.objects for select to anon, authenticated
  using (bucket_id = 'avatars');
create policy "users manage their avatar" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "users replace their avatar" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "attachments readable in conversation" on storage.objects for select to authenticated
  using (bucket_id = 'message-attachments' and private.in_conversation(((storage.foldername(name))[1])::uuid));
create policy "attachments uploaded in conversation" on storage.objects for insert to authenticated
  with check (bucket_id = 'message-attachments' and private.in_conversation(((storage.foldername(name))[1])::uuid));

-- ---------------------------------------------------------------------------
-- Realtime (RLS still applies to what each client receives)
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table public.messages, public.notifications, public.deliveries, public.delivery_locations, public.bookings;

-- ---------------------------------------------------------------------------
-- Scheduled jobs
-- ---------------------------------------------------------------------------
create extension if not exists pg_cron with schema pg_catalog;

-- Demo telemetry: trucks in transit move along their route until delivered.
-- Real deployments replace this with driver GPS inserts into delivery_locations.
create or replace function private.simulate_deliveries() returns void
language plpgsql security definer set search_path = '' as $$
declare
  d record;
  pts int;
  idx int;
  pt jsonb;
  prog real;
begin
  perform private.trust();
  for d in select dl.*, b.contractor_org_id, b.machine_id from public.deliveries dl join public.bookings b on b.id = dl.booking_id
           where dl.stage <> 'delivered' and b.status = 'in_transit' loop
    prog := least(1, d.progress + 0.02);
    pts := jsonb_array_length(d.route);
    if pts > 0 then
      idx := least(pts - 1, floor(prog * (pts - 1))::int);
      pt := d.route -> idx;
      insert into public.delivery_locations (booking_id, lat, lng) values (d.booking_id, (pt ->> 0)::double precision, (pt ->> 1)::double precision);
    end if;
    update public.deliveries
      set progress = prog,
          stage = case when prog >= 1 then 'delivered'::public.delivery_stage when prog >= 0.85 then 'arriving'::public.delivery_stage else 'in_transit'::public.delivery_stage end,
          eta = now() + make_interval(mins => round((1 - prog) * 150)::int),
          delivered_at = case when prog >= 1 then now() else null end
      where booking_id = d.booking_id;
    if prog >= 1 then
      update public.bookings set status = 'on_site' where id = d.booking_id;
      perform private.notify_org(d.contractor_org_id, 'delivery', 'Machine Delivered',
        (select title from public.machines where id = d.machine_id), 'Now on site', '/hires/' || d.booking_id);
    end if;
  end loop;
end $$;
revoke execute on function private.simulate_deliveries() from public, anon, authenticated;

select cron.schedule('siterun-document-expiry', '0 20 * * *', 'select public.run_document_expiry()');
select cron.schedule('siterun-simulate-deliveries', '20 seconds', 'select private.simulate_deliveries()');
