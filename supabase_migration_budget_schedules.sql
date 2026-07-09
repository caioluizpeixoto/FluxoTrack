-- =====================================================================
-- MIGRAÇÃO DE AGENDAMENTOS DE ORÇAMENTO (BUDGET SCHEDULES)
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.budget_schedules (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  product_id uuid REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  
  -- Para qual entidade a regra se aplica? ('campaign' ou 'adset')
  target_level text NOT NULL, 
  
  -- O ID da campanha ou conjunto de anúncio na Meta
  target_id text NOT NULL, 
  
  -- Horário em que a regra deve rodar (ex: '23:00' ou '06:00')
  action_time text NOT NULL, 
  
  -- Tipo de ação ('set_fixed', 'reduce_percent', 'increase_percent')
  action_type text NOT NULL, 
  
  -- Valor numérico a ser aplicado. Ex: 50 (R$ 50 para set_fixed, ou 50% para reduce_percent)
  action_value numeric(14,2) NOT NULL,
  
  -- Horário para restaurar/aumentar o orçamento (opcional)
  restore_time text,
  
  -- Valor para restaurar (opcional)
  restore_value numeric(14,2),
  
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT timezone('utc', now()) NOT NULL
);

ALTER TABLE public.budget_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bsched_own" ON public.budget_schedules FOR ALL TO authenticated USING ((SELECT auth.uid()) = user_id);

-- Recarregar schema cache (se houver PostgREST ativo)
NOTIFY pgrst, 'reload schema';
