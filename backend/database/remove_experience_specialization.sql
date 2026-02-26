-- ============================================
-- Migration: Remove experience_years and specialization from user_profiles
-- ============================================
-- Date: 2024
-- Description: Removes experience_years and specialization columns from user_profiles table
-- ============================================

USE `indiapropertys_db`;

-- Remove experience_years column
ALTER TABLE `user_profiles` 
DROP COLUMN IF EXISTS `experience_years`;

-- Remove specialization column
ALTER TABLE `user_profiles` 
DROP COLUMN IF EXISTS `specialization`;

-- Verify removal
SELECT COLUMN_NAME 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'indiapropertys_db' 
  AND TABLE_NAME = 'user_profiles' 
  AND COLUMN_NAME IN ('experience_years', 'specialization');
