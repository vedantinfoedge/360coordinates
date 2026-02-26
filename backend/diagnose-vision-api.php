<?php
/**
 * Google Vision API Diagnostic Script
 * Checks all potential issues with Google Vision API setup
 */

error_reporting(E_ALL);
ini_set('display_errors', 1);

echo "<h1>Google Vision API Diagnostic Report</h1>\n";
echo "<pre>\n";

$issues = [];
$warnings = [];
$success = [];

// 1. Check Composer dependencies
echo "=== 1. COMPOSER DEPENDENCIES ===\n";
$rootVendorPath = __DIR__ . '/../vendor/autoload.php';
$backendVendorPath = __DIR__ . '/vendor/autoload.php';

if (file_exists($rootVendorPath)) {
    echo "✓ Root vendor/autoload.php found: {$rootVendorPath}\n";
    $success[] = "Root vendor directory exists";
    require_once $rootVendorPath;
} elseif (file_exists($backendVendorPath)) {
    echo "✓ Backend vendor/autoload.php found: {$backendVendorPath}\n";
    $success[] = "Backend vendor directory exists";
    require_once $backendVendorPath;
} else {
    echo "✗ NO vendor/autoload.php found!\n";
    echo "  Root path checked: {$rootVendorPath}\n";
    echo "  Backend path checked: {$backendVendorPath}\n";
    $issues[] = "Composer dependencies not installed. Run 'composer install' in backend directory.";
}

// 2. Check Google Vision classes
echo "\n=== 2. GOOGLE VISION CLASSES ===\n";
$requiredClass = 'Google\Cloud\Vision\V1\Client\ImageAnnotatorClient';
if (class_exists($requiredClass)) {
    echo "✓ Google Vision classes are available\n";
    echo "  Class: {$requiredClass}\n";
    $success[] = "Google Vision classes loaded";
} else {
    echo "✗ Google Vision classes NOT found!\n";
    echo "  Required class: {$requiredClass}\n";
    $issues[] = "Google Vision API package not installed (v2.x required). Run 'composer require google/cloud-vision:^2.0' in backend directory.";
}

// 3. Check composer.json
echo "\n=== 3. COMPOSER.JSON CONFIGURATION ===\n";
$backendComposerJson = __DIR__ . '/composer.json';
if (file_exists($backendComposerJson)) {
    $composerData = json_decode(file_get_contents($backendComposerJson), true);
    if (isset($composerData['require']['google/cloud-vision'])) {
        echo "✓ google/cloud-vision in composer.json\n";
        echo "  Version: {$composerData['require']['google/cloud-vision']}\n";
        $success[] = "Package listed in composer.json";
    } else {
        echo "✗ google/cloud-vision NOT in composer.json!\n";
        $issues[] = "Add 'google/cloud-vision' to composer.json require section";
    }
} else {
    echo "✗ composer.json not found!\n";
    $issues[] = "composer.json file missing";
}

// 4. Check credentials configuration
echo "\n=== 4. CREDENTIALS CONFIGURATION ===\n";

// Load config files
$moderationConfig = __DIR__ . '/config/moderation.php';
$mainConfig = __DIR__ . '/config/config.php';

if (file_exists($moderationConfig)) {
    // Check moderation.php for hardcoded path
    $moderationContent = file_get_contents($moderationConfig);
    if (preg_match("/define\s*\(\s*['\"]GOOGLE_APPLICATION_CREDENTIALS['\"]\s*,\s*['\"]([^'\"]+)['\"]/", $moderationContent, $matches)) {
        $moderationPath = $matches[1];
        echo "⚠ moderation.php defines: {$moderationPath}\n";
        $warnings[] = "moderation.php has hardcoded credentials path (may conflict with config.php)";
    }
}

