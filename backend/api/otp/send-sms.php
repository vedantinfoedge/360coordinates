<?php
/**
 * Send SMS OTP API
 * POST /api/otp/send-sms.php
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
    
    if (empty($phone)) {
        sendError('Phone number is required', null, 400);
    }
    
    // Validate phone format
    $validatedPhone = validatePhone($phone);
    if (!$validatedPhone) {
        sendError('Invalid phone number. Please enter a valid Indian mobile number.', null, 400);
    }
    $phone = $validatedPhone;
    
    // Generate OTP
    $otp = generateOTP();
    $expiresAt = date('Y-m-d H:i:s', time() + (OTP_EXPIRATION_MINUTES * 60));
    
    // Get database connection
    $db = getDB();
    
    // Store OTP
    $stmt = $db->prepare("INSERT INTO otp_verifications (phone, otp, otp_type, expires_at) VALUES (?, ?, 'sms', ?)");
    $stmt->execute([$phone, $otp, $expiresAt]);
    $otpId = $db->lastInsertId();
    
    // Send SMS using MSG91 (or your SMS provider)
    // TODO: Implement actual SMS sending
    $smsSent = sendSMSViaMSG91($phone, $otp);
    
    if ($smsSent) {
        sendSuccess('OTP sent to your phone', [
            'message' => 'OTP sent successfully',
            'reqId' => $otpId // Request ID for verification
        ]);
    } else {
        sendError('Failed to send OTP SMS', null, 500);
    }
    
} catch (Exception $e) {
    error_log("SMS OTP Error: " . $e->getMessage());
    sendError('Failed to send OTP', null, 500);
}

/**
 * Send SMS via MSG91
 * TODO: Implement actual MSG91 API integration
 */
function sendSMSViaMSG91($phone, $otp) {
    // Placeholder - implement actual MSG91 API call
    // For development, return true
    // In production, make actual API call to MSG91
    
    if (empty(MSG91_AUTH_KEY) || MSG91_AUTH_KEY === 'your-msg91-auth-key') {
        // Development mode - just log
        error_log("SMS OTP for $phone: $otp");
        return true;
    }
    
    // Production MSG91 API call
    $url = "https://control.msg91.com/api/v5/otp";
    $data = [
        'authkey' => MSG91_AUTH_KEY,
        'mobile' => $phone,
        'message' => "Your OTP is $otp. Valid for " . OTP_EXPIRATION_MINUTES . " minutes.",
        'sender' => MSG91_SENDER_ID,
        'template_id' => MSG91_TEMPLATE_ID
    ];
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($data));
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    return $httpCode === 200;
}

