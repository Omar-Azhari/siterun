-- supplier_performance: build the daily/weekly trend from dates, not timestamps.
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
    select jsonb_agg(jsonb_build_object('label', to_char(g.d, 'FMDD Mon'), 'hires',
      (select count(*) from _perf x where x.start_date <= g.d + case when days = 30 then 0 else 6 end and x.end_date >= g.d)) order by g.d)
    into trend from (
      select ts::date as d
      from generate_series((from_d + 1)::timestamp, current_date::timestamp, case when days = 30 then interval '1 day' else interval '7 days' end) ts
    ) g;
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
