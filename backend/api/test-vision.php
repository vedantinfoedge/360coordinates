<?php
ini_set('display_errors', 1);
error_reporting(E_ALL);

echo "<h2>Testing require_once files...</h2>";

$files = [
    '../../vendor/autoload.php' => 'Composer Autoload (backend/vendor)',
    '../../../vendor/autoload.php' => 'Composer Autoload (repo root vendor)',
    '../../config/config.php' => 'Config',
    '../../config/database.php' => 'Database Config',
    '../../config/moderation.php' => 'Moderation Config',
    '../../services/GoogleVisionService.php' => 'GoogleVisionService',
    '../../services/ModerationDecisionService.php' => 'ModerationDecisionService',
    '../../services/WatermarkService.php' => 'WatermarkService',
    '../../helpers/FileHelper.php' => 'FileHelper',
    '../../utils/auth.php' => 'Auth Utils'
];

foreach ($files as $path => $name) {
    $fullPath = __DIR__ . '/' . $path;
    echo "<strong>{$name}</strong>: ";
    
    if (!file_exists($fullPath)) {
        echo "❌ FILE NOT FOUND at {$fullPath}<br>";
        continue;
    }
    
    echo "✓ exists... ";
    
    try {
        require_once $fullPath;
        echo "✅ loaded OK<br>";
    } catch (Throwable $e) {
        echo "❌ ERROR: " . $e->getMessage() . "<br>";
    }
}

echo "<h2>Constants Check</h2>";
$constants = ['UPLOAD_DIR', 'UPLOAD_TEMP_PATH', 'UPLOAD_PROPERTIES_PATH', 'UPLOAD_BASE_URL', 'MAX_IMAGE_SIZE_BYTES'];
foreach ($constants as $const) {
    echo "{$const}: " . (defined($const) ? constant($const) : '❌ NOT DEFINED') . "<br>";
}