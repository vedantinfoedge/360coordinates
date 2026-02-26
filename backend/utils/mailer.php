<?php
/**
 * Email Sending Utility using PHPMailer
 * Handles sending emails via SMTP
 */

// Check if PHPMailer is available via Composer
// Using root vendor folder
$GLOBALS['usePHPMailer'] = false;
$phpmailerPath = __DIR__ . '/../../vendor/autoload.php';
if (file_exists($phpmailerPath)) {
    require_once $phpmailerPath;
    // Check if PHPMailer classes are available
    if (class_exists('PHPMailer\PHPMailer\PHPMailer')) {
        $GLOBALS['usePHPMailer'] = true;
    }
}

/**
 * Send email using SMTP
 * 
 * @param string $to Recipient email address
 * @param string $subject Email subject
 * @param string $body Email body (HTML)
 * @param string $altBody Plain text alternative
 * @return bool True if email sent successfully, false otherwise
 */
function sendEmailViaSMTP($to, $subject, $body, $altBody = '') {
    // Try PHPMailer first if available
    if (isset($GLOBALS['usePHPMailer']) && $GLOBALS['usePHPMailer']) {
        $result = sendEmailWithPHPMailer($to, $subject, $body, $altBody);
        if ($result) {
            return true;
        }
        
        // If port 587 failed, try port 465 (SSL) as fallback
        if (SMTP_PORT == 587) {
            error_log("Port 587 failed, trying port 465 (SSL) as fallback...");
            $result = sendEmailWithPHPMailerPort465($to, $subject, $body, $altBody);
            if ($result) {
                error_log("Port 465 (SSL) worked! Consider updating config.php to use port 465.");
                return true;
            }
        }
        
        return false;
    } else {
        return sendEmailWithNative($to, $subject, $body, $altBody);
    }
}

/**
 * Send email using PHPMailer
 */
function sendEmailWithPHPMailer($to, $subject, $body, $altBody = '') {
    global $phpmailerDebug;
    $phpmailerDebug = '';
    
    // Try LOGIN first, then PLAIN if LOGIN fails
    $authTypes = ['LOGIN', 'PLAIN'];
    
    foreach ($authTypes as $authType) {
        try {
            if (!class_exists('PHPMailer\PHPMailer\PHPMailer')) {
                error_log("PHPMailer class not found, falling back to native mail");
                return sendEmailWithNative($to, $subject, $body, $altBody);
            }
            
            $mail = new \PHPMailer\PHPMailer\PHPMailer(true);
            
            // Server settings
            $mail->isSMTP();
            $mail->Host = SMTP_HOST;
            $mail->SMTPAuth = true;
            $mail->Username = SMTP_USER;
            $mail->Password = SMTP_PASS;
            $mail->SMTPSecure = \PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_STARTTLS;
            $mail->Port = SMTP_PORT;
            $mail->CharSet = 'UTF-8';
            $mail->AuthType = $authType;
            $mail->SMTPDebug = 0; // Disable debug in production
            $mail->SMTPOptions = array(
                'ssl' => array(
                    'verify_peer' => false,
                    'verify_peer_name' => false,
                    'allow_self_signed' => true
                )
            );
            
            // Recipients
            $mail->setFrom(SMTP_FROM_EMAIL, SMTP_FROM_NAME);
            $mail->addAddress($to);
            
            // Content
            $mail->isHTML(true);
            $mail->Subject = $subject;
            $mail->Body = $body;
            $mail->AltBody = $altBody ?: strip_tags($body);
            
            $mail->send();
            error_log("Email sent successfully via PHPMailer (AUTH $authType) to: $to");
            return true;
        } catch (\Exception $e) {
            $errorInfo = isset($mail) ? $mail->ErrorInfo : $e->getMessage();
            error_log("PHPMailer Error with AUTH $authType: " . $errorInfo);
            
            // If this is not the last auth type, continue to next
            if ($authType !== end($authTypes)) {
                error_log("Trying next authentication method...");
                continue;
            }
            
            // Last auth type failed, return false
            error_log("All authentication methods failed");
            return false;
        }
    }
    
    return false;
}

