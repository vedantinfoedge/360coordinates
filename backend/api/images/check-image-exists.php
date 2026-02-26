<?php
/**
 * Diagnostic script to check if an image file exists on the server
 * Usage: /backend/api/images/check-image-exists.php?property_id=214&filename=img_1768902030_696f4d8eb3e8d.jpg
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

require_once __DIR__ . '/../../config/config.php';
require_once __DIR__ . '/../../config/moderation.php';

$propertyId = isset($_GET['property_id']) ? intval($_GET['property_id']) : 0;
$filename = isset($_GET['filename']) ? trim($_GET['filename']) : '';

if (!$propertyId || !$filename) {
    echo json_encode([
        'status' => 'error',
        'message' => 'Property ID and filename are required',
        'usage' => '?property_id=214&filename=img_1768902030_696f4d8eb3e8d.jpg'
    ], JSON_PRETTY_PRINT);
    exit;
}

// Build expected file path
$expectedPath = UPLOAD_PROPERTIES_PATH . $propertyId . '/' . $filename;
$expectedUrl = UPLOAD_BASE_URL . '/properties/' . $propertyId . '/' . $filename;

// Check if file exists
$fileExists = file_exists($expectedPath);
$fileReadable = $fileExists ? is_readable($expectedPath) : false;
$fileSize = $fileExists ? filesize($expectedPath) : 0;
$filePermissions = $fileExists ? substr(sprintf('%o', fileperms($expectedPath)), -4) : 'N/A';

// Check directory
$directory = dirname($expectedPath);
$dirExists = is_dir($directory);
$dirReadable = $dirExists ? is_readable($directory) : false;
$dirWritable = $dirExists ? is_writable($directory) : false;

// Check database
$db = null;
$dbRecord = null;
try {
    require_once __DIR__ . '/../../config/database.php';
    $db = getDB();
    $stmt = $db->prepare("
        SELECT image_url, file_path, file_name, relative_path 
        FROM property_images 
        WHERE property_id = ? AND file_name = ?
        ORDER BY id DESC 
        LIMIT 1
    ");
    $stmt->execute([$propertyId, $filename]);
    $dbRecord = $stmt->fetch(PDO::FETCH_ASSOC);
} catch (Exception $e) {
    $dbError = $e->getMessage();
}

// List files in directory
$filesInDir = [];
if ($dirExists) {
    $files = @scandir($directory);
    if ($files) {
        $filesInDir = array_filter($files, function($f) {
            return $f !== '.' && $f !== '..' && !is_dir($directory . '/' . $f);
        });
        $filesInDir = array_values($filesInDir);
    }
}

$result = [
    'status' => $fileExists ? 'found' : 'not_found',
    'property_id' => $propertyId,
    'filename' => $filename,
    'expected_path' => $expectedPath,
    'expected_url' => $expectedUrl,
    'file_exists' => $fileExists,
    'file_readable' => $fileReadable,
    'file_size' => $fileSize,
    'file_permissions' => $filePermissions,
    'directory' => $directory,
    'directory_exists' => $dirExists,
    'directory_readable' => $dirReadable,
    'directory_writable' => $dirWritable,
    'files_in_directory' => $filesInDir,
    'database_record' => $dbRecord,
    'constants' => [
        'UPLOAD_PROPERTIES_PATH' => defined('UPLOAD_PROPERTIES_PATH') ? UPLOAD_PROPERTIES_PATH : 'NOT DEFINED',
        'UPLOAD_BASE_URL' => defined('UPLOAD_BASE_URL') ? UPLOAD_BASE_URL : 'NOT DEFINED'
    ]
];

if (!$fileExists && !empty($filesInDir)) {
    $result['suggestion'] = 'File not found, but other files exist in directory. Check if filename matches.';
}

echo json_encode($result, JSON_PRETTY_PRINT);
