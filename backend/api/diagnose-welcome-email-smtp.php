<?php
/**
 * Diagnostic Tool for Welcome Email SMTP Issues
 * Shows recent email logs and SMTP connection status
 */

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/database.php';

header('Content-Type: text/html; charset=utf-8');
?>
<!DOCTYPE html>
<html>
<head>
    <title>Welcome Email SMTP Diagnostic</title>
    <style>
        body { font-family: monospace; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; }
        h1 { color: #333; }
        h2 { color: #666; border-bottom: 2px solid #ddd; padding-bottom: 10px; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { padding: 10px; text-align: left; border: 1px solid #ddd; }
        th { background: #f0f0f0; font-weight: bold; }
        .success { color: green; }
        .failed { color: red; }
        .error-box { background: #fee; border: 2px solid #fcc; padding: 15px; margin: 10px 0; border-radius: 5px; }
        .info-box { background: #eef; border: 2px solid #ccf; padding: 15px; margin: 10px 0; border-radius: 5px; }
        pre { background: #f5f5f5; padding: 10px; border: 1px solid #ddd; overflow-x: auto; }
        .config-item { margin: 5px 0; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Welcome Email SMTP Diagnostic Tool</h1>
        
        <h2>1. SMTP Configuration</h2>
        <div class="info-box">
            <div class="config-item"><strong>SMTP Host:</strong> <?php echo defined('MSG91_SMTP_HOST') ? MSG91_SMTP_HOST : 'NOT DEFINED'; ?></div>
            <div class="config-item"><strong>SMTP Port:</strong> <?php echo defined('MSG91_SMTP_PORT') ? MSG91_SMTP_PORT : 'NOT DEFINED'; ?></div>
            <div class="config-item"><strong>SMTP User:</strong> <?php echo defined('MSG91_SMTP_USER') ? MSG91_SMTP_USER : 'NOT DEFINED'; ?></div>
            <div class="config-item"><strong>SMTP Pass:</strong> <?php echo defined('MSG91_SMTP_PASS') ? (substr(MSG91_SMTP_PASS, 0, 3) . '***') : 'NOT DEFINED'; ?></div>
            <div class="config-item"><strong>From Email:</strong> <?php echo defined('MSG91_SMTP_FROM_EMAIL') ? MSG91_SMTP_FROM_EMAIL : 'NOT DEFINED'; ?></div>
            <div class="config-item"><strong>From Name:</strong> <?php echo defined('MSG91_SMTP_FROM_NAME') ? MSG91_SMTP_FROM_NAME : 'NOT DEFINED'; ?></div>
        </div>
        
        <h2>2. PHPMailer Status</h2>
        <div class="info-box">
            <?php
            // Using root vendor folder
            $phpmailerPath = __DIR__ . '/../../vendor/autoload.php';
            if (file_exists($phpmailerPath)) {
                require_once $phpmailerPath;
                if (class_exists('PHPMailer\PHPMailer\PHPMailer')) {
                    echo '<div class="success">✓ PHPMailer is installed and available</div>';
                } else {
                    echo '<div class="failed">✗ PHPMailer autoload found but class not available</div>';
                }
            } else {
                echo '<div class="error-box">✗ PHPMailer not found. Install via: <code>composer require phpmailer/phpmailer</code></div>';
            }
            ?>
        </div>
        
        <h2>3. Recent Email Logs (Last 20)</h2>
        <?php
        try {
            $db = getDB();
            $stmt = $db->query("
                SELECT 
                    el.id,
                    el.user_id,
                    u.email as user_email,
                    u.full_name,
                    el.email_type,
                    el.status,
                    el.error_message,
                    el.msg91_response,
                    el.created_at
                FROM email_logs el
                LEFT JOIN users u ON el.user_id = u.id
                WHERE el.email_type = 'welcome'
                ORDER BY el.created_at DESC
                LIMIT 20
            ");
            $logs = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            if (empty($logs)) {
                echo '<div class="info-box">No email logs found.</div>';
            } else {
                echo '<table>';
                echo '<tr><th>ID</th><th>User ID</th><th>User Email</th><th>Name</th><th>Status</th><th>Error Message</th><th>Response</th><th>Created At</th></tr>';
                foreach ($logs as $log) {
                    $statusClass = ($log['status'] === 'SUCCESS') ? 'success' : 'failed';
                    echo '<tr>';
                    echo '<td>' . htmlspecialchars($log['id']) . '</td>';
                    echo '<td>' . htmlspecialchars($log['user_id']) . '</td>';
                    echo '<td>' . htmlspecialchars($log['user_email'] ?? 'N/A') . '</td>';
                    echo '<td>' . htmlspecialchars($log['full_name'] ?? 'N/A') . '</td>';
                    echo '<td class="' . $statusClass . '">' . htmlspecialchars($log['status']) . '</td>';
                    echo '<td>' . htmlspecialchars($log['error_message'] ?? 'N/A') . '</td>';
                    echo '<td><pre>' . htmlspecialchars(substr($log['msg91_response'] ?? 'N/A', 0, 200)) . '</pre></td>';
                    echo '<td>' . htmlspecialchars($log['created_at']) . '</td>';
                    echo '</tr>';
                }
                echo '</table>';
            }
        } catch (Exception $e) {
            echo '<div class="error-box">Error fetching logs: ' . htmlspecialchars($e->getMessage()) . '</div>';
        }
        ?>
        
        <h2>4. Recent Failed Emails (Last 10)</h2>
        <?php
        try {
            $stmt = $db->query("
                SELECT 
                    el.id,
                    el.user_id,
                    u.email as user_email,
                    u.full_name,
                    el.error_message,
                    el.created_at
                FROM email_logs el
                LEFT JOIN users u ON el.user_id = u.id
                WHERE el.email_type = 'welcome' AND el.status = 'FAILED'
                ORDER BY el.created_at DESC
                LIMIT 10
            ");
            $failedLogs = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            if (empty($failedLogs)) {
                echo '<div class="info-box">No failed emails found.</div>';
            } else {
                echo '<table>';
                echo '<tr><th>ID</th><th>User Email</th><th>Error Message</th><th>Created At</th></tr>';
                foreach ($failedLogs as $log) {
                    echo '<tr>';
                    echo '<td>' . htmlspecialchars($log['id']) . '</td>';
                    echo '<td>' . htmlspecialchars($log['user_email'] ?? 'N/A') . '</td>';
                    echo '<td class="failed">' . htmlspecialchars($log['error_message'] ?? 'No error message') . '</td>';
                    echo '<td>' . htmlspecialchars($log['created_at']) . '</td>';
                    echo '</tr>';
                }
                echo '</table>';
            }
        } catch (Exception $e) {
            echo '<div class="error-box">Error fetching failed logs: ' . htmlspecialchars($e->getMessage()) . '</div>';
        }
        ?>
        
        <h2>5. Test SMTP Connection</h2>
        <div class="info-box">
            <p><strong>Test the SMTP connection:</strong></p>
            <p><a href="test-smtp-msg91.php?email=<?php echo urlencode(isset($_GET['email']) ? $_GET['email'] : 'test@example.com'); ?>" target="_blank">Run SMTP Test</a></p>
            <p>Or use the test script directly: <code>backend/api/test-smtp-msg91.php?email=your-email@example.com</code></p>
        </div>
        
        <h2>6. Common Issues & Solutions</h2>
        <div class="info-box">
            <ul>
                <li><strong>PHPMailer not found:</strong> Run <code>composer require phpmailer/phpmailer</code> in the backend directory</li>
                <li><strong>Authentication failed:</strong> Check SMTP username and password are correct</li>
                <li><strong>Connection timeout:</strong> Check firewall settings and ensure port 587 is open</li>
                <li><strong>SSL/TLS errors:</strong> Verify SMTP server supports STARTTLS on port 587</li>
                <li><strong>Account locked:</strong> Check MSG91 dashboard for account status</li>
            </ul>
        </div>
    </div>
</body>
</html>

