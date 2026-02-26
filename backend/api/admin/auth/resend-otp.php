<?php
/**
 * Admin Resend OTP API
 * POST /api/admin/auth/resend-otp.php
 * Resends OTP via MSG91 retry API
 */

// Suppress error display for JSON responses
error_reporting(E_ALL);
ini_set('display_errors', 0);

// Set basic CORS headers immediately for preflight requests
header('Access-Control-Allow-Origin: http://localhost:3000');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS, PATCH');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept, Origin');
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Max-Age: 86400');

// Handle preflight OPTIONS request immediately
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../../../config/config.php';
require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../../config/admin-config.php';
require_once __DIR__ . '/../../../utils/response.php';

// Set proper CORS headers using the utility function
setCorsHeaders();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendError('Method not allowed', null, 405);
}

try {
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($data['request_id']) || empty($data['request_id'])) {
        sendError('Request ID is required', null, 400);
    }
    
    $requestId = trim($data['request_id']);
    
    // Use hardcoded admin mobile number from config
    if (!defined('ADMIN_MOBILE')) {
        sendError('Server configuration error', null, 500);
    }
    
    $mobile = ADMIN_MOBILE;
    
    $db = getDB();
    
    // Check if request_id exists and is still pending
    // Use last 4 digits for matching (security)
    $mobileLast4 = substr($mobile, -4);
    $stmt = $db->prepare("SELECT id, created_at FROM admin_otp_logs WHERE request_id = ? AND mobile = ? AND status = 'pending' ORDER BY created_at DESC LIMIT 1");
    $stmt->execute([$requestId, $mobileLast4]);
    $otpLog = $stmt->fetch();
    
    if (!$otpLog) {
        sendError('Invalid request ID or OTP already verified', null, 400);
    }
    
    // Check cooldown period (30 seconds)
    $createdAt = strtotime($otpLog['created_at']);
    $elapsed = time() - $createdAt;
    
    if ($elapsed < OTP_RESEND_COOLDOWN_SECONDS) {
        $remaining = OTP_RESEND_COOLDOWN_SECONDS - $elapsed;
        sendError("Please wait {$remaining} seconds before resending OTP", null, 429);
    }
    
    // Call MSG91 retry API
    // POST https://control.msg91.com/api/v5/otp/retry
    $ch = curl_init();
    curl_setopt_array($ch, [
        CURLOPT_URL => MSG91_RESEND_OTP_URL,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/json',
            'authkey: ' . MSG91_AUTH_KEY
        ],
        CURLOPT_POSTFIELDS => json_encode([
            'mobile' => $mobile,
            'retrytype' => 'text'
        ])
    ]);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);
    
    if ($curlError) {
        error_log("MSG91 CURL Error: " . $curlError);
        sendError('Failed to resend OTP. Please try again.', null, 500);
    }
    
    $msg91Response = json_decode($response, true);
    
    if ($httpCode === 200 && isset($msg91Response['type']) && $msg91Response['type'] === 'success') {
        // Update existing log or create new one
        $newRequestId = isset($msg91Response['request_id']) ? $msg91Response['request_id'] : $requestId;
        
        // Update status to pending for new resend
        $stmt = $db->prepare("UPDATE admin_otp_logs SET request_id = ?, status = 'pending', created_at = NOW() WHERE id = ?");
        $stmt->execute([$newRequestId, $otpLog['id']]);
        
        sendSuccess('OTP resent successfully', [
            'request_id' => $newRequestId,
            'mobile' => substr($mobile, 0, 2) . '****' . substr($mobile, -2) // Masked mobile
        ]);
    } else {
        $errorMsg = isset($msg91Response['message']) ? $msg91Response['message'] : 'Failed to resend OTP';
        error_log("MSG91 API Error: " . $errorMsg);
        sendError('Failed to resend OTP. Please try again.', null, 500);
    }
    
} catch (Exception $e) {
    error_log("Admin Resend OTP Error: " . $e->getMessage());
    sendError('Failed to resend OTP. Please try again.', null, 500);
}
