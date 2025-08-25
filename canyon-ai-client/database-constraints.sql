-- Add unique constraint to prevent multiple workflows per quote
ALTER TABLE workflows 
ADD CONSTRAINT unique_workflow_per_quote 
UNIQUE (quote_id, user_id);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_workflows_quote_user ON workflows(quote_id, user_id);

-- Clean up any duplicate workflows (keep the most recent one)
WITH ranked_workflows AS (
  SELECT id, quote_id, user_id,
         ROW_NUMBER() OVER (PARTITION BY quote_id, user_id ORDER BY created_at DESC) as rn
  FROM workflows
)
DELETE FROM workflows 
WHERE id IN (
  SELECT id FROM ranked_workflows WHERE rn > 1
); 