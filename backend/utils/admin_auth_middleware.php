<?php
/**
 * Admin Authentication Middleware
 * Protects admin routes with session-based authentication
 */

error_reporting(E_ALL);
ini_set('display_errors', 0); // Don't display errors, log them instead

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/admin-config.php';
require_once __DIR__ . '/admin_session.php';
require_once __DIR__ . '/response.php';

/**
 * Require admin authentication
 * Use this middleware to protect admin routes
 */
if (!function_exists('requireAdminAuth')) {
function requireAdminAuth() {
    try {
        $session = getAdminSession();
        
        if (!$session) {
            sendError('Admin authentication required', null, 401);
        }
        
        return $session;
    } catch (Exception $e) {
        error_log("requireAdminAuth error: " . $e->getMessage());
        error_log("Stack trace: " . $e->getTraceAsString());
        sendError('Authentication error: ' . $e->getMessage(), null, 500);
    } catch (Error $e) {
        error_log("requireAdminAuth fatal error: " . $e->getMessage());
        error_log("Stack trace: " . $e->getTraceAsString());
        sendError('Authentication system error', null, 500);
    }
}
}

/**
 * Check if admin is authenticated (non-blocking)
 */
if (!function_exists('isAdminAuthenticated')) {
function isAdminAuthenticated() {
    try {
        return getAdminSession() !== null;
    } catch (Exception $e) {
        error_log("isAdminAuthenticated error: " . $e->getMessage());
        return false;
    } catch (Error $e) {
        error_log("isAdminAuthenticated fatal error: " . $e->getMessage());
        return false;
    }
}
}

