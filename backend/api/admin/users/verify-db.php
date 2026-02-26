<?php
/**
 * Verify Database Structure
 * Check if users table exists and has correct structure
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

require_once __DIR__ . '/../../../config/database.php';

$results = [];

try {
    $db = getDB();
    $results['database_connection'] = 'OK';
    
    // Check if users table exists
    $stmt = $db->query("SHOW TABLES LIKE 'users'");
    $tableExists = $stmt->rowCount() > 0;
    $results['table_exists'] = $tableExists;
    
    if (!$tableExists) {
        echo json_encode([
            'success' => false,
            'error' => 'Users table does not exist',
            'results' => $results
        ], JSON_PRETTY_PRINT);
        exit;
    }
    
    // Get table structure
    $stmt = $db->query("DESCRIBE users");
    $columns = $stmt->fetchAll(PDO::FETCH_ASSOC);
    $results['columns'] = $columns;
    $results['column_count'] = count($columns);
    
    // Get column names
    $columnNames = array_column($columns, 'Field');
    $results['column_names'] = $columnNames;
    
    // Check for required columns
    $required = ['id', 'full_name', 'email', 'user_type', 'created_at'];
    $missing = array_diff($required, $columnNames);
    $results['required_columns_check'] = [
        'required' => $required,
        'missing' => $missing,
        'all_present' => empty($missing)
    ];
    
    // Check primary key
    $primaryKey = null;
    foreach ($columns as $col) {
        if ($col['Key'] === 'PRI') {
            $primaryKey = $col['Field'];
            break;
        }
    }
    $results['primary_key'] = $primaryKey;
    
    // Count users
    $stmt = $db->query("SELECT COUNT(*) as total FROM users");
    $total = $stmt->fetch(PDO::FETCH_ASSOC);
    $results['total_users'] = intval($total['total']);
    
    // Get sample user with all columns
    if ($results['total_users'] > 0) {
        $stmt = $db->query("SELECT * FROM users LIMIT 1");
        $sampleUser = $stmt->fetch(PDO::FETCH_ASSOC);
        $results['sample_user'] = $sampleUser;
        $results['sample_user_keys'] = array_keys($sampleUser);
    }
    
    // Test the exact query we use in list.php (with profile_image from user_profiles)
    $testQuery = "SELECT u.id, u.full_name, u.email, u.phone, u.user_type, u.email_verified, u.phone_verified, up.profile_image, u.is_banned, u.created_at FROM users u LEFT JOIN user_profiles up ON u.id = up.user_id LIMIT 1";
    try {
        $stmt = $db->query($testQuery);
        $testUser = $stmt->fetch(PDO::FETCH_ASSOC);
        $results['test_query_success'] = true;
        $results['test_query_result'] = $testUser;
    } catch (Exception $e) {
        $results['test_query_success'] = false;
        $results['test_query_error'] = $e->getMessage();
    }
    
    // Check properties table for user_id
    $stmt = $db->query("SHOW TABLES LIKE 'properties'");
    $propsTableExists = $stmt->rowCount() > 0;
    $results['properties_table_exists'] = $propsTableExists;
    
    if ($propsTableExists) {
        $stmt = $db->query("DESCRIBE properties");
        $propColumns = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $propColumnNames = array_column($propColumns, 'Field');
        $results['properties_has_user_id'] = in_array('user_id', $propColumnNames);
    }
    
    // Check inquiries table for seller_id
    $stmt = $db->query("SHOW TABLES LIKE 'inquiries'");
    $inqTableExists = $stmt->rowCount() > 0;
    $results['inquiries_table_exists'] = $inqTableExists;
    
    if ($inqTableExists) {
        $stmt = $db->query("DESCRIBE inquiries");
        $inqColumns = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $inqColumnNames = array_column($inqColumns, 'Field');
        $results['inquiries_has_seller_id'] = in_array('seller_id', $inqColumnNames);
    }
    
    echo json_encode([
        'success' => true,
        'results' => $results
    ], JSON_PRETTY_PRINT);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine(),
        'trace' => $e->getTraceAsString(),
        'results' => $results
    ], JSON_PRETTY_PRINT);
}
