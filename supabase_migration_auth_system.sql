-- =====================================================================
-- MIGRAÇÃO REVISADA: SISTEMA DE AUTENTICAÇÃO E APROVAÇÃO DE USUÁRIOS
-- =====================================================================

-- 1. Criação / Atualização da Tabela de Usuários Autorizados
CREATE TABLE IF NOT EXISTS public.authorized_users (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  email text NOT NULL UNIQUE,
  role text CHECK (role IN ('Admin', 'Editor', 'Viewer')) DEFAULT 'Viewer',
  status text CHECK (status IN ('approved', 'pending', 'rejected')) DEFAULT 'pending',
  invited_by text,
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Garantir coluna status caso a tabela já exista
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'authorized_users' AND column_name = 'status'
  ) THEN
    ALTER TABLE public.authorized_users ADD COLUMN status text CHECK (status IN ('approved', 'pending', 'rejected')) DEFAULT 'pending';
  END IF;
END $$;

-- Habilitar RLS
ALTER TABLE public.authorized_users ENABLE ROW LEVEL SECURITY;

-- 2. Inserção Automática do Administrador Principal
INSERT INTO public.authorized_users (email, role, status) 
VALUES ('caioluispeixotos@gmail.com', 'Admin', 'approved') 
ON CONFLICT (email) DO UPDATE 
SET role = 'Admin', status = 'approved';

-- 3. Função auxiliar para verificar se é Admin ativo
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.authorized_users au
    JOIN auth.users u ON LOWER(u.email) = LOWER(au.email)
    WHERE u.id = auth.uid() AND au.role = 'Admin' AND au.status = 'approved'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Função auxiliar para verificar se o usuário está Aprovado
CREATE OR REPLACE FUNCTION public.is_approved()
RETURNS boolean AS $$
BEGIN
  -- O Administrador caioluispeixotos@gmail.com é sempre aprovado
  IF EXISTS (
    SELECT 1 FROM auth.users u 
    WHERE u.id = auth.uid() AND LOWER(u.email) = 'caioluispeixotos@gmail.com'
  ) THEN
    RETURN true;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.authorized_users au
    JOIN auth.users u ON LOWER(u.email) = LOWER(au.email)
    WHERE u.id = auth.uid() AND au.status = 'approved'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Políticas RLS para authorized_users
-- Todos os usuários autenticados podem ver a sua própria autorização
DROP POLICY IF EXISTS "Users can view their own authorization" ON public.authorized_users;
CREATE POLICY "Users can view their own authorization" ON public.authorized_users
  FOR SELECT TO authenticated USING (
    LOWER(email) = LOWER((SELECT email FROM auth.users WHERE id = auth.uid()))
  );

-- Admins podem visualizar todas as autorizações
DROP POLICY IF EXISTS "Admins can view all authorized users" ON public.authorized_users;
CREATE POLICY "Admins can view all authorized users" ON public.authorized_users
  FOR SELECT TO authenticated USING (public.is_admin());

-- Qualquer usuário autenticado pode se auto-registrar como 'pending' caso não esteja cadastrado ainda
DROP POLICY IF EXISTS "Users can self register as pending" ON public.authorized_users;
CREATE POLICY "Users can self register as pending" ON public.authorized_users
  FOR INSERT TO authenticated WITH CHECK (
    LOWER(email) = LOWER((SELECT email FROM auth.users WHERE id = auth.uid()))
  );

-- Apenas Admins podem atualizar status e papéis de outros usuários
DROP POLICY IF EXISTS "Admins can update authorized users" ON public.authorized_users;
CREATE POLICY "Admins can update authorized users" ON public.authorized_users
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Apenas Admins podem excluir usuários autorizados
DROP POLICY IF EXISTS "Admins can delete authorized users" ON public.authorized_users;
CREATE POLICY "Admins can delete authorized users" ON public.authorized_users
  FOR DELETE TO authenticated USING (public.is_admin());

-- 6. Trigger para auto-cadastrar novos usuários em auth.users para a tabela public.authorized_users
CREATE OR REPLACE FUNCTION public.handle_new_user_signup()
RETURNS trigger AS $$
BEGIN
  IF LOWER(NEW.email) = 'caioluispeixotos@gmail.com' THEN
    INSERT INTO public.authorized_users (email, role, status)
    VALUES (NEW.email, 'Admin', 'approved')
    ON CONFLICT (email) DO UPDATE SET role = 'Admin', status = 'approved';
  ELSE
    INSERT INTO public.authorized_users (email, role, status)
    VALUES (NEW.email, 'Viewer', 'pending')
    ON CONFLICT (email) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_signup();
