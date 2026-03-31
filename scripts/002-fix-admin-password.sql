-- Update admin user with proper bcrypt hash for password "admin123"
-- This is a valid bcrypt hash generated for "admin123"
UPDATE users 
SET password_hash = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZRGdjGj/n3pEZP8p2gHIGdBTe6W3a'
WHERE email = 'admin@securityrms.com';
