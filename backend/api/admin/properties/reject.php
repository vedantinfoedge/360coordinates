<?php
/**
 * Admin Reject Property API
 * POST /api/admin/properties/reject.php?id={id}
 */

require_once __DIR__ . '/../../../config/config.php';
require_once __DIR__ . '/../../../utils/response.php';
require_once __DIR__ . '/../../../utils/admin_auth.php';
require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../../utils/audit_log.php';

handlePreflight();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendError('Method not allowed', null, 405);
}

try {
    $admin = requireAdmin();
    $db = getDB();
    
    $propertyId = isset($_GET['id']) ? intval($_GET['id']) : 0;
    if (!$propertyId) {
        sendError('Property ID is required', null, 400);
    }
    
    $data = json_decode(file_get_contents('php://input'), true);
    $reason = isset($data['reason']) ? trim($data['reason']) : 'Property rejected by admin';
    
    // Check if property exists
    $stmt = $db->prepare("SELECT id, title FROM properties WHERE id = ?");
    $stmt->execute([$propertyId]);
    $property = $stmt->fetch();
    
    if (!$property) {
        sendError('Property not found', null, 404);
    }
    
    // Reject property (deactivate it)
    $stmt = $db->prepare("UPDATE properties SET is_active = 0 WHERE id = ?");
    $stmt->execute([$propertyId]);

    logAdminPropertyAction($db, $admin['id'], 'reject_property', $propertyId, $reason);

    sendSuccess('Property rejected successfully', [
        'property_id' => $propertyId,
        'reason' => $reason
    ]);
    
} catch (Exception $e) {
    error_log("Admin Reject Property Error: " . $e->getMessage());
    sendError('Failed to reject property', null, 500);
}
