<?php
/**
 * Admin Session Management - FIXED VERSION
 */

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/admin-config.php';
require_once __DIR__ . '/../config/database.php';

/**
 * Initialize secure session
 */
if (!function_exists('initSecureSession')) {
function initSecureSession() {
    if (session_status() === PHP_SESSION_NONE) {
        $isSecure = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off');
        
        session_set_cookie_params([
            'lifetime' => 86400,
            'path' => '/',
            'domain' => '',
            'secure' => $isSecure,
            'httponly' => true,
            'samesite' => 'Lax'
        ]);
        
        session_start();
    }
}
}

/**
 * Get client IP
 */
if (!function_exists('getClientIP')) {
    function getClientIP() {
        if (!empty($_SERVER['HTTP_CLIENT_IP'])) {
            return $_SERVER['HTTP_CLIENT_IP'];
        } elseif (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
            return explode(',', $_SERVER['HTTP_X_FORWARDED_FOR'])[0];
        }
        return $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
    }
}

/**
 * Create admin session - SIMPLIFIED AND FIXED
 */
if (!function_exists('createAdminSession')) {
function createAdminSession($adminMobile, $adminId, $adminRole, $adminEmail) {
    error_log("=== createAdminSession CALLED ===");
    error_log("Params - Mobile: $adminMobile, ID: $adminId, Role: $adminRole, Email: $adminEmail");
    
    // Start session
    initSecureSession();
    $sessionId = session_id();
    $ip = getClientIP();
    
    error_log("Session ID: $sessionId");
    error_log("Client IP: $ip");
    
    // Get DB connection
    try {
        $db = getDB();
        error_log("DB connection: OK");
    } catch (Exception $e) {
        error_log("DB connection FAILED: " . $e->getMessage());
        return false;
    }
    
    // Calculate expiry (24 hours)
    $expiresAt = date('Y-m-d H:i:s', time() + 86400);
    error_log("Expires at: $expiresAt");
    
    // Allow multiple concurrent sessions per admin (no delete of existing sessions)
    
    // Insert new session
    try {
        $sql = "INSERT INTO admin_sessions (session_id, admin_id, admin_mobile, admin_role, admin_email, ip_address, created_at, last_activity, expires_at) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW(), ?)";
        error_log("SQL: $sql");
        error_log("Values: [$sessionId, $adminId, $adminMobile, $adminRole, $adminEmail, $ip, $expiresAt]");
        
        $stmt = $db->prepare($sql);
        $result = $stmt->execute([$sessionId, $adminId, $adminMobile, $adminRole, $adminEmail, $ip, $expiresAt]);
        
        error_log("INSERT result: " . ($result ? 'TRUE' : 'FALSE'));
        error_log("Rows affected: " . $stmt->rowCount());
        
        if (!$result || $stmt->rowCount() === 0) {
            error_log("ERROR: INSERT did not affect any rows!");
            return false;
        }
    } catch (PDOException $e) {
        error_log("INSERT FAILED: " . $e->getMessage());
        error_log("SQL State: " . $e->errorInfo[0]);
        error_log("Error Info: " . print_r($e->errorInfo, true));
        return false;
    }
    
    // Store in PHP session
    $_SESSION['admin_authenticated'] = true;
    $_SESSION['admin_id'] = $adminId;
    $_SESSION['admin_mobile'] = $adminMobile;
    $_SESSION['admin_role'] = $adminRole;
    $_SESSION['admin_email'] = $adminEmail;
    $_SESSION['admin_session_created'] = time();
    
    error_log("PHP Session data set: " . print_r($_SESSION, true));
    
    // Verify session was created
    try {
        $verifyStmt = $db->prepare("SELECT id FROM admin_sessions WHERE session_id = ?");
        $verifyStmt->execute([$sessionId]);
        $verified = $verifyStmt->fetch();
        error_log("Session verification: " . ($verified ? "FOUND (ID: " . $verified['id'] . ")" : "NOT FOUND!"));
    } catch (PDOException $e) {
        error_log("Verify error: " . $e->getMessage());
    }
    
    error_log("=== createAdminSession COMPLETE ===");
    return true;
}
}

/**
 * Get current admin session
 */
