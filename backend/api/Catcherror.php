<?php
/**
 * Simulate Actual Upload Flow
 * This tests the EXACT same code path as an image upload
 */

// Force display ALL errors
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// Catch fatal errors
register_shutdown_function(function() {
    $error = error_get_last();
    if ($error && in_array($error['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR])) {
        echo "<div style='background:#ff0000;color:white;padding:20px;font-family:monospace;'>";
        echo "<h2>💥 FATAL ERROR FOUND!</h2>";
        echo "<strong>Type:</strong> {$error['type']}<br>";
        echo "<strong>Message:</strong> {$error['message']}<br>";
        echo "<strong>File:</strong> {$error['file']}<br>";
        echo "<strong>Line:</strong> {$error['line']}";
        echo "</div>";
    }
});

header('Content-Type: text/html; charset=utf-8');

echo "<!DOCTYPE html><html><head><title>Upload Flow Simulator</title>
<style>
body { font-family: monospace; background: #1e1e1e; color: #d4d4d4; padding: 20px; }
.ok { color: #4ec9b0; }
.fail { color: #f14c4c; }
.warn { color: #dcdcaa; }
h2 { color: #569cd6; border-bottom: 1px solid #444; }
pre { background: #2d2d2d; padding: 10px; overflow-x: auto; }
.error-box { background: #5a1d1d; border: 2px solid #f14c4c; padding: 15px; margin: 10px 0; }
</style>
</head><body>";

echo "<h1>🔬 Upload Flow Simulator</h1>";
echo "<p>Testing the exact same flow as moderate-and-upload.php</p><hr>";

$step = 0;
function step($name) {
    global $step;
    $step++;
    echo "<p><strong>[Step {$step}]</strong> {$name} ... ";
    ob_flush();
    flush();
}

function ok($msg = 'OK') {
    echo "<span class='ok'>✅ {$msg}</span></p>";
}

function fail($msg) {
    echo "<span class='fail'>❌ {$msg}</span></p>";
}

// ============================================
// Load files exactly like moderate-and-upload.php
// ============================================
echo "<h2>Phase 1: Loading Files</h2>";

step("ob_start()");
ob_start();
ok();

step("Load config.php");
require_once __DIR__ . '/../config/config.php';
ok();

step("Load database.php");
require_once __DIR__ . '/../config/database.php';
ok();

step("Load moderation.php");
if (!defined('GOOGLE_APPLICATION_CREDENTIALS')) {
    require_once __DIR__ . '/../config/moderation.php';
}
ok();

step("Load auth.php");
require_once __DIR__ . '/../utils/auth.php';
ok();

step("Load GoogleVisionService.php");
// Check root vendor first (where vendor directory is located), then backend vendor as fallback
$rootVendorPath = __DIR__ . '/../../vendor/autoload.php';  // Root vendor (from backend/api/)
$backendVendorPath = __DIR__ . '/../vendor/autoload.php';  // Backend vendor (fallback - doesn't exist in new structure)

if (file_exists($rootVendorPath)) {
    require_once $rootVendorPath;
} elseif (file_exists($backendVendorPath)) {
    require_once $backendVendorPath;
}
require_once __DIR__ . '/../services/GoogleVisionService.php';
ok();

step("Load WatermarkService.php");
require_once __DIR__ . '/../services/WatermarkService.php';
ok();

step("Load FileHelper.php");
require_once __DIR__ . '/../helpers/FileHelper.php';
ok();

// ============================================
// Test Session & Authentication
// ============================================
echo "<h2>Phase 2: Authentication</h2>";

step("session_start()");
try {
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }
    ok("Session ID: " . session_id());
} catch (Throwable $e) {
    fail($e->getMessage());
}

step("getCurrentUser()");
try {
    $user = getCurrentUser();
    if ($user) {
        ok("User ID: " . ($user['id'] ?? 'unknown'));
    } else {
        echo "<span class='warn'>⚠️ No user logged in (this is expected for this test)</span></p>";
    }
} catch (Throwable $e) {
    fail($e->getMessage());
    echo "<pre class='error-box'>" . $e->getTraceAsString() . "</pre>";
}

// ============================================
// Test Directory Access
// ============================================
echo "<h2>Phase 3: Directory Access</h2>";

step("Check UPLOAD_TEMP_PATH");
if (defined('UPLOAD_TEMP_PATH')) {
    $tempPath = UPLOAD_TEMP_PATH;
    if (!is_dir($tempPath)) {
        echo "<span class='warn'>Creating: {$tempPath}</span></p>";
        @mkdir($tempPath, 0755, true);
    }
    if (is_writable($tempPath)) {
        ok($tempPath);
    } else {
        fail("Not writable: {$tempPath}");
    }
} else {
    fail("UPLOAD_TEMP_PATH not defined");
}

step("Check UPLOAD_PROPERTIES_PATH");
if (defined('UPLOAD_PROPERTIES_PATH')) {
    $propPath = UPLOAD_PROPERTIES_PATH;
    if (!is_dir($propPath)) {
        echo "<span class='warn'>Creating: {$propPath}</span></p>";
        @mkdir($propPath, 0755, true);
    }
    if (is_writable($propPath)) {
        ok($propPath);
    } else {
        fail("Not writable: {$propPath}");
    }
} else {
    fail("UPLOAD_PROPERTIES_PATH not defined");
}

// ============================================
// Test Vision Service with Real Image
// ============================================
echo "<h2>Phase 4: Vision API Test</h2>";

step("Create GoogleVisionService");
try {
    $visionService = new GoogleVisionService();
    ok();
} catch (Throwable $e) {
    fail($e->getMessage());
    echo "<pre class='error-box'>" . $e->getTraceAsString() . "</pre>";
    $visionService = null;
}

if ($visionService) {
    step("Create test image");
    $testImagePath = sys_get_temp_dir() . '/test_upload_' . time() . '.jpg';
    
    // Create a simple test image
    $img = imagecreatetruecolor(500, 400);
    $bgColor = imagecolorallocate($img, 200, 200, 200);
    imagefill($img, 0, 0, $bgColor);
    imagejpeg($img, $testImagePath, 90);
    imagedestroy($img);
    
    if (file_exists($testImagePath)) {
        ok("Size: " . filesize($testImagePath) . " bytes");
        
        step("Call analyzeImage()");
        try {
            $startTime = microtime(true);
            $result = $visionService->analyzeImage($testImagePath);
            $duration = round((microtime(true) - $startTime) * 1000);
            
            if ($result['success']) {
                ok("Completed in {$duration}ms");
                
                echo "<pre>";
                echo "SafeSearch: " . json_encode($result['safesearch_scores']) . "\n";
                echo "Labels: " . count($result['labels'] ?? []) . "\n";
                echo "Faces: " . count($result['faces'] ?? []) . "\n";
                echo "Objects: " . count($result['objects'] ?? []) . "\n";
                echo "</pre>";
            } else {
                fail($result['error'] ?? 'Unknown error');
            }
        } catch (Throwable $e) {
            fail($e->getMessage());
            echo "<pre class='error-box'>" . $e->getTraceAsString() . "</pre>";
        }
        
        @unlink($testImagePath);
    } else {
        fail("Could not create test image");
    }
}

// ============================================
// Test Database
// ============================================
echo "<h2>Phase 5: Database</h2>";

step("getDB()");
try {
    $db = getDB();
    if ($db) {
        ok("Connected");
        
        step("Check property_images table");
        try {
            $stmt = $db->query("SELECT COUNT(*) FROM property_images");
            $count = $stmt->fetchColumn();
            ok("Table exists, {$count} rows");
        } catch (Throwable $e) {
            fail($e->getMessage());
        }
    } else {
        fail("getDB() returned null");
    }
} catch (Throwable $e) {
    fail($e->getMessage());
}

// ============================================
// Test FileHelper
// ============================================
echo "<h2>Phase 6: FileHelper</h2>";

step("FileHelper::generateUniqueFilename()");
try {
    $filename = FileHelper::generateUniqueFilename('test.jpg');
    ok($filename);
} catch (Throwable $e) {
    fail($e->getMessage());
}

step("FileHelper::createDirectory()");
try {
    $testDir = UPLOAD_TEMP_PATH . 'test_' . time() . '/';
    $result = FileHelper::createDirectory($testDir);
    if ($result && is_dir($testDir)) {
        ok($testDir);
        @rmdir($testDir);
    } else {
        fail("Could not create directory");
    }
} catch (Throwable $e) {
    fail($e->getMessage());
}

// ============================================
// Test getErrorMessage function
// ============================================
echo "<h2>Phase 7: Error Messages</h2>";

step("getErrorMessage() function");
if (function_exists('getErrorMessage')) {
    try {
        $msg = getErrorMessage('human_detected');
        ok("Function exists: '{$msg}'");
    } catch (Throwable $e) {
        fail($e->getMessage());
    }
} else {
    fail("getErrorMessage() function not found - check moderation.php");
}

// ============================================
// Summary
// ============================================
echo "<hr><h2>✅ All Steps Completed</h2>";
echo "<p>If you see this message, the upload flow should work.</p>";
echo "<p>The issue might be:</p>";
echo "<ul>
    <li>Authentication required (user must be logged in)</li>
    <li>Invalid property_id being sent</li>
    <li>File upload size/type issues</li>
    <li>Frontend sending incorrect data</li>
</ul>";

// ============================================
// Test Form
// ============================================
echo "<hr><h2>🧪 Test Actual Upload</h2>";
echo "<p>Log in to your site first, then use this form:</p>";
echo "<form action='moderate-and-upload.php' method='POST' enctype='multipart/form-data' style='background:#2d2d2d;padding:20px;'>
    <p><label>Property ID: <input type='number' name='property_id' value='1' style='padding:5px;'></label></p>
    <p><label>Validate Only: <input type='checkbox' name='validate_only' value='true' checked></label></p>
    <p><label>Image: <input type='file' name='image' accept='image/*' required></label></p>
    <p><button type='submit' style='padding:10px 30px;background:#4ec9b0;border:none;cursor:pointer;'>Upload Test</button></p>
</form>";

echo "<hr><h2>📋 Check Network Tab</h2>";
echo "<p>When the upload fails, check the browser's Network tab:</p>
<ol>
    <li>Open DevTools (F12)</li>
    <li>Go to Network tab</li>
    <li>Try uploading an image</li>
    <li>Click on the failed request (red)</li>
    <li>Check the <strong>Response</strong> tab - what does it say?</li>
    <li>Check the <strong>Headers</strong> tab - what is the request payload?</li>
</ol>";

echo "</body></html>";