<?php
/**
 * Quick MSG91 Response Checker
 * This will show the exact response from MSG91
 */

header('Content-Type: application/json');
error_reporting(E_ALL);
ini_set('display_errors', 0);

require_once __DIR__ . '/../../../config/config.php';
require_once __DIR__ . '/../../../config/admin-config.php';

$mobile = ADMIN_MOBILE;
$authKey = MSG91_AUTH_KEY;
$templateId = MSG91_TEMPLATE_ID;

$requestData = [
    'mobile' => $mobile,
    'template_id' => $templateId
];

$ch = curl_init();
curl_setopt_array($ch, [
    CURLOPT_URL => MSG91_SEND_OTP_URL,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_SSL_VERIFYPEER => false,
    CURLOPT_SSL_VERIFYHOST => false,
    CURLOPT_TIMEOUT => 30,
    CURLOPT_HTTPHEADER => [
        'Content-Type: application/json',
        'authkey: ' . $authKey
    ],
    CURLOPT_POSTFIELDS => json_encode($requestData)
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
curl_close($ch);

$responseData = json_decode($response, true);

echo json_encode([
    'request' => [
        'url' => MSG91_SEND_OTP_URL,
        'mobile' => substr($mobile, 0, 4) . '****' . substr($mobile, -4),
        'template_id' => $templateId,
        'auth_key_length' => strlen($authKey)
    ],
    'response' => [
        'http_code' => $httpCode,
        'curl_error' => $curlError ? $curlError : null,
        'raw_response' => $response,
        'parsed_response' => $responseData
    ],
    'status' => ($httpCode === 200 && isset($responseData['type']) && $responseData['type'] === 'success') ? 'success' : 'failed',
    'error_message' => isset($responseData['message']) ? $responseData['message'] : null,
    'errors' => isset($responseData['errors']) ? $responseData['errors'] : null
], JSON_PRETTY_PRINT);
