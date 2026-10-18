-- Harden frozen catalog trigger for DELETE operations, filter public views by active invites,
-- and add audit logging for event_preferences submissions.

create or replace function public.guard_frozen_catalog()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_campaign_id text;
begin
  v_campaign_id := case when tg_op = 'DELETE' then old.campaign_id else new.campaign_id end;
  if exists (
    select 1
    from public.campaigns c
    where c.id = v_campaign_id
      and (c.status = 'open' or c.results_frozen_at is not null)
  ) then
    raise exception 'CATALOG_LOCKED_DURING_OR_AFTER_VOTING';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

drop trigger if exists guard_menu_categories_frozen on public.menu_categories;
create trigger guard_menu_categories_frozen
before insert or update or delete on public.menu_categories
for each row execute function public.guard_frozen_catalog();

drop trigger if exists guard_menu_options_frozen on public.menu_options;
create trigger guard_menu_options_frozen
before insert or update or delete on public.menu_options
for each row execute function public.guard_frozen_catalog();

create table if not exists public.preference_audit_events (
  id bigint generated always as identity primary key,
  campaign_id text not null references public.campaigns(id) on delete cascade,
  invite_id uuid not null references public.invite_codes(id) on delete restrict,
  event_type text not null check (event_type in ('submitted', 'updated')),
  created_at timestamptz not null default now()
);

alter table public.preference_audit_events enable row level security;

create or replace function public.submit_event_preferences(
  p_campaign_id text,
  p_token_hash text,
  p_attendance text,
  p_gift_choice text,
  p_theme_choice text
)
returns table(saved_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status text;
  v_invite_id uuid;
  v_now timestamptz := now();
  v_existing boolean;
begin
  select c.status into v_status
  from public.campaigns c
  where c.id = p_campaign_id;

  if v_status is distinct from 'open' then
    raise exception 'VOTING_CLOSED';
  end if;

  select i.id into v_invite_id
  from public.invite_codes i
  where i.campaign_id = p_campaign_id
    and i.token_hash = p_token_hash
    and i.active = true;

  if v_invite_id is null then
    raise exception 'INVALID_INVITE';
  end if;

  select exists (
    select 1 from public.event_preferences ep
    where ep.campaign_id = p_campaign_id and ep.invite_id = v_invite_id
  ) into v_existing;

  insert into public.event_preferences (
    campaign_id, invite_id, attendance, gift_choice, theme_choice, submitted_at, updated_at
  )
  values (
    p_campaign_id, v_invite_id, p_attendance, p_gift_choice, p_theme_choice, v_now, v_now
  )
  on conflict (campaign_id, invite_id)
  do update set
    attendance = excluded.attendance,
    gift_choice = excluded.gift_choice,
    theme_choice = excluded.theme_choice,
    updated_at = v_now;

  insert into public.preference_audit_events (campaign_id, invite_id, event_type, created_at)
  values (p_campaign_id, v_invite_id, case when v_existing then 'updated' else 'submitted' end, v_now);

  return query select v_now;
end;
$$;

revoke all on function public.submit_event_preferences(text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.submit_event_preferences(text, text, text, text, text) to service_role;
