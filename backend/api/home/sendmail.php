<?php
/**
 * Contact Form - Send Mail
 * POST /api/home/sendmail.php
 *
 * Integration:
 * - Config: backend/config/email.php (Gmail SMTP, To/From sneha@vedantinfoedge.com)
 * - Frontend: Contact.jsx calls API_BASE_URL + API_ENDPOINTS.CONTACT_SENDMAIL
 * - CORS: config.php and utils/response.php allow demo1 + main origins
 */

require_once __DIR__ . '/../../config/config.php';
require_once __DIR__ . '/../../config/email.php';
require_once __DIR__ . '/../../utils/response.php';
require_once __DIR__ . '/../../utils/validation.php';

handlePreflight();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendError('Method not allowed', null, 405);
}

$input = json_decode(file_get_contents('php://input'), true);
if (!is_array($input)) {
    sendError('Invalid JSON body', null, 400);
}

$name = isset($input['name']) ? trim($input['name']) : '';
$email = isset($input['email']) ? trim($input['email']) : '';
$phone = isset($input['phone']) ? trim($input['phone']) : '';
$message = isset($input['message']) ? trim($input['message']) : '';

// Validation (same as React form)
if (strlen($name) < 2) {
    sendError('Name must be at least 2 characters', null, 400);
}
if (empty($email)) {
    sendError('Email is required', null, 400);
}
if (!validateEmail($email)) {
    sendError('Please enter a valid email address', null, 400);
}
if (empty($phone)) {
    sendError('Phone number is required', null, 400);
}
$phoneDigits = preg_replace('/\D/', '', $phone);
if (strlen($phoneDigits) < 10) {
    sendError('Please enter a valid phone number', null, 400);
}
if (strlen($message) < 10) {
    sendError('Message must be at least 10 characters', null, 400);
}

$appPassword = defined('CONTACT_EMAIL_APP_PASSWORD') ? CONTACT_EMAIL_APP_PASSWORD : '';
if (empty($appPassword)) {
    error_log('Contact sendmail: CONTACT_EMAIL_APP_PASSWORD is not set.');
    sendError('Email service is not configured. Please try again later.', null, 503);
}

// Try backend/vendor first, then project root vendor
$vendorPaths = [
    __DIR__ . '/../../vendor/autoload.php',   // backend/vendor (composer in backend/)
    __DIR__ . '/../../../vendor/autoload.php', // project root vendor
];
$vendorPath = null;
foreach ($vendorPaths as $path) {
    if (file_exists($path)) {
        $vendorPath = $path;
        break;
    }
}
if (!$vendorPath) {
    error_log('Contact sendmail: No vendor/autoload.php found. Fix: cd backend && composer install');
    sendError('Server configuration error. Please try again later.', null, 503);
}
require_once $vendorPath;

if (!class_exists('PHPMailer\PHPMailer\PHPMailer')) {
    error_log('Contact sendmail: PHPMailer missing. Fix: cd backend && composer require phpmailer/phpmailer');
    sendError('Server configuration error. Please try again later.', null, 503);
}

try {
    $mail = new \PHPMailer\PHPMailer\PHPMailer(true);
    $mail->isSMTP();
    $mail->Host = CONTACT_SMTP_HOST;
    $mail->SMTPAuth = true;
    $mail->Username = CONTACT_EMAIL_FROM;
    $mail->Password = $appPassword;
    $mail->SMTPSecure = \PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_STARTTLS;
    $mail->Port = CONTACT_SMTP_PORT;
    $mail->CharSet = 'UTF-8';
    $mail->SMTPDebug = 0;

    // To and From: sneha@vedantinfoedge.com (all submissions to this address)
    $mail->setFrom(CONTACT_EMAIL_FROM, CONTACT_EMAIL_FROM_NAME);
    $mail->addAddress(CONTACT_EMAIL_TO, CONTACT_EMAIL_FROM_NAME);

    $subject = 'New Contact Form: ' . $name;
    $htmlBody = sprintf(
        "<h3>New Contact Form Submission</h3>\n<p><strong>Name:</strong> %s</p>\n<p><strong>Email:</strong> %s</p>\n<p><strong>Phone:</strong> %s</p>\n<p><strong>Message:</strong></p>\n<p>%s</p>",
        htmlspecialchars($name),
        htmlspecialchars($email),
        htmlspecialchars($phone),
        nl2br(htmlspecialchars($message))
    );
    $altBody = "Name: $name\nEmail: $email\nPhone: $phone\n\nMessage:\n$message";

    $mail->Subject = $subject;
    $mail->Body = $htmlBody;
    $mail->AltBody = $altBody;
    $mail->isHTML(true);

    $mail->send();
    sendSuccess('Email sent successfully!', null, 200);
} catch (\PHPMailer\PHPMailer\Exception $e) {
    error_log('Contact sendmail PHPMailer error: ' . $e->getMessage());
    sendError('Failed to send message. Please try again later.', null, 500);
} catch (\Exception $e) {
    error_log('Contact sendmail error: ' . $e->getMessage());
    sendError('Failed to send message. Please try again later.', null, 500);
}
