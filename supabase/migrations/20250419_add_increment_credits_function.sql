
-- Create a database function to safely increment credits
CREATE OR REPLACE FUNCTION public.increment_credits(user_id UUID, amount NUMERIC) 
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_credits NUMERIC;
BEGIN
  -- Get the current credits
  SELECT total_credits INTO current_credits
  FROM public.user_compute_credits
  WHERE user_id = $1;
  
  -- Return the incremented value
  RETURN COALESCE(current_credits, 0) + amount;
END;
$$;

-- Simpler variant for use in SQL expressions
CREATE OR REPLACE FUNCTION public.increment_credits(amount NUMERIC) 
RETURNS NUMERIC
LANGUAGE SQL
IMMUTABLE
AS $$
  SELECT COALESCE(current_setting('increment_credits.current_value', true)::numeric, 0) + $1;
$$;
