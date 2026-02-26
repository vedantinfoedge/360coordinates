-- Admin 2FA Migration
-- Add Google Authenticator 2FA columns to admin_users table

-- Add google2fa_secret column if it doesn't exist
SET @dbname = DATABASE();
SET @tablename = 'admin_users';
SET @columnname = 'google2fa_secret';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (table_name = @tablename)
      AND (table_schema = @dbname)
      AND (column_name = @columnname)
  ) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN ', @columnname, ' VARCHAR(32) NULL')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Add is_2fa_enabled column if it doesn't exist
SET @columnname = 'is_2fa_enabled';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (table_name = @tablename)
      AND (table_schema = @dbname)
      AND (column_name = @columnname)
  ) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN ', @columnname, ' TINYINT(1) DEFAULT 0')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Update existing admin user password to Admin@123456
-- Note: Password hash is generated dynamically in setup-admin.php
-- To update password, run: http://localhost/Fullstack/backend/api/admin/auth/update-admin-password.php
-- Or use setup-admin.php to create admin with correct password hash
