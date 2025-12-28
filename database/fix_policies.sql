-- FIX RLS POLICIES FOR USER ANSWERS AND PROFILES

-- 1. Enable RLS on user_answers (if not already enabled)
alter table public.user_answers enable row level security;

-- Drop existing policies to avoid conflicts
drop policy if exists "Users can view their own answers" on public.user_answers;
drop policy if exists "Users can insert their own answers" on public.user_answers;
drop policy if exists "Users can update their own answers" on public.user_answers;

-- Create policies for user_answers
create policy "Users can view their own answers"
  on public.user_answers for select
  using ( auth.uid() = user_id );

create policy "Users can insert their own answers"
  on public.user_answers for insert
  with check ( auth.uid() = user_id );

create policy "Users can update their own answers"
  on public.user_answers for update
  using ( auth.uid() = user_id );


-- 2. REFRESH user_profiles POLICIES
alter table public.user_profiles enable row level security;

drop policy if exists "Perfis públicos são visíveis para todos" on public.user_profiles;
drop policy if exists "Usuários podem criar seu próprio perfil" on public.user_profiles;
drop policy if exists "Usuários podem atualizar seu próprio perfil" on public.user_profiles;
drop policy if exists "User View Own Profile" on public.user_profiles;
drop policy if exists "User View Public Profiles" on public.user_profiles;
drop policy if exists "User Insert Own Profile" on public.user_profiles;
drop policy if exists "User Update Own Profile" on public.user_profiles;

-- Allow users to see their own profile
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

-- 3. FIX get_user_streak function (ensure it works for the calling user)
create or replace function get_user_streak()
returns integer
language plpgsql
security definer
as $$
declare
  streak_count integer;
  max_date date;
begin
  -- Ensure we are looking at the authenticated user
  if auth.uid() is null then
    return 0;
  end if;

  with dates as (
    -- Get distinct dates where user answered questions
    select distinct created_at::date as d
    from public.user_answers
    where user_id = auth.uid()
    and created_at::date <= current_date
  ),
  groups as (
    -- Group consecutive dates using row_number arithmetic
    select 
      d, 
      d - (row_number() over (order by d) * interval '1 day')::date as grp
    from dates
  ),
  latest_streak as (
    -- Select the most recent group of consecutive dates
    select count(*) as cnt, max(d) as last_study_date
    from groups
    group by grp
    order by max(d) desc
    limit 1
  )
  select cnt, last_study_date into streak_count, max_date
  from latest_streak;

  -- Return streak only if the last study date was today or yesterday
  if max_date >= (current_date - 1) then
    return coalesce(streak_count, 0);
  else
    return 0;
  end if;
end;
$$;
