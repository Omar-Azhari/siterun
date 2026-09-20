-- Device tokens for push notifications from the Android and iOS apps. Sending needs
-- Firebase (FCM) and APNs credentials; see MOBILE_BUILD.md.
create table public.push_tokens (
  token text primary key,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  platform text not null check (platform in ('android', 'ios', 'web')),
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);
create index push_tokens_profile_idx on public.push_tokens (profile_id);

alter table public.push_tokens enable row level security;
create policy push_tokens_own on public.push_tokens for all to authenticated
  using (profile_id = (select auth.uid()))
  with check (profile_id = (select auth.uid()));
