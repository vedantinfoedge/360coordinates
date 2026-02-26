<?php
/**
 * Send Inquiry API
 * POST /api/buyer/inquiries/send.php
 */

require_once __DIR__ . '/../../../config/config.php';
require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../../utils/response.php';
require_once __DIR__ . '/../../../utils/validation.php';
require_once __DIR__ . '/../../../utils/auth.php';

handlePreflight();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendError('Method not allowed', null, 405);
}

try {
    $input = json_decode(file_get_contents('php://input'), true);
    
    $propertyId = isset($input['property_id']) ? intval($input['property_id']) : 0;
    $name = sanitizeInput($input['name'] ?? '');
    $email = sanitizeInput($input['email'] ?? '');
    $mobile = sanitizeInput($input['mobile'] ?? '');
    $message = sanitizeInput($input['message'] ?? '');
    
    // Validation
    $errors = [];
    
    if (!$propertyId) {
        $errors['property_id'] = 'Property ID is required';
    }
    
    if (empty($name)) {
        $errors['name'] = 'Name is required';
    }
    
    if (empty($email)) {
        $errors['email'] = 'Email is required';
    } elseif (!validateEmail($email)) {
        $errors['email'] = 'Invalid email format';
    }
    
    if (empty($mobile)) {
        $errors['mobile'] = 'Mobile number is required';
    }
    
    if (!empty($errors)) {
        sendValidationError($errors);
    }
    
    $db = getDB();
    
    // Check if property exists
    $stmt = $db->prepare("SELECT id, user_id FROM properties WHERE id = ? AND is_active = 1");
    $stmt->execute([$propertyId]);
    $property = $stmt->fetch();
    
    if (!$property) {
        sendError('Property not found', null, 404);
    }
    
    $sellerId = $property['user_id'];
    $buyerId = null;
    
    // Check if user is logged in
    try {
        $user = getCurrentUser();
        if ($user) {
            $buyerId = $user['id'];
            // Use logged-in user's info if available
            if (empty($name)) $name = $user['full_name'];
            if (empty($email)) $email = $user['email'];
            if (empty($mobile)) $mobile = $user['phone'];
        }
    } catch (Exception $e) {
        // User not authenticated, that's fine
    }
    
    // Check if inquiry already exists for this buyer-property-seller combination
    // Only create new inquiry if this is the first message/conversation
    $existingInquiry = null;
    if ($buyerId) {
        $stmt = $db->prepare("
            SELECT id FROM inquiries 
            WHERE buyer_id = ? AND property_id = ? AND seller_id = ?
            ORDER BY created_at DESC LIMIT 1
        ");
        $stmt->execute([$buyerId, $propertyId, $sellerId]);
        $existingInquiry = $stmt->fetch(PDO::FETCH_ASSOC);
    } else {
        // For non-logged-in users, check by email instead
        $stmt = $db->prepare("
            SELECT id FROM inquiries 
            WHERE email = ? AND property_id = ? AND seller_id = ?
            ORDER BY created_at DESC LIMIT 1
        ");
        $stmt->execute([$email, $propertyId, $sellerId]);
        $existingInquiry = $stmt->fetch(PDO::FETCH_ASSOC);
    }
    
    $inquiryId = null;
    if ($existingInquiry) {
        // Inquiry already exists, return existing inquiry ID
        $inquiryId = $existingInquiry['id'];
    } else {
        // Create new inquiry only if this is the first message
        $stmt = $db->prepare("
            INSERT INTO inquiries (property_id, buyer_id, seller_id, name, email, mobile, message, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'new')
        ");
        $stmt->execute([$propertyId, $buyerId, $sellerId, $name, $email, $mobile, $message]);
        $inquiryId = $db->lastInsertId();
    }
    
    // Get inquiry (either existing or newly created)
    $stmt = $db->prepare("
        SELECT i.*, p.title as property_title, p.location as property_location
        FROM inquiries i
        INNER JOIN properties p ON i.property_id = p.id
        WHERE i.id = ?
    ");
    $stmt->execute([$inquiryId]);
    $inquiry = $stmt->fetch();
    
    $message = $existingInquiry 
        ? 'Inquiry already exists. Using existing inquiry.' 
        : 'Inquiry created successfully';

    // FCM push notification to seller (non-blocking, never fails the inquiry)
    if (!$existingInquiry) {
        try {
            if (file_exists(__DIR__ . '/../../../services/FCMMessagingService.php')) {
                require_once __DIR__ . '/../../../services/FCMMessagingService.php';
                $propTitle = $inquiry['property_title'] ?? 'Property';
                $buyerName = $name ?: 'Someone';
                $notifTitle = 'New inquiry';
                $notifBody = "{$buyerName} inquired about: {$propTitle}";
                $notifData = [
                    'type' => 'new_inquiry',
                    'property_id' => (string)$propertyId,
                    'inquiry_id' => (string)$inquiryId
                ];
                FCMMessagingService::sendToUser($sellerId, $notifTitle, $notifBody, $notifData);
            }
        } catch (Exception $fcmEx) {
            error_log("FCM notification skipped (inquiry still saved): " . $fcmEx->getMessage());
        }
    }
    
    sendSuccess($message, ['inquiry' => $inquiry]);
    
} catch (Exception $e) {
    error_log("Send Inquiry Error: " . $e->getMessage());
    sendError('Failed to send inquiry', null, 500);
}

