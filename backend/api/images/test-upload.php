<?php
/**
 * Simple test endpoint to check if moderate-and-upload.php can be loaded
 */

error_reporting(E_ALL);
ini_set('display_errors', 1);

header('Content-Type: application/json');

try {
    // Test if file can be parsed
    $file = __DIR__ . '/moderate-and-upload.php';
    
    if (!file_exists($file)) {
        echo json_encode(['error' => 'File not found']);
        exit;
    }
    
    // Check syntax
    $output = [];
    $return = 0;
    exec("php -l " . escapeshellarg($file) . " 2>&1", $output, $return);
    
    if ($return === 0) {
        echo json_encode([
            'status' => 'success',
            'message' => 'File syntax is valid',
            'output' => implode("\n", $output)
        ]);
    } else {
        echo json_encode([
            'status' => 'error',
            'message' => 'Syntax error found',
            'output' => implode("\n", $output),
            'return_code' => $return
        ]);
    }
} catch (Exception $e) {
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage()
    ]);
}

