<?php
/**
 * Get Seller Profile API
 * GET /api/seller/profile/get.php
 */

require_once __DIR__ . '/../../../config/config.php';
require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../../utils/response.php';
require_once __DIR__ . '/../../../utils/auth.php';

handlePreflight();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendError('Method not allowed', null, 405);
}

try {
    $user = requireUserType(['seller', 'agent']);
    
    if (!$user || !isset($user['id'])) {
        sendError('User not found', null, 404);
    }
    
    $db = getDB();
    
    // profile_image is in user_profiles table, not users table
    // Always join with user_profiles to get profile_image
    $stmt = $db->prepare("
        SELECT u.id, u.full_name, u.email, u.phone, u.user_type, u.email_verified, u.phone_verified,
               u.is_banned, u.ban_reason, u.agent_verified, u.verification_documents,
               u.created_at, u.updated_at,
               up.id as profile_id, up.full_name as profile_full_name, up.user_type as profile_user_type,
               up.profile_image, 
               up.address, up.whatsapp_number, up.alternate_mobile,
               up.company_name, up.license_number, up.gst_number,
               up.website,
               up.created_at as profile_created_at, up.updated_at as profile_updated_at
        FROM users u
        LEFT JOIN user_profiles up ON u.id = up.user_id
        WHERE u.id = ?
    ");
    
    if (!$stmt) {
        $errorInfo = $db->errorInfo();
        error_log("Prepare failed: " . print_r($errorInfo, true));
        sendError('Database query preparation failed', null, 500);
    }
    
    $result = $stmt->execute([$user['id']]);
    
    if (!$result) {
        $errorInfo = $stmt->errorInfo();
        error_log("Execute failed: " . print_r($errorInfo, true));
        sendError('Database query execution failed: ' . ($errorInfo[2] ?? 'Unknown error'), null, 500);
    }
    
    $profile = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$profile) {
        sendError('Profile not found', null, 404);
    }
    
    // Remove sensitive data
    unset($profile['password']);
    
    // Use profile_image from user_profiles and normalize URL
    $profileImage = $profile['profile_image'] ?? null;
    if (!empty($profileImage)) {
        $profileImage = trim($profileImage);
        // If it's already a full URL (http/https), return as is
        if (strpos($profileImage, 'http://') === 0 || strpos($profileImage, 'https://') === 0) {
            // Already a full URL
        } elseif (strpos($profileImage, '/uploads/') === 0) {
            $profileImage = BASE_URL . $profileImage;
        } elseif (strpos($profileImage, 'uploads/') === 0) {
            $profileImage = BASE_URL . '/' . $profileImage;
        } else {
            $profileImage = UPLOAD_BASE_URL . '/' . ltrim($profileImage, '/');
        }
    }
    $profile['profile_image'] = $profileImage;
    
    sendSuccess('Profile retrieved successfully', ['profile' => $profile]);
    
} catch (PDOException $e) {
    error_log("Get Profile PDO Error: " . $e->getMessage() . " | Code: " . $e->getCode());
    // Don't expose database error details in production
    if (defined('ENVIRONMENT') && ENVIRONMENT === 'production') {
        sendError('Database error. Please try again later.', null, 500);
    } else {
        sendError('Database error: ' . $e->getMessage(), null, 500);
    }
} catch (Exception $e) {
    error_log("Get Profile Error: " . $e->getMessage() . " | Trace: " . $e->getTraceAsString());
    // Don't expose internal error details in production
    if (defined('ENVIRONMENT') && ENVIRONMENT === 'production') {
        sendError('Failed to retrieve profile. Please try again later.', null, 500);
    } else {
        sendError('Failed to retrieve profile: ' . $e->getMessage(), null, 500);
    }
}

