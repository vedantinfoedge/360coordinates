-- ============================================
-- Welcome Email Tracking Migration
-- ============================================
-- This migration adds email tracking columns to users table
-- and creates the email_logs table for tracking email delivery status

-- ============================================
-- STEP 1: Add email tracking columns to users table
-- ============================================
-- Get database name dynamically
SET @dbname = DATABASE();
SET @tablename = 'users';

-- Add email_status column if it doesn't exist (default: 'PENDING')
SET @columnname = 'email_status';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (table_name = @tablename)
      AND (table_schema = @dbname)
      AND (column_name = @columnname)
  ) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN ', @columnname, ' ENUM(\'PENDING\', \'SENT\', \'FAILED\') DEFAULT \'PENDING\' AFTER updated_at')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Add email_sent_at column if it doesn't exist (nullable, tracks when email was successfully sent)
SET @columnname = 'email_sent_at';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (table_name = @tablename)
      AND (table_schema = @dbname)
      AND (column_name = @columnname)
  ) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN ', @columnname, ' DATETIME NULL AFTER email_status')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Add index on email_status if it doesn't exist
SET @indexname = 'idx_email_status';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
    WHERE
      (table_name = @tablename)
      AND (table_schema = @dbname)
      AND (index_name = @indexname)
  ) > 0,
  'SELECT 1',
  CONCAT('CREATE INDEX ', @indexname, ' ON ', @tablename, ' (email_status)')
));
PREPARE createIndexIfNotExists FROM @preparedStatement;
EXECUTE createIndexIfNotExists;
DEALLOCATE PREPARE createIndexIfNotExists;

-- ============================================
-- STEP 2: Create email_logs table
-- ============================================
CREATE TABLE IF NOT EXISTS `email_logs` (
    `id` INT(11) NOT NULL AUTO_INCREMENT,
    `user_id` INT(11) NOT NULL,
    `email_type` VARCHAR(50) NOT NULL COMMENT 'Type of email: welcome, reset_password, etc.',
    `status` VARCHAR(20) NOT NULL COMMENT 'Status: SUCCESS, FAILED, PENDING',
    `msg91_response` TEXT NULL COMMENT 'Full response from MSG91 API',
    `error_message` TEXT NULL COMMENT 'Error message if email failed',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `idx_user_id` (`user_id`),
    INDEX `idx_email_type` (`email_type`),
    INDEX `idx_status` (`status`),
    INDEX `idx_created_at` (`created_at`),
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- STEP 3: Update existing users
-- ============================================
-- Set email_status to 'PENDING' for existing users (they won't get welcome emails retroactively)
UPDATE `users` 
SET `email_status` = 'PENDING' 
WHERE `email_status` IS NULL;

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
-- The users table now has email_status and email_sent_at columns
-- The email_logs table has been created for tracking email delivery
-- All indexes have been added for optimal query performance

