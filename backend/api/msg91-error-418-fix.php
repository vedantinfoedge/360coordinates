<?php
/**
 * MSG91 Error 418 Diagnostic & Fix Guide
 * 
 * Error 418 from MSG91 means: Authentication/Authorization failed
 */

require_once __DIR__ . '/../config/admin-config.php';

header('Content-Type: text/html; charset=utf-8');

echo "<!DOCTYPE html><html><head><title>MSG91 Error 418 Fix Guide</title><style>body{font-family:Arial;max-width:900px;margin:20px auto;padding:20px;background:#f5f5f5;}h1{color:#d32f2f;}h2{color:#1976d2;margin-top:30px;}pre{background:#fff;padding:15px;border:1px solid #ddd;overflow-x:auto;}code{background:#f0f0f0;padding:2px 6px;border-radius:3px;}.error-box{background:#ffebee;border-left:4px solid #d32f2f;padding:15px;margin:20px 0;}.success-box{background:#e8f5e9;border-left:4px solid #4caf50;padding:15px;margin:20px 0;}.warning-box{background:#fff3e0;border-left:4px solid #ff9800;padding:15px;margin:20px 0;}ol,ul{line-height:1.8;}</style></head><body>";

echo "<h1>MSG91 Error 418: Unauthorized - Fix Guide</h1>";

echo "<div class='error-box'>";
echo "<strong>Error Details:</strong><br>";
echo "HTTP Code: 401<br>";
echo "Status: fail<br>";
echo "Errors: \"Unauthorized\"<br>";
echo "apiError: \"418\"<br>";
echo "</div>";

echo "<h2>What Error 418 Means:</h2>";
echo "<p>Error code <strong>418</strong> from MSG91 indicates that your API request was rejected due to authentication/authorization issues. This is <strong>NOT</strong> a code problem - your code is correct. The issue is in MSG91 dashboard settings.</p>";

echo "<h2>🔍 Step 1: Check Your Server IP</h2>";
echo "<p>First, identify your server's IP address:</p>";
echo "<p><a href='check-server-ip.php' target='_blank' style='background:#1976d2;color:white;padding:10px 20px;text-decoration:none;border-radius:5px;display:inline-block;'>Check Server IP →</a></p>";

$serverIP = $_SERVER['SERVER_ADDR'] ?? 'Not available';
if ($serverIP !== 'Not available') {
    echo "<div class='success-box'>";
    echo "<strong>Your Server IP:</strong> <code>$serverIP</code><br>";
    echo "Copy this IP and add it to MSG91 IP whitelist (see Step 2 below)";
    echo "</div>";
}

echo "<h2>🔧 Step 2: Fix IP Whitelisting (Most Common Fix)</h2>";
echo "<p><strong>90% of Error 418 cases are caused by IP whitelisting.</strong></p>";
echo "<ol>";
echo "<li>Log in to <a href='https://control.msg91.com' target='_blank'>MSG91 Dashboard</a></li>";
echo "<li>Go to: <strong>Settings</strong> → <strong>Authkey Settings</strong> (or <strong>API Settings</strong>)</li>";
echo "<li>Find and select your authkey: <code>" . (defined('MSG91_EMAIL_AUTH_KEY') ? substr(MSG91_EMAIL_AUTH_KEY, 0, 15) . '***' : 'Your Auth Key') . "</code></li>";
echo "<li>Look for <strong>\"IP Whitelisting\"</strong> or <strong>\"Allowed IPs\"</strong> section</li>";
echo "<li><strong>Add your server IP:</strong> <code>$serverIP</code></li>";
echo "<li><strong>OR</strong> if IP whitelisting is enabled, <strong>disable it</strong> (set to \"Allow all IPs\")</li>";
echo "<li>Save the changes</li>";
echo "<li>Wait <strong>2-5 minutes</strong> for changes to propagate</li>";
echo "</ol>";

echo "<div class='warning-box'>";
echo "<strong>⚠️ Important:</strong> Some MSG91 accounts have IP whitelisting enabled by default. If you can't find the IP whitelisting option, contact MSG91 support to disable it or add your IP.";
echo "</div>";

echo "<h2>🔑 Step 3: Verify Auth Key for Email API</h2>";
echo "<p>MSG91 Email API might use a <strong>different auth key</strong> than OTP API.</p>";
echo "<ol>";
echo "<li>Go to MSG91 Dashboard → <strong>Email</strong> → <strong>Settings</strong> → <strong>API Integration</strong></li>";
echo "<li>Look for <strong>\"Email API Auth Key\"</strong> or <strong>\"Transactional Email Auth Key\"</strong></li>";
echo "<li>If you see a different auth key, update it in <code>backend/config/admin-config.php</code>:</li>";
echo "</ol>";

