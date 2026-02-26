<?php
/**
 * Admin Subscriptions List API
 * GET /api/admin/subscriptions/list.php
 */

require_once __DIR__ . '/../../../config/config.php';
require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../../utils/response.php';
require_once __DIR__ . '/../../../utils/admin_auth.php';

handlePreflight();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendError('Method not allowed', null, 405);
}

try {
    $admin = requireAdmin();
    $db = getDB();
    
    // Pagination
    $page = isset($_GET['page']) ? max(1, intval($_GET['page'])) : 1;
    $limit = isset($_GET['limit']) ? min(100, max(1, intval($_GET['limit']))) : 20;
    $offset = ($page - 1) * $limit;
    
    // Filters
    $planType = isset($_GET['plan_type']) ? trim($_GET['plan_type']) : null;
    $status = isset($_GET['status']) ? trim($_GET['status']) : null; // active, expired, all
    $search = isset($_GET['search']) ? trim($_GET['search']) : '';
    
    // Build WHERE clause
    $where = [];
    $params = [];
    
    if ($planType && $planType !== 'all') {
        $where[] = "s.plan_type = ?";
        $params[] = $planType;
    }
    
    if ($status && $status !== 'all') {
        if ($status === 'active') {
            $where[] = "s.is_active = 1 AND (s.end_date IS NULL OR s.end_date > NOW())";
        } elseif ($status === 'expired') {
            $where[] = "(s.is_active = 0 OR (s.end_date IS NOT NULL AND s.end_date <= NOW()))";
        }
    }
    
    if ($search) {
        $where[] = "(u.full_name LIKE ? OR u.email LIKE ? OR u.phone LIKE ?)";
        $searchTerm = "%{$search}%";
        $params[] = $searchTerm;
        $params[] = $searchTerm;
        $params[] = $searchTerm;
    }
    
    $whereClause = !empty($where) ? "WHERE " . implode(" AND ", $where) : "";
    
    // Get subscriptions with user data
    $query = "
        SELECT 
            s.*,
            u.id as user_id,
            u.full_name as user_name,
            u.email as user_email,
            u.phone as user_phone,
            u.user_type
        FROM subscriptions s
        INNER JOIN users u ON s.user_id = u.id
        {$whereClause}
        ORDER BY s.created_at DESC
        LIMIT " . intval($limit) . " OFFSET " . intval($offset) . "
    ";
    
    $stmt = $db->prepare($query);
    $stmt->execute($params);
    $subscriptions = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Get total count
    $countQuery = "SELECT COUNT(*) as total FROM subscriptions s INNER JOIN users u ON s.user_id = u.id {$whereClause}";
    $countStmt = $db->prepare($countQuery);
    $countStmt->execute($params);
    $totalResult = $countStmt->fetch(PDO::FETCH_ASSOC);
    $total = isset($totalResult['total']) ? intval($totalResult['total']) : 0;
    
    // Format subscriptions
    $formattedSubscriptions = [];
    foreach ($subscriptions as $sub) {
        $endDate = $sub['end_date'] ? new DateTime($sub['end_date']) : null;
        $now = new DateTime();
        $isExpired = false;
        
        if ($endDate) {
            $isExpired = $endDate < $now;
        }
        
        $isActive = $sub['is_active'] == 1 && !$isExpired;
        
        $formattedSubscriptions[] = [
            'id' => intval($sub['id']),
            'user_id' => intval($sub['user_id']),
            'user_name' => $sub['user_name'] ?? 'N/A',
            'user_email' => $sub['user_email'] ?? 'N/A',
            'user_phone' => $sub['user_phone'] ?? 'N/A',
            'user_type' => $sub['user_type'] ?? 'buyer',
            'plan_type' => $sub['plan_type'] ?? 'free',
            'start_date' => $sub['start_date'] ?? null,
            'end_date' => $sub['end_date'] ?? null,
            'is_active' => $isActive,
            'created_at' => $sub['created_at'] ?? null
        ];
    }
    
    sendSuccess('Subscriptions retrieved successfully', [
        'subscriptions' => $formattedSubscriptions,
        'pagination' => [
            'page' => $page,
            'limit' => $limit,
            'total' => $total,
            'pages' => ceil($total / $limit)
        ]
    ]);
    
} catch (Exception $e) {
    error_log("Admin Subscriptions List Error: " . $e->getMessage());
    sendError('Failed to retrieve subscriptions', null, 500);
}

