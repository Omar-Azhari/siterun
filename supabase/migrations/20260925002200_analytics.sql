-- What people look for and what they end up hiring. Counts only: a row says "somebody
-- searched for a 5t excavator" or "somebody viewed this machine", with the organisation
-- when they're signed in, so admins can see where searches stop turning into bookings.
-- Kept for 180 days. No third-party analytics service is involved.
create table public.analytics_events (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  kind text not null check (kind in ('search', 'machine_view', 'book_start', 'booking')),
  profile_id uuid references public.profiles (id) on delete set null,
  org_id uuid references public.organisations (id) on delete set null,
  machine_id uuid references public.machines (id) on delete set null,
  category text,
  query text
);
create index analytics_events_at_idx on public.analytics_events (at desc);
create index analytics_events_kind_idx on public.analytics_events (kind, at desc);
create index analytics_events_machine_idx on public.analytics_events (machine_id, at desc) where machine_id is not null;

alter table public.analytics_events enable row level security;
-- Written only through track_event(); read only by platform admins.
create policy analytics_admin_read on public.analytics_events for select to authenticated
  using ((select private.is_admin()));

create or replace function public.track_event(
  p_kind text, p_machine uuid default null, p_category text default null, p_query text default null
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  recent integer;
begin
  if p_kind not in ('search', 'machine_view', 'book_start', 'booking') then
    return;
  end if;
  if me is null then
    -- Signed-out traffic isn't limited per person, so cap the whole table per hour.
    select count(*) into recent from public.analytics_events where at > now() - interval '1 hour';
    if recent >= 20000 then
      return;
    end if;
  else
    begin
      perform private.rate_limit('analytics', 600, '1 hour');
    exception when others then
      return;
    end;
  end if;
  insert into public.analytics_events (kind, profile_id, org_id, machine_id, category, query)
  values (
    p_kind, me, (select org_id from public.profiles where id = me),
    p_machine, left(nullif(trim(coalesce(p_category, '')), ''), 60),
    left(nullif(trim(coalesce(p_query, '')), ''), 80)
  );
end $$;
revoke execute on function public.track_event(text, uuid, text, text) from public;
grant execute on function public.track_event(text, uuid, text, text) to anon, authenticated;

/** The admin analytics screen: the funnel, the busiest searches and the machines people look at. */
create or replace function public.analytics_summary(range_key text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  days int := case range_key when '7d' then 7 when '90d' then 90 when '1y' then 365 else 30 end;
  f timestamptz := now() - make_interval(days => days);
  pf timestamptz := now() - make_interval(days => 2 * days);
  counts record;
  prev record;
begin
  perform private.require_admin();
  select
    count(*) filter (where kind = 'search') as searches,
    count(*) filter (where kind = 'machine_view') as views,
    count(*) filter (where kind = 'book_start') as starts,
    count(*) filter (where kind = 'booking') as bookings,
    count(distinct coalesce(org_id::text, 'anon')) as visitors
  into counts from public.analytics_events where at > f;
  select
    count(*) filter (where kind = 'search') as searches,
    count(*) filter (where kind = 'booking') as bookings
  into prev from public.analytics_events where at > pf and at <= f;

  return jsonb_build_object(
    'searches', counts.searches,
    'views', counts.views,
    'bookStarts', counts.starts,
    'bookings', counts.bookings,
    'organisations', counts.visitors,
    'searchTrend', case when prev.searches = 0 then case when counts.searches > 0 then 100 else 0 end
                   else round((counts.searches - prev.searches) * 100.0 / prev.searches) end,
    'bookingTrend', case when prev.bookings = 0 then case when counts.bookings > 0 then 100 else 0 end
                    else round((counts.bookings - prev.bookings) * 100.0 / prev.bookings) end,
    'viewToBooking', case when counts.views = 0 then 0 else round(counts.bookings * 100.0 / counts.views, 1) end,
    'topSearches', coalesce((
      select jsonb_agg(jsonb_build_object('label', q, 'count', n) order by n desc)
      from (
        select lower(query) as q, count(*) as n from public.analytics_events
        where kind = 'search' and at > f and query is not null
        group by lower(query) order by count(*) desc limit 8
      ) s), '[]'::jsonb),
    'topCategories', coalesce((
      select jsonb_agg(jsonb_build_object('label', c, 'count', n) order by n desc)
      from (
        select category as c, count(*) as n from public.analytics_events
        where kind = 'search' and at > f and category is not null
        group by category order by count(*) desc limit 6
      ) s), '[]'::jsonb),
    'topMachines', coalesce((
      select jsonb_agg(jsonb_build_object('id', id, 'label', label, 'views', views, 'bookings', bookings) order by views desc)
      from (
        select m.id, m.title || ' · ' || o.name as label,
          count(*) filter (where e.kind = 'machine_view') as views,
          count(*) filter (where e.kind = 'booking') as bookings
        from public.analytics_events e
        join public.machines m on m.id = e.machine_id
        join public.organisations o on o.id = m.supplier_org_id
        where e.at > f and e.machine_id is not null
        group by m.id, m.title, o.name
        order by count(*) filter (where e.kind = 'machine_view') desc limit 8
      ) s), '[]'::jsonb),
    'daily', coalesce((
      select jsonb_agg(jsonb_build_object('date', d, 'searches', searches, 'bookings', bookings) order by d)
      from (
        select day::date as d,
          count(*) filter (where e.kind = 'search') as searches,
          count(*) filter (where e.kind = 'booking') as bookings
        from generate_series(f, now(), interval '1 day') as day
        left join public.analytics_events e on e.at >= day and e.at < day + interval '1 day'
        group by day::date
      ) s), '[]'::jsonb)
  );
end $$;
revoke execute on function public.analytics_summary(text) from public, anon;
grant execute on function public.analytics_summary(text) to authenticated;

select cron.schedule('siterun-prune-analytics', '50 3 * * *',
  $$delete from public.analytics_events where at < now() - interval '180 days'$$);
