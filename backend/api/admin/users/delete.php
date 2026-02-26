<?php
/**
 * Admin Delete User API
 * DELETE /api/admin/users/delete.php?id={id}
 */

require_once __DIR__ . '/../../../config/config.php';
require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../../utils/response.php';
require_once __DIR__ . '/../../../utils/admin_auth.php';

handlePreflight();

if ($_SERVER['REQUEST_METHOD'] !== 'DELETE') {
    sendError('Method not allowed', null, 405);
}

try {
    $admin = requireAdmin();
    $db = getDB();
    
    $userId = isset($_GET['id']) ? intval($_GET['id']) : 0;
    if (!$userId) {
        sendError('User ID is required', null, 400);
    }
    
    // Check if user exists
    $stmt = $db->prepare("SELECT id, full_name, email FROM users WHERE id = ?");
    $stmt->execute([$userId]);
    $user = $stmt->fetch();
    
    if (!$user) {
        sendError('User not found', null, 404);
    }
    
    // Delete user (cascade will handle related records)
    $stmt = $db->prepare("DELETE FROM users WHERE id = ?");
    $stmt->execute([$userId]);
    
    sendSuccess('User deleted successfully', ['deleted_user' => $user]);
    
} catch (Exception $e) {
    error_log("Admin Delete User Error: " . $e->getMessage());
    sendError('Failed to delete user', null, 500);
}
