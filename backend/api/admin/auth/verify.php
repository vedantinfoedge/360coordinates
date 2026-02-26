<?php
/**
 * Admin Session Verification API
 * GET /api/admin/auth/verify.php
 * Verifies admin session (HTTP-only cookie based)
 */

// Start output buffering early to prevent any PHP warnings/notices from breaking JSON
ob_start();

require_once __DIR__ . '/../../../config/config.php';
require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../../config/admin-config.php';
require_once __DIR__ . '/../../../utils/response.php';
require_once __DIR__ . '/../../../utils/admin_session.php';

handlePreflight();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendError('Method not allowed', null, 405);
}

try {
    $session = getAdminSession();
    
    if (!$session) {
        sendError('Session expired or invalid. Please login again.', null, 401);
    }
    
    // Get admin details from database
    $db = getDB();
    $stmt = $db->prepare("SELECT id, username, email, full_name, role, is_active FROM admin_users WHERE id = ? AND is_active = 1");
    $stmt->execute([$session['admin_id']]);
    $admin = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$admin) {
        destroyAdminSession();
        sendError('Admin account not found or inactive', null, 401);
    }
    
    // Return admin data
    sendSuccess('Session is valid', [
        'admin' => $admin
    ]);
    
} catch (Exception $e) {
    error_log("Admin Verify Error: " . $e->getMessage());
    sendError('Session verification failed', null, 401);
}
