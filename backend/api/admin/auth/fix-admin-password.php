<?php
/**
 * Fix Admin Password
 * This will check and update admin password to Admin@123456
 * GET /api/admin/auth/fix-admin-password.php
 */

// For CLI execution, set HTTP_HOST to localhost to force local database config
if (php_sapi_name() === 'cli' && !isset($_SERVER['HTTP_HOST'])) {
    $_SERVER['HTTP_HOST'] = 'localhost';
}

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

require_once __DIR__ . '/../../../config/database.php';

try {
    $db = getDB();
    
    $email = 'admin@demo1.360coordinates.com';
    $password = 'Admin@123456';
    
    // Get current admin
    $stmt = $db->prepare("SELECT id, email, password FROM admin_users WHERE email = ?");
    $stmt->execute([$email]);
    $admin = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$admin) {
        // Create admin if doesn't exist
        $hashedPassword = password_hash($password, PASSWORD_DEFAULT);
        $stmt = $db->prepare("INSERT INTO admin_users (email, password, username, full_name, role, is_active, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())");
        $stmt->execute([
            $email,
            $hashedPassword,
            'admin',
            'Admin User',
            'super_admin',
            1
        ]);
        
        echo json_encode([
            'success' => true,
            'message' => 'Admin user created with password: ' . $password,
            'email' => $email,
            'password' => $password
        ], JSON_PRETTY_PRINT);
        exit;
    }
    
    // Check current password
    $currentValid = !empty($admin['password']) ? password_verify($password, $admin['password']) : false;
    
    // Check if account is active
    $stmt = $db->prepare("SELECT is_active FROM admin_users WHERE email = ?");
    $stmt->execute([$email]);
    $activeCheck = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($currentValid) {
        // Password is correct, but ensure account is active
        if (empty($activeCheck['is_active']) || !$activeCheck['is_active']) {
            $stmt = $db->prepare("UPDATE admin_users SET is_active = 1 WHERE email = ?");
            $stmt->execute([$email]);
            
            echo json_encode([
                'success' => true,
                'message' => 'Password is correct! Account activated.',
                'email' => $email,
                'password' => $password,
                'status' => 'Password verified and account activated'
            ], JSON_PRETTY_PRINT);
        } else {
            echo json_encode([
                'success' => true,
                'message' => 'Password is already correct!',
                'email' => $email,
                'password' => $password,
                'status' => 'Password verified successfully'
            ], JSON_PRETTY_PRINT);
        }
        exit;
    }
    
    // Password is wrong - update it
    $hashedPassword = password_hash($password, PASSWORD_DEFAULT);
    // Also ensure is_active is set to 1
    $stmt = $db->prepare("UPDATE admin_users SET password = ?, is_active = 1 WHERE email = ?");
    $result = $stmt->execute([$hashedPassword, $email]);
    
    if ($result) {
        // Verify it works
        $stmt = $db->prepare("SELECT password FROM admin_users WHERE email = ?");
        $stmt->execute([$email]);
        $updatedAdmin = $stmt->fetch(PDO::FETCH_ASSOC);
        $verified = password_verify($password, $updatedAdmin['password']);
        
        echo json_encode([
            'success' => true,
            'message' => 'Password updated successfully!',
            'email' => $email,
            'password' => $password,
            'verified' => $verified,
            'action' => 'Password has been set to: ' . $password
        ], JSON_PRETTY_PRINT);
    } else {
        echo json_encode([
            'success' => false,
            'message' => 'Failed to update password'
        ], JSON_PRETTY_PRINT);
    }
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'trace' => $e->getTraceAsString()
    ], JSON_PRETTY_PRINT);
}
