-- =====================================================================
-- MIGRAÇÃO META ADS MANAGER — FluxoFy
-- Cria as tabelas para espelhar a estrutura do Facebook Ads (Campanhas, Conjuntos e Anúncios)
-- =====================================================================

-- ─── 1. meta_campaigns ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.meta_campaigns (
  id              uuid    DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         uuid    REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  connection_id   uuid    REFERENCES public.meta_connections(id) ON DELETE CASCADE NOT NULL,
  ad_account_id   text    NOT NULL,
  campaign_id     text    NOT NULL,
  name            text    NOT NULL,
  status          text    DEFAULT 'ACTIVE',
  daily_budget    numeric(14,2),
  lifetime_budget numeric(14,2),
  objective       text,
  created_at      timestamptz DEFAULT timezone('utc', now()) NOT NULL,
  updated_at      timestamptz DEFAULT timezone('utc', now()) NOT NULL,
  UNIQUE (user_id, ad_account_id, campaign_id)
);

CREATE INDEX IF NOT EXISTS idx_meta_campaigns_user_id ON public.meta_campaigns(user_id);
CREATE INDEX IF NOT EXISTS idx_meta_campaigns_account_id ON public.meta_campaigns(ad_account_id);

ALTER TABLE public.meta_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "meta_campaigns_own" ON public.meta_campaigns
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP TRIGGER IF EXISTS trg_meta_campaigns_updated_at ON public.meta_campaigns;
CREATE TRIGGER trg_meta_campaigns_updated_at
  BEFORE UPDATE ON public.meta_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── 2. meta_adsets ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.meta_adsets (
  id              uuid    DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         uuid    REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  connection_id   uuid    REFERENCES public.meta_connections(id) ON DELETE CASCADE NOT NULL,
  ad_account_id   text    NOT NULL,
  campaign_id     text    NOT NULL,
  adset_id        text    NOT NULL,
  name            text    NOT NULL,
  status          text    DEFAULT 'ACTIVE',
  daily_budget    numeric(14,2),
  lifetime_budget numeric(14,2),
  created_at      timestamptz DEFAULT timezone('utc', now()) NOT NULL,
  updated_at      timestamptz DEFAULT timezone('utc', now()) NOT NULL,
  UNIQUE (user_id, ad_account_id, adset_id)
);

CREATE INDEX IF NOT EXISTS idx_meta_adsets_user_id ON public.meta_adsets(user_id);
CREATE INDEX IF NOT EXISTS idx_meta_adsets_campaign_id ON public.meta_adsets(campaign_id);

ALTER TABLE public.meta_adsets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "meta_adsets_own" ON public.meta_adsets
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP TRIGGER IF EXISTS trg_meta_adsets_updated_at ON public.meta_adsets;
CREATE TRIGGER trg_meta_adsets_updated_at
  BEFORE UPDATE ON public.meta_adsets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── 3. meta_ads ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.meta_ads (
  id              uuid    DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         uuid    REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  connection_id   uuid    REFERENCES public.meta_connections(id) ON DELETE CASCADE NOT NULL,
  ad_account_id   text    NOT NULL,
  campaign_id     text    NOT NULL,
  adset_id        text    NOT NULL,
  ad_id           text    NOT NULL,
  name            text    NOT NULL,
  status          text    DEFAULT 'ACTIVE',
  creative_id     text,
  url_tags        text,
  created_at      timestamptz DEFAULT timezone('utc', now()) NOT NULL,
  updated_at      timestamptz DEFAULT timezone('utc', now()) NOT NULL,
  UNIQUE (user_id, ad_account_id, ad_id)
);

CREATE INDEX IF NOT EXISTS idx_meta_ads_user_id ON public.meta_ads(user_id);
CREATE INDEX IF NOT EXISTS idx_meta_ads_adset_id ON public.meta_ads(adset_id);

ALTER TABLE public.meta_ads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "meta_ads_own" ON public.meta_ads
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP TRIGGER IF EXISTS trg_meta_ads_updated_at ON public.meta_ads;
CREATE TRIGGER trg_meta_ads_updated_at
  BEFORE UPDATE ON public.meta_ads
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Recarregar o cache do schema
NOTIFY pgrst, 'reload schema';
