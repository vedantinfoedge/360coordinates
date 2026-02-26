<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);
header('Content-Type: text/plain');

echo "=== DEBUG LOGIN ===\n\n";

echo "Step 1: Starting...\n";

try {
    echo "Step 2: Loading config.php... ";
    require_once __DIR__ . '/../../config/config.php';
    echo "OK\n";
} catch (Error $e) {
    die("FAILED: " . $e->getMessage() . "\nFile: " . $e->getFile() . "\nLine: " . $e->getLine());
}

try {
    echo "Step 3: Loading database.php... ";
    require_once __DIR__ . '/../../config/database.php';
    echo "OK\n";
} catch (Error $e) {
    die("FAILED: " . $e->getMessage() . "\nFile: " . $e->getFile() . "\nLine: " . $e->getLine());
}

try {
    echo "Step 4: Loading response.php... ";
    require_once __DIR__ . '/../../utils/response.php';
    echo "OK\n";
} catch (Error $e) {
    die("FAILED: " . $e->getMessage() . "\nFile: " . $e->getFile() . "\nLine: " . $e->getLine());
}

try {
    echo "Step 5: Loading validation.php... ";
    require_once __DIR__ . '/../../utils/validation.php';
    echo "OK\n";
} catch (Error $e) {
    die("FAILED: " . $e->getMessage() . "\nFile: " . $e->getFile() . "\nLine: " . $e->getLine());
}

try {
    echo "Step 6: Loading auth.php... ";
    require_once __DIR__ . '/../../utils/auth.php';
    echo "OK\n";
} catch (Error $e) {
    die("FAILED: " . $e->getMessage() . "\nFile: " . $e->getFile() . "\nLine: " . $e->getLine());
}

try {
    echo "Step 7: Testing DB connection... ";
    $db = getDB();
    echo "OK\n";
} catch (Exception $e) {
    die("FAILED: " . $e->getMessage());
}

echo "\n=== ALL FILES LOADED OK ===\n";
echo "Error is inside login.php logic.\n";

