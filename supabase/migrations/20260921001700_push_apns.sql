-- iPhones are sent to through Apple (APNs) and Android phones through Firebase, so the
-- push function needs each device's platform along with its token.
create or replace function public.push_payload(p_notification uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'title', n.title,
    'body', nullif(concat_ws(' · ', nullif(n.body, ''), nullif(n.detail, '')), ''),
    'link', n.link,
    'tokens', coalesce((
      select jsonb_agg(jsonb_build_object('token', t.token, 'platform', t.platform))
      from public.push_tokens t where t.profile_id = n.profile_id
    ), '[]'::jsonb)
  )
  from public.notifications n where n.id = p_notification
$$;
revoke execute on function public.push_payload(uuid) from public, anon, authenticated;
grant execute on function public.push_payload(uuid) to service_role;
