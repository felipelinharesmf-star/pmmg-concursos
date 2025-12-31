-- Update get_random_questions to support arrays
create or replace function get_random_questions(
  p_discipline text[] default null,
  p_source text[] default null,
  p_exam text default null,
  p_search_text text default null,
  p_limit integer default 50,
  p_exclude_ids text default null
)
returns setof "questões crs"
language plpgsql
as $$
declare
  v_query text;
begin
  v_query := 'select * from "questões crs" where 1=1';

  -- Apply filters (Arrays)
  if p_discipline is not null and array_length(p_discipline, 1) > 0 then
    -- We cast the array to text for the dynamic query, using ANY
    -- Note: We need to handle the quoting manually or use a parameter if not dynamic.
    -- Since it is dynamic, we construct: "Matéria" = ANY (ARRAY['a','b'])
    
    -- Simplest safe way for Dynamic SQL with arrays is often just building the literal string carefully
    -- or loop. But Postgres string literal for array is e.g. '{"A","B"}'
    
    v_query := v_query || ' and "Matéria" = ANY(' || quote_literal(p_discipline::text) || '::text[])';
  end if;

  if p_source is not null and array_length(p_source, 1) > 0 then
    v_query := v_query || ' and "Fonte_documento" = ANY(' || quote_literal(p_source::text) || '::text[])';
  end if;

  if p_exam is not null then
    v_query := v_query || ' and "Prova" = ' || quote_literal(p_exam);
  end if;

  if p_search_text is not null then
    v_query := v_query || ' and (' ||
      '"Enunciado" ilike ' || quote_literal('%' || p_search_text || '%') || ' or ' ||
      '"AlternativaA" ilike ' || quote_literal('%' || p_search_text || '%') || ' or ' ||
      '"AlternativaB" ilike ' || quote_literal('%' || p_search_text || '%') || ' or ' ||
      '"AlternativaC" ilike ' || quote_literal('%' || p_search_text || '%') || ' or ' ||
      '"AlternativaD" ilike ' || quote_literal('%' || p_search_text || '%') ||
    ')';
  end if;
  
  if p_exclude_ids is not null and length(p_exclude_ids) > 0 then
      v_query := v_query || ' and "ID" not in (' || p_exclude_ids || ')';
  end if;

  v_query := v_query || ' order by random() limit ' || p_limit;

  return query execute v_query;
end;
$$;

-- Update get_questions_count to support arrays
create or replace function get_questions_count(
  p_discipline text[] default null,
  p_source text[] default null,
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

  if p_discipline is not null and array_length(p_discipline, 1) > 0 then
    v_query := v_query || ' and "Matéria" = ANY(' || quote_literal(p_discipline::text) || '::text[])';
  end if;

  if p_source is not null and array_length(p_source, 1) > 0 then
    v_query := v_query || ' and "Fonte_documento" = ANY(' || quote_literal(p_source::text) || '::text[])';
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
