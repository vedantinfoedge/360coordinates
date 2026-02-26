-- ============================================
-- DEVICE TOKENS TABLE (FCM Push Notifications)
-- ============================================
-- Run this migration to add push notification support.
-- Safe to run on existing databases (CREATE TABLE IF NOT EXISTS).
-- Select your database first in phpMyAdmin, then run this file.
-- ============================================

CREATE TABLE IF NOT EXISTS `device_tokens` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `user_id` INT(11) NOT NULL,
  `device_token` VARCHAR(255) NOT NULL,
  `platform` ENUM('android', 'ios') NOT NULL DEFAULT 'android',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_device` (`user_id`, `device_token`),
  INDEX `idx_user_id` (`user_id`),
  INDEX `idx_device_token` (`device_token`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
