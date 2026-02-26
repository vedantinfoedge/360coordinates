-- Fix admin_users phone number
-- Run this SQL to set phone number for admin user

-- Option 1: Update existing admin user (ID = 1)
UPDATE admin_users SET phone = '917888076881' WHERE id = 1;

-- Option 2: If admin doesn't exist, create one
INSERT INTO admin_users (username, email, phone, full_name, role, is_active, created_at)
VALUES ('admin', 'admin@demo1.360coordinates.com', '917888076881', 'Admin User', 'super_admin', 1, NOW())
ON DUPLICATE KEY UPDATE phone = '917888076881';

-- Verify the update
SELECT id, username, email, phone, role, is_active FROM admin_users WHERE id = 1;

