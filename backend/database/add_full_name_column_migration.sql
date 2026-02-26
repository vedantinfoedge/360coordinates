-- ============================================
-- Migration: Add full_name column to users table
-- ============================================
-- This migration adds the 'full_name' column to the 'users' table
-- if it doesn't already exist.
-- 
-- Run this SQL script in phpMyAdmin or MySQL command line to fix
-- the registration error: "Column not found: 1054 Unknown column 'full_name'"
-- ============================================

USE `indiapropertys_db`;

-- Check if column exists and add it if it doesn't
-- Note: This will fail if column already exists, which is fine
-- You can ignore the error if column already exists

-- Method 1: Simple ALTER TABLE (will fail if column exists - that's okay)
ALTER TABLE `users` 
ADD COLUMN `full_name` VARCHAR(255) NOT NULL AFTER `id`;

-- If the above fails with "Duplicate column name", the column already exists
-- and you can proceed. The registration should work now.

-- Verify the column was added
-- Run this query to check:
-- SHOW COLUMNS FROM `users` LIKE 'full_name';

-- If you need to update existing users without full_name, you can run:
-- UPDATE `users` SET `full_name` = CONCAT('User ', `id`) WHERE `full_name` IS NULL OR `full_name` = '';

