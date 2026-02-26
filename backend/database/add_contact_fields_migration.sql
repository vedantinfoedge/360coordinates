-- ============================================
-- Add Contact Fields Migration
-- ============================================
-- Run this SQL script to add whatsapp_number and alternate_mobile fields
-- to user_profiles table for seller profile personal information
-- ============================================

USE `indiapropertys_db`;

-- Step 1: Add whatsapp_number column if it doesn't exist
SET @dbname = DATABASE();
SET @tablename = "user_profiles";
SET @columnname = "whatsapp_number";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (COLUMN_NAME = @columnname)
  ) > 0,
  "SELECT 1",
  CONCAT("ALTER TABLE ", @tablename, " ADD COLUMN ", @columnname, " VARCHAR(20) DEFAULT NULL AFTER address")
));
PREPARE alterIfExists FROM @preparedStatement;
EXECUTE alterIfExists;
DEALLOCATE PREPARE alterIfExists;

-- Step 2: Add alternate_mobile column if it doesn't exist
SET @columnname = "alternate_mobile";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (COLUMN_NAME = @columnname)
  ) > 0,
  "SELECT 1",
  CONCAT("ALTER TABLE ", @tablename, " ADD COLUMN ", @columnname, " VARCHAR(20) DEFAULT NULL AFTER whatsapp_number")
));
PREPARE alterIfExists FROM @preparedStatement;
EXECUTE alterIfExists;
DEALLOCATE PREPARE alterIfExists;

