-- Drop existing function first to avoid return type conflict
drop function if exists get_ranking();

-- Function to get the leaderboard ranking
create or replace function get_ranking()
returns table (
  user_id uuid,
  display_name text,
  is_public boolean,
  score numeric
)
language plpgsql
security definer
as $$
begin
  return query
  with user_scores as (
    select
      ua.user_id,
      count(*) filter (where ua.is_correct) as correct_count,
      count(*) as total_count
    from user_answers ua
    group by ua.user_id
  )
  select
    up.id as user_id,
    coalesce(up.display_name, 'Anônimo') as display_name,
    coalesce(up.is_public, false) as is_public,
    case
        when us.total_count > 0 then round((us.correct_count::numeric / us.total_count::numeric) * 100, 1)
        else 0
    end as score
  from user_profiles up
  join user_scores us on up.id = us.user_id
  order by score desc
  limit 100;
end;
$$;
