-- ============================================
-- BUYER INTERACTION LIMITS TABLE
-- ============================================
-- Tracks usage limits for buyer interactions (view owner details, chat)
-- Rate limit: 5 attempts per feature per property per 24 hours (rolling window)

CREATE TABLE IF NOT EXISTS `buyer_interaction_limits` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `buyer_id` INT(11) NOT NULL,
  `property_id` INT(11) NOT NULL,
  `action_type` ENUM('view_owner', 'chat_owner') NOT NULL,
  `timestamp` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_buyer_property_action` (`buyer_id`, `property_id`, `action_type`),
  INDEX `idx_timestamp` (`timestamp`),
  INDEX `idx_buyer_id` (`buyer_id`),
  INDEX `idx_property_id` (`property_id`),
  FOREIGN KEY (`buyer_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`property_id`) REFERENCES `properties`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

