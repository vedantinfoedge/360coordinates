<?php
/**
 * Debug Endpoint for Image Upload Issues
 * This helps identify what's causing the 500 error
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$checks = [];

// Check 1: PHP Version
$checks['php_version'] = [
    'version' => PHP_VERSION,
    'status' => version_compare(PHP_VERSION, '7.4.0', '>=') ? 'ok' : 'error',
    'message' => version_compare(PHP_VERSION, '7.4.0', '>=') ? 'PHP version is OK' : 'PHP version too old (need 7.4+)'
];

// Check 2: cURL Extension
$checks['curl'] = [
    'installed' => function_exists('curl_init'),
    'status' => function_exists('curl_init') ? 'ok' : 'error',
    'message' => function_exists('curl_init') ? 'cURL is installed' : 'cURL is NOT installed'
];

// Check 3: Load config files first (same as moderate-and-upload.php)
try {
    require_once __DIR__ . '/../../config/config.php';
    require_once __DIR__ . '/../../config/database.php';
    require_once __DIR__ . '/../../config/moderation.php';
    $checks['config_loaded'] = [
        'status' => 'ok',
        'message' => 'Config files loaded successfully'
    ];
} catch (Exception $e) {
    $checks['config_loaded'] = [
        'status' => 'error',
        'message' => $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine()
    ];
}

// Check 4: Required Constants (after loading config)
$requiredConstants = ['UPLOAD_TEMP_PATH', 'UPLOAD_PROPERTIES_PATH', 'UPLOAD_BASE_URL', 'MAX_IMAGE_SIZE_BYTES'];
$checks['constants'] = [];
foreach ($requiredConstants as $const) {
    $checks['constants'][$const] = [
        'defined' => defined($const),
        'value' => defined($const) ? constant($const) : 'NOT DEFINED',
        'status' => defined($const) ? 'ok' : 'error'
    ];
}

// Check 5: File Permissions
$checks['permissions'] = [];
try {
    require_once __DIR__ . '/../../config/moderation.php';
    if (defined('UPLOAD_TEMP_PATH')) {
        $tempDir = rtrim(UPLOAD_TEMP_PATH, '/') . '/';
        $checks['permissions']['temp_dir'] = [
            'path' => $tempDir,
            'exists' => is_dir($tempDir),
            'writable' => is_dir($tempDir) ? is_writable($tempDir) : false,
            'status' => (is_dir($tempDir) && is_writable($tempDir)) ? 'ok' : 'error'
        ];
    }
    
    if (defined('UPLOAD_PROPERTIES_PATH')) {
        $propsDir = rtrim(UPLOAD_PROPERTIES_PATH, '/') . '/';
        $checks['permissions']['properties_dir'] = [
            'path' => $propsDir,
            'exists' => is_dir($propsDir),
            'writable' => is_dir($propsDir) ? is_writable($propsDir) : false,
            'status' => (is_dir($propsDir) && is_writable($propsDir)) ? 'ok' : 'error'
        ];
    }
} catch (Exception $e) {
    $checks['permissions']['error'] = $e->getMessage();
}

// Check 6: Required Functions
$requiredFunctions = ['getimagesize', 'file_get_contents', 'move_uploaded_file', 'tempnam'];
$checks['functions'] = [];
foreach ($requiredFunctions as $func) {
    $checks['functions'][$func] = [
        'exists' => function_exists($func),
        'status' => function_exists($func) ? 'ok' : 'error'
    ];
}

// Check 7: Database Connection
$checks['database'] = [];
try {
    require_once __DIR__ . '/../../config/database.php';
    $db = getDB();
    $checks['database']['connection'] = [
        'status' => 'ok',
        'message' => 'Database connection successful'
    ];
} catch (Exception $e) {
    $checks['database']['connection'] = [
        'status' => 'error',
        'message' => $e->getMessage()
    ];
}

// Check 8: File Helper Class
$checks['file_helper'] = [];
try {
    require_once __DIR__ . '/../../helpers/FileHelper.php';
    $checks['file_helper']['class_exists'] = [
        'exists' => class_exists('FileHelper'),
        'status' => class_exists('FileHelper') ? 'ok' : 'error'
    ];
} catch (Exception $e) {
    $checks['file_helper']['error'] = $e->getMessage();
}

// Check 9: Test File Upload Simulation
$checks['upload_simulation'] = [];
try {
    if (defined('UPLOAD_TEMP_PATH')) {
        $testFile = tempnam(sys_get_temp_dir(), 'test_');
        if ($testFile) {
            $checks['upload_simulation']['temp_file'] = [
                'created' => true,
                'path' => $testFile,
                'status' => 'ok'
            ];
            @unlink($testFile);
        } else {
            $checks['upload_simulation']['temp_file'] = [
                'created' => false,
                'status' => 'error',
                'message' => 'Cannot create temp file'
            ];
        }
    }
} catch (Exception $e) {
    $checks['upload_simulation']['error'] = $e->getMessage();
}

// Summary
$allOk = true;
$errors = [];
foreach ($checks as $checkName => $checkData) {
    if (is_array($checkData)) {
        foreach ($checkData as $key => $value) {
            if (isset($value['status']) && $value['status'] === 'error') {
                $allOk = false;
                $errors[] = "$checkName.$key: " . ($value['message'] ?? $value['value'] ?? 'Error');
            }
        }
    }
}

echo json_encode([
    'status' => $allOk ? 'ok' : 'error',
    'summary' => $allOk ? 'All checks passed' : 'Some checks failed',
    'errors' => $errors,
    'checks' => $checks,
    'timestamp' => date('Y-m-d H:i:s')
], JSON_PRETTY_PRINT);
