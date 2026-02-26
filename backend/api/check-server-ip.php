<?php
/**
 * Check Server IP Address
 * 
 * This script helps identify your server's IP address for MSG91 IP whitelisting.
 */

header('Content-Type: text/html; charset=utf-8');

echo "<!DOCTYPE html><html><head><title>Server IP Check</title><style>body{font-family:monospace;max-width:800px;margin:20px auto;padding:20px;background:#f5f5f5;}pre{background:#fff;padding:15px;border:1px solid #ddd;}h1{color:#333;}.important{background:#fff3cd;padding:15px;border:1px solid #ffc107;margin:15px 0;}</style></head><body>";
echo "<h1>Server IP Address Check</h1>";
echo "<div class='important'><strong>⚠️ Important:</strong> Use the <strong>SERVER_ADDR</strong> IP for MSG91 IP whitelisting.</div>";

echo "<h2>IP Addresses:</h2>";
echo "<pre>";

echo "SERVER_ADDR (Server's IP): " . ($_SERVER['SERVER_ADDR'] ?? 'Not available') . "\n";
echo "REMOTE_ADDR (Your IP): " . ($_SERVER['REMOTE_ADDR'] ?? 'Not available') . "\n";
echo "HTTP_X_FORWARDED_FOR: " . ($_SERVER['HTTP_X_FORWARDED_FOR'] ?? 'Not available') . "\n";
echo "HTTP_X_REAL_IP: " . ($_SERVER['HTTP_X_REAL_IP'] ?? 'Not available') . "\n";

echo "\n--- Additional Info ---\n";
echo "Hostname: " . ($_SERVER['SERVER_NAME'] ?? 'Not available') . "\n";
echo "Server Software: " . ($_SERVER['SERVER_SOFTWARE'] ?? 'Not available') . "\n";

// Try to get external IP using a simple method
echo "\n--- External IP Check (for reference) ---\n";
$externalIP = @file_get_contents('https://api.ipify.org');
if ($externalIP) {
    echo "External IP (from ipify.org): " . $externalIP . "\n";
    echo "⚠️ Note: This might differ from your server's outbound IP for API calls\n";
} else {
    echo "Could not fetch external IP\n";
}

echo "</pre>";

echo "<h2>Next Steps:</h2>";
echo "<ol>";
echo "<li>Copy the <strong>SERVER_ADDR</strong> IP address above</li>";
echo "<li>Go to MSG91 Dashboard → Authkey Settings</li>";
echo "<li>Select your authkey: <code>481618A2cCSUpaZHTW6936c356P1</code></li>";
echo "<li>Find <strong>IP Whitelisting</strong> or <strong>Allowed IPs</strong> section</li>";
echo "<li>Add the SERVER_ADDR IP to the whitelist</li>";
echo "<li>Save and wait 2-5 minutes</li>";
echo "<li>Test the welcome email again</li>";
echo "</ol>";

echo "</body></html>";
?>

