-- ============================================
-- Business Information Database Migration
-- ============================================
-- Run this SQL script to add GST number field for business information
-- ============================================

USE `indiapropertys_db`;

-- Add GST number field to user_profiles table
ALTER TABLE `user_profiles` 
ADD COLUMN IF NOT EXISTS `gst_number` VARCHAR(50) DEFAULT NULL AFTER `license_number`;

-- Add index for GST number lookup (optional, for faster searches)
CREATE INDEX IF NOT EXISTS `idx_gst_number` ON `user_profiles`(`gst_number`);
