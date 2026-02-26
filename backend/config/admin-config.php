<?php
/**
 * Admin Panel Configuration
 * MSG91 Configuration and Admin Mobile Number
 * SECURITY: Admin mobile number is hardcoded here and NEVER exposed to frontend
 */

// MSG91 Widget Configuration
// SECURITY: Use environment variables for all MSG91 credentials
define('MSG91_WIDGET_ID', getenv('MSG91_WIDGET_ID') ?: '356c786a314c303532313736');
$msg91AuthToken = getenv('MSG91_AUTH_TOKEN') ?: '481618TheXzNLL2u694bc65aP1';
if ($msg91AuthToken === '481618TheXzNLL2u694bc65aP1' && defined('ENVIRONMENT') && ENVIRONMENT === 'production') {
    error_log('SECURITY WARNING: Using default MSG91_AUTH_TOKEN in production!');
}
define('MSG91_AUTH_TOKEN', $msg91AuthToken);

// MSG91 API Credentials (for server-side verification)
// SECURITY: These should be set via environment variables
$msg91AuthKey = getenv('MSG91_AUTH_KEY') ?: '481618A2cCSUpaZHTW6936c356P1';
if ($msg91AuthKey === '481618A2cCSUpaZHTW6936c356P1' && defined('ENVIRONMENT') && ENVIRONMENT === 'production') {
    error_log('SECURITY WARNING: Using default MSG91_AUTH_KEY in production!');
}
define('MSG91_AUTH_KEY', $msg91AuthKey);
define('MSG91_TEMPLATE_ID', getenv('MSG91_TEMPLATE_ID') ?: '356c6c6c4141303836323334');
$msg91Token = getenv('MSG91_TOKEN') ?: '481618TheXzNLL2u694bc65aP1';
if ($msg91Token === '481618TheXzNLL2u694bc65aP1' && defined('ENVIRONMENT') && ENVIRONMENT === 'production') {
    error_log('SECURITY WARNING: Using default MSG91_TOKEN in production!');
}
define('MSG91_TOKEN', $msg91Token);

// MSG91 API Endpoints
define('MSG91_SEND_OTP_URL', 'https://control.msg91.com/api/v5/otp');
define('MSG91_VERIFY_OTP_URL', 'https://control.msg91.com/api/v5/otp/verify');
define('MSG91_RESEND_OTP_URL', 'https://control.msg91.com/api/v5/otp/retry');

// MSG91 Email API Configuration (Transactional Emails)
// SECURITY: Use environment variables for sensitive credentials
$msg91EmailAuthKey = getenv('MSG91_EMAIL_AUTH_KEY') ?: '481618A2cCSUpaZHTW6936c356P1';
if ($msg91EmailAuthKey === '481618A2cCSUpaZHTW6936c356P1' && defined('ENVIRONMENT') && ENVIRONMENT === 'production') {
    error_log('SECURITY WARNING: Using default MSG91_EMAIL_AUTH_KEY in production!');
}
define('MSG91_EMAIL_AUTH_KEY', $msg91EmailAuthKey);
define('MSG91_EMAIL_SEND_URL', 'https://control.msg91.com/api/v5/email/send');
define('MSG91_WELCOME_TEMPLATE_ID', getenv('MSG91_WELCOME_TEMPLATE_ID') ?: 'welcome_template_34');
define('MSG91_EMAIL_FROM_EMAIL', getenv('MSG91_EMAIL_FROM_EMAIL') ?: 'noreply@demo1.360coordinates.com');
define('MSG91_EMAIL_FROM_NAME', getenv('MSG91_EMAIL_FROM_NAME') ?: 'IndiaPropertys Team');
define('MSG91_EMAIL_DOMAIN', getenv('MSG91_EMAIL_DOMAIN') ?: 'demo1.360coordinates.com');

// ADMIN WHITELIST - ONLY these numbers can access admin panel
// NEVER expose these to frontend
// SECURITY: Use environment variables for admin mobile numbers
// Format: +917888076881 (with + and country code)
$adminMobile1 = getenv('ADMIN_MOBILE_1') ?: '+917888076881';
$adminMobile2 = getenv('ADMIN_MOBILE_2') ?: '';
define('ADMIN_MOBILE_1', $adminMobile1);
define('ADMIN_MOBILE_2', $adminMobile2);

// Get all whitelisted admin mobiles
if (!function_exists('getAdminWhitelist')) {
function getAdminWhitelist() {
    $whitelist = [];
    if (defined('ADMIN_MOBILE_1') && !empty(ADMIN_MOBILE_1)) {
        $whitelist[] = ADMIN_MOBILE_1;
    }
    if (defined('ADMIN_MOBILE_2') && !empty(ADMIN_MOBILE_2)) {
        $whitelist[] = ADMIN_MOBILE_2;
    }
    return $whitelist;
}
}

// Normalize mobile number for comparison (remove +, spaces, etc.)
if (!function_exists('normalizeMobile')) {
function normalizeMobile($mobile) {
    if (empty($mobile)) {
        return '';
    }
    return preg_replace('/[^0-9]/', '', $mobile);
}
}

