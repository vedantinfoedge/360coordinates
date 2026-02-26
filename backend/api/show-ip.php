<?php
// Simple standalone script - no dependencies
// Just shows your server IP

$ip = $_SERVER['SERVER_ADDR'] ?? 'Not available';
?>
<!DOCTYPE html>
<html>
<head>
    <title>Server IP</title>
    <style>
        body { font-family: Arial; padding: 40px; text-align: center; background: #f0f0f0; }
        .container { background: white; padding: 40px; border-radius: 10px; max-width: 600px; margin: 0 auto; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .ip { font-size: 48px; font-weight: bold; color: #1976d2; padding: 30px; background: #e3f2fd; border-radius: 8px; margin: 30px 0; }
        .steps { text-align: left; margin-top: 30px; }
        .steps ol { line-height: 2; }
        code { background: #f5f5f5; padding: 2px 8px; border-radius: 3px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Your Server IP Address</h1>
        <div class="ip"><?php echo htmlspecialchars($ip); ?></div>
        <p><strong>Copy this IP address</strong></p>
        
        <div class="steps">
            <h2>How to Fix Error 418:</h2>
            <ol>
                <li>Go to <a href="https://control.msg91.com" target="_blank">MSG91 Dashboard</a></li>
                <li>Click your <strong>username</strong> (top right) → Select <strong>"Authkey"</strong></li>
                <li>Find authkey: <code>481618A2cCSUpaZHTW6936c356P1</code></li>
                <li>Click <strong>arrow/edit</strong> under "Actions"</li>
                <li>Find <strong>"API Security"</strong> → <strong>"Whitelisted IPs"</strong></li>
                <li>Add IP: <code><?php echo htmlspecialchars($ip); ?></code></li>
                <li><strong>Save</strong> and wait 2-5 minutes</li>
                <li>Test again</li>
            </ol>
        </div>
    </div>
</body>
</html>

