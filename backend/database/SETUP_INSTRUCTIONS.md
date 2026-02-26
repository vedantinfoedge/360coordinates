# Database Setup Instructions for Buyer Interaction Limits

## Quick Setup in phpMyAdmin

### Step 1: Open phpMyAdmin
1. Navigate to your phpMyAdmin (usually at `http://localhost/phpmyadmin` or your hosting panel)
2. Select your database: `indiapropertys_db` (or your database name)

### Step 2: Run the SQL Query
1. Click on the **SQL** tab at the top
2. Copy and paste the SQL query below
3. Click **Go** to execute

### Step 3: Verify the Table
1. Check the left sidebar - you should see a new table: `buyer_interaction_limits`
2. Click on it to verify the structure

---

## SQL Query to Execute

```sql
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
```

---

## Alternative: Using Command Line (MySQL)

If you prefer using MySQL command line:

```bash
# Login to MySQL
mysql -u root -p

# Select your database
USE indiapropertys_db;

# Run the SQL
SOURCE /path/to/backend/database/buyer_interaction_limits.sql;
```

Or directly:

```bash
mysql -u root -p indiapropertys_db < backend/database/buyer_interaction_limits.sql
```

---

## Table Structure Explanation

| Column | Type | Description |
|--------|------|-------------|
| `id` | INT(11) | Primary key, auto-increment |
| `buyer_id` | INT(11) | Foreign key to `users.id` |
| `property_id` | INT(11) | Foreign key to `properties.id` |
| `action_type` | ENUM | Either 'view_owner' or 'chat_owner' |
| `timestamp` | TIMESTAMP | When the interaction occurred |
| `created_at` | TIMESTAMP | Record creation time |

---

## Verification Queries

After creating the table, you can verify it with these queries:

```sql
-- Check if table exists
SHOW TABLES LIKE 'buyer_interaction_limits';

-- View table structure
DESCRIBE buyer_interaction_limits;

-- Check indexes
SHOW INDEXES FROM buyer_interaction_limits;
```

---

## Troubleshooting

### Error: Table already exists
If you get an error that the table already exists, you can either:
1. Drop and recreate (⚠️ **WARNING: This deletes all data**):
   ```sql
   DROP TABLE IF EXISTS `buyer_interaction_limits`;
   -- Then run the CREATE TABLE query again
   ```

2. Or just skip (the `IF NOT EXISTS` clause should prevent this)

### Error: Foreign key constraint fails
Make sure:
- The `users` table exists
- The `properties` table exists
- Both tables have `id` columns as primary keys

### Error: Unknown database
Make sure you've selected the correct database in phpMyAdmin before running the query.

---

## What This Table Does

This table tracks how many times a buyer has:
- Viewed owner details (`view_owner`)
- Started a chat with the owner (`chat_owner`)

**Rate Limits:**
- Maximum 5 attempts per action type per property per buyer
- 24-hour rolling window (resets automatically)
- Limits are enforced at the API level

---

## Next Steps

After creating the table:
1. ✅ The backend APIs will automatically start using it
2. ✅ The frontend will display usage limits
3. ✅ No additional configuration needed

The feature is now active!

