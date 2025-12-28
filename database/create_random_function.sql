-- Function to fetch random questions with filters
create or replace function get_random_questions(
  p_discipline text default null,
  p_source text default null,
  p_exam text default null,
  p_search_text text default null,
  p_limit integer default 50,
  p_exclude_ids text default null -- Comma separated IDs to exclude
)
returns setof "questões crs" -- Returns rows from the questions table
language plpgsql
as $$
declare
  v_query text;
begin
  v_query := 'select * from "questões crs" where 1=1';

  -- Apply filters
  if p_discipline is not null then
    v_query := v_query || ' and "Matéria" ilike ' || quote_literal('%' || p_discipline || '%');
  end if;

  if p_source is not null then
    v_query := v_query || ' and "Fonte_documento" = ' || quote_literal(p_source);
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

  -- Randomize and limit
  v_query := v_query || ' order by random() limit ' || p_limit;

  return query execute v_query;
end;
$$;
