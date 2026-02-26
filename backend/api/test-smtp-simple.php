<?php
/**
 * Simple SMTP Test (without PHPMailer)
 * Tests the native SMTP implementation
 */

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../utils/mailer.php';

header('Content-Type: text/html; charset=utf-8');

echo "<h1>Simple SMTP Test (Native Implementation)</h1>";
echo "<pre>";

// Force use of native SMTP (not PHPMailer)
$GLOBALS['usePHPMailer'] = false;

echo "Testing with Native SMTP Implementation...\n";
echo "Host: " . SMTP_HOST . "\n";
echo "Port: " . SMTP_PORT . "\n";
echo "User: " . SMTP_USER . "\n\n";

$testEmail = SMTP_USER;
$testSubject = 'Simple SMTP Test - ' . date('Y-m-d H:i:s');
$testBody = '<h1>Simple SMTP Test</h1><p>Testing native SMTP implementation.</p>';

$result = sendEmailViaSMTP($testEmail, $testSubject, $testBody, 'Simple SMTP Test');

if ($result) {
    echo "✅ SUCCESS! Email sent via native SMTP.\n";
} else {
    echo "❌ FAILED! Check error logs for details.\n";
}

echo "</pre>";

