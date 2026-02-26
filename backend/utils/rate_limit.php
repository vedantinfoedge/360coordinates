<?php
/**
 * Rate Limiting Utility
 * Implements in-memory rate limiting (can be upgraded to Redis)
 */

require_once __DIR__ . '/../config/database.php';

// In-memory store for rate limiting (use Redis in production)
$rateLimitStore = [];

/**
 * Get client IP address
 * Wrapped in function_exists check to prevent redeclaration errors
 */
if (!function_exists('getClientIP')) {
    function getClientIP() {
        $ipKeys = ['HTTP_CLIENT_IP', 'HTTP_X_FORWARDED_FOR', 'HTTP_X_FORWARDED', 'HTTP_X_CLUSTER_CLIENT_IP', 'HTTP_FORWARDED_FOR', 'HTTP_FORWARDED', 'REMOTE_ADDR'];
        
        foreach ($ipKeys as $key) {
            if (array_key_exists($key, $_SERVER) === true) {
                foreach (explode(',', $_SERVER[$key]) as $ip) {
                    $ip = trim($ip);
                    if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE) !== false) {
                        return $ip;
                    }
                }
            }
        }
        
        return $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
    }
}

/**
 * Check rate limit using database (more persistent than in-memory)
 */
if (!function_exists('checkRateLimit')) {
function checkRateLimit($key, $maxAttempts, $windowSeconds) {
    $db = getDB();
    $ip = getClientIP();
    $identifier = $key . ':' . $ip;
    $now = time();
    
    // Create rate_limit_logs table if it doesn't exist
    try {
        $db->exec("CREATE TABLE IF NOT EXISTS rate_limit_logs (
            id INT AUTO_INCREMENT PRIMARY KEY,
            identifier VARCHAR(255) NOT NULL,
            attempts INT DEFAULT 1,
            first_attempt_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_attempt_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            expires_at TIMESTAMP NOT NULL,
            INDEX idx_identifier (identifier),
            INDEX idx_expires_at (expires_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    } catch (PDOException $e) {
        // Table might already exist
    }
    
    // Clean expired entries
    try {
        $db->exec("DELETE FROM rate_limit_logs WHERE expires_at < NOW()");
    } catch (PDOException $e) {
        // Ignore errors
    }
    
    // Check existing rate limit record
    $stmt = $db->prepare("SELECT attempts, first_attempt_at FROM rate_limit_logs WHERE identifier = ?");
    $stmt->execute([$identifier]);
    $record = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($record) {
        // Check if window has expired
        $firstAttempt = strtotime($record['first_attempt_at']);
        if (($now - $firstAttempt) >= $windowSeconds) {
            // Window expired, reset
            $stmt = $db->prepare("UPDATE rate_limit_logs SET attempts = 1, first_attempt_at = NOW(), expires_at = DATE_ADD(NOW(), INTERVAL ? SECOND) WHERE identifier = ?");
            $stmt->execute([$windowSeconds, $identifier]);
            return ['allowed' => true, 'remaining' => $maxAttempts - 1, 'reset_at' => $now + $windowSeconds];
        }
        
        // Check if limit exceeded
        if ($record['attempts'] >= $maxAttempts) {
            $resetAt = $firstAttempt + $windowSeconds;
            return ['allowed' => false, 'remaining' => 0, 'reset_at' => $resetAt];
        }
        
        // Increment attempts
        $stmt = $db->prepare("UPDATE rate_limit_logs SET attempts = attempts + 1, last_attempt_at = NOW() WHERE identifier = ?");
        $stmt->execute([$identifier]);
        
        $remaining = $maxAttempts - $record['attempts'] - 1;
        return ['allowed' => true, 'remaining' => max(0, $remaining), 'reset_at' => $firstAttempt + $windowSeconds];
    } else {
        // Create new record
        $stmt = $db->prepare("INSERT INTO rate_limit_logs (identifier, attempts, expires_at) VALUES (?, 1, DATE_ADD(NOW(), INTERVAL ? SECOND))");
        $stmt->execute([$identifier, $windowSeconds]);
        
        return ['allowed' => true, 'remaining' => $maxAttempts - 1, 'reset_at' => $now + $windowSeconds];
    }
}
}

/**
 * Check rate limit for mobile number
 */
if (!function_exists('checkMobileRateLimit')) {
function checkMobileRateLimit($mobile, $maxAttempts, $windowSeconds) {
    $normalized = preg_replace('/[^0-9]/', '', $mobile);
    return checkRateLimit('mobile:' . $normalized, $maxAttempts, $windowSeconds);
}
}

/**
 * Check rate limit for IP address
 */
if (!function_exists('checkIPRateLimit')) {
function checkIPRateLimit($maxAttempts, $windowSeconds) {
    return checkRateLimit('ip', $maxAttempts, $windowSeconds);
}
}

