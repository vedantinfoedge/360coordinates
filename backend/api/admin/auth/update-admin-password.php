<?php
/**
 * Update Admin Password
 * Run this to update admin password to Admin@123456
 * GET /api/admin/auth/update-admin-password.php
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

require_once __DIR__ . '/../../../config/database.php';

try {
    $db = getDB();
    
    // Generate correct password hash
    $password = 'Admin@123456';
    $hashedPassword = password_hash($password, PASSWORD_DEFAULT);
    
    // Update admin password
    $stmt = $db->prepare("UPDATE admin_users SET password = ? WHERE email = ?");
    $result = $stmt->execute([$hashedPassword, 'admin@demo1.360coordinates.com']);
    
    if ($result) {
        // Verify it works
        $stmt = $db->prepare("SELECT password FROM admin_users WHERE email = ?");
        $stmt->execute(['admin@demo1.360coordinates.com']);
        $admin = $stmt->fetch(PDO::FETCH_ASSOC);
        
        $verified = password_verify($password, $admin['password']);
        
        echo json_encode([
            'success' => true,
            'message' => 'Password updated successfully',
            'password' => $password,
            'verified' => $verified,
            'hash' => substr($hashedPassword, 0, 30) . '...'
        ], JSON_PRETTY_PRINT);
    } else {
        echo json_encode([
            'success' => false,
            'message' => 'Failed to update password'
        ], JSON_PRETTY_PRINT);
    }
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ], JSON_PRETTY_PRINT);
}
