-- =====================================================================
-- 1. TABELA DE PERFIS DE USUÁRIOS
-- =====================================================================
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  display_name text,
  plan text check (plan in ('free', 'pro', 'enterprise')) default 'free',
  meta_access_token text,
  meta_connected boolean default false,
  store_url text,
  created_at timestamptz default timezone('utc'::text, now()) not null,
  updated_at timestamptz default timezone('utc'::text, now()) not null
);

-- Habilitar RLS
alter table public.profiles enable row level security;

-- Políticas de Acesso RLS
create policy "Users can read own profile" on public.profiles
  for select to authenticated using (((select auth.uid()) = id) AND public.is_authorized());

create policy "Users can update own profile" on public.profiles
  for update to authenticated using (((select auth.uid()) = id) AND public.is_authorized()) with check (((select auth.uid()) = id) AND public.is_authorized());

-- Trigger para criar o perfil automaticamente na criação do usuário no Auth
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, display_name, plan, meta_connected)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'displayName', new.raw_user_meta_data->>'name'),
    'free',
    false
  );
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- =====================================================================
-- 2. TABELA DE CONTAS DE ANÚNCIOS (AdAccount)
-- =====================================================================
create table if not exists public.ad_accounts (
  account_id text primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  currency text,
  status text,
  business_id text,
  business_name text,
  monitored boolean default true not null,
  updated_at timestamptz default timezone('utc'::text, now()) not null
);

-- Índices de performance
create index if not exists idx_ad_accounts_user_id on public.ad_accounts(user_id);

-- Habilitar RLS
alter table public.ad_accounts enable row level security;

-- Políticas RLS
create policy "Users can perform all actions on own ad accounts" on public.ad_accounts
  for all to authenticated using (((select auth.uid()) = user_id) AND public.is_authorized()) with check (((select auth.uid()) = user_id) AND public.is_authorized());


-- =====================================================================
-- 3. TABELA DE CAMPANHAS (Campaign)
-- =====================================================================
create table if not exists public.campaigns (
  campaign_id text primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  status text,
  spend numeric(12,2) default 0.00 not null,
  impressions integer default 0 not null,
  clicks integer default 0 not null,
  conversions integer default 0 not null,
  last_sync timestamptz default timezone('utc'::text, now()) not null
);

-- Índices de performance
create index if not exists idx_campaigns_user_id on public.campaigns(user_id);

-- Habilitar RLS
alter table public.campaigns enable row level security;

-- Políticas RLS
create policy "Users can perform all actions on own campaigns" on public.campaigns
  for all to authenticated using (((select auth.uid()) = user_id) AND public.is_authorized()) with check (((select auth.uid()) = user_id) AND public.is_authorized());


-- =====================================================================
-- 4. TABELA DE EVENTOS DE RASTREAMENTO (TrackingEvent)
-- =====================================================================
create table if not exists public.tracking_events (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  event_type text not null,
  url text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  fbclid text,
  gclid text,
  fbp text,
  fbc text,
  visitor_id text,
  session_id text,
  referrer text,
  ip_address text,
  user_agent text,
  timestamp timestamptz default timezone('utc'::text, now()) not null
);

-- Índices de performance
create index if not exists idx_tracking_events_user_id on public.tracking_events(user_id);
create index if not exists idx_tracking_events_fbclid on public.tracking_events(fbclid) where fbclid is not null;
create index if not exists idx_tracking_events_timestamp on public.tracking_events(timestamp desc);

-- Habilitar RLS
alter table public.tracking_events enable row level security;

-- Políticas RLS
create policy "Users can perform all actions on own tracking events" on public.tracking_events
  for all to authenticated using (((select auth.uid()) = user_id) AND public.is_authorized()) with check (((select auth.uid()) = user_id) AND public.is_authorized());


-- =====================================================================
-- 5. TABELA DE CONVERSÕES (Conversion)
-- =====================================================================
create table if not exists public.conversions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  external_id text,
  value numeric(12,2) default 0.00 not null,
  status text not null,
  timestamp timestamptz default timezone('utc'::text, now()) not null,
  attributed_campaign_id text references public.campaigns(campaign_id) on delete set null
);

-- Índices de performance
create index if not exists idx_conversions_user_id on public.conversions(user_id);
create index if not exists idx_conversions_attributed_campaign_id on public.conversions(attributed_campaign_id);
create index if not exists idx_conversions_external_id on public.conversions(external_id);

-- Habilitar RLS
alter table public.conversions enable row level security;

-- Políticas RLS
create policy "Users can perform all actions on own conversions" on public.conversions
  for all to authenticated using (((select auth.uid()) = user_id) AND public.is_authorized()) with check (((select auth.uid()) = user_id) AND public.is_authorized());


-- =====================================================================
-- 6. CONFIGURAÇÃO DE WEBHOOKS (Webhook)
-- =====================================================================
create table if not exists public.webhooks (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  platform text not null,
  created_at timestamptz default timezone('utc'::text, now()) not null
);

-- Índices de performance
create index if not exists idx_webhooks_user_id on public.webhooks(user_id);

-- Habilitar RLS
alter table public.webhooks enable row level security;

-- Políticas RLS
create policy "Users can perform all actions on own webhooks" on public.webhooks
  for all to authenticated using (((select auth.uid()) = user_id) AND public.is_authorized()) with check (((select auth.uid()) = user_id) AND public.is_authorized());
