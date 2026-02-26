<?php
/**
 * Verify MSG91 Email Configuration
 * Shows current configuration values
 */

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/admin-config.php';

header('Content-Type: text/plain; charset=utf-8');

echo "=== MSG91 Email Configuration Verification ===\n\n";

echo "1. AUTH KEY:\n";
echo "   " . (defined('MSG91_EMAIL_AUTH_KEY') ? MSG91_EMAIL_AUTH_KEY : 'NOT DEFINED') . "\n";
echo "   Expected: 481618A2cCSUpaZHTW6936c356P1\n";
echo "   Match: " . (defined('MSG91_EMAIL_AUTH_KEY') && MSG91_EMAIL_AUTH_KEY === '481618A2cCSUpaZHTW6936c356P1' ? '✓ YES' : '✗ NO') . "\n\n";

echo "2. TEMPLATE ID:\n";
echo "   " . (defined('MSG91_WELCOME_TEMPLATE_ID') ? MSG91_WELCOME_TEMPLATE_ID : 'NOT DEFINED') . "\n";
echo "   Expected: welcome_template_34\n";
echo "   Match: " . (defined('MSG91_WELCOME_TEMPLATE_ID') && MSG91_WELCOME_TEMPLATE_ID === 'welcome_template_34' ? '✓ YES' : '✗ NO') . "\n\n";

echo "3. FROM EMAIL:\n";
echo "   " . (defined('MSG91_EMAIL_FROM_EMAIL') ? MSG91_EMAIL_FROM_EMAIL : 'NOT DEFINED') . "\n";
echo "   Expected: noreply@demo1.360coordinates.com\n";
echo "   Match: " . (defined('MSG91_EMAIL_FROM_EMAIL') && MSG91_EMAIL_FROM_EMAIL === 'noreply@demo1.360coordinates.com' ? '✓ YES' : '✗ NO') . "\n\n";

echo "4. EMAIL DOMAIN:\n";
echo "   " . (defined('MSG91_EMAIL_DOMAIN') ? MSG91_EMAIL_DOMAIN : 'NOT DEFINED') . "\n";
echo "   Expected: demo1.360coordinates.com\n";
echo "   Match: " . (defined('MSG91_EMAIL_DOMAIN') && MSG91_EMAIL_DOMAIN === 'demo1.360coordinates.com' ? '✓ YES' : '✗ NO') . "\n\n";

echo "5. FROM NAME:\n";
echo "   " . (defined('MSG91_EMAIL_FROM_NAME') ? MSG91_EMAIL_FROM_NAME : 'NOT DEFINED') . "\n\n";

echo "6. API URL:\n";
echo "   " . (defined('MSG91_EMAIL_SEND_URL') ? MSG91_EMAIL_SEND_URL : 'NOT DEFINED') . "\n\n";

echo "=== Configuration Summary ===\n";
$allCorrect = (
    defined('MSG91_EMAIL_AUTH_KEY') && MSG91_EMAIL_AUTH_KEY === '481618A2cCSUpaZHTW6936c356P1' &&
    defined('MSG91_WELCOME_TEMPLATE_ID') && MSG91_WELCOME_TEMPLATE_ID === 'welcome_template_34' &&
    defined('MSG91_EMAIL_FROM_EMAIL') && MSG91_EMAIL_FROM_EMAIL === 'noreply@demo1.360coordinates.com' &&
    defined('MSG91_EMAIL_DOMAIN') && MSG91_EMAIL_DOMAIN === 'demo1.360coordinates.com'
);

if ($allCorrect) {
    echo "✓ All configuration values are correct!\n";
} else {
    echo "✗ Some configuration values need to be corrected.\n";
}

