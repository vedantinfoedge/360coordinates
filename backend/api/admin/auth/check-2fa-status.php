<?php
/**
 * Check Admin 2FA Status
 * This will show the current 2FA status for admin user
 * GET /api/admin/auth/check-2fa-status.php
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
    
    // Get admin user with 2FA fields
    $stmt = $db->prepare("SELECT id, username, email, google2fa_secret, is_2fa_enabled FROM admin_users WHERE email = ?");
    $stmt->execute([$email]);
    $admin = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$admin) {
        echo json_encode([
            'success' => false,
            'error' => 'Admin user not found'
        ], JSON_PRETTY_PRINT);
        exit;
    }
    
    $hasSecret = !empty($admin['google2fa_secret']);
    $isEnabled = !empty($admin['is_2fa_enabled']) && $admin['is_2fa_enabled'];
    $willRequire2FA = $hasSecret && $isEnabled;
    
    echo json_encode([
        'success' => true,
        'admin_email' => $admin['email'],
        '2fa_status' => [
            'has_google2fa_secret' => $hasSecret,
            'is_2fa_enabled' => $isEnabled,
            'will_require_2fa' => $willRequire2FA,
            'google2fa_secret_length' => $hasSecret ? strlen($admin['google2fa_secret']) : 0,
            'is_2fa_enabled_value' => $admin['is_2fa_enabled']
        ],
        'explanation' => [
            'current_behavior' => $willRequire2FA 
                ? '2FA is enabled - login will require Google Authenticator code' 
                : '2FA is NOT enabled - login will skip 2FA and go directly to dashboard',
            'reason' => $willRequire2FA 
                ? 'Both google2fa_secret exists AND is_2fa_enabled = 1' 
                : (!$hasSecret ? 'google2fa_secret is empty - need to setup 2FA first' : 'is_2fa_enabled is 0 - need to enable it'),
            'to_enable_2fa' => 'You need to: 1) Setup Google Authenticator (scan QR code), 2) Verify the setup code, which will enable is_2fa_enabled = 1'
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

