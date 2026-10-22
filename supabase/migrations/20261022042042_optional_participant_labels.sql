-- Optional, non-unique display labels. They never authorize access to a response.
alter table public.invite_codes add column participant_label text not null default ''
  check (char_length(participant_label)<=80 and participant_label !~ '[[:cntrl:]]');

create function public.ccr_set_participant_label(p_campaign_id text,p_token_hash text,p_label text)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare v_id uuid;
begin
  if p_label is not null and (char_length(p_label)>80 or p_label ~ '[[:cntrl:]]') then
    raise exception 'INVALID_PARTICIPANT_LABEL';
  end if;
  select id into v_id from public.invite_codes
    where campaign_id=p_campaign_id and token_hash=p_token_hash and active for update;
  if v_id is null then raise exception 'INVALID_INVITE'; end if;
  -- Old clients that omit this field retain a label saved by a newer client.
  if p_label is not null then
    update public.invite_codes set participant_label=p_label where id=v_id;
  end if;
  return v_id;
end $$;

create function public.ccr_submit_labeled_ballot(
  p_campaign_id text,p_token_hash text,p_choices jsonb,p_label text default null,p_open boolean default false
) returns table(receipt uuid,saved_at timestamptz)
language plpgsql security invoker set search_path = '' as $$
declare v_receipt uuid; v_saved timestamptz;
begin
  if p_open then perform public.ccr_open_identity(p_campaign_id,p_token_hash); end if;
  select s.receipt,s.saved_at into v_receipt,v_saved from public.submit_ballot(p_campaign_id,p_token_hash,p_choices) s;
  perform public.ccr_set_participant_label(p_campaign_id,p_token_hash,p_label);
  return query select v_receipt,v_saved;
end $$;

create function public.ccr_submit_labeled_preferences(
  p_campaign_id text,p_token_hash text,p_attendance text,p_gift_choice text,p_theme_choice text,
  p_label text default null,p_open boolean default false
) returns table(receipt uuid,saved_at timestamptz)
language plpgsql security invoker set search_path = '' as $$
declare v_id uuid; v_saved timestamptz;
begin
  if p_open then perform public.ccr_open_identity(p_campaign_id,p_token_hash); end if;
  select s.saved_at into v_saved from public.submit_event_preferences(p_campaign_id,p_token_hash,p_attendance,p_gift_choice,p_theme_choice) s;
  v_id := public.ccr_set_participant_label(p_campaign_id,p_token_hash,p_label);
  return query select v_id,v_saved;
end $$;

revoke all on function public.ccr_set_participant_label(text,text,text),
  public.ccr_submit_labeled_ballot(text,text,jsonb,text,boolean),
  public.ccr_submit_labeled_preferences(text,text,text,text,text,text,boolean) from public,anon,authenticated;
grant execute on function public.ccr_set_participant_label(text,text,text),
  public.ccr_submit_labeled_ballot(text,text,jsonb,text,boolean),
  public.ccr_submit_labeled_preferences(text,text,text,text,text,text,boolean) to service_role;
