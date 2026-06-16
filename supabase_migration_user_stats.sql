-- MIGRAÇÃO USER STATS — FluxoFy
-- Tabela para armazenar o faturamento total e outras estatísticas de performance do usuário

CREATE TABLE IF NOT EXISTS public.user_stats (
    user_id text PRIMARY KEY,
    total_revenue numeric DEFAULT 0,
    last_sync_at timestamp with time zone DEFAULT now()
);

-- Ativar RLS (Row Level Security)
ALTER TABLE public.user_stats ENABLE ROW LEVEL SECURITY;

-- Políticas de segurança
CREATE POLICY "Usuários podem ver as próprias estatísticas"
    ON public.user_stats FOR SELECT
    USING (auth.uid()::text = user_id);

CREATE POLICY "Usuários podem inserir/atualizar as próprias estatísticas"
    ON public.user_stats FOR ALL
    USING (auth.uid()::text = user_id)
    WITH CHECK (auth.uid()::text = user_id);

-- Habilitar inserções pela service_role via API para o cron job (Acesso global ignorando RLS pela service_role)