// Try to load config to get actual path
try {
    require_once $mainConfig;
    if (defined('GOOGLE_APPLICATION_CREDENTIALS')) {
        $credentialsPath = GOOGLE_APPLICATION_CREDENTIALS;
        echo "✓ GOOGLE_APPLICATION_CREDENTIALS defined: {$credentialsPath}\n";
        
        if (file_exists($credentialsPath)) {
            echo "✓ Credentials file EXISTS\n";
            if (is_readable($credentialsPath)) {
                echo "✓ Credentials file is READABLE\n";
                $success[] = "Credentials file accessible";
                
                // Check if it's valid JSON
                $jsonContent = @file_get_contents($credentialsPath);
                if ($jsonContent) {
                    $jsonData = @json_decode($jsonContent, true);
                    if ($jsonData && isset($jsonData['type']) && $jsonData['type'] === 'service_account') {
                        echo "✓ Credentials file is VALID JSON (service account)\n";
                        $success[] = "Credentials file is valid";
                    } else {
                        echo "⚠ Credentials file may not be valid service account JSON\n";
                        $warnings[] = "Credentials file format may be invalid";
                    }
                }
            } else {
                echo "✗ Credentials file is NOT READABLE\n";
                $issues[] = "Credentials file exists but is not readable. Check file permissions.";
            }
        } else {
            echo "✗ Credentials file DOES NOT EXIST\n";
            echo "  Expected path: {$credentialsPath}\n";
            $issues[] = "Credentials file not found at: {$credentialsPath}";
        }
    } else {
        echo "✗ GOOGLE_APPLICATION_CREDENTIALS not defined\n";
        $issues[] = "GOOGLE_APPLICATION_CREDENTIALS constant not defined";
    }
} catch (Exception $e) {
    echo "✗ Error loading config: " . $e->getMessage() . "\n";
    $issues[] = "Failed to load config.php: " . $e->getMessage();
}

// 5. Test Google Vision Service initialization
echo "\n=== 5. GOOGLE VISION SERVICE TEST ===\n";
if (class_exists($requiredClass) && defined('GOOGLE_APPLICATION_CREDENTIALS')) {
    try {
        require_once __DIR__ . '/services/GoogleVisionService.php';
        if (class_exists('GoogleVisionService')) {
            echo "✓ GoogleVisionService class loaded\n";
            
            // Try to instantiate (this will test credentials)
            try {
                $visionService = new GoogleVisionService();
                echo "✓ GoogleVisionService instantiated successfully\n";
                $success[] = "Google Vision Service can be initialized";
            } catch (Exception $e) {
                echo "✗ Failed to instantiate GoogleVisionService\n";
                echo "  Error: " . $e->getMessage() . "\n";
                $issues[] = "GoogleVisionService initialization failed: " . $e->getMessage();
            }
        } else {
            echo "✗ GoogleVisionService class not found\n";
            $issues[] = "GoogleVisionService class not available";
        }
    } catch (Exception $e) {
        echo "✗ Error loading GoogleVisionService: " . $e->getMessage() . "\n";
        $issues[] = "Failed to load GoogleVisionService: " . $e->getMessage();
    } catch (Error $e) {
        echo "✗ Fatal error loading GoogleVisionService: " . $e->getMessage() . "\n";
        $issues[] = "Fatal error: " . $e->getMessage();
    }
} else {
    echo "⚠ Cannot test service - missing prerequisites\n";
}

// Summary
echo "\n=== SUMMARY ===\n";
echo "✓ Successes: " . count($success) . "\n";
echo "⚠ Warnings: " . count($warnings) . "\n";
echo "✗ Issues: " . count($issues) . "\n\n";

if (count($success) > 0) {
    echo "SUCCESSES:\n";
    foreach ($success as $item) {
        echo "  ✓ {$item}\n";
    }
    echo "\n";
}

if (count($warnings) > 0) {
    echo "WARNINGS:\n";
    foreach ($warnings as $item) {
        echo "  ⚠ {$item}\n";
    }
    echo "\n";
}

if (count($issues) > 0) {
    echo "ISSUES TO FIX:\n";
    foreach ($issues as $item) {
        echo "  ✗ {$item}\n";
    }
    echo "\n";
    echo "RECOMMENDED FIXES:\n";
    echo "1. Install Composer dependencies:\n";
    echo "   cd backend\n";
    echo "   composer install\n\n";
    echo "2. If credentials file is missing, ensure it exists at the configured path\n";
    echo "3. Check file permissions on credentials file\n";
    echo "4. Verify Google Cloud Vision API is enabled in your Google Cloud project\n";
} else {
    echo "✅ All checks passed! Google Vision API should be working.\n";
}

echo "</pre>\n";
?>