/**
 * Send email using PHPMailer with Port 465 (SSL)
 * Fallback method when port 587 fails
 */
function sendEmailWithPHPMailerPort465($to, $subject, $body, $altBody = '') {
    global $phpmailerDebug;
    $phpmailerDebug = '';
    
    try {
        if (!class_exists('PHPMailer\PHPMailer\PHPMailer')) {
            return false;
        }
        
        $mail = new \PHPMailer\PHPMailer\PHPMailer(true);
        
        // Server settings - Port 465 with SSL
        $mail->isSMTP();
        $mail->Host = SMTP_HOST;
        $mail->SMTPAuth = true;
        $mail->Username = SMTP_USER;
        $mail->Password = SMTP_PASS;
        $mail->SMTPSecure = \PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_SMTPS; // SSL instead of STARTTLS
        $mail->Port = 465;
        $mail->CharSet = 'UTF-8';
        $mail->AuthType = 'LOGIN';
        $mail->SMTPDebug = 0; // Disable debug for fallback
        
        // Recipients
        $mail->setFrom(SMTP_FROM_EMAIL, SMTP_FROM_NAME);
        $mail->addAddress($to);
        
        // Content
        $mail->isHTML(true);
        $mail->Subject = $subject;
        $mail->Body = $body;
        $mail->AltBody = $altBody ?: strip_tags($body);
        
        $mail->send();
        error_log("Email sent successfully via PHPMailer (Port 465 SSL) to: $to");
        return true;
    } catch (\Exception $e) {
        $errorInfo = isset($mail) ? $mail->ErrorInfo : $e->getMessage();
        error_log("PHPMailer Port 465 Error: " . $errorInfo);
        return false;
    }
}

/**
 * Send email using simple SMTP (fallback when PHPMailer not available)
 * This implements basic SMTP functionality without external libraries
 */
function sendEmailWithNative($to, $subject, $body, $altBody = '') {
    try {
        // Try simple SMTP connection
        return sendEmailViaSimpleSMTP($to, $subject, $body, $altBody);
    } catch (Exception $e) {
        error_log("Simple SMTP exception: " . $e->getMessage());
        return false;
    }
}

/**
 * Simple SMTP implementation using stream_socket_client (better TLS support)
 */
