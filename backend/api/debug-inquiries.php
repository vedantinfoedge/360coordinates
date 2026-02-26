<?php
/**
 * Debug Seller Inquiries API
 * Use this to see the actual error
 */

// Enable error reporting temporarily
error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../utils/response.php';
require_once __DIR__ . '/../utils/auth.php';
require_once __DIR__ . '/../utils/validation.php';

header('Content-Type: application/json');

try {
    echo "Step 1: Config loaded\n";
    
    // Test database connection
    $db = getDB();
    echo "Step 2: Database connected\n";
    
    // Test constants
    if (!defined('MAX_PAGE_SIZE')) {
        throw new Exception('MAX_PAGE_SIZE not defined');
    }
    if (!defined('DEFAULT_PAGE_SIZE')) {
        throw new Exception('DEFAULT_PAGE_SIZE not defined');
    }
    echo "Step 3: Constants defined\n";
    
    // Test authentication
    try {
        $user = requireUserType(['seller', 'agent']);
        echo "Step 4: User authenticated - ID: " . $user['id'] . "\n";
    } catch (Exception $e) {
        echo "Step 4: Auth error - " . $e->getMessage() . "\n";
        exit;
    }
    
    // Test if tables exist
    $tables = ['inquiries', 'properties', 'users', 'user_profiles'];
    foreach ($tables as $table) {
        $stmt = $db->query("SHOW TABLES LIKE '$table'");
        if ($stmt->rowCount() == 0) {
            throw new Exception("Table '$table' does not exist");
        }
    }
    echo "Step 5: All tables exist\n";
    
    // Test query
    $query = "
        SELECT i.*,
               p.id as property_id,
               p.title as property_title,
               u.full_name as buyer_name
        FROM inquiries i
        INNER JOIN properties p ON i.property_id = p.id
        LEFT JOIN users u ON i.buyer_id = u.id
        WHERE i.seller_id = ?
        LIMIT 1
    ";
    
    $stmt = $db->prepare($query);
    $stmt->execute([$user['id']]);
    $result = $stmt->fetch();
    
    echo "Step 6: Query executed successfully\n";
    echo json_encode(['success' => true, 'test_inquiry' => $result], JSON_PRETTY_PRINT);
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine(),
        'trace' => $e->getTraceAsString()
    ], JSON_PRETTY_PRINT);
}

