<?php
/**
 * Admin Properties List API
 * GET /api/admin/properties/list.php
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
    $status = isset($_GET['status']) ? $_GET['status'] : null; // approved, pending, sold, all
    $propertyType = isset($_GET['property_type']) ? trim($_GET['property_type']) : null;
    $city = isset($_GET['city']) ? trim($_GET['city']) : null;
    $location = isset($_GET['location']) ? trim($_GET['location']) : null;
    $minPrice = isset($_GET['min_price']) ? floatval($_GET['min_price']) : null;
    $maxPrice = isset($_GET['max_price']) ? floatval($_GET['max_price']) : null;
    $search = isset($_GET['search']) ? trim($_GET['search']) : '';
    
    // Build query
    $where = [];
    $params = [];
    
    // Status filter: approved (is_active=1), pending (is_active=0), sold (status='sold' or custom field)
    if ($status && $status !== 'all') {
        if ($status === 'approved') {
            $where[] = "p.is_active = ?";
            $params[] = 1;
        } elseif ($status === 'pending') {
            $where[] = "p.is_active = ?";
            $params[] = 0;
        } elseif ($status === 'sold') {
            // Check if sold_status column exists, otherwise use a placeholder
            // For now, we'll check if there's a way to mark properties as sold
            // This can be enhanced later with a dedicated sold_status field
            $where[] = "p.is_active = ? AND p.status = 'sale'";
            $params[] = 0; // Sold properties might be marked inactive
        }
    }
    
    // Property type filter
    if ($propertyType) {
        // Handle compound property types (e.g., "Villa / Row House")
        $propertyType = str_replace(['+', '%2F', '%2f'], [' ', '/', '/'], $propertyType);
        $normalized = preg_replace('/\s*\/\s*/', ' / ', $propertyType);
        $types = array_map('trim', explode(' / ', $normalized));
        
        if (count($types) > 1) {
            $likeConditions = [];
            foreach ($types as $type) {
                $likeConditions[] = "p.property_type LIKE ?";
                $params[] = "%" . $type . "%";
            }
            $where[] = "(" . implode(" OR ", $likeConditions) . ")";
        } else {
            $where[] = "p.property_type LIKE ?";
            $params[] = "%" . $propertyType . "%";
        }
    }
    
    // City/Location filter - use location if provided, otherwise use city
    $locationFilter = $location ? $location : $city;
    if ($locationFilter) {
        $where[] = "p.location LIKE ?";
        $params[] = "%" . $locationFilter . "%";
    }
    
    // Price range filter
    if ($minPrice !== null && $minPrice > 0) {
        $where[] = "p.price >= ?";
        $params[] = $minPrice;
    }
    
    if ($maxPrice !== null && $maxPrice > 0) {
        $where[] = "p.price <= ?";
        $params[] = $maxPrice;
    }
    
    // Search filter
    if ($search) {
        $where[] = "(p.title LIKE ? OR p.location LIKE ? OR p.description LIKE ?)";
        $searchTerm = "%{$search}%";
        $params[] = $searchTerm;
        $params[] = $searchTerm;
        $params[] = $searchTerm;
    }
    
    $whereClause = !empty($where) ? "WHERE " . implode(" AND ", $where) : "";
    
    // Get properties
    $query = "
        SELECT 
            p.*,
            u.full_name as seller_name,
            u.email as seller_email,
            u.phone as seller_phone,
            (SELECT COUNT(*) FROM inquiries WHERE property_id = p.id) as inquiry_count,
            (SELECT COUNT(DISTINCT buyer_id) FROM buyer_interaction_limits WHERE property_id = p.id) as interest_count,
            (SELECT COUNT(*) FROM favorites WHERE property_id = p.id) as favorites_count,
            (SELECT image_url FROM property_images WHERE property_id = p.id ORDER BY image_order LIMIT 1) as cover_image
        FROM properties p
        LEFT JOIN users u ON p.user_id = u.id
        {$whereClause}
        ORDER BY p.created_at DESC
        LIMIT " . intval($limit) . " OFFSET " . intval($offset) . "
    ";
    
    $stmt = $db->prepare($query);
    $stmt->execute($params);
    $properties = $stmt->fetchAll();
    
    // Get total count
    $countQuery = "SELECT COUNT(*) as total FROM properties p {$whereClause}";
    $countStmt = $db->prepare($countQuery);
    $countStmt->execute($params);
    $totalResult = $countStmt->fetch(PDO::FETCH_ASSOC);
    $total = isset($totalResult['total']) ? intval($totalResult['total']) : 0;
    
    // Format properties
    foreach ($properties as &$property) {
        $property['id'] = intval($property['id']);
        $property['price'] = floatval($property['price']);
        $property['area'] = floatval($property['area']);
        $property['is_active'] = (bool)$property['is_active'];
        $property['inquiry_count'] = intval($property['inquiry_count']);
        $property['views_count'] = intval($property['views_count'] ?? 0);
        $property['interest_count'] = intval($property['interest_count'] ?? 0);
        $property['favorites_count'] = intval($property['favorites_count'] ?? 0);
    }
    
    // Get filter options (cities and property types) for frontend dropdowns
    $citiesQuery = "SELECT DISTINCT location FROM properties WHERE location IS NOT NULL AND location != '' ORDER BY location ASC LIMIT 50";
    $citiesStmt = $db->query($citiesQuery);
    $cities = $citiesStmt->fetchAll(PDO::FETCH_COLUMN);
    
    // Extract city names from locations (simple extraction - take last part after comma or first word)
    $uniqueCities = [];
    foreach ($cities as $loc) {
        // Try to extract city name (usually last part after comma, or first major word)
        $parts = explode(',', $loc);
        if (count($parts) > 1) {
            $city = trim(end($parts));
        } else {
            $city = trim(explode(' ', $loc)[0]);
        }
        if ($city && !in_array($city, $uniqueCities)) {
            $uniqueCities[] = $city;
        }
    }
    sort($uniqueCities);
    
    $typesQuery = "SELECT DISTINCT property_type FROM properties WHERE property_type IS NOT NULL AND property_type != '' ORDER BY property_type ASC";
    $typesStmt = $db->query($typesQuery);
    $propertyTypes = $typesStmt->fetchAll(PDO::FETCH_COLUMN);
    
    sendSuccess('Properties retrieved successfully', [
        'properties' => $properties,
        'pagination' => [
            'page' => $page,
            'limit' => $limit,
            'total' => intval($total),
            'pages' => ceil($total / $limit)
        ],
        'filter_options' => [
            'cities' => array_slice($uniqueCities, 0, 20), // Limit to 20 cities
            'property_types' => $propertyTypes
        ]
    ]);
    
} catch (Exception $e) {
    error_log("Admin Properties List Error: " . $e->getMessage());
    sendError('Failed to retrieve properties', null, 500);
}
