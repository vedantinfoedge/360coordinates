<?php
/**
 * Delete Property API
 * DELETE /api/seller/properties/delete.php?id={property_id}
 */

require_once __DIR__ . '/../../../config/config.php';
require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../../utils/response.php';
require_once __DIR__ . '/../../../utils/auth.php';

handlePreflight();

if ($_SERVER['REQUEST_METHOD'] !== 'DELETE') {
    sendError('Method not allowed', null, 405);
}

try {
    $user = requireUserType(['seller', 'agent']);
    
    $propertyId = isset($_GET['id']) ? intval($_GET['id']) : 0;
    if (!$propertyId) {
        sendError('Property ID is required', null, 400);
    }
    
    $db = getDB();
    
    // Check if property exists and belongs to user
    $stmt = $db->prepare("SELECT id, cover_image, video_url, brochure_url FROM properties WHERE id = ? AND user_id = ?");
    $stmt->execute([$propertyId, $user['id']]);
    $property = $stmt->fetch();
    
    if (!$property) {
        sendError('Property not found or access denied', null, 404);
    }
    
    // Get all images
    $stmt = $db->prepare("SELECT image_url FROM property_images WHERE property_id = ?");
    $stmt->execute([$propertyId]);
    $images = $stmt->fetchAll(PDO::FETCH_COLUMN);
    
    // Delete property (cascade will delete related records)
    $stmt = $db->prepare("DELETE FROM properties WHERE id = ?");
    $stmt->execute([$propertyId]);
    
    // TODO: Delete physical files from server
    // deleteFile(...) for images, video, brochure
    
    sendSuccess('Property deleted successfully');
    
} catch (Exception $e) {
    error_log("Delete Property Error: " . $e->getMessage());
    sendError('Failed to delete property', null, 500);
}

