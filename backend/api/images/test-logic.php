<?php
ini_set('display_errors', 1);
error_reporting(E_ALL);

echo "step1-start\n";

require_once __DIR__ . '/../../vendor/autoload.php';
require_once __DIR__ . '/../../config/config.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/moderation.php';
require_once __DIR__ . '/../../services/WatermarkService.php';
require_once __DIR__ . '/../../helpers/FileHelper.php';
require_once __DIR__ . '/../../utils/auth.php';

echo "step2-loaded\n";

session_start();
echo "step3-session\n";

$user = getCurrentUser();
echo "step4-user: " . ($user ? "id=".$user['id'] : "null") . "\n";

// This is where it might fail - check if user is required
if (!$user) {
    echo "step5-no-user (would return 401)\n";
}

// Try database
$db = getDB();
echo "step6-db: " . ($db ? "connected" : "null") . "\n";

// Try GoogleVisionService instantiation
echo "step7-trying-vision...\n";
try {
    require_once __DIR__ . '/../../services/GoogleVisionService.php';
    $vision = new GoogleVisionService();
    echo "step8-vision-created\n";
} catch (Throwable $e) {
    echo "step8-vision-ERROR: " . $e->getMessage() . "\n";
}

// Check if ModerationDecisionService exists
echo "step9-trying-moderation-service...\n";
try {
    require_once __DIR__ . '/../../services/ModerationDecisionService.php';
    echo "step10-moderation-loaded\n";
} catch (Throwable $e) {
    echo "step10-moderation-ERROR: " . $e->getMessage() . "\n";
}

// Check FILES
echo "step11-FILES: " . (empty($_FILES) ? "empty" : json_encode(array_keys($_FILES))) . "\n";
echo "step12-POST: " . (empty($_POST) ? "empty" : json_encode(array_keys($_POST))) . "\n";

echo "\nALL STEPS COMPLETED\n";