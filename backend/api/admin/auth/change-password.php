<?php
/**
 * Admin Change Password API
 * POST /api/admin/auth/change-password.php
 */

require_once __DIR__ . '/../../../config/config.php';
require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../../utils/response.php';
require_once __DIR__ . '/../../../utils/admin_auth.php';

handlePreflight();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendError('Method not allowed', null, 405);
}

try {
    $admin = requireAdmin();
    $db = getDB();
    
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($input['current_password']) || !isset($input['new_password']) || !isset($input['confirm_password'])) {
        sendError('Current password, new password, and confirm password are required', null, 400);
    }
    
    $currentPassword = $input['current_password'];
    $newPassword = $input['new_password'];
    $confirmPassword = $input['confirm_password'];
    
    // Validate new password
    if (strlen($newPassword) < 8) {
        sendError('New password must be at least 8 characters long', null, 400);
    }
    
    if ($newPassword !== $confirmPassword) {
        sendError('New password and confirm password do not match', null, 400);
    }
    
    // Get current admin password
    $stmt = $db->prepare("SELECT password FROM admin_users WHERE id = ?");
    $stmt->execute([$admin['id']]);
    $adminData = $stmt->fetch();
    
    if (!$adminData) {
        sendError('Admin user not found', null, 404);
    }
    
    // Verify current password
    if (!password_verify($currentPassword, $adminData['password'])) {
        sendError('Current password is incorrect', null, 401);
    }
    
    // Hash new password
    $hashedPassword = password_hash($newPassword, PASSWORD_DEFAULT);
    
    // Update password
    $stmt = $db->prepare("UPDATE admin_users SET password = ?, updated_at = NOW() WHERE id = ?");
    $result = $stmt->execute([$hashedPassword, $admin['id']]);
    
    if ($result) {
        sendSuccess('Password changed successfully');
    } else {
        sendError('Failed to change password', null, 500);
    }
    
} catch (Exception $e) {
    error_log("Admin Change Password Error: " . $e->getMessage());
    sendError('Failed to change password', null, 500);
}
