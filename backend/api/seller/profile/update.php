<?php
/**
 * Update Seller Profile API
 * PUT /api/seller/profile/update.php
 */

require_once __DIR__ . '/../../../config/config.php';
require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../../utils/response.php';
require_once __DIR__ . '/../../../utils/validation.php';
require_once __DIR__ . '/../../../utils/auth.php';

handlePreflight();

if ($_SERVER['REQUEST_METHOD'] !== 'PUT') {
    sendError('Method not allowed', null, 405);
}

try {
    $user = requireUserType(['seller', 'agent']);
    
    $input = json_decode(file_get_contents('php://input'), true);
    
    $db = getDB();
    
    // Update user table
    $updateUserFields = [];
    $userParams = [];
    
    if (isset($input['full_name']) && trim($input['full_name']) !== '') {
        $fullName = trim($input['full_name']);
        $updateUserFields[] = "full_name = ?";
        $userParams[] = sanitizeInput($fullName);
    }
    
    if (isset($input['email'])) {
        // Validate email format
        if (!filter_var($input['email'], FILTER_VALIDATE_EMAIL)) {
            sendError('Invalid email format', null, 400);
        }
        $updateUserFields[] = "email = ?";
        $userParams[] = sanitizeInput($input['email']);
    }
    
    // Phone field is excluded from profile updates - it's the login mobile number
    // and should not be modified or validated in profile updates
    // If phone is sent, ignore it silently (don't update, don't validate)
    
    // Ensure user_profiles record exists
    $stmt = $db->prepare("SELECT id FROM user_profiles WHERE user_id = ?");
    $stmt->execute([$user['id']]);
    if (!$stmt->fetch(PDO::FETCH_ASSOC)) {
        // Create user_profiles record with current full_name and user_type
        $stmt = $db->prepare("INSERT INTO user_profiles (user_id, full_name, user_type) SELECT id, full_name, user_type FROM users WHERE id = ?");
        $stmt->execute([$user['id']]);
    }
    
    if (!empty($updateUserFields)) {
        $userParams[] = $user['id'];
        $stmt = $db->prepare("UPDATE users SET " . implode(', ', $updateUserFields) . ", updated_at = NOW() WHERE id = ?");
        $stmt->execute($userParams);
        
        // Sync full_name and user_type to user_profiles when updated in users table
        if (isset($input['full_name']) && trim($input['full_name']) !== '') {
            $fullName = trim($input['full_name']);
            $syncFields = [];
            $syncParams = [];
            $syncFields[] = "full_name = ?";
            $syncParams[] = sanitizeInput($fullName);
            
            if (isset($input['user_type'])) {
                $syncFields[] = "user_type = ?";
                $syncParams[] = sanitizeInput($input['user_type']);
            }
            
            if (!empty($syncFields)) {
                $syncParams[] = $user['id'];
                $stmt = $db->prepare("UPDATE user_profiles SET " . implode(', ', $syncFields) . " WHERE user_id = ?");
                $stmt->execute($syncParams);
                
                // If full_name changed, update properties.user_full_name
                $newFullName = sanitizeInput($fullName);
                $stmt = $db->prepare("UPDATE properties SET user_full_name = ? WHERE user_id = ?");
                $stmt->execute([$newFullName, $user['id']]);
            }
        } elseif (isset($input['user_type'])) {
            // Only update user_type if full_name is not being updated
            $syncFields = ["user_type = ?"];
            $syncParams = [sanitizeInput($input['user_type']), $user['id']];
            $stmt = $db->prepare("UPDATE user_profiles SET " . implode(', ', $syncFields) . " WHERE user_id = ?");
            $stmt->execute($syncParams);
        }
    }
    
    // Update or insert user profile
    // Agent-only fields: company_name, license_number, website
    // Business fields: gst_number (available for all seller/agent types)
    // Contact fields: whatsapp_number, alternate_mobile (available for all user types)
    $allowedProfileFields = ['address', 'whatsapp_number', 'alternate_mobile', 'company_name', 'license_number', 'gst_number', 'website'];
    
    // Enforce agent-only fields - only allow if user_type is 'agent'
    $userType = $user['user_type'] ?? null;
    $agentOnlyFields = ['company_name', 'license_number', 'website'];
    
    $updateProfileFields = [];
    $profileParams = [];
    
    foreach ($allowedProfileFields as $field) {
        // Skip agent-only fields if user is not an agent
        if (in_array($field, $agentOnlyFields) && $userType !== 'agent') {
            continue; // Silently skip or you could throw an error
        }
        
        // Check if field is set (including empty strings to allow clearing fields)
        // Use array_key_exists to check for the key even if value is empty string or null
        if (array_key_exists($field, $input)) {
            $value = $input[$field];
            
            // Convert null to empty string (agent profile sends null for empty values)
            if ($value === null) {
                $value = '';
            }
            
            // Trim whitespace for all fields
            if (is_string($value)) {
                $value = trim($value);
            }
            
            // Validate phone number fields if provided (non-empty)
            if (($field === 'whatsapp_number' || $field === 'alternate_mobile') && $value !== '') {
                $phone = preg_replace('/\D/', '', $value);
                if (strlen($phone) < 10 || strlen($phone) > 15) {
                    sendError("Invalid {$field} format. Must be 10-15 digits.", null, 400);
                }
                // Normalize to digits only for storage
                $value = $phone;
            }
            
            $updateProfileFields[] = "$field = ?";
            // Allow empty strings to clear fields, but sanitize non-empty values
            $profileParams[] = $value === '' ? '' : sanitizeInput($value);
        }
    }
    
    // Handle profile_image separately (it's in user_profiles now)
    if (isset($input['profile_image'])) {
        $updateProfileFields[] = "profile_image = ?";
        $profileParams[] = sanitizeInput($input['profile_image']);
    }
    
    if (!empty($updateProfileFields)) {
        // Check if profile exists
        $stmt = $db->prepare("SELECT id FROM user_profiles WHERE user_id = ?");
        $stmt->execute([$user['id']]);
        
        if ($stmt->fetch(PDO::FETCH_ASSOC)) {
            // Update
            $profileParams[] = $user['id'];
            $stmt = $db->prepare("UPDATE user_profiles SET " . implode(', ', $updateProfileFields) . ", updated_at = NOW() WHERE user_id = ?");
            $result = $stmt->execute($profileParams);
            if (!$result) {
                $errorInfo = $stmt->errorInfo();
                error_log("Update user_profiles failed: " . print_r($errorInfo, true));
                sendError('Failed to update profile: ' . ($errorInfo[2] ?? 'Unknown error'), null, 500);
            }
        } else {
            // Insert - build field names and values
            $fieldNames = [];
            foreach ($updateProfileFields as $field) {
                $fieldNames[] = str_replace(' = ?', '', $field);
            }
            $fieldNames[] = 'user_id';
            $profileParams[] = $user['id'];
            
            $placeholders = str_repeat('?,', count($profileParams) - 1) . '?';
            $stmt = $db->prepare("INSERT INTO user_profiles (" . implode(', ', $fieldNames) . ") VALUES ($placeholders)");
            $result = $stmt->execute($profileParams);
            if (!$result) {
                $errorInfo = $stmt->errorInfo();
                error_log("Insert user_profiles failed: " . print_r($errorInfo, true));
                sendError('Failed to create profile: ' . ($errorInfo[2] ?? 'Unknown error'), null, 500);
            }
        }
    }
    
    // Get updated profile
    $stmt = $db->prepare("
        SELECT u.id, u.full_name, u.email, u.phone, u.user_type, u.email_verified, u.phone_verified,
               u.is_banned, u.ban_reason, u.agent_verified, u.verification_documents,
               u.created_at, u.updated_at,
               up.id as profile_id, up.full_name as profile_full_name, up.user_type as profile_user_type,
               up.profile_image, up.address, up.whatsapp_number, up.alternate_mobile,
               up.company_name, up.license_number, up.gst_number, up.website,
               up.created_at as profile_created_at, up.updated_at as profile_updated_at
        FROM users u
        LEFT JOIN user_profiles up ON u.id = up.user_id
        WHERE u.id = ?
    ");
    $stmt->execute([$user['id']]);
    $profile = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$profile) {
        sendError('Failed to retrieve updated profile', null, 500);
    }
    
    unset($profile['password']);
    
    // Use profile_image from user_profiles if available
    if (isset($profile['profile_image'])) {
        $profile['profile_image'] = $profile['profile_image'];
    }
    
    sendSuccess('Profile updated successfully', ['profile' => $profile]);
    
} catch (Exception $e) {
    error_log("Update Profile Error: " . $e->getMessage());
    sendError('Failed to update profile', null, 500);
}

