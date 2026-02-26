<?php
/**
 * Authentication Helper Functions
 */

require_once __DIR__ . '/../config/config.php';

// Helper function for getallheaders() if not available
if (!function_exists('getallheaders')) {
    function getallheaders() {
        $headers = [];
        foreach ($_SERVER as $name => $value) {
            if (substr($name, 0, 5) == 'HTTP_') {
                $headers[str_replace(' ', '-', ucwords(strtolower(str_replace('_', ' ', substr($name, 5)))))] = $value;
            }
        }
        return $headers;
    }
}

// Simple JWT-like token generation (For production, use a proper JWT library)
if (!function_exists('generateToken')) {
function generateToken($userId, $userType, $email) {
    $payload = [
        'user_id' => $userId,
        'user_type' => $userType,
        'email' => $email,
        'iat' => time(),
        'exp' => time() + JWT_EXPIRATION
    ];
    
    $header = base64UrlEncode(json_encode(['typ' => 'JWT', 'alg' => JWT_ALGORITHM]));
    $payload_encoded = base64UrlEncode(json_encode($payload));
    $signature = base64UrlEncode(hash_hmac('sha256', "$header.$payload_encoded", JWT_SECRET, true));
    
    return "$header.$payload_encoded.$signature";
}
}

// Verify token
if (!function_exists('verifyToken')) {
function verifyToken($token) {
    try {
        $parts = explode('.', $token);
        if (count($parts) !== 3) {
            return null;
        }
        
        [$header, $payload, $signature] = $parts;
        
        // Verify signature
        $expectedSignature = base64UrlEncode(hash_hmac('sha256', "$header.$payload", JWT_SECRET, true));
        if (!hash_equals($expectedSignature, $signature)) {
            return null;
        }
        
        // Decode payload
        $payloadData = json_decode(base64UrlDecode($payload), true);
        
        // Check expiration
        if (isset($payloadData['exp']) && $payloadData['exp'] < time()) {
            return null;
        }
        
        return $payloadData;
    } catch (Exception $e) {
        return null;
    }
}
}

