<?php
/**
 * Check Property Tables
 * Use this to see which tables are missing
 */

require_once __DIR__ . '/config/database.php';

header('Content-Type: application/json');

try {
    $db = getDB();
    
    $tables = [
        'properties',
        'property_images',
        'property_amenities',
        'subscriptions',
        'users',
        'inquiries'
    ];
    
    $missing = [];
    $exists = [];
    
    foreach ($tables as $table) {
        try {
            $stmt = $db->query("SHOW TABLES LIKE '$table'");
            if ($stmt->rowCount() == 0) {
                $missing[] = $table;
            } else {
                $exists[] = $table;
            }
        } catch (Exception $e) {
            $missing[] = $table;
        }
    }
    
    echo json_encode([
        'success' => empty($missing),
        'exists' => $exists,
        'missing' => $missing,
        'message' => empty($missing) 
            ? 'All required tables exist' 
            : 'Missing tables: ' . implode(', ', $missing)
    ], JSON_PRETTY_PRINT);
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false, 
        'error' => $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine()
    ], JSON_PRETTY_PRINT);
}

