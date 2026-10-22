-- Service-only RPCs. Public clients must use the authenticated/validated Edge API.
alter table public.campaigns add column if not exists voting_mode text not null default 'invite'
  check (voting_mode in ('invite','open'));

create or replace function public.ccr_open_identity(p_campaign_id text, p_token_hash text)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare v_campaign public.campaigns; v_id uuid;
begin
  select * into v_campaign from public.campaigns where id=p_campaign_id for share;
  if v_campaign.status is distinct from 'open' or v_campaign.results_frozen_at is not null then raise exception 'VOTING_CLOSED'; end if;
  if v_campaign.voting_mode is distinct from 'open' then raise exception 'INVITE_REQUIRED'; end if;
  if p_token_hash is null or p_token_hash !~ '^[a-f0-9]{64}$' then raise exception 'INVALID_DEVICE_TOKEN'; end if;
  insert into public.invite_codes(campaign_id,token_hash) values(p_campaign_id,p_token_hash)
    on conflict(token_hash) do nothing;
  select id into v_id from public.invite_codes where campaign_id=p_campaign_id and token_hash=p_token_hash and active for update;
  if v_id is null then raise exception 'INVALID_INVITE'; end if;
  return v_id;
end $$;

create or replace function public.ccr_submit_open_ballot(p_campaign_id text,p_token_hash text,p_choices jsonb)
returns table(receipt uuid,saved_at timestamptz) language plpgsql security invoker set search_path = '' as $$
begin
  perform public.ccr_open_identity(p_campaign_id,p_token_hash);
  return query select * from public.submit_ballot(p_campaign_id,p_token_hash,p_choices);
end $$;

create or replace function public.ccr_submit_open_preferences(p_campaign_id text,p_token_hash text,p_attendance text,p_gift_choice text,p_theme_choice text)
returns table(receipt uuid,saved_at timestamptz) language plpgsql security invoker set search_path = '' as $$
declare v_id uuid; v_saved timestamptz;
begin
  v_id := public.ccr_open_identity(p_campaign_id,p_token_hash);
  select s.saved_at into v_saved from public.submit_event_preferences(p_campaign_id,p_token_hash,p_attendance,p_gift_choice,p_theme_choice) s;
  return query select v_id,v_saved;
end $$;

-- Lock campaign and invitation consistently; commit the mutation and its audit together.
create or replace function public.ccr_admin_mutate(p_campaign_id text,p_user_id uuid,p_op text,p_payload jsonb)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  v_campaign public.campaigns; v_invite uuid; v_id uuid; v_count int; v_choices jsonb;
  v_deleted int; v_pref_deleted int; v_now timestamptz := now();
  v_details jsonb := '{}'::jsonb; v_result jsonb := '{"ok":true}'::jsonb;
  v_item jsonb;
