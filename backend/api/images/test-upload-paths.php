<?php
/**
 * Upload Path Configuration Test Script
 * Tests all path configurations and file operations
 * 
 * Usage: Access via browser or CLI
 * URL: https://360coordinates.com/backend/api/images/test-upload-paths.php
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

require_once __DIR__ . '/../../config/config.php';
require_once __DIR__ . '/../../config/moderation.php';
require_once __DIR__ . '/../../helpers/FileHelper.php';

$results = [
    'timestamp' => date('Y-m-d H:i:s'),
    'environment' => defined('ENVIRONMENT') ? ENVIRONMENT : 'unknown',
    'tests' => []
];

// Test 1: Check if constants are defined
$results['tests']['constants_defined'] = [
    'UPLOAD_DIR' => defined('UPLOAD_DIR'),
    'UPLOAD_TEMP_PATH' => defined('UPLOAD_TEMP_PATH'),
    'UPLOAD_PROPERTIES_PATH' => defined('UPLOAD_PROPERTIES_PATH'),
    'UPLOAD_BASE_URL' => defined('UPLOAD_BASE_URL'),
    'BASE_URL' => defined('BASE_URL'),
];

// Test 2: Get actual path values
$results['tests']['path_values'] = [
    'UPLOAD_DIR' => defined('UPLOAD_DIR') ? UPLOAD_DIR : 'NOT DEFINED',
    'UPLOAD_TEMP_PATH' => defined('UPLOAD_TEMP_PATH') ? UPLOAD_TEMP_PATH : 'NOT DEFINED',
    'UPLOAD_PROPERTIES_PATH' => defined('UPLOAD_PROPERTIES_PATH') ? UPLOAD_PROPERTIES_PATH : 'NOT DEFINED',
    'UPLOAD_BASE_URL' => defined('UPLOAD_BASE_URL') ? UPLOAD_BASE_URL : 'NOT DEFINED',
    'BASE_URL' => defined('BASE_URL') ? BASE_URL : 'NOT DEFINED',
];

// Test 3: Check directory existence
$results['tests']['directory_existence'] = [];
if (defined('UPLOAD_DIR')) {
    $results['tests']['directory_existence']['UPLOAD_DIR'] = [
        'exists' => is_dir(UPLOAD_DIR),
        'writable' => is_writable(UPLOAD_DIR),
        'readable' => is_readable(UPLOAD_DIR),
        'permissions' => is_dir(UPLOAD_DIR) ? substr(sprintf('%o', fileperms(UPLOAD_DIR)), -4) : 'N/A',
    ];
}
if (defined('UPLOAD_TEMP_PATH')) {
    $results['tests']['directory_existence']['UPLOAD_TEMP_PATH'] = [
        'exists' => is_dir(UPLOAD_TEMP_PATH),
        'writable' => is_writable(UPLOAD_TEMP_PATH),
        'readable' => is_readable(UPLOAD_TEMP_PATH),
        'permissions' => is_dir(UPLOAD_TEMP_PATH) ? substr(sprintf('%o', fileperms(UPLOAD_TEMP_PATH)), -4) : 'N/A',
    ];
}
if (defined('UPLOAD_PROPERTIES_PATH')) {
    $results['tests']['directory_existence']['UPLOAD_PROPERTIES_PATH'] = [
        'exists' => is_dir(UPLOAD_PROPERTIES_PATH),
        'writable' => is_writable(UPLOAD_PROPERTIES_PATH),
        'readable' => is_readable(UPLOAD_PROPERTIES_PATH),
        'permissions' => is_dir(UPLOAD_PROPERTIES_PATH) ? substr(sprintf('%o', fileperms(UPLOAD_PROPERTIES_PATH)), -4) : 'N/A',
    ];
}

// Test 4: Test directory creation
$results['tests']['directory_creation'] = [];
$testDirs = [
    'UPLOAD_DIR' => defined('UPLOAD_DIR') ? UPLOAD_DIR : null,
    'UPLOAD_TEMP_PATH' => defined('UPLOAD_TEMP_PATH') ? UPLOAD_TEMP_PATH : null,
    'UPLOAD_PROPERTIES_PATH' => defined('UPLOAD_PROPERTIES_PATH') ? UPLOAD_PROPERTIES_PATH : null,
];

foreach ($testDirs as $name => $path) {
    if ($path) {
        $created = FileHelper::createDirectory($path);
        $results['tests']['directory_creation'][$name] = [
            'path' => $path,
            'created' => $created,
            'exists_after' => is_dir($path),
            'writable_after' => is_writable($path),
        ];
    }
}

// Test 5: Test file operations
$results['tests']['file_operations'] = [];
if (defined('UPLOAD_TEMP_PATH') && is_writable(UPLOAD_TEMP_PATH)) {
    $testFileName = 'test_' . time() . '_' . uniqid() . '.txt';
    $testFilePath = UPLOAD_TEMP_PATH . $testFileName;
    $testContent = 'This is a test file created at ' . date('Y-m-d H:i:s');
    
    // Test write
    $writeResult = @file_put_contents($testFilePath, $testContent);
    $results['tests']['file_operations']['write_test'] = [
        'file_path' => $testFilePath,
        'success' => $writeResult !== false,
        'bytes_written' => $writeResult,
        'file_exists' => file_exists($testFilePath),
    ];
    
    // Test read
    if (file_exists($testFilePath)) {
        $readContent = @file_get_contents($testFilePath);
        $results['tests']['file_operations']['read_test'] = [
            'success' => $readContent !== false,
            'content_matches' => $readContent === $testContent,
            'file_size' => filesize($testFilePath),
        ];
        
        // Test delete
        $deleteResult = FileHelper::deleteFile($testFilePath);
        $results['tests']['file_operations']['delete_test'] = [
            'success' => $deleteResult,
            'file_exists_after' => file_exists($testFilePath),
        ];
    }
}

// Test 6: Test path resolution (dirname calculation)
$results['tests']['path_resolution'] = [
    '__DIR__' => __DIR__,
    'dirname(__DIR__)' => dirname(__DIR__),
    'dirname(__DIR__, 2)' => dirname(__DIR__, 2),
    'expected_base' => dirname(__DIR__, 2) . '/uploads/',
    'DOCUMENT_ROOT' => $_SERVER['DOCUMENT_ROOT'] ?? 'NOT SET',
    'HTTP_HOST' => $_SERVER['HTTP_HOST'] ?? 'NOT SET',
    'SCRIPT_FILENAME' => $_SERVER['SCRIPT_FILENAME'] ?? 'NOT SET',
];

// Test 7: Test URL generation
$results['tests']['url_generation'] = [];
if (defined('UPLOAD_BASE_URL') && defined('UPLOAD_PROPERTIES_PATH')) {
    $testPropertyId = 999;
    $testFilename = 'test_image.jpg';
    $relativePath = 'properties/' . $testPropertyId . '/' . $testFilename;
    $expectedUrl = UPLOAD_BASE_URL . '/' . $relativePath;
    
    $results['tests']['url_generation'] = [
        'relative_path' => $relativePath,
        'expected_url' => $expectedUrl,
        'base_url' => UPLOAD_BASE_URL,
        'full_url_example' => $expectedUrl,
    ];
}

// Test 8: Test FileHelper methods
$results['tests']['filehelper_methods'] = [];
$testOriginalFilename = 'test image file.jpg';
$uniqueFilename = FileHelper::generateUniqueFilename($testOriginalFilename);
$results['tests']['filehelper_methods']['generateUniqueFilename'] = [
    'input' => $testOriginalFilename,
    'output' => $uniqueFilename,
    'valid' => !empty($uniqueFilename) && strpos($uniqueFilename, '.jpg') !== false,
];

// Test 9: Check for path conflicts
$results['tests']['path_conflicts'] = [];
if (defined('UPLOAD_DIR') && defined('UPLOAD_PROPERTIES_PATH')) {
    $uploadDirProperties = UPLOAD_DIR . 'properties/';
    $results['tests']['path_conflicts'] = [
        'UPLOAD_DIR . properties/' => $uploadDirProperties,
        'UPLOAD_PROPERTIES_PATH' => UPLOAD_PROPERTIES_PATH,
        'paths_match' => rtrim($uploadDirProperties, '/') === rtrim(UPLOAD_PROPERTIES_PATH, '/'),
    ];
}

// Test 10: Environment-specific checks
$results['tests']['environment_checks'] = [
    'is_localhost' => (
        $_SERVER['HTTP_HOST'] === 'localhost' ||
        strpos($_SERVER['HTTP_HOST'], 'localhost:') === 0 ||
        strpos($_SERVER['HTTP_HOST'], '127.0.0.1') === 0 ||
        strpos($_SERVER['HTTP_HOST'], '127.0.0.1:') === 0
    ),
    'protocol' => (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http',
    'host' => $_SERVER['HTTP_HOST'] ?? 'unknown',
];

// Summary
$allTestsPassed = true;
$criticalIssues = [];

// Check critical issues
if (!defined('UPLOAD_PROPERTIES_PATH')) {
    $allTestsPassed = false;
    $criticalIssues[] = 'UPLOAD_PROPERTIES_PATH is not defined';
}

if (defined('UPLOAD_PROPERTIES_PATH') && !is_dir(UPLOAD_PROPERTIES_PATH)) {
    $allTestsPassed = false;
    $criticalIssues[] = 'UPLOAD_PROPERTIES_PATH directory does not exist: ' . UPLOAD_PROPERTIES_PATH;
}

if (defined('UPLOAD_PROPERTIES_PATH') && is_dir(UPLOAD_PROPERTIES_PATH) && !is_writable(UPLOAD_PROPERTIES_PATH)) {
    $allTestsPassed = false;
    $criticalIssues[] = 'UPLOAD_PROPERTIES_PATH directory is not writable: ' . UPLOAD_PROPERTIES_PATH;
}

if (!defined('UPLOAD_BASE_URL')) {
    $allTestsPassed = false;
    $criticalIssues[] = 'UPLOAD_BASE_URL is not defined';
}

$results['summary'] = [
    'all_tests_passed' => $allTestsPassed,
    'critical_issues' => $criticalIssues,
    'status' => $allTestsPassed ? 'PASS' : 'FAIL',
];

// Output results
echo json_encode($results, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);

