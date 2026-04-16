
CREATE OR REPLACE FUNCTION public.execute_dynamic_sql(sql_query TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  EXECUTE sql_query;
END;
$$;