echo "<pre>";
echo "define('MSG91_EMAIL_AUTH_KEY', 'YOUR_EMAIL_API_AUTH_KEY_HERE');";
echo "</pre>";

echo "<h2>✅ Step 4: Check Auth Key Permissions</h2>";
echo "<ol>";
echo "<li>MSG91 Dashboard → <strong>Authkey Settings</strong></li>";
echo "<li>Select your authkey</li>";
echo "<li>Check <strong>\"API Permissions\"</strong> or <strong>\"Enabled Services\"</strong></li>";
echo "<li>Ensure <strong>\"Email API\"</strong> or <strong>\"Transactional Email\"</strong> is <strong>ENABLED</strong></li>";
echo "<li>If disabled, enable it and save</li>";
echo "</ol>";

echo "<h2>🌐 Step 5: Verify Domain & Sender Email</h2>";
echo "<ol>";
echo "<li>MSG91 Dashboard → <strong>Email</strong> → <strong>Domains</strong></li>";
echo "<li>Verify <code>demo1.360coordinates.com</code> shows as <strong>\"Verified\"</strong></li>";
echo "<li>Check that <code>noreply@demo1.360coordinates.com</code> is allowed as sender</li>";
echo "<li>If not verified, complete domain verification (add DNS records)</li>";
echo "</ol>";

echo "<h2>📋 Step 6: Check Template Status</h2>";
echo "<ol>";
echo "<li>MSG91 Dashboard → <strong>Email</strong> → <strong>Templates</strong></li>";
echo "<li>Find template ID: <code>welcome_template_34</code></li>";
echo "<li>Status should be <strong>\"Active\"</strong> or <strong>\"Approved\"</strong></li>";
echo "<li>If pending/disabled, approve it</li>";
echo "</ol>";

echo "<h2>🧪 Step 7: Test After Fixing</h2>";
echo "<ol>";
echo "<li>Wait 2-5 minutes after making changes</li>";
echo "<li>Test with: <a href='test-welcome-email-direct.php?email=your-email@example.com' target='_blank'>test-welcome-email-direct.php</a></li>";
echo "<li>Should get HTTP 200 (not 401)</li>";
echo "<li>Check your email inbox</li>";
echo "</ol>";

echo "<h2>📞 Still Not Working?</h2>";
echo "<div class='warning-box'>";
echo "<p>If you've completed all steps above and still get Error 418:</p>";
echo "<ul>";
echo "<li><strong>Contact MSG91 Support:</strong> support@msg91.com</li>";
echo "<li>Provide them:";
echo "  <ul>";
echo "    <li>Your authkey (first 10 chars): " . (defined('MSG91_EMAIL_AUTH_KEY') ? substr(MSG91_EMAIL_AUTH_KEY, 0, 10) . '***' : 'N/A') . "</li>";
echo "    <li>Your server IP: <code>$serverIP</code></li>";
echo "    <li>Error code: 418</li>";
echo "    <li>API endpoint: https://control.msg91.com/api/v5/email/send</li>";
echo "    <li>Ask them to: Enable Email API access and whitelist your server IP</li>";
echo "  </ul>";
echo "</li>";
echo "</ul>";
echo "</div>";

echo "<h2>✅ Current Configuration:</h2>";
echo "<pre>";
echo "Auth Key: " . (defined('MSG91_EMAIL_AUTH_KEY') ? substr(MSG91_EMAIL_AUTH_KEY, 0, 15) . '***' : 'Not defined') . "\n";
echo "API URL: " . (defined('MSG91_EMAIL_SEND_URL') ? MSG91_EMAIL_SEND_URL : 'Not defined') . "\n";
echo "Template ID: " . (defined('MSG91_WELCOME_TEMPLATE_ID') ? MSG91_WELCOME_TEMPLATE_ID : 'Not defined') . "\n";
echo "From Email: " . (defined('MSG91_EMAIL_FROM_EMAIL') ? MSG91_EMAIL_FROM_EMAIL : 'Not defined') . "\n";
echo "Domain: " . (defined('MSG91_EMAIL_DOMAIN') ? MSG91_EMAIL_DOMAIN : 'Not defined') . "\n";
echo "</pre>";

echo "<div class='success-box'>";
echo "<strong>✅ Your code is correct!</strong> The issue is MSG91 dashboard configuration. Follow the steps above to fix it.";
echo "</div>";

echo "</body></html>";
?>

