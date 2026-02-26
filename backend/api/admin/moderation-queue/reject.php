<?php
/**
 * Admin Moderation Queue Reject Endpoint
 * POST /api/admin/moderation-queue/reject.php?id={id}
 * 
 * Rejects an image in the moderation queue
 */

require_once __DIR__ . '/../../../config/config.php';
require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../../config/moderation.php';
require_once __DIR__ . '/../../../utils/admin_auth_middleware.php';
require_once __DIR__ . '/../../../utils/response.php';
require_once __DIR__ . '/../../../helpers/FileHelper.php';

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
    $filePath = $queueItem['file_path'];
    
    // Check if file exists in review folder
    $reviewFilePath = UPLOAD_REVIEW_PATH . basename($filePath);
    $moved = false;
    $newFilePath = null;
    
    if (file_exists($reviewFilePath)) {
        // Ensure rejected directory exists
        if (!FileHelper::createDirectory(UPLOAD_REJECTED_PATH)) {
            error_log("Failed to create rejected directory");
        } else {
            // Move file from review to rejected folder
            $filename = basename($filePath);
            $rejectedPath = UPLOAD_REJECTED_PATH . $filename;
            
            if (FileHelper::moveFile($reviewFilePath, $rejectedPath)) {
                $moved = true;
                $newFilePath = 'rejected/' . $filename;
            } else {
                error_log("Failed to move file from review to rejected folder");
                // Continue with rejection even if file move fails
            }
        }
    }
    
    // Begin transaction
    $db->beginTransaction();
    
    try {
        // Update property_images record
        $updateData = [
            $adminId,
            $reviewNotes,
            $propertyImageId
        ];
        
        $sql = "
            UPDATE property_images
            SET moderation_status = 'REJECTED',
                manual_reviewed = TRUE,
                manual_reviewer_id = ?,
                manual_review_notes = ?,
                checked_at = NOW()
        ";
        
        if ($moved) {
            $sql .= ", file_path = ?";
            $updateData[] = $newFilePath;
        }
        
        $sql .= " WHERE id = ?";
        if (!$moved) {
            $updateData[] = $propertyImageId;
        }
        
        $stmt = $db->prepare($sql);
        $stmt->execute($updateData);
        
        // Update moderation_review_queue record
        $stmt = $db->prepare("
            UPDATE moderation_review_queue
            SET status = 'REJECTED',
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
        
        sendSuccess('Image rejected', [
            'status' => 'success',
            'message' => 'Image rejected'
        ]);
        
    } catch (Exception $e) {
        // Rollback transaction
        $db->rollBack();
        throw $e;
    }
    
} catch (Exception $e) {
    error_log("moderation-queue/reject.php - Exception: " . $e->getMessage());
    error_log("Stack trace: " . $e->getTraceAsString());
    sendError('An error occurred while rejecting image', null, 500);
}

