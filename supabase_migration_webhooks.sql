-- =====================================================================
-- MIGRAÇÃO: TABELA DE EVENTOS DO PRODUTO (WEBHOOKS)
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.product_events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id uuid REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  event_type text NOT NULL, -- Ex: 'purchase', 'lead', 'abandoned_cart'
  event_value numeric(14,2) DEFAULT 0, -- Valor da venda
  currency text DEFAULT 'BRL',
  status text DEFAULT 'approved', -- 'approved', 'refunded', 'pending'
  customer_email text,
  customer_name text,
  transaction_id text,
  raw_payload jsonb, -- JSON inteiro caso precisemos auditar depois
  created_at timestamptz DEFAULT timezone('utc', now()) NOT NULL
);

-- Índices para otimizar soma e contagem de vendas
CREATE INDEX IF NOT EXISTS idx_product_events_pid_type ON public.product_events(product_id, event_type);
CREATE INDEX IF NOT EXISTS idx_product_events_date ON public.product_events(created_at);

-- Opcional: Se quisermos garantir row level security amarrando o dono do produto
ALTER TABLE public.product_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pevents_own" ON public.product_events
FOR ALL TO authenticated
USING (
  product_id IN (
    SELECT id FROM public.products WHERE user_id = (SELECT auth.uid())
  )
);

-- Recarregar schema cache (PostgREST)
NOTIFY pgrst, 'reload schema';
