<?php
/**
 * Direct test of session creation
 * URL: https://360coordinates.com/backend/api/admin/auth/test-session-create.php
 */

error_reporting(E_ALL);
ini_set('display_errors', 1);
header('Content-Type: application/json');

$results = [];

// Step 1: Start session
session_start();
$sessionId = session_id();
$results['step1_session_id'] = $sessionId;

// Step 2: Connect to DB
require_once __DIR__ . '/../../../config/database.php';

try {
    $db = getDB();
    $results['step2_db'] = 'Connected';
} catch (Exception $e) {
    $results['step2_db'] = 'FAILED: ' . $e->getMessage();
    echo json_encode($results, JSON_PRETTY_PRINT);
    exit;
}

// Step 3: Check if table exists
try {
    $stmt = $db->query("SHOW TABLES LIKE 'admin_sessions'");
    $tableExists = $stmt->rowCount() > 0;
    $results['step3_table_exists'] = $tableExists;
} catch (Exception $e) {
    $results['step3_table_exists'] = 'ERROR: ' . $e->getMessage();
}

// Step 4: Show table structure
try {
    $stmt = $db->query("DESCRIBE admin_sessions");
    $results['step4_table_structure'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
} catch (Exception $e) {
    $results['step4_table_structure'] = 'ERROR: ' . $e->getMessage();
}

// Step 5: Try direct INSERT
try {
    $testSessionId = 'test_' . time();
    $adminId = 1;
    $adminMobile = '+917888076881';
    $adminRole = 'super_admin';
    $adminEmail = 'admin@demo1.360coordinates.com';
    $ip = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
    $expiresAt = date('Y-m-d H:i:s', time() + 86400);
    
    $sql = "INSERT INTO admin_sessions (session_id, admin_id, admin_mobile, admin_role, admin_email, ip_address, created_at, last_activity, expires_at) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW(), ?)";
    
    $stmt = $db->prepare($sql);
    $result = $stmt->execute([$testSessionId, $adminId, $adminMobile, $adminRole, $adminEmail, $ip, $expiresAt]);
    
    $results['step5_insert'] = [
        'success' => $result,
        'rows_affected' => $stmt->rowCount(),
        'last_insert_id' => $db->lastInsertId()
    ];
} catch (PDOException $e) {
    $results['step5_insert'] = [
        'success' => false,
        'error' => $e->getMessage(),
        'code' => $e->getCode(),
        'info' => $e->errorInfo
    ];
}

// Step 6: Verify INSERT
try {
    $stmt = $db->query("SELECT * FROM admin_sessions ORDER BY id DESC LIMIT 3");
    $results['step6_sessions_in_db'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
} catch (Exception $e) {
    $results['step6_sessions_in_db'] = 'ERROR: ' . $e->getMessage();
}

// Step 7: Clean up test session
try {
    $db->exec("DELETE FROM admin_sessions WHERE session_id LIKE 'test_%'");
    $results['step7_cleanup'] = 'Done';
} catch (Exception $e) {
    $results['step7_cleanup'] = 'ERROR: ' . $e->getMessage();
}

echo json_encode($results, JSON_PRETTY_PRINT);

