<?php
/**
 * Test Login API Dependencies
 * GET /api/auth/test-login.php
 * 
 * This file tests if all required dependencies for login.php can be loaded
 */

error_reporting(E_ALL);
ini_set('display_errors', 1);
header('Content-Type: application/json');

$steps = [];
$steps['step0'] = 'Started';

try {
    require_once __DIR__ . '/../../config/config.php';
    $steps['step1'] = 'config.php loaded';
} catch (Error $e) {
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine(),
        'steps' => $steps
    ]);
    exit;
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine(),
        'steps' => $steps
    ]);
    exit;
}

try {
    require_once __DIR__ . '/../../config/database.php';
    $steps['step2'] = 'database.php loaded';
} catch (Error $e) {
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine(),
        'steps' => $steps
    ]);
    exit;
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine(),
        'steps' => $steps
    ]);
    exit;
}

try {
    require_once __DIR__ . '/../../utils/response.php';
    $steps['step3'] = 'response.php loaded';
    
    // Test if functions exist
    $functions = ['sendResponse', 'sendSuccess', 'sendError', 'handlePreflight', 'setCorsHeaders'];
    foreach ($functions as $func) {
        if (function_exists($func)) {
            $steps['function_' . $func] = 'exists';
        } else {
            $steps['function_' . $func] = 'MISSING';
        }
    }
} catch (Error $e) {
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine(),
        'steps' => $steps
    ]);
    exit;
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine(),
        'steps' => $steps
    ]);
    exit;
}

try {
    require_once __DIR__ . '/../../utils/validation.php';
    $steps['step4'] = 'validation.php loaded';
    
    // Test if functions exist
    $functions = ['validateEmail', 'validatePhone', 'sanitizeInput', 'validatePassword'];
    foreach ($functions as $func) {
        if (function_exists($func)) {
            $steps['function_' . $func] = 'exists';
        } else {
            $steps['function_' . $func] = 'MISSING';
        }
    }
} catch (Error $e) {
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine(),
        'steps' => $steps
    ]);
    exit;
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine(),
        'steps' => $steps
    ]);
    exit;
}

try {
    require_once __DIR__ . '/../../utils/auth.php';
    $steps['step5'] = 'auth.php loaded';
    
    // Test if functions exist
    $functions = ['generateToken', 'verifyToken', 'getCurrentUser', 'requireAuth', 'requireUserType'];
    foreach ($functions as $func) {
        if (function_exists($func)) {
            $steps['function_' . $func] = 'exists';
        } else {
            $steps['function_' . $func] = 'MISSING';
        }
    }
} catch (Error $e) {
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine(),
        'steps' => $steps
    ]);
    exit;
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine(),
        'steps' => $steps
    ]);
    exit;
}

// Test database connection
try {
    $db = getDB();
    $steps['step6'] = 'Database connection successful';
} catch (Error $e) {
    echo json_encode([
        'success' => false,
        'error' => 'Database connection failed: ' . $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine(),
        'steps' => $steps
    ]);
    exit;
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => 'Database connection failed: ' . $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine(),
        'steps' => $steps
    ]);
    exit;
}

echo json_encode([
    'success' => true,
    'message' => 'All files loaded successfully',
    'steps' => $steps
], JSON_PRETTY_PRINT);

