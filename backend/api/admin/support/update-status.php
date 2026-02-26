<?php
/**
 * Admin Update Support Ticket Status API
 * PUT /api/admin/support/update-status.php?id={id}
 */

require_once __DIR__ . '/../../../config/config.php';
require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../../utils/response.php';
require_once __DIR__ . '/../../../utils/admin_auth.php';

handlePreflight();

if ($_SERVER['REQUEST_METHOD'] !== 'PUT') {
    sendError('Method not allowed', null, 405);
}

try {
    $admin = requireAdmin();
    $db = getDB();
    
    $ticketId = isset($_GET['id']) ? intval($_GET['id']) : 0;
    if (!$ticketId) {
        sendError('Ticket ID is required', null, 400);
    }
    
    $data = json_decode(file_get_contents('php://input'), true);
    
    // Check if ticket exists
    $stmt = $db->prepare("SELECT id, status FROM support_tickets WHERE id = ?");
    $stmt->execute([$ticketId]);
    $ticket = $stmt->fetch();
    
    if (!$ticket) {
        sendError('Ticket not found', null, 404);
    }
    
    $updates = [];
    $params = [];
    
    // Update status
    if (isset($data['status']) && in_array($data['status'], ['open', 'in_progress', 'resolved', 'closed'])) {
        $updates[] = "status = ?";
        $params[] = $data['status'];
    }
    
    // Update priority
    if (isset($data['priority']) && in_array($data['priority'], ['low', 'medium', 'high', 'urgent'])) {
        $updates[] = "priority = ?";
        $params[] = $data['priority'];
    }
    
    // Assign to admin
    if (isset($data['assigned_to'])) {
        $updates[] = "assigned_to = ?";
        $params[] = $data['assigned_to'] ? intval($data['assigned_to']) : null;
    }
    
    if (empty($updates)) {
        sendError('No valid fields to update', null, 400);
    }
    
    $params[] = $ticketId;
    
    $query = "UPDATE support_tickets SET " . implode(", ", $updates) . " WHERE id = ?";
    $stmt = $db->prepare($query);
    $stmt->execute($params);
    
    // Get updated ticket
    $stmt = $db->prepare("
        SELECT 
            st.*,
            u.full_name as user_name,
            u.email as user_email,
            a.full_name as assigned_to_name
        FROM support_tickets st
        LEFT JOIN users u ON st.user_id = u.id
        LEFT JOIN admin_users a ON st.assigned_to = a.id
        WHERE st.id = ?
    ");
    $stmt->execute([$ticketId]);
    $updatedTicket = $stmt->fetch();
    
    sendSuccess('Ticket updated successfully', ['ticket' => $updatedTicket]);
    
} catch (Exception $e) {
    error_log("Admin Update Ticket Status Error: " . $e->getMessage());
    sendError('Failed to update ticket', null, 500);
}
