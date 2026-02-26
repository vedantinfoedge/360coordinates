<?php
/**
 * Admin Moderation Queue List Endpoint
 * GET /api/admin/moderation-queue/list.php
 * 
 * Returns paginated list of images pending manual review
 */

require_once __DIR__ . '/../../../config/config.php';
require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../../utils/admin_auth_middleware.php';
require_once __DIR__ . '/../../../utils/response.php';

handlePreflight();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendError('Method not allowed', null, 405);
}

try {
    // Check admin authentication
    $adminSession = requireAdminAuth();
    $adminId = $adminSession['admin_id'];
    
    // Get pagination parameters
    $page = isset($_GET['page']) ? max(1, (int)$_GET['page']) : 1;
    $limit = isset($_GET['limit']) ? min(100, max(1, (int)$_GET['limit'])) : 20;
    $offset = ($page - 1) * $limit;
    
    $db = getDB();
    
    // Get total count
    $stmt = $db->prepare("
        SELECT COUNT(*) as total
        FROM moderation_review_queue mrq
        INNER JOIN property_images pi ON mrq.property_image_id = pi.id
        WHERE mrq.status = 'OPEN'
    ");
    $stmt->execute();
    $totalResult = $stmt->fetch();
    $totalCount = (int)$totalResult['total'];
    
    // Get paginated queue items
    $stmt = $db->prepare("
        SELECT 
            mrq.id,
            mrq.property_image_id,
            mrq.reason_for_review,
            mrq.created_at,
            pi.file_path,
            pi.original_filename,
            pi.confidence_scores,
            pi.property_id,
            pi.moderation_status,
            pi.moderation_reason
        FROM moderation_review_queue mrq
        INNER JOIN property_images pi ON mrq.property_image_id = pi.id
        WHERE mrq.status = 'OPEN'
        ORDER BY mrq.created_at ASC
        LIMIT ? OFFSET ?
    ");
    $stmt->execute([$limit, $offset]);
    $items = $stmt->fetchAll();
    
    // Process items to include image URLs
    $processedItems = [];
    foreach ($items as $item) {
        $imageUrl = null;
        if ($item['file_path']) {
            $imageUrl = BASE_URL . '/uploads/' . $item['file_path'];
        }
        
        $confidenceScores = [];
        if ($item['confidence_scores']) {
            $confidenceScores = json_decode($item['confidence_scores'], true) ?: [];
        }
        
        $processedItems[] = [
            'id' => (int)$item['id'],
            'property_image_id' => (int)$item['property_image_id'],
            'property_id' => (int)$item['property_id'],
            'file_path' => $item['file_path'],
            'image_url' => $imageUrl,
            'original_filename' => $item['original_filename'],
            'reason_for_review' => $item['reason_for_review'],
            'confidence_scores' => $confidenceScores,
            'moderation_status' => $item['moderation_status'],
            'moderation_reason' => $item['moderation_reason'],
            'created_at' => $item['created_at']
        ];
    }
    
    sendSuccess('Moderation queue retrieved', [
        'total' => $totalCount,
        'page' => $page,
        'limit' => $limit,
        'items' => $processedItems
    ]);
    
} catch (Exception $e) {
    error_log("moderation-queue/list.php - Exception: " . $e->getMessage());
    error_log("Stack trace: " . $e->getTraceAsString());
    sendError('An error occurred while fetching moderation queue', null, 500);
}

