<?php
/**
 * Welcome Email Background Worker
 * 
 * This script runs in the background to send welcome emails via MSG91 Email API.
 * It's called asynchronously from the registration process and doesn't block user registration.
 * 
 * Usage: php send_welcome_email.php <userId> <name> <email>
 * 
 * Example: php send_welcome_email.php 123 "John Doe" "john@example.com"
 */

// Set error reporting
error_reporting(E_ALL);
ini_set('display_errors', 0); // Don't display errors in CLI
ini_set('log_errors', 1);

// Set timezone
date_default_timezone_set('Asia/Kolkata');

// Load required files
require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../../vendor/autoload.php';
require_once __DIR__ . '/../helpers/email_helper_smtp.php';


/**
 * Log message to error log
 */
function logMessage($message) {
    $timestamp = date('Y-m-d H:i:s');
    error_log("[$timestamp] Welcome Email Worker: $message");
}

/**
 * Update user email status in database
 */
function updateUserEmailStatus($userId, $status, $emailSentAt = null) {
    try {
        $db = getDB();
        
        if ($status === 'SENT' && $emailSentAt) {
            $stmt = $db->prepare("UPDATE users SET email_status = ?, email_sent_at = ? WHERE id = ?");
            $stmt->execute([$status, $emailSentAt, $userId]);
        } else {
            $stmt = $db->prepare("UPDATE users SET email_status = ? WHERE id = ?");
            $stmt->execute([$status, $userId]);
        }
        
        logMessage("Updated user $userId email_status to: $status");
        return true;
    } catch (Exception $e) {
        logMessage("Failed to update user email_status for user $userId: " . $e->getMessage());
        return false;
    }
}

/**
 * Log email attempt to email_logs table
 */
function logEmailAttempt($userId, $emailType, $status, $msg91Response = null, $errorMessage = null) {
    try {
        $db = getDB();
        
        $stmt = $db->prepare("
            INSERT INTO email_logs (user_id, email_type, status, msg91_response, error_message)
            VALUES (?, ?, ?, ?, ?)
        ");
        
        $msg91ResponseJson = $msg91Response ? json_encode($msg91Response) : null;
        
        $stmt->execute([
            $userId,
            $emailType,
            $status,
            $msg91ResponseJson,
            $errorMessage
        ]);
        
        $logId = $db->lastInsertId();
        logMessage("Logged email attempt (log ID: $logId) for user $userId with status: $status");
        return $logId;
    } catch (Exception $e) {
        logMessage("Failed to log email attempt for user $userId: " . $e->getMessage());
        return false;
    }
}

/**
 * Send welcome email via MSG91 SMTP (wrapper function for compatibility)
 */
function sendWelcomeEmailViaMSG91($userId, $name, $email) {
    // Use SMTP method instead of API
    try {
        $result = sendWelcomeEmailViaSMTP($userId, $name, $email);
        
        if ($result) {
            return [
                'success' => true,
                'response' => ['method' => 'SMTP', 'sent_at' => date('Y-m-d H:i:s')]
            ];
        } else {
            // Get last error if available
            $lastError = error_get_last();
            $errorDetails = $lastError ? $lastError['message'] : 'Unknown error - check error logs for details';
            throw new Exception("Failed to send welcome email via SMTP: $errorDetails");
        }
    } catch (Exception $e) {
        // Re-throw with more context
        throw new Exception("SMTP email sending failed for user ID $userId: " . $e->getMessage());
    }
}

// ============================================
// MAIN EXECUTION
// ============================================

try {
    // Get command line arguments
    if ($argc < 4) {
        logMessage("ERROR: Invalid arguments. Usage: php send_welcome_email.php <userId> <name> <email>");
        exit(1);
    }
    
    $userId = intval($argv[1]);
    $nameFromArg = $argv[2];
    $emailFromArg = $argv[3];
    
    logMessage("Starting welcome email worker for user ID: $userId");
    
    // Validate user ID
    if ($userId <= 0) {
        logMessage("ERROR: Invalid user ID: $userId");
        exit(1);
    }
    
    // Fetch user data from database to ensure we use the exact saved values
    try {
        $db = getDB();
        $stmt = $db->prepare("SELECT id, full_name, email FROM users WHERE id = ?");
        $stmt->execute([$userId]);
        $userData = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$userData) {
            logMessage("ERROR: User not found in database for user ID: $userId");
            updateUserEmailStatus($userId, 'FAILED');
            logEmailAttempt($userId, 'welcome', 'FAILED', null, "User not found in database");
            exit(1);
        }
        
        // Use email and name from database (ensures we use the exact values saved)
        $email = $userData['email'];
        $name = $userData['full_name'];
        
        logMessage("Fetched user data from database - Email: $email, Name: $name");
        
        // Log warning if database values differ from arguments (for debugging)
        if ($email !== $emailFromArg) {
            logMessage("WARNING: Email from database ($email) differs from argument ($emailFromArg). Using database value.");
        }
        if ($name !== $nameFromArg) {
            logMessage("WARNING: Name from database ($name) differs from argument ($nameFromArg). Using database value.");
        }
        
    } catch (Exception $dbError) {
        logMessage("ERROR: Failed to fetch user data from database: " . $dbError->getMessage());
        // Fallback to argument values if database fetch fails
        $email = $emailFromArg;
        $name = $nameFromArg;
        logMessage("Using argument values as fallback - Email: $email, Name: $name");
    }
    
    // Validate email format
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        logMessage("ERROR: Invalid email format: $email");
        updateUserEmailStatus($userId, 'FAILED');
        logEmailAttempt($userId, 'welcome', 'FAILED', null, "Invalid email format: $email");
        exit(1);
    }
    
    // Send email via MSG91
    try {
        $result = sendWelcomeEmailViaMSG91($userId, $name, $email);
        
        if ($result['success']) {
            // Email sent successfully
            $emailSentAt = date('Y-m-d H:i:s');
            updateUserEmailStatus($userId, 'SENT', $emailSentAt);
            logEmailAttempt($userId, 'welcome', 'SUCCESS', $result['response']);
            logMessage("SUCCESS: Welcome email sent to user ID: $userId, Email: $email");
            exit(0);
        } else {
            // Unexpected response format
            updateUserEmailStatus($userId, 'FAILED');
            logEmailAttempt($userId, 'welcome', 'FAILED', $result['response'], "Unexpected response format");
            logMessage("ERROR: Unexpected response format from MSG91 for user ID: $userId");
            exit(1);
        }
    } catch (Exception $e) {
        // Email sending failed
        $errorMessage = $e->getMessage();
        updateUserEmailStatus($userId, 'FAILED');
        logEmailAttempt($userId, 'welcome', 'FAILED', null, $errorMessage);
        logMessage("ERROR: Failed to send welcome email to user ID: $userId, Error: $errorMessage");
        exit(1);
    }
    
} catch (Exception $e) {
    logMessage("FATAL ERROR: " . $e->getMessage());
    logMessage("Stack trace: " . $e->getTraceAsString());
    exit(1);
} catch (Error $e) {
    logMessage("FATAL ERROR: " . $e->getMessage());
    logMessage("Stack trace: " . $e->getTraceAsString());
    exit(1);
}

