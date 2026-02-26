<?php
/**
 * Register Device Token for FCM Push Notifications
 * POST /api/device-token/register.php
 * 
 * Saves or updates the FCM device token for the authenticated user.
 * Call this from the mobile app after login and when the token is refreshed.
 */

require_once __DIR__ . '/../../config/config.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../utils/response.php';
require_once __DIR__ . '/../../utils/validation.php';
require_once __DIR__ . '/../../utils/auth.php';

handlePreflight();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendError('Method not allowed', null, 405);
}

try {
    $user = requireAuth();
    $userId = $user['id'];

    $input = json_decode(file_get_contents('php://input'), true);
    $deviceToken = isset($input['device_token']) ? trim($input['device_token']) : '';
    $platform = isset($input['platform']) ? strtolower(trim($input['platform'])) : 'android';

    if (empty($deviceToken)) {
        sendError('Device token is required', ['errors' => ['device_token' => 'Device token is required']], 400);
    }

    if (strlen($deviceToken) < 50 || strlen($deviceToken) > 255) {
        sendError('Invalid device token format', ['errors' => ['device_token' => 'Device token must be between 50 and 255 characters']], 400);
    }

    if (!in_array($platform, ['android', 'ios'])) {
        $platform = 'android';
    }

    $db = getDB();

    // Upsert: insert or update on duplicate (user_id, device_token)
    $stmt = $db->prepare("
        INSERT INTO device_tokens (user_id, device_token, platform)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE platform = VALUES(platform), updated_at = CURRENT_TIMESTAMP
    ");
    $stmt->execute([$userId, $deviceToken, $platform]);

    sendSuccess('Device token registered successfully', [
        'registered' => true,
        'platform' => $platform
    ]);

} catch (Exception $e) {
    error_log("Device Token Register Error: " . $e->getMessage());
    sendError('Failed to register device token', null, 500);
}
