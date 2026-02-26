<?php
/**
 * Send OTP via MSG91 REST API (Proxy for mobile app)
 * POST /api/otp/msg91-send.php
 *
 * This endpoint does NOT use local otp_verifications table.
 * It simply triggers MSG91's own OTP flow and returns request_id.
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
    $input = json_decode(file_get_contents('php://input'), true);
    $phone = $input['phone'] ?? '';

    if (empty($phone)) {
        sendError('Phone number is required', null, 400);
    }

    // Normalize phone using existing helper (Indian numbers)
    $validatedPhone = validatePhone($phone);
    if (!$validatedPhone) {
        sendError('Invalid phone number. Please enter a valid Indian mobile number.', null, 400);
    }

    // MSG91 expects mobile without + (e.g. 917888076881)
    $mobileDigits = preg_replace('/\D/', '', $validatedPhone);

    // Prepare MSG91 payload
    $payload = [
        'mobile'      => $mobileDigits,
        'template_id' => MSG91_TEMPLATE_ID,
    ];

    $headers = [
        'Content-Type: application/json',
        'authkey: ' . MSG91_AUTH_KEY,
    ];

    $ch = curl_init();
    curl_setopt_array($ch, [
        CURLOPT_URL            => MSG91_SEND_OTP_URL,
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
        error_log("MSG91 Send OTP cURL error: " . $curlError);
        sendError('Failed to send OTP. Please try again later.', null, 500);
    }

    $responseJson = json_decode($responseBody, true);
    if ($httpCode !== 200 || !is_array($responseJson)) {
        error_log("MSG91 Send OTP HTTP error: Code=$httpCode, Body=" . substr($responseBody, 0, 500));
        sendError('Failed to send OTP. Please try again later.', null, 500);
    }

    if (($responseJson['type'] ?? '') !== 'success') {
        error_log("MSG91 Send OTP error response: " . $responseBody);
        $msg = $responseJson['message'] ?? 'Failed to send OTP via MSG91';
        sendError($msg, ['providerResponse' => $responseJson], 400);
    }

    $requestId = $responseJson['request_id'] ?? null;

    sendSuccess('OTP sent via MSG91', [
        'requestId' => $requestId,
        'method'    => 'msg91',
        'provider'  => 'MSG91',
    ]);
} catch (Exception $e) {
    error_log("MSG91 Send OTP Exception: " . $e->getMessage());
    sendError('Failed to send OTP. Please try again later.', null, 500);
}

