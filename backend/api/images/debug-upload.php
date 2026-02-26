<?php
ini_set('display_errors', 1);
error_reporting(E_ALL);
header('Content-Type: application/json');

echo json_encode(['step' => 0, 'message' => 'Script started']) . "\n";

try {
    // Step 1: Load files
    require_once __DIR__ . '/../../vendor/autoload.php';
    require_once __DIR__ . '/../../config/config.php';
    require_once __DIR__ . '/../../config/database.php';
    require_once __DIR__ . '/../../config/moderation.php';
    require_once __DIR__ . '/../../services/WatermarkService.php';
    require_once __DIR__ . '/../../helpers/FileHelper.php';
    require_once __DIR__ . '/../../utils/auth.php';
    echo json_encode(['step' => 1, 'message' => 'All files loaded']) . "\n";

    // Step 2: Session
    session_start();
    echo json_encode(['step' => 2, 'message' => 'Session started', 'session_id' => session_id()]) . "\n";

    // Step 3: Auth check
    $user = getCurrentUser();
    echo json_encode(['step' => 3, 'message' => 'getCurrentUser called', 'user' => $user ? 'found (id: '.$user['id'].')' : 'null']) . "\n";

    // Step 4: Database
    $db = getDB();
    echo json_encode(['step' => 4, 'message' => 'Database connected', 'db' => $db ? 'OK' : 'null']) . "\n";

    // Step 5: Check getErrorMessage function
    if (function_exists('getErrorMessage')) {
        echo json_encode(['step' => 5, 'message' => 'getErrorMessage exists']) . "\n";
    } else {
        echo json_encode(['step' => 5, 'message' => 'getErrorMessage NOT FOUND - THIS IS THE PROBLEM']) . "\n";
    }

    // Step 6: Check FileHelper
    $testFilename = FileHelper::generateUniqueFilename('test.jpg');
    echo json_encode(['step' => 6, 'message' => 'FileHelper works', 'test_filename' => $testFilename]) . "\n";

    // Step 7: Check $_FILES
    echo json_encode(['step' => 7, 'message' => 'FILES check', 'files' => empty($_FILES) ? 'empty' : array_keys($_FILES)]) . "\n";

    // Step 8: Check $_POST
    echo json_encode(['step' => 8, 'message' => 'POST check', 'post_keys' => empty($_POST) ? 'empty' : array_keys($_POST)]) . "\n";

    echo json_encode(['step' => 'DONE', 'message' => 'All checks passed!']) . "\n";

} catch (Throwable $e) {
    echo json_encode([
        'step' => 'ERROR',
        'error' => $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine()
    ]);
}