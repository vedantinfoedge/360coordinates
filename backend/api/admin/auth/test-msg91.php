<?php
/**
 * Test MSG91 API Integration
 * This file helps debug MSG91 OTP sending
 */

header('Access-Control-Allow-Origin: http://localhost:3000');
header('Content-Type: application/json');

require_once __DIR__ . '/../../../config/config.php';
require_once __DIR__ . '/../../../config/admin-config.php';

$mobile = ADMIN_MOBILE;
$authKey = MSG91_AUTH_KEY;
$templateId = MSG91_TEMPLATE_ID;

echo json_encode([
    'mobile_configured' => $mobile,
    'auth_key_length' => strlen($authKey),
    'template_id' => $templateId,
    'api_url' => MSG91_SEND_OTP_URL
]);

// Test MSG91 API call
$requestData = [
    'mobile' => $mobile,
    'template_id' => $templateId
];

$ch = curl_init();
curl_setopt_array($ch, [
    CURLOPT_URL => MSG91_SEND_OTP_URL,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
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

echo "\n\n=== MSG91 API TEST ===\n";
echo "Request URL: " . MSG91_SEND_OTP_URL . "\n";
echo "Request Data: " . json_encode($requestData) . "\n";
echo "HTTP Code: " . $httpCode . "\n";
echo "CURL Error: " . ($curlError ? $curlError : 'None') . "\n";
echo "Response: " . $response . "\n";
