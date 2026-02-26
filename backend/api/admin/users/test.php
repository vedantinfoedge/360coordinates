<?php
/**
 * Test Users API
 * Check if users table exists and has data
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

require_once __DIR__ . '/../../../config/database.php';

try {
    $db = getDB();
    
    // Check if users table exists
    $stmt = $db->query("SHOW TABLES LIKE 'users'");
    $tableExists = $stmt->rowCount() > 0;
    
    if (!$tableExists) {
        echo json_encode([
            'success' => false,
            'error' => 'Users table does not exist',
            'tables' => []
        ], JSON_PRETTY_PRINT);
        exit;
    }
    
    // Get table structure
    $stmt = $db->query("DESCRIBE users");
    $columns = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Count total users
    $stmt = $db->query("SELECT COUNT(*) as total FROM users");
    $total = $stmt->fetch()['total'];
    
    // Get sample users (first 5)
    $stmt = $db->query("SELECT id, full_name, email, phone, user_type, created_at FROM users LIMIT 5");
    $sampleUsers = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Get users by type
    $stmt = $db->query("SELECT user_type, COUNT(*) as count FROM users GROUP BY user_type");
    $usersByType = $stmt->fetchAll(PDO::FETCH_KEY_PAIR);
    
    echo json_encode([
        'success' => true,
        'table_exists' => true,
        'total_users' => intval($total),
        'users_by_type' => $usersByType,
        'columns' => array_column($columns, 'Field'),
        'sample_users' => $sampleUsers,
        'message' => $total > 0 ? "Found {$total} users in database" : "Users table exists but is empty"
    ], JSON_PRETTY_PRINT);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'trace' => $e->getTraceAsString()
    ], JSON_PRETTY_PRINT);
}
