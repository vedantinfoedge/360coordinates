<?php
ini_set('display_errors', 1);
error_reporting(E_ALL);
header('Content-Type: text/plain');

echo "=== VISION API FULL TEST ===\n\n";

// Load all configs
require_once __DIR__ . '/config/config.php';
require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/config/moderation.php';

// Load composer
if (file_exists(__DIR__ . '/vendor/autoload.php')) {
    require_once __DIR__ . '/vendor/autoload.php';
    echo "✅ Composer loaded\n";
} else {
    die("❌ Composer autoload not found!\nRun: composer install\n");
}

echo "✅ Credentials path: " . GOOGLE_APPLICATION_CREDENTIALS . "\n";
echo "✅ File exists: " . (file_exists(GOOGLE_APPLICATION_CREDENTIALS) ? 'YES' : 'NO') . "\n\n";

// Load service
require_once __DIR__ . '/services/GoogleVisionService.php';

echo "Testing Vision API...\n\n";

try {
    // Create service
    $service = new GoogleVisionService();
    echo "✅ GoogleVisionService created\n";
    
    // Create test image
    $tempDir = __DIR__ . '/uploads/temp/';
    if (!is_dir($tempDir)) {
        mkdir($tempDir, 0755, true);
    }
    
    $testImage = $tempDir . 'test_' . time() . '.jpg';
    $img = imagecreatetruecolor(200, 200);
    $blue = imagecolorallocate($img, 0, 0, 255);
    imagefill($img, 0, 0, $blue);
    imagejpeg($img, $testImage, 90);
    imagedestroy($img);
    echo "✅ Test image created: $testImage\n\n";
    
    // Call API
    echo "Calling Google Vision API...\n";
    $result = $service->analyzeImage($testImage);
    
    // Cleanup
    @unlink($testImage);
    
    if ($result['success']) {
        echo "\n✅ SUCCESS! Vision API is working!\n\n";
        echo "SafeSearch scores:\n";
        print_r($result['safesearch_scores']);
        echo "\nLabels found: " . count($result['labels']) . "\n";
        echo "Faces found: " . count($result['faces']) . "\n";
        echo "Objects found: " . count($result['objects']) . "\n";
    } else {
        echo "\n❌ API returned error:\n";
        echo $result['error'] . "\n";
    }
    
} catch (Throwable $e) {
    echo "\n❌ EXCEPTION:\n";
    echo "Message: " . $e->getMessage() . "\n";
    echo "File: " . $e->getFile() . "\n";
    echo "Line: " . $e->getLine() . "\n";
    echo "\nFull trace:\n" . $e->getTraceAsString() . "\n";
}

echo "\n=== END TEST ===\n";