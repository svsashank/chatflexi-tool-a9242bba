
-- Add an index to improve the performance of credit lookups
CREATE INDEX IF NOT EXISTS user_compute_credits_user_id_idx ON user_compute_credits(user_id);

-- Make sure the user_id is unique (if not already)
ALTER TABLE user_compute_credits 
  DROP CONSTRAINT IF EXISTS user_compute_credits_user_id_key, 
  ADD CONSTRAINT user_compute_credits_user_id_key UNIQUE (user_id);
