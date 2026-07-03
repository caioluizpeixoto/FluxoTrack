-- =====================================================================
-- MIGRAÇÃO: SISTEMA DE AUTENTICAÇÃO PRIVADA
-- =====================================================================

-- 1. Criação da Tabela de Usuários Autorizados
CREATE TABLE IF NOT EXISTS public.authorized_users (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  email text NOT NULL UNIQUE,
  role text CHECK (role IN ('Admin', 'Editor', 'Viewer')) DEFAULT 'Viewer',
  invited_by text, -- E-mail de quem convidou
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS
ALTER TABLE public.authorized_users ENABLE ROW LEVEL SECURITY;

-- 2. Função auxiliar para pegar o e-mail do usuário autenticado e verificar se é Admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.authorized_users au
    JOIN auth.users u ON u.email = au.email
    WHERE u.id = auth.uid() AND au.role = 'Admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Políticas RLS para authorized_users
-- Admins podem ler todos
DROP POLICY IF EXISTS "Admins can view all authorized users" ON public.authorized_users;
CREATE POLICY "Admins can view all authorized users" ON public.authorized_users
  FOR SELECT TO authenticated USING (public.is_admin());

-- Usuários comuns só veem seu próprio registro
DROP POLICY IF EXISTS "Users can view their own authorization" ON public.authorized_users;
CREATE POLICY "Users can view their own authorization" ON public.authorized_users
  FOR SELECT TO authenticated USING (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- Apenas Admins podem inserir/atualizar/deletar
DROP POLICY IF EXISTS "Admins can insert authorized users" ON public.authorized_users;
CREATE POLICY "Admins can insert authorized users" ON public.authorized_users
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can update authorized users" ON public.authorized_users;
CREATE POLICY "Admins can update authorized users" ON public.authorized_users
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can delete authorized users" ON public.authorized_users;
CREATE POLICY "Admins can delete authorized users" ON public.authorized_users
  FOR DELETE TO authenticated USING (public.is_admin());

-- 4. Função auxiliar para verificar autorização geral
CREATE OR REPLACE FUNCTION public.is_authorized()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.authorized_users au
    JOIN auth.users u ON u.email = au.email
    WHERE u.id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- IMPORTANTE: Para que o sistema funcione inicialmente, você precisa inserir seu próprio e-mail como Admin.
-- Descomente a linha abaixo e substitua 'SEU_EMAIL_AQUI' pelo seu e-mail antes de rodar o script no Supabase.
INSERT INTO public.authorized_users (email, role) VALUES ('caioluispeixotos@gmail.com', 'Admin') ON CONFLICT (email) DO NOTHING;
