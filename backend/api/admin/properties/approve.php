<?php
/**
 * Admin Approve Property API
 * POST /api/admin/properties/approve.php?id={id}
 */

require_once __DIR__ . '/../../../config/config.php';
require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../../utils/response.php';
require_once __DIR__ . '/../../../utils/admin_auth.php';
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
    
    // Check if property exists
    $stmt = $db->prepare("SELECT id, title, is_active FROM properties WHERE id = ?");
    $stmt->execute([$propertyId]);
    $property = $stmt->fetch();
    
    if (!$property) {
        sendError('Property not found', null, 404);
    }
    
    // Approve property (activate it)
    $stmt = $db->prepare("UPDATE properties SET is_active = 1 WHERE id = ?");
    $stmt->execute([$propertyId]);

    logAdminPropertyAction($db, $admin['id'], 'approve_property', $propertyId, null);

    sendSuccess('Property approved successfully', ['property_id' => $propertyId]);
    
} catch (Exception $e) {
    error_log("Admin Approve Property Error: " . $e->getMessage());
    sendError('Failed to approve property', null, 500);
}
