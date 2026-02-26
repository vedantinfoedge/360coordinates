<?php
/**
 * Direct Welcome Email Test - MSG91 SMTP
 * 
 * This script directly tests sending a welcome email using MSG91 SMTP
 * Use this to debug email sending issues
 * 
 * Usage: php test-welcome-email-direct.php <email>
 * Or visit: /api/test-welcome-email-direct.php?email=test@example.com
 */

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/email_helper_smtp.php';

// Detect if running in CLI mode
$isCli = (php_sapi_name() === 'cli');

if ($isCli) {
    // CLI mode
    header('Content-Type: text/plain; charset=utf-8');
    if ($argc < 2) {
        echo "Usage: php test-welcome-email-direct.php <email> [name] [user_id]\n";
        exit(1);
    }
    $testEmail = trim($argv[1]);
    $testName = isset($argv[2]) ? trim($argv[2]) : 'Test User';
    $testUserId = isset($argv[3]) ? intval($argv[3]) : 999;
} else {
    // Web mode
    header('Content-Type: text/html; charset=utf-8');
    
    // Get parameters from GET or POST
    $testEmail = isset($_GET['email']) ? trim($_GET['email']) : (isset($_POST['email']) ? trim($_POST['email']) : '');
    $testName = isset($_GET['name']) ? trim($_GET['name']) : (isset($_POST['name']) ? trim($_POST['name']) : 'Test User');
    $testUserId = isset($_GET['user_id']) ? intval($_GET['user_id']) : (isset($_POST['user_id']) ? intval($_POST['user_id']) : 999);
    
    if (empty($testEmail)) {
        // Show form if no email provided
        echo "<!DOCTYPE html><html><head><title>Welcome Email Test</title><style>body{font-family:Arial;max-width:600px;margin:50px auto;padding:20px;}input,button{padding:10px;margin:5px;width:100%;box-sizing:border-box;}button{background:#007bff;color:white;border:none;cursor:pointer;}button:hover{background:#0056b3;}.error{color:red;padding:10px;background:#fee;border:1px solid #fcc;}</style></head><body>";
        echo "<h1>Welcome Email Test (MSG91 SMTP)</h1>";
        echo "<div class='error'><strong>Error:</strong> Email parameter is required</div>";
        echo "<form method='GET' action=''>";
        echo "<label>Email: <input type='email' name='email' placeholder='test@example.com' required></label><br>";
        echo "<label>Name: <input type='text' name='name' placeholder='Test User' value='Test User'></label><br>";
        echo "<label>User ID: <input type='number' name='user_id' placeholder='999' value='999'></label><br>";
        echo "<button type='submit'>Send Test Email</button>";
        echo "</form>";
        echo "<hr><p><strong>Direct URL usage:</strong><br><code>?email=test@example.com&name=Test%20User&user_id=999</code></p>";
        echo "</body></html>";
        exit(1);
    }
}

// Output formatting based on mode
if ($isCli) {
    echo "=== Welcome Email Direct Test (MSG91 SMTP) ===\n\n";
    echo "Email: $testEmail\n";
    echo "Name: $testName\n";
    echo "User ID: $testUserId\n\n";
} else {
    echo "<!DOCTYPE html><html><head><title>Welcome Email Test Result</title><style>body{font-family:monospace;max-width:900px;margin:20px auto;padding:20px;background:#f5f5f5;}pre{background:#fff;padding:15px;border:1px solid #ddd;overflow-x:auto;}.success{color:green;}.error{color:red;}.warning{color:orange;}h1{color:#333;}</style></head><body>";
    echo "<h1>Welcome Email Direct Test (MSG91 SMTP)</h1>";
    echo "<pre>";
    echo "Email: $testEmail\n";
    echo "Name: $testName\n";
    echo "User ID: $testUserId\n\n";
}

// Check MSG91 SMTP configuration
$configError = false;
echo "1. Checking MSG91 SMTP Configuration...\n";

if (!defined('MSG91_SMTP_HOST')) {
    echo "   ✗ MSG91_SMTP_HOST not defined\n";
    $configError = true;
} else {
    echo "   ✓ MSG91_SMTP_HOST: " . MSG91_SMTP_HOST . "\n";
}

if (!defined('MSG91_SMTP_PORT')) {
    echo "   ✗ MSG91_SMTP_PORT not defined\n";
    $configError = true;
} else {
    echo "   ✓ MSG91_SMTP_PORT: " . MSG91_SMTP_PORT . "\n";
}

if (!defined('MSG91_SMTP_USER')) {
    echo "   ✗ MSG91_SMTP_USER not defined\n";
    $configError = true;
} else {
    echo "   ✓ MSG91_SMTP_USER: " . MSG91_SMTP_USER . "\n";
}

if (!defined('MSG91_SMTP_PASS')) {
    echo "   ✗ MSG91_SMTP_PASS not defined\n";
    $configError = true;
} else {
    echo "   ✓ MSG91_SMTP_PASS: " . substr(MSG91_SMTP_PASS, 0, 3) . "***\n";
}

if (!defined('MSG91_SMTP_FROM_EMAIL')) {
    echo "   ✗ MSG91_SMTP_FROM_EMAIL not defined\n";
    $configError = true;
} else {
    echo "   ✓ MSG91_SMTP_FROM_EMAIL: " . MSG91_SMTP_FROM_EMAIL . "\n";
}

if (!defined('MSG91_SMTP_FROM_NAME')) {
    echo "   ✗ MSG91_SMTP_FROM_NAME not defined\n";
    $configError = true;
} else {
    echo "   ✓ MSG91_SMTP_FROM_NAME: " . MSG91_SMTP_FROM_NAME . "\n";
}

// Check PHPMailer availability - using root vendor only
$rootVendor = __DIR__ . '/../../vendor/autoload.php'; // Root vendor (production - pushed to git)

if (!file_exists($rootVendor)) {
    echo "   ✗ PHPMailer not found at root vendor\n";
    echo "   Root vendor path: $rootVendor\n";
    echo "   Install via: composer require phpmailer/phpmailer (in project root)\n";
    $configError = true;
} else {
    require_once $rootVendor;
    if (class_exists('PHPMailer\PHPMailer\PHPMailer')) {
        echo "   ✓ PHPMailer is available (from: root vendor)\n";
    } else {
        echo "   ✗ PHPMailer class not found\n";
        $configError = true;
    }
}

if ($configError) {
    if (!$isCli) {
        echo "</pre></body></html>";
    }
    exit(1);
}

// Send welcome email via SMTP
echo "\n2. Sending Welcome Email via MSG91 SMTP...\n";
echo "   To: $testEmail\n";
echo "   Name: $testName\n\n";

$result = sendWelcomeEmailViaSMTP($testUserId, $testName, $testEmail);

echo "3. Result:\n";
if ($result) {
    echo "   ✓ SUCCESS: Email sent successfully via SMTP!\n";
    echo "   Check your inbox (and spam folder): $testEmail\n";
} else {
    echo "   ✗ FAILED: Email sending failed\n";
    echo "   Check error logs for details\n";
}

if ($isCli) {
    echo "\n=== Test Complete ===\n";
} else {
    echo "\n=== Test Complete ===\n";
    echo "</pre>";
    echo "<p><a href='?email=$testEmail&name=" . urlencode($testName) . "&user_id=$testUserId'>Test Again</a> | <a href='?'>New Test</a></p>";
    echo "</body></html>";
}
