<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);
header('Content-Type: text/plain');

echo "=== DEBUG ALL ADMIN FILES ===\n\n";

$files = [
    'config.php' => __DIR__ . '/../../config/config.php',
    'database.php' => __DIR__ . '/../../config/database.php',
    'admin-config.php' => __DIR__ . '/../../config/admin-config.php',
    'response.php' => __DIR__ . '/../../utils/response.php',
    'validation.php' => __DIR__ . '/../../utils/validation.php',
    'admin_session.php' => __DIR__ . '/../../utils/admin_session.php',
    'admin_auth.php' => __DIR__ . '/../../utils/admin_auth.php',
    'admin_auth_middleware.php' => __DIR__ . '/../../utils/admin_auth_middleware.php',
];

foreach ($files as $name => $path) {
    echo "Loading $name... ";
    try {
        if (file_exists($path)) {
            require_once $path;
            echo "OK\n";
        } else {
            echo "FILE NOT FOUND\n";
        }
    } catch (Error $e) {
        echo "FAILED: " . $e->getMessage() . " (Line: " . $e->getLine() . ")\n";
        exit;
    } catch (Exception $e) {
        echo "EXCEPTION: " . $e->getMessage() . " (Line: " . $e->getLine() . ")\n";
        exit;
    }
}

echo "\n=== ALL FILES LOADED ===\n";

// Test session
echo "\nTesting session...\n";
try {
    if (function_exists('getAdminSession')) {
        $session = getAdminSession();
        echo "Session: " . ($session ? "VALID" : "NULL/INVALID") . "\n";
        if ($session) {
            print_r($session);
        }
    } else {
        echo "ERROR: getAdminSession function not found\n";
    }
} catch (Exception $e) {
    echo "Session error: " . $e->getMessage() . "\n";
    echo "Stack trace: " . $e->getTraceAsString() . "\n";
} catch (Error $e) {
    echo "Session fatal error: " . $e->getMessage() . "\n";
    echo "Stack trace: " . $e->getTraceAsString() . "\n";
}

// Test DB
echo "\nTesting DB...\n";
try {
    if (function_exists('getDB')) {
        $db = getDB();
        echo "DB: Connected\n";
        
        $stmt = $db->query("SELECT COUNT(*) FROM users");
        echo "Users count: " . $stmt->fetchColumn() . "\n";
        
        $stmt = $db->query("SELECT COUNT(*) FROM properties");
        echo "Properties count: " . $stmt->fetchColumn() . "\n";
        
        // Check admin_sessions table
        try {
            $stmt = $db->query("SELECT COUNT(*) FROM admin_sessions");
            echo "Admin sessions count: " . $stmt->fetchColumn() . "\n";
        } catch (Exception $e) {
            echo "Admin sessions table error: " . $e->getMessage() . "\n";
        }
        
        // Check admin_whitelist table
        try {
            $stmt = $db->query("SELECT COUNT(*) FROM admin_whitelist");
            echo "Admin whitelist count: " . $stmt->fetchColumn() . "\n";
        } catch (Exception $e) {
            echo "Admin whitelist table error: " . $e->getMessage() . "\n";
        }
    } else {
        echo "ERROR: getDB function not found\n";
    }
} catch (Exception $e) {
    echo "DB error: " . $e->getMessage() . "\n";
    echo "Stack trace: " . $e->getTraceAsString() . "\n";
} catch (Error $e) {
    echo "DB fatal error: " . $e->getMessage() . "\n";
    echo "Stack trace: " . $e->getTraceAsString() . "\n";
}

// Test requireAdmin
echo "\nTesting requireAdmin...\n";
try {
    if (function_exists('requireAdmin')) {
        try {
            $admin = requireAdmin();
            echo "Admin: " . ($admin ? "VALID" : "NULL") . "\n";
            if ($admin) {
                echo "Admin ID: " . ($admin['id'] ?? 'N/A') . "\n";
                echo "Admin Email: " . ($admin['email'] ?? 'N/A') . "\n";
            }
        } catch (Exception $e) {
            echo "requireAdmin returned error (expected if not logged in): " . $e->getMessage() . "\n";
        }
    } else {
        echo "ERROR: requireAdmin function not found\n";
    }
} catch (Exception $e) {
    echo "requireAdmin test error: " . $e->getMessage() . "\n";
} catch (Error $e) {
    echo "requireAdmin fatal error: " . $e->getMessage() . "\n";
    echo "Stack trace: " . $e->getTraceAsString() . "\n";
}

echo "\n=== DEBUG COMPLETE ===\n";

