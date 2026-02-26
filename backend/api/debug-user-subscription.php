<?php
/**
 * Debug User Subscription and Properties
 * GET /api/debug-user-subscription.php?user_id=22
 */

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../utils/response.php';

header('Content-Type: application/json');

try {
    $userId = isset($_GET['user_id']) ? intval($_GET['user_id']) : null;
    
    if (!$userId) {
        echo json_encode([
            'error' => 'user_id parameter is required',
            'usage' => '/api/debug-user-subscription.php?user_id=22'
        ], JSON_PRETTY_PRINT);
        exit;
    }
    
    $db = getDB();
    
    // 1. Check how many properties user has
    $stmt = $db->prepare("SELECT COUNT(*) as property_count FROM properties WHERE user_id = ?");
    $stmt->execute([$userId]);
    $propertyCount = $stmt->fetch(PDO::FETCH_ASSOC);
    
    // 2. Get user details
    $stmt = $db->prepare("SELECT id, full_name, email, user_type FROM users WHERE id = ?");
    $stmt->execute([$userId]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    
    // 3. Check subscription
    $stmt = $db->prepare("SELECT * FROM subscriptions WHERE user_id = ? ORDER BY created_at DESC LIMIT 1");
    $stmt->execute([$userId]);
    $subscription = $stmt->fetch(PDO::FETCH_ASSOC);
    
    // 4. Check if subscriptions table exists
    $stmt = $db->query("SHOW TABLES LIKE 'subscriptions'");
    $subscriptionsTableExists = $stmt->rowCount() > 0;
    
    // 5. Get subscription table structure (only if table exists)
    $subscriptionColumns = [];
    if ($subscriptionsTableExists) {
        try {
            $stmt = $db->query("DESCRIBE subscriptions");
            $subscriptionColumns = $stmt->fetchAll(PDO::FETCH_ASSOC);
        } catch (Exception $e) {
            $subscriptionColumns = ['error' => $e->getMessage()];
        }
    }
    
    // 6. Get all properties for this user
    $stmt = $db->prepare("
        SELECT 
            id, 
            title, 
            status, 
            property_type,
            created_at,
            is_active,
            (SELECT COUNT(*) FROM property_images WHERE property_id = properties.id) as image_count
        FROM properties 
        WHERE user_id = ? 
        ORDER BY created_at DESC
    ");
    $stmt->execute([$userId]);
    $properties = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // 7. Get subscription limits from config
    $subscriptionLimits = [
        'free' => defined('FREE_PLAN_PROPERTY_LIMIT') ? FREE_PLAN_PROPERTY_LIMIT : 3,
        'basic' => defined('BASIC_PLAN_PROPERTY_LIMIT') ? BASIC_PLAN_PROPERTY_LIMIT : 10,
        'pro' => defined('PRO_PLAN_PROPERTY_LIMIT') ? PRO_PLAN_PROPERTY_LIMIT : 50,
        'premium' => defined('PREMIUM_PLAN_PROPERTY_LIMIT') ? PREMIUM_PLAN_PROPERTY_LIMIT : -1
    ];
    
    // 8. Determine current plan and limit
    $currentPlan = $subscription['plan_type'] ?? 'free';
    $currentLimit = $subscriptionLimits[$currentPlan] ?? $subscriptionLimits['free'];
    $canAddMore = ($currentLimit < 0) || ($propertyCount['property_count'] < $currentLimit);
    
    $result = [
        'user' => $user,
        'property_count' => $propertyCount['property_count'] ?? 0,
        'properties' => $properties,
        'subscription' => $subscription ?: null,
        'subscription_table_exists' => $subscriptionsTableExists,
        'subscription_table_structure' => $subscriptionColumns,
        'subscription_limits' => $subscriptionLimits,
        'current_plan' => $currentPlan,
        'current_limit' => $currentLimit,
        'can_add_more_properties' => $canAddMore,
        'properties_remaining' => ($currentLimit < 0) ? 'unlimited' : max(0, $currentLimit - $propertyCount['property_count']),
        'timestamp' => date('Y-m-d H:i:s')
    ];
    
    echo json_encode($result, JSON_PRETTY_PRINT);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'error' => $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine()
    ], JSON_PRETTY_PRINT);
}

