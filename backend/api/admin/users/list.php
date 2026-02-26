<?php
/**
 * Admin Users List API
 * GET /api/admin/users/list.php
 */

// Start output buffering immediately
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
    
    // Pagination
    $page = isset($_GET['page']) ? max(1, intval($_GET['page'])) : 1;
    $limit = isset($_GET['limit']) ? min(100, max(1, intval($_GET['limit']))) : 20;
    $offset = ($page - 1) * $limit;
    
    // Filters
    $userType = isset($_GET['user_type']) ? $_GET['user_type'] : null;
    $search = isset($_GET['search']) ? trim($_GET['search']) : '';
    $status = isset($_GET['status']) ? $_GET['status'] : null;
    
    // Check if is_banned column exists
    $hasIsBanned = false;
    try {
        $checkStmt = $db->query("SHOW COLUMNS FROM users LIKE 'is_banned'");
        $hasIsBanned = $checkStmt->rowCount() > 0;
    } catch (Exception $e) {
        $hasIsBanned = false;
    }
    
    // Build WHERE clause (use u. prefix for user table fields)
    // Users page should ONLY show buyers and sellers (NOT agents)
    $where = ["u.user_type IN ('buyer', 'seller')"];
    $params = [];
    
    if ($userType && in_array($userType, ['buyer', 'seller'])) {
        $where[] = "u.user_type = ?";
        $params[] = $userType;
    }
    
    if ($search) {
        $where[] = "(u.full_name LIKE ? OR u.email LIKE ? OR u.phone LIKE ?)";
        $searchTerm = "%{$search}%";
        $params[] = $searchTerm;
        $params[] = $searchTerm;
        $params[] = $searchTerm;
    }
    
    // Only filter by is_banned if column exists
    if ($hasIsBanned) {
        if ($status === 'banned') {
            $where[] = "u.is_banned = 1";
        } elseif ($status === 'active') {
            $where[] = "(u.is_banned = 0 OR u.is_banned IS NULL)";
        }
    }
    
    $whereClause = !empty($where) ? "WHERE " . implode(" AND ", $where) : "";
    
    // Get total count (using same where clause)
    $countQuery = "SELECT COUNT(*) as total FROM users u {$whereClause}";
    $countStmt = $db->prepare($countQuery);
    if (!empty($where)) {
        $countStmt->execute($params);
    } else {
        $countStmt->execute();
    }
    $totalResult = $countStmt->fetch(PDO::FETCH_ASSOC);
    $total = isset($totalResult['total']) ? intval($totalResult['total']) : 0;
    
    // Build query params
    $queryParams = [];
    if (!empty($where)) {
        $queryParams = $params;
    }
    
    // Build SELECT columns - profile_image is in user_profiles table, not users table
    // Always join with user_profiles to get profile_image
    $selectColumns = "u.id, u.full_name, u.email, u.phone, u.user_type, u.email_verified, u.phone_verified, up.profile_image, u.created_at";
    if ($hasIsBanned) {
        $selectColumns = "u.id, u.full_name, u.email, u.phone, u.user_type, u.email_verified, u.phone_verified, up.profile_image, u.is_banned, u.created_at";
    }
    $joinClause = "LEFT JOIN user_profiles up ON u.id = up.user_id";
    
    // Get users with profile_image from user_profiles table
    $query = "SELECT {$selectColumns} FROM users u {$joinClause} {$whereClause} ORDER BY u.created_at DESC LIMIT " . intval($limit) . " OFFSET " . intval($offset);
    
    $stmt = $db->prepare($query);
    $stmt->execute($queryParams);
    $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Format users
    $formattedUsers = [];
    foreach ($users as $user) {
        $userId = isset($user['id']) ? intval($user['id']) : 0;
        
        if ($userId <= 0) {
            continue;
        }
        
        // Get property count
        $propertyCount = 0;
        try {
            $propStmt = $db->prepare("SELECT COUNT(*) as count FROM properties WHERE user_id = ?");
            $propStmt->execute([$userId]);
            $propResult = $propStmt->fetch(PDO::FETCH_ASSOC);
            $propertyCount = isset($propResult['count']) ? intval($propResult['count']) : 0;
        } catch (Exception $e) {
            $propertyCount = 0;
        }
        
        // Get inquiry count
        $inquiryCount = 0;
        try {
            $inqStmt = $db->prepare("SELECT COUNT(*) as count FROM inquiries WHERE seller_id = ?");
            $inqStmt->execute([$userId]);
            $inqResult = $inqStmt->fetch(PDO::FETCH_ASSOC);
            $inquiryCount = isset($inqResult['count']) ? intval($inqResult['count']) : 0;
        } catch (Exception $e) {
            $inquiryCount = 0;
        }
        
        $formattedUsers[] = [
            'id' => $userId,
            'full_name' => isset($user['full_name']) ? $user['full_name'] : 'N/A',
            'email' => isset($user['email']) ? $user['email'] : '',
            'phone' => isset($user['phone']) ? $user['phone'] : null,
            'user_type' => isset($user['user_type']) ? $user['user_type'] : 'buyer',
            'email_verified' => isset($user['email_verified']) ? (bool)$user['email_verified'] : false,
            'phone_verified' => isset($user['phone_verified']) ? (bool)$user['phone_verified'] : false,
            'profile_image' => isset($user['profile_image']) ? $user['profile_image'] : null,
            'is_banned' => ($hasIsBanned && isset($user['is_banned'])) ? (bool)$user['is_banned'] : false,
            'created_at' => isset($user['created_at']) ? $user['created_at'] : null,
            'property_count' => $propertyCount,
            'inquiry_count' => $inquiryCount
        ];
    }
    
    // Clean output and send response
    ob_end_clean();
    
    echo json_encode([
        'success' => true,
        'message' => 'Users retrieved successfully',
        'data' => [
            'users' => $formattedUsers,
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
