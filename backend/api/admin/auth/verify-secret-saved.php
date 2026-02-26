<?php
/**
 * Verify if 2FA secret was saved
 * GET /api/admin/auth/verify-secret-saved.php?email=admin@demo1.360coordinates.com
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
    
    $email = isset($_GET['email']) ? $_GET['email'] : 'admin@demo1.360coordinates.com';
    
    // Get admin user with case-insensitive match
    $stmt = $db->prepare("SELECT id, email, google2fa_secret, is_2fa_enabled FROM admin_users WHERE LOWER(TRIM(email)) = LOWER(TRIM(?))");
    $stmt->execute([$email]);
    $admin = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$admin) {
        echo json_encode([
            'success' => false,
            'error' => 'Admin not found',
            'searched_email' => $email
        ], JSON_PRETTY_PRINT);
        exit;
    }
    
    $hasSecret = !empty($admin['google2fa_secret']);
    $secretLength = $hasSecret ? strlen($admin['google2fa_secret']) : 0;
    $isEnabled = !empty($admin['is_2fa_enabled']) && $admin['is_2fa_enabled'];
    
    echo json_encode([
        'success' => true,
        'admin' => [
            'id' => $admin['id'],
            'email' => $admin['email'],
            'has_google2fa_secret' => $hasSecret,
            'secret_length' => $secretLength,
            'secret_preview' => $hasSecret ? substr($admin['google2fa_secret'], 0, 8) . '...' : 'N/A',
            'is_2fa_enabled' => $isEnabled,
            'is_2fa_enabled_value' => $admin['is_2fa_enabled']
        ],
        'diagnosis' => [
            'secret_saved' => $hasSecret ? 'YES - Secret is saved in database' : 'NO - Secret is NOT saved',
            '2fa_enabled' => $isEnabled ? 'YES - 2FA is enabled' : 'NO - 2FA is not enabled yet',
            'next_step' => $hasSecret && !$isEnabled 
                ? 'Enter the 6-digit code from Google Authenticator app to enable 2FA' 
                : ($hasSecret && $isEnabled 
                    ? '2FA is fully set up - you can login with password + 2FA code' 
                    : 'You need to click "Setup Google Authenticator" first to generate and save the secret')
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

