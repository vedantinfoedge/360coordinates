<?php
/**
 * Simple Users Test - No Authentication
 * Test if we can query users table at all
 */

error_reporting(E_ALL);
ini_set('display_errors', 1);
ob_start();

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

try {
    require_once __DIR__ . '/../../../config/database.php';
    
    $db = getDB();
    
    // Simple count
    $stmt = $db->query("SELECT COUNT(*) as total FROM users");
    $total = $stmt->fetch(PDO::FETCH_ASSOC);
    
    // Get first user
    $stmt = $db->query("SELECT * FROM users LIMIT 1");
    $firstUser = $stmt->fetch(PDO::FETCH_ASSOC);
    
    // Get all users (limit 5)
    $stmt = $db->query("SELECT id, full_name, email, phone, user_type, created_at FROM users LIMIT 5");
    $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    ob_end_clean();
    
    echo json_encode([
        'success' => true,
        'total_users' => intval($total['total']),
        'first_user' => $firstUser,
        'users_sample' => $users,
        'message' => 'Database query successful'
    ], JSON_PRETTY_PRINT);
    
} catch (PDOException $e) {
    ob_end_clean();
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'PDO Error: ' . $e->getMessage(),
        'code' => $e->getCode(),
        'error_info' => $e->errorInfo ?? []
    ], JSON_PRETTY_PRINT);
} catch (Exception $e) {
    ob_end_clean();
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Error: ' . $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine()
    ], JSON_PRETTY_PRINT);
}
