<?php
/**
 * Test endpoint to check what method the server receives
 * This helps debug the POST vs GET issue
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$result = [
    'received_method' => $_SERVER['REQUEST_METHOD'] ?? 'UNKNOWN',
    'content_type' => $_SERVER['CONTENT_TYPE'] ?? 'NOT SET',
    'request_uri' => $_SERVER['REQUEST_URI'] ?? 'NOT SET',
    'has_post' => !empty($_POST),
    'has_files' => !empty($_FILES),
    'has_get' => !empty($_GET),
    'post_data' => $_POST,
    'get_data' => $_GET,
    'files_data' => array_keys($_FILES),
    'input_size' => strlen(file_get_contents('php://input')),
    'server_vars' => [
        'REQUEST_METHOD' => $_SERVER['REQUEST_METHOD'] ?? 'NOT SET',
        'HTTP_X_HTTP_METHOD_OVERRIDE' => $_SERVER['HTTP_X_HTTP_METHOD_OVERRIDE'] ?? 'NOT SET',
        'REDIRECT_REQUEST_METHOD' => $_SERVER['REDIRECT_REQUEST_METHOD'] ?? 'NOT SET',
    ]
];

echo json_encode($result, JSON_PRETTY_PRINT);
