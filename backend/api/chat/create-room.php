<?php
/**
 * Create or Get Chat Room API
 * POST /api/chat/create-room.php
 * 
 * Creates a chat room between buyer and seller/agent for a property
 * This endpoint validates the request and ensures all validations are preserved
 */

require_once __DIR__ . '/../../config/config.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../utils/response.php';
require_once __DIR__ . '/../../utils/auth.php';
require_once __DIR__ . '/../../utils/validation.php';

handlePreflight();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendError('Method not allowed', null, 405);
}

try {
    $user = requireAuth(); // Ensure user is authenticated
    
    $input = json_decode(file_get_contents('php://input'), true);
    
    // Validate input using existing validation functions
    if (!isset($input['receiverId']) || !isset($input['propertyId'])) {
        sendError('receiverId and propertyId are required', null, 400);
    }
    
    // Sanitize inputs using existing validation
    $receiverId = sanitizeInput($input['receiverId']);
    $propertyId = sanitizeInput($input['propertyId']);
    
    // Get user ID from authenticated user (verified by token)
    $buyerId = $user['id'];
    $receiverId = intval($receiverId);
    $propertyId = intval($propertyId);
    
    // Validate that current user can initiate chats
    // Use database user_type (registered type) as the source of truth
    // Both 'buyer' and 'seller' registered types can initiate chats (they can act as buyers)
    // Agents cannot initiate chats (they can only receive them)
    $rawUserType = $user['user_type'] ?? null;
    $userType = $rawUserType ? strtolower(trim($rawUserType)) : '';
    
    // Allow users registered as 'buyer' or 'seller' to initiate chats
    // This follows the role access map where both can login as 'buyer'
    if (!in_array($userType, ['buyer', 'seller'])) {
        error_log("Chat initiation denied - User ID: {$buyerId}, DB User Type: " . var_export($rawUserType, true) . " (normalized: '{$userType}')");
        $errorMsg = 'Only buyers can initiate chats.';
        if ($rawUserType) {
            $errorMsg .= ' Your account type is: ' . $rawUserType;
        } else {
            $errorMsg .= ' Your account type is not set. Please contact support.';
        }
        sendError($errorMsg, ['user_type' => $rawUserType, 'user_id' => $buyerId], 403);
    }
    
    $db = getDB();
    
    // Verify property exists and get owner details
    $stmt = $db->prepare("
        SELECT p.id, p.user_id, u.id as owner_id, u.full_name, u.email, u.user_type 
        FROM properties p 
        INNER JOIN users u ON p.user_id = u.id 
        WHERE p.id = ? AND p.is_active = 1
    ");
    $stmt->execute([$propertyId]);
    $property = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$property) {
        sendError('Property not found', null, 404);
    }
    
    // Verify receiver matches property owner by ID, email, or username
    // This ensures we're chatting with the correct property owner
    $ownerId = $property['user_id'];
    $ownerEmail = $property['email'] ?? '';
    $ownerName = $property['full_name'] ?? '';
    
    // Check if receiverId matches the property owner
    if ($ownerId != $receiverId) {
        // Try to find receiver by email or name if ID doesn't match
        $stmt = $db->prepare("
            SELECT id FROM users 
            WHERE (id = ? OR email = ? OR full_name = ?) 
            AND id = ?
        ");
        $stmt->execute([$receiverId, $input['receiverEmail'] ?? '', $input['receiverName'] ?? '', $ownerId]);
        $matchedReceiver = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$matchedReceiver || $matchedReceiver['id'] != $ownerId) {
            sendError('Property does not belong to the specified receiver', null, 403);
        }
    }
    
    $receiverRole = strtolower(trim($property['user_type'] ?? '')); // 'seller', 'agent', or 'buyer'
    
    // Log for debugging
    error_log("Create Chat Room - Receiver Role: " . $receiverRole . ", Owner ID: " . $ownerId . ", Receiver ID: " . $receiverId);
    
    // If receiver is a buyer, map to 'seller' role for chat purposes (since they own the property)
    // This handles edge cases where properties might be owned by buyers (test data, etc.)
    if ($receiverRole === 'buyer') {
        $receiverRole = 'seller'; // Treat buyer property owners as sellers for chat
    }
    
    // Allow 'seller' or 'agent' user types to receive chat messages
    if (!in_array($receiverRole, ['seller', 'agent'])) {
        error_log("Invalid receiver role: " . $receiverRole . " for user ID: " . $ownerId);
        sendError('Invalid receiver role. Property owner must be a seller, agent, or buyer. Current role: ' . ($property['user_type'] ?? 'unknown'), ['receiverRole' => $receiverRole], 400);
    }
    
    // Verify buyer exists and get details by ID, email, or username
    // This ensures we're using the correct user from database
    $stmt = $db->prepare("
        SELECT id, full_name, email, phone, user_type 
        FROM users 
        WHERE id = ? OR email = ? OR full_name = ?
        LIMIT 1
    ");
    $buyerEmail = $user['email'] ?? '';
    $buyerName = $user['full_name'] ?? '';
    $stmt->execute([$buyerId, $buyerEmail, $buyerName]);
    $buyerDetails = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$buyerDetails) {
        sendError('Buyer information not found', null, 404);
    }
    
    // Use the verified buyer ID from database (in case email/username lookup was used)
    $verifiedBuyerId = $buyerDetails['id'];
    
    // Verify receiver (seller/owner) exists and get details by ID, email, or username
    // Use the property owner ID as the primary check, but allow lookup by email/name
    $stmt = $db->prepare("
        SELECT id, full_name, email, phone, user_type 
        FROM users 
        WHERE id = ? OR (email = ? AND id = ?) OR (full_name = ? AND id = ?)
        LIMIT 1
    ");
    $receiverEmail = $property['email'] ?? '';
    $receiverName = $property['full_name'] ?? '';
    $stmt->execute([
        $ownerId, 
        $receiverEmail, 
        $ownerId, 
        $receiverName, 
        $ownerId
    ]);
    $receiverDetails = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$receiverDetails) {
        sendError('Receiver (seller) information not found', null, 404);
    }
    
    // Use verified receiver ID (from property owner)
    $verifiedReceiverId = $receiverDetails['id'];
    
    // Validate that buyer is not trying to chat with themselves (preserve existing validation)
    if ($verifiedBuyerId == $verifiedReceiverId) {
        sendError('Cannot chat with yourself', null, 400);
    }
    
    // Generate deterministic chat room ID using verified IDs
    $sortedIds = [strval($verifiedBuyerId), strval($verifiedReceiverId)];
    sort($sortedIds);
    $chatRoomId = $sortedIds[0] . '_' . $sortedIds[1] . '_' . $propertyId;
    
    // Return chat room information
    // Note: Actual chat room creation happens in Firebase on frontend
    // This endpoint validates and returns the chat room ID structure
    // Inquiries are no longer automatically created when chat rooms are started
    
    sendSuccess('Chat room ready', [
        'chatRoomId' => $chatRoomId,
        'buyerId' => $verifiedBuyerId,
        'buyerEmail' => $buyerDetails['email'],
        'buyerName' => $buyerDetails['full_name'],
        'receiverId' => $verifiedReceiverId,
        'receiverEmail' => $receiverDetails['email'],
        'receiverName' => $receiverDetails['full_name'],
        'receiverRole' => $receiverRole,
        'propertyId' => $propertyId
    ]);
    
} catch (Exception $e) {
    error_log("Create Chat Room Error: " . $e->getMessage());
    sendError('Failed to create chat room', null, 500);
}
