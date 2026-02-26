<?php
/**
 * Admin Moderation Queue Approve Endpoint
 * POST /api/admin/moderation-queue/approve.php?id={id}
 * 
 * Approves an image in the moderation queue
 */

require_once __DIR__ . '/../../../config/config.php';
require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../../config/moderation.php';
require_once __DIR__ . '/../../../utils/admin_auth_middleware.php';
require_once __DIR__ . '/../../../utils/response.php';
require_once __DIR__ . '/../../../helpers/FileHelper.php';
require_once __DIR__ . '/../../../services/WatermarkService.php';

handlePreflight();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendError('Method not allowed', null, 405);
}

try {
    // Check admin authentication
    $adminSession = requireAdminAuth();
    $adminId = $adminSession['admin_id'];
    
    // Get queue ID from query parameter
    $queueId = isset($_GET['id']) ? (int)$_GET['id'] : null;
    if (!$queueId) {
        sendError('Queue ID is required', null, 400);
    }
    
    // Get request body for review notes
    $data = json_decode(file_get_contents('php://input'), true);
    $reviewNotes = isset($data['review_notes']) ? trim($data['review_notes']) : '';
    
    $db = getDB();
    
    // Get queue record
    $stmt = $db->prepare("
        SELECT mrq.*, pi.*
        FROM moderation_review_queue mrq
        INNER JOIN property_images pi ON mrq.property_image_id = pi.id
        WHERE mrq.id = ? AND mrq.status = 'OPEN'
    ");
    $stmt->execute([$queueId]);
    $queueItem = $stmt->fetch();
    
    if (!$queueItem) {
        sendError('Queue item not found or already processed', null, 404);
    }
    
    $propertyImageId = $queueItem['property_image_id'];
    $propertyId = $queueItem['property_id'];
    $filePath = $queueItem['file_path'];
    
    // Check if file exists in review folder
    $reviewFilePath = UPLOAD_REVIEW_PATH . basename($filePath);
    if (!file_exists($reviewFilePath)) {
        sendError('Image file not found in review folder', null, 404);
    }
    
    // Create property subfolder if not exists
    $propertyDir = UPLOAD_PROPERTIES_PATH . $propertyId . '/';
    if (!FileHelper::createDirectory($propertyDir)) {
        error_log("Failed to create property directory: {$propertyDir}");
        sendError('Failed to create property folder', null, 500);
    }
    
    // Move file from review to property folder
    $filename = basename($filePath);
    $finalPath = $propertyDir . $filename;
    
    if (!FileHelper::moveFile($reviewFilePath, $finalPath)) {
        error_log("Failed to move file from review to property folder");
        sendError('Failed to move approved image', null, 500);
    }
    
    // Add 360coordinates watermark to approved image
    try {
        if (!WatermarkService::addWatermark($finalPath)) {
            error_log("WatermarkService: Failed to add watermark to approved image: {$finalPath}");
        }
    } catch (Exception $e) {
        error_log("WatermarkService: " . $e->getMessage());
    }
    
    // Update file_path in property_images (relative path)
    $newFilePath = 'properties/' . $propertyId . '/' . $filename;
    $imageUrl = BASE_URL . '/uploads/' . $newFilePath;
    
    // Begin transaction
    $db->beginTransaction();
    
    try {
        // Update property_images record
        $stmt = $db->prepare("
            UPDATE property_images
            SET moderation_status = 'SAFE',
                manual_reviewed = TRUE,
                manual_reviewer_id = ?,
                manual_review_notes = ?,
                file_path = ?,
                checked_at = NOW()
            WHERE id = ?
        ");
        $stmt->execute([
            $adminId,
            $reviewNotes,
            $newFilePath,
            $propertyImageId
        ]);
        
        // Update moderation_review_queue record
        $stmt = $db->prepare("
            UPDATE moderation_review_queue
            SET status = 'APPROVED',
                reviewer_id = ?,
                review_notes = ?,
                reviewed_at = NOW()
            WHERE id = ?
        ");
        $stmt->execute([
            $adminId,
            $reviewNotes,
            $queueId
        ]);
        
        // Commit transaction
        $db->commit();
        
        sendSuccess('Image approved', [
            'status' => 'success',
            'message' => 'Image approved',
            'image_url' => $imageUrl
        ]);
        
    } catch (Exception $e) {
        // Rollback transaction
        $db->rollBack();
        throw $e;
    }
    
} catch (Exception $e) {
    error_log("moderation-queue/approve.php - Exception: " . $e->getMessage());
    error_log("Stack trace: " . $e->getTraceAsString());
    sendError('An error occurred while approving image', null, 500);
}

