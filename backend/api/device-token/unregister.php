<?php
/**
 * Unregister Device Token for FCM Push Notifications
 * POST /api/device-token/unregister.php
 * 
 * Removes the FCM device token for the authenticated user.
 * Call this from the mobile app on logout.
 */

require_once __DIR__ . '/../../config/config.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../utils/response.php';
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

    if (empty($deviceToken)) {
        sendError('Device token is required', ['errors' => ['device_token' => 'Device token is required']], 400);
    }

    $db = getDB();
    $stmt = $db->prepare("DELETE FROM device_tokens WHERE user_id = ? AND device_token = ?");
    $stmt->execute([$userId, $deviceToken]);

    sendSuccess('Device token unregistered successfully', [
        'unregistered' => true,
        'deleted' => $stmt->rowCount() > 0
    ]);

} catch (Exception $e) {
    error_log("Device Token Unregister Error: " . $e->getMessage());
    sendError('Failed to unregister device token', null, 500);
}
