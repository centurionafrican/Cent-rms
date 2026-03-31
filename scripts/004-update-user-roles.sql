-- Update users table role constraint to include all new roles
ALTER TABLE users DROP CONSTRAINT users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('admin', 'ceo', 'coceo', 'operations_manager', 'hr', 'roster_manager', 'coordinator'));
