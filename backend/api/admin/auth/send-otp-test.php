<?php
/**
 * Test endpoint to debug send-otp.php issues
 */

header('Access-Control-Allow-Origin: http://localhost:3000');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$errors = [];

// Test 1: Check if files exist
$files = [
    'config.php' => __DIR__ . '/../../../../config/config.php',
    'database.php' => __DIR__ . '/../../../../config/database.php',
    'admin-config.php' => __DIR__ . '/../../../../config/admin-config.php',
    'response.php' => __DIR__ . '/../../../../utils/response.php'
];

foreach ($files as $name => $path) {
    if (!file_exists($path)) {
        $errors[] = "File not found: $name ($path)";
    }
}

// Test 2: Try to load files
if (empty($errors)) {
    try {
        require_once __DIR__ . '/../../../../config/config.php';
        $errors[] = "config.php loaded";
    } catch (Exception $e) {
        $errors[] = "Error loading config.php: " . $e->getMessage();
    }
    
    try {
        require_once __DIR__ . '/../../../../config/database.php';
        $errors[] = "database.php loaded";
    } catch (Exception $e) {
        $errors[] = "Error loading database.php: " . $e->getMessage();
    }
    
    try {
        require_once __DIR__ . '/../../../../config/admin-config.php';
        $errors[] = "admin-config.php loaded";
    } catch (Exception $e) {
        $errors[] = "Error loading admin-config.php: " . $e->getMessage();
    }
    
    try {
        require_once __DIR__ . '/../../../../utils/response.php';
        $errors[] = "response.php loaded";
    } catch (Exception $e) {
        $errors[] = "Error loading response.php: " . $e->getMessage();
    }
}

// Test 3: Check constants
$constants = ['ADMIN_MOBILE', 'MSG91_AUTH_KEY', 'MSG91_TEMPLATE_ID', 'MSG91_SEND_OTP_URL'];
foreach ($constants as $const) {
    if (defined($const)) {
        $errors[] = "$const is defined: " . (strlen(constant($const)) > 0 ? 'YES' : 'NO');
    } else {
        $errors[] = "$const is NOT defined";
    }
}

// Test 4: Check functions
$functions = ['getDB', 'sendError', 'sendSuccess', 'setCorsHeaders'];
foreach ($functions as $func) {
    if (function_exists($func)) {
        $errors[] = "$func function exists";
    } else {
        $errors[] = "$func function does NOT exist";
    }
}

echo json_encode([
    'success' => true,
    'message' => 'Test results',
    'data' => $errors
]);
