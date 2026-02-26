<?php
/**
 * Admin Validate Mobile API
 * POST /api/admin/auth/validate-mobile.php
 * Validates mobile number against admin whitelist and returns validation token
 */

require_once __DIR__ . '/../../../config/config.php';
require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../../config/admin-config.php';
require_once __DIR__ . '/../../../utils/response.php';
require_once __DIR__ . '/../../../utils/validation.php';
require_once __DIR__ . '/../../../utils/rate_limit.php';

handlePreflight();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendError('Method not allowed', null, 405);
}

try {
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($data['mobile']) || empty($data['mobile'])) {
        sendError('Mobile number is required', null, 400);
    }
    
    $mobile = trim($data['mobile']);
    
    // Rate limiting: 5 attempts per IP per hour
    $rateLimit = checkIPRateLimit(RATE_LIMIT_VALIDATE_ATTEMPTS, RATE_LIMIT_VALIDATE_WINDOW);
    if (!$rateLimit['allowed']) {
        $resetTime = date('Y-m-d H:i:s', $rateLimit['reset_at']);
        sendError('Too many validation attempts. Please try again after ' . $resetTime, [
            'reset_at' => $resetTime,
            'retry_after' => $rateLimit['reset_at'] - time()
        ], 429);
    }
    
    // Validate mobile format
    $validatedMobile = validateMobileFormat($mobile);
    if (!$validatedMobile) {
        error_log("Invalid mobile format attempt: " . substr($mobile, 0, 4) . "****");
        sendError('Invalid mobile number format', null, 400);
    }
    
    // CRITICAL SECURITY: Check against whitelist
    if (!isWhitelistedMobile($validatedMobile)) {
        error_log("SECURITY ALERT - Unauthorized mobile validation attempt: " . substr($validatedMobile, 0, 4) . "****");
        sendError('Unauthorized access. Only registered admin mobile number is allowed.', null, 403);
    }
    
    // Generate validation token (5 minute expiry)
    $validationToken = bin2hex(random_bytes(32));
    $expiresAt = time() + 300; // 5 minutes
    
    // Store validation token in database
    $db = getDB();
    
    // Create validation_tokens table if it doesn't exist
    try {
        $db->exec("CREATE TABLE IF NOT EXISTS validation_tokens (
            id INT AUTO_INCREMENT PRIMARY KEY,
            token VARCHAR(64) NOT NULL UNIQUE,
            mobile VARCHAR(20) NOT NULL,
            ip_address VARCHAR(45) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            expires_at TIMESTAMP NOT NULL,
            used TINYINT(1) DEFAULT 0,
            INDEX idx_token (token),
            INDEX idx_mobile (mobile),
            INDEX idx_expires_at (expires_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    } catch (PDOException $e) {
        // Table might already exist
    }
    
    // Clean expired tokens
    try {
        $db->exec("DELETE FROM validation_tokens WHERE expires_at < NOW()");
    } catch (PDOException $e) {
        // Ignore errors
    }
    
    // Store token
    $ip = getClientIP();
    $stmt = $db->prepare("INSERT INTO validation_tokens (token, mobile, ip_address, expires_at) VALUES (?, ?, ?, FROM_UNIXTIME(?))");
    $stmt->execute([$validationToken, $validatedMobile, $ip, $expiresAt]);
    
    // Log successful validation
    error_log("Mobile validation successful for whitelisted number: " . substr($validatedMobile, 0, 4) . "****");
    
    // SECURITY: Never expose mobile number in response - frontend handles its own masking
    sendSuccess('Mobile number validated', [
        'validationToken' => $validationToken,
        'expires_at' => $expiresAt
    ]);
    
} catch (Exception $e) {
    error_log("Validate Mobile Error: " . $e->getMessage());
    sendError('Failed to validate mobile number. Please try again.', null, 500);
}

