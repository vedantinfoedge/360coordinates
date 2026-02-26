-- ============================================
-- Schema Refactor Migration
-- Moves profile_image from users to user_profiles
-- Adds user_full_name to properties
-- Restructures user_profiles table
-- ============================================

USE `indiapropertys_db`;

-- Step 1: Add new columns to user_profiles first (with existence check)
SET @dbname = DATABASE();
SET @tablename = "user_profiles";

-- Add full_name column if it doesn't exist
SET @columnname = "full_name";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (COLUMN_NAME = @columnname)
  ) > 0,
  "SELECT 1",
  CONCAT("ALTER TABLE ", @tablename, " ADD COLUMN ", @columnname, " VARCHAR(255) DEFAULT NULL AFTER user_id")
));
PREPARE alterIfExists FROM @preparedStatement;
EXECUTE alterIfExists;
DEALLOCATE PREPARE alterIfExists;

-- Add user_type column if it doesn't exist
SET @columnname = "user_type";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (COLUMN_NAME = @columnname)
  ) > 0,
  "SELECT 1",
  CONCAT("ALTER TABLE ", @tablename, " ADD COLUMN ", @columnname, " ENUM('buyer', 'seller', 'agent') DEFAULT NULL AFTER full_name")
));
PREPARE alterIfExists FROM @preparedStatement;
EXECUTE alterIfExists;
DEALLOCATE PREPARE alterIfExists;

-- Add profile_image column if it doesn't exist
SET @columnname = "profile_image";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (COLUMN_NAME = @columnname)
  ) > 0,
  "SELECT 1",
  CONCAT("ALTER TABLE ", @tablename, " ADD COLUMN ", @columnname, " VARCHAR(255) DEFAULT NULL AFTER user_type")
));
PREPARE alterIfExists FROM @preparedStatement;
EXECUTE alterIfExists;
DEALLOCATE PREPARE alterIfExists;

-- Step 2: Migrate existing profile_image data from users to user_profiles
-- For users that already have a user_profiles record
UPDATE `user_profiles` up
INNER JOIN `users` u ON up.user_id = u.id
SET 
  up.profile_image = u.profile_image,
  up.full_name = u.full_name,
  up.user_type = u.user_type
WHERE u.profile_image IS NOT NULL OR u.full_name IS NOT NULL;

-- Step 3: Ensure all users have a user_profiles record
INSERT INTO `user_profiles` (user_id, full_name, user_type, profile_image)
SELECT id, full_name, user_type, profile_image
FROM `users`
WHERE id NOT IN (SELECT user_id FROM `user_profiles`)
ON DUPLICATE KEY UPDATE 
  full_name = VALUES(full_name),
  user_type = VALUES(user_type),
  profile_image = VALUES(profile_image);

-- Step 4: Add user_full_name column to properties table (with existence check)
SET @tablename = "properties";
SET @columnname = "user_full_name";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (COLUMN_NAME = @columnname)
  ) > 0,
  "SELECT 1",
  CONCAT("ALTER TABLE ", @tablename, " ADD COLUMN ", @columnname, " VARCHAR(255) DEFAULT NULL AFTER user_id")
));
PREPARE alterIfExists FROM @preparedStatement;
EXECUTE alterIfExists;
DEALLOCATE PREPARE alterIfExists;

-- Step 5: Populate user_full_name from users.full_name for existing properties
UPDATE `properties` p
INNER JOIN `users` u ON p.user_id = u.id
SET p.user_full_name = u.full_name
WHERE p.user_full_name IS NULL;

-- Step 6: Remove columns from user_profiles that don't belong (bio, city, state, pincode, social_links)
-- Note: We use IF EXISTS check pattern - MySQL doesn't support DROP COLUMN IF EXISTS directly
-- FIXED: Logic corrected - if column exists, drop it; otherwise do nothing
SET @dbname = DATABASE();
SET @tablename = "user_profiles";
SET @columnname = "bio";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (COLUMN_NAME = @columnname)
  ) > 0,
  CONCAT("ALTER TABLE ", @tablename, " DROP COLUMN ", @columnname),
  "SELECT 1"
));
PREPARE alterIfExists FROM @preparedStatement;
EXECUTE alterIfExists;
DEALLOCATE PREPARE alterIfExists;

SET @columnname = "city";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (COLUMN_NAME = @columnname)
  ) > 0,
  CONCAT("ALTER TABLE ", @tablename, " DROP COLUMN ", @columnname),
  "SELECT 1"
));
PREPARE alterIfExists FROM @preparedStatement;
EXECUTE alterIfExists;
DEALLOCATE PREPARE alterIfExists;

SET @columnname = "state";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (COLUMN_NAME = @columnname)
  ) > 0,
  CONCAT("ALTER TABLE ", @tablename, " DROP COLUMN ", @columnname),
  "SELECT 1"
));
PREPARE alterIfExists FROM @preparedStatement;
EXECUTE alterIfExists;
DEALLOCATE PREPARE alterIfExists;

SET @columnname = "pincode";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (COLUMN_NAME = @columnname)
  ) > 0,
  CONCAT("ALTER TABLE ", @tablename, " DROP COLUMN ", @columnname),
  "SELECT 1"
));
PREPARE alterIfExists FROM @preparedStatement;
EXECUTE alterIfExists;
DEALLOCATE PREPARE alterIfExists;

SET @columnname = "social_links";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (COLUMN_NAME = @columnname)
  ) > 0,
  CONCAT("ALTER TABLE ", @tablename, " DROP COLUMN ", @columnname),
  "SELECT 1"
));
PREPARE alterIfExists FROM @preparedStatement;
EXECUTE alterIfExists;
DEALLOCATE PREPARE alterIfExists;

-- Step 7: Remove profile_image column from users table
-- Note: This should be done last after all data is migrated
SET @tablename = "users";
SET @columnname = "profile_image";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (COLUMN_NAME = @columnname)
  ) > 0,
  CONCAT("ALTER TABLE ", @tablename, " DROP COLUMN ", @columnname),
  "SELECT 1"
));
PREPARE alterIfExists FROM @preparedStatement;
EXECUTE alterIfExists;
DEALLOCATE PREPARE alterIfExists;

-- Verification queries (for manual checking)
-- SELECT COUNT(*) as users_with_profiles FROM users u 
-- INNER JOIN user_profiles up ON u.id = up.user_id;
-- 
-- SELECT COUNT(*) as properties_with_user_full_name FROM properties 
-- WHERE user_full_name IS NOT NULL;
