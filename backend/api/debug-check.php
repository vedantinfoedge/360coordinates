<?php
/**
 * Backend Debug Check
 * Tests all backend dependencies
 * 
 * IMPORTANT: Upload this file to your server at:
 * /public_html/backend/api/debug-check.php
 * OR
 * /domains/360coordinates.com/public_html/demo1/backend/api/debug-check.php
 * 
 * Access: https://360coordinates.com/backend/api/debug-check.php
 */

// Enable all error reporting
error_reporting(E_ALL);
ini_set('display_errors', 1);
ini_set('log_errors', 1);

// Set text/plain header (override config.php JSON header)
header('Content-Type: text/plain; charset=utf-8', true);
header('Access-Control-Allow-Origin: *', true);

echo "=== BACKEND DEBUG CHECK ===\n\n";
echo "Server: " . ($_SERVER['HTTP_HOST'] ?? 'Unknown') . "\n";
echo "Script Path: " . ($_SERVER['SCRIPT_FILENAME'] ?? __FILE__) . "\n";
echo "Request URI: " . ($_SERVER['REQUEST_URI'] ?? 'Unknown') . "\n\n";

// Test 1: Config
echo "1. Loading config.php... ";
try {
    require_once __DIR__ . '/../config/config.php';
    // Re-set text/plain header after config loads
    header('Content-Type: text/plain; charset=utf-8', true);
    echo "OK\n";
} catch (Error $e) {
    echo "FAILED: " . $e->getMessage() . " (Line: " . $e->getLine() . ")\n";
} catch (Exception $e) {
    echo "FAILED: " . $e->getMessage() . " (Line: " . $e->getLine() . ")\n";
}

// Test 2: Database
echo "2. Loading database.php... ";
try {
    require_once __DIR__ . '/../config/database.php';
    echo "OK\n";
} catch (Error $e) {
    echo "FAILED: " . $e->getMessage() . " (Line: " . $e->getLine() . ")\n";
} catch (Exception $e) {
    echo "FAILED: " . $e->getMessage() . " (Line: " . $e->getLine() . ")\n";
}

// Test 3: DB Connection
echo "3. Testing DB connection... ";
try {
    $db = getDB();
    echo "OK - Connected\n";
} catch (Exception $e) {
    echo "FAILED: " . $e->getMessage() . "\n";
}

// Test 4: Response utils
echo "4. Loading response.php... ";
try {
    require_once __DIR__ . '/../utils/response.php';
    echo "OK\n";
} catch (Error $e) {
    echo "FAILED: " . $e->getMessage() . " (Line: " . $e->getLine() . ")\n";
} catch (Exception $e) {
    echo "FAILED: " . $e->getMessage() . " (Line: " . $e->getLine() . ")\n";
}

echo "\n=== DEBUG COMPLETE ===\n";

