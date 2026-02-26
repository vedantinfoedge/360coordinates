<?php
/**
 * Migration Runner: Remove experience_years and specialization
 * Run this file once to execute the migration
 */

// Set CLI environment variables for localhost detection
$_SERVER['HTTP_HOST'] = 'localhost';
$_SERVER['REQUEST_METHOD'] = 'CLI';

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/database.php';

try {
    $db = getDB();
    
    echo "Starting migration: Remove experience_years and specialization from user_profiles\n";
    echo "===========================================\n\n";
    
    // Check if columns exist before dropping
    $checkStmt = $db->prepare("
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'user_profiles' 
          AND COLUMN_NAME IN ('experience_years', 'specialization')
    ");
    $checkStmt->execute();
    $existingColumns = $checkStmt->fetchAll(PDO::FETCH_COLUMN);
    
    if (empty($existingColumns)) {
        echo "✓ Columns 'experience_years' and 'specialization' do not exist. Nothing to remove.\n";
    } else {
        echo "Found columns to remove: " . implode(', ', $existingColumns) . "\n\n";
        
        // Remove experience_years if it exists
        if (in_array('experience_years', $existingColumns)) {
            try {
                $db->exec("ALTER TABLE `user_profiles` DROP COLUMN `experience_years`");
                echo "✓ Successfully removed 'experience_years' column\n";
            } catch (PDOException $e) {
                echo "✗ Error removing 'experience_years': " . $e->getMessage() . "\n";
            }
        }
        
        // Remove specialization if it exists
        if (in_array('specialization', $existingColumns)) {
            try {
                $db->exec("ALTER TABLE `user_profiles` DROP COLUMN `specialization`");
                echo "✓ Successfully removed 'specialization' column\n";
            } catch (PDOException $e) {
                echo "✗ Error removing 'specialization': " . $e->getMessage() . "\n";
            }
        }
    }
    
    // Verify removal
    echo "\nVerifying removal...\n";
    $verifyStmt = $db->prepare("
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'user_profiles' 
          AND COLUMN_NAME IN ('experience_years', 'specialization')
    ");
    $verifyStmt->execute();
    $remainingColumns = $verifyStmt->fetchAll(PDO::FETCH_COLUMN);
    
    if (empty($remainingColumns)) {
        echo "✓ Migration completed successfully! Both columns have been removed.\n";
    } else {
        echo "⚠ Warning: Some columns still exist: " . implode(', ', $remainingColumns) . "\n";
    }
    
    echo "\n===========================================\n";
    echo "Migration completed.\n";
    
} catch (Exception $e) {
    echo "✗ Migration failed: " . $e->getMessage() . "\n";
    exit(1);
}
