<?php
/**
 * Toggle Favorite API
 * POST /api/buyer/favorites/toggle.php
 */

require_once __DIR__ . '/../../../config/config.php';
require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../../utils/response.php';
require_once __DIR__ . '/../../../utils/auth.php';

handlePreflight();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendError('Method not allowed', null, 405);
}

try {
    $user = requireAuth();
    
    $input = json_decode(file_get_contents('php://input'), true);
    $propertyId = isset($input['property_id']) ? intval($input['property_id']) : 0;
    
    if (!$propertyId) {
        sendError('Property ID is required', null, 400);
    }
    
    $db = getDB();
    
    // Check if property exists
    $stmt = $db->prepare("SELECT id FROM properties WHERE id = ? AND is_active = 1");
    $stmt->execute([$propertyId]);
    if (!$stmt->fetch()) {
        sendError('Property not found', null, 404);
    }
    
    // Check if already favorited
    $stmt = $db->prepare("SELECT id FROM favorites WHERE user_id = ? AND property_id = ?");
    $stmt->execute([$user['id'], $propertyId]);
    $existing = $stmt->fetch();
    
    if ($existing) {
        // Remove from favorites
        $stmt = $db->prepare("DELETE FROM favorites WHERE id = ?");
        $stmt->execute([$existing['id']]);
        $isFavorite = false;
        $message = 'Removed from favorites';
    } else {
        // Add to favorites
        $stmt = $db->prepare("INSERT INTO favorites (user_id, property_id) VALUES (?, ?)");
        $stmt->execute([$user['id'], $propertyId]);
        $isFavorite = true;
        $message = 'Added to favorites';
    }
    
    sendSuccess($message, ['is_favorite' => $isFavorite]);
    
} catch (Exception $e) {
    error_log("Toggle Favorite Error: " . $e->getMessage());
    sendError('Failed to update favorite', null, 500);
}

