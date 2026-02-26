<?php
/**
 * Test 2FA Setup
 * GET /api/admin/auth/test-2fa.php
 * Tests if 2FA setup is working
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: http://localhost:3000');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../../../config/database.php';

try {
    $db = getDB();
    
    // Check if columns exist
    $stmt = $db->query("SHOW COLUMNS FROM admin_users LIKE 'google2fa_secret'");
    $secretColumn = $stmt->fetch();
    
    $stmt = $db->query("SHOW COLUMNS FROM admin_users LIKE 'is_2fa_enabled'");
    $enabledColumn = $stmt->fetch();
    
    // Check if Google2FA library is available
    $google2faAvailable = class_exists('PragmaRX\Google2FA\Google2FA');
    
    // Check if QR code library is available
    $qrCodeAvailable = class_exists('BaconQrCode\Writer');
    
    // Check admin user
    $stmt = $db->prepare("SELECT email, google2fa_secret, is_2fa_enabled FROM admin_users WHERE email = ?");
    $stmt->execute(['admin@demo1.360coordinates.com']);
    $admin = $stmt->fetch(PDO::FETCH_ASSOC);
    
    echo json_encode([
        'success' => true,
        'database' => [
            'google2fa_secret_column' => $secretColumn ? 'exists' : 'missing',
            'is_2fa_enabled_column' => $enabledColumn ? 'exists' : 'missing',
        ],
        'libraries' => [
            'google2fa' => $google2faAvailable ? 'loaded' : 'missing',
            'qrcode' => $qrCodeAvailable ? 'loaded' : 'missing',
        ],
        'admin' => $admin ? [
            'email' => $admin['email'],
            'has_secret' => !empty($admin['google2fa_secret']),
            'is_enabled' => (bool)$admin['is_2fa_enabled']
        ] : 'not_found'
    ], JSON_PRETTY_PRINT);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ], JSON_PRETTY_PRINT);
}
