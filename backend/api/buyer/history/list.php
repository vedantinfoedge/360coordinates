<?php
/**
 * List Property History API
 * GET /api/buyer/history/list.php
 * 
 * Retrieves buyer's property view history
 * Returns properties with history information
 */

require_once __DIR__ . '/../../../config/config.php';
require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../../utils/response.php';
require_once __DIR__ . '/../../../utils/auth.php';

handlePreflight();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendError('Method not allowed', null, 405);
}

try {
    $user = requireAuth();
    
    // Only buyers can view history
    if ($user['user_type'] !== 'buyer') {
        sendError('Only buyers can view property history', null, 403);
    }
    
    $db = getDB();
    
    $page = isset($_GET['page']) ? max(1, intval($_GET['page'])) : 1;
    $limit = isset($_GET['limit']) ? min(MAX_PAGE_SIZE, max(1, intval($_GET['limit']))) : DEFAULT_PAGE_SIZE;
    $offset = ($page - 1) * $limit;
    
    // Get history entries with property details
    $query = "
        SELECT p.*,
               u.full_name as seller_name,
               u.email as seller_email,
               u.phone as seller_phone,
               GROUP_CONCAT(DISTINCT pi.image_url ORDER BY pi.image_order) as images,
               GROUP_CONCAT(DISTINCT pa.amenity_id) as amenities,
               ph.action_type,
               ph.created_at as viewed_at,
               ph.updated_at as last_interaction_at
        FROM property_history ph
        INNER JOIN properties p ON ph.property_id = p.id
        INNER JOIN users u ON p.user_id = u.id
        LEFT JOIN property_images pi ON p.id = pi.property_id
        LEFT JOIN property_amenities pa ON p.id = pa.property_id
        WHERE ph.user_id = ? AND p.is_active = 1
        GROUP BY p.id
        ORDER BY ph.updated_at DESC
        LIMIT " . intval($limit) . " OFFSET " . intval($offset) . "
    ";
    
    $stmt = $db->prepare($query);
    $stmt->execute([$user['id']]);
    $properties = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Get total count
    $stmt = $db->prepare("SELECT COUNT(*) as total FROM property_history WHERE user_id = ?");
    $stmt->execute([$user['id']]);
    $total = $stmt->fetch(PDO::FETCH_ASSOC)['total'];
    
    // Format properties to match frontend expectations
    foreach ($properties as &$property) {
        $property['images'] = $property['images'] ? explode(',', $property['images']) : [];
        $property['amenities'] = $property['amenities'] ? explode(',', $property['amenities']) : [];
        $property['price_negotiable'] = (bool)$property['price_negotiable'];
        
        // Format history-specific fields to match PropertyHistoryManager structure
        $property['propertyId'] = $property['id'];
        $property['propertyTitle'] = $property['title'];
        $property['ownerName'] = $property['seller_name'] ?? 'Property Owner';
        $property['ownerContactNumber'] = $property['seller_phone'] ?? '';
        $property['ownerEmail'] = $property['seller_email'] ?? '';
        $property['actionType'] = $property['action_type'];
        $property['viewedAt'] = $property['viewed_at'];
    }
    
    sendSuccess('History retrieved successfully', [
        'history' => $properties,
        'pagination' => [
            'page' => $page,
            'limit' => $limit,
            'total' => intval($total),
            'total_pages' => ceil($total / $limit)
        ]
    ]);
    
} catch (Exception $e) {
    error_log("List History Error: " . $e->getMessage());
    sendError('Failed to retrieve history', null, 500);
}
