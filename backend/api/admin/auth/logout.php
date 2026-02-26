<?php
/**
 * Admin Logout API
 * POST /api/admin/auth/logout.php
 * Destroys admin session and clears cookies
 */

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
    // Destroy admin session
    destroyAdminSession();
    
    sendSuccess('Logged out successfully');
    
} catch (Exception $e) {
    error_log("Logout Error: " . $e->getMessage());
    sendError('Failed to logout. Please try again.', null, 500);
}

