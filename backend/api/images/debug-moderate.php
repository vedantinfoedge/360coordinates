<?php
/**
 * Image Moderation Debug Check
 * Tests the image moderation setup and dependencies
 * 
 * Access: https://360coordinates.com/backend/api/images/debug-moderate.php
 */

error_reporting(E_ALL);
ini_set('display_errors', 1);
header('Content-Type: text/plain; charset=utf-8');
header('Access-Control-Allow-Origin: *');

echo "=== IMAGE MODERATION DEBUG ===\n\n";
echo "Server: " . ($_SERVER['HTTP_HOST'] ?? 'Unknown') . "\n";
echo "Script Path: " . (__FILE__) . "\n\n";

// Test 1: Config
echo "1. Loading config.php... ";
try {
    require_once __DIR__ . '/../../config/config.php';
    // Re-set text/plain header after config loads
    header('Content-Type: text/plain; charset=utf-8', true);
    echo "OK\n";
} catch (Error $e) {
    echo "FAILED: " . $e->getMessage() . " (Line: " . $e->getLine() . ")\n";
} catch (Exception $e) {
    echo "FAILED: " . $e->getMessage() . " (Line: " . $e->getLine() . ")\n";
}

// Test 2: Moderation config
echo "2. Loading moderation.php... ";
try {
    require_once __DIR__ . '/../../config/moderation.php';
    echo "OK\n";
    
    // Check Google credentials path
    if (defined('GOOGLE_APPLICATION_CREDENTIALS')) {
        $credPath = GOOGLE_APPLICATION_CREDENTIALS;
        echo "   - Credentials path: " . $credPath . "\n";
        
        if (file_exists($credPath)) {
            echo "   - File exists: YES\n";
            if (is_readable($credPath)) {
                echo "   - File readable: YES\n";
                try {
                    $creds = json_decode(file_get_contents($credPath), true);
                    if ($creds && isset($creds['type'])) {
                        echo "   - Type: " . $creds['type'] . "\n";
                        echo "   - Project: " . ($creds['project_id'] ?? 'NOT SET') . "\n";
                        echo "   - Client Email: " . ($creds['client_email'] ?? 'NOT SET') . "\n";
                    } else {
                        echo "   - WARNING: Invalid JSON format\n";
                    }
                } catch (Exception $e) {
                    echo "   - ERROR reading credentials: " . $e->getMessage() . "\n";
                }
            } else {
                echo "   - File readable: NO (permission issue!)\n";
            }
        } else {
            echo "   - File exists: NO\n";
            echo "   - ERROR: Credentials file not found!\n";
        }
    } else {
        echo "   - ERROR: GOOGLE_APPLICATION_CREDENTIALS not defined\n";
    }
} catch (Error $e) {
    echo "FAILED: " . $e->getMessage() . " (Line: " . $e->getLine() . ")\n";
} catch (Exception $e) {
    echo "FAILED: " . $e->getMessage() . " (Line: " . $e->getLine() . ")\n";
}

// Test 3: Check vendor/autoload
echo "3. Checking vendor/autoload.php... ";
$backendAutoloadPath = __DIR__ . '/../../vendor/autoload.php';
$rootAutoloadPath = __DIR__ . '/../../../vendor/autoload.php';
$autoloadPath = file_exists($backendAutoloadPath) ? $backendAutoloadPath : (file_exists($rootAutoloadPath) ? $rootAutoloadPath : $backendAutoloadPath);
if (file_exists($autoloadPath)) {
    echo "OK - File exists\n";
    try {
        require_once $autoloadPath;
        echo "   - Autoload loaded successfully\n";
    } catch (Exception $e) {
        echo "   - ERROR loading autoload: " . $e->getMessage() . "\n";
    }
} else {
    echo "MISSING - File not found at: $autoloadPath\n";
    echo "   Run: composer install in backend folder\n";
}

// Test 4: Check Google Cloud Vision classes (v2.x path)
echo "4. Checking Google Vision classes... ";
$classesToCheck = [
    'Google\\Cloud\\Vision\\V1\\Client\\ImageAnnotatorClient' => 'ImageAnnotatorClient (v2.x)',
    'Google\\Cloud\\Vision\\V1\\Feature' => 'Feature',
    'Google\\Cloud\\Vision\\V1\\Feature\\Type' => 'Feature\\Type',
    'Google\\Cloud\\Vision\\V1\\Image' => 'Image',
    'Google\\Cloud\\Vision\\V1\\AnnotateImageRequest' => 'AnnotateImageRequest',
    'Google\\Cloud\\Vision\\V1\\BatchAnnotateImagesRequest' => 'BatchAnnotateImagesRequest',
    'Google\\Cloud\\Vision\\V1\\Likelihood' => 'Likelihood'
];

$allClassesFound = true;
foreach ($classesToCheck as $className => $displayName) {
    if (class_exists($className) || interface_exists($className)) {
        echo "   - {$displayName}: OK\n";
    } else {
        echo "   - {$displayName}: MISSING\n";
        $allClassesFound = false;
    }
}

if ($allClassesFound) {
    echo "   Status: All classes found\n";
} else {
    echo "   Status: Some classes missing\n";
    echo "   Run: composer require google/cloud-vision:^2.0\n";
}

// Test 5: Check uploads directories
echo "5. Checking uploads directories... ";
$uploadDirs = [
    'temp' => __DIR__ . '/../../uploads/temp/',
    'properties' => __DIR__ . '/../../uploads/properties/',
    'review' => __DIR__ . '/../../uploads/review/',
    'rejected' => __DIR__ . '/../../uploads/rejected/'
];

