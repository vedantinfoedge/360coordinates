<?php
/**
 * Admin Update User API
 * PUT /api/admin/users/update.php?id={id}
 */

require_once __DIR__ . '/../../../config/config.php';
require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../../utils/response.php';
require_once __DIR__ . '/../../../utils/admin_auth.php';

handlePreflight();

if ($_SERVER['REQUEST_METHOD'] !== 'PUT') {
    sendError('Method not allowed', null, 405);
}

try {
    $admin = requireAdmin();
    $db = getDB();
    
    $userId = isset($_GET['id']) ? intval($_GET['id']) : 0;
    if (!$userId) {
        sendError('User ID is required', null, 400);
    }
    
    $data = json_decode(file_get_contents('php://input'), true);
    
    // Check if user exists
    $stmt = $db->prepare("SELECT id FROM users WHERE id = ?");
    $stmt->execute([$userId]);
    if (!$stmt->fetch()) {
        sendError('User not found', null, 404);
    }
    
    $updates = [];
    $params = [];
    
    // Ban/Unban user
    if (isset($data['is_banned'])) {
        $updates[] = "is_banned = ?";
        $params[] = $data['is_banned'] ? 1 : 0;
        
        if (isset($data['ban_reason'])) {
            // Check if ban_reason column exists, if not we'll add it via migration
            $updates[] = "ban_reason = ?";
            $params[] = $data['ban_reason'];
        }
    }
    
    // Verify email/phone
    if (isset($data['email_verified'])) {
        $updates[] = "email_verified = ?";
        $params[] = $data['email_verified'] ? 1 : 0;
    }
    
    if (isset($data['phone_verified'])) {
        $updates[] = "phone_verified = ?";
        $params[] = $data['phone_verified'] ? 1 : 0;
    }
    
    if (empty($updates)) {
        sendError('No valid fields to update', null, 400);
    }
    
    $params[] = $userId;
    
    $query = "UPDATE users SET " . implode(", ", $updates) . " WHERE id = ?";
    $stmt = $db->prepare($query);
    $stmt->execute($params);
    
    // Get updated user
    $stmt = $db->prepare("SELECT id, full_name, email, phone, user_type, email_verified, phone_verified, is_banned FROM users WHERE id = ?");
    $stmt->execute([$userId]);
    $user = $stmt->fetch();
    
    sendSuccess('User updated successfully', ['user' => $user]);
    
} catch (Exception $e) {
    error_log("Admin Update User Error: " . $e->getMessage());
    sendError('Failed to update user', null, 500);
}
