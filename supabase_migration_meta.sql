-- =====================================================================
-- MIGRAÇÃO META ADS — FluxoFy
-- Execute no Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- =====================================================================

-- ─── Função auxiliar de updated_at ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc', now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ─── 1. meta_connections ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.meta_connections (
  id             uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id        uuid        REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  facebook_user_id text      NOT NULL,
  facebook_name  text,
  access_token   text        NOT NULL,
  token_type     text        DEFAULT 'bearer',
  expires_at     timestamptz,
  scopes         text[]      DEFAULT '{}',
  status         text        DEFAULT 'connected' CHECK (status IN ('connected','disconnected','expired')),
  created_at     timestamptz DEFAULT timezone('utc', now()) NOT NULL,
  updated_at     timestamptz DEFAULT timezone('utc', now()) NOT NULL,
  UNIQUE (user_id, facebook_user_id)
);

CREATE INDEX IF NOT EXISTS idx_meta_connections_user_id ON public.meta_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_meta_connections_facebook_user_id ON public.meta_connections(facebook_user_id);

ALTER TABLE public.meta_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "meta_connections_own" ON public.meta_connections
  FOR ALL TO authenticated
  USING  ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP TRIGGER IF EXISTS trg_meta_connections_updated_at ON public.meta_connections;
CREATE TRIGGER trg_meta_connections_updated_at
  BEFORE UPDATE ON public.meta_connections
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── 2. meta_businesses ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.meta_businesses (
  id                  uuid  DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id             uuid  REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  connection_id       uuid  REFERENCES public.meta_connections(id) ON DELETE CASCADE NOT NULL,
  business_id         text  NOT NULL,
  name                text  NOT NULL,
  verification_status text,
  created_at          timestamptz DEFAULT timezone('utc', now()) NOT NULL,
  updated_at          timestamptz DEFAULT timezone('utc', now()) NOT NULL,
  UNIQUE (user_id, business_id)
);

CREATE INDEX IF NOT EXISTS idx_meta_businesses_user_id       ON public.meta_businesses(user_id);
CREATE INDEX IF NOT EXISTS idx_meta_businesses_connection_id ON public.meta_businesses(connection_id);
CREATE INDEX IF NOT EXISTS idx_meta_businesses_business_id   ON public.meta_businesses(business_id);

ALTER TABLE public.meta_businesses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "meta_businesses_own" ON public.meta_businesses
  FOR ALL TO authenticated
  USING  ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP TRIGGER IF EXISTS trg_meta_businesses_updated_at ON public.meta_businesses;
CREATE TRIGGER trg_meta_businesses_updated_at
  BEFORE UPDATE ON public.meta_businesses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── 3. meta_ad_accounts ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.meta_ad_accounts (
  id              uuid  DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         uuid  REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  connection_id   uuid  REFERENCES public.meta_connections(id) ON DELETE CASCADE NOT NULL,
  business_id     text,
  account_id      text  NOT NULL,
  account_name    text  NOT NULL,
  currency        text,
  timezone_name   text,
  account_status  text,
  created_at      timestamptz DEFAULT timezone('utc', now()) NOT NULL,
  updated_at      timestamptz DEFAULT timezone('utc', now()) NOT NULL,
  UNIQUE (user_id, account_id)
);

CREATE INDEX IF NOT EXISTS idx_meta_ad_accounts_user_id       ON public.meta_ad_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_meta_ad_accounts_connection_id ON public.meta_ad_accounts(connection_id);
CREATE INDEX IF NOT EXISTS idx_meta_ad_accounts_account_id    ON public.meta_ad_accounts(account_id);
CREATE INDEX IF NOT EXISTS idx_meta_ad_accounts_business_id   ON public.meta_ad_accounts(business_id);

ALTER TABLE public.meta_ad_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "meta_ad_accounts_own" ON public.meta_ad_accounts
  FOR ALL TO authenticated
  USING  ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP TRIGGER IF EXISTS trg_meta_ad_accounts_updated_at ON public.meta_ad_accounts;