// Get current user from token
if (!function_exists('getCurrentUser')) {
function getCurrentUser() {
    $authHeader = null;
    
    // Method 1: getallheaders
    $headers = getallheaders();
    $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? null;
    
    // Method 2: $_SERVER variations (including REDIRECT_HTTP_AUTHORIZATION for mod_rewrite)
    if (empty($authHeader)) {
        $authHeader = $_SERVER['HTTP_AUTHORIZATION'] 
            ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION']
            ?? null;
    }
    
    // Method 3: apache_request_headers (fallback)
    if (empty($authHeader) && function_exists('apache_request_headers')) {
        $apacheHeaders = apache_request_headers();
        $authHeader = $apacheHeaders['Authorization'] ?? null;
    }
    
    if (empty($authHeader)) {
        error_log("getCurrentUser: No Authorization header found");
        return null;
    }
    
    // Extract token from "Bearer <token>"
    if (preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
        $token = $matches[1];
        $payload = verifyToken($token);
        
        if (!$payload) {
            error_log("getCurrentUser: Token verification failed - token may be invalid or expired");
            return null;
        }
        
        require_once __DIR__ . '/../config/database.php';
        $db = getDB();
        
        // profile_image is in user_profiles table, not users table
        // Always join with user_profiles to get profile_image
        $stmt = $db->prepare("
            SELECT u.id, u.full_name, u.email, u.phone, u.user_type, u.email_verified, u.phone_verified,
                   up.profile_image
            FROM users u
            LEFT JOIN user_profiles up ON u.id = up.user_id
            WHERE u.id = ?
        ");
        
        $stmt->execute([$payload['user_id']]);
        $user = $stmt->fetch();
        
        if (!$user) {
            error_log("getCurrentUser: User not found in database for user_id: " . ($payload['user_id'] ?? 'null'));
            return null;
        }
        
        // Normalize profile image URL
        if (isset($user['profile_image']) && !empty($user['profile_image'])) {
            $profileImage = trim($user['profile_image']);
            if (strpos($profileImage, 'http://') === 0 || strpos($profileImage, 'https://') === 0) {
                // Already a full URL
            } elseif (strpos($profileImage, '/uploads/') === 0) {
                $user['profile_image'] = BASE_URL . $profileImage;
            } elseif (strpos($profileImage, 'uploads/') === 0) {
                $user['profile_image'] = BASE_URL . '/' . $profileImage;
            } else {
                $user['profile_image'] = UPLOAD_BASE_URL . '/' . ltrim($profileImage, '/');
            }
        } else {
            $user['profile_image'] = null;
        }
        
        return $user;
    }
    
    error_log("getCurrentUser: Could not extract token from Authorization header");
    return null;
}
}

// Require authentication
if (!function_exists('requireAuth')) {
function requireAuth() {
    // Clear any output buffer before sending error
    if (ob_get_level() > 0) {
        ob_clean();
    }
    
    $user = getCurrentUser();
    if (!$user) {
        error_log("requireAuth: Authentication failed - user not found or token invalid");
        sendError('Authentication required. Please log in to continue.', null, 401);
    }
    return $user;
}
}

// Require specific user type
if (!function_exists('requireUserType')) {
function requireUserType($allowedTypes) {
    $user = requireAuth();
    
    // Get user_type from database (registered type) - this is the source of truth
    $userType = $user['user_type'] ?? null;
    
    // Normalize user_type to lowercase for comparison
    $userType = $userType ? strtolower(trim($userType)) : null;
    
    // Also check token payload for user_type (login type)
    $authHeader = null;
    
    // Method 1: getallheaders
    $headers = getallheaders();
    $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? null;
    
    // Method 2: $_SERVER variations (including REDIRECT_HTTP_AUTHORIZATION for mod_rewrite)
    if (empty($authHeader)) {
        $authHeader = $_SERVER['HTTP_AUTHORIZATION'] 
            ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION']
            ?? null;
    }
    
    // Method 3: apache_request_headers (fallback)
    if (empty($authHeader) && function_exists('apache_request_headers')) {
        $apacheHeaders = apache_request_headers();
        $authHeader = $apacheHeaders['Authorization'] ?? null;
    }
    
    $tokenUserType = null;
    
    if (!empty($authHeader) && preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
        $token = $matches[1];
        $payload = verifyToken($token);
        if ($payload && isset($payload['user_type'])) {
            $tokenUserType = strtolower(trim($payload['user_type']));
        }
    }
    
    // Normalize allowed types to lowercase for comparison
    $allowedTypes = array_map(function($type) {
        return strtolower(trim($type));
    }, (array)$allowedTypes);
    
    // Check 1: Allow if registered type (from database) matches allowed types
    $allowed = $userType && in_array($userType, $allowedTypes);
    
    // Check 2: Allow if token user type matches allowed types
    // This handles cases where user registered as 'seller' but logged in as 'buyer'
    // They should still be able to access seller features (they ARE a seller)
    if (!$allowed && $tokenUserType && in_array($tokenUserType, $allowedTypes)) {
        $allowed = true;
    }
    
    // Check 3: Special case - if user is registered as 'seller' or 'agent', 
    // they should be able to access seller/agent endpoints regardless of login type
    // This ensures agents can always access their dashboard features
    if (!$allowed && $userType && in_array($userType, ['seller', 'agent'])) {
        // Only allow if the endpoint allows seller or agent
        if (in_array('seller', $allowedTypes) || in_array('agent', $allowedTypes)) {
            $allowed = true;
        }
    }
    
    if (!$allowed) {
        error_log("Access denied: user_type=$userType, token_user_type=$tokenUserType, allowed=" . json_encode($allowedTypes));
        // Clear any output buffer before sending error
        if (ob_get_level() > 0) {
            ob_clean();
        }
        sendError('Access denied. Insufficient permissions. You need to be registered as a Seller or Agent to post properties.', null, 403);
    }
    
    return $user;
}
}

// Helper functions for base64 URL encoding
if (!function_exists('base64UrlEncode')) {
function base64UrlEncode($data) {
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}
}

if (!function_exists('base64UrlDecode')) {
function base64UrlDecode($data) {
    return base64_decode(strtr($data, '-_', '+/'));
}
}

