<?php
ini_set('display_errors', 1);
error_reporting(E_ALL);
header('Content-Type: application/json');

// Minimal upload test - no auth, no moderation, no database
try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        echo json_encode(['error' => 'POST only']);
        exit;
    }

    echo json_encode(['step' => 1, 'files' => $_FILES ? array_keys($_FILES) : 'none', 'post' => $_POST ? array_keys($_POST) : 'none']);
    
    if (empty($_FILES)) {
        echo json_encode(['step' => 2, 'error' => 'No files received']);
        exit;
    }

    $file = $_FILES['image'] ?? $_FILES['images'] ?? $_FILES['file'] ?? null;
    
    if (!$file) {
        echo json_encode(['step' => 3, 'error' => 'No recognized file key', 'keys' => array_keys($_FILES)]);
        exit;
    }

    echo json_encode([
        'step' => 4,
        'name' => $file['name'],
        'size' => $file['size'],
        'tmp_name' => $file['tmp_name'],
        'error' => $file['error'],
        'tmp_exists' => file_exists($file['tmp_name'])
    ]);

    // Try to save
    $dest = '/home/u449667423/domains/360coordinates.com/public_html/demo1/backend/uploads/temp/test_' . time() . '.jpg';
    
    if (move_uploaded_file($file['tmp_name'], $dest)) {
        echo json_encode(['step' => 5, 'success' => true, 'saved_to' => $dest]);
        unlink($dest); // cleanup
    } else {
        echo json_encode(['step' => 5, 'success' => false, 'error' => error_get_last()]);
    }

} catch (Throwable $e) {
    echo json_encode(['error' => $e->getMessage(), 'line' => $e->getLine()]);
}