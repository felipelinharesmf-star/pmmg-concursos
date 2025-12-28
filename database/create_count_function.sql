create or replace function get_questions_count(
  p_discipline text default null,
  p_source text default null,
  p_exam text default null,
  p_search_text text default null,
  p_user_id uuid default null,
  p_only_wrong boolean default false,
  p_only_not_answered boolean default false
)
returns integer
language plpgsql
as $$
declare
  v_query text;
  v_count integer;
begin
  v_query := 'select count(*) from "questões crs" q where 1=1';

  -- Apply filters
  if p_discipline is not null and length(p_discipline) > 0 then
    v_query := v_query || ' and "Matéria" ilike ' || quote_literal('%' || p_discipline || '%');
  end if;

  if p_source is not null and length(p_source) > 0 then
    v_query := v_query || ' and "Fonte_documento" = ' || quote_literal(p_source);
  end if;

  if p_exam is not null and length(p_exam) > 0 then
    v_query := v_query || ' and "Prova" = ' || quote_literal(p_exam);
  end if;

  if p_search_text is not null and length(p_search_text) > 0 then
    v_query := v_query || ' and (' ||
      '"Enunciado" ilike ' || quote_literal('%' || p_search_text || '%') || ' or ' ||
      '"AlternativaA" ilike ' || quote_literal('%' || p_search_text || '%') || ' or ' ||
      '"AlternativaB" ilike ' || quote_literal('%' || p_search_text || '%') || ' or ' ||
      '"AlternativaC" ilike ' || quote_literal('%' || p_search_text || '%') || ' or ' ||
      '"AlternativaD" ilike ' || quote_literal('%' || p_search_text || '%') ||
    ')';
  end if;

  -- User specific filters
  if p_user_id is not null then
      if p_only_wrong then
          v_query := v_query || ' and exists (select 1 from user_answers ua where ua.question_id = q."ID" and ua.user_id = ' || quote_literal(p_user_id) || ' and ua.is_correct = false)';
      end if;

      if p_only_not_answered then
           v_query := v_query || ' and not exists (select 1 from user_answers ua where ua.question_id = q."ID" and ua.user_id = ' || quote_literal(p_user_id) || ')';
      end if;
  end if;

  execute v_query into v_count;
  return v_count;
end;
$$;
