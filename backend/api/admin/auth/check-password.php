<?php
/**
 * Check Admin Password
 * Check what password is stored and verify it
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

require_once __DIR__ . '/../../../config/database.php';

try {
    $db = getDB();
    
    // Get admin user
    $stmt = $db->prepare("SELECT id, email, password FROM admin_users WHERE email = ?");
    $stmt->execute(['admin@demo1.360coordinates.com']);
    $admin = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$admin) {
        echo json_encode([
            'success' => false,
            'message' => 'Admin user not found'
        ], JSON_PRETTY_PRINT);
        exit;
    }
    
    // Test password
    $testPassword = 'Admin@123456';
    $verified = password_verify($testPassword, $admin['password']);
    
    // Generate new hash
    $newHash = password_hash($testPassword, PASSWORD_DEFAULT);
    
    echo json_encode([
        'success' => true,
        'admin' => [
            'id' => $admin['id'],
            'email' => $admin['email'],
            'has_password' => !empty($admin['password']),
            'password_hash_preview' => substr($admin['password'], 0, 30) . '...',
        ],
        'password_test' => [
            'test_password' => $testPassword,
            'verification_result' => $verified ? 'CORRECT' : 'INCORRECT',
        ],
        'new_hash' => $newHash,
        'action' => $verified ? 'Password is correct!' : 'Password needs to be updated. Use update-admin-password.php'
    ], JSON_PRETTY_PRINT);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ], JSON_PRETTY_PRINT);
}
