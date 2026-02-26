<?php
/**
 * Contact Form Email Configuration
 * Gmail / Google Workspace SMTP for contact form submissions.
 * Recipient and From/Login: sneha@vedantinfoedge.com
 * App password: set via environment variable CONTACT_EMAIL_APP_PASSWORD.
 */

if (!defined('CONTACT_EMAIL_CONFIG_LOADED')) {
    define('CONTACT_EMAIL_CONFIG_LOADED', true);
}

// SMTP: Gmail / Google Workspace
define('CONTACT_SMTP_HOST', getenv('CONTACT_SMTP_HOST') ?: 'smtp.gmail.com');
define('CONTACT_SMTP_PORT', (int)(getenv('CONTACT_SMTP_PORT') ?: 587));
define('CONTACT_SMTP_ENCRYPTION', 'tls'); // TLS

// From / Login (same address for sending and receiving)
define('CONTACT_EMAIL_FROM', getenv('CONTACT_EMAIL_FROM') ?: 'sneha@vedantinfoedge.com');
define('CONTACT_EMAIL_FROM_NAME', getenv('CONTACT_EMAIL_FROM_NAME') ?: 'Contact Form');

// Recipient: all contact form submissions go here
define('CONTACT_EMAIL_TO', getenv('CONTACT_EMAIL_TO') ?: 'sneha@vedantinfoedge.com');

// App password (env var overrides; fallback for local/dev)
$contactAppPassword = getenv('CONTACT_EMAIL_APP_PASSWORD');
if ($contactAppPassword === false || $contactAppPassword === '') {
    $contactAppPassword = 'wqtsijsqwaihqfoc'; // Gmail app password for sneha@vedantinfoedge.com
}
define('CONTACT_EMAIL_APP_PASSWORD', $contactAppPassword);
