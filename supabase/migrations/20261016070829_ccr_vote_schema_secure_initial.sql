CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE public.campaigns (
  id text PRIMARY KEY,
  title text NOT NULL,
  status text NOT NULL DEFAULT 'closed' CHECK(status IN ('open','closed')),
  target_budget integer NOT NULL DEFAULT 2000,
  consideration_budget integer NOT NULL DEFAULT 2200,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.menu_categories (
  campaign_id text NOT NULL REFERENCES public.campaigns(id),
  category_key text NOT NULL CHECK(category_key IN ('A','B','C','D','E','F','G','H')),
  position smallint NOT NULL,
  label text NOT NULL,
  PRIMARY KEY(campaign_id,category_key)
);

CREATE TABLE public.menu_options (
  id text PRIMARY KEY,
  campaign_id text NOT NULL REFERENCES public.campaigns(id),
  category_key text NOT NULL,
  name text NOT NULL,
  unit_price integer NOT NULL CHECK(unit_price>=0),
  default_qty integer NOT NULL CHECK(default_qty>0),
  note text NOT NULL DEFAULT '',
  source_image text NOT NULL DEFAULT '',
  portion_check boolean NOT NULL DEFAULT false,
  FOREIGN KEY(campaign_id,category_key) REFERENCES public.menu_categories(campaign_id,category_key)
);

CREATE TABLE public.invite_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id text NOT NULL REFERENCES public.campaigns(id),
  token_hash text NOT NULL UNIQUE,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.ballots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invite_id uuid NOT NULL UNIQUE REFERENCES public.invite_codes(id),
  campaign_id text NOT NULL REFERENCES public.campaigns(id),
  choices jsonb NOT NULL CHECK(jsonb_typeof(choices)='object'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.admin_users (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_invite_campaign ON public.invite_codes(campaign_id);
CREATE INDEX idx_ballot_campaign ON public.ballots(campaign_id);

ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invite_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ballots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.campaigns,public.menu_categories,public.menu_options,public.invite_codes,public.ballots,public.admin_users FROM anon,authenticated;
GRANT ALL ON public.campaigns,public.menu_categories,public.menu_options,public.invite_codes,public.ballots,public.admin_users TO service_role;

INSERT INTO public.campaigns(id,title,status) VALUES
('ccr-2026','ครัวซอย 11 — CCR Year-End Dinner','closed');

INSERT INTO public.menu_categories(campaign_id,category_key,position,label) VALUES
('ccr-2026','A',1,'ต้ม / แกง / อาหารน้ำ'),
('ccr-2026','B',2,'ปลา / จานหลักจากปลา'),
('ccr-2026','C',3,'ผัดเนื้อสัตว์ / กับข้าว'),
('ccr-2026','D',4,'ผัก / อาหารจานผัก'),
('ccr-2026','E',5,'ทอด / ย่าง'),
('ccr-2026','F',6,'ยำ / ตำ / ลาบ'),
('ccr-2026','G',7,'ไข่ / เมนูพิเศษ'),
('ccr-2026','H',8,'ข้าวผัด');

CREATE OR REPLACE FUNCTION public.submit_ballot(p_campaign_id text,p_token_hash text,p_choices jsonb)
RETURNS TABLE(receipt uuid,saved_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $func$
DECLARE
  v_status text;
  v_invite_id uuid;
  v_key text;
  v_selected text;
  v_expected text[]:=ARRAY['A','B','C','D','E','F','G','H'];
  v_valid boolean;
BEGIN
  SELECT status INTO v_status FROM public.campaigns WHERE id=p_campaign_id FOR SHARE;
  IF v_status IS DISTINCT FROM 'open' THEN RAISE EXCEPTION 'VOTING_CLOSED'; END IF;
  SELECT id INTO v_invite_id FROM public.invite_codes
    WHERE campaign_id=p_campaign_id AND token_hash=p_token_hash AND active=true FOR UPDATE;
  IF v_invite_id IS NULL THEN RAISE EXCEPTION 'INVALID_INVITE'; END IF;
  IF p_choices IS NULL OR jsonb_typeof(p_choices)<>'object'
     OR (SELECT count(*) FROM jsonb_object_keys(p_choices))<>8
  THEN RAISE EXCEPTION 'INVALID_BALLOT_SHAPE'; END IF;
  FOREACH v_key IN ARRAY v_expected LOOP
    v_selected:=p_choices->>v_key;
    SELECT EXISTS(
      SELECT 1 FROM public.menu_options
      WHERE campaign_id=p_campaign_id AND category_key=v_key AND id=v_selected
    ) INTO v_valid;
    IF NOT v_valid THEN RAISE EXCEPTION 'INVALID_MENU_OPTION: %',v_key; END IF;
  END LOOP;
  IF EXISTS(
    SELECT 1 FROM jsonb_object_keys(p_choices) AS t(k)
    WHERE NOT(t.k=ANY(v_expected))
  ) THEN RAISE EXCEPTION 'UNKNOWN_CATEGORY'; END IF;
  RETURN QUERY
    INSERT INTO public.ballots(invite_id,campaign_id,choices)
    VALUES(v_invite_id,p_campaign_id,p_choices)
    ON CONFLICT(invite_id) DO UPDATE SET choices=EXCLUDED.choices,updated_at=now()
    RETURNING public.ballots.id,public.ballots.updated_at;
END
$func$;

REVOKE ALL ON FUNCTION public.submit_ballot(text,text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.submit_ballot(text,text,jsonb) TO service_role;
