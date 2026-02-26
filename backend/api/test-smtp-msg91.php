<?php
/**
 * Test MSG91 SMTP Connection
 * Diagnose SMTP connection issues
 */

require_once __DIR__ . '/../config/config.php';

// Check PHPMailer
// Using root vendor folder
$phpmailerPath = __DIR__ . '/../../vendor/autoload.php';
if (file_exists($phpmailerPath)) {
    require_once $phpmailerPath;
} else {
    die("ERROR: PHPMailer not found. Install via: composer require phpmailer/phpmailer\n");
}

if (!class_exists('PHPMailer\PHPMailer\PHPMailer')) {
    die("ERROR: PHPMailer class not found after autoload\n");
}

echo "=== MSG91 SMTP Connection Test ===\n\n";

// Test values
$testEmail = isset($_GET['email']) ? $_GET['email'] : 'test@example.com';
$testName = isset($_GET['name']) ? $_GET['name'] : 'Test User';

echo "Configuration:\n";
echo "  SMTP Host: " . MSG91_SMTP_HOST . "\n";
echo "  SMTP Port: " . MSG91_SMTP_PORT . "\n";
echo "  SMTP User: " . MSG91_SMTP_USER . "\n";
echo "  SMTP Pass: " . substr(MSG91_SMTP_PASS, 0, 3) . "***\n";
echo "  From Email: " . MSG91_SMTP_FROM_EMAIL . "\n";
echo "  From Name: " . MSG91_SMTP_FROM_NAME . "\n";
echo "  Test To: $testEmail\n\n";

try {
    $mail = new \PHPMailer\PHPMailer\PHPMailer(true);
    
    // Enable verbose debug output
    $mail->SMTPDebug = 2; // 2 = verbose
    $mail->Debugoutput = function($str, $level) {
        echo "DEBUG: $str\n";
    };
    
    // MSG91 SMTP Server settings
    $mail->isSMTP();
    $mail->Host = MSG91_SMTP_HOST;
    $mail->SMTPAuth = true;
    $mail->Username = MSG91_SMTP_USER;
    $mail->Password = MSG91_SMTP_PASS;
    $mail->SMTPSecure = \PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_STARTTLS;
    $mail->Port = MSG91_SMTP_PORT;
    $mail->CharSet = 'UTF-8';
    
    // SSL options
    $mail->SMTPOptions = array(
        'ssl' => array(
            'verify_peer' => false,
            'verify_peer_name' => false,
            'allow_self_signed' => true
        )
    );
    
    // Recipients
    $mail->setFrom(MSG91_SMTP_FROM_EMAIL, MSG91_SMTP_FROM_NAME);
    $mail->addAddress($testEmail, $testName);
    
    // Content
    $mail->isHTML(true);
    $mail->Subject = 'Test Email from MSG91 SMTP';
    $mail->Body = '<h1>Test Email</h1><p>This is a test email sent via MSG91 SMTP.</p>';
    $mail->AltBody = 'Test Email - This is a test email sent via MSG91 SMTP.';
    
    echo "Attempting to send email...\n\n";
    $mail->send();
    
    echo "\n✓ SUCCESS: Email sent successfully!\n";
    echo "Check inbox: $testEmail\n";
    
} catch (\PHPMailer\PHPMailer\Exception $e) {
    echo "\n✗ FAILED: PHPMailer Exception\n";
    echo "Error: " . $mail->ErrorInfo . "\n";
    echo "Message: " . $e->getMessage() . "\n";
} catch (Exception $e) {
    echo "\n✗ FAILED: General Exception\n";
    echo "Message: " . $e->getMessage() . "\n";
}

