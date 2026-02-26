<?php
/**
 * Welcome Email Helper - MSG91 SMTP Implementation
 * Sends welcome emails using PHPMailer with MSG91 SMTP
 */

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../utils/welcome_email_template.php';

// Check if PHPMailer is available - using root vendor only
// Root vendor: ../../vendor/autoload.php (from backend/helpers/ -> root/vendor/)
$rootVendor = __DIR__ . '/../../vendor/autoload.php'; // Root vendor (production - pushed to git)

$phpmailerLoaded = false;

if (file_exists($rootVendor)) {
    require_once $rootVendor;
    $phpmailerLoaded = true;
    error_log("PHPMailer: Loaded root vendor autoloader from: $rootVendor");
} else {
    error_log("PHPMailer: ERROR - No vendor autoloader found at root vendor path:");
    error_log("  - Root vendor: $rootVendor");
    error_log("  - Please run 'composer install' in the project root directory");
}

// Verify PHPMailer class is actually available after autoloader is loaded
if ($phpmailerLoaded && !class_exists('PHPMailer\PHPMailer\PHPMailer')) {
    error_log("PHPMailer: ERROR - Autoloader found but PHPMailer class not available!");
    error_log("PHPMailer: This means PHPMailer is not installed in vendor directory");
    error_log("PHPMailer: Solution - Run: composer require phpmailer/phpmailer");
    $phpmailerLoaded = false;
}

if ($phpmailerLoaded) {
    error_log("PHPMailer: Successfully loaded and verified class availability");
}

/**
 * Send welcome email using MSG91 SMTP (PHPMailer)
 * 
 * @param int $userId User ID
 * @param string $name User's full name
 * @param string $email User's email address
 * @return bool True if email sent successfully, false otherwise
 */
