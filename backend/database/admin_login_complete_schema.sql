-- ============================================
-- Admin Login Complete Database Schema
-- ============================================
-- This file contains all tables and columns needed for admin login
-- Run this to set up the complete admin authentication system
-- ============================================

USE `indiapropertys_db`;

-- ============================================
-- 1. ADMIN_WHITELIST TABLE
-- Stores whitelisted phone numbers for admin access
-- ============================================
CREATE TABLE IF NOT EXISTS `admin_whitelist` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `phone` VARCHAR(20) NOT NULL UNIQUE,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_phone` (`phone`),
  INDEX `idx_is_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default admin phone (if not exists)
INSERT INTO `admin_whitelist` (`phone`, `is_active`) 
VALUES ('+917888076881', 1)
ON DUPLICATE KEY UPDATE `is_active` = 1;

-- ============================================
-- 2. ADMIN_USERS TABLE - Add PIN column
-- Add admin_pin column to store hashed PIN
-- ============================================

-- Check if admin_pin column exists, if not add it
SET @dbname = DATABASE();
SET @tablename = 'admin_users';
SET @columnname = 'admin_pin';

SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (table_name = @tablename)
      AND (table_schema = @dbname)
      AND (column_name = @columnname)
  ) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN ', @columnname, ' VARCHAR(255) NULL COMMENT "Hashed admin PIN for additional security"')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- ============================================
-- 3. ADMIN_USERS TABLE - Add phone column (if not exists)
-- ============================================
SET @columnname = 'phone';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (table_name = @tablename)
      AND (table_schema = @dbname)
      AND (column_name = @columnname)
  ) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN ', @columnname, ' VARCHAR(20) NULL UNIQUE')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Add index for phone column
CREATE INDEX IF NOT EXISTS `idx_phone` ON `admin_users` (`phone`);

-- ============================================
-- 4. ADMIN_OTP_LOGS TABLE
-- Store OTP logs for admin authentication
-- Add expires_at column if table exists but column is missing
-- ============================================

-- First, ensure the table exists (match existing structure)
CREATE TABLE IF NOT EXISTS `admin_otp_logs` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `mobile` VARCHAR(20) NOT NULL,
  `request_id` VARCHAR(100) DEFAULT NULL,
  `status` ENUM('pending', 'verified', 'expired', 'failed') DEFAULT 'pending',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `verified_at` TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  INDEX `idx_mobile` (`mobile`),
  INDEX `idx_request_id` (`request_id`),
  INDEX `idx_status` (`status`),
  INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add expires_at column if it doesn't exist
SET @columnname = 'expires_at';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (table_name = 'admin_otp_logs')
      AND (table_schema = @dbname)
      AND (column_name = @columnname)
  ) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE admin_otp_logs ADD COLUMN ', @columnname, ' TIMESTAMP NULL AFTER status')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Add index for expires_at if column was just added
CREATE INDEX IF NOT EXISTS `idx_expires_at` ON `admin_otp_logs` (`expires_at`);

-- ============================================
-- 5. ADMIN_SESSIONS TABLE
-- Store admin session tokens for authentication
-- ============================================
CREATE TABLE IF NOT EXISTS `admin_sessions` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `session_id` VARCHAR(255) NOT NULL UNIQUE,
  `admin_id` INT(11) NOT NULL,
  `admin_mobile` VARCHAR(20) NOT NULL,
  `admin_role` VARCHAR(50) NOT NULL,
  `admin_email` VARCHAR(255) NOT NULL,
  `ip_address` VARCHAR(45) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `last_activity` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `expires_at` TIMESTAMP NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `idx_session_id` (`session_id`),
  INDEX `idx_admin_id` (`admin_id`),
  INDEX `idx_expires_at` (`expires_at`),
  FOREIGN KEY (`admin_id`) REFERENCES `admin_users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 6. VALIDATION_TOKENS TABLE (if needed for mobile validation)
-- ============================================
CREATE TABLE IF NOT EXISTS `validation_tokens` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `token` VARCHAR(255) NOT NULL UNIQUE,
  `mobile` VARCHAR(20) NOT NULL,
  `expires_at` TIMESTAMP NOT NULL,
  `used` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_token` (`token`),
  INDEX `idx_mobile` (`mobile`),
  INDEX `idx_expires_at` (`expires_at`),
  INDEX `idx_used` (`used`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- VERIFICATION QUERIES
-- Run these to verify all tables and columns exist
-- ============================================

-- Verify admin_whitelist table
SELECT 'admin_whitelist table check:' AS info;
SELECT COUNT(*) AS table_exists FROM information_schema.tables 
WHERE table_schema = DATABASE() AND table_name = 'admin_whitelist';

-- Verify admin_pin column in admin_users
SELECT 'admin_pin column check:' AS info;
SELECT COUNT(*) AS column_exists FROM information_schema.columns 
WHERE table_schema = DATABASE() 
AND table_name = 'admin_users' 
AND column_name = 'admin_pin';

-- Verify phone column in admin_users
SELECT 'phone column check:' AS info;
SELECT COUNT(*) AS column_exists FROM information_schema.columns 
WHERE table_schema = DATABASE() 
AND table_name = 'admin_users' 
AND column_name = 'phone';

-- Verify admin_otp_logs table with expires_at
SELECT 'admin_otp_logs table check:' AS info;
SELECT COUNT(*) AS table_exists FROM information_schema.tables 
WHERE table_schema = DATABASE() AND table_name = 'admin_otp_logs';

SELECT 'admin_otp_logs expires_at column check:' AS info;
SELECT COUNT(*) AS column_exists FROM information_schema.columns 
WHERE table_schema = DATABASE() 
AND table_name = 'admin_otp_logs' 
AND column_name = 'expires_at';

-- Verify admin_sessions table
SELECT 'admin_sessions table check:' AS info;
SELECT COUNT(*) AS table_exists FROM information_schema.tables 
WHERE table_schema = DATABASE() AND table_name = 'admin_sessions';

-- ============================================
-- COMPLETE
-- ============================================
SELECT 'All admin login tables and columns have been created/verified!' AS status;

