<?php
/**
 * Admin Delete Property API
 * DELETE /api/admin/properties/delete.php?id={id}
 */

require_once __DIR__ . '/../../../config/config.php';
require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../../utils/response.php';
require_once __DIR__ . '/../../../utils/admin_auth.php';
require_once __DIR__ . '/../../../utils/audit_log.php';

handlePreflight();

if ($_SERVER['REQUEST_METHOD'] !== 'DELETE') {
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
    $stmt = $db->prepare("SELECT id, title FROM properties WHERE id = ?");
    $stmt->execute([$propertyId]);
    $property = $stmt->fetch();
    
    if (!$property) {
        sendError('Property not found', null, 404);
    }
    
    // Delete property (cascade will handle related records)
    $stmt = $db->prepare("DELETE FROM properties WHERE id = ?");
    $stmt->execute([$propertyId]);

    logAdminPropertyAction($db, $admin['id'], 'delete_property', $propertyId, null);

    sendSuccess('Property deleted successfully', ['deleted_property' => $property]);
    
} catch (Exception $e) {
    error_log("Admin Delete Property Error: " . $e->getMessage());
    sendError('Failed to delete property', null, 500);
}
