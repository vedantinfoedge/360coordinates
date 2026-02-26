<?php
/**
 * Verify SMS OTP API
 * POST /api/otp/verify-sms.php
 */

require_once __DIR__ . '/../../config/config.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../utils/response.php';
require_once __DIR__ . '/../../utils/validation.php';

handlePreflight();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendError('Method not allowed', null, 405);
}

try {
    $input = json_decode(file_get_contents('php://input'), true);
    $phone = $input['phone'] ?? '';
    $otp = $input['otp'] ?? '';
    $reqId = $input['reqId'] ?? null;
    
    if (empty($phone)) {
        sendError('Phone number is required', null, 400);
    }
    
    if (empty($otp)) {
        sendError('OTP is required', null, 400);
    }
    
    if (!validateOTP($otp)) {
        sendError('Invalid OTP format', null, 400);
    }
    
    // Validate phone format
    $validatedPhone = validatePhone($phone);
    if (!$validatedPhone) {
        sendError('Invalid phone number format', null, 400);
    }
    $phone = $validatedPhone;
    
    // Get database connection
    $db = getDB();
    
    // Build query
    $query = "SELECT id FROM otp_verifications WHERE phone = ? AND otp = ? AND otp_type = 'sms' AND verified = 0 AND expires_at > NOW()";
    $params = [$phone, $otp];
    
    if ($reqId) {
        $query .= " AND id = ?";
        $params[] = $reqId;
    }
    
    $query .= " ORDER BY created_at DESC LIMIT 1";
    
    // Verify OTP
    $stmt = $db->prepare($query);
    $stmt->execute($params);
    $otpRecord = $stmt->fetch();
    
    if (!$otpRecord) {
        sendError('Invalid or expired OTP', null, 400);
    }
    
    // Mark as verified
    $stmt = $db->prepare("UPDATE otp_verifications SET verified = 1 WHERE id = ?");
    $stmt->execute([$otpRecord['id']]);
    
    sendSuccess('Phone OTP verified successfully');
    
} catch (Exception $e) {
    error_log("SMS OTP Verification Error: " . $e->getMessage());
    sendError('OTP verification failed', null, 500);
}

