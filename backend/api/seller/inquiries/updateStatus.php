<?php
/**
 * Update Inquiry Status API
 * PUT /api/seller/inquiries/updateStatus.php?id={inquiry_id}
 */

require_once __DIR__ . '/../../../config/config.php';
require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../../utils/response.php';
require_once __DIR__ . '/../../../utils/auth.php';

handlePreflight();

if ($_SERVER['REQUEST_METHOD'] !== 'PUT') {
    sendError('Method not allowed', null, 405);
}

try {
    $user = requireUserType(['seller', 'agent']);
    
    $inquiryId = isset($_GET['id']) ? intval($_GET['id']) : 0;
    if (!$inquiryId) {
        sendError('Inquiry ID is required', null, 400);
    }
    
    $input = json_decode(file_get_contents('php://input'), true);
    $status = isset($input['status']) ? sanitizeInput($input['status']) : '';
    
    $allowedStatuses = ['new', 'contacted', 'viewed', 'interested', 'not_interested', 'closed'];
    if (!in_array($status, $allowedStatuses)) {
        sendError('Invalid status', null, 400);
    }
    
    $db = getDB();
    
    // Check if inquiry exists and belongs to user
    $stmt = $db->prepare("SELECT id FROM inquiries WHERE id = ? AND seller_id = ?");
    $stmt->execute([$inquiryId, $user['id']]);
    if (!$stmt->fetch()) {
        sendError('Inquiry not found or access denied', null, 404);
    }
    
    // Update status
    $stmt = $db->prepare("UPDATE inquiries SET status = ?, updated_at = NOW() WHERE id = ?");
    $stmt->execute([$status, $inquiryId]);
    
    // Get updated inquiry
    $stmt = $db->prepare("SELECT * FROM inquiries WHERE id = ?");
    $stmt->execute([$inquiryId]);
    $inquiry = $stmt->fetch();
    
    sendSuccess('Inquiry status updated successfully', ['inquiry' => $inquiry]);
    
} catch (Exception $e) {
    error_log("Update Inquiry Status Error: " . $e->getMessage());
    sendError('Failed to update inquiry status', null, 500);
}

