<?php
/**
 * Debug Test File
 * Use this to diagnose 500 errors on Hostinger
 * 
 * Access: https://360coordinates.com/backend/api/debug-test.php
 * 
 * IMPORTANT: Delete this file after debugging for security!
 */

// Enable all error reporting
error_reporting(E_ALL);
ini_set('display_errors', 1);
ini_set('log_errors', 1);

// Set JSON header
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Handle preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$results = [
    'timestamp' => date('Y-m-d H:i:s'),
    'server_info' => [],
    'config_check' => [],
    'database_check' => [],
    'authorization_check' => [],
    'tables_check' => [],
    'errors' => []
];

try {
    // 1. Server Information
    $results['server_info'] = [
        'php_version' => PHP_VERSION,
        'server_software' => $_SERVER['SERVER_SOFTWARE'] ?? 'Unknown',
        'document_root' => $_SERVER['DOCUMENT_ROOT'] ?? 'Unknown',
        'script_filename' => __FILE__,
        'request_method' => $_SERVER['REQUEST_METHOD'] ?? 'Unknown',
        'request_uri' => $_SERVER['REQUEST_URI'] ?? 'Unknown',
    ];
    
    // 2. Check if config files exist
    $configPath = __DIR__ . '/../config/config.php';
    $databasePath = __DIR__ . '/../config/database.php';
    
    $results['config_check'] = [
        'config_exists' => file_exists($configPath),
        'database_config_exists' => file_exists($databasePath),
        'config_readable' => is_readable($configPath),
        'database_config_readable' => is_readable($databasePath),
    ];
    
    // 3. Try to load config
    if (file_exists($configPath)) {
        try {
            require_once $configPath;
            $results['config_check']['config_loaded'] = true;
            $results['config_check']['base_url'] = defined('BASE_URL') ? BASE_URL : 'NOT DEFINED';
            $results['config_check']['environment'] = defined('ENVIRONMENT') ? ENVIRONMENT : 'NOT DEFINED';
        } catch (Exception $e) {
            $results['config_check']['config_loaded'] = false;
            $results['config_check']['config_error'] = $e->getMessage();
            $results['errors'][] = 'Config load error: ' . $e->getMessage();
        }
    }
    
    // 4. Try to load database config and connect
    if (file_exists($databasePath)) {
        try {
            require_once $databasePath;
            $results['database_check']['database_config_loaded'] = true;
            
            // Check if constants are defined
            $results['database_check']['db_host'] = defined('DB_HOST') ? DB_HOST : 'NOT DEFINED';
            $results['database_check']['db_name'] = defined('DB_NAME') ? DB_NAME : 'NOT DEFINED';
            $results['database_check']['db_user'] = defined('DB_USER') ? DB_USER : 'NOT DEFINED';
            $results['database_check']['db_pass'] = defined('DB_PASS') ? (DB_PASS ? '***SET***' : 'NOT SET') : 'NOT DEFINED';
            
            // Try to connect
            if (defined('DB_HOST') && defined('DB_NAME') && defined('DB_USER') && defined('DB_PASS')) {
                try {
                    $dsn = "mysql:host=" . DB_HOST . ";port=" . (defined('DB_PORT') ? DB_PORT : '3306') . ";dbname=" . DB_NAME . ";charset=utf8mb4";
                    $options = [
                        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    ];
                    
                    $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
                    $results['database_check']['connection'] = 'SUCCESS';
                    
                    // List all tables
                    $tablesQuery = $pdo->query("SHOW TABLES");
                    $tables = $tablesQuery->fetchAll(PDO::FETCH_COLUMN);
                    $results['tables_check']['all_tables'] = $tables;
                    $results['tables_check']['table_count'] = count($tables);
                    
                    // Check for required tables
                    $requiredTables = ['users', 'properties', 'inquiries', 'user_profiles', 'user_sessions'];
                    $results['tables_check']['required_tables'] = [];
                    foreach ($requiredTables as $table) {
                        $results['tables_check']['required_tables'][$table] = in_array($table, $tables);
                    }
                    
                    // Check if users table has profile_image column
                    if (in_array('users', $tables)) {
                        try {
                            $columnsQuery = $pdo->query("SHOW COLUMNS FROM users LIKE 'profile_image'");
                            $results['tables_check']['users_has_profile_image'] = $columnsQuery->rowCount() > 0;
                        } catch (Exception $e) {
                            $results['tables_check']['users_has_profile_image'] = false;
                            $results['errors'][] = 'Error checking users.profile_image: ' . $e->getMessage();
                        }
                    }
                    
                } catch (PDOException $e) {
                    $results['database_check']['connection'] = 'FAILED';
                    $results['database_check']['connection_error'] = $e->getMessage();
                    $results['errors'][] = 'Database connection failed: ' . $e->getMessage();
                }
            } else {
                $results['database_check']['connection'] = 'SKIPPED - Missing constants';
                $results['errors'][] = 'Database constants not fully defined';
            }
            
        } catch (Exception $e) {
            $results['database_check']['database_config_loaded'] = false;
            $results['database_check']['database_config_error'] = $e->getMessage();
            $results['errors'][] = 'Database config load error: ' . $e->getMessage();
        }
    }
    
    // 5. Check Authorization header
    $authHeader = null;
    $authSources = [];
    
    // Method 1: getallheaders
    if (function_exists('getallheaders')) {
        $headers = getallheaders();
        $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? null;
        if ($authHeader) {
            $authSources[] = 'getallheaders()';
        }
    }
    
    // Method 2: $_SERVER variations
    if (empty($authHeader)) {
        if (isset($_SERVER['HTTP_AUTHORIZATION'])) {
            $authHeader = $_SERVER['HTTP_AUTHORIZATION'];
            $authSources[] = '$_SERVER[HTTP_AUTHORIZATION]';
        } elseif (isset($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) {
            $authHeader = $_SERVER['REDIRECT_HTTP_AUTHORIZATION'];
            $authSources[] = '$_SERVER[REDIRECT_HTTP_AUTHORIZATION]';
        }
    }
    
    // Method 3: apache_request_headers
    if (empty($authHeader) && function_exists('apache_request_headers')) {
        $apacheHeaders = apache_request_headers();
        $authHeader = $apacheHeaders['Authorization'] ?? null;
        if ($authHeader) {
            $authSources[] = 'apache_request_headers()';
        }
    }
    
    $results['authorization_check'] = [
        'header_found' => !empty($authHeader),
        'header_value' => $authHeader ? (strlen($authHeader) > 20 ? substr($authHeader, 0, 20) . '...' : $authHeader) : 'NOT FOUND',
        'sources_checked' => [
            'getallheaders_exists' => function_exists('getallheaders'),
            'apache_request_headers_exists' => function_exists('apache_request_headers'),
            'HTTP_AUTHORIZATION_set' => isset($_SERVER['HTTP_AUTHORIZATION']),
            'REDIRECT_HTTP_AUTHORIZATION_set' => isset($_SERVER['REDIRECT_HTTP_AUTHORIZATION']),
        ],
        'found_in' => $authSources,
        'all_headers' => function_exists('getallheaders') ? getallheaders() : 'getallheaders() not available',
    ];
    
    // 6. Check .htaccess files
    $htaccessBackend = __DIR__ . '/../../.htaccess';
    $htaccessApi = __DIR__ . '/../.htaccess';
    
    $results['htaccess_check'] = [
        'backend_htaccess_exists' => file_exists($htaccessBackend),
        'api_htaccess_exists' => file_exists($htaccessApi),
        'backend_htaccess_readable' => is_readable($htaccessBackend),
        'api_htaccess_readable' => is_readable($htaccessApi),
    ];
    
    if (file_exists($htaccessBackend)) {
        $htaccessContent = file_get_contents($htaccessBackend);
        $results['htaccess_check']['backend_has_auth_rules'] = strpos($htaccessContent, 'HTTP_AUTHORIZATION') !== false;
    }
    
    if (file_exists($htaccessApi)) {
        $htaccessContent = file_get_contents($htaccessApi);
        $results['htaccess_check']['api_has_auth_rules'] = strpos($htaccessContent, 'HTTP_AUTHORIZATION') !== false;
    }
    
    // 7. Check file permissions
    $results['permissions_check'] = [
        'config_readable' => is_readable($configPath),
        'database_config_readable' => is_readable($databasePath),
        'logs_dir_writable' => is_writable(dirname(__DIR__ . '/../logs/')),
    ];
    
} catch (Exception $e) {
    $results['errors'][] = 'Fatal error: ' . $e->getMessage();
    $results['errors'][] = 'File: ' . $e->getFile();
    $results['errors'][] = 'Line: ' . $e->getLine();
    $results['errors'][] = 'Trace: ' . $e->getTraceAsString();
}

// Output results
$results['success'] = count($results['errors']) === 0;
$results['error_count'] = count($results['errors']);

echo json_encode($results, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);

