<?php
/**
 * Migration Script: Add full_name column to users table if it doesn't exist
 * Run this script to fix the registration error
 * 
 * Usage: php add_full_name_column.php
 * Or run the SQL file directly in phpMyAdmin: add_full_name_column_migration.sql
 */

// Force localhost mode for CLI
$_SERVER['HTTP_HOST'] = 'localhost';

require_once __DIR__ . '/../config/database.php';

try {
    $db = getDB();
    
    echo "Checking if 'full_name' column exists in 'users' table...\n";
    
    // Check if full_name column exists
    $checkStmt = $db->query("SHOW COLUMNS FROM users LIKE 'full_name'");
    $columnExists = $checkStmt->rowCount() > 0;
    
    if ($columnExists) {
        echo "✓ Column 'full_name' already exists in 'users' table.\n";
        echo "No migration needed. Registration should work fine.\n";
        exit(0);
    }
    
    echo "Column 'full_name' not found. Adding it to 'users' table...\n";
    
    // Check if there are existing users without full_name
    $userCountStmt = $db->query("SELECT COUNT(*) as count FROM users");
    $userCount = $userCountStmt->fetch()['count'];
    
    if ($userCount > 0) {
        echo "Warning: Found $userCount existing user(s). Adding column with default values...\n";
        // Add column as nullable first, then update existing rows
        $db->exec("ALTER TABLE users ADD COLUMN full_name VARCHAR(255) NULL AFTER id");
        
        // Update existing users with a default name
        $db->exec("UPDATE users SET full_name = CONCAT('User ', id) WHERE full_name IS NULL");
        
        // Make it NOT NULL now
        $db->exec("ALTER TABLE users MODIFY COLUMN full_name VARCHAR(255) NOT NULL");
    } else {
        // No existing users, safe to add as NOT NULL
        $db->exec("ALTER TABLE users ADD COLUMN full_name VARCHAR(255) NOT NULL AFTER id");
    }
    
    echo "✓ Successfully added 'full_name' column to 'users' table.\n";
    
    // Verify it was added
    $verifyStmt = $db->query("SHOW COLUMNS FROM users LIKE 'full_name'");
    if ($verifyStmt->rowCount() > 0) {
        $columnInfo = $verifyStmt->fetch();
        echo "✓ Verification: Column 'full_name' is now present.\n";
        echo "  Type: {$columnInfo['Type']}\n";
        echo "  Null: {$columnInfo['Null']}\n";
    } else {
        echo "✗ Warning: Column verification failed. Please check manually.\n";
        exit(1);
    }
    
    echo "\n✓ Migration completed successfully!\n";
    echo "You can now register users without errors.\n";
    
} catch (PDOException $e) {
    if (strpos($e->getMessage(), 'Duplicate column name') !== false) {
        echo "✓ Column 'full_name' already exists (duplicate column error is expected).\n";
        echo "No migration needed. Registration should work fine.\n";
        exit(0);
    }
    echo "✗ Database Error: " . $e->getMessage() . "\n";
    echo "Error Code: " . $e->getCode() . "\n";
    echo "\nPlease run the SQL migration file manually:\n";
    echo "  backend/database/add_full_name_column_migration.sql\n";
    exit(1);
} catch (Exception $e) {
    echo "✗ Unexpected error: " . $e->getMessage() . "\n";
    exit(1);
}

