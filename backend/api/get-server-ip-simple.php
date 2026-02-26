<?php
/**
 * Simple Server IP Check
 * 
 * Access: /backend/api/get-server-ip-simple.php
 */

echo "<!DOCTYPE html><html><head><title>Server IP</title><style>body{font-family:Arial;padding:20px;background:#f5f5f5;}h1{color:#333;}.box{background:white;padding:20px;border-radius:5px;margin:20px 0;box-shadow:0 2px 4px rgba(0,0,0,0.1);}.ip{font-size:32px;font-weight:bold;color:#1976d2;text-align:center;padding:20px;background:#e3f2fd;border-radius:5px;margin:10px 0;}</style></head><body>";
echo "<div class='box'><h1>Your Server IP Address</h1>";
echo "<div class='ip'>" . htmlspecialchars($_SERVER['SERVER_ADDR'] ?? 'Not available') . "</div>";
echo "<p><strong>Copy this IP address</strong> and add it to MSG91 IP whitelist.</p>";
echo "<h2>Steps to Fix:</h2>";
echo "<ol>";
echo "<li>Log into <a href='https://control.msg91.com' target='_blank'>MSG91 Dashboard</a></li>";
echo "<li>Go to: <strong>Username → Authkey</strong></li>";
echo "<li>Find your authkey: <code>481618A2cCSUpaZHTW6936c356P1</code></li>";
echo "<li>Click <strong>edit/arrow</strong> under Actions</li>";
echo "<li>Find <strong>API Security → Whitelisted IPs</strong></li>";
echo "<li><strong>Add IP:</strong> <code>" . htmlspecialchars($_SERVER['SERVER_ADDR'] ?? 'Not available') . "</code></li>";
echo "<li><strong>Save</strong> and wait 2-5 minutes</li>";
echo "<li>Test again</li>";
echo "</ol>";
echo "</div></body></html>";
?>

