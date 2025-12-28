-- Function to calculate study streak
-- Usage: select get_user_streak();

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
  -- Define current date in Brazil timezone
  current_date_br := (current_timestamp at time zone 'America/Sao_Paulo')::date;

  with dates as (
    -- Get distinct dates where user answered questions, adjusting for Brazil timezone
    select distinct (created_at at time zone 'UTC' at time zone 'America/Sao_Paulo')::date as d
    from public.user_answers
    where user_id = auth.uid()
    and (created_at at time zone 'UTC' at time zone 'America/Sao_Paulo')::date <= current_date_br
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

  -- Return streak only if the last study date was today or yesterday (in Brazil time)
  if max_date >= (current_date_br - 1) then
    return coalesce(streak_count, 0);
  else
    return 0;
  end if;
end;
$$;
