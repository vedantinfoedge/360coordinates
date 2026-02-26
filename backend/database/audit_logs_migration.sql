-- ============================================
-- AUDIT LOGS TABLE
-- ============================================
-- Logs admin actions on properties: approve, reject, delete.
-- Do not modify existing property schema.

CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `admin_id` INT(11) NOT NULL,
  `action_type` VARCHAR(50) NOT NULL COMMENT 'approve_property, reject_property, delete_property',
  `property_id` INT(11) DEFAULT NULL,
  `details` VARCHAR(500) DEFAULT NULL COMMENT 'e.g. rejection reason',
  `ip_address` VARCHAR(45) DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_admin_id` (`admin_id`),
  INDEX `idx_action_type` (`action_type`),
  INDEX `idx_property_id` (`property_id`),
  INDEX `idx_created_at` (`created_at`),
  FOREIGN KEY (`admin_id`) REFERENCES `admin_users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
