<?php
/**
 * Simple Google Vision API Test
 * Tests if the ImageAnnotatorClient class can be loaded
 */

ini_set('display_errors', 1);
error_reporting(E_ALL);
header('Content-Type: text/plain');

echo "=== GOOGLE VISION API CLASS TEST ===\n\n";

// Load composer
$backendVendorPath = __DIR__ . '/vendor/autoload.php';
$rootVendorPath = __DIR__ . '/../vendor/autoload.php';
$autoloadPath = file_exists($backendVendorPath) ? $backendVendorPath : (file_exists($rootVendorPath) ? $rootVendorPath : null);

if ($autoloadPath) {
    require_once $autoloadPath;
    echo "✅ Composer loaded\n";
    echo "   Autoload: {$autoloadPath}\n";
} else {
    die("❌ Composer autoload not found!\nExpected:\n- {$backendVendorPath}\n- {$rootVendorPath}\n\nRun: composer install\n");
}

// Test if class exists with v2.x path
try {
    if (class_exists('Google\Cloud\Vision\V1\Client\ImageAnnotatorClient')) {
        echo "✅ SUCCESS! Google Vision Class Found!\n";
        echo "   Class: Google\\Cloud\\Vision\\V1\\Client\\ImageAnnotatorClient\n";
    } else {
        echo "❌ FAILED! Class not found with v2.x path\n";
    }
    
    // Also check v1.x path for comparison
    if (class_exists('Google\Cloud\Vision\V1\ImageAnnotatorClient')) {
        echo "⚠️  WARNING: Old v1.x path also exists (should use v2.x path)\n";
    }
    
    // Test other required classes
    $classes = [
        'Google\Cloud\Vision\V1\Feature',
        'Google\Cloud\Vision\V1\Feature\Type',
        'Google\Cloud\Vision\V1\Image',
        'Google\Cloud\Vision\V1\AnnotateImageRequest'
    ];
    
    echo "\nChecking other required classes:\n";
    foreach ($classes as $class) {
        if (class_exists($class)) {
            echo "✅ {$class}\n";
        } else {
            echo "❌ {$class} - NOT FOUND\n";
        }
    }
    
} catch (Throwable $e) {
    echo "\n❌ EXCEPTION:\n";
    echo "Message: " . $e->getMessage() . "\n";
    echo "File: " . $e->getFile() . "\n";
    echo "Line: " . $e->getLine() . "\n";
}

echo "\n=== END TEST ===\n";

