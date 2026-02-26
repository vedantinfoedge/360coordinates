<?php
/**
 * Error Handler
 * Returns JSON error response for 404/500 errors
 */

require_once __DIR__ . '/../utils/response.php';

// Set CORS headers
setCorsHeaders();

// Get status code from query string or default to 404
$statusCode = isset($_GET['code']) ? (int)$_GET['code'] : 404;
http_response_code($statusCode);

echo json_encode([
    'success' => false,
    'message' => $statusCode === 404 ? 'Endpoint not found' : 'Internal server error',
    'data' => null
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
exit();

