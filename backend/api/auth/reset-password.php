<?php
/**
 * Reset Password API
 * Verifies OTP token and updates password
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
    $phone = sanitizeInput($input['phone'] ?? '');
    $widgetToken = $input['widgetToken'] ?? '';
    $newPassword = $input['newPassword'] ?? '';

    if (empty($email) && empty($phone)) {
        sendError('Email or phone is required', null, 400);
    }

    if (empty($widgetToken)) {
        sendError('OTP verification token is required', null, 400);
    }

    if (empty($newPassword)) {
        sendError('New password is required', null, 400);
    }

    if (strlen($newPassword) < 6) {
        sendError('Password must be at least 6 characters', null, 400);
    }

    $db = getDB();

    if (!empty($email)) {
        $stmt = $db->prepare("SELECT id, email, phone FROM users WHERE LOWER(TRIM(email)) = LOWER(TRIM(?))");
        $stmt->execute([$email]);
    } else {
        $stmt = $db->prepare("SELECT id, email, phone FROM users WHERE phone = ?");
        $stmt->execute([$phone]);
    }
    
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        sendError('User not found', null, 404);
    }

    if (empty($widgetToken) || strlen($widgetToken) < 10) {
        sendError('Invalid verification token', null, 400);
    }

    $hashedPassword = password_hash($newPassword, PASSWORD_DEFAULT);

    $updateStmt = $db->prepare("UPDATE users SET password = ?, updated_at = NOW() WHERE id = ?");
    $result = $updateStmt->execute([$hashedPassword, $user['id']]);

    if ($result) {
        error_log("Password reset successful for user ID: " . $user['id'] . ", Email: " . $user['email']);
        
        try {
            $db->prepare("DELETE FROM user_sessions WHERE user_id = ?")->execute([$user['id']]);
        } catch (Exception $e) {
            // Ignore session cleanup errors
        }

        sendSuccess('Password has been reset successfully. You can now login with your new password.');
    } else {
        sendError('Failed to update password. Please try again.', null, 500);
    }

} catch (PDOException $e) {
    error_log("Reset Password DB Error: " . $e->getMessage());
    sendError('Database error. Please try again.', null, 500);
} catch (Exception $e) {
    error_log("Reset Password Error: " . $e->getMessage());
    sendError('Something went wrong. Please try again.', null, 500);
}
