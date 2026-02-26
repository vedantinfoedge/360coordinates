<?php
/**
 * test of deployment on hostinger try 2
 * Admin Agents List API
 * GET /api/admin/agents/list.php
 */

// Start output buffering
ob_start();

// Error handling
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

// Set headers early
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: http://localhost:3000');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Credentials: true');

// Handle preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    ob_end_clean();
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    ob_end_clean();
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit();
}

try {
    require_once __DIR__ . '/../../../config/config.php';
    require_once __DIR__ . '/../../../config/database.php';
    require_once __DIR__ . '/../../../utils/response.php';
    require_once __DIR__ . '/../../../utils/admin_auth.php';
    
    // Authenticate admin
    $admin = requireAdmin();
    if (!$admin) {
        ob_end_clean();
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Admin authentication required']);
        exit();
    }
    
    $db = getDB();
    
    // Check if is_banned and agent_verified columns exist
    $hasIsBanned = false;
    $hasAgentVerified = false;
    try {
        $checkStmt = $db->query("SHOW COLUMNS FROM users LIKE 'is_banned'");
        $hasIsBanned = $checkStmt->rowCount() > 0;
        
        $checkStmt = $db->query("SHOW COLUMNS FROM users LIKE 'agent_verified'");
        $hasAgentVerified = $checkStmt->rowCount() > 0;
    } catch (Exception $e) {
        // Columns don't exist
    }
    
    // Pagination
    $page = isset($_GET['page']) ? max(1, intval($_GET['page'])) : 1;
    $limit = isset($_GET['limit']) ? min(100, max(1, intval($_GET['limit']))) : 20;
    $offset = ($page - 1) * $limit;
    
    // Filters
    $search = isset($_GET['search']) ? trim($_GET['search']) : '';
    $verified = isset($_GET['verified']) ? $_GET['verified'] : null;
    
    // Build query - Show ONLY agents (agent/builder users)
    $where = ["u.user_type = 'agent'"];
    $params = [];
    
    if ($search) {
        $where[] = "(u.full_name LIKE ? OR u.email LIKE ? OR u.phone LIKE ?)";
        $searchTerm = "%{$search}%";
        $params[] = $searchTerm;
        $params[] = $searchTerm;
        $params[] = $searchTerm;
    }
    
    if ($verified !== null && $hasAgentVerified) {
        $where[] = "(u.agent_verified = ? OR (u.agent_verified IS NULL AND ? = 0))";
        $params[] = $verified ? 1 : 0;
        $params[] = $verified ? 1 : 0;
    }
    
    $whereClause = "WHERE " . implode(" AND ", $where);
    
    // Build SELECT columns - profile_image is in user_profiles table, not users table
    // Always join with user_profiles to get profile_image
    $selectColumns = ["u.id", "u.full_name", "u.email", "u.phone", "u.user_type", "u.email_verified", "u.phone_verified", "up.profile_image", "u.created_at"];
    $joinClause = "LEFT JOIN user_profiles up ON u.id = up.user_id";
    
    if ($hasIsBanned) {
        $selectColumns[] = "u.is_banned";
    }
    if ($hasAgentVerified) {
        $selectColumns[] = "u.agent_verified";
    }
    
    $selectColumnsStr = implode(", ", $selectColumns);
    
    // Get agents with profile_image from user_profiles table
    $query = "
        SELECT 
            {$selectColumnsStr},
            (SELECT COUNT(*) FROM properties WHERE user_id = u.id) as property_count,
            (SELECT COUNT(*) FROM inquiries WHERE seller_id = u.id) as leads_count
        FROM users u
        {$joinClause}
        {$whereClause}
        ORDER BY u.created_at DESC
        LIMIT " . intval($limit) . " OFFSET " . intval($offset) . "
    ";
    
    $stmt = $db->prepare($query);
    $stmt->execute($params);
    $agents = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Get total count
    $countQuery = "SELECT COUNT(*) as total FROM users u {$whereClause}";
    $countStmt = $db->prepare($countQuery);
    if (!empty($params)) {
        $countStmt->execute($params);
    } else {
        $countStmt->execute();
    }
    $totalResult = $countStmt->fetch(PDO::FETCH_ASSOC);
    $total = isset($totalResult['total']) ? intval($totalResult['total']) : 0;
    
    // Format agents
    $formattedAgents = [];
    foreach ($agents as $agent) {
        $formattedAgents[] = [
            'id' => intval($agent['id'] ?? 0),
            'full_name' => $agent['full_name'] ?? 'N/A',
            'email' => $agent['email'] ?? '',
            'phone' => $agent['phone'] ?? null,
            'user_type' => $agent['user_type'] ?? 'agent',
            'email_verified' => isset($agent['email_verified']) ? (bool)$agent['email_verified'] : false,
            'phone_verified' => isset($agent['phone_verified']) ? (bool)$agent['phone_verified'] : false,
            'profile_image' => $agent['profile_image'] ?? null,
            'agent_verified' => ($hasAgentVerified && isset($agent['agent_verified'])) ? (bool)$agent['agent_verified'] : false,
            'is_banned' => ($hasIsBanned && isset($agent['is_banned'])) ? (bool)$agent['is_banned'] : false,
            'created_at' => $agent['created_at'] ?? null,
            'property_count' => isset($agent['property_count']) ? intval($agent['property_count']) : 0,
            'leads_count' => isset($agent['leads_count']) ? intval($agent['leads_count']) : 0
        ];
    }
    
    // Clean output and send response
    ob_end_clean();
    
    echo json_encode([
        'success' => true,
        'message' => 'Agents retrieved successfully',
        'data' => [
            'agents' => $formattedAgents,
            'pagination' => [
                'page' => $page,
                'limit' => $limit,
                'total' => $total,
                'pages' => $total > 0 ? ceil($total / $limit) : 0
            ]
        ]
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit();
    
} catch (PDOException $e) {
    ob_end_clean();
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Database error: ' . $e->getMessage(),
        'error_code' => $e->getCode(),
        'error_info' => $e->errorInfo ?? []
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit();
    
} catch (Exception $e) {
    ob_end_clean();
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error: ' . $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine()
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit();
}
