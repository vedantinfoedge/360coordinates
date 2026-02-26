<?php
/**
 * Test script for 360coordinates watermark.
 *
 * Usage:
 *   Browser:  https://your-domain/backend/test-watermark.php
 *   CLI:      php backend/test-watermark.php
 *   Custom:   php backend/test-watermark.php /path/to/your/image.jpg
 *
 * With no args: creates a test image, applies watermark, saves to backend/uploads/test-watermark-output.jpg
 * With path:    applies watermark to the given image (copy is saved as test-watermark-output.jpg in uploads)
 */

$isCli = (php_sapi_name() === 'cli');
if (!$isCli) {
    header('Content-Type: text/plain; charset=utf-8');
}

echo "=== 360coordinates Watermark Test ===\n\n";

// Optional: custom image path from CLI
$customImagePath = null;
if ($isCli && isset($argv[1]) && $argv[1] !== '') {
    $customImagePath = $argv[1];
    if (!file_exists($customImagePath)) {
        echo "FAIL: File not found: {$customImagePath}\n";
        exit(1);
    }
    echo "Using custom image: {$customImagePath}\n\n";
}

// 1. Check GD
if (!extension_loaded('gd')) {
    echo "FAIL: PHP GD extension is not loaded. Install it (e.g. apt-get install php-gd) and restart the web server.\n";
    exit(1);
}
echo "OK: GD extension is loaded\n";

// 2. Load config and WatermarkService
require_once __DIR__ . '/config/config.php';
require_once __DIR__ . '/config/moderation.php';
require_once __DIR__ . '/services/WatermarkService.php';

if (!class_exists('WatermarkService')) {
    echo "FAIL: WatermarkService class not found\n";
    exit(1);
}
echo "OK: WatermarkService loaded\n";
echo "   WATERMARK_TEXT = " . (defined('WATERMARK_TEXT') ? WATERMARK_TEXT : 'not set') . "\n\n";

$testDir = __DIR__ . '/uploads';
if (!is_dir($testDir)) {
    @mkdir($testDir, 0755, true);
}
$testPath = $testDir . '/test-watermark-output.jpg';

if ($customImagePath !== null) {
    // Use provided image (copy so we don't overwrite original)
    if (!@copy($customImagePath, $testPath)) {
        echo "FAIL: Could not copy image to {$testPath}\n";
        exit(1);
    }
    echo "OK: Copied image to: {$testPath}\n\n";
} else {
    // Create a test image (400x300, grey background)
    $width = 400;
    $height = 300;
    $img = @imagecreatetruecolor($width, $height);
    if ($img === false) {
        echo "FAIL: Could not create test image\n";
        exit(1);
    }
    $grey = imagecolorallocate($img, 180, 180, 180);
    imagefill($img, 0, 0, $grey);
    $saved = @imagejpeg($img, $testPath, 90);
    imagedestroy($img);
    if (!$saved || !file_exists($testPath)) {
        echo "FAIL: Could not save test image to {$testPath}\n";
        exit(1);
    }
    echo "OK: Test image created: {$testPath}\n\n";
}

// 3. Apply watermark
echo "Applying watermark...\n";
$result = WatermarkService::addWatermark($testPath);

if ($result) {
    echo "OK: Watermark applied successfully.\n";
    echo "   Output: " . str_replace(__DIR__, '', $testPath) . "\n";
    if (!$isCli && isset($_SERVER['HTTP_HOST'])) {
        echo "   URL: https://" . $_SERVER['HTTP_HOST'] . "/backend/uploads/test-watermark-output.jpg\n";
    }
} else {
    echo "FAIL: WatermarkService::addWatermark() returned false. Check PHP error_log for details.\n";
    exit(1);
}

echo "\n--- Optional: Firebase URL parse test ---\n";
if (file_exists(__DIR__ . '/services/FirebaseStorageService.php')) {
    require_once __DIR__ . '/services/FirebaseStorageService.php';
    $sampleUrl = 'https://firebasestorage.googleapis.com/v0/b/myapp.appspot.com/o/properties%2F123%2Fimg_1.jpg?alt=media&token=abc';
    $parsed = FirebaseStorageService::parseFirebaseUrl($sampleUrl);
    if ($parsed) {
        echo "OK: FirebaseStorageService::parseFirebaseUrl works. Sample: bucket={$parsed['bucket']}, object={$parsed['object']}\n";
    } else {
        echo "WARN: parseFirebaseUrl returned null for sample URL\n";
    }
} else {
    echo "SKIP: FirebaseStorageService not found\n";
}

echo "\n=== Test complete ===\n";
