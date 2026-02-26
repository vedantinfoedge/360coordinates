<?php
/**
 * Test Property Add - Debug Version
 * This will show the actual error
 */

// Enable error reporting temporarily
error_reporting(E_ALL);
ini_set('display_errors', 0); // Don't display, but log
ini_set('log_errors', 1);

// Start output buffering to catch any unexpected output
ob_start();

require_once __DIR__ . '/../../../config/config.php';
require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../../utils/response.php';
require_once __DIR__ . '/../../../utils/validation.php';
require_once __DIR__ . '/../../../utils/auth.php';
require_once __DIR__ . '/../../../utils/upload.php';

try {
    // Set headers
    handlePreflight();
    
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        ob_end_clean();
        sendError('Method not allowed', null, 405);
    }
    
    // Test authentication
    try {
        $user = requireUserType(['seller', 'agent']);
        $authSuccess = true;
        $userId = $user['id'];
        $userType = $user['user_type'] ?? 'unknown';
    } catch (Exception $e) {
        $authSuccess = false;
        $authError = $e->getMessage();
        ob_end_clean();
        sendError('Authentication failed: ' . $authError, ['auth_error' => $authError], 401);
    }
    
    // Test database
    try {
        $db = getDB();
        $dbSuccess = true;
    } catch (Exception $e) {
        $dbSuccess = false;
        $dbError = $e->getMessage();
        ob_end_clean();
        sendError('Database connection failed: ' . $dbError, null, 500);
    }
    
    // Get input
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (json_last_error() !== JSON_ERROR_NONE) {
        ob_end_clean();
        sendError('Invalid JSON input: ' . json_last_error_msg(), null, 400);
    }
    
    // Check required fields
    if (empty($input['title'])) {
        ob_end_clean();
        sendError('Title is required', null, 400);
    }
    
    // If we get here, everything is OK
    ob_end_clean();
    sendSuccess('Test passed', [
        'auth' => $authSuccess,
        'database' => $dbSuccess,
        'user_id' => $userId ?? null,
        'user_type' => $userType ?? null,
        'has_input' => !empty($input),
        'input_keys' => array_keys($input ?? [])
    ]);
    
} catch (Exception $e) {
    $output = ob_get_clean();
    sendError('Test failed: ' . $e->getMessage(), [
        'error' => $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine(),
        'unexpected_output' => $output
    ], 500);
}

