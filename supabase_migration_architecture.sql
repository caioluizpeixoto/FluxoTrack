-- =====================================================================
-- MIGRAÇÃO DE ARQUITETURA MULTI-DASHBOARD — FluxoFy
-- =====================================================================

-- 1. Dashboards
CREATE TABLE IF NOT EXISTS public.dashboards (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text,
  created_at timestamptz DEFAULT timezone('utc', now()) NOT NULL,
  updated_at timestamptz DEFAULT timezone('utc', now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_dashboards_user ON public.dashboards(user_id);

ALTER TABLE public.dashboards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dashboards_own" ON public.dashboards FOR ALL TO authenticated USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);

-- Trigger
DROP TRIGGER IF EXISTS trg_dashboards_updated_at ON public.dashboards;
CREATE TRIGGER trg_dashboards_updated_at BEFORE UPDATE ON public.dashboards FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

-- 2. Products (Alteração se existir, ou criação)
-- Como a estrutura mudou radicalmente, vamos garantir as colunas em vez de dar drop para não quebrar referências.
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS dashboard_id uuid REFERENCES public.dashboards(id) ON DELETE CASCADE;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS price numeric(14,2) DEFAULT 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS product_cost numeric(14,2) DEFAULT 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS currency text DEFAULT 'BRL';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';

CREATE INDEX IF NOT EXISTS idx_products_dashboard ON public.products(dashboard_id);

-- 3. Tabelas de Vínculo Many-to-Many

-- Contas de Anúncio
CREATE TABLE IF NOT EXISTS public.product_ad_accounts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  product_id uuid REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  ad_account_id text NOT NULL,
  created_at timestamptz DEFAULT timezone('utc', now()) NOT NULL,
  UNIQUE(product_id, ad_account_id)
);
ALTER TABLE public.product_ad_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "paa_own" ON public.product_ad_accounts FOR ALL TO authenticated USING ((SELECT auth.uid()) = user_id);

-- Campanhas
CREATE TABLE IF NOT EXISTS public.product_campaigns (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  product_id uuid REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  campaign_id text NOT NULL,
  campaign_name text,
  created_at timestamptz DEFAULT timezone('utc', now()) NOT NULL,
  UNIQUE(product_id, campaign_id)
);
ALTER TABLE public.product_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pc_own" ON public.product_campaigns FOR ALL TO authenticated USING ((SELECT auth.uid()) = user_id);

-- Pixels
CREATE TABLE IF NOT EXISTS public.product_pixels (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  product_id uuid REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  pixel_id text NOT NULL,
  pixel_name text,
  created_at timestamptz DEFAULT timezone('utc', now()) NOT NULL,
  UNIQUE(product_id, pixel_id)
);
ALTER TABLE public.product_pixels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pp_own" ON public.product_pixels FOR ALL TO authenticated USING ((SELECT auth.uid()) = user_id);

-- Webhooks
CREATE TABLE IF NOT EXISTS public.product_webhooks (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  product_id uuid REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  webhook_id text NOT NULL,
  webhook_name text,
  webhook_url text,
  created_at timestamptz DEFAULT timezone('utc', now()) NOT NULL,
  UNIQUE(product_id, webhook_id)
);
ALTER TABLE public.product_webhooks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pw_own" ON public.product_webhooks FOR ALL TO authenticated USING ((SELECT auth.uid()) = user_id);

-- Regras de Eventos (Opcional, para classificar Leads vs Purchases)
CREATE TABLE IF NOT EXISTS public.product_event_rules (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  product_id uuid REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  event_name text NOT NULL, -- ex: 'PixGerado'
  event_type text NOT NULL, -- ex: 'lead', 'checkout', 'purchase'
  created_at timestamptz DEFAULT timezone('utc', now()) NOT NULL,
  UNIQUE(product_id, event_name, event_type)
);
ALTER TABLE public.product_event_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "per_own" ON public.product_event_rules FOR ALL TO authenticated USING ((SELECT auth.uid()) = user_id);

-- 4. Cache Exclusivo de Métricas do Produto
CREATE TABLE IF NOT EXISTS public.product_metrics_cache (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  product_id uuid REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  date_start date NOT NULL,
  date_stop date NOT NULL,
  spend numeric(14,2) DEFAULT 0,
  sales int DEFAULT 0,
  revenue numeric(14,2) DEFAULT 0,
  product_cost_total numeric(14,2) DEFAULT 0,
  profit numeric(14,2) DEFAULT 0,
  roi numeric(10,2) DEFAULT 0,
  roas numeric(10,2) DEFAULT 0,
  cpa numeric(14,2) DEFAULT 0,
  leads int DEFAULT 0,
  checkouts int DEFAULT 0,
  raw_data jsonb,
  updated_at timestamptz DEFAULT timezone('utc', now()) NOT NULL,
  UNIQUE(product_id, date_start, date_stop)
);
ALTER TABLE public.product_metrics_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pmc_own" ON public.product_metrics_cache FOR ALL TO authenticated USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
DROP TRIGGER IF EXISTS trg_product_metrics_cache_updated_at ON public.product_metrics_cache;
CREATE TRIGGER trg_product_metrics_cache_updated_at BEFORE UPDATE ON public.product_metrics_cache FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();