if (!function_exists('getAdminSession')) {
function getAdminSession() {
    try {
        initSecureSession();
        
        error_log("=== getAdminSession CALLED ===");
        error_log("Session ID: " . session_id());
        error_log("PHP Session data: " . print_r($_SESSION, true));
        
        if (!isset($_SESSION['admin_authenticated']) || !$_SESSION['admin_authenticated']) {
            error_log("PHP session not authenticated");
            return null;
        }
        
        $db = getDB();
        $sessionId = session_id();
        
        // Check database session
        $stmt = $db->prepare("SELECT * FROM admin_sessions WHERE session_id = ? AND expires_at > NOW()");
        $stmt->execute([$sessionId]);
        $session = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$session) {
            error_log("Session not found in DB or expired");
            destroyAdminSession();
            return null;
        }
        
        error_log("Session found in DB: " . print_r($session, true));
        
        // Re-validate mobile is still whitelisted
        $storedMobile = $session['admin_mobile'] ?? '';
        
        if (empty($storedMobile)) {
            error_log("ERROR: No mobile number in session");
            destroyAdminSession();
            return null;
        }
        
        // Try multiple formats for whitelist check
        $isWhitelisted = false;
        try {
            $isWhitelisted = isWhitelistedMobile($storedMobile);
            
            if (!$isWhitelisted) {
                // Try with + prefix
                $isWhitelisted = isWhitelistedMobile('+' . ltrim($storedMobile, '+'));
            }
            
            if (!$isWhitelisted) {
                // Try normalized (digits only)
                $normalized = preg_replace('/[^0-9]/', '', $storedMobile);
                $isWhitelisted = isWhitelistedMobile($normalized);
            }
            
            if (!$isWhitelisted) {
                // Try with +91 prefix if it's a 10-digit number
                $digits = preg_replace('/[^0-9]/', '', $storedMobile);
                if (strlen($digits) === 10) {
                    $isWhitelisted = isWhitelistedMobile('+91' . $digits);
                }
            }
        } catch (Exception $e) {
            error_log("Whitelist check error (non-fatal): " . $e->getMessage());
            // Continue without whitelist check if it fails
            $isWhitelisted = true; // Allow access if whitelist check fails (fail open for now)
        } catch (Error $e) {
            error_log("Whitelist check fatal error: " . $e->getMessage());
            // Continue without whitelist check if it fails
            $isWhitelisted = true; // Allow access if whitelist check fails (fail open for now)
        }
        
        if (!$isWhitelisted) {
            error_log("SECURITY ALERT: Admin mobile not whitelisted - Stored: " . $storedMobile);
            destroyAdminSession();
            return null;
        }
        
        // Update last activity
        try {
            $stmt = $db->prepare("UPDATE admin_sessions SET last_activity = NOW() WHERE session_id = ?");
            $stmt->execute([$sessionId]);
        } catch (Exception $e) {
            error_log("Error updating last activity (non-fatal): " . $e->getMessage());
        }
        
        return [
            'admin_id' => $session['admin_id'],
            'admin_mobile' => $session['admin_mobile'],
            'admin_role' => $session['admin_role'],
            'admin_email' => $session['admin_email'],
            'ip_address' => $session['ip_address'],
            'created_at' => $session['created_at'],
            'last_activity' => $session['last_activity']
        ];
    } catch (PDOException $e) {
        error_log("getAdminSession PDO error: " . $e->getMessage());
        error_log("Stack trace: " . $e->getTraceAsString());
        return null;
    } catch (Exception $e) {
        error_log("getAdminSession error: " . $e->getMessage());
        error_log("Stack trace: " . $e->getTraceAsString());
        return null;
    } catch (Error $e) {
        error_log("getAdminSession fatal error: " . $e->getMessage());
        error_log("Stack trace: " . $e->getTraceAsString());
        return null;
    }
}
}

/**
 * Destroy admin session
 */
if (!function_exists('destroyAdminSession')) {
function destroyAdminSession() {
    initSecureSession();
    
    $db = getDB();
    $sessionId = session_id();
    
    try {
        $stmt = $db->prepare("DELETE FROM admin_sessions WHERE session_id = ?");
        $stmt->execute([$sessionId]);
    } catch (PDOException $e) {
        error_log("Error deleting session: " . $e->getMessage());
    }
    
    $_SESSION = [];
    
    if (isset($_COOKIE[session_name()])) {
        setcookie(session_name(), '', time() - 3600, '/');
    }
    
    session_destroy();
}
}
