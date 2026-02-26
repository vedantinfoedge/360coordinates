<?php
/**
 * Switch User Role API
 * POST /api/auth/switch-role.php
 * 
 * Allows users to switch between buyer and seller roles without re-logging in.
 * This generates a new token with the switched role while maintaining the same session.
 */

require_once __DIR__ . '/../../config/config.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../utils/response.php';
require_once __DIR__ . '/../../utils/validation.php';
require_once __DIR__ . '/../../utils/auth.php';

handlePreflight();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendError('Method not allowed', null, 405);
}

try {
    // Get current authenticated user
    $user = requireAuth();
    
    if (!$user) {
        sendError('Authentication required', null, 401);
    }
    
    $input = json_decode(file_get_contents('php://input'), true);
    $targetRole = sanitizeInput($input['targetRole'] ?? '');
    
    // Validate target role
    if (empty($targetRole)) {
        sendError('Target role is required', null, 400);
    }
    
    if (!in_array($targetRole, ['buyer', 'seller'])) {
        sendError('Invalid target role. Only "buyer" and "seller" are allowed.', null, 400);
    }
    
    // Get registered user type from database
    $registeredType = $user['user_type'];
    
    // Define role access map - who can switch to what
    $roleAccessMap = [
        'buyer' => ['buyer', 'seller'],
        'seller' => ['buyer', 'seller'],
        'agent' => ['agent'] // Agents cannot switch roles
    ];
    
    $allowedRoles = $roleAccessMap[$registeredType] ?? [];
    
    // Check if user can switch to target role
    if (!in_array($targetRole, $allowedRoles)) {
        $typeLabels = [
            'buyer' => 'Buyer/Tenant',
            'seller' => 'Seller/Owner',
            'agent' => 'Agent/Builder'
        ];
        
        if ($registeredType === 'agent') {
            sendError('You are registered as an Agent/Builder. You can only access the Agent/Builder dashboard.', null, 403);
        } else {
            sendError("You cannot switch to this role. Your registered type is {$typeLabels[$registeredType]}.", null, 403);
        }
    }
    
    // Check if already in the target role (get current role from token)
    $headers = getallheaders();
    $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';
    $currentTokenRole = null;
    
    if (preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
        $token = $matches[1];
        $payload = verifyToken($token);
        if ($payload && isset($payload['user_type'])) {
            $currentTokenRole = strtolower(trim($payload['user_type']));
        }
    }
    
    // If already in target role, return current token
    if ($currentTokenRole === $targetRole) {
        // Return current user data with updated role in response
        $userData = [
            'id' => $user['id'],
            'full_name' => $user['full_name'],
            'email' => $user['email'],
            'phone' => $user['phone'] ?? null,
            'user_type' => $targetRole,
            'email_verified' => (bool)($user['email_verified'] ?? false),
            'phone_verified' => (bool)($user['phone_verified'] ?? false),
            'profile_image' => $user['profile_image'] ?? null
        ];
        
        sendSuccess('Already in target role', [
            'token' => $token,
            'user' => $userData
        ]);
        exit;
    }
    
    // Generate new token with target role
    $newToken = generateToken($user['id'], $targetRole, $user['email']);
    
    // Store new session
    $db = getDB();
    $stmt = $db->prepare("INSERT INTO user_sessions (user_id, token, expires_at) VALUES (?, ?, FROM_UNIXTIME(?))");
    $stmt->execute([$user['id'], $newToken, time() + JWT_EXPIRATION]);
    
    // Prepare user data with new role
    $userData = [
        'id' => $user['id'],
        'full_name' => $user['full_name'],
        'email' => $user['email'],
        'phone' => $user['phone'] ?? null,
        'user_type' => $targetRole, // Return the switched role
        'email_verified' => (bool)($user['email_verified'] ?? false),
        'phone_verified' => (bool)($user['phone_verified'] ?? false),
        'profile_image' => $user['profile_image'] ?? null
    ];
    
    error_log("Role switch successful: User {$user['email']} switched from {$currentTokenRole} to {$targetRole}");
    
    sendSuccess('Role switched successfully', [
        'token' => $newToken,
        'user' => $userData
    ]);
    
} catch (PDOException $e) {
    error_log("Role switch database error: " . $e->getMessage());
    sendError('Role switch failed. Please try again.', null, 500);
} catch (Exception $e) {
    error_log("Role switch error: " . $e->getMessage());
    sendError('Role switch failed. Please try again.', null, 500);
}