function sendWelcomeEmailViaSMTP($userId, $name, $email) {
    global $phpmailerLoaded;
    
    // Validate inputs
    if (empty($userId) || !is_numeric($userId)) {
        error_log("sendWelcomeEmailViaSMTP: Invalid user ID provided: " . $userId);
        return false;
    }
    
    if (empty($name) || empty($email)) {
        error_log("sendWelcomeEmailViaSMTP: Missing name or email for user ID: " . $userId);
        return false;
    }
    
    // Validate email format
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        error_log("sendWelcomeEmailViaSMTP: Invalid email format for user ID: " . $userId . ", Email: " . $email);
        return false;
    }
    
    // Check if PHPMailer is available using our verified flag
    if (!$phpmailerLoaded || !class_exists('PHPMailer\PHPMailer\PHPMailer')) {
        error_log("sendWelcomeEmailViaSMTP: PHPMailer not available for user ID: " . $userId);
        error_log("sendWelcomeEmailViaSMTP: Check error log above for autoloader and installation details");
        error_log("sendWelcomeEmailViaSMTP: Install PHPMailer with: composer require phpmailer/phpmailer");
        return false;
    }
    
    try {
        $mail = new \PHPMailer\PHPMailer\PHPMailer(true);
        
        // MSG91 SMTP Server settings
        $mail->isSMTP();
        $mail->Host = MSG91_SMTP_HOST;
        $mail->SMTPAuth = true;
        $mail->Username = MSG91_SMTP_USER;
        $mail->Password = MSG91_SMTP_PASS;
        $mail->SMTPSecure = \PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_STARTTLS;
        $mail->Port = MSG91_SMTP_PORT;
        $mail->CharSet = 'UTF-8';
        $mail->SMTPDebug = 0; // Set to 2 for debugging (logs to error_log)
        $mail->SMTPOptions = array(
            'ssl' => array(
                'verify_peer' => false,
                'verify_peer_name' => false,
                'allow_self_signed' => true
            )
        );
        
        // Recipients
        $mail->setFrom(MSG91_SMTP_FROM_EMAIL, MSG91_SMTP_FROM_NAME);
        $mail->addAddress($email, $name);
        
        // Content
        $mail->isHTML(true);
        $mail->Subject = 'Welcome to India Propertys! 🏡';
        $mail->Body = generateWelcomeEmailTemplate($name, $email);
        $mail->AltBody = generateWelcomeEmailPlainText($name, $email);
        
        // Send email
        $mail->send();
        
        // Log success with details
        error_log("sendWelcomeEmailViaSMTP: ✓ SUCCESS - Welcome email sent successfully to: $email (User ID: $userId)");
        error_log("sendWelcomeEmailViaSMTP: Email details - From: " . MSG91_SMTP_FROM_EMAIL . " (" . MSG91_SMTP_FROM_NAME . "), To: $email, Subject: Welcome to India Propertys! 🏡");
        
        // Update database status
        try {
            $db = getDB();
            if (!$db) {
                error_log("sendWelcomeEmailViaSMTP: Database connection failed for user ID: $userId");
                // Email was sent successfully, so return true even if DB update fails
                return true;
            }
            
            $stmt = $db->prepare("UPDATE users SET email_status = 'SENT', email_sent_at = NOW() WHERE id = ?");
            $stmt->execute([$userId]);
            
            // Log to email_logs (table may not exist in some setups, so catch errors)
            try {
                $stmt = $db->prepare("INSERT INTO email_logs (user_id, email_type, status, msg91_response) VALUES (?, 'welcome', 'SUCCESS', ?)");
                $stmt->execute([$userId, json_encode(['method' => 'SMTP', 'sent_at' => date('Y-m-d H:i:s')])]);
            } catch (Exception $logError) {
                // email_logs table might not exist - log but don't fail
                error_log("sendWelcomeEmailViaSMTP: Failed to log to email_logs table (table may not exist): " . $logError->getMessage());
            }
        } catch (Exception $dbError) {
            error_log("sendWelcomeEmailViaSMTP: Database update error for user ID $userId: " . $dbError->getMessage());
            // Don't fail if DB update fails - email was sent successfully
        }
        
        return true;
        
    } catch (\PHPMailer\PHPMailer\Exception $e) {
        // Email sending failed - capture detailed error
        $errorInfo = isset($mail) ? $mail->ErrorInfo : 'PHPMailer error info not available';
        $exceptionMessage = $e->getMessage();
        $errorMessage = "PHPMailer Error: $errorInfo | Exception: $exceptionMessage";
        
        error_log("sendWelcomeEmailViaSMTP: ✗ FAILED to send welcome email to: $email (User ID: $userId)");
        error_log("sendWelcomeEmailViaSMTP: Error Details - $errorMessage");
        error_log("sendWelcomeEmailViaSMTP: SMTP Host: " . MSG91_SMTP_HOST . ", Port: " . MSG91_SMTP_PORT);
        error_log("sendWelcomeEmailViaSMTP: SMTP User: " . MSG91_SMTP_USER);
        error_log("sendWelcomeEmailViaSMTP: From Email: " . MSG91_SMTP_FROM_EMAIL);
        
        // Additional debugging for common issues
        if (stripos($errorInfo, 'authentication') !== false || stripos($errorInfo, '535') !== false) {
            error_log("sendWelcomeEmailViaSMTP: AUTHENTICATION ERROR - Check SMTP username/password credentials");
        }
        if (stripos($errorInfo, 'connection') !== false || stripos($errorInfo, 'timeout') !== false) {
            error_log("sendWelcomeEmailViaSMTP: CONNECTION ERROR - Check network/firewall settings, port " . MSG91_SMTP_PORT . " must be open");
        }
        if (stripos($errorInfo, 'tls') !== false || stripos($errorInfo, 'ssl') !== false) {
            error_log("sendWelcomeEmailViaSMTP: TLS/SSL ERROR - Check if STARTTLS is supported on port " . MSG91_SMTP_PORT);
        }
        
        // Update database status
        try {
            $db = getDB();
            if ($db) {
                $stmt = $db->prepare("UPDATE users SET email_status = 'FAILED' WHERE id = ?");
                $stmt->execute([$userId]);
                
                // Log to email_logs with full error details (table may not exist)
                try {
                    $stmt = $db->prepare("INSERT INTO email_logs (user_id, email_type, status, error_message) VALUES (?, 'welcome', 'FAILED', ?)");
                    $stmt->execute([$userId, $errorMessage]);
                } catch (Exception $logError) {
                    error_log("sendWelcomeEmailViaSMTP: Failed to log to email_logs table: " . $logError->getMessage());
                }
            }
        } catch (Exception $dbError) {
            error_log("sendWelcomeEmailViaSMTP: Database update error for user ID $userId: " . $dbError->getMessage());
        }
        
        return false;
    } catch (Exception $e) {
        // General exception
        $errorMessage = "Exception: " . $e->getMessage() . " | File: " . $e->getFile() . " | Line: " . $e->getLine();
        error_log("sendWelcomeEmailViaSMTP: Exception - Failed to send welcome email to: $email (User ID: $userId) - " . $errorMessage);
        
        // Update database status
        try {
            $db = getDB();
            if ($db) {
                $stmt = $db->prepare("UPDATE users SET email_status = 'FAILED' WHERE id = ?");
                $stmt->execute([$userId]);
                
                // Log to email_logs (table may not exist)
                try {
                    $stmt = $db->prepare("INSERT INTO email_logs (user_id, email_type, status, error_message) VALUES (?, 'welcome', 'FAILED', ?)");
                    $stmt->execute([$userId, $errorMessage]);
                } catch (Exception $logError) {
                    error_log("sendWelcomeEmailViaSMTP: Failed to log to email_logs table: " . $logError->getMessage());
                }
            }
        } catch (Exception $dbError) {
            error_log("sendWelcomeEmailViaSMTP: Database update error for user ID $userId: " . $dbError->getMessage());
        }
        
        return false;
    }
}