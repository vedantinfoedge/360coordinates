<?php
/**
 * Forgot Password - Initialize
 * Validates email exists and returns identifier for OTP
 */

require_once __DIR__ . '/../../config/config.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../utils/response.php';
require_once __DIR__ . '/../../utils/validation.php';

handlePreflight();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendError('Method not allowed', null, 405);
}

try {
    $input = json_decode(file_get_contents('php://input'), true);
    $email = sanitizeInput($input['email'] ?? '');

    if (empty($email)) {
        sendError('Email is required', null, 400);
    }

    if (!validateEmail($email)) {
        sendError('Invalid email format', null, 400);
    }

    $db = getDB();
    
    $stmt = $db->prepare("SELECT id, email, phone FROM users WHERE LOWER(TRIM(email)) = LOWER(TRIM(?))");
    $stmt->execute([$email]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        sendError('No account found with this email address', null, 404);
    }

    sendSuccess('Account found. Please verify OTP.', [
        'identifier' => $user['email'],
        'phone' => $user['phone'] ?? null,
        'hasPhone' => !empty($user['phone'])
    ]);

} catch (PDOException $e) {
    error_log("Forgot Password Init Error: " . $e->getMessage());
    sendError('Database error. Please try again.', null, 500);
} catch (Exception $e) {
    error_log("Forgot Password Init Error: " . $e->getMessage());
    sendError('Something went wrong. Please try again.', null, 500);
}
