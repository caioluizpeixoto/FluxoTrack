-- =====================================================================
-- MIGRAÇÃO META ADS V2 — AdPulse
-- Adiciona colunas de saldo nas contas e tabela unificada de Insights
-- =====================================================================

-- 1. Adicionar colunas financeiras na tabela de Contas
ALTER TABLE public.meta_ad_accounts ADD COLUMN IF NOT EXISTS balance numeric(14,2) DEFAULT 0;
ALTER TABLE public.meta_ad_accounts ADD COLUMN IF NOT EXISTS amount_spent numeric(14,2) DEFAULT 0;
ALTER TABLE public.meta_ad_accounts ADD COLUMN IF NOT EXISTS spend_cap numeric(14,2) DEFAULT 0;
ALTER TABLE public.meta_ad_accounts ADD COLUMN IF NOT EXISTS account_status text;
ALTER TABLE public.meta_ad_accounts ADD COLUMN IF NOT EXISTS currency text DEFAULT 'BRL';

-- 2. Tabela flexível para salvar os insights de qualquer período
CREATE TABLE IF NOT EXISTS public.meta_insights_cache (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  ad_account_id text NOT NULL,
  level text NOT NULL, -- 'account', 'campaign', 'adset', 'ad'
  target_id text NOT NULL, -- o id da campanha, conjunto ou anúncio
  date_preset text, -- 'today', 'last_7d', 'custom'
  date_start date NOT NULL,
  date_stop date NOT NULL,
  
  spend numeric(14,2) DEFAULT 0,
  impressions int DEFAULT 0,
  clicks int DEFAULT 0,
  purchases int DEFAULT 0,
  purchase_value numeric(14,2) DEFAULT 0,
  cpc numeric(14,2) DEFAULT 0,
  ctr numeric(5,2) DEFAULT 0,
  cpm numeric(14,2) DEFAULT 0,
  roas numeric(10,2) DEFAULT 0,
  
  raw_data jsonb,
  updated_at timestamptz DEFAULT timezone('utc', now()) NOT NULL,
  
  UNIQUE(user_id, target_id, date_start, date_stop)
);

CREATE INDEX IF NOT EXISTS idx_meta_insights_target ON public.meta_insights_cache(target_id);
CREATE INDEX IF NOT EXISTS idx_meta_insights_dates ON public.meta_insights_cache(date_start, date_stop);

ALTER TABLE public.meta_insights_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "meta_insights_cache_own" ON public.meta_insights_cache
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- Trigger de Updated At
DROP TRIGGER IF EXISTS trg_meta_insights_cache_updated_at ON public.meta_insights_cache;
CREATE TRIGGER trg_meta_insights_cache_updated_at
  BEFORE UPDATE ON public.meta_insights_cache
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();
