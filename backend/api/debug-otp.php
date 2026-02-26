<?php
/**
 * Debug OTP - Check what OTPs exist for an email
 * GET /api/debug-otp.php?email=your@email.com
 */

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../utils/response.php';

header('Content-Type: application/json');

$email = $_GET['email'] ?? '';

if (empty($email)) {
    echo json_encode(['error' => 'Email parameter required']);
    exit;
}

$email = strtolower(trim($email));

try {
    $db = getDB();
    
    // Get all OTPs for this email
    $stmt = $db->prepare("SELECT id, email, otp, otp_type, verified, expires_at, created_at, TIMESTAMPDIFF(SECOND, NOW(), expires_at) as seconds_until_expiry FROM otp_verifications WHERE LOWER(TRIM(email)) = ? AND otp_type = 'email' ORDER BY created_at DESC LIMIT 10");
    $stmt->execute([$email]);
    $records = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode([
        'email' => $email,
        'count' => count($records),
        'records' => $records
    ], JSON_PRETTY_PRINT);
    
} catch (Exception $e) {
    echo json_encode(['error' => $e->getMessage()]);
}

