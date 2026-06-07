-- =====================================================================
-- MIGRAÇÃO DE EXTENSÕES DO PRODUTO (Taxes, Expenses, Rules, UTMs)
-- =====================================================================

-- 1. Taxas do Produto (Gateway, Impostos, etc)
CREATE TABLE IF NOT EXISTS public.product_taxes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  product_id uuid REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL, -- Ex: 'Taxa Cartão', 'Imposto NF'
  percentage numeric(5,2) DEFAULT 0, -- Ex: 4.99 (%)
  fixed_amount numeric(14,2) DEFAULT 0, -- Ex: 1.00 (R$)
  created_at timestamptz DEFAULT timezone('utc', now()) NOT NULL
);
ALTER TABLE public.product_taxes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ptax_own" ON public.product_taxes FOR ALL TO authenticated USING ((SELECT auth.uid()) = user_id);

-- 2. Despesas Avulsas (Freelancer, Softwares)
CREATE TABLE IF NOT EXISTS public.product_expenses (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  product_id uuid REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL, -- Ex: 'Designer Criativos'
  amount numeric(14,2) NOT NULL,
  expense_date date NOT NULL,
  created_at timestamptz DEFAULT timezone('utc', now()) NOT NULL
);
ALTER TABLE public.product_expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pexp_own" ON public.product_expenses FOR ALL TO authenticated USING ((SELECT auth.uid()) = user_id);

-- 3. Regras de Automação
CREATE TABLE IF NOT EXISTS public.product_rules (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  product_id uuid REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL, -- Ex: 'Pausar CPA > 50'
  condition_metric text NOT NULL, -- 'cpa', 'roas', 'spend'
  condition_operator text NOT NULL, -- '>', '<', '=='
  condition_value numeric(14,2) NOT NULL,
  action_type text NOT NULL, -- 'pause_campaign', 'increase_budget', 'alert'
  action_value numeric(14,2), -- Ex: 20 (para aumentar 20%)
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT timezone('utc', now()) NOT NULL
);
ALTER TABLE public.product_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "prul_own" ON public.product_rules FOR ALL TO authenticated USING ((SELECT auth.uid()) = user_id);

-- 4. UTMs e Construtor
CREATE TABLE IF NOT EXISTS public.product_utms (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  product_id uuid REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  base_url text NOT NULL,
  utm_source text DEFAULT '{{site_source_name}}',
  utm_medium text,
  utm_campaign text DEFAULT '{{campaign.id}}',
  utm_content text DEFAULT '{{adset.id}}',
  utm_term text DEFAULT '{{ad.id}}',
  created_at timestamptz DEFAULT timezone('utc', now()) NOT NULL,
  UNIQUE(product_id) -- Uma configuração base por produto, ou múltiplas se preferir (vamos permitir 1 principal)
);
ALTER TABLE public.product_utms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "putms_own" ON public.product_utms FOR ALL TO authenticated USING ((SELECT auth.uid()) = user_id);

-- Recarregar schema cache (se houver PostgREST ativo)
NOTIFY pgrst, 'reload schema';
