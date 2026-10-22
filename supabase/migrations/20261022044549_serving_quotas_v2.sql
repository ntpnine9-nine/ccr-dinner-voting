-- Serving allocation v2. Preserve raw historical ballots and all unit prices.
alter table public.menu_categories add column if not exists serving_quota integer not null default 1 check(serving_quota in (1,2));
alter table public.menu_categories add column if not exists billing_multiplier integer not null default 1 check(billing_multiplier in (1,2));
do $$
declare v_status text;
begin
  select status into v_status from public.campaigns where id='ccr-2026' for update;
  if exists(select 1 from public.campaigns where id='ccr-2026' and results_frozen_at is not null) then raise exception 'RESULTS_FROZEN'; end if;
  -- Catalog guards require a closed campaign; restoration is in this same transaction.
  update public.campaigns set status='closed' where id='ccr-2026';
  update public.menu_categories set serving_quota=case when category_key in ('A','B','C','E','F') then 2 else 1 end,
    billing_multiplier=case when category_key='H' then 2 else 1 end where campaign_id='ccr-2026';
  update public.menu_options m set default_qty=c.serving_quota*c.billing_multiplier,catalog_version=2
    from public.menu_categories c where m.campaign_id=c.campaign_id and m.category_key=c.category_key and m.campaign_id='ccr-2026';
  update public.campaigns set catalog_version=2,status=v_status,updated_at=now() where id='ccr-2026';
end $$;

create or replace function public.ccr_validate_choices(p_campaign_id text,p_choices jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare c record; e record; v_value jsonb; v_qty int; v_total int; v_out jsonb:='{}'; v_cat jsonb;
begin
  if p_choices is null or jsonb_typeof(p_choices)<>'object' then raise exception 'INVALID_CHOICES'; end if;
  if (select count(*) from jsonb_object_keys(p_choices))<>8 or exists(select 1 from jsonb_object_keys(p_choices) k where k not in ('A','B','C','D','E','F','G','H')) then raise exception 'SELECT_EIGHT_CATEGORIES'; end if;
  for c in select category_key,serving_quota from public.menu_categories where campaign_id=p_campaign_id order by position loop
    v_value:=p_choices->c.category_key;
    -- Historical one-menu clients select that menu for the category's full quota.
    if jsonb_typeof(v_value)='string' then v_value:=jsonb_build_object(p_choices->>c.category_key,c.serving_quota); end if;
    if v_value is null or jsonb_typeof(v_value)<>'object' then raise exception 'INVALID_CHOICES'; end if;
    v_total:=0;v_cat:='{}';
    for e in select key,value from jsonb_each(v_value) loop
      if jsonb_typeof(e.value)<>'number' or e.value::text !~ '^[12]$' then raise exception 'INVALID_SERVING_QUANTITY'; end if;
      v_qty:=(e.value::text)::integer;
      if not exists(select 1 from public.menu_options where campaign_id=p_campaign_id and category_key=c.category_key and id=e.key and availability_status<>'unavailable') then raise exception 'INVALID_MENU_OPTION'; end if;
      v_total:=v_total+v_qty;v_cat:=v_cat||jsonb_build_object(e.key,v_qty);
    end loop;
    if v_total<>c.serving_quota then raise exception 'INVALID_SERVING_QUOTA: % requires %',c.category_key,c.serving_quota; end if;
    v_out:=v_out||jsonb_build_object(c.category_key,v_cat);
  end loop;
  if (select count(*) from jsonb_object_keys(v_out))<>8 then raise exception 'INVALID_CATALOG'; end if;
  return v_out;
end $$;
revoke all on function public.ccr_validate_choices(text,jsonb) from public,anon,authenticated;
grant execute on function public.ccr_validate_choices(text,jsonb) to service_role;

create or replace function public.submit_ballot(p_campaign_id text,p_token_hash text,p_choices jsonb)
returns table(receipt uuid,saved_at timestamptz) language plpgsql security invoker set search_path='' as $$
declare v_campaign public.campaigns;v_invite_id uuid;v_choices jsonb;v_ballot_id uuid;v_saved_at timestamptz;v_event text;
begin
  select * into v_campaign from public.campaigns where id=p_campaign_id for share;
  if v_campaign.status is distinct from 'open' or v_campaign.results_frozen_at is not null then raise exception 'VOTING_CLOSED'; end if;
  select id into v_invite_id from public.invite_codes where campaign_id=p_campaign_id and token_hash=p_token_hash and active for update;
  if v_invite_id is null then raise exception 'INVALID_INVITE'; end if;
  v_choices:=public.ccr_validate_choices(p_campaign_id,p_choices);
  if exists(select 1 from public.ballots where invite_id=v_invite_id) then v_event:='updated'; else v_event:='created'; end if;
  insert into public.ballots(invite_id,campaign_id,choices) values(v_invite_id,p_campaign_id,v_choices)
    on conflict(invite_id) do update set choices=excluded.choices,updated_at=now() returning id,updated_at into v_ballot_id,v_saved_at;
  insert into public.ballot_audit_events(campaign_id,ballot_id,invite_id,event_type) values(p_campaign_id,v_ballot_id,v_invite_id,v_event);
  return query select v_ballot_id,v_saved_at;
end $$;
revoke all on function public.submit_ballot(text,text,jsonb) from public,anon,authenticated;
grant execute on function public.submit_ballot(text,text,jsonb) to service_role;

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
    v_choices := public.ccr_validate_choices(p_campaign_id,p_payload->'choices');
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

