-- Admin Google OAuth Migration
-- Add Google ID column to admin_users table for OAuth authentication

-- Add google_id column if it doesn't exist
SET @dbname = DATABASE();
SET @tablename = 'admin_users';
SET @columnname = 'google_id';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (table_name = @tablename)
      AND (table_schema = @dbname)
      AND (column_name = @columnname)
  ) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN ', @columnname, ' VARCHAR(255) NULL UNIQUE')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Add index for google_id
CREATE INDEX IF NOT EXISTS idx_google_id ON admin_users(google_id);

-- Update admin user to allow NULL password (since we're using Google OAuth only)
-- Make password nullable
ALTER TABLE admin_users MODIFY COLUMN password VARCHAR(255) NULL;
