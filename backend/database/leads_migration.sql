-- ============================================
-- LEADS TABLE
-- ============================================
-- A lead is created when a buyer clicks "View Contact" on a property.
-- One row per (buyer_id, property_id). seller_id = property owner.

CREATE TABLE IF NOT EXISTS `leads` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `buyer_id` INT(11) NOT NULL,
  `property_id` INT(11) NOT NULL,
  `seller_id` INT(11) NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_buyer_property` (`buyer_id`, `property_id`),
  INDEX `idx_seller_id` (`seller_id`),
  INDEX `idx_property_id` (`property_id`),
  INDEX `idx_created_at` (`created_at`),
  FOREIGN KEY (`buyer_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`property_id`) REFERENCES `properties`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`seller_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
