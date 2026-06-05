CREATE OR REPLACE FUNCTION public.execute_select_sql(sql_query text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
  trimmed text;
BEGIN
  trimmed := ltrim(sql_query);
  IF lower(left(trimmed, 6)) <> 'select' AND lower(left(trimmed, 4)) <> 'with' THEN
    RAISE EXCEPTION 'Only SELECT statements are allowed';
  END IF;
  EXECUTE 'SELECT COALESCE(jsonb_agg(t), ''[]''::jsonb) FROM (' || sql_query || ') t' INTO result;
  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.execute_select_sql(text) TO anon, authenticated, service_role;