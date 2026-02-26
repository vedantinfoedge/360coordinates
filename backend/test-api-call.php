<?php
/**
 * Test Google Vision API Call
 * Tests the batchAnnotateImages method with proper BatchAnnotateImagesRequest
 */

ini_set('display_errors', 1);
error_reporting(E_ALL);
header('Content-Type: text/plain');

echo "=== TESTING GOOGLE VISION API CALL ===\n\n";

// Load composer
if (file_exists(__DIR__ . '/vendor/autoload.php')) {
    require_once __DIR__ . '/vendor/autoload.php';
    echo "✅ Composer loaded\n";
} else {
    die("❌ Composer autoload not found!\nRun: composer install\n");
}

// Load config
require_once __DIR__ . '/config/moderation.php';

use Google\Cloud\Vision\V1\Client\ImageAnnotatorClient;
use Google\Cloud\Vision\V1\Feature;
use Google\Cloud\Vision\V1\Feature\Type;
use Google\Cloud\Vision\V1\Image;
use Google\Cloud\Vision\V1\AnnotateImageRequest;
use Google\Cloud\Vision\V1\BatchAnnotateImagesRequest;

try {
    echo "1. Creating client...\n";
    $credentialsPath = GOOGLE_APPLICATION_CREDENTIALS;
    echo "   Credentials: {$credentialsPath}\n";
    echo "   File exists: " . (file_exists($credentialsPath) ? 'YES' : 'NO') . "\n";
    
    if (!file_exists($credentialsPath)) {
        die("❌ Credentials file not found!\n");
    }
    
    $client = new ImageAnnotatorClient([
        'credentials' => $credentialsPath
    ]);
    echo "   ✅ Client created\n\n";
    
    echo "2. Creating test image...\n";
    $tempDir = __DIR__ . '/uploads/temp/';
    if (!is_dir($tempDir)) {
        mkdir($tempDir, 0755, true);
    }
    
    $testImage = $tempDir . 'test_' . time() . '.jpg';
    $img = imagecreatetruecolor(640, 480);
    $blue = imagecolorallocate($img, 0, 0, 255);
    imagefill($img, 0, 0, $blue);
    imagejpeg($img, $testImage, 90);
    imagedestroy($img);
    echo "   ✅ Image created: {$testImage}\n\n";
    
    echo "3. Creating features...\n";
    $features = [];
    
    $safeSearchFeature = new Feature();
    $safeSearchFeature->setType(Type::SAFE_SEARCH_DETECTION);
    $features[] = $safeSearchFeature;
    
    $labelFeature = new Feature();
    $labelFeature->setType(Type::LABEL_DETECTION);
    $labelFeature->setMaxResults(20);
    $features[] = $labelFeature;
    
    $faceFeature = new Feature();
    $faceFeature->setType(Type::FACE_DETECTION);
    $features[] = $faceFeature;
    
    $objectFeature = new Feature();
    $objectFeature->setType(Type::OBJECT_LOCALIZATION);
    $features[] = $objectFeature;
    
    echo "   ✅ Features created (" . count($features) . " features)\n\n";
    
    echo "4. Creating request...\n";
    $image = new Image();
    $image->setContent(file_get_contents($testImage));
    
    $request = new AnnotateImageRequest();
    $request->setImage($image);
    $request->setFeatures($features);
    echo "   ✅ Request created\n\n";
    
    echo "5. Creating batch request...\n";
    $batchRequest = new BatchAnnotateImagesRequest();
    $batchRequest->setRequests([$request]);
    echo "   ✅ Batch request created\n\n";
    
    echo "6. Calling API...\n";
    $batchResponse = $client->batchAnnotateImages($batchRequest);
    echo "   ✅ API called successfully\n\n";
    
    echo "7. Processing response...\n";
    $responses = $batchResponse->getResponses();
    if (empty($responses)) {
        throw new Exception("No responses from API");
    }
    
    $response = $responses[0];
    
    // Check for errors
    if (method_exists($response, 'hasError') && $response->hasError()) {
        $error = $response->getError();
        $errorMessage = method_exists($error, 'getMessage') ? $error->getMessage() : 'Unknown error';
        throw new Exception("API Error: " . $errorMessage);
    }
    
    echo "   ✅ Response processed\n\n";
    
    // Extract results
    $safeSearchAnnotation = $response->getSafeSearchAnnotation();
    $labelAnnotations = $response->getLabelAnnotations();
    $faceAnnotations = $response->getFaceAnnotations();
    $objectAnnotations = $response->getLocalizedObjectAnnotations();
    
    echo "8. Results:\n";
    echo "   SafeSearch: " . ($safeSearchAnnotation ? "✅ Found" : "❌ Not found") . "\n";
    echo "   Labels: " . ($labelAnnotations ? count($labelAnnotations) : 0) . " found\n";
    echo "   Faces: " . ($faceAnnotations ? count($faceAnnotations) : 0) . " found\n";
    echo "   Objects: " . ($objectAnnotations ? count($objectAnnotations) : 0) . " found\n\n";
    
    // Cleanup
    @unlink($testImage);
    $client->close();
    
    echo "✅ SUCCESS! API is working!\n";
    echo "✅ Image moderation should now work correctly.\n";
    
} catch (Throwable $e) {
    echo "\n❌ ERROR:\n";
    echo "Message: " . $e->getMessage() . "\n";
    echo "File: " . $e->getFile() . "\n";
    echo "Line: " . $e->getLine() . "\n";
    echo "\nFull trace:\n" . $e->getTraceAsString() . "\n";
    
    if (isset($client)) {
        try {
            $client->close();
        } catch (Exception $closeError) {
            // Ignore close errors
        }
    }
}

echo "\n=== END TEST ===\n";

