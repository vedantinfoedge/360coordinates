-- Admin Users Phone Column Migration
-- Run this SQL to add phone column to admin_users table for OTP-based login

USE `indiapropertys_db`;

-- Add phone column to admin_users table if it doesn't exist
ALTER TABLE `admin_users` 
ADD COLUMN IF NOT EXISTS `phone` VARCHAR(15) DEFAULT NULL AFTER `email`;

-- Add index on phone column
CREATE INDEX IF NOT EXISTS `idx_phone` ON `admin_users` (`phone`);
