-- 1. Add target_exam to user_profiles
alter table public.user_profiles 
add column if not exists target_exam text default 'CFS';

-- 2. Function to calculate percentile
create or replace function get_user_percentile()
returns integer
language plpgsql
security definer
as $$
declare
  user_score float;
  total_users integer;
  better_users integer;
  percentile integer;
  my_exam text;
begin
  -- Get current user's target exam
  select target_exam into my_exam
  from public.user_profiles
  where id = auth.uid();

  -- Get current user's score (ratio of correct answers)
  -- We use the same logic as the ranking: simple correct count or percentage
  -- Let's use percentage of correct answers vs total answered as the metric
  -- Or just total correct answers (simpler for now)
  select count(*) into user_score
  from user_answers
  where user_id = auth.uid() and is_correct = true;

  -- 2. Count total users with the same target exam who have at least one answer
  -- We join user_profiles to filter by exam
  select count(distinct ua.user_id) into total_users
  from user_answers ua
  join user_profiles up on up.id = ua.user_id
  where up.target_exam = my_exam;

  if total_users = 0 then
    return 0;
  end if;

  -- 3. Count users with a strictly better score
  with user_scores as (
      select 
        ua.user_id, 
        count(*) as score
      from user_answers ua
      join user_profiles up on up.id = ua.user_id
        where up.target_exam = my_exam
        and ua.is_correct = true
      group by ua.user_id
  )
  select count(*) into better_users
  from user_scores
  where score > user_score;

  -- 4. Calculate Top X%
  -- Formula: (Rank / Total) * 100
  -- Rank = better_users + 1
  
  percentile := ceil(((better_users + 1)::float / total_users::float) * 100);

  return percentile;
end;
$$;
