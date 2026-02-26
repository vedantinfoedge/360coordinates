<?php
/**
 * Record Buyer Interaction API
 * POST /api/buyer/interactions/record.php
 * 
 * Records a buyer interaction (view owner details or chat) and enforces rate limits
 * Body: { property_id: int, action_type: 'view_owner'|'chat_owner' }
 * 
 * NOTE: Rate limits are GLOBAL per buyer (across all properties)
 * - property_id is stored in database for logging/reference but NOT used for limit calculation
 * - action_type is stored in database for logging/reference but NOT used for limit calculation
 * - A buyer has 5 total combined interactions (view_owner + chat_owner) per 12 hours across ALL properties
 */

// Register shutdown function to catch fatal errors
register_shutdown_function(function() {
    // Only handle if headers haven't been sent yet
    if (!headers_sent()) {
        $error = error_get_last();
        if ($error !== NULL && in_array($error['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR])) {
            // Clean any output
            while (ob_get_level() > 0) {
                ob_end_clean();
            }
            // Set CORS headers
            $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
            if (!empty($origin)) {
                header("Access-Control-Allow-Origin: $origin");
            }
            header('Content-Type: application/json');
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'message' => 'A fatal error occurred. Please check server logs.',
                'error' => defined('ENVIRONMENT') && ENVIRONMENT === 'development' ? $error['message'] : null
            ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        }
    }
});

require_once __DIR__ . '/../../../config/config.php';
require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../../utils/response.php';
require_once __DIR__ . '/../../../utils/auth.php';

handlePreflight();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendError('Method not allowed', null, 405);
}

// Ensure output buffering is clean at the start
if (ob_get_level() > 0) {
    ob_clean();
}

try {
    $user = requireUserType(['buyer']);
    $buyerId = $user['id'];
    
    $input = json_decode(file_get_contents('php://input'), true);
    
    $propertyId = isset($input['property_id']) ? intval($input['property_id']) : 0;
    $actionType = isset($input['action_type']) ? trim($input['action_type']) : '';
    
    if (!$propertyId) {
        sendError('Property ID is required', null, 400);
    }
    
    if (!in_array($actionType, ['view_owner', 'chat_owner'])) {
        sendError('Invalid action type. Must be "view_owner" or "chat_owner"', null, 400);
    }
    
    $db = getDB();
    if (!$db) {
        sendError('Database connection failed', null, 500);
    }
    
    // Constants
    $MAX_ATTEMPTS = 5;
    $WINDOW_HOURS = 12;
    
    // Calculate the cutoff time (12 hours ago)
    $cutoffTime = date('Y-m-d H:i:s', strtotime("-{$WINDOW_HOURS} hours"));
    
    // Count ALL interaction attempts in the last 12 hours (GLOBAL - across all properties and action types)
    // NOTE: Both property_id and action_type are NOT included in WHERE clause - limits are global per buyer
    // Both view_owner and chat_owner count towards the same combined limit
    $stmt = $db->prepare("
        SELECT COUNT(*) as attempt_count,
               MIN(timestamp) as first_attempt_time
        FROM buyer_interaction_limits
        WHERE buyer_id = ? 
          AND action_type IN ('view_owner', 'chat_owner')
          AND timestamp >= ?
    ");
    $stmt->execute([$buyerId, $cutoffTime]);
    $result = $stmt->fetch();
    
    // Safety check: COUNT(*) should always return a row, but handle edge case
    if ($result === false) {
        $result = ['attempt_count' => 0, 'first_attempt_time' => null];
    }
    
    $attemptCount = intval($result['attempt_count'] ?? 0);
    
    // Check if limit is reached
    if ($attemptCount >= $MAX_ATTEMPTS) {
        // When limit is reached, reset 12 hours from now
        $resetTimeSeconds = time() + ($WINDOW_HOURS * 3600);
        $resetTime = date('Y-m-d H:i:s', $resetTimeSeconds);
        
        sendError('Rate limit exceeded', [
            'remaining_attempts' => 0,
            'max_attempts' => $MAX_ATTEMPTS,
            'used_attempts' => $attemptCount,
            'reset_time' => $resetTime,
            'reset_time_seconds' => $resetTimeSeconds,
            'message' => "Daily interaction limit reached. Try again after 12 hours."
        ], 429);
    }
    
    // Record the interaction (property_id stored for logging/reference)
    $stmt = $db->prepare("
        INSERT INTO buyer_interaction_limits (buyer_id, property_id, action_type, timestamp)
        VALUES (?, ?, ?, NOW())
    ");
    $stmt->execute([$buyerId, $propertyId, $actionType]);

    // When buyer clicks "View Contact", create a lead (one per buyer+property)
    if ($actionType === 'view_owner') {
        $sellerStmt = $db->prepare("SELECT user_id FROM properties WHERE id = ? LIMIT 1");
        $sellerStmt->execute([$propertyId]);
        $sellerRow = $sellerStmt->fetch();
        if ($sellerRow && !empty($sellerRow['user_id'])) {
            $sellerId = (int) $sellerRow['user_id'];
            try {
                $leadStmt = $db->prepare("
                    INSERT IGNORE INTO leads (buyer_id, property_id, seller_id, created_at)
                    VALUES (?, ?, ?, NOW())
                ");
                $leadStmt->execute([$buyerId, $propertyId, $sellerId]);
            } catch (PDOException $e) {
                // Log but do not fail the interaction recording (leads table may not exist yet)
                error_log("Leads insert (view_owner): " . $e->getMessage());
            }
        }
    }

    // Get updated count (GLOBAL - across all properties and action types)
    // NOTE: Both property_id and action_type are NOT included in WHERE clause - limits are global per buyer
    // Both view_owner and chat_owner count towards the same combined limit
    $stmt = $db->prepare("
        SELECT COUNT(*) as attempt_count,
               MIN(timestamp) as first_attempt_time
        FROM buyer_interaction_limits
        WHERE buyer_id = ? 
          AND action_type IN ('view_owner', 'chat_owner')
          AND timestamp >= ?
    ");
    $stmt->execute([$buyerId, $cutoffTime]);
    $updatedResult = $stmt->fetch();
    
    // Safety check: COUNT(*) should always return a row, but handle edge case
    if ($updatedResult === false) {
        $updatedResult = ['attempt_count' => 0, 'first_attempt_time' => null];
    }
    
    $updatedAttemptCount = intval($updatedResult['attempt_count'] ?? 0);
    $remainingAttempts = max(0, $MAX_ATTEMPTS - $updatedAttemptCount);
    
    // Calculate reset time (12 hours from when limit is reached, or from first attempt if not at limit)
    $resetTime = null;
    $resetTimeSeconds = null;
    if ($updatedAttemptCount > 0) {
        // If limit is reached, reset 12 hours from now
        // Otherwise, reset 12 hours from first attempt
        if ($updatedAttemptCount >= $MAX_ATTEMPTS) {
            $resetTimeSeconds = time() + ($WINDOW_HOURS * 3600);
        } else if ($updatedResult['first_attempt_time']) {
            $firstAttemptTime = strtotime($updatedResult['first_attempt_time']);
            $resetTimeSeconds = $firstAttemptTime + ($WINDOW_HOURS * 3600);
        }
        
        if ($resetTimeSeconds) {
            $resetTime = date('Y-m-d H:i:s', $resetTimeSeconds);
        }
    }
    
    sendSuccess('Interaction recorded', [
        'remaining_attempts' => $remainingAttempts,
        'max_attempts' => $MAX_ATTEMPTS,
        'used_attempts' => $updatedAttemptCount,
        'reset_time' => $resetTime,
        'reset_time_seconds' => $resetTimeSeconds,
        'action_type' => $actionType, // Included for reference, but limits are combined
        'property_id' => $propertyId // Included for reference, but limits are global
    ]);
    
} catch (PDOException $e) {
    error_log("Record Interaction PDO Error: " . $e->getMessage());
    error_log("SQL State: " . $e->getCode());
    error_log("SQL Error Info: " . json_encode($e->errorInfo ?? []));
    error_log("Stack trace: " . $e->getTraceAsString());
    
    // Check if it's a table doesn't exist error (MySQL error 1146)
    $errorMessage = $e->getMessage();
    $errorInfo = $e->errorInfo ?? [];
    $sqlState = $errorInfo[0] ?? '';
    
    if (strpos($errorMessage, "doesn't exist") !== false || strpos($errorMessage, "Unknown table") !== false || $sqlState === '42S02') {
        sendError('Database table not found. Please ensure the buyer_interaction_limits table exists.', null, 500);
    } else {
        // In development, show more details; in production, show generic message
        $detailMessage = (defined('ENVIRONMENT') && ENVIRONMENT === 'development') 
            ? 'Database error: ' . $e->getMessage() 
            : 'Database error occurred. Please try again later.';
        sendError($detailMessage, null, 500);
    }
} catch (Throwable $e) {
    // Catch both Exception and Error (PHP 7+)
    error_log("Record Interaction Error: " . $e->getMessage());
    error_log("Error Code: " . $e->getCode());
    error_log("Error Class: " . get_class($e));
    error_log("Stack trace: " . $e->getTraceAsString());
    
    // sendError() calls exit(), so this will terminate the script
    sendError('Failed to record interaction: ' . $e->getMessage(), null, 500);
}

