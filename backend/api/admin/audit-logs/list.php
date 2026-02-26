<?php
/**
 * Admin Audit Logs List API
 * GET /api/admin/audit-logs/list.php
 */

require_once __DIR__ . '/../../../config/config.php';
require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../../utils/response.php';
require_once __DIR__ . '/../../../utils/admin_auth.php';

handlePreflight();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendError('Method not allowed', null, 405);
}

try {
    $admin = requireAdmin();
    if (!$admin) {
        sendError('Admin authentication required', null, 401);
    }

    $db = getDB();
    if (!$db) {
        sendError('Database connection failed', null, 500);
    }

    $page = isset($_GET['page']) ? max(1, intval($_GET['page'])) : 1;
    $limit = isset($_GET['limit']) ? min(100, max(1, intval($_GET['limit']))) : 20;
    $offset = ($page - 1) * $limit;

    $tableCheck = $db->query("SHOW TABLES LIKE 'audit_logs'");
    if ($tableCheck->rowCount() === 0) {
        sendSuccess('Audit logs retrieved', [
            'logs' => [],
            'pagination' => ['page' => $page, 'limit' => $limit, 'total' => 0, 'total_pages' => 0],
        ]);
    }

    $countStmt = $db->query("SELECT COUNT(*) as total FROM audit_logs");
    $total = (int) $countStmt->fetch()['total'];
    $totalPages = $total > 0 ? (int) ceil($total / $limit) : 0;

    $stmt = $db->prepare("
        SELECT 
            a.id,
            a.admin_id,
            a.action_type,
            a.property_id,
            a.details,
            a.ip_address,
            a.created_at,
            u.full_name as admin_name,
            u.email as admin_email
        FROM audit_logs a
        LEFT JOIN admin_users u ON u.id = a.admin_id
        ORDER BY a.created_at DESC
        LIMIT ? OFFSET ?
    ");
    $stmt->execute([$limit, $offset]);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $logs = [];
    foreach ($rows as $row) {
        $logs[] = [
            'id' => (int) $row['id'],
            'admin_id' => (int) $row['admin_id'],
            'admin_name' => $row['admin_name'] ?? 'Admin',
            'action_type' => $row['action_type'],
            'property_id' => $row['property_id'] !== null ? (int) $row['property_id'] : null,
            'details' => $row['details'],
            'ip_address' => $row['ip_address'],
            'created_at' => $row['created_at'],
        ];
    }

    sendSuccess('Audit logs retrieved', [
        'logs' => $logs,
        'pagination' => [
            'page' => $page,
            'limit' => $limit,
            'total' => $total,
            'total_pages' => $totalPages,
        ],
    ]);

} catch (PDOException $e) {
    error_log("Admin Audit Logs List PDO Error: " . $e->getMessage());
    sendError('Failed to fetch audit logs', null, 500);
} catch (Exception $e) {
    error_log("Admin Audit Logs List Error: " . $e->getMessage());
    sendError('Failed to fetch audit logs', null, 500);
}
