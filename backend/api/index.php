<?php
/**
 * API Root Index
 * Provides API information and health check
 */

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../utils/response.php';

handlePreflight();

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    sendSuccess('IndiaPropertys API', [
        'version' => '1.0.0',
        'status' => 'active',
        'endpoints' => [
            'auth' => [
                'login' => '/api/auth/login.php',
                'register' => '/api/auth/register.php',
                'verify' => '/api/auth/verify.php'
            ],
            'otp' => [
                'send_email' => '/api/otp/send-email.php',
                'verify_email' => '/api/otp/verify-email.php',
                'send_sms' => '/api/otp/send-sms.php',
                'verify_sms' => '/api/otp/verify-sms.php',
                'msg91_send' => '/api/otp/msg91-send.php',
                'msg91_verify' => '/api/otp/msg91-verify.php'
            ],
            'seller' => [
                'properties' => '/api/seller/properties/',
                'inquiries' => '/api/seller/inquiries/',
                'dashboard' => '/api/seller/dashboard/stats.php',
                'profile' => '/api/seller/profile/'
            ],
            'buyer' => [
                'properties' => '/api/buyer/properties/',
                'inquiries' => '/api/buyer/inquiries/send.php',
                'favorites' => '/api/buyer/favorites/'
            ],
            'device_token' => [
                'register' => '/api/device-token/register.php',
                'unregister' => '/api/device-token/unregister.php'
            ]
        ]
    ]);
} else {
    sendError('Method not allowed', null, 405);
}

