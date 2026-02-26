<?php
/**
 * Token Verification API
 * GET /api/auth/verify.php
 */

require_once __DIR__ . '/../../config/config.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../utils/response.php';
require_once __DIR__ . '/../../utils/auth.php';

handlePreflight();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendError('Method not allowed', null, 405);
}

try {
    $user = getCurrentUser();
    
    if (!$user) {
        sendError('Invalid or expired token', null, 401);
    }
    
    // Get user type from token payload
    $headers = getallheaders();
    $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';
    $token = '';
    
    if (preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
        $token = $matches[1];
        $payload = verifyToken($token);
        
        if ($payload) {
            // Return user with the login type from token
            $user['user_type'] = $payload['user_type'];
        }
    }
    
    sendSuccess('Token valid', [
        'user' => $user,
        'token' => $token
    ]);
    
} catch (Exception $e) {
    error_log("Token Verification Error: " . $e->getMessage());
    sendError('Token verification failed', null, 500);
}

