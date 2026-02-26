<?php
/**
 * Test SMTP with Port 465 (SSL) instead of 587 (STARTTLS)
 * Some Hostinger accounts work better with SSL
 */

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../utils/mailer.php';

header('Content-Type: text/html; charset=utf-8');

echo "<h1>SMTP Test - Port 465 (SSL)</h1>";
echo "<pre>";

// Temporarily override port
define('TEST_SMTP_PORT', 465);

echo "Testing with Port 465 (SSL) instead of 587 (STARTTLS)...\n\n";
echo "SMTP Configuration:\n";
echo "Host: " . SMTP_HOST . "\n";
echo "Port: 465 (SSL)\n";
echo "User: " . SMTP_USER . "\n\n";

// Test with PHPMailer using SSL
if (class_exists('PHPMailer\PHPMailer\PHPMailer')) {
    try {
        $mail = new \PHPMailer\PHPMailer\PHPMailer(true);
        
        $mail->isSMTP();
        $mail->Host = SMTP_HOST;
        $mail->SMTPAuth = true;
        $mail->Username = SMTP_USER;
        $mail->Password = SMTP_PASS;
        $mail->SMTPSecure = \PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_SMTPS; // SSL instead of STARTTLS
        $mail->Port = 465;
        $mail->CharSet = 'UTF-8';
        $mail->SMTPDebug = 2;
        
        $debugOutput = '';
        $mail->Debugoutput = function($str, $level) use (&$debugOutput) {
            $debugOutput .= $str . "\n";
            echo $str . "\n";
        };
        
        $mail->setFrom(SMTP_FROM_EMAIL, SMTP_FROM_NAME);
        $mail->addAddress(SMTP_USER);
        $mail->isHTML(true);
        $mail->Subject = 'SMTP Test Port 465 - ' . date('Y-m-d H:i:s');
        $mail->Body = '<h1>SMTP Test</h1><p>Testing with port 465 (SSL)</p>';
        
        $mail->send();
        echo "\n✅ SUCCESS! Email sent via port 465 (SSL)\n";
        echo "If this works, update config.php to use port 465\n";
    } catch (\Exception $e) {
        echo "\n❌ FAILED with port 465\n";
        echo "Error: " . $mail->ErrorInfo . "\n";
        echo "Exception: " . $e->getMessage() . "\n";
    }
} else {
    echo "PHPMailer not available\n";
}

echo "</pre>";

