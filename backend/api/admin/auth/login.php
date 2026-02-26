<?php
/**
 * Admin Login API with 2FA Support
 * POST /api/admin/auth/login.php
 */

require_once __DIR__ . '/../../../config/config.php';
require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../../utils/response.php';
require_once __DIR__ . '/../../../utils/admin_auth.php';

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
    sendError('Method not allowed', null, 405);
}

try {
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($data['email']) || !isset($data['password'])) {
        sendError('Email and password are required', null, 400);
    }
    
    $email = trim($data['email']);
    $password = $data['password'];
    $authCode = isset($data['authCode']) ? trim($data['authCode']) : '';
    
    // Debug logging
    error_log("=== ADMIN LOGIN ATTEMPT ===");
    error_log("Email received: [" . $email . "] (length: " . strlen($email) . ")");
    error_log("Password received length: " . strlen($password));
    error_log("Password first 10 chars: " . substr($password, 0, 10));
    
    $db = getDB();
    
    // Get admin user (include 2FA fields) - use case-insensitive email match
    $stmt = $db->prepare("SELECT id, username, email, password, full_name, role, is_active, google2fa_secret, is_2fa_enabled FROM admin_users WHERE LOWER(TRIM(email)) = LOWER(TRIM(?))");
    $stmt->execute([$email]);
    $admin = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$admin) {
        error_log("Login failed: Admin user not found for email: " . $email);
        // Try to find any admin users
        $stmt = $db->query("SELECT email FROM admin_users LIMIT 5");
        $allEmails = $stmt->fetchAll(PDO::FETCH_COLUMN);
        error_log("Available admin emails: " . json_encode($allEmails));
        sendError('Invalid email or password', null, 401);
    }
    
    error_log("Admin found: ID=" . $admin['id'] . ", Email=" . $admin['email'] . ", Active=" . ($admin['is_active'] ? 'yes' : 'no'));
    
    // Check if admin is active
    if (empty($admin['is_active']) || !$admin['is_active']) {
        error_log("Login failed: Admin account is inactive for email: " . $email);
        sendError('Your account has been deactivated. Please contact the administrator.', null, 403);
    }
    
    // Verify password
    if (empty($admin['password'])) {
        error_log("ERROR: Admin password is empty in database for email: " . $email);
        error_log("SOLUTION: Run http://localhost/Fullstack/backend/api/admin/auth/fix-admin-password.php");
        sendError('Password not set. Please run fix script or contact administrator.', null, 401);
    }
    
    // Test password verification with exact password and trimmed version
    $passwordValid = password_verify($password, $admin['password']);
    $passwordValidTrimmed = password_verify(trim($password), $admin['password']);
    
    error_log("Password verification - Original: " . ($passwordValid ? 'VALID' : 'INVALID'));
    error_log("Password verification - Trimmed: " . ($passwordValidTrimmed ? 'VALID' : 'INVALID'));
    error_log("Password hash in DB length: " . strlen($admin['password']));
    error_log("Password hash in DB preview: " . substr($admin['password'], 0, 30) . "...");
    
    if (!$passwordValid && !$passwordValidTrimmed) {
        error_log("Password verification failed for email: " . $email);
        error_log("SOLUTION: Run http://localhost/Fullstack/backend/api/admin/auth/fix-admin-password.php");
        sendError('Invalid email or password. If you just fixed the password, wait a moment and try again.', null, 401);
    }
    
    // Use the valid password check
    $passwordValid = $passwordValid || $passwordValidTrimmed;
    
    error_log("Password verified successfully for: " . $email);
    
    // After password is verified, check 2FA status
    // If 2FA is not set up yet, allow login to proceed to setup
    // If 2FA is set up, require the code
    
    if (!empty($admin['google2fa_secret']) && $admin['is_2fa_enabled']) {
        // 2FA is enabled - require code
        if (empty($authCode)) {
            error_log("2FA is enabled but no code provided - returning require2FA");
            // Return success with require2FA flag (password is correct, just need 2FA code)
            sendSuccess('Password verified. Please enter Google Authenticator code', [
                'require2FA' => true,
                'is2FAEnabled' => true
            ]);
            exit;
        }
        
        // Verify 2FA code
        $google2fa = new Google2FA();
        $valid = $google2fa->verifyKey($admin['google2fa_secret'], $authCode);
        
        if (!$valid) {
            error_log("Invalid 2FA code provided");
            sendError('Invalid authenticator code. Please check your Google Authenticator app and try again.', null, 401);
        }
        
        error_log("2FA code verified successfully");
    } else {
        // 2FA is not set up yet - MANDATORY: require setup before allowing login
        error_log("2FA not set up yet for: " . $email . " - REQUIRING SETUP");
        
        // Check if user is trying to setup 2FA (has authCode but no secret yet)
        if (!empty($authCode)) {
            // User provided code but 2FA not set up - this shouldn't happen
            sendError('2FA is not set up. Please setup Google Authenticator first.', null, 403);
            exit;
        }
        
        // 2FA not set up - MANDATORY: require setup before login
        error_log("2FA setup REQUIRED - returning requireSetup flag");
        sendSuccess('Password verified. Google Authenticator setup is REQUIRED for security.', [
            'require2FASetup' => true,
            'is2FAEnabled' => false,
            'message' => 'Google Authenticator setup is REQUIRED. Please setup 2FA to continue.'
        ]);
        exit;
    }
    
    // Password (and 2FA if enabled) verified - generate token
    $token = generateAdminToken($admin['id'], $admin['role'], $admin['email']);
    
    // Return admin data (without password and secret)
    unset($admin['password']);
    unset($admin['google2fa_secret']);
    
    sendSuccess('Login successful', [
        'token' => $token,
        'admin' => $admin,
        'is2FAEnabled' => (bool)$admin['is_2fa_enabled']
    ]);
    
} catch (Exception $e) {
    error_log("Admin Login Error: " . $e->getMessage());
    sendError('Login failed. Please try again.', null, 500);
}
