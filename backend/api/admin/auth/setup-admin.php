<?php
/**
 * Setup Admin User
 * Run ONCE to create admin user with hashed password
 * POST /api/admin/auth/setup-admin.php
 */

// CORS headers
header('Access-Control-Allow-Origin: http://localhost:3000');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Credentials: true');
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../../../config/database.php';

try {
    $db = getDB();
    
    // Check if admin already exists
    $stmt = $db->prepare("SELECT id FROM admin_users WHERE email = ?");
    $stmt->execute(['admin@demo1.360coordinates.com']);
    
    if ($stmt->fetch()) {
        echo json_encode([
            'success' => false,
            'message' => 'Admin already exists'
        ]);
        exit;
    }
    
    // Hash the password
    $hashedPassword = password_hash('Admin@123456', PASSWORD_DEFAULT);
    
    // Insert admin user
    $stmt = $db->prepare("INSERT INTO admin_users (email, password, username, full_name, role, is_active, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())");
    $stmt->execute([
        'admin@demo1.360coordinates.com',
        $hashedPassword,
        'admin',
        'Admin User',
        'super_admin',
        1
    ]);
    
    echo json_encode([
        'success' => true,
        'message' => 'Admin created successfully'
    ]);
    
} catch (Exception $e) {
    error_log("Setup Admin Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Failed to create admin: ' . $e->getMessage()
    ]);
}
