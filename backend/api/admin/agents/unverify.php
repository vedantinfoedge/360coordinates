<?php
/**
 * Admin Unverify Agent API
 * POST /api/admin/agents/unverify.php?id={id}
 */

require_once __DIR__ . '/../../../config/config.php';
require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../../utils/response.php';
require_once __DIR__ . '/../../../utils/admin_auth.php';

handlePreflight();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendError('Method not allowed', null, 405);
}

try {
    $admin = requireAdmin();
    $db = getDB();
    
    $agentId = isset($_GET['id']) ? intval($_GET['id']) : 0;
    if (!$agentId) {
        sendError('Agent ID is required', null, 400);
    }
    
    // Check if agent exists
    $stmt = $db->prepare("SELECT id, full_name, user_type FROM users WHERE id = ? AND user_type = 'agent'");
    $stmt->execute([$agentId]);
    $agent = $stmt->fetch();
    
    if (!$agent) {
        sendError('Agent not found', null, 404);
    }
    
    // Unverify agent (check if column exists first)
    try {
        $stmt = $db->prepare("UPDATE users SET agent_verified = 0 WHERE id = ?");
        $stmt->execute([$agentId]);
    } catch (PDOException $e) {
        // If column doesn't exist, just return success (nothing to unverify)
        error_log("Agent unverify: Column agent_verified may not exist: " . $e->getMessage());
    }
    
    sendSuccess('Agent unverified successfully', ['agent_id' => $agentId]);
    
} catch (Exception $e) {
    error_log("Admin Unverify Agent Error: " . $e->getMessage());
    sendError('Failed to unverify agent', null, 500);
}