// Check if mobile is whitelisted (from database table)
if (!function_exists('isWhitelistedMobile')) {
function isWhitelistedMobile($mobile) {
    try {
        if (empty($mobile)) {
            error_log("isWhitelistedMobile: Empty mobile number provided");
            return false;
        }
        
        $db = getDB();
        $normalized = normalizeMobile($mobile); // Gets digits only: 917888076881
        
        if (empty($normalized)) {
            error_log("isWhitelistedMobile: Could not normalize mobile: " . $mobile);
            return false;
        }
        
        // Database stores phone as +917888076881 (with +), try both formats
        $phoneFormats = [
            '+' . $normalized,  // +917888076881 (preferred format)
            $normalized,        // 917888076881 (digits only)
        ];
        
        error_log("Checking whitelist for mobile: " . $mobile . " (normalized: " . $normalized . ")");
        
        foreach ($phoneFormats as $phoneFormat) {
            try {
                // Query admin_whitelist table (column name is "phone")
                $stmt = $db->prepare("SELECT COUNT(*) FROM admin_whitelist WHERE phone = ? AND is_active = 1");
                $stmt->execute([$phoneFormat]);
                $count = $stmt->fetchColumn();
                
                if ($count > 0) {
                    error_log("Mobile found in whitelist with format: " . $phoneFormat);
                    return true;
                }
            } catch (PDOException $e) {
                error_log("Error querying whitelist with format '" . $phoneFormat . "': " . $e->getMessage());
                // Continue to next format
            }
        }
        
        // Fallback to hardcoded list if table doesn't exist or is empty
        error_log("Mobile not found in database whitelist, checking hardcoded fallback");
        $whitelist = getAdminWhitelist();
        foreach ($whitelist as $whitelisted) {
            if (normalizeMobile($whitelisted) === $normalized) {
                error_log("Mobile found in hardcoded whitelist");
                return true;
            }
        }
        
        error_log("Mobile NOT in whitelist - Access denied");
        return false;
        
    } catch (PDOException $e) {
        error_log("isWhitelistedMobile PDO error: " . $e->getMessage());
        // Fallback to hardcoded whitelist on error
        try {
            $whitelist = getAdminWhitelist();
            $normalized = normalizeMobile($mobile);
            foreach ($whitelist as $whitelisted) {
                if (normalizeMobile($whitelisted) === $normalized) {
                    return true;
                }
            }
        } catch (Exception $e2) {
            error_log("isWhitelistedMobile fallback error: " . $e2->getMessage());
        }
        return false;
    } catch (Exception $e) {
        error_log("isWhitelistedMobile error: " . $e->getMessage());
        error_log("Stack trace: " . $e->getTraceAsString());
        // Fallback to hardcoded whitelist on error
        try {
            $whitelist = getAdminWhitelist();
            $normalized = normalizeMobile($mobile);
            foreach ($whitelist as $whitelisted) {
                if (normalizeMobile($whitelisted) === $normalized) {
                    return true;
                }
            }
        } catch (Exception $e2) {
            error_log("isWhitelistedMobile fallback error: " . $e2->getMessage());
        }
        return false;
    } catch (Error $e) {
        error_log("isWhitelistedMobile fatal error: " . $e->getMessage());
        error_log("Stack trace: " . $e->getTraceAsString());
        // Fallback to hardcoded whitelist on fatal error
        try {
            $whitelist = getAdminWhitelist();
            $normalized = normalizeMobile($mobile);
            foreach ($whitelist as $whitelisted) {
                if (normalizeMobile($whitelisted) === $normalized) {
                    return true;
                }
            }
        } catch (Exception $e2) {
            error_log("isWhitelistedMobile fallback error: " . $e2->getMessage());
        }
        return false;
    }
}
}

// Session Configuration
// SECURITY: Use environment variable for session secret
$sessionSecret = getenv('ADMIN_SESSION_SECRET') ?: 'change-this-to-strong-random-secret-in-production-2024';
if ($sessionSecret === 'change-this-to-strong-random-secret-in-production-2024' && defined('ENVIRONMENT') && ENVIRONMENT === 'production') {
    error_log('SECURITY WARNING: Using default ADMIN_SESSION_SECRET in production!');
}
define('ADMIN_SESSION_SECRET', $sessionSecret);
define('SESSION_EXPIRY', (int)(getenv('SESSION_EXPIRY') ?: 3600000)); // 1 hour in milliseconds

// OTP Configuration
define('OTP_EXPIRY_MINUTES', 10);
define('OTP_LENGTH', 6);
define('OTP_MAX_ATTEMPTS', (int)(getenv('OTP_MAX_ATTEMPTS') ?: 3));
define('OTP_RESEND_LIMIT', (int)(getenv('OTP_RESEND_LIMIT') ?: 3));
define('OTP_RESEND_COOLDOWN_SECONDS', (int)(getenv('OTP_RESEND_COOLDOWN_SECONDS') ?: 60));

// Rate Limiting Configuration
define('RATE_LIMIT_VALIDATE_ATTEMPTS', 5); // 5 attempts per IP per hour
define('RATE_LIMIT_VALIDATE_WINDOW', 3600); // 1 hour in seconds
define('RATE_LIMIT_OTP_SEND_WINDOW', 600); // 10 minutes in seconds
define('RATE_LIMIT_OTP_VERIFY_ATTEMPTS', 3); // 3 attempts per session
