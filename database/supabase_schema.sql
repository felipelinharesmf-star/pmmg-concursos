-- 1. CRIAÇÃO DA TABELA DE PERFIS DE USUÁRIO
create table if not exists public.user_profiles (
  id uuid references auth.users not null primary key,
  display_name text,
  is_public boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. HABILITAR RLS
alter table public.user_profiles enable row level security;

-- 3. POLÍTICAS DE ACESSO (RLS)
create policy "Perfis públicos são visíveis para todos"
  on public.user_profiles for select
  using ( is_public = true or auth.uid() = id );

create policy "Usuários podem criar seu próprio perfil"
  on public.user_profiles for insert
  with check ( auth.uid() = id );

create policy "Usuários podem atualizar seu próprio perfil"
  on public.user_profiles for update
  using ( auth.uid() = id );

-- 4. FUNÇÃO PARA OBTER RANKING (SECURITY DEFINER para acessar user_answers de todos)
create or replace function public.get_ranking()
returns table (
  user_id uuid,
  display_name text,
  is_public boolean,
  score decimal,
  total_answers bigint
) 
language sql
security definer
as $$
  select 
    ua.user_id,
    coalesce(up.display_name, 'Anônimo') as display_name,
    coalesce(up.is_public, false) as is_public,
    round((sum(case when ua.is_correct then 1 else 0 end)::decimal / count(*)) * 100, 2) as score,
    count(*) as total_answers
  from public.user_answers ua
  left join public.user_profiles up on ua.user_id = up.id
  group by ua.user_id, up.display_name, up.is_public
  order by score desc;
$$;
