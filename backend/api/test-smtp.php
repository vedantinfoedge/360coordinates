<?php
/**
 * SMTP Connection Test Script
 * Use this to test your SMTP configuration
 * Access: http://localhost/Fullstack/backend/api/test-smtp.php
 */

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../utils/mailer.php';

header('Content-Type: text/html; charset=utf-8');

echo "<h1>SMTP Connection Test</h1>";
echo "<pre>";

echo "SMTP Configuration:\n";
echo "Host: " . SMTP_HOST . "\n";
echo "Port: " . SMTP_PORT . "\n";
echo "User: " . SMTP_USER . "\n";
echo "From: " . SMTP_FROM_EMAIL . "\n";
echo "Password: " . (empty(SMTP_PASS) ? 'NOT SET' : 'SET (' . strlen(SMTP_PASS) . ' chars)') . "\n\n";

echo "Testing SMTP Connection...\n\n";

// Test connection
$testEmail = SMTP_USER; // Send test email to yourself
$testSubject = 'SMTP Test - ' . date('Y-m-d H:i:s');
$testBody = '<h1>SMTP Test Email</h1><p>If you receive this, SMTP is working correctly!</p>';

echo "Attempting to send test email to: $testEmail\n";
echo "Using PHPMailer: " . (isset($GLOBALS['usePHPMailer']) && $GLOBALS['usePHPMailer'] ? 'Yes' : 'No') . "\n\n";

// Capture PHPMailer debug output
global $phpmailerDebug;
$phpmailerDebug = '';

$result = sendEmailViaSMTP($testEmail, $testSubject, $testBody, 'SMTP Test Email - If you receive this, SMTP is working!');

if ($result) {
    echo "✅ SUCCESS! Email sent successfully.\n";
    echo "Check your inbox at: $testEmail\n";
} else {
    echo "❌ FAILED! Email could not be sent.\n\n";
    
    // Show PHPMailer debug output if available
    $debugOutput = isset($GLOBALS['phpmailerDebug']) ? $GLOBALS['phpmailerDebug'] : '';
    if (!empty($debugOutput)) {
        echo "PHPMailer Debug Output:\n";
        echo "----------------------------------------\n";
        echo htmlspecialchars($debugOutput);
        echo "----------------------------------------\n\n";
    }
    
    // Try to get last error
    $lastError = error_get_last();
    if ($lastError) {
        echo "Last PHP Error:\n";
        echo $lastError['message'] . "\n\n";
    }
    
    echo "Check PHP error logs for detailed error messages:\n";
    $errorLog = ini_get('error_log');
    if ($errorLog) {
        echo "Location: $errorLog\n";
        if (file_exists($errorLog)) {
            echo "File exists: Yes\n";
            echo "File size: " . filesize($errorLog) . " bytes\n";
        } else {
            echo "File exists: No\n";
        }
    } else {
        echo "Error log not configured in php.ini\n";
    }
    
    echo "\nCommon issues:\n";
    echo "1. Incorrect SMTP credentials (username/password)\n";
    echo "2. Firewall blocking port 587\n";
    echo "3. TLS/SSL encryption issues\n";
    echo "4. SMTP server requires specific IP whitelist\n";
    echo "5. Account locked or disabled\n";
    echo "6. Hostinger may require app-specific password\n";
}

echo "\n\nTroubleshooting Steps:\n";
echo "1. Try the simple SMTP test: http://localhost/Fullstack/backend/api/test-smtp-simple.php\n";
echo "2. Check if port 465 works better (SSL instead of STARTTLS)\n";
echo "3. Verify Hostinger email account settings\n";
echo "4. Check if firewall is blocking port 587\n";
echo "5. Try using PHPMailer with different settings\n\n";

echo "PHP Error Log Location:\n";
$errorLog = ini_get('error_log');
if ($errorLog) {
    echo "Configured: $errorLog\n";
    if (file_exists($errorLog)) {
        echo "File exists: Yes\n";
        echo "File size: " . filesize($errorLog) . " bytes\n";
        echo "\nLast 30 lines:\n";
        echo "----------------------------------------\n";
        $lines = file($errorLog);
        $lastLines = array_slice($lines, -30);
        echo htmlspecialchars(implode('', $lastLines));
        echo "----------------------------------------\n";
    } else {
        echo "File exists: No\n";
        echo "Trying common XAMPP locations:\n";
        $commonLogs = [
            'C:\\xampp\\php\\logs\\php_error_log',
            'C:\\xampp\\apache\\logs\\error.log',
            'C:\\xampp\\apache\\logs\\php_error.log'
        ];
        foreach ($commonLogs as $logPath) {
            if (file_exists($logPath)) {
                echo "Found: $logPath\n";
                echo "Last 30 lines:\n";
                echo "----------------------------------------\n";
                $lines = file($logPath);
                $lastLines = array_slice($lines, -30);
                echo htmlspecialchars(implode('', $lastLines));
                echo "----------------------------------------\n";
                break;
            }
        }
    }
} else {
    echo "Error log not configured in php.ini\n";
    echo "Check: C:\\xampp\\php\\php.ini for 'error_log' setting\n";
}

echo "</pre>";

