<?php
/**
 * Public Configuration API
 * GET /api/public/config.php
 * Returns public configuration flags (no authentication required)
 */

require_once __DIR__ . '/../../config/config.php';
require_once __DIR__ . '/../../utils/response.php';

handlePreflight();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendError('Method not allowed', null, 405);
}

try {
    // Return public configuration flags
    sendSuccess('Configuration retrieved', [
        'enableEmailOtp' => ENABLE_EMAIL_OTP
    ]);
} catch (Exception $e) {
    error_log("Public Config API Error: " . $e->getMessage());
    sendError('Failed to retrieve configuration', null, 500);
}
