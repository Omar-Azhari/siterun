-- Small rules the client needs:
--  * editing a rejected listing puts it back to draft (as the wizard expects)
--  * a member's name in the team list follows their profile name

create or replace function private.guard_machine() returns trigger
language plpgsql set search_path = '' as $$
begin
  if private.trusted() then
    return new;
  end if;
  if tg_op = 'INSERT' then
    if new.status <> 'draft' or new.approved_at is not null or new.submitted_at is not null then
      raise exception 'New listings start as drafts.' using errcode = '42501';
    end if;
    return new;
  end if;
  if old.status = 'rejected' and new.status = 'draft' then
    new.rejection_reason := old.rejection_reason;
  elsif new.status is distinct from old.status then
    raise exception 'Listing status can only change through submission and review.' using errcode = '42501';
  end if;
  if new.approved_at is distinct from old.approved_at
     or new.approved_by is distinct from old.approved_by
     or new.submitted_at is distinct from old.submitted_at
     or new.supplier_org_id is distinct from old.supplier_org_id then
    raise exception 'Listing status can only change through submission and review.' using errcode = '42501';
  end if;
  if old.status in ('pending_review', 'live') then
    raise exception 'Pause this listing before editing it.' using errcode = '42501';
  end if;
  return new;
end $$;

create or replace function private.sync_member_name() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.full_name is distinct from old.full_name then
    update public.org_members set name = new.full_name where profile_id = new.id;
  end if;
  return new;
end $$;
create trigger profiles_sync_member_name after update on public.profiles
for each row execute function private.sync_member_name();
