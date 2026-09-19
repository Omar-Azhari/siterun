-- Demo only: the seeded "6t Dumper to Airport Upgrade" hire is the tracking example on
-- the design boards. A simulated trip ends after 90 minutes, so restart it every two
-- hours to keep the tracking screen populated. Remove this job for a real deployment.
create or replace function private.restart_demo_delivery() returns void
language plpgsql security definer set search_path = '' as $$
declare demo uuid := 'eb480048-7630-48dc-a166-cb8a4e073645';
begin
  perform private.trust();
  if not exists (select 1 from public.bookings where id = demo) then
    return;
  end if;
  update public.bookings set status = 'in_transit' where id = demo;
  update public.deliveries
    set stage = 'in_transit', progress = 0.05, delivered_at = null,
        picked_up_at = now(), eta = now() + interval '90 minutes'
    where booking_id = demo;
  delete from public.delivery_locations where booking_id = demo;
  delete from public.notifications where title = 'Machine Delivered' and link = '/hires/' || demo;
end $$;
revoke execute on function private.restart_demo_delivery() from public, anon, authenticated;

select cron.schedule('siterun-demo-delivery-loop', '0 */2 * * *', 'select private.restart_demo_delivery()');
select private.restart_demo_delivery();
