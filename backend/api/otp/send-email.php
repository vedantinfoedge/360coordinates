<?php
/**
 * Send Email OTP API
 * POST /api/otp/send-email.php
 */

require_once __DIR__ . '/../../config/config.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../utils/response.php';
require_once __DIR__ . '/../../utils/validation.php';
require_once __DIR__ . '/../../utils/mailer.php';

handlePreflight();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendError('Method not allowed', null, 405);
}

try {
    $input = json_decode(file_get_contents('php://input'), true);
    $email = sanitizeInput($input['email'] ?? '');
    
    if (empty($email)) {
        sendError('Email is required', null, 400);
    }
    
    if (!validateEmail($email)) {
        sendError('Invalid email format', null, 400);
    }
    
    // Normalize email (lowercase, trim)
    $email = strtolower(trim($email));
    
    // Check if email OTP is enabled
    if (!ENABLE_EMAIL_OTP) {
        // Email OTP is disabled - skip generation and sending
        // Auto-create a verified OTP record for compatibility
        $db = getDB();
        $expiresAt = date('Y-m-d H:i:s', time() + (OTP_EXPIRATION_MINUTES * 60));
        $stmt = $db->prepare("INSERT INTO otp_verifications (email, otp, otp_type, verified, expires_at) VALUES (?, ?, 'email', 1, ?)");
        $stmt->execute([$email, 'DISABLED', $expiresAt]);
        
        error_log("Email OTP disabled: Auto-verified email for $email");
        
        $responseData = [
            'message' => 'Email verification skipped (OTP disabled)',
        ];
        sendSuccess('Email verification skipped', $responseData);
        return;
    }
    
    // Generate OTP
    $otp = generateOTP();
    $expiresAt = date('Y-m-d H:i:s', time() + (OTP_EXPIRATION_MINUTES * 60));
    
    // Get database connection
    $db = getDB();
    
    // Store OTP (normalized email)
    $stmt = $db->prepare("INSERT INTO otp_verifications (email, otp, otp_type, expires_at) VALUES (?, ?, 'email', ?)");
    $stmt->execute([$email, $otp, $expiresAt]);
    
    // Send email via Hostinger SMTP
    $subject = 'Email Verification OTP - IndiaPropertys';
    $emailBody = generateOTPEmailTemplate($otp);
    $altBody = "Your email verification OTP is: $otp. This OTP is valid for " . OTP_EXPIRATION_MINUTES . " minutes.";
    
    error_log("Attempting to send email to: $email");
    error_log("Using PHPMailer: " . (isset($GLOBALS['usePHPMailer']) && $GLOBALS['usePHPMailer'] ? 'Yes' : 'No'));
    
    $emailSent = sendEmailViaSMTP($email, $subject, $emailBody, $altBody);
    
    if ($emailSent) {
        $responseData = [
            'message' => 'OTP sent to your email successfully',
        ];
        
        // OTP is NOT returned in response for security
        // User must check their email to get the OTP
        
        sendSuccess('OTP sent successfully', $responseData);
    } else {
        // Log error but don't expose SMTP details to client
        error_log("Failed to send OTP email to: $email");
        
        // DEVELOPMENT MODE: Return OTP in response if SMTP fails
        // This allows testing the registration flow while fixing SMTP
        $isDevelopment = ini_get('display_errors') && ini_get('display_errors') == 1;
        
        if ($isDevelopment) {
            error_log("SMTP failed but returning OTP in development mode for testing");
            $responseData = [
                'message' => 'OTP generated (SMTP not working - using dev mode)',
                'otp' => $otp, // Return OTP for testing
                'warning' => 'SMTP authentication failed. Fix SMTP credentials in Hostinger. This is development mode only.'
            ];
            sendSuccess('OTP generated (development mode)', $responseData);
        } else {
            // Production mode - show error
            $errorLog = ini_get('error_log');
            $isAuthError = false;
            if ($errorLog && file_exists($errorLog)) {
                $logContent = file_get_contents($errorLog);
                if (stripos($logContent, 'authentication failed') !== false || 
                    stripos($logContent, '535') !== false) {
                    $isAuthError = true;
                }
            }
            
            // Provide helpful error message
            $errorMsg = 'Failed to send OTP email. ';
            
            if ($isAuthError) {
                $errorMsg .= 'SMTP authentication failed. Please verify: ';
                $errorMsg .= '1) Email password is correct, 2) SMTP is enabled in Hostinger, ';
                $errorMsg .= '3) Account is not locked. ';
                $errorMsg .= 'Check Hostinger email settings or contact support.';
            } else {
                $errorMsg .= 'Please check your email settings or try again later.';
            }
            
            sendError($errorMsg, null, 500);
        }
    }
    
} catch (Exception $e) {
    error_log("Email OTP Error: " . $e->getMessage());
    error_log("Email OTP Error Trace: " . $e->getTraceAsString());
    $errorMessage = 'Failed to send OTP';
    
    // In development, show more details
    if (ini_get('display_errors')) {
        $errorMessage .= ': ' . $e->getMessage();
    }
    
    sendError($errorMessage, null, 500);
}

