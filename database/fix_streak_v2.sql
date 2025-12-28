-- 1. Ensure user_answers table exists and has correct permissions
create table if not exists public.user_answers (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  question_id text not null,
  is_correct boolean not null,
  subject text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.user_answers enable row level security;

-- Create policies (drop existing to avoid conflicts)
drop policy if exists "Users can insert their own answers" on public.user_answers;
drop policy if exists "Users can view their own answers" on public.user_answers;

create policy "Users can insert their own answers"
  on public.user_answers for insert
  with check ( auth.uid() = user_id );

create policy "Users can view their own answers"
  on public.user_answers for select
  using ( auth.uid() = user_id );

-- 2. Improved Streak Function
create or replace function get_user_streak()
returns integer
language plpgsql
security definer
as $$
declare
  streak_count integer;
  max_date date;
  current_date_br date;
begin
  -- Set current date in Brazil (Sao Paulo)
  current_date_br := (current_timestamp at time zone 'America/Sao_Paulo')::date;

  with dates as (
    select distinct 
      -- Handle timestamp conversion safely. 
      -- If created_at is timestamptz, 'at time zone' converts to local time.
      (created_at at time zone 'America/Sao_Paulo')::date as d
    from public.user_answers
    where user_id = auth.uid()
    -- Only consider answers up to today (in Brazil)
    and (created_at at time zone 'America/Sao_Paulo')::date <= current_date_br
  ),
  groups as (
    select 
      d, 
      -- Logic: Date - RowNumber days = Constant Date if consecutive
      d - (row_number() over (order by d) * interval '1 day')::date as grp
    from dates
  ),
  latest_streak as (
    select count(*) as cnt, max(d) as last_study_date
    from groups
    group by grp
    order by max(d) desc
    limit 1
  )
  select cnt, last_study_date into streak_count, max_date
  from latest_streak;

  -- Validate streak: must have studied today or yesterday
  if max_date >= (current_date_br - 1) then
    return coalesce(streak_count, 0);
  else
    return 0;
  end if;
EXCEPTION WHEN OTHERS THEN
  -- Fallback in case of error
  return 0;
end;
$$;
