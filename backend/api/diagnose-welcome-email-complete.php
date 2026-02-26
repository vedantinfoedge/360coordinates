<?php
/**
 * Complete Welcome Email Diagnostic Tool
 * Tests all aspects of welcome email functionality
 */

// Set error reporting
error_reporting(E_ALL);
ini_set('display_errors', 1);

echo "=== Welcome Email Complete Diagnostic ===\n\n";

// 1. Test vendor path resolution
echo "1. Testing Vendor Path Resolution\n";
echo "   Current working directory: " . getcwd() . "\n";
echo "   Script directory (__DIR__): " . __DIR__ . "\n";

$vendorPaths = [
    'From backend/api/' => __DIR__ . '/../../vendor/autoload.php',
    'From backend/helpers/' => dirname(__DIR__) . '/../vendor/autoload.php',
    'Absolute from root' => dirname(dirname(__DIR__)) . '/vendor/autoload.php',
];

foreach ($vendorPaths as $label => $path) {
    $exists = file_exists($path);
    echo "   $label: $path\n";
    echo "   " . ($exists ? "✓ EXISTS" : "✗ NOT FOUND") . "\n";
    if ($exists) {
        require_once $path;
        $phpmailerExists = class_exists('PHPMailer\PHPMailer\PHPMailer');
        echo "   PHPMailer class: " . ($phpmailerExists ? "✓ AVAILABLE" : "✗ NOT AVAILABLE") . "\n";
    }
    echo "\n";
}

// 2. Test configuration
echo "2. Testing MSG91 SMTP Configuration\n";
require_once __DIR__ . '/../config/config.php';

$configs = [
    'MSG91_SMTP_HOST' => defined('MSG91_SMTP_HOST') ? MSG91_SMTP_HOST : 'NOT DEFINED',
    'MSG91_SMTP_PORT' => defined('MSG91_SMTP_PORT') ? MSG91_SMTP_PORT : 'NOT DEFINED',
    'MSG91_SMTP_USER' => defined('MSG91_SMTP_USER') ? MSG91_SMTP_USER : 'NOT DEFINED',
    'MSG91_SMTP_PASS' => defined('MSG91_SMTP_PASS') ? (substr(MSG91_SMTP_PASS, 0, 3) . '***') : 'NOT DEFINED',
    'MSG91_SMTP_FROM_EMAIL' => defined('MSG91_SMTP_FROM_EMAIL') ? MSG91_SMTP_FROM_EMAIL : 'NOT DEFINED',
    'MSG91_SMTP_FROM_NAME' => defined('MSG91_SMTP_FROM_NAME') ? MSG91_SMTP_FROM_NAME : 'NOT DEFINED',
];

foreach ($configs as $key => $value) {
    echo "   $key: $value\n";
}
echo "\n";

// 3. Test email helper loading
echo "3. Testing Email Helper Loading\n";
try {
    require_once __DIR__ . '/../helpers/email_helper_smtp.php';
    echo "   ✓ email_helper_smtp.php loaded\n";
    
    if (function_exists('sendWelcomeEmailViaSMTP')) {
        echo "   ✓ sendWelcomeEmailViaSMTP function exists\n";
    } else {
        echo "   ✗ sendWelcomeEmailViaSMTP function NOT FOUND\n";
    }
} catch (Exception $e) {
    echo "   ✗ Error loading email_helper_smtp.php: " . $e->getMessage() . "\n";
}
echo "\n";

// 4. Test template loading
echo "4. Testing Email Template Loading\n";
try {
    require_once __DIR__ . '/../utils/welcome_email_template.php';
    echo "   ✓ welcome_email_template.php loaded\n";
    
    if (function_exists('generateWelcomeEmailTemplate')) {
        echo "   ✓ generateWelcomeEmailTemplate function exists\n";
        $testTemplate = generateWelcomeEmailTemplate('Test User', 'test@example.com');
        echo "   ✓ Template generated successfully (length: " . strlen($testTemplate) . " bytes)\n";
    } else {
        echo "   ✗ generateWelcomeEmailTemplate function NOT FOUND\n";
    }
} catch (Exception $e) {
    echo "   ✗ Error loading template: " . $e->getMessage() . "\n";
}
echo "\n";

// 5. Test PHPMailer with MSG91 settings
echo "5. Testing PHPMailer Connection (Dry Run)\n";
try {
    $rootVendor = dirname(dirname(__DIR__)) . '/vendor/autoload.php';
    if (file_exists($rootVendor)) {
        require_once $rootVendor;
    }
    
    if (class_exists('PHPMailer\PHPMailer\PHPMailer')) {
        echo "   ✓ PHPMailer class available\n";
        
        $mail = new \PHPMailer\PHPMailer\PHPMailer(true);
        $mail->isSMTP();
        $mail->Host = MSG91_SMTP_HOST;
        $mail->SMTPAuth = true;
        $mail->Username = MSG91_SMTP_USER;
        $mail->Password = MSG91_SMTP_PASS;
        $mail->SMTPSecure = \PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_STARTTLS;
        $mail->Port = MSG91_SMTP_PORT;
        $mail->SMTPDebug = 0; // No debug for dry run
        $mail->Timeout = 5; // Short timeout for testing
        
        echo "   ✓ PHPMailer configured with MSG91 settings\n";
        echo "   Host: " . $mail->Host . "\n";
        echo "   Port: " . $mail->Port . "\n";
        echo "   Encryption: STARTTLS\n";
    } else {
        echo "   ✗ PHPMailer class NOT AVAILABLE\n";
    }
} catch (Exception $e) {
    echo "   ✗ Error: " . $e->getMessage() . "\n";
}
echo "\n";

// 6. Summary
echo "=== Diagnostic Complete ===\n";
echo "\nNext steps:\n";
echo "1. Verify vendor/autoload.php exists at project root\n";
echo "2. Run: php backend/api/test-welcome-email-direct.php test@example.com\n";
echo "3. Check error logs for specific failures\n";

