-- Email for the notifications that matter, sent by the `email` Edge Function through
-- Resend. Chat messages stay in the app and on push; everything else (bookings,
-- deliveries, invoices, documents, listings) is also emailed unless the person turns
-- email off in Account → Privacy & Security. Nothing is sent until the owner sets
-- RESEND_API_KEY and:
--   select private.put_config('email_function_url', 'https://<project-ref>.supabase.co/functions/v1/email');
alter table public.profiles add column email_notifications boolean not null default true;

create or replace function public.set_email_notifications(p_on boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid();
begin
  if me is null then
    perform private.fail('Sign in first.', '28000');
  end if;
  perform private.trust();
  update public.profiles set email_notifications = coalesce(p_on, true) where id = me;
end $$;
revoke execute on function public.set_email_notifications(boolean) from public, anon;
grant execute on function public.set_email_notifications(boolean) to authenticated;

create or replace function private.queue_email() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  url text := private.config('email_function_url');
begin
  if url is null or new.type = 'message' then
    return new;
  end if;
  if not exists (
    select 1 from public.profiles p
    where p.id = new.profile_id and p.email_notifications and p.email is not null
  ) then
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
revoke execute on function private.queue_email() from public, anon, authenticated;

create trigger notifications_email after insert on public.notifications
  for each row execute function private.queue_email();

-- Used by the function: everything one email needs.
create or replace function public.email_payload(p_notification uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'to', p.email,
    'name', split_part(p.full_name, ' ', 1),
    'title', n.title,
    'body', nullif(concat_ws(' · ', nullif(n.body, ''), nullif(n.detail, '')), ''),
    'link', n.link,
    'type', n.type
  )
  from public.notifications n
  join public.profiles p on p.id = n.profile_id
  where n.id = p_notification and p.email_notifications and n.type <> 'message'
$$;
revoke execute on function public.email_payload(uuid) from public, anon, authenticated;
grant execute on function public.email_payload(uuid) to service_role;