begin
  if not exists(select 1 from public.admin_users where user_id=p_user_id) then raise exception 'ADMIN_UNAUTHORIZED'; end if;
  select * into v_campaign from public.campaigns where id=p_campaign_id for update;
  if not found then raise exception 'CAMPAIGN_NOT_FOUND'; end if;
  if p_op in ('admin.ballot.save','admin.ballot.delete','admin.preferences.save','admin.preferences.delete','admin.submission.delete') then
    if v_campaign.results_frozen_at is not null then raise exception 'RESULTS_FROZEN'; end if;
    v_invite := (p_payload->>'inviteId')::uuid;
    perform 1 from public.invite_codes where id=v_invite and campaign_id=p_campaign_id for update;
    if not found then raise exception 'INVITE_NOT_FOUND'; end if;
    v_details := jsonb_build_object('inviteId',v_invite);
  end if;
  case p_op
  when 'admin.ballot.save' then
    v_choices := p_payload->'choices';
    if v_choices is null or jsonb_typeof(v_choices)<>'object' then raise exception 'INVALID_CHOICES'; end if;
    select count(*) into v_count from jsonb_object_keys(v_choices);
    if v_count<>8 then raise exception 'SELECT_EIGHT_CATEGORIES'; end if;
    select count(*) into v_count from jsonb_each_text(v_choices) e
      join public.menu_options m on m.id=e.value and m.category_key=e.key and m.campaign_id=p_campaign_id and m.availability_status<>'unavailable';
    if v_count<>8 then raise exception 'INVALID_MENU_OPTION'; end if;
    insert into public.ballots(invite_id,campaign_id,choices,updated_at) values(v_invite,p_campaign_id,v_choices,v_now)
      on conflict(invite_id) do update set choices=excluded.choices,updated_at=v_now returning id into v_id;
    v_result := v_result || jsonb_build_object('id',v_id,'updatedAt',v_now);
    v_details := v_details || jsonb_build_object('ballotId',v_id);
  when 'admin.preferences.save' then
    if coalesce(p_payload->>'attendance','') not in ('yes','maybe','no') then raise exception 'INVALID_ATTENDANCE'; end if;
    if coalesce(p_payload->>'giftChoice','') not in ('gift_300','gift_500','gift_300_500','gift_none') then raise exception 'INVALID_GIFT_CHOICE'; end if;
    if coalesce(p_payload->>'themeChoice','') not in ('midnight_gold','forest_champagne','retro_future','come_as_you_are') then raise exception 'INVALID_THEME_CHOICE'; end if;
    insert into public.event_preferences(invite_id,campaign_id,attendance,gift_choice,theme_choice,updated_at)
      values(v_invite,p_campaign_id,p_payload->>'attendance',p_payload->>'giftChoice',p_payload->>'themeChoice',v_now)
      on conflict(invite_id) do update set attendance=excluded.attendance,gift_choice=excluded.gift_choice,theme_choice=excluded.theme_choice,updated_at=v_now;
    v_result := v_result || jsonb_build_object('updatedAt',v_now);
  when 'admin.ballot.delete' then
    delete from public.ballots where invite_id=v_invite and campaign_id=p_campaign_id;
    get diagnostics v_deleted = row_count;
    if v_deleted=0 then raise exception 'BALLOT_NOT_FOUND'; end if;
  when 'admin.preferences.delete' then
    delete from public.event_preferences where invite_id=v_invite and campaign_id=p_campaign_id;
    get diagnostics v_deleted = row_count;
    if v_deleted=0 then raise exception 'PREFERENCES_NOT_FOUND'; end if;
  when 'admin.submission.delete' then
    delete from public.ballots where invite_id=v_invite and campaign_id=p_campaign_id;
    get diagnostics v_deleted = row_count;
    delete from public.event_preferences where invite_id=v_invite and campaign_id=p_campaign_id;
    get diagnostics v_pref_deleted = row_count;
    v_details := v_details || jsonb_build_object('ballotDeleted',v_deleted>0,'preferencesDeleted',v_pref_deleted>0);
    v_result := v_result || v_details;
  when 'admin.eligible_voters' then
    v_count := (p_payload->>'count')::integer;
    if v_count is null or v_count<1 or v_count>200 then raise exception 'INVALID_ELIGIBLE_VOTERS'; end if;
    update public.campaigns set eligible_voters=v_count,updated_at=v_now where id=p_campaign_id;
    v_details := jsonb_build_object('count',v_count);
    v_result := v_result || jsonb_build_object('eligibleVoters',v_count);
  when 'admin.status' then
    if coalesce(p_payload->>'status','') not in ('open','closed') then raise exception 'INVALID_STATUS'; end if;
    if p_payload->>'status'='open' and v_campaign.results_frozen_at is not null then raise exception 'RESULTS_FROZEN'; end if;
    update public.campaigns set status=p_payload->>'status',updated_at=v_now where id=p_campaign_id;
    v_details := jsonb_build_object('status',p_payload->>'status');
    v_result := v_result || v_details;
  when 'admin.freeze' then
    if v_campaign.status<>'closed' then raise exception 'CLOSE_CAMPAIGN_FIRST'; end if;
    update public.campaigns set results_frozen_at=coalesce(results_frozen_at,v_now),updated_at=v_now where id=p_campaign_id;
    v_result := v_result || jsonb_build_object('resultsFrozenAt',coalesce(v_campaign.results_frozen_at,v_now));
  when 'admin.invites.revoke' then
    v_invite := (p_payload->>'inviteId')::uuid;
    update public.invite_codes set active=false,revoked_at=v_now where id=v_invite and campaign_id=p_campaign_id;
    if not found then raise exception 'INVITE_NOT_FOUND'; end if;
    v_details := jsonb_build_object('inviteId',v_invite);
  when 'admin.invites' then
    if jsonb_typeof(p_payload->'items') is distinct from 'array' then raise exception 'INVALID_COUNT'; end if;
    v_count := jsonb_array_length(p_payload->'items');
    if v_count<1 or v_count>200 then raise exception 'INVALID_COUNT'; end if;
    for v_item in select value from jsonb_array_elements(p_payload->'items') loop
      if coalesce(v_item->>'token_hash','') !~ '^[a-f0-9]{64}$' then raise exception 'INVALID_CODE'; end if;
      insert into public.invite_codes(id,campaign_id,token_hash) values((v_item->>'id')::uuid,p_campaign_id,v_item->>'token_hash');
    end loop;
    v_details := jsonb_build_object('count',v_count);
  else raise exception 'UNKNOWN_ADMIN_OPERATION';
  end case;
  insert into public.admin_action_logs(campaign_id,user_id,action,details)
    values(p_campaign_id,p_user_id,substring(p_op from 7),v_details);
  return v_result;
end $$;

revoke all on function public.ccr_open_identity(text,text),public.ccr_submit_open_ballot(text,text,jsonb),
  public.ccr_submit_open_preferences(text,text,text,text,text),public.ccr_admin_mutate(text,uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.ccr_open_identity(text,text),public.ccr_submit_open_ballot(text,text,jsonb),
  public.ccr_submit_open_preferences(text,text,text,text,text),public.ccr_admin_mutate(text,uuid,text,jsonb) to service_role;
