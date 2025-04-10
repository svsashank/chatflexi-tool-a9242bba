
-- Add web_search_results and file_search_results columns to conversation_messages table
ALTER TABLE conversation_messages 
ADD COLUMN IF NOT EXISTS web_search_results JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS file_search_results JSONB DEFAULT NULL;
