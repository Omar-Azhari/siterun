-- Simulated trucks move with the clock (a 90 minute trip from pickup) instead of a
-- fixed step per tick, so a delivery takes as long as its ETA says.
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
    prog := least(1, greatest(d.progress,
      0.05 + extract(epoch from now() - coalesce(d.picked_up_at, now())) / (90 * 60) * 0.95))::real;
    pts := jsonb_array_length(d.route);
    if pts > 0 then
      idx := least(pts - 1, floor(prog * (pts - 1))::int);
      pt := d.route -> idx;
      insert into public.delivery_locations (booking_id, lat, lng) values (d.booking_id, (pt ->> 0)::double precision, (pt ->> 1)::double precision);
    end if;
    update public.deliveries
      set progress = prog,
          stage = case when prog >= 1 then 'delivered'::public.delivery_stage when prog >= 0.85 then 'arriving'::public.delivery_stage else 'in_transit'::public.delivery_stage end,
          eta = coalesce(d.picked_up_at, now()) + interval '90 minutes',
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

-- Old delivery points are only useful while a truck is moving.
select cron.schedule('siterun-prune-delivery-points', '15 3 * * *',
  $$delete from public.delivery_locations where recorded_at < now() - interval '2 days'$$);
