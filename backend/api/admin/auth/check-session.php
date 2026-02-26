<?php
/**
 * Admin Session Check API
 * GET /api/admin/auth/check-session.php
 * Lightweight endpoint to check if admin session is valid
 * Similar to verify.php but with simplified response for session checking
 */

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
        sendError('Not authenticated', ['authenticated' => false], 401);
    }
    
    // Mask mobile for display (security: never expose full mobile number)
    $maskedMobile = substr($session['admin_mobile'], 0, 4) . '****' . substr($session['admin_mobile'], -4);
    
    sendSuccess('Session is valid', [
        'authenticated' => true,
        'admin' => [
            'id' => $session['admin_id'],
            'mobile' => $maskedMobile, // Only masked mobile, never full number
            'role' => $session['admin_role'],
            'email' => $session['admin_email']
        ]
    ]);
    
} catch (Exception $e) {
    error_log("Check Session Error: " . $e->getMessage());
    sendError('Session verification failed', ['authenticated' => false], 401);
}

