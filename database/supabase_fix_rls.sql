-- CLEANUP POLICIES (Fix for RLS blocking access to own profile)

-- 1. Drop existing policies to ensure clean state
drop policy if exists "Perfis públicos são visíveis para todos" on public.user_profiles;
drop policy if exists "Usuários podem criar seu próprio perfil" on public.user_profiles;
drop policy if exists "Usuários podem atualizar seu próprio perfil" on public.user_profiles;
drop policy if exists "Enable access to own profile" on public.user_profiles;
drop policy if exists "Enable access to public profiles" on public.user_profiles;

-- 2. Re-create permissive policies suitable for this apps requirements

-- Allow users to see their own profile (ALWAYS)
create policy "User View Own Profile"
on public.user_profiles for select
using ( auth.uid() = id );

-- Allow users to see public profiles (for ranking)
create policy "User View Public Profiles"
on public.user_profiles for select
using ( is_public = true );

-- Allow users to insert their own profile
create policy "User Insert Own Profile"
on public.user_profiles for insert
with check ( auth.uid() = id );

-- Allow users to update their own profile
create policy "User Update Own Profile"
on public.user_profiles for update
using ( auth.uid() = id );
