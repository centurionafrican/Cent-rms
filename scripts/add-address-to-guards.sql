-- Add address column to guards table
ALTER TABLE guards 
ADD COLUMN IF NOT EXISTS address TEXT;

-- Add comment to document the field
COMMENT ON COLUMN guards.address IS 'Physical address of the guard for contact and records purposes';
