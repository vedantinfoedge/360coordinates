<?php
/**
 * Verify OTP via MSG91 REST API (Proxy for mobile app)
 * POST /api/otp/msg91-verify.php
 *
 * This endpoint does NOT check local otp_verifications table.
 * It relies entirely on MSG91's verification response.
 */

require_once __DIR__ . '/../../config/config.php';
require_once __DIR__ . '/../../config/admin-config.php';
require_once __DIR__ . '/../../utils/response.php';
require_once __DIR__ . '/../../utils/validation.php';

handlePreflight();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendError('Method not allowed', null, 405);
}

try {
    $input     = json_decode(file_get_contents('php://input'), true);
    $phone     = $input['phone'] ?? '';
    $otp       = $input['otp'] ?? '';
    $requestId = $input['requestId'] ?? null;

    if (empty($phone)) {
        sendError('Phone number is required', null, 400);
    }

    if (empty($otp)) {
        sendError('OTP is required', null, 400);
    }

    // We accept OTP format as provided by MSG91 (4 or 6 digits),
    // so do NOT use validateOTP() here (it enforces 6 digits).
    if (!preg_match('/^\d{4,8}$/', $otp)) {
        sendError('Invalid OTP format', null, 400);
    }

    // Normalize phone using existing helper
    $validatedPhone = validatePhone($phone);
    if (!$validatedPhone) {
        sendError('Invalid phone number format', null, 400);
    }

    // MSG91 expects digits without +
    $mobileDigits = preg_replace('/\D/', '', $validatedPhone);

    $payload = [
        'mobile' => $mobileDigits,
        'otp'    => $otp,
    ];

    if (!empty($requestId)) {
        $payload['request_id'] = $requestId;
    }

    $headers = [
        'Content-Type: application/json',
        'authkey: ' . MSG91_AUTH_KEY,
    ];

    $ch = curl_init();
    curl_setopt_array($ch, [
        CURLOPT_URL            => MSG91_VERIFY_OTP_URL,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST           => true,
        CURLOPT_HTTPHEADER     => $headers,
        CURLOPT_POSTFIELDS     => json_encode($payload),
    ]);

    $responseBody = curl_exec($ch);
    $httpCode     = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError    = curl_error($ch);
    curl_close($ch);

    if ($responseBody === false) {
        error_log("MSG91 Verify OTP cURL error: " . $curlError);
        sendError('OTP verification failed. Please try again later.', null, 500);
    }

    $responseJson = json_decode($responseBody, true);
    if ($httpCode !== 200 || !is_array($responseJson)) {
        error_log("MSG91 Verify OTP HTTP error: Code=$httpCode, Body=" . substr($responseBody, 0, 500));
        sendError('OTP verification failed. Please try again later.', null, 500);
    }

    if (($responseJson['type'] ?? '') !== 'success') {
        error_log("MSG91 Verify OTP error response: " . $responseBody);
        $msg = $responseJson['message'] ?? 'Invalid or expired OTP';
        sendError($msg, ['providerResponse' => $responseJson], 400);
    }

    sendSuccess('OTP verified via MSG91', [
        'method'   => 'msg91',
        'provider' => 'MSG91',
    ]);
} catch (Exception $e) {
    error_log("MSG91 Verify OTP Exception: " . $e->getMessage());
    sendError('OTP verification failed. Please try again later.', null, 500);
}