function sendEmailViaSimpleSMTP($to, $subject, $body, $altBody = '') {
    $smtpHost = SMTP_HOST;
    $smtpPort = SMTP_PORT;
    $smtpUser = SMTP_USER;
    $smtpPass = SMTP_PASS;
    $fromEmail = SMTP_FROM_EMAIL;
    $fromName = SMTP_FROM_NAME;
    
    // Helper function to read SMTP response (handles multi-line)
    $readResponse = function($socket) {
        $response = '';
        while ($line = fgets($socket, 515)) {
            $response .= $line;
            if (substr($line, 3, 1) == ' ') {
                break; // Last line of multi-line response
            }
        }
        return $response;
    };
    
    // Helper function to send command and get response
    $sendCommand = function($socket, $command, $expectedCode = null) use (&$readResponse) {
        fputs($socket, $command . "\r\n");
        $response = $readResponse($socket);
        if ($expectedCode && substr($response, 0, 3) != $expectedCode) {
            error_log("SMTP Command failed: $command - Response: $response");
            return false;
        }
        return $response;
    };
    
    try {
        // Use stream_socket_client for better TLS support
        $context = stream_context_create([
            'ssl' => [
                'verify_peer' => false,
                'verify_peer_name' => false,
                'allow_self_signed' => true
            ]
        ]);
        
        $socket = @stream_socket_client("tcp://$smtpHost:$smtpPort", $errno, $errstr, 30, STREAM_CLIENT_CONNECT, $context);
        if (!$socket) {
            error_log("SMTP Connection failed to $smtpHost:$smtpPort - Error: $errstr ($errno)");
            error_log("Check: 1) SMTP host/port correct, 2) Firewall not blocking, 3) Internet connection");
            return false;
        }
        
        // Set timeout
        stream_set_timeout($socket, 30);
        
        // Read initial response
        $response = $readResponse($socket);
        if (substr($response, 0, 3) != '220') {
            error_log("SMTP Initial response error: $response");
            fclose($socket);
            return false;
        }
        
        // Get local hostname for EHLO
        $localHost = isset($_SERVER['SERVER_NAME']) ? $_SERVER['SERVER_NAME'] : 'localhost';
        if ($localHost == 'localhost' || empty($localHost)) {
            $localHost = gethostname() ?: 'localhost';
        }
        
        // Send EHLO
        $response = $sendCommand($socket, "EHLO " . $localHost);
        if (!$response) {
            fclose($socket);
            return false;
        }
        
        // Start TLS if port is 587
        if ($smtpPort == 587) {
            $response = $sendCommand($socket, "STARTTLS", '220');
            if (!$response) {
                fclose($socket);
                return false;
            }
            
            // Enable crypto - try different methods
            $cryptoMethods = [];
            if (defined('STREAM_CRYPTO_METHOD_TLS_CLIENT')) {
                $cryptoMethods[] = STREAM_CRYPTO_METHOD_TLS_CLIENT;
            }
            if (defined('STREAM_CRYPTO_METHOD_TLSv1_2_CLIENT')) {
                $cryptoMethods[] = STREAM_CRYPTO_METHOD_TLSv1_2_CLIENT;
            }
            if (defined('STREAM_CRYPTO_METHOD_TLSv1_1_CLIENT')) {
                $cryptoMethods[] = STREAM_CRYPTO_METHOD_TLSv1_1_CLIENT;
            }
            if (empty($cryptoMethods)) {
                $cryptoMethods[] = STREAM_CRYPTO_METHOD_TLSv1_2_CLIENT;
            }
            
            $tlsSuccess = false;
            foreach ($cryptoMethods as $cryptoMethod) {
                if (@stream_socket_enable_crypto($socket, true, $cryptoMethod)) {
                    $tlsSuccess = true;
                    break;
                }
            }
            
            if (!$tlsSuccess) {
                $lastError = error_get_last();
                error_log("TLS encryption failed. Error: " . ($lastError ? $lastError['message'] : 'Unknown'));
                error_log("Tried multiple TLS methods but all failed");
                fclose($socket);
                return false;
            }
            
            // Send EHLO again after TLS
            $response = $sendCommand($socket, "EHLO " . $localHost);
            if (!$response) {
                fclose($socket);
                return false;
            }
        }
        
        // Authenticate
        $response = $sendCommand($socket, "AUTH LOGIN", '334');
        if (!$response) {
            fclose($socket);
            return false;
        }
        
        $response = $sendCommand($socket, base64_encode($smtpUser), '334');
        if (!$response) {
            fclose($socket);
            return false;
        }
        
        $response = $sendCommand($socket, base64_encode($smtpPass), '235');
        if (!$response) {
            error_log("SMTP Authentication failed for user: $smtpUser");
            error_log("Check: 1) Username and password are correct, 2) Account is not locked, 3) SMTP authentication is enabled");
            error_log("Response received: " . ($response ? $response : 'No response'));
            fclose($socket);
            return false;
        }
        
        // Set sender
        $response = $sendCommand($socket, "MAIL FROM: <$fromEmail>", '250');
        if (!$response) {
            fclose($socket);
            return false;
        }
        
        // Set recipient
        $response = $sendCommand($socket, "RCPT TO: <$to>", '250');
        if (!$response) {
            fclose($socket);
            return false;
        }
        
        // Send data
        $response = $sendCommand($socket, "DATA", '354');
        if (!$response) {
            fclose($socket);
            return false;
        }
        
        // Email headers and body
        $emailData = "From: $fromName <$fromEmail>\r\n";
        $emailData .= "To: <$to>\r\n";
        $emailData .= "Subject: $subject\r\n";
        $emailData .= "MIME-Version: 1.0\r\n";
        $emailData .= "Content-Type: text/html; charset=UTF-8\r\n";
        $emailData .= "\r\n";
        $emailData .= $body . "\r\n";
        $emailData .= ".\r\n";
        
        fputs($socket, $emailData);
        $response = $readResponse($socket);
        if (substr($response, 0, 3) != '250') {
            error_log("Email sending failed: $response");
            fclose($socket);
            return false;
        }
        
        // Quit
        fputs($socket, "QUIT\r\n");
        fclose($socket);
        
        error_log("Email sent successfully via simple SMTP to: $to");
        return true;
        
    } catch (Exception $e) {
        error_log("SMTP Exception: " . $e->getMessage());
        if (isset($socket) && is_resource($socket)) {
            fclose($socket);
        }
        return false;
    }
}

