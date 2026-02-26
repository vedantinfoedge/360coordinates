<?php
/**
 * Verify Email OTP API
 * POST /api/otp/verify-email.php
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
    $email = sanitizeInput($input['email'] ?? '');
    $otp = $input['otp'] ?? '';
    
    if (empty($email)) {
        sendError('Email is required', null, 400);
    }
    
    if (empty($otp)) {
        sendError('OTP is required', null, 400);
    }
    
    if (!validateOTP($otp)) {
        sendError('Invalid OTP format', null, 400);
    }
    
    // Normalize email and OTP
    $email = strtolower(trim($email));
    $otp = trim($otp);
    
    // Get database connection
    $db = getDB();
    
    // Check if email OTP is enabled
    if (!ENABLE_EMAIL_OTP) {
        // Email OTP is disabled - auto-verify by creating/updating verified record
        $stmt = $db->prepare("SELECT id FROM otp_verifications WHERE LOWER(TRIM(email)) = ? AND otp_type = 'email' ORDER BY created_at DESC LIMIT 1");
        $stmt->execute([$email]);
        $otpRecord = $stmt->fetch();
        
        if ($otpRecord) {
            // Update existing record to verified
            $stmt = $db->prepare("UPDATE otp_verifications SET verified = 1 WHERE id = ?");
            $stmt->execute([$otpRecord['id']]);
        } else {
            // Create verified record if none exists
            $expiresAt = date('Y-m-d H:i:s', time() + (OTP_EXPIRATION_MINUTES * 60));
            $stmt = $db->prepare("INSERT INTO otp_verifications (email, otp, otp_type, verified, expires_at) VALUES (?, ?, 'email', 1, ?)");
            $stmt->execute([$email, 'DISABLED', $expiresAt]);
        }
        
        error_log("Email OTP disabled: Auto-verified email for $email");
        sendSuccess('Email OTP verified successfully (OTP disabled)');
        return;
    }
    
    // Verify OTP (normalized email)
    $stmt = $db->prepare("SELECT id FROM otp_verifications WHERE LOWER(TRIM(email)) = ? AND otp = ? AND otp_type = 'email' AND verified = 0 AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1");
    $stmt->execute([$email, $otp]);
    $otpRecord = $stmt->fetch();
    
    if (!$otpRecord) {
        sendError('Invalid or expired OTP', null, 400);
    }
    
    // Mark as verified
    $stmt = $db->prepare("UPDATE otp_verifications SET verified = 1 WHERE id = ?");
    $stmt->execute([$otpRecord['id']]);
    
    sendSuccess('Email OTP verified successfully');
    
} catch (Exception $e) {
    error_log("Email OTP Verification Error: " . $e->getMessage());
    sendError('OTP verification failed', null, 500);
}

