-- =====================================================================
-- MIGRAÇÃO: HISTÓRICO DE ORÇAMENTO (BUDGET HISTORY)
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.budget_history (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id text NOT NULL,
  product_id uuid NOT NULL,
  entity_type text CHECK (entity_type IN ('campaign', 'adset')) NOT NULL,
  entity_id text NOT NULL,
  old_budget numeric NOT NULL,
  new_budget numeric NOT NULL,
  sales_before integer DEFAULT 0,
  roi_before numeric DEFAULT 0,
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS
ALTER TABLE public.budget_history ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Users can view their own budget history" ON public.budget_history
  FOR SELECT TO authenticated USING (
    (user_id = auth.uid()::text OR public.is_authorized())
  );

CREATE POLICY "Users can insert their own budget history" ON public.budget_history
  FOR INSERT TO authenticated WITH CHECK (
    (user_id = auth.uid()::text OR public.is_authorized())
  );

-- Criação de índice para buscas rápidas pelo product_id
CREATE INDEX IF NOT EXISTS idx_budget_history_product_id ON public.budget_history(product_id);
CREATE INDEX IF NOT EXISTS idx_budget_history_entity_id ON public.budget_history(entity_id);
