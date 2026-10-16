-- CCR Year-End 2026 event portal preferences
ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS event_date date NULL,
  ADD COLUMN IF NOT EXISTS event_time_note text NOT NULL DEFAULT 'รอยืนยันเวลา',
  ADD COLUMN IF NOT EXISTS venue_name text NOT NULL DEFAULT 'ครัวซอย 11',
  ADD COLUMN IF NOT EXISTS venue_address text NOT NULL DEFAULT 'เฉลิมพระเกียรติ ร.9 ซอย 11 แขวงหนองบอน เขตประเวศ กรุงเทพมหานคร 10250';

UPDATE public.campaigns
SET event_date='2026-12-18',
    event_time_note='รอยืนยันเวลา',
    venue_name='ครัวซอย 11',
    venue_address='เฉลิมพระเกียรติ ร.9 ซอย 11 แขวงหนองบอน เขตประเวศ กรุงเทพมหานคร 10250'
WHERE id='ccr-2026';

CREATE TABLE IF NOT EXISTS public.event_preferences (
  invite_id uuid PRIMARY KEY REFERENCES public.invite_codes(id) ON DELETE CASCADE,
  campaign_id text NOT NULL REFERENCES public.campaigns(id),
  attendance text NOT NULL CHECK (attendance IN ('yes','maybe','no')),
  gift_choice text NOT NULL CHECK (gift_choice IN ('gift_300','gift_500','gift_300_500','gift_none')),
  theme_choice text NOT NULL CHECK (theme_choice IN ('midnight_gold','forest_champagne','retro_future','come_as_you_are')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_event_preferences_campaign
ON public.event_preferences(campaign_id, updated_at DESC);

ALTER TABLE public.event_preferences ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.event_preferences FROM anon, authenticated;
GRANT ALL ON public.event_preferences TO service_role;

CREATE OR REPLACE FUNCTION public.submit_event_preferences(
  p_campaign_id text,
  p_token_hash text,
  p_attendance text,
  p_gift_choice text,
  p_theme_choice text
)
RETURNS TABLE(saved_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public,pg_temp
AS $$
DECLARE
  v_status text;
  v_invite_id uuid;
  v_saved_at timestamptz;
BEGIN
  SELECT status INTO v_status
  FROM public.campaigns
  WHERE id=p_campaign_id
  FOR SHARE;

  IF v_status IS DISTINCT FROM 'open' THEN
    RAISE EXCEPTION 'VOTING_CLOSED';
  END IF;

  IF p_attendance NOT IN ('yes','maybe','no') THEN RAISE EXCEPTION 'INVALID_ATTENDANCE'; END IF;
  IF p_gift_choice NOT IN ('gift_300','gift_500','gift_300_500','gift_none') THEN RAISE EXCEPTION 'INVALID_GIFT_CHOICE'; END IF;
  IF p_theme_choice NOT IN ('midnight_gold','forest_champagne','retro_future','come_as_you_are') THEN RAISE EXCEPTION 'INVALID_THEME_CHOICE'; END IF;

  SELECT id INTO v_invite_id
  FROM public.invite_codes
  WHERE campaign_id=p_campaign_id
    AND token_hash=p_token_hash
    AND active=true
  FOR UPDATE;

  IF v_invite_id IS NULL THEN
    RAISE EXCEPTION 'INVALID_INVITE';
  END IF;

  INSERT INTO public.event_preferences(invite_id,campaign_id,attendance,gift_choice,theme_choice)
  VALUES(v_invite_id,p_campaign_id,p_attendance,p_gift_choice,p_theme_choice)
  ON CONFLICT(invite_id) DO UPDATE
    SET attendance=EXCLUDED.attendance,
        gift_choice=EXCLUDED.gift_choice,
        theme_choice=EXCLUDED.theme_choice,
        updated_at=now()
  RETURNING updated_at INTO v_saved_at;

  RETURN QUERY SELECT v_saved_at;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_event_preferences(text,text,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.submit_event_preferences(text,text,text,text,text) TO service_role;
