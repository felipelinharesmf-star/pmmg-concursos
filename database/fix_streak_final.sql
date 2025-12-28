-- Simplificação da lógica de Streak para evitar erros de cálculo
-- Substitui a abordagem de grupos por uma verificação dia a dia retroativa

create or replace function get_user_streak()
returns integer
language plpgsql
security definer
as $$
declare
  streak integer := 0;
  check_date date;
  has_activity boolean;
begin
  -- Data de hoje no Brasil
  check_date := (current_timestamp at time zone 'America/Sao_Paulo')::date;
  
  -- 1. Verificar se estudou HOJE
  select exists(
    select 1 from public.user_answers 
    where user_id = auth.uid() 
    and (created_at at time zone 'UTC' at time zone 'America/Sao_Paulo')::date = check_date
  ) into has_activity;

  -- Se NÃO estudou hoje, verificar se estudou ONTEM (para manter o streak vivo)
  if not has_activity then
    check_date := check_date - 1;
    select exists(
      select 1 from public.user_answers 
      where user_id = auth.uid() 
      and (created_at at time zone 'UTC' at time zone 'America/Sao_Paulo')::date = check_date
    ) into has_activity;
    
    -- Se nem hoje nem ontem, streak zerou
    if not has_activity then
      return 0;
    end if;
  end if;

  -- 2. Loop para contar dias consecutivos para trás
  -- O 'check_date' já está posicionado no último dia válido (hoje ou ontem)
  loop
    select exists(
      select 1 from public.user_answers 
      where user_id = auth.uid() 
      and (created_at at time zone 'UTC' at time zone 'America/Sao_Paulo')::date = check_date
    ) into has_activity;

    if has_activity then
      streak := streak + 1;
      check_date := check_date - 1; -- Volta um dia
    else
      exit; -- Quebrou a sequência
    end if;
  end loop;

  return streak;
end;
$$;
