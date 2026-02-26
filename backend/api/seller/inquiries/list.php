<?php
/**
 * List Seller Inquiries API
 * GET /api/seller/inquiries/list.php
 */

require_once __DIR__ . '/../../../config/config.php';
require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../../utils/response.php';
require_once __DIR__ . '/../../../utils/auth.php';
require_once __DIR__ . '/../../../utils/validation.php';

handlePreflight();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendError('Method not allowed', null, 405);
}

try {
    $user = requireUserType(['seller', 'agent']);
    
    $db = getDB();
    
    $page = isset($_GET['page']) ? max(1, intval($_GET['page'])) : 1;
    $limit = isset($_GET['limit']) ? min(MAX_PAGE_SIZE, max(1, intval($_GET['limit']))) : DEFAULT_PAGE_SIZE;
    $offset = ($page - 1) * $limit;
    $status = isset($_GET['status']) ? sanitizeInput($_GET['status']) : null;
    $propertyId = isset($_GET['property_id']) ? intval($_GET['property_id']) : null;
    
    // Check if user_profiles table exists
    $hasUserProfilesTable = false;
    try {
        $checkStmt = $db->query("SHOW TABLES LIKE 'user_profiles'");
        $hasUserProfilesTable = $checkStmt->rowCount() > 0;
    } catch (Exception $e) {
        $hasUserProfilesTable = false;
        error_log("Could not check user_profiles table: " . $e->getMessage());
    }
    
    // Build query - profile_image is in user_profiles table, not users table
    if ($hasUserProfilesTable) {
        // user_profiles table exists - use it
        $query = "
            SELECT i.*,
                   p.id as property_id,
                   p.title as property_title,
                   p.location as property_location,
                   p.price as property_price,
                   p.cover_image as property_image,
                   u.full_name as buyer_name,
                   u.email as buyer_email,
                   u.phone as buyer_phone,
                   up.profile_image as buyer_profile_image
            FROM inquiries i
            INNER JOIN properties p ON i.property_id = p.id
            LEFT JOIN users u ON i.buyer_id = u.id
            LEFT JOIN user_profiles up ON u.id = up.user_id
            WHERE i.seller_id = ?
        ";
    } else {
        // user_profiles table doesn't exist - no profile_image available
        $query = "
            SELECT i.*,
                   p.id as property_id,
                   p.title as property_title,
                   p.location as property_location,
                   p.price as property_price,
                   p.cover_image as property_image,
                   u.full_name as buyer_name,
                   u.email as buyer_email,
                   u.phone as buyer_phone,
                   NULL as buyer_profile_image
            FROM inquiries i
            INNER JOIN properties p ON i.property_id = p.id
            LEFT JOIN users u ON i.buyer_id = u.id
            WHERE i.seller_id = ?
        ";
    }
    
    $params = [$user['id']];
    
    if ($status && in_array($status, ['new', 'contacted', 'viewed', 'interested', 'not_interested', 'closed'])) {
        $query .= " AND i.status = ?";
        $params[] = $status;
    }
    
    if ($propertyId) {
        $query .= " AND i.property_id = ?";
        $params[] = $propertyId;
    }
    
    $query .= " ORDER BY i.created_at DESC LIMIT " . intval($limit) . " OFFSET " . intval($offset);
    
    $stmt = $db->prepare($query);
    $stmt->execute($params);
    $inquiries = $stmt->fetchAll();
    
    // Get total count
    $countQuery = "SELECT COUNT(*) as total FROM inquiries WHERE seller_id = ?";
    $countParams = [$user['id']];
    
    if ($status) {
        $countQuery .= " AND status = ?";
        $countParams[] = $status;
    }
    if ($propertyId) {
        $countQuery .= " AND property_id = ?";
        $countParams[] = $propertyId;
    }
    
    $stmt = $db->prepare($countQuery);
    $stmt->execute($countParams);
    $total = $stmt->fetch()['total'];
    
    // Format inquiries
    foreach ($inquiries as &$inquiry) {
        // Normalize property image
        $propertyImage = $inquiry['property_image'];
        if (!empty($propertyImage)) {
            $propertyImage = trim($propertyImage);
            if (strpos($propertyImage, 'http://') === 0 || strpos($propertyImage, 'https://') === 0) {
                // Already a full URL
            } elseif (strpos($propertyImage, '/uploads/') === 0) {
                $propertyImage = BASE_URL . $propertyImage;
            } elseif (strpos($propertyImage, 'uploads/') === 0) {
                $propertyImage = BASE_URL . '/' . $propertyImage;
            } else {
                $propertyImage = UPLOAD_BASE_URL . '/' . ltrim($propertyImage, '/');
            }
        }
        
        $inquiry['property'] = [
            'id' => $inquiry['property_id'],
            'title' => $inquiry['property_title'],
            'location' => $inquiry['property_location'],
            'price' => $inquiry['property_price'],
            'cover_image' => $propertyImage
        ];
        
        if ($inquiry['buyer_id']) {
            // Normalize buyer profile image
            $buyerProfileImage = $inquiry['buyer_profile_image'];
            if (!empty($buyerProfileImage)) {
                $buyerProfileImage = trim($buyerProfileImage);
                if (strpos($buyerProfileImage, 'http://') === 0 || strpos($buyerProfileImage, 'https://') === 0) {
                    // Already a full URL
                } elseif (strpos($buyerProfileImage, '/uploads/') === 0) {
                    $buyerProfileImage = BASE_URL . $buyerProfileImage;
                } elseif (strpos($buyerProfileImage, 'uploads/') === 0) {
                    $buyerProfileImage = BASE_URL . '/' . $buyerProfileImage;
                } else {
                    $buyerProfileImage = UPLOAD_BASE_URL . '/' . ltrim($buyerProfileImage, '/');
                }
            }
            
            $inquiry['buyer'] = [
                'id' => $inquiry['buyer_id'],
                'name' => $inquiry['buyer_name'],
                'email' => $inquiry['buyer_email'],
                'phone' => $inquiry['buyer_phone'],
                'profile_image' => $buyerProfileImage
            ];
        } else {
            $inquiry['buyer'] = null;
        }
        
        // Remove individual fields
        unset($inquiry['property_id'], $inquiry['property_title'], $inquiry['property_location'],
              $inquiry['property_price'], $inquiry['property_image'], $inquiry['buyer_name'],
              $inquiry['buyer_email'], $inquiry['buyer_phone'], $inquiry['buyer_profile_image']);
    }
    
    sendSuccess('Inquiries retrieved successfully', [
        'inquiries' => $inquiries,
        'pagination' => [
            'page' => $page,
            'limit' => $limit,
            'total' => intval($total),
            'total_pages' => ceil($total / $limit)
        ]
    ]);
    
} catch (Exception $e) {
    $errorDetails = [
        'message' => $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine(),
        'trace' => $e->getTraceAsString()
    ];
    error_log("List Inquiries Error: " . json_encode($errorDetails));
    
    // In production, don't expose internal error details
    if (defined('ENVIRONMENT') && ENVIRONMENT === 'production') {
        sendError('Failed to retrieve inquiries. Please try again later.', null, 500);
    } else {
        sendError('Failed to retrieve inquiries: ' . $e->getMessage(), null, 500);
    }
}

