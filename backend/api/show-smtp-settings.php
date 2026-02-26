<?php
/**
 * Display Current SMTP Settings
 * Shows all SMTP configuration being used
 */

require_once __DIR__ . '/../config/config.php';

header('Content-Type: text/html; charset=utf-8');
?>
<!DOCTYPE html>
<html>
<head>
    <title>SMTP Settings</title>
    <style>
        body { 
            font-family: 'Courier New', monospace; 
            max-width: 900px; 
            margin: 50px auto; 
            padding: 20px; 
            background: #f5f5f5; 
        }
        .container {
            background: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        h1 { color: #333; border-bottom: 3px solid #007bff; padding-bottom: 10px; }
        h2 { color: #666; margin-top: 30px; }
        .setting-group {
            margin: 20px 0;
            padding: 15px;
            background: #f8f9fa;
            border-left: 4px solid #007bff;
            border-radius: 4px;
        }
        .setting-item {
            margin: 10px 0;
            padding: 8px;
            background: white;
            border-radius: 3px;
        }
        .label {
            font-weight: bold;
            color: #495057;
            display: inline-block;
            width: 200px;
        }
        .value {
            color: #212529;
            font-family: 'Courier New', monospace;
        }
        .masked {
            color: #6c757d;
            font-style: italic;
        }
        .status-ok { color: #28a745; }
        .status-error { color: #dc3545; }
        .info-box {
            background: #e7f3ff;
            border: 1px solid #b8daff;
            padding: 15px;
            border-radius: 4px;
            margin: 20px 0;
        }
        code {
            background: #f4f4f4;
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 0.9em;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>📧 Current SMTP Settings</h1>
        
        <div class="info-box">
            <strong>Note:</strong> These are the SMTP settings currently configured in <code>backend/config/config.php</code>
            and used by the welcome email system.
        </div>

        <h2>MSG91 SMTP Settings (Welcome Emails)</h2>
        <div class="setting-group">
            <div class="setting-item">
                <span class="label">SMTP Host:</span>
                <span class="value"><?php echo defined('MSG91_SMTP_HOST') ? htmlspecialchars(MSG91_SMTP_HOST) : '<span class="status-error">NOT DEFINED</span>'; ?></span>
            </div>
            <div class="setting-item">
                <span class="label">SMTP Port:</span>
                <span class="value"><?php echo defined('MSG91_SMTP_PORT') ? htmlspecialchars(MSG91_SMTP_PORT) : '<span class="status-error">NOT DEFINED</span>'; ?></span>
            </div>
            <div class="setting-item">
                <span class="label">SMTP Username:</span>
                <span class="value"><?php echo defined('MSG91_SMTP_USER') ? htmlspecialchars(MSG91_SMTP_USER) : '<span class="status-error">NOT DEFINED</span>'; ?></span>
            </div>
            <div class="setting-item">
                <span class="label">SMTP Password:</span>
                <span class="value masked">
                    <?php 
                    if (defined('MSG91_SMTP_PASS')) {
                        $pass = MSG91_SMTP_PASS;
                        echo substr($pass, 0, 3) . str_repeat('*', max(0, strlen($pass) - 3)) . ' (' . strlen($pass) . ' chars)';
                    } else {
                        echo '<span class="status-error">NOT DEFINED</span>';
                    }
                    ?>
                </span>
            </div>
            <div class="setting-item">
                <span class="label">From Email:</span>
                <span class="value"><?php echo defined('MSG91_SMTP_FROM_EMAIL') ? htmlspecialchars(MSG91_SMTP_FROM_EMAIL) : '<span class="status-error">NOT DEFINED</span>'; ?></span>
            </div>
            <div class="setting-item">
                <span class="label">From Name:</span>
                <span class="value"><?php echo defined('MSG91_SMTP_FROM_NAME') ? htmlspecialchars(MSG91_SMTP_FROM_NAME) : '<span class="status-error">NOT DEFINED</span>'; ?></span>
            </div>
            <div class="setting-item">
                <span class="label">Encryption:</span>
                <span class="value">STARTTLS (TLS)</span>
            </div>
            <div class="setting-item">
                <span class="label">Authentication:</span>
                <span class="value">SMTP AUTH (LOGIN)</span>
            </div>
        </div>

        <h2>Hostinger SMTP Settings (OTP Emails - Legacy)</h2>
        <div class="setting-group">
            <div class="setting-item">
                <span class="label">SMTP Host:</span>
                <span class="value"><?php echo defined('SMTP_HOST') ? htmlspecialchars(SMTP_HOST) : '<span class="status-error">NOT DEFINED</span>'; ?></span>
            </div>
            <div class="setting-item">
                <span class="label">SMTP Port:</span>
                <span class="value"><?php echo defined('SMTP_PORT') ? htmlspecialchars(SMTP_PORT) : '<span class="status-error">NOT DEFINED</span>'; ?></span>
            </div>
            <div class="setting-item">
                <span class="label">SMTP Username:</span>
                <span class="value"><?php echo defined('SMTP_USER') ? htmlspecialchars(SMTP_USER) : '<span class="status-error">NOT DEFINED</span>'; ?></span>
            </div>
            <div class="setting-item">
                <span class="label">SMTP Password:</span>
                <span class="value masked">
                    <?php 
                    if (defined('SMTP_PASS')) {
                        $pass = SMTP_PASS;
                        echo substr($pass, 0, 3) . str_repeat('*', max(0, strlen($pass) - 3)) . ' (' . strlen($pass) . ' chars)';
                    } else {
                        echo '<span class="status-error">NOT DEFINED</span>';
                    }
                    ?>
                </span>
            </div>
            <div class="setting-item">
                <span class="label">From Email:</span>
                <span class="value"><?php echo defined('SMTP_FROM_EMAIL') ? htmlspecialchars(SMTP_FROM_EMAIL) : '<span class="status-error">NOT DEFINED</span>'; ?></span>
            </div>
            <div class="setting-item">
                <span class="label">From Name:</span>
                <span class="value"><?php echo defined('SMTP_FROM_NAME') ? htmlspecialchars(SMTP_FROM_NAME) : '<span class="status-error">NOT DEFINED</span>'; ?></span>
            </div>
        </div>

        <h2>PHPMailer Configuration</h2>
        <div class="setting-group">
            <div class="setting-item">
                <span class="label">PHPMailer Status:</span>
                <span class="value">
                    <?php
                    $phpmailerPath = __DIR__ . '/../../vendor/autoload.php';
                    if (file_exists($phpmailerPath)) {
                        require_once $phpmailerPath;
                        if (class_exists('PHPMailer\PHPMailer\PHPMailer')) {
                            echo '<span class="status-ok">✓ Installed and Available</span>';
                        } else {
                            echo '<span class="status-error">✗ Autoload exists but class not found</span>';
                        }
                    } else {
                        echo '<span class="status-error">✗ Not Found</span>';
                    }
                    ?>
                </span>
            </div>
            <div class="setting-item">
                <span class="label">Autoload Path:</span>
                <span class="value"><?php echo htmlspecialchars($phpmailerPath); ?></span>
            </div>
        </div>

        <h2>Code Usage</h2>
        <div class="info-box">
            <p><strong>Welcome Emails:</strong> Use MSG91 SMTP settings (defined above)</p>
            <p><strong>Configuration File:</strong> <code>backend/config/config.php</code> (lines ~159-173)</p>
            <p><strong>Email Function:</strong> <code>backend/helpers/email_helper_smtp.php</code></p>
            <p><strong>PHPMailer Settings:</strong></p>
            <pre style="background: #f4f4f4; padding: 10px; border-radius: 4px; overflow-x: auto;">
$mail->isSMTP();
$mail->Host = MSG91_SMTP_HOST;
$mail->SMTPAuth = true;
$mail->Username = MSG91_SMTP_USER;
$mail->Password = MSG91_SMTP_PASS;
$mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
$mail->Port = MSG91_SMTP_PORT;
$mail->CharSet = 'UTF-8';</pre>
        </div>

        <div style="margin-top: 30px; padding: 15px; background: #fff3cd; border: 1px solid #ffc107; border-radius: 4px;">
            <strong>⚠️ Important:</strong> Verify these credentials match your MSG91 dashboard settings.
            If emails are failing, check:
            <ul style="margin: 10px 0;">
                <li>Username and password are correct</li>
                <li>IP whitelisting is configured (if required)</li>
                <li>Account is active and not locked</li>
                <li>Port 587 is not blocked by firewall</li>
            </ul>
        </div>
    </div>
</body>
</html>

