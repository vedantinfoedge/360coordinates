<?php
/**
 * Test Admin Login
 * This simulates a login request to test the login flow
 * GET /api/admin/auth/test-login.php
 */

// For CLI execution, set HTTP_HOST to localhost to force local database config
if (php_sapi_name() === 'cli' && !isset($_SERVER['HTTP_HOST'])) {
    $_SERVER['HTTP_HOST'] = 'localhost';
}

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../../utils/response.php';
require_once __DIR__ . '/../../../utils/admin_auth.php';

try {
    $db = getDB();
    
    $email = 'admin@demo1.360coordinates.com';
    $password = 'Admin@123456';
    
    // Simulate the login process
    $email = trim($email);
    
    // Get admin user with case-insensitive email match
    $stmt = $db->prepare("SELECT id, username, email, password, full_name, role, is_active, google2fa_secret, is_2fa_enabled FROM admin_users WHERE LOWER(TRIM(email)) = LOWER(TRIM(?))");
    $stmt->execute([$email]);
    $admin = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$admin) {
        echo json_encode([
            'success' => false,
            'error' => 'Admin not found',
            'email_searched' => $email
        ], JSON_PRETTY_PRINT);
        exit;
    }
    
    // Check if active
    $isActive = !empty($admin['is_active']) && $admin['is_active'];
    
    // Verify password
    $passwordValid = password_verify($password, $admin['password']);
    $passwordValidTrimmed = password_verify(trim($password), $admin['password']);
    
    if (!$passwordValid && !$passwordValidTrimmed) {
        echo json_encode([
            'success' => false,
            'error' => 'Password invalid',
            'password_provided' => $password,
            'password_length' => strlen($password),
            'password_hash_length' => strlen($admin['password']),
            'password_hash_preview' => substr($admin['password'], 0, 30) . '...'
        ], JSON_PRETTY_PRINT);
        exit;
    }
    
    // Generate token
    $token = generateAdminToken($admin['id'], $admin['role'], $admin['email']);
    
    // Remove sensitive data
    unset($admin['password']);
    unset($admin['google2fa_secret']);
    
    echo json_encode([
        'success' => true,
        'message' => 'Login test successful!',
        'data' => [
            'token' => $token,
            'admin' => $admin,
            'is2FAEnabled' => (bool)($admin['is_2fa_enabled'] ?? false)
        ],
        'test_results' => [
            'email_match' => true,
            'is_active' => $isActive,
            'password_valid' => $passwordValid || $passwordValidTrimmed,
            'token_generated' => !empty($token)
        ]
    ], JSON_PRETTY_PRINT);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'trace' => $e->getTraceAsString()
    ], JSON_PRETTY_PRINT);
}

