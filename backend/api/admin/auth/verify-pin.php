<?php
/**
 * Admin Verify PIN API (Optional)
 * POST /api/admin/auth/verify-pin.php
 * Verifies admin PIN after OTP verification for additional security
 */

// Start output buffering
if (ob_get_level() == 0) {
    ob_start();
}

require_once __DIR__ . '/../../../config/config.php';
require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../../config/admin-config.php';
require_once __DIR__ . '/../../../utils/response.php';
require_once __DIR__ . '/../../../utils/admin_session.php';

handlePreflight();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendError('Method not allowed', null, 405);
}

try {
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($data['pin']) || empty($data['pin'])) {
        sendError('PIN is required', null, 400);
    }
    
    $pin = trim($data['pin']);
    $db = getDB();
    
    // Get admin session (must be logged in via OTP first)
    $session = getAdminSession();
    if (!$session) {
        sendError('Please complete OTP verification first', null, 401);
    }
    
    // Get admin user with PIN
    $stmt = $db->prepare("SELECT id, admin_pin, is_active FROM admin_users WHERE id = ? AND is_active = 1");
    $stmt->execute([$session['admin_id']]);
    $admin = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$admin) {
        sendError('Admin account not found or inactive', null, 404);
    }
    
    // Check if PIN is set
    if (empty($admin['admin_pin'])) {
        // PIN not set yet, allow access (first time login)
        sendSuccess('PIN not set. Login successful.', [
            'pin_required' => false,
            'admin' => [
                'id' => $session['admin_id'],
                'email' => $session['admin_email'],
                'role' => $session['admin_role']
            ]
        ]);
    }
    
    // Verify PIN
    if (!password_verify($pin, $admin['admin_pin'])) {
        error_log("Invalid PIN attempt for admin ID: " . $session['admin_id']);
        sendError('Invalid PIN. Please try again.', null, 401);
    }
    
    // PIN verified successfully
    error_log("PIN verified successfully for admin ID: " . $session['admin_id']);
    
    sendSuccess('PIN verified successfully. Login complete.', [
        'pin_required' => true,
        'admin' => [
            'id' => $session['admin_id'],
            'email' => $session['admin_email'],
            'role' => $session['admin_role']
        ]
    ]);
    
} catch (PDOException $e) {
    error_log("Verify PIN Database Error: " . $e->getMessage());
    sendError('Database error occurred. Please try again.', null, 500);
} catch (Exception $e) {
    error_log("Verify PIN Exception: " . $e->getMessage());
    sendError('Failed to verify PIN. Please try again.', null, 500);
}

