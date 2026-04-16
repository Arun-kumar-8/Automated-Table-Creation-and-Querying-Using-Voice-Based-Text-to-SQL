
-- Create query_history table
CREATE TABLE public.query_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_input TEXT NOT NULL,
  generated_query TEXT NOT NULL,
  execution_time_ms NUMERIC,
  result_data JSONB,
  status TEXT NOT NULL DEFAULT 'success',
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.query_history ENABLE ROW LEVEL SECURITY;

-- Allow public access for demo (no auth required)
CREATE POLICY "Anyone can view query history"
  ON public.query_history FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert query history"
  ON public.query_history FOR INSERT
  WITH CHECK (true);
