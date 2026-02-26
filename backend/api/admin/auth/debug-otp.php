<?php
/**
 * OTP Debug Tool
 * This file helps diagnose why OTP is not being received
 * Access: http://localhost/Fullstack/backend/api/admin/auth/debug-otp.php
 */

header('Content-Type: text/html; charset=utf-8');
error_reporting(E_ALL);
ini_set('display_errors', 1);

echo "<h1>MSG91 OTP Debug Tool</h1>";
echo "<style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    .section { background: #f5f5f5; padding: 15px; margin: 10px 0; border-radius: 5px; }
    .success { color: green; }
    .error { color: red; }
    .warning { color: orange; }
    pre { background: #fff; padding: 10px; border: 1px solid #ddd; overflow-x: auto; }
</style>";

// Load config
try {
    require_once __DIR__ . '/../../../config/config.php';
    require_once __DIR__ . '/../../../config/admin-config.php';
    
    echo "<div class='section'>";
    echo "<h2>✓ Configuration Loaded</h2>";
    echo "</div>";
} catch (Exception $e) {
    echo "<div class='section error'>";
    echo "<h2>✗ Configuration Error</h2>";
    echo "<p>" . htmlspecialchars($e->getMessage()) . "</p>";
    echo "</div>";
    exit;
}

// Check constants
echo "<div class='section'>";
echo "<h2>Configuration Values</h2>";
echo "<table border='1' cellpadding='5' style='border-collapse: collapse;'>";
echo "<tr><th>Constant</th><th>Value</th><th>Status</th></tr>";

$checks = [
    'ADMIN_MOBILE' => ADMIN_MOBILE,
    'MSG91_AUTH_KEY' => substr(MSG91_AUTH_KEY, 0, 15) . '...',
    'MSG91_TEMPLATE_ID' => MSG91_TEMPLATE_ID,
    'MSG91_WIDGET_ID' => MSG91_WIDGET_ID,
    'MSG91_SEND_OTP_URL' => MSG91_SEND_OTP_URL,
];

foreach ($checks as $name => $value) {
    $status = defined($name) ? "<span class='success'>✓ Defined</span>" : "<span class='error'>✗ Not Defined</span>";
    echo "<tr><td><strong>$name</strong></td><td>" . htmlspecialchars($value) . "</td><td>$status</td></tr>";
}

// Check if Template ID equals Widget ID (common mistake)
if (MSG91_TEMPLATE_ID === MSG91_WIDGET_ID) {
    echo "<tr><td colspan='3' class='warning'><strong>⚠ WARNING:</strong> Template ID is same as Widget ID! This is likely wrong. Get the actual Template ID from MSG91 Dashboard > OTP > Templates</td></tr>";
}

echo "</table>";
echo "</div>";

// Test MSG91 API Call
echo "<div class='section'>";
echo "<h2>Testing MSG91 API Call</h2>";

$mobile = ADMIN_MOBILE;
$requestData = [
    'mobile' => $mobile,
    'template_id' => MSG91_TEMPLATE_ID
];

echo "<p><strong>Request Details:</strong></p>";
echo "<pre>" . json_encode($requestData, JSON_PRETTY_PRINT) . "</pre>";

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
        'authkey: ' . MSG91_AUTH_KEY
    ],
    CURLOPT_POSTFIELDS => json_encode($requestData)
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
curl_close($ch);

echo "<p><strong>Response:</strong></p>";
echo "<p>HTTP Code: <strong>" . $httpCode . "</strong></p>";

if ($curlError) {
    echo "<p class='error'>CURL Error: " . htmlspecialchars($curlError) . "</p>";
}

$responseData = json_decode($response, true);

echo "<pre>" . htmlspecialchars($response) . "</pre>";

if ($httpCode === 200) {
    if (isset($responseData['type']) && $responseData['type'] === 'success') {
        echo "<p class='success'><strong>✓ API Call Successful!</strong></p>";
        echo "<p>Request ID: " . (isset($responseData['request_id']) ? $responseData['request_id'] : 'N/A') . "</p>";
        echo "<p>If you're still not receiving OTP, check:</p>";
        echo "<ul>";
        echo "<li>MSG91 Dashboard > OTP > Reports - Check if OTP was sent</li>";
        echo "<li>Your mobile number: " . htmlspecialchars($mobile) . "</li>";
        echo "<li>Account balance in MSG91</li>";
        echo "<li>Template approval status in MSG91 Dashboard</li>";
        echo "</ul>";
    } else {
        echo "<p class='error'><strong>✗ API Call Failed</strong></p>";
        if (isset($responseData['message'])) {
            echo "<p>Error Message: <strong>" . htmlspecialchars($responseData['message']) . "</strong></p>";
        }
        if (isset($responseData['errors'])) {
            echo "<p>Errors:</p><pre>" . json_encode($responseData['errors'], JSON_PRETTY_PRINT) . "</pre>";
        }
    }
} else {
    echo "<p class='error'><strong>✗ HTTP Error: $httpCode</strong></p>";
    if (isset($responseData['message'])) {
        echo "<p>Error: " . htmlspecialchars($responseData['message']) . "</p>";
    }
}

echo "</div>";

// Common Issues Checklist
echo "<div class='section'>";
echo "<h2>Common Issues Checklist</h2>";
echo "<ul>";
echo "<li>✓ Template ID must be from MSG91 Dashboard > OTP > Templates (NOT Widget ID)</li>";
echo "<li>✓ Template must be approved in MSG91 Dashboard</li>";
echo "<li>✓ Account must have sufficient balance</li>";
echo "<li>✓ Account must be active (not in demo mode)</li>";
echo "<li>✓ Mobile number format: " . htmlspecialchars($mobile) . " (with country code, no +)</li>";
echo "<li>✓ Template must contain ##OTP## placeholder</li>";
echo "</ul>";
echo "</div>";

echo "<div class='section'>";
echo "<h2>Next Steps</h2>";
echo "<ol>";
echo "<li>Login to <a href='https://control.msg91.com' target='_blank'>MSG91 Dashboard</a></li>";
echo "<li>Go to <strong>OTP > Templates</strong></li>";
echo "<li>Check if you have an approved template</li>";
echo "<li>Copy the <strong>Template ID</strong> (not Widget ID)</li>";
echo "<li>Update <code>MSG91_TEMPLATE_ID</code> in <code>backend/config/admin-config.php</code></li>";
echo "<li>Check <strong>OTP > Reports</strong> to see delivery status</li>";
echo "</ol>";
echo "</div>";