foreach ($uploadDirs as $name => $dir) {
    if (is_dir($dir)) {
        echo "   - {$name}/: EXISTS";
        if (is_writable($dir)) {
            echo " (writable)\n";
        } else {
            echo " (NOT writable - permission issue!)\n";
        }
    } else {
        echo "   - {$name}/: MISSING\n";
        // Try to create it
        if (@mkdir($dir, 0755, true)) {
            echo "     Created successfully\n";
        } else {
            echo "     Failed to create\n";
        }
    }
}

// Test 6: Check moderation thresholds
echo "6. Checking moderation thresholds... ";
$thresholdsFound = false;
$thresholds = [
    'MODERATION_ADULT_THRESHOLD' => 'Adult content',
    'MODERATION_VIOLENCE_THRESHOLD' => 'Violence content',
    'MODERATION_RACY_THRESHOLD' => 'Racy content',
    'MODERATION_FACE_THRESHOLD' => 'Face detection',
    'MODERATION_HUMAN_OBJECT_THRESHOLD' => 'Human object detection',
    'MODERATION_ANIMAL_OBJECT_THRESHOLD' => 'Animal object detection',
    'MODERATION_ANIMAL_LABEL_THRESHOLD' => 'Animal label detection',
    'MIN_IMAGE_WIDTH' => 'Min image width',
    'MIN_IMAGE_HEIGHT' => 'Min image height',
    'MODERATION_BLUR_THRESHOLD' => 'Blur detection'
];

$missingThresholds = [];
foreach ($thresholds as $constant => $description) {
    if (defined($constant)) {
        echo "   - {$description}: " . constant($constant) . "\n";
        $thresholdsFound = true;
    } else {
        $missingThresholds[] = $constant;
    }
}

if (empty($missingThresholds)) {
    echo "   Status: All thresholds defined\n";
} else {
    echo "   Status: MISSING thresholds:\n";
    foreach ($missingThresholds as $missing) {
        echo "     - {$missing}\n";
    }
    echo "   WARNING: Using fallback defaults in moderate-and-upload.php\n";
}

// Test 7: Check helper classes
echo "7. Checking helper classes... ";
$helpers = [
    'FileHelper' => __DIR__ . '/../../helpers/FileHelper.php',
    'BlurDetector' => __DIR__ . '/../../helpers/BlurDetector.php',
    'ResponseHelper' => __DIR__ . '/../../helpers/ResponseHelper.php'
];

foreach ($helpers as $name => $path) {
    if (file_exists($path)) {
        echo "   - {$name}: EXISTS\n";
    } else {
        echo "   - {$name}: MISSING\n";
    }
}

// Test 8: Check service classes
echo "8. Checking service classes... ";
$services = [
    'GoogleVisionService' => __DIR__ . '/../../services/GoogleVisionService.php',
    'ModerationDecisionService' => __DIR__ . '/../../services/ModerationDecisionService.php',
    'WatermarkService' => __DIR__ . '/../../services/WatermarkService.php'
];

foreach ($services as $name => $path) {
    if (file_exists($path)) {
        echo "   - {$name}: EXISTS\n";
    } else {
        echo "   - {$name}: MISSING\n";
    }
}

// Test 9: Try to initialize Vision client (if credentials exist)
echo "9. Testing Vision client initialization... ";
if (defined('GOOGLE_APPLICATION_CREDENTIALS') && file_exists(GOOGLE_APPLICATION_CREDENTIALS)) {
    try {
        if (!class_exists('Google\\Cloud\\Vision\\V1\\Client\\ImageAnnotatorClient')) {
            echo "SKIPPED - Google Vision classes not loaded\n";
        } else {
            putenv('GOOGLE_APPLICATION_CREDENTIALS=' . GOOGLE_APPLICATION_CREDENTIALS);
            $client = new Google\Cloud\Vision\V1\Client\ImageAnnotatorClient([
                'credentials' => GOOGLE_APPLICATION_CREDENTIALS
            ]);
            echo "OK - Client created successfully\n";
            $client->close();
        }
    } catch (Exception $e) {
        echo "FAILED: " . $e->getMessage() . "\n";
        echo "   Error type: " . get_class($e) . "\n";
    } catch (Error $e) {
        echo "FAILED: " . $e->getMessage() . "\n";
        echo "   Error type: " . get_class($e) . "\n";
    }
} else {
    echo "SKIPPED - Credentials file not found\n";
}

// Test 10: Check moderation endpoint
echo "10. Checking moderation endpoint... ";
$endpointPath = __DIR__ . '/moderate-and-upload.php';
if (file_exists($endpointPath)) {
    echo "OK - Endpoint exists\n";
    if (is_readable($endpointPath)) {
        echo "   - Readable: YES\n";
    } else {
        echo "   - Readable: NO\n";
    }
} else {
    echo "MISSING - Endpoint not found\n";
}

echo "\n=== DEBUG COMPLETE ===\n";
echo "\nNext steps:\n";
echo "1. If credentials are missing, upload the JSON file to the Secure folder\n";
echo "2. If classes are missing, run: composer require google/cloud-vision:^2.0\n";
echo "3. If directories are missing, they will be created automatically\n";
echo "4. Test the moderation endpoint: POST /backend/api/images/moderate-and-upload.php\n";

