# Buyer Interaction Limits Setup

This document describes the database setup for the buyer interaction limits feature.

## Database Table

The `buyer_interaction_limits` table tracks usage limits for buyer interactions (viewing owner details and chatting with owners).

### Setup Instructions

1. **Run the SQL migration:**
   ```sql
   -- Execute the SQL file
   source backend/database/buyer_interaction_limits.sql;
   ```
   
   Or manually run the SQL in your MySQL client:
   ```sql
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
   ```

## Rate Limiting Rules

- **Maximum Attempts:** 5 per feature per property per buyer
- **Time Window:** 24 hours (rolling window)
- **Action Types:**
  - `view_owner`: Viewing owner contact details
  - `chat_owner`: Starting a chat with the owner

## How It Works

1. When a buyer attempts to view owner details or start a chat, the system:
   - Checks if they have remaining attempts in the last 24 hours
   - If yes, records the interaction and decrements remaining attempts
   - If no, returns a 429 error with reset time information

2. The 24-hour window is calculated from the first attempt in the current window
3. After 24 hours from the first attempt, the limit resets automatically

## API Endpoints

### Check Limits
- **Endpoint:** `GET /api/buyer/interactions/check.php`
- **Parameters:** `property_id`, `action_type`
- **Returns:** Remaining attempts, reset time, and usage statistics

### Record Interaction
- **Endpoint:** `POST /api/buyer/interactions/record.php`
- **Body:** `{ property_id: int, action_type: 'view_owner'|'chat_owner' }`
- **Returns:** Updated limit information
- **Error:** Returns 429 if limit exceeded

## Notes

- Limits are enforced at the API level and cannot be bypassed
- Each property has separate limits (buyer can use 5 attempts per property)
- Limits reset automatically after 24 hours (no manual action required)
- Old records are automatically cleaned up via CASCADE DELETE when users or properties are deleted

