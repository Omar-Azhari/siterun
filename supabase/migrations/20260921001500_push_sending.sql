-- Push notifications. Every notification row for someone with a registered device is
-- handed to the `push` Edge Function, which sends it through Firebase Cloud Messaging
-- (Android, and iOS through APNs). Nothing is sent until the owner sets the function URL:
--   select private.put_config('push_function_url', 'https://<project>.supabase.co/functions/v1/push');
-- and the function's FIREBASE_SERVICE_ACCOUNT secret. See LAUNCH.md.
create extension if not exists pg_net with schema extensions;

-- Server-side settings that aren't secrets.
create table if not exists private.app_config (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);
revoke all on private.app_config from public, anon, authenticated;

create or replace function private.config(p_key text) returns text
language sql stable security definer set search_path = '' as $$
  select value from private.app_config where key = p_key
$$;
revoke execute on function private.config(text) from public, anon, authenticated;

create or replace function private.put_config(p_key text, p_value text) returns void
language sql security definer set search_path = '' as $$
  insert into private.app_config (key, value) values (p_key, p_value)
  on conflict (key) do update set value = excluded.value, updated_at = now()
$$;
revoke execute on function private.put_config(text, text) from public, anon, authenticated;

-- The shared secret the database sends with each call, so only it can trigger pushes.
-- Generated once and kept in Vault; the function reads it through push_hook_secret().
do $$
begin
  if not exists (select 1 from vault.secrets where name = 'push_hook_secret') then
    perform vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'push_hook_secret',
      'Authenticates the database to the push Edge Function');
  end if;
end $$;

create or replace function public.push_hook_secret() returns text
language sql stable security definer set search_path = '' as $$
  select decrypted_secret from vault.decrypted_secrets where name = 'push_hook_secret'
$$;
revoke execute on function public.push_hook_secret() from public, anon, authenticated;
grant execute on function public.push_hook_secret() to service_role;

create or replace function private.queue_push() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  url text := private.config('push_function_url');
begin
  if url is null or not exists (select 1 from public.push_tokens where profile_id = new.profile_id) then
    return new;
  end if;
  perform net.http_post(
    url := url,
    body := jsonb_build_object('notification_id', new.id),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-siterun-hook', (select decrypted_secret from vault.decrypted_secrets where name = 'push_hook_secret')
    ),
    timeout_milliseconds := 5000
  );
  return new;
end $$;
revoke execute on function private.queue_push() from public, anon, authenticated;

create trigger notifications_push after insert on public.notifications
  for each row execute function private.queue_push();

-- Used by the function: one notification and the devices to send it to.
create or replace function public.push_payload(p_notification uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'title', n.title,
    'body', nullif(concat_ws(' · ', nullif(n.body, ''), nullif(n.detail, '')), ''),
    'link', n.link,
    'tokens', coalesce((select jsonb_agg(t.token) from public.push_tokens t where t.profile_id = n.profile_id), '[]'::jsonb)
  )
  from public.notifications n where n.id = p_notification
$$;
revoke execute on function public.push_payload(uuid) from public, anon, authenticated;
grant execute on function public.push_payload(uuid) to service_role;

-- Firebase says a token is dead (app uninstalled, token rotated): forget it.
create or replace function public.forget_push_tokens(p_tokens text[]) returns void
language sql security definer set search_path = '' as $$
  delete from public.push_tokens where token = any (p_tokens)
$$;
revoke execute on function public.forget_push_tokens(text[]) from public, anon, authenticated;
grant execute on function public.forget_push_tokens(text[]) to service_role;
