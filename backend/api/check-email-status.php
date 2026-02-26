<?php
/**
 * Check Welcome Email Status API
 * GET /api/check-email-status.php?email=user@example.com
 * 
 * This endpoint helps verify if welcome email was sent for a user
 */

require_once __DIR__ . '/../../config/config.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../utils/response.php';

handlePreflight();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendError('Method not allowed', null, 405);
}

try {
    $email = $_GET['email'] ?? '';
    
    if (empty($email)) {
        sendError('Email parameter is required', null, 400);
    }
    
    $db = getDB();
    
    // Get user info
    $stmt = $db->prepare("
        SELECT id, full_name, email, email_status, email_sent_at, created_at 
        FROM users 
        WHERE email = ?
    ");
    $stmt->execute([$email]);
    $user = $stmt->fetch();
    
    if (!$user) {
        sendError('User not found', null, 404);
    }
    
    // Get email logs for this user
    $stmt = $db->prepare("
        SELECT id, email_type, status, error_message, created_at 
        FROM email_logs 
        WHERE user_id = ? 
        ORDER BY created_at DESC
    ");
    $stmt->execute([$user['id']]);
    $emailLogs = $stmt->fetchAll();
    
    sendSuccess('Email status retrieved', [
        'user' => [
            'id' => $user['id'],
            'email' => $user['email'],
            'full_name' => $user['full_name'],
            'email_status' => $user['email_status'],
            'email_sent_at' => $user['email_sent_at'],
            'created_at' => $user['created_at']
        ],
        'email_logs' => $emailLogs,
        'summary' => [
            'total_logs' => count($emailLogs),
            'latest_status' => !empty($emailLogs) ? $emailLogs[0]['status'] : 'NO_LOGS',
            'has_error' => !empty($emailLogs) && $emailLogs[0]['status'] === 'FAILED'
        ]
    ]);
    
} catch (Exception $e) {
    error_log("Check Email Status Error: " . $e->getMessage());
    sendError('Failed to check email status: ' . $e->getMessage(), null, 500);
}

