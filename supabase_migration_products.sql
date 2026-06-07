-- Criação da tabela de Produtos
create table if not exists public.products (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  meta_ad_account_id text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Habilitar Row Level Security (RLS)
alter table public.products enable row level security;

-- Política para permitir que o usuário veja apenas os seus próprios produtos
create policy "Users can view their own products" 
on public.products for select 
using (auth.uid() = user_id);

-- Política para permitir inserção apenas com o próprio ID
create policy "Users can insert their own products" 
on public.products for insert 
with check (auth.uid() = user_id);

-- Política para atualização
create policy "Users can update their own products" 
on public.products for update 
using (auth.uid() = user_id);

-- Política para exclusão
create policy "Users can delete their own products" 
on public.products for delete 
using (auth.uid() = user_id);

-- Recarregar o cache do schema se estiver usando PostgREST
NOTIFY pgrst, 'reload schema';
