<?php
/**
 * Verify 2FA Setup
 * POST /api/admin/auth/verify-2fa-setup.php
 */

// Start output buffering
ob_start();

// Error handling
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

require_once __DIR__ . '/../../../config/config.php';
require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../../utils/response.php';

// Load Google2FA
// Check root vendor first (where vendor directory is located), then backend vendor as fallback
$rootVendorPath = __DIR__ . '/../../../../vendor/autoload.php';  // Root vendor (from backend/api/admin/auth/)
$backendVendorPath = __DIR__ . '/../../../vendor/autoload.php';  // Backend vendor (fallback - doesn't exist in new structure)

$vendorAutoloadPath = null;
if (file_exists($rootVendorPath)) {
    $vendorAutoloadPath = $rootVendorPath;
} elseif (file_exists($backendVendorPath)) {
    $vendorAutoloadPath = $backendVendorPath;
}

if ($vendorAutoloadPath !== null) {
    require_once $vendorAutoloadPath;
} else {
    error_log("WARNING: Composer autoload not found at root vendor: {$rootVendorPath}");
    error_log("WARNING: Composer autoload not found at backend vendor: {$backendVendorPath}");
}

use PragmaRX\Google2FA\Google2FA;

handlePreflight();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    ob_end_clean();
    sendError('Method not allowed', null, 405);
}

try {
    $rawInput = file_get_contents('php://input');
    $data = json_decode($rawInput, true);
    
    // Log for debugging
    error_log("=== VERIFY 2FA SETUP REQUEST ===");
    error_log("Raw Input: " . substr($rawInput, 0, 500));
    error_log("Parsed Data: " . json_encode($data));
    
    if (json_last_error() !== JSON_ERROR_NONE) {
        error_log("JSON Decode Error: " . json_last_error_msg());
        ob_end_clean();
        sendError('Invalid JSON data', null, 400);
    }
    
    $email = isset($data['email']) ? trim($data['email']) : '';
    $code = isset($data['code']) ? trim($data['code']) : '';
    
    error_log("Email: " . $email);
    error_log("Code: " . (empty($code) ? 'EMPTY' : substr($code, 0, 2) . '****'));
    
    if (empty($email)) {
        error_log("ERROR: Email is empty");
        ob_end_clean();
        sendError('Email is required', null, 400);
    }
    
    if (empty($code)) {
        error_log("ERROR: Code is empty");
        ob_end_clean();
        sendError('6-digit code is required', null, 400);
    }
    
    if (strlen($code) !== 6 || !ctype_digit($code)) {
        error_log("ERROR: Invalid code format - length: " . strlen($code));
        ob_end_clean();
        sendError('Code must be exactly 6 digits', null, 400);
    }
    
    $db = getDB();
    
    // Get admin user - use case-insensitive email match
    $stmt = $db->prepare("SELECT * FROM admin_users WHERE LOWER(TRIM(email)) = LOWER(TRIM(?))");
    $stmt->execute([$email]);
    $admin = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$admin) {
        error_log("ERROR: Admin not found for email: " . $email);
        // Try to find any admin users
        $stmt = $db->query("SELECT email FROM admin_users LIMIT 5");
        $allEmails = $stmt->fetchAll(PDO::FETCH_COLUMN);
        error_log("Available admin emails: " . json_encode($allEmails));
        ob_end_clean();
        sendError('Admin account not found', null, 404);
    }
    
    error_log("Admin found - ID: " . $admin['id'] . ", Email: " . $admin['email']);
    error_log("google2fa_secret check - empty: " . (empty($admin['google2fa_secret']) ? 'YES' : 'NO') . ", length: " . (empty($admin['google2fa_secret']) ? 0 : strlen($admin['google2fa_secret'])));
    
    if (empty($admin['google2fa_secret'])) {
        error_log("ERROR: google2fa_secret is empty for email: " . $email . " (admin ID: " . $admin['id'] . ")");
        error_log("SOLUTION: Please click 'Setup Google Authenticator' first to generate and save the secret key");
        ob_end_clean();
        sendError('Setup not initiated. Please click "Setup Google Authenticator" first and scan the QR code.', null, 400);
    }
    
    error_log("Secret found, verifying code...");
    
    // Verify code
    $google2fa = new Google2FA();
    $valid = $google2fa->verifyKey($admin['google2fa_secret'], $code);
    
    error_log("Code verification result: " . ($valid ? 'VALID' : 'INVALID'));
    
    if ($valid) {
        // Enable 2FA - use ID for more reliable update
        $stmt = $db->prepare("UPDATE admin_users SET is_2fa_enabled = 1 WHERE id = ?");
        $stmt->execute([$admin['id']]);
        
        // Verify it was enabled
        $verifyStmt = $db->prepare("SELECT is_2fa_enabled FROM admin_users WHERE id = ?");
        $verifyStmt->execute([$admin['id']]);
        $verifyAdmin = $verifyStmt->fetch(PDO::FETCH_ASSOC);
        
        error_log("2FA enabled successfully for: " . $email . " (admin ID: " . $admin['id'] . ")");
        error_log("is_2fa_enabled value: " . ($verifyAdmin['is_2fa_enabled'] ?? 'NULL'));
        
        ob_end_clean();
        sendSuccess('2FA enabled successfully', [
            'message' => 'Google Authenticator is now enabled for your account. You can now login with password + 2FA code.'
        ]);
    } else {
        error_log("Invalid code provided");
        ob_end_clean();
        sendError('Invalid code. Please check your Google Authenticator app and enter the current 6-digit code.', null, 400);
    }
    
} catch (PDOException $e) {
    error_log("Database Error: " . $e->getMessage());
    ob_end_clean();
    sendError('Database error. Please try again.', null, 500);
} catch (Exception $e) {
    error_log("Verify 2FA Setup Error: " . $e->getMessage());
    error_log("Stack trace: " . $e->getTraceAsString());
    ob_end_clean();
    sendError('Failed to verify 2FA setup. Please try again.', null, 500);
} catch (Error $e) {
    error_log("Fatal Error: " . $e->getMessage());
    error_log("Stack trace: " . $e->getTraceAsString());
    ob_end_clean();
    sendError('Server error occurred. Please try again.', null, 500);
}
