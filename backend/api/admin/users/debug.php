<?php
/**
 * Debug Users API
 * Check what's causing the 500 error
 */

error_reporting(E_ALL);
ini_set('display_errors', 1);
ob_start();

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

require_once __DIR__ . '/../../../config/config.php';
require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../../utils/response.php';
require_once __DIR__ . '/../../../utils/admin_auth.php';

$errors = [];
$info = [];

try {
    $info[] = "Step 1: Loading config files... OK";
    
    $admin = requireAdmin();
    $info[] = "Step 2: Admin authentication... OK (ID: " . $admin['id'] . ")";
    
    $db = getDB();
    $info[] = "Step 3: Database connection... OK";
    
    // Check if users table exists
    $stmt = $db->query("SHOW TABLES LIKE 'users'");
    if ($stmt->rowCount() === 0) {
        $errors[] = "Users table does not exist";
    } else {
        $info[] = "Step 4: Users table exists... OK";
    }
    
    // Get table structure
    $stmt = $db->query("DESCRIBE users");
    $columns = $stmt->fetchAll(PDO::FETCH_ASSOC);
    $columnNames = array_column($columns, 'Field');
    $info[] = "Step 5: Table columns: " . implode(', ', $columnNames);
    
    // Check required columns
    $requiredColumns = ['id', 'full_name', 'email', 'user_type', 'created_at'];
    $missingColumns = array_diff($requiredColumns, $columnNames);
    if (!empty($missingColumns)) {
        $errors[] = "Missing columns: " . implode(', ', $missingColumns);
    }
    
    // Try simple query
    $stmt = $db->query("SELECT COUNT(*) as total FROM users");
    $totalResult = $stmt->fetch(PDO::FETCH_ASSOC);
    $total = intval($totalResult['total'] ?? 0);
    $info[] = "Step 6: Total users count: {$total}";
    
    // Try fetching one user (with profile_image from user_profiles)
    if ($total > 0) {
        $stmt = $db->query("SELECT u.id, u.full_name, u.email, u.phone, u.user_type, u.email_verified, u.phone_verified, up.profile_image, u.is_banned, u.created_at FROM users u LEFT JOIN user_profiles up ON u.id = up.user_id LIMIT 1");
        $sampleUser = $stmt->fetch(PDO::FETCH_ASSOC);
        $info[] = "Step 7: Sample user fetched: " . json_encode($sampleUser);
    }
    
    // Test property count query
    if ($total > 0) {
        $stmt = $db->query("SELECT id FROM users LIMIT 1");
        $testUser = $stmt->fetch(PDO::FETCH_ASSOC);
        $userId = intval($testUser['id'] ?? 0);
        
        if ($userId > 0) {
            $propStmt = $db->prepare("SELECT COUNT(*) as count FROM properties WHERE user_id = ?");
            $propStmt->execute([$userId]);
            $propResult = $propStmt->fetch(PDO::FETCH_ASSOC);
            $info[] = "Step 8: Property count query for user {$userId}: " . ($propResult['count'] ?? 0);
        }
    }
    
} catch (PDOException $e) {
    $errors[] = "PDO Error: " . $e->getMessage();
    $errors[] = "SQL State: " . ($e->errorInfo[0] ?? 'N/A');
    $errors[] = "Error Code: " . $e->getCode();
} catch (Exception $e) {
    $errors[] = "Error: " . $e->getMessage();
    $errors[] = "File: " . $e->getFile();
    $errors[] = "Line: " . $e->getLine();
}

ob_end_clean();

echo json_encode([
    'success' => empty($errors),
    'info' => $info,
    'errors' => $errors
], JSON_PRETTY_PRINT);
