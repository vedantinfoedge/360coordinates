<?php
/**
 * Check Users Table Structure
 * Verify the actual table structure in database
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

require_once __DIR__ . '/../../../config/database.php';

try {
    $db = getDB();
    
    // Get actual table structure
    $stmt = $db->query("DESCRIBE users");
    $columns = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Get sample data
    $stmt = $db->query("SELECT * FROM users LIMIT 1");
    $sampleUser = $stmt->fetch(PDO::FETCH_ASSOC);
    
    // Count total users
    $stmt = $db->query("SELECT COUNT(*) as total FROM users");
    $total = $stmt->fetch()['total'];
    
    // Get all column names
    $columnNames = array_column($columns, 'Field');
    
    echo json_encode([
        'success' => true,
        'table_name' => 'users',
        'total_users' => intval($total),
        'columns' => $columns,
        'column_names' => $columnNames,
        'sample_user' => $sampleUser,
        'has_id' => in_array('id', $columnNames),
        'has_full_name' => in_array('full_name', $columnNames),
        'has_email' => in_array('email', $columnNames),
        'has_user_type' => in_array('user_type', $columnNames),
        'has_is_banned' => in_array('is_banned', $columnNames),
        'has_email_verified' => in_array('email_verified', $columnNames),
        'has_phone_verified' => in_array('phone_verified', $columnNames),
        'has_profile_image' => in_array('profile_image', $columnNames),
        'has_created_at' => in_array('created_at', $columnNames)
    ], JSON_PRETTY_PRINT);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'trace' => $e->getTraceAsString()
    ], JSON_PRETTY_PRINT);
}