CREATE TRIGGER trg_meta_ad_accounts_updated_at
  BEFORE UPDATE ON public.meta_ad_accounts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── 4. meta_pixels ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.meta_pixels (
  id              uuid  DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         uuid  REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  connection_id   uuid  REFERENCES public.meta_connections(id) ON DELETE CASCADE NOT NULL,
  ad_account_id   text  NOT NULL,
  pixel_id        text  NOT NULL,
  pixel_name      text,
  created_at      timestamptz DEFAULT timezone('utc', now()) NOT NULL,
  updated_at      timestamptz DEFAULT timezone('utc', now()) NOT NULL,
  UNIQUE (user_id, pixel_id)
);

CREATE INDEX IF NOT EXISTS idx_meta_pixels_user_id       ON public.meta_pixels(user_id);
CREATE INDEX IF NOT EXISTS idx_meta_pixels_connection_id ON public.meta_pixels(connection_id);
CREATE INDEX IF NOT EXISTS idx_meta_pixels_ad_account_id ON public.meta_pixels(ad_account_id);
CREATE INDEX IF NOT EXISTS idx_meta_pixels_pixel_id      ON public.meta_pixels(pixel_id);

ALTER TABLE public.meta_pixels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "meta_pixels_own" ON public.meta_pixels
  FOR ALL TO authenticated
  USING  ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP TRIGGER IF EXISTS trg_meta_pixels_updated_at ON public.meta_pixels;
CREATE TRIGGER trg_meta_pixels_updated_at
  BEFORE UPDATE ON public.meta_pixels
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── 5. meta_campaign_metrics ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.meta_campaign_metrics (
  id              uuid    DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         uuid    REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  connection_id   uuid    REFERENCES public.meta_connections(id) ON DELETE CASCADE NOT NULL,
  ad_account_id   text    NOT NULL,
  campaign_id     text    NOT NULL,
  campaign_name   text    NOT NULL,
  date_start      date    NOT NULL,
  date_stop       date    NOT NULL,
  spend           numeric(14,2) DEFAULT 0,
  impressions     integer       DEFAULT 0,
  clicks          integer       DEFAULT 0,
  ctr             numeric(10,4) DEFAULT 0,
  cpc             numeric(14,2) DEFAULT 0,
  cpm             numeric(14,2) DEFAULT 0,
  reach           integer       DEFAULT 0,
  frequency       numeric(8,4)  DEFAULT 0,
  purchases       integer       DEFAULT 0,
  purchase_value  numeric(14,2) DEFAULT 0,
  leads           integer       DEFAULT 0,
  cost_per_lead   numeric(14,2) DEFAULT 0,
  roas            numeric(10,4) DEFAULT 0,
  raw_data        jsonb,
  created_at      timestamptz DEFAULT timezone('utc', now()) NOT NULL,
  updated_at      timestamptz DEFAULT timezone('utc', now()) NOT NULL,
  UNIQUE (user_id, ad_account_id, campaign_id, date_start, date_stop)
);

CREATE INDEX IF NOT EXISTS idx_meta_metrics_user_id       ON public.meta_campaign_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_meta_metrics_connection_id ON public.meta_campaign_metrics(connection_id);
CREATE INDEX IF NOT EXISTS idx_meta_metrics_account_id    ON public.meta_campaign_metrics(ad_account_id);
CREATE INDEX IF NOT EXISTS idx_meta_metrics_campaign_id   ON public.meta_campaign_metrics(campaign_id);
CREATE INDEX IF NOT EXISTS idx_meta_metrics_date_start    ON public.meta_campaign_metrics(date_start DESC);
CREATE INDEX IF NOT EXISTS idx_meta_metrics_date_stop     ON public.meta_campaign_metrics(date_stop DESC);

ALTER TABLE public.meta_campaign_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "meta_metrics_own" ON public.meta_campaign_metrics
  FOR ALL TO authenticated
  USING  ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP TRIGGER IF EXISTS trg_meta_metrics_updated_at ON public.meta_campaign_metrics;
CREATE TRIGGER trg_meta_metrics_updated_at
  BEFORE UPDATE ON public.meta_campaign_metrics
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── Colunas extras no profiles (compatibilidade) ────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS facebook_id   text,
  ADD COLUMN IF NOT EXISTS facebook_name text,
  ADD COLUMN IF NOT EXISTS meta_token_expires_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_profiles_facebook_id
  ON public.profiles(facebook_id) WHERE facebook_id IS NOT NULL;
