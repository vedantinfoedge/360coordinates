<?php
/**
 * Add/Update Property History API
 * POST /api/buyer/history/add.php
 * 
 * Adds a new history entry or updates existing one for a property
 * Matches the behavior of PropertyHistoryManager.addToHistory()
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
    
    // Only buyers can save history
    if ($user['user_type'] !== 'buyer') {
        sendError('Only buyers can save property history', null, 403);
    }
    
    $input = json_decode(file_get_contents('php://input'), true);
    $propertyId = isset($input['property_id']) ? intval($input['property_id']) : 0;
    $actionType = isset($input['action_type']) ? $input['action_type'] : 'viewed_owner_details';
    
    // Validate action type
    if (!in_array($actionType, ['viewed_owner_details', 'chat_with_owner'])) {
        sendError('Invalid action type', null, 400);
    }
    
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
    
    // Check if history entry already exists
    $stmt = $db->prepare("SELECT id, action_type FROM property_history WHERE user_id = ? AND property_id = ?");
    $stmt->execute([$user['id'], $propertyId]);
    $existing = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($existing) {
        // Update existing entry
        // If existing is 'viewed_owner_details' and new is 'chat_with_owner', upgrade it
        // Otherwise, just update the timestamp
        $newActionType = $actionType;
        if ($existing['action_type'] === 'viewed_owner_details' && $actionType === 'chat_with_owner') {
            // Upgrade to chat action
            $newActionType = 'chat_with_owner';
        } else if ($existing['action_type'] === 'chat_with_owner') {
            // Keep chat_with_owner (don't downgrade)
            $newActionType = 'chat_with_owner';
        } else {
            // Keep existing action type or use new one
            $newActionType = $existing['action_type'];
        }
        
        $stmt = $db->prepare("UPDATE property_history SET action_type = ?, updated_at = NOW() WHERE id = ?");
        $stmt->execute([$newActionType, $existing['id']]);
        
        $message = 'History updated';
    } else {
        // Insert new entry
        $stmt = $db->prepare("INSERT INTO property_history (user_id, property_id, action_type) VALUES (?, ?, ?)");
        $stmt->execute([$user['id'], $propertyId, $actionType]);
        
        $message = 'History added';
    }
    
    // Get the updated/inserted entry
    $stmt = $db->prepare("SELECT * FROM property_history WHERE user_id = ? AND property_id = ?");
    $stmt->execute([$user['id'], $propertyId]);
    $historyEntry = $stmt->fetch(PDO::FETCH_ASSOC);
    
    sendSuccess($message, [
        'history_entry' => $historyEntry
    ]);
    
} catch (Exception $e) {
    error_log("Add History Error: " . $e->getMessage());
    sendError('Failed to save history', null, 500);
}
