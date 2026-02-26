<?php
/**
 * Fix Admin 2FA Columns
 * This will add the missing google2fa_secret and is_2fa_enabled columns to admin_users table
 * GET /api/admin/auth/fix-admin-2fa-columns.php
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

// For CLI execution, set HTTP_HOST to localhost to force local database config
if (php_sapi_name() === 'cli' && !isset($_SERVER['HTTP_HOST'])) {
    $_SERVER['HTTP_HOST'] = 'localhost';
}

require_once __DIR__ . '/../../../config/database.php';

try {
    $db = getDB();
    
    $results = [];
    $allSuccess = true;
    
    // Check if google2fa_secret column exists
    $stmt = $db->query("SHOW COLUMNS FROM admin_users LIKE 'google2fa_secret'");
    $google2faColumnExists = $stmt->rowCount() > 0;
    
    // Check if is_2fa_enabled column exists
    $stmt = $db->query("SHOW COLUMNS FROM admin_users LIKE 'is_2fa_enabled'");
    $is2faEnabledColumnExists = $stmt->rowCount() > 0;
    
    // Add google2fa_secret column if it doesn't exist
    if (!$google2faColumnExists) {
        try {
            $db->exec("ALTER TABLE admin_users ADD COLUMN google2fa_secret VARCHAR(32) NULL AFTER is_active");
            $results[] = [
                'column' => 'google2fa_secret',
                'status' => 'added',
                'message' => 'Column google2fa_secret added successfully'
            ];
        } catch (PDOException $e) {
            $allSuccess = false;
            $results[] = [
                'column' => 'google2fa_secret',
                'status' => 'error',
                'message' => 'Failed to add column: ' . $e->getMessage()
            ];
        }
    } else {
        $results[] = [
            'column' => 'google2fa_secret',
            'status' => 'exists',
            'message' => 'Column google2fa_secret already exists'
        ];
    }
    
    // Add is_2fa_enabled column if it doesn't exist
    if (!$is2faEnabledColumnExists) {
        try {
            // Get position after google2fa_secret if it exists, otherwise after is_active
            $db->exec("ALTER TABLE admin_users ADD COLUMN is_2fa_enabled TINYINT(1) DEFAULT 0 AFTER google2fa_secret");
            $results[] = [
                'column' => 'is_2fa_enabled',
                'status' => 'added',
                'message' => 'Column is_2fa_enabled added successfully'
            ];
        } catch (PDOException $e) {
            // If google2fa_secret doesn't exist yet, try adding after is_active
            try {
                $db->exec("ALTER TABLE admin_users ADD COLUMN is_2fa_enabled TINYINT(1) DEFAULT 0 AFTER is_active");
                $results[] = [
                    'column' => 'is_2fa_enabled',
                    'status' => 'added',
                    'message' => 'Column is_2fa_enabled added successfully (after is_active)'
                ];
            } catch (PDOException $e2) {
                $allSuccess = false;
                $results[] = [
                    'column' => 'is_2fa_enabled',
                    'status' => 'error',
                    'message' => 'Failed to add column: ' . $e2->getMessage()
                ];
            }
        }
    } else {
        $results[] = [
            'column' => 'is_2fa_enabled',
            'status' => 'exists',
            'message' => 'Column is_2fa_enabled already exists'
        ];
    }
    
    // Verify columns exist
    $stmt = $db->query("SHOW COLUMNS FROM admin_users");
    $columns = $stmt->fetchAll(PDO::FETCH_COLUMN);
    
    $google2faExists = in_array('google2fa_secret', $columns);
    $is2faEnabledExists = in_array('is_2fa_enabled', $columns);
    
    // Test query to ensure login.php will work
    $testQuery = false;
    if ($google2faExists && $is2faEnabledExists) {
        try {
            $stmt = $db->prepare("SELECT id, username, email, password, full_name, role, is_active, google2fa_secret, is_2fa_enabled FROM admin_users LIMIT 1");
            $stmt->execute();
            $testQuery = true;
        } catch (PDOException $e) {
            $testQuery = false;
        }
    }
    
    echo json_encode([
        'success' => $allSuccess && $google2faExists && $is2faEnabledExists && $testQuery,
        'message' => $allSuccess && $google2faExists && $is2faEnabledExists && $testQuery 
            ? 'All 2FA columns are now present and working!' 
            : 'Some columns may still be missing or there was an error.',
        'results' => $results,
        'verification' => [
            'google2fa_secret_exists' => $google2faExists,
            'is_2fa_enabled_exists' => $is2faEnabledExists,
            'test_query_success' => $testQuery,
            'all_columns' => $columns
        ],
        'next_steps' => $google2faExists && $is2faEnabledExists && $testQuery 
            ? 'You can now try logging in to the admin panel!' 
            : 'Please check the errors above and try again.'
    ], JSON_PRETTY_PRINT);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'trace' => $e->getTraceAsString()
    ], JSON_PRETTY_PRINT);
}

