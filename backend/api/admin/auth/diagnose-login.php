<?php
/**
 * Diagnose Admin Login Issues
 * This will check admin user, password, and login conditions
 * GET /api/admin/auth/diagnose-login.php
 */

// For CLI execution, set HTTP_HOST to localhost to force local database config
if (php_sapi_name() === 'cli' && !isset($_SERVER['HTTP_HOST'])) {
    $_SERVER['HTTP_HOST'] = 'localhost';
}

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

require_once __DIR__ . '/../../../config/database.php';

try {
    $db = getDB();
    
    $email = 'admin@demo1.360coordinates.com';
    $password = 'Admin@123456';
    
    // Check if admin exists
    $stmt = $db->prepare("SELECT id, username, email, password, full_name, role, is_active, google2fa_secret, is_2fa_enabled FROM admin_users WHERE email = ?");
    $stmt->execute([$email]);
    $admin = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$admin) {
        // Try case-insensitive search
        $stmt = $db->prepare("SELECT id, username, email, password, full_name, role, is_active, google2fa_secret, is_2fa_enabled FROM admin_users WHERE LOWER(email) = LOWER(?)");
        $stmt->execute([$email]);
        $admin = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$admin) {
            // List all admin emails
            $stmt = $db->query("SELECT email FROM admin_users");
            $allEmails = $stmt->fetchAll(PDO::FETCH_COLUMN);
            
            echo json_encode([
                'success' => false,
                'error' => 'Admin user not found',
                'searched_email' => $email,
                'all_admin_emails' => $allEmails,
                'message' => 'Admin user with email ' . $email . ' not found in database'
            ], JSON_PRETTY_PRINT);
            exit;
        }
    }
    
    // Check password
    $passwordValid = false;
    $passwordEmpty = empty($admin['password']);
    
    if (!$passwordEmpty) {
        $passwordValid = password_verify($password, $admin['password']);
    }
    
    // Check account status
    $isActive = !empty($admin['is_active']) && $admin['is_active'];
    
    // Check 2FA status
    $has2FA = !empty($admin['google2fa_secret']) && !empty($admin['is_2fa_enabled']) && $admin['is_2fa_enabled'];
    
    // Test password with different variations
    $passwordTests = [
        'Admin@123456' => password_verify('Admin@123456', $admin['password']),
        'admin@123456' => password_verify('admin@123456', $admin['password']),
        'Admin123456' => password_verify('Admin123456', $admin['password']),
    ];
    
    echo json_encode([
        'success' => true,
        'diagnosis' => [
            'admin_found' => true,
            'admin_id' => $admin['id'],
            'username' => $admin['username'],
            'email_in_db' => $admin['email'],
            'email_match' => strtolower($admin['email']) === strtolower($email),
            'is_active' => $isActive,
            'password_empty' => $passwordEmpty,
            'password_valid' => $passwordValid,
            'password_hash_length' => strlen($admin['password']),
            'password_hash_preview' => substr($admin['password'], 0, 30) . '...',
            'has_2fa_enabled' => $has2FA,
            'password_tests' => $passwordTests
        ],
        'recommendations' => [
            'password_valid' => $passwordValid ? 'Password is correct!' : 'Password is incorrect. Run fix-admin-password.php',
            'account_active' => $isActive ? 'Account is active' : 'Account is inactive. Update is_active to 1',
            '2fa_status' => $has2FA ? '2FA is enabled - you will need Google Authenticator code' : '2FA is not enabled',
            'email_case' => strtolower($admin['email']) !== strtolower($email) ? 'Email case mismatch detected!' : 'Email matches correctly'
        ],
        'next_steps' => [
            !$passwordValid ? 'Run: http://localhost/Fullstack/backend/api/admin/auth/fix-admin-password.php' : null,
            !$isActive ? 'Update admin_users SET is_active = 1 WHERE email = ?' : null,
            $has2FA ? 'You need to provide Google Authenticator code after password' : null
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
