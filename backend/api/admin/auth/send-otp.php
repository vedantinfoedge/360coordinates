<?php
/**
 * Admin Send OTP API
 * POST /api/admin/auth/send-otp.php
 * Sends OTP to hardcoded admin mobile number via MSG91
 */

// Start output buffering
ob_start();

// Error handling
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

// CORS headers
header('Access-Control-Allow-Origin: http://localhost:3000');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS, PATCH');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept, Origin');
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Max-Age: 86400');
header('Content-Type: application/json');

// Handle OPTIONS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    ob_end_clean();
    http_response_code(200);
    exit();
}

// Function to send JSON response
function sendJsonResponse($success, $message, $data = null, $statusCode = 200) {
    ob_end_clean();
    http_response_code($statusCode);
    header('Content-Type: application/json');
    echo json_encode([
        'success' => $success,
        'message' => $message,
        'data' => $data
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit();
}

// Load files
try {
    require_once __DIR__ . '/../../../config/config.php';
    require_once __DIR__ . '/../../../config/database.php';
    require_once __DIR__ . '/../../../config/admin-config.php';
    require_once __DIR__ . '/../../../utils/response.php';
    require_once __DIR__ . '/../../../utils/validation.php';
} catch (Throwable $e) {
    error_log("Error loading files: " . $e->getMessage());
    sendJsonResponse(false, 'Server configuration error', null, 500);
}

// Clear output buffer
ob_end_clean();

// Check method
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    if (function_exists('sendError')) {
        sendError('Method not allowed', null, 405);
    } else {
        sendJsonResponse(false, 'Method not allowed', null, 405);
    }
}

try {
    // Get input data
    $input = json_decode(file_get_contents('php://input'), true);
    $mobile = isset($input['mobile']) ? trim($input['mobile']) : '';
    
    if (empty($mobile)) {
        sendJsonResponse(false, 'Mobile number is required', null, 400);
    }
    
    // Validate constants
    if (!defined('MSG91_AUTH_KEY')) {
        error_log("MSG91_AUTH_KEY not defined");
        sendJsonResponse(false, 'Server configuration error: MSG91_AUTH_KEY not defined', null, 500);
    }
    
    if (!defined('MSG91_WIDGET_ID')) {
        error_log("MSG91_WIDGET_ID not defined");
        sendJsonResponse(false, 'Server configuration error: MSG91_WIDGET_ID not defined', null, 500);
    }
    
    if (!defined('MSG91_SEND_OTP_URL')) {
        error_log("MSG91_SEND_OTP_URL not defined");
        sendJsonResponse(false, 'Server configuration error: MSG91_SEND_OTP_URL not defined', null, 500);
    }
    
    // Get database connection
    if (!function_exists('getDB')) {
        error_log("getDB function not found");
        sendJsonResponse(false, 'Database function not available', null, 500);
    }
    
    $db = getDB();
    
    if (!$db) {
        error_log("getDB returned null");
        sendJsonResponse(false, 'Database connection failed', null, 500);
    }
    
    // Validate and normalize mobile format
    $validatedMobile = validateMobileFormat($mobile);
    if (!$validatedMobile) {
        sendJsonResponse(false, 'Invalid mobile number format', null, 400);
    }
    
    // Check whitelist from database table FIRST (before sending OTP)
    if (!isWhitelistedMobile($validatedMobile)) {
        error_log("SECURITY ALERT - Mobile not whitelisted: " . substr($validatedMobile, 0, 4) . "****");
        sendJsonResponse(false, 'Unauthorized access. Only registered admin mobile number is allowed.', null, 403);
    }
    
    // Create table if needed (with expires_at column)
    try {
        $db->exec("CREATE TABLE IF NOT EXISTS admin_otp_logs (
            id INT AUTO_INCREMENT PRIMARY KEY,
            mobile VARCHAR(20) NOT NULL,
            request_id VARCHAR(100) DEFAULT NULL,
            status ENUM('pending', 'verified', 'expired', 'failed') DEFAULT 'pending',
            expires_at TIMESTAMP NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            verified_at TIMESTAMP NULL DEFAULT NULL,
            INDEX idx_mobile (mobile),
            INDEX idx_request_id (request_id),
            INDEX idx_status (status),
            INDEX idx_expires_at (expires_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
        
        // Add expires_at column if table exists but column is missing
        $db->exec("ALTER TABLE admin_otp_logs ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP");
    } catch (PDOException $e) {
        // Table might already exist, check if expires_at column exists
        try {
            $checkColumn = $db->query("SHOW COLUMNS FROM admin_otp_logs LIKE 'expires_at'");
            if ($checkColumn->rowCount() === 0) {
                $db->exec("ALTER TABLE admin_otp_logs ADD COLUMN expires_at TIMESTAMP NOT NULL DEFAULT (DATE_ADD(NOW(), INTERVAL 5 MINUTE)) AFTER status");
                $db->exec("ALTER TABLE admin_otp_logs ADD INDEX IF NOT EXISTS idx_expires_at (expires_at)");
            }
        } catch (PDOException $e2) {
            error_log("Column addition: " . $e2->getMessage());
        }
    }
    
    // Call MSG91 API v5 for OTP
    // MSG91 API v5 format: POST with authkey in header, mobile and template_id in body
    // Use template_id for direct API calls (not widget_id)
    $templateId = defined('MSG91_TEMPLATE_ID') ? MSG91_TEMPLATE_ID : MSG91_WIDGET_ID;
    $requestData = [
        'mobile' => $validatedMobile,
        'template_id' => $templateId
    ];
    
    error_log("=== MSG91 OTP REQUEST ===");
    error_log("URL: " . MSG91_SEND_OTP_URL);
    error_log("Mobile: " . $validatedMobile);
    error_log("Template ID: " . $templateId);
    error_log("Auth Key: " . substr(MSG91_AUTH_KEY, 0, 15) . "...");
    error_log("Request Body: " . json_encode($requestData));
    
    $ch = curl_init();
    curl_setopt_array($ch, [
        CURLOPT_URL => MSG91_SEND_OTP_URL,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_SSL_VERIFYPEER => false, // For development - remove in production
        CURLOPT_SSL_VERIFYHOST => false, // For development - remove in production
        CURLOPT_TIMEOUT => 30,
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/json',
            'authkey: ' . MSG91_AUTH_KEY
        ],
        CURLOPT_POSTFIELDS => json_encode($requestData)
    ]);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);
    
    // Detailed logging for debugging
    error_log("=== MSG91 OTP API CALL (Widget-based) ===");
    error_log("URL: " . MSG91_SEND_OTP_URL);
    error_log("Mobile: " . $mobile);
    error_log("Widget ID: " . MSG91_WIDGET_ID);
    error_log("HTTP Code: " . $httpCode);
    error_log("CURL Error: " . ($curlError ? $curlError : 'None'));
    error_log("Response: " . $response);
    
    if ($curlError) {
        error_log("MSG91 CURL Error: " . $curlError);
        sendJsonResponse(false, 'Failed to send OTP. Please try again.', null, 500);
    }
    
    $msg91Response = json_decode($response, true);
    $requestId = isset($msg91Response['request_id']) ? $msg91Response['request_id'] : null;
    $status = ($httpCode === 200 && isset($msg91Response['type']) && $msg91Response['type'] === 'success') ? 'pending' : 'failed';
    
    // Calculate expiry (5 minutes from now)
    $expiresAt = date('Y-m-d H:i:s', time() + 300); // 5 minutes = 300 seconds
    
    // Log OTP request to admin_otp_logs table
    try {
        $stmt = $db->prepare("INSERT INTO admin_otp_logs (mobile, request_id, status, expires_at) VALUES (?, ?, ?, ?)");
        $stmt->execute([$validatedMobile, $requestId, $status, $expiresAt]);
        error_log("OTP logged - Mobile: " . substr($validatedMobile, 0, 4) . "****, Request ID: " . ($requestId ?? 'N/A') . ", Expires: " . $expiresAt);
    } catch (PDOException $e) {
        error_log("Error logging OTP: " . $e->getMessage());
        // Continue even if logging fails
    }
    
    if ($httpCode === 200 && isset($msg91Response['type']) && $msg91Response['type'] === 'success') {
        if (function_exists('sendSuccess')) {
            sendSuccess('OTP sent to registered admin number', ['request_id' => $requestId]);
        } else {
            sendJsonResponse(true, 'OTP sent successfully', ['request_id' => $requestId]);
        }
    } else {
        $errorMsg = isset($msg91Response['message']) ? $msg91Response['message'] : 'Failed to send OTP';
        $errorDetails = isset($msg91Response['errors']) ? json_encode($msg91Response['errors']) : 'No error details';
        
        // Enhanced error logging
        error_log("=== MSG91 API ERROR ===");
        error_log("HTTP Code: " . $httpCode);
        error_log("Error Message: " . $errorMsg);
        error_log("Error Details: " . $errorDetails);
        error_log("Full Response: " . $response);
        error_log("Mobile Sent: " . $mobile);
        error_log("Widget ID Used: " . MSG91_WIDGET_ID);
        error_log("Auth Key (first 15 chars): " . substr(MSG91_AUTH_KEY, 0, 15) . "...");
        
        // Check for common error patterns
        $userFriendlyMsg = $errorMsg;
        if (stripos($errorMsg, 'template') !== false || stripos($errorMsg, 'template_id') !== false || stripos($errorMsg, 'widget') !== false || stripos($errorMsg, 'widget_id') !== false) {
            $userFriendlyMsg .= " - Please verify your Widget ID in MSG91 Dashboard > OTP > Widgets";
        }
        if (stripos($errorMsg, 'balance') !== false || stripos($errorMsg, 'credit') !== false) {
            $userFriendlyMsg .= " - Please check your MSG91 account balance";
        }
        if (stripos($errorMsg, 'mobile') !== false || stripos($errorMsg, 'number') !== false) {
            $userFriendlyMsg .= " - Please verify the mobile number format";
        }
        
        // Return more detailed error to help debug
        sendJsonResponse(false, $userFriendlyMsg, [
            'http_code' => $httpCode,
            'msg91_response' => $msg91Response,
            'mobile_sent' => substr($mobile, 0, 4) . '****' . substr($mobile, -4), // Masked for security
            'widget_id_used' => MSG91_WIDGET_ID,
            'debug_note' => 'Check debug-otp.php for detailed diagnostics'
        ], 500);
    }
    
} catch (PDOException $e) {
    error_log("Database Error: " . $e->getMessage());
    sendJsonResponse(false, 'Database error. Please try again.', null, 500);
} catch (Exception $e) {
    error_log("Exception: " . $e->getMessage() . " | Trace: " . $e->getTraceAsString());
    sendJsonResponse(false, 'Failed to send OTP. Please try again.', null, 500);
} catch (Error $e) {
    error_log("Fatal Error: " . $e->getMessage() . " | Trace: " . $e->getTraceAsString());
    sendJsonResponse(false, 'Server error occurred. Please try again.', null, 500);
} catch (Throwable $e) {
    error_log("Throwable: " . $e->getMessage() . " | Trace: " . $e->getTraceAsString());
    sendJsonResponse(false, 'Server error occurred. Please try again.', null, 500);
}
