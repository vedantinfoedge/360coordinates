-- Admin OTP Logs Table Migration
-- Run this SQL to create the admin_otp_logs table

CREATE TABLE IF NOT EXISTS `admin_otp_logs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `mobile` VARCHAR(15) NOT NULL,
  `request_id` VARCHAR(100) DEFAULT NULL,
  `status` ENUM('pending', 'verified', 'expired', 'failed') DEFAULT 'pending',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `verified_at` TIMESTAMP NULL DEFAULT NULL,
  INDEX `idx_mobile` (`mobile`),
  INDEX `idx_request_id` (`request_id`),
  INDEX `idx_status` (`status`),
  INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
