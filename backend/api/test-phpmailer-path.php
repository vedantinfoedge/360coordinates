<?php
/**
 * PHPMailer Path Diagnostic
 * Run this to diagnose PHPMailer autoload issues
 */

echo "=== PHPMailer Diagnostic ===\n\n";

// Test different paths
$paths = [
    'From root' => __DIR__ . '/vendor/autoload.php',
    'Absolute' => realpath(__DIR__ . '/vendor/autoload.php'),
];

echo "1. Checking autoload.php paths:\n";
foreach ($paths as $label => $path) {
    $exists = file_exists($path);
    echo "   $label: $path\n";
    echo "   " . ($exists ? "✓ EXISTS" : "✗ NOT FOUND") . "\n";
    
    if ($exists) {
        require_once $path;
        $classExists = class_exists('PHPMailer\PHPMailer\PHPMailer');
        echo "   PHPMailer class: " . ($classExists ? "✓ AVAILABLE" : "✗ NOT FOUND") . "\n";
    }
    echo "\n";
}

echo "2. Checking vendor structure:\n";
$vendorPhpMailer = __DIR__ . '/vendor/phpmailer/phpmailer/src/PHPMailer.php';
echo "   PHPMailer.php: $vendorPhpMailer\n";
echo "   " . (file_exists($vendorPhpMailer) ? "✓ EXISTS" : "✗ NOT FOUND") . "\n\n";

echo "3. Checking autoload mapping:\n";
if (file_exists(__DIR__ . '/vendor/composer/autoload_psr4.php')) {
    $autoloadPsr4 = require __DIR__ . '/vendor/composer/autoload_psr4.php';
    if (isset($autoloadPsr4['PHPMailer\\PHPMailer\\'])) {
        $phpmailerPath = $autoloadPsr4['PHPMailer\\PHPMailer\\'][0];
        echo "   Autoload maps to: $phpmailerPath\n";
        echo "   Path exists: " . (file_exists($phpmailerPath) ? "✓ YES" : "✗ NO") . "\n";
    }
}
echo "\n";

echo "4. Testing class after autoload:\n";
$rootAutoload = __DIR__ . '/vendor/autoload.php';
if (file_exists($rootAutoload)) {
    require_once $rootAutoload;
    echo "   autoload.php loaded\n";
    echo "   Class exists: " . (class_exists('PHPMailer\PHPMailer\PHPMailer') ? "✓ YES" : "✗ NO") . "\n";
    
    if (class_exists('PHPMailer\PHPMailer\PHPMailer')) {
        try {
            $mail = new \PHPMailer\PHPMailer\PHPMailer(true);
            echo "   ✓ PHPMailer instantiated successfully\n";
        } catch (Exception $e) {
            echo "   ✗ Error instantiating: " . $e->getMessage() . "\n";
        }
    }
}