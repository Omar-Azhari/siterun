-- Real GPS for deliveries. While a delivery is in transit, the driver's phone sends its
-- position through report_location(). The first real fix switches the delivery from the
-- simulated route to GPS; the simulator then leaves it alone.
alter table public.deliveries
  add column source text not null default 'simulated' check (source in ('simulated', 'gps')),
  add column position jsonb,
  add column position_at timestamptz;

create or replace function public.report_location(
  p_booking uuid, p_lat double precision, p_lng double precision,
  p_accuracy real default null, p_heading real default null, p_speed real default null
) returns public.deliveries
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  b public.bookings;
  d public.deliveries;
  total_km double precision;
  left_km double precision;
  kmh double precision;
begin
  if me is null then
    perform private.fail('Sign in first.', '28000');
  end if;
  if p_lat is null or p_lng is null or p_lat not between -90 and 90 or p_lng not between -180 and 180 then
    perform private.fail('That location isn’t valid.', '22023');
  end if;
  select * into b from public.bookings where id = p_booking;
  -- The assigned operator or anyone in the supplier's organisation can share.
  if b.id is null or not (b.operator_profile_id is not distinct from me or b.supplier_org_id is not distinct from private.my_org()) then
    perform private.fail('Booking not found.', 'P0002');
  end if;
  if b.status <> 'in_transit' then
    perform private.fail('Live location is only shared while the machine is on its way.', '22023');
  end if;
  perform private.rate_limit('location', 720, '1 hour');
  perform private.trust();

  select * into d from public.deliveries where booking_id = b.id for update;
  if d.booking_id is null then
    perform private.fail('This booking has no delivery.', 'P0002');
  end if;

  -- A fix worse than 250 m would make the truck jump around; keep the last good one.
  if p_accuracy is not null and p_accuracy > 250 then
    return d;
  end if;

  insert into public.delivery_locations (booking_id, lat, lng) values (b.id, p_lat, p_lng);

  total_km := greatest(0.2, private.distance_km(
    (d.origin ->> 'lat')::double precision, (d.origin ->> 'lng')::double precision,
    (d.destination ->> 'lat')::double precision, (d.destination ->> 'lng')::double precision));
  left_km := private.distance_km(p_lat, p_lng,
    (d.destination ->> 'lat')::double precision, (d.destination ->> 'lng')::double precision);
  -- Roads are longer than a straight line; 1.3 is a common allowance. The phone's speed
  -- is used when it looks like driving, otherwise an urban average.
  kmh := case when p_speed is not null and p_speed * 3.6 between 20 and 110 then p_speed * 3.6 else 45 end;

  update public.deliveries
    set source = 'gps',
        position = jsonb_build_object('lat', p_lat, 'lng', p_lng, 'accuracy', p_accuracy, 'heading', p_heading, 'speed', p_speed),
        position_at = now(),
        picked_up_at = coalesce(picked_up_at, now()),
        progress = least(0.99, greatest(progress, 1 - left_km / total_km))::real,
        stage = case when left_km < 1 then 'arriving'::public.delivery_stage else 'in_transit'::public.delivery_stage end,
        eta = now() + make_interval(mins => ceil(left_km * 1.3 / kmh * 60)::int),
        updated_at = now()
    where booking_id = b.id
    returning * into d;
  return d;
end $$;
revoke execute on function public.report_location(uuid, double precision, double precision, real, real, real) from public, anon;
grant execute on function public.report_location(uuid, double precision, double precision, real, real, real) to authenticated;

-- The simulator only moves deliveries that have no real GPS.
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
           where dl.stage <> 'delivered' and b.status = 'in_transit' and dl.source = 'simulated' loop
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

-- The demo trip goes back to the simulated route when it restarts.
create or replace function private.restart_demo_delivery() returns void
language plpgsql security definer set search_path = '' as $$
declare demo uuid := 'eb480048-7630-48dc-a166-cb8a4e073645';
begin
  perform private.trust();
  if not exists (select 1 from public.bookings where id = demo) then
    return;
  end if;
  update public.bookings set status = 'in_transit' where id = demo;
  insert into public.deliveries (booking_id, stage, origin, destination, route, progress, picked_up_at, eta)
  select b.id, 'in_transit',
    jsonb_build_object('label', m.suburb || ', ' || m.state, 'lat', m.lat, 'lng', m.lng),
    jsonb_build_object('label', coalesce(s.name || ', ' || s.suburb || ', ' || s.state, 'Site'), 'lat', coalesce(s.lat, m.lat), 'lng', coalesce(s.lng, m.lng)),
    (select jsonb_agg(jsonb_build_array(
        m.lat + (coalesce(s.lat, m.lat) - m.lat) * t / 8.0 + sin(pi() * t / 8.0) * 0.01,
        m.lng + (coalesce(s.lng, m.lng) - m.lng) * t / 8.0 - sin(pi() * t / 8.0) * 0.01) order by t)
      from generate_series(0, 8) t),
    0.05, now(), now() + interval '90 minutes'
  from public.bookings b
  join public.machines m on m.id = b.machine_id
  left join public.sites s on s.id = b.site_id
  where b.id = demo
  on conflict (booking_id) do nothing;
  update public.deliveries
    set stage = 'in_transit', progress = 0.05, delivered_at = null,
        picked_up_at = now(), eta = now() + interval '90 minutes',
        source = 'simulated', position = null, position_at = null
    where booking_id = demo;
  delete from public.delivery_locations where booking_id = demo;
  delete from public.notifications where title = 'Machine Delivered' and link = '/hires/' || demo;
end $$;
revoke execute on function private.restart_demo_delivery() from public, anon, authenticated;
