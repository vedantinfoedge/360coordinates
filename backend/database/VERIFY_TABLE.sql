-- Verification Queries for buyer_interaction_limits table
-- Run these in phpMyAdmin to verify the table was created correctly

-- 1. Check if table exists
SHOW TABLES LIKE 'buyer_interaction_limits';

-- 2. View table structure
DESCRIBE buyer_interaction_limits;

-- 3. View all columns and indexes
SHOW CREATE TABLE buyer_interaction_limits;

-- 4. Check indexes
SHOW INDEXES FROM buyer_interaction_limits;

-- 5. Count rows (should be 0 for new table)
SELECT COUNT(*) as total_records FROM buyer_interaction_limits;