/**
 * Generate OTP Email HTML Template
 * 
 * @param string $otp The OTP code
 * @param string $userName Optional user name
 * @return string HTML email content
 */
function generateOTPEmailTemplate($otp, $userName = '') {
    $greeting = $userName ? "Hello $userName," : "Hello,";
    
    $html = '
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Email Verification OTP</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
        <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f4f4f4;">
            <tr>
                <td align="center" style="padding: 40px 20px;">
                    <table role="presentation" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                        <!-- Header -->
                        <tr>
                            <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px 8px 0 0;">
                                <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">IndiaPropertys</h1>
                            </td>
                        </tr>
                        
                        <!-- Content -->
                        <tr>
                            <td style="padding: 40px;">
                                <h2 style="margin: 0 0 20px; color: #333333; font-size: 24px;">Email Verification</h2>
                                <p style="margin: 0 0 20px; color: #666666; font-size: 16px; line-height: 1.6;">
                                    ' . htmlspecialchars($greeting) . '
                                </p>
                                <p style="margin: 0 0 30px; color: #666666; font-size: 16px; line-height: 1.6;">
                                    Thank you for registering with IndiaPropertys! Please use the following OTP to verify your email address:
                                </p>
                                
                                <!-- OTP Box -->
                                <table role="presentation" style="width: 100%; margin: 30px 0;">
                                    <tr>
                                        <td align="center">
                                            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px 40px; border-radius: 8px; display: inline-block;">
                                                <p style="margin: 0; color: #ffffff; font-size: 32px; font-weight: 700; letter-spacing: 8px; font-family: monospace;">
                                                    ' . htmlspecialchars($otp) . '
                                                </p>
                                            </div>
                                        </td>
                                    </tr>
                                </table>
                                
                                <p style="margin: 30px 0 20px; color: #666666; font-size: 14px; line-height: 1.6;">
                                    <strong>Important:</strong> This OTP is valid for ' . OTP_EXPIRATION_MINUTES . ' minutes only. Do not share this OTP with anyone.
                                </p>
                                
                                <p style="margin: 0; color: #999999; font-size: 14px; line-height: 1.6;">
                                    If you did not request this OTP, please ignore this email or contact our support team.
                                </p>
                            </td>
                        </tr>
                        
                        <!-- Footer -->
                        <tr>
                            <td style="padding: 30px 40px; background-color: #f8f9fa; border-radius: 0 0 8px 8px; text-align: center;">
                                <p style="margin: 0 0 10px; color: #999999; font-size: 12px;">
                                    © ' . date('Y') . ' IndiaPropertys. All rights reserved.
                                </p>
                                <p style="margin: 0; color: #999999; font-size: 12px;">
                                    This is an automated email, please do not reply.
                                </p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>';
    
    return $html;
}

