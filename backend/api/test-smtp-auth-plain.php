<?php
/**
 * Test SMTP with AUTH PLAIN instead of AUTH LOGIN
 * Some servers prefer PLAIN authentication
 */

require_once __DIR__ . '/../config/config.php';

header('Content-Type: text/html; charset=utf-8');

if (!class_exists('PHPMailer\PHPMailer\PHPMailer')) {
    die("PHPMailer not installed");
}

echo "<h1>SMTP Test - AUTH PLAIN</h1>";
echo "<pre>";

try {
    $mail = new \PHPMailer\PHPMailer\PHPMailer(true);
    
    $mail->isSMTP();
    $mail->Host = SMTP_HOST;
    $mail->SMTPAuth = true;
    $mail->Username = SMTP_USER;
    $mail->Password = SMTP_PASS;
    $mail->SMTPSecure = \PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_STARTTLS;
    $mail->Port = SMTP_PORT;
    $mail->CharSet = 'UTF-8';
    $mail->SMTPDebug = 2;
    
    // Try AUTH PLAIN
    $mail->AuthType = 'PLAIN';
    
    $debugOutput = '';
    $mail->Debugoutput = function($str, $level) use (&$debugOutput) {
        $debugOutput .= $str . "\n";
        echo htmlspecialchars($str) . "\n";
    };
    
    $mail->setFrom(SMTP_FROM_EMAIL, SMTP_FROM_NAME);
    $mail->addAddress(SMTP_USER);
    $mail->isHTML(true);
    $mail->Subject = 'SMTP Test AUTH PLAIN - ' . date('Y-m-d H:i:s');
    $mail->Body = '<h1>SMTP Test</h1><p>Testing with AUTH PLAIN</p>';
    
    $mail->send();
    echo "\n✅ SUCCESS! Email sent with AUTH PLAIN\n";
} catch (\Exception $e) {
    echo "\n❌ FAILED with AUTH PLAIN\n";
    echo "Error: " . $mail->ErrorInfo . "\n";
    echo "Exception: " . $e->getMessage() . "\n";
}

echo "</pre>";

