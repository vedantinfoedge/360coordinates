<?php
/**
 * Admin Inquiries List API
 * GET /api/admin/inquiries/list.php
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
    $propertyId = isset($_GET['property_id']) ? intval($_GET['property_id']) : null;
    $agentBuilderId = isset($_GET['agent_builder_id']) ? intval($_GET['agent_builder_id']) : null;
    $search = isset($_GET['search']) ? trim($_GET['search']) : '';
    
    // Build WHERE clause
    $where = [];
    $params = [];
    
    if ($propertyId) {
        $where[] = "i.property_id = ?";
        $params[] = $propertyId;
    }
    
    if ($agentBuilderId) {
        $where[] = "i.seller_id = ?";
        $params[] = $agentBuilderId;
    }
    
    if ($search) {
        $where[] = "(i.name LIKE ? OR i.email LIKE ? OR i.mobile LIKE ? OR p.title LIKE ?)";
        $searchTerm = "%{$search}%";
        $params[] = $searchTerm;
        $params[] = $searchTerm;
        $params[] = $searchTerm;
        $params[] = $searchTerm;
    }
    
    $whereClause = !empty($where) ? "WHERE " . implode(" AND ", $where) : "";
    
    // Get inquiries with related data
    $query = "
        SELECT 
            i.*,
            p.id as property_id,
            p.title as property_title,
            p.location as property_location,
            p.price as property_price,
            u_seller.full_name as seller_name,
            u_seller.email as seller_email,
            u_seller.phone as seller_phone,
            u_seller.user_type as seller_type,
            u_buyer.full_name as buyer_name,
            u_buyer.email as buyer_email,
            u_buyer.phone as buyer_phone
        FROM inquiries i
        INNER JOIN properties p ON i.property_id = p.id
        LEFT JOIN users u_seller ON i.seller_id = u_seller.id
        LEFT JOIN users u_buyer ON i.buyer_id = u_buyer.id
        {$whereClause}
        ORDER BY i.created_at DESC
        LIMIT " . intval($limit) . " OFFSET " . intval($offset) . "
    ";
    
    $stmt = $db->prepare($query);
    $stmt->execute($params);
    $inquiries = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Get total count
    $countQuery = "SELECT COUNT(*) as total FROM inquiries i INNER JOIN properties p ON i.property_id = p.id {$whereClause}";
    $countStmt = $db->prepare($countQuery);
    $countStmt->execute($params);
    $totalResult = $countStmt->fetch(PDO::FETCH_ASSOC);
    $total = isset($totalResult['total']) ? intval($totalResult['total']) : 0;
    
    // Format inquiries
    $formattedInquiries = [];
    foreach ($inquiries as $inquiry) {
        $formattedInquiries[] = [
            'id' => intval($inquiry['id']),
            'property_id' => intval($inquiry['property_id']),
            'property_title' => $inquiry['property_title'] ?? 'N/A',
            'property_location' => $inquiry['property_location'] ?? 'N/A',
            'property_price' => floatval($inquiry['property_price'] ?? 0),
            'buyer_id' => $inquiry['buyer_id'] ? intval($inquiry['buyer_id']) : null,
            'buyer_name' => $inquiry['buyer_name'] ?? $inquiry['name'] ?? 'N/A',
            'buyer_email' => $inquiry['buyer_email'] ?? $inquiry['email'] ?? 'N/A',
            'buyer_mobile' => $inquiry['buyer_phone'] ?? $inquiry['mobile'] ?? 'N/A',
            'seller_id' => intval($inquiry['seller_id']),
            'seller_name' => $inquiry['seller_name'] ?? 'N/A',
            'seller_email' => $inquiry['seller_email'] ?? 'N/A',
            'seller_phone' => $inquiry['seller_phone'] ?? 'N/A',
            'seller_type' => $inquiry['seller_type'] ?? 'agent',
            'message' => $inquiry['message'] ?? '',
            'status' => $inquiry['status'] ?? 'new',
            'created_at' => $inquiry['created_at'] ?? null,
            'updated_at' => $inquiry['updated_at'] ?? null
        ];
    }
    
    // Get filter options (properties and agents/builders)
    $propertiesQuery = "SELECT DISTINCT p.id, p.title FROM properties p ORDER BY p.title ASC LIMIT 50";
    $propertiesStmt = $db->query($propertiesQuery);
    $properties = $propertiesStmt->fetchAll(PDO::FETCH_ASSOC);
    
    $agentsQuery = "SELECT DISTINCT u.id, u.full_name, u.user_type FROM users u WHERE u.user_type = 'agent' ORDER BY u.full_name ASC";
    $agentsStmt = $db->query($agentsQuery);
    $agents = $agentsStmt->fetchAll(PDO::FETCH_ASSOC);
    
    sendSuccess('Inquiries retrieved successfully', [
        'inquiries' => $formattedInquiries,
        'pagination' => [
            'page' => $page,
            'limit' => $limit,
            'total' => $total,
            'pages' => ceil($total / $limit)
        ],
        'filter_options' => [
            'properties' => $properties,
            'agents_builders' => $agents
        ]
    ]);
    
} catch (Exception $e) {
    error_log("Admin Inquiries List Error: " . $e->getMessage());
    sendError('Failed to retrieve inquiries', null, 500);
}

