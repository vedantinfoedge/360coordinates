<?php
/**
 * Admin Dashboard Statistics API
 * GET /api/admin/dashboard/stats.php
 */

require_once __DIR__ . '/../../../config/config.php';
require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../../utils/response.php';
require_once __DIR__ . '/../../../utils/admin_auth.php';

handlePreflight();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendError('Method not allowed', null, 405);
}

// Ensure fresh counts every time (no caching)
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');

try {
    $admin = requireAdmin();
    if (!$admin) {
        sendError('Admin authentication required', null, 401);
    }
    
    $db = getDB();
    if (!$db) {
        sendError('Database connection failed', null, 500);
    }
    
    // Get date range filter
    $dateRange = $_GET['date_range'] ?? 'all';
    $days = null;
    if ($dateRange !== 'all') {
        // Parse date range (e.g., '7d', '30d', '90d')
        if (preg_match('/(\d+)d/', $dateRange, $matches)) {
            $days = intval($matches[1]);
        } else {
            $days = intval($dateRange);
        }
        // Validate days is positive and reasonable (max 365 days)
        if ($days <= 0 || $days > 365) {
            $days = null;
        }
    }
    
    // Build date filter clause safely (used only for subscriptions / optional metrics; main totals are always all-time)
    $dateFilter = '';
    $dateParams = [];
    if ($days !== null) {
        $dateFilter = " AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)";
        $dateParams = [$days];
    }

    // Total Properties = actual full count from properties table (all time, no date filter)
    $stmt = $db->query("SELECT COUNT(*) as total FROM properties");
    $totalProperties = (int) $stmt->fetch()['total'];

    // Active Properties = all time
    $stmt = $db->query("SELECT COUNT(*) as total FROM properties WHERE is_active = 1");
    $activeProperties = (int) $stmt->fetch()['total'];

    // Pending Properties = all time
    $stmt = $db->query("SELECT COUNT(*) as total FROM properties WHERE is_active = 0");
    $pendingProperties = (int) $stmt->fetch()['total'];

    // Total Users = actual count of buyers + sellers only, all time (exclude admins, moderators, agents)
    $stmt = $db->query("SELECT COUNT(*) as total FROM users WHERE user_type IN ('buyer', 'seller')");
    $totalUsers = (int) $stmt->fetch()['total'];

    // Users by type (buyer/seller only) - all time
    $stmt = $db->query("SELECT user_type, COUNT(*) as count FROM users WHERE user_type IN ('buyer', 'seller') GROUP BY user_type");
    $usersByType = $stmt->fetchAll(PDO::FETCH_KEY_PAIR);
    
    // Active Agents - always count ALL users with user_type = 'agent' (not filtered by date)
    $stmt = $db->query("SELECT COUNT(*) as total FROM users WHERE user_type = 'agent'");
    $totalAgents = (int) $stmt->fetch()['total'];
    
    // Total Subscriptions
    $subscriptionDateFilter = $dateFilter; // Same filter for subscriptions
    $stmt = $db->prepare("SELECT COUNT(*) as total FROM subscriptions WHERE 1=1" . $subscriptionDateFilter);
    $stmt->execute($dateParams);
    $totalSubscriptions = $stmt->fetch()['total'];
    
    // Active Subscriptions
    $stmt = $db->query("SELECT COUNT(*) as total FROM subscriptions WHERE is_active = 1 AND (end_date IS NULL OR end_date > NOW())");
    $activeSubscriptions = $stmt->fetch()['total'];
    
    // Expired Subscriptions
    $stmt = $db->query("SELECT COUNT(*) as total FROM subscriptions WHERE is_active = 0 OR (end_date IS NOT NULL AND end_date <= NOW())");
    $expiredSubscriptions = $stmt->fetch()['total'];
    
    // Properties by type
    $stmt = $db->query("SELECT property_type, COUNT(*) as count FROM properties WHERE is_active = 1 GROUP BY property_type");
    $propertiesByType = $stmt->fetchAll(PDO::FETCH_KEY_PAIR);
    
    // Properties by status (sale/rent)
    $stmt = $db->query("SELECT status, COUNT(*) as count FROM properties WHERE is_active = 1 GROUP BY status");
    $propertiesByStatus = $stmt->fetchAll(PDO::FETCH_KEY_PAIR);
    
    // Recent properties (last 5)
    $stmt = $db->query("
        SELECT p.*, u.full_name as seller_name 
        FROM properties p 
        LEFT JOIN users u ON p.user_id = u.id 
        ORDER BY p.created_at DESC 
        LIMIT 5
    ");
    $recentProperties = $stmt->fetchAll();
    
    // Calculate property type percentages
    $totalActiveProps = array_sum($propertiesByType);
    $propertyTypesDistribution = [];
    if ($totalActiveProps > 0) {
        foreach ($propertiesByType as $type => $count) {
            $propertyTypesDistribution[] = [
                'name' => $type,
                'count' => intval($count),
                'percentage' => round(($count / $totalActiveProps) * 100, 1)
            ];
        }
    }
    
    $stats = [
        'totalProperties' => $totalProperties,
        'totalUsers' => $totalUsers,
        'total_properties' => $totalProperties,
        'active_properties' => $activeProperties,
        'pending_properties' => $pendingProperties,
        'total_users' => $totalUsers,
        'users_by_type' => [
            'buyer' => intval($usersByType['buyer'] ?? 0),
            'seller' => intval($usersByType['seller'] ?? 0),
            'agent' => intval($usersByType['agent'] ?? 0)
        ],
        'total_agents' => intval($totalAgents),
        'total_subscriptions' => intval($totalSubscriptions),
        'active_subscriptions' => intval($activeSubscriptions),
        'expired_subscriptions' => intval($expiredSubscriptions),
        'properties_by_type' => $propertiesByType,
        'properties_by_status' => [
            'sale' => intval($propertiesByStatus['sale'] ?? 0),
            'rent' => intval($propertiesByStatus['rent'] ?? 0)
        ],
        'property_types_distribution' => $propertyTypesDistribution,
        'recent_properties' => $recentProperties
    ];
    
    sendSuccess('Stats retrieved successfully', $stats);
    
} catch (PDOException $e) {
    error_log("Admin Dashboard Stats PDO Error: " . $e->getMessage());
    error_log("Stack trace: " . $e->getTraceAsString());
    sendError('Database error: Failed to retrieve stats', null, 500);
} catch (Exception $e) {
    error_log("Admin Dashboard Stats Error: " . $e->getMessage());
    error_log("Stack trace: " . $e->getTraceAsString());
    sendError('Failed to retrieve stats: ' . $e->getMessage(), null, 500);
} catch (Error $e) {
    error_log("Admin Dashboard Stats Fatal Error: " . $e->getMessage());
    error_log("Stack trace: " . $e->getTraceAsString());
    sendError('System error: Failed to retrieve stats', null, 500);
}
