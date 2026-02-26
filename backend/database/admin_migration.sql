-- ============================================
-- Admin Panel Database Migration
-- ============================================
-- Run this SQL script to add necessary columns for admin panel
-- ============================================

USE `indiapropertys_db`;

-- Add property approval and feature status
ALTER TABLE `properties` 
ADD COLUMN IF NOT EXISTS `admin_status` ENUM('pending', 'approved', 'rejected') DEFAULT 'approved' AFTER `is_active`,
ADD COLUMN IF NOT EXISTS `is_featured` TINYINT(1) DEFAULT 0 AFTER `admin_status`,
ADD COLUMN IF NOT EXISTS `rejection_reason` TEXT DEFAULT NULL AFTER `is_featured`;

-- Update existing properties to approved status
UPDATE `properties` SET `admin_status` = 'approved' WHERE `admin_status` IS NULL OR `admin_status` = '';

-- Add user ban status
ALTER TABLE `users` 
ADD COLUMN IF NOT EXISTS `is_banned` TINYINT(1) DEFAULT 0 AFTER `phone_verified`,
ADD COLUMN IF NOT EXISTS `ban_reason` TEXT DEFAULT NULL AFTER `is_banned`;

-- Add agent verification status
ALTER TABLE `users` 
ADD COLUMN IF NOT EXISTS `agent_verified` TINYINT(1) DEFAULT 0 AFTER `is_banned`,
ADD COLUMN IF NOT EXISTS `verification_documents` JSON DEFAULT NULL AFTER `agent_verified`;

-- Create support_tickets table if it doesn't exist
CREATE TABLE IF NOT EXISTS `support_tickets` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `user_id` INT(11) DEFAULT NULL,
  `subject` VARCHAR(255) NOT NULL,
  `message` TEXT NOT NULL,
  `priority` ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
  `status` ENUM('open', 'in_progress', 'resolved', 'closed') DEFAULT 'open',
  `assigned_to` INT(11) DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_user_id` (`user_id`),
  INDEX `idx_status` (`status`),
  INDEX `idx_priority` (`priority`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`assigned_to`) REFERENCES `admin_users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add indexes for better performance
ALTER TABLE `properties` ADD INDEX IF NOT EXISTS `idx_admin_status` (`admin_status`);
ALTER TABLE `properties` ADD INDEX IF NOT EXISTS `idx_is_featured` (`is_featured`);
ALTER TABLE `users` ADD INDEX IF NOT EXISTS `idx_is_banned` (`is_banned`);
ALTER TABLE `users` ADD INDEX IF NOT EXISTS `idx_agent_verified` (`agent_verified`);
