<?php
/**
 * Admin Support Tickets List API
 * GET /api/admin/support/list.php
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
    $db = getDB();
    
    // Pagination
    $page = isset($_GET['page']) ? max(1, intval($_GET['page'])) : 1;
    $limit = isset($_GET['limit']) ? min(100, max(1, intval($_GET['limit']))) : 20;
    $offset = ($page - 1) * $limit;
    
    // Filters
    $status = isset($_GET['status']) ? $_GET['status'] : null;
    $priority = isset($_GET['priority']) ? $_GET['priority'] : null;
    $search = isset($_GET['search']) ? trim($_GET['search']) : '';
    
    // Build query
    $where = [];
    $params = [];
    
    if ($status && $status !== 'all') {
        $where[] = "st.status = ?";
        $params[] = $status;
    }
    
    if ($priority && $priority !== 'all') {
        $where[] = "st.priority = ?";
        $params[] = $priority;
    }
    
    if ($search) {
        $where[] = "(st.subject LIKE ? OR st.message LIKE ? OR u.full_name LIKE ? OR u.email LIKE ?)";
        $searchTerm = "%{$search}%";
        $params[] = $searchTerm;
        $params[] = $searchTerm;
        $params[] = $searchTerm;
        $params[] = $searchTerm;
    }
    
    $whereClause = !empty($where) ? "WHERE " . implode(" AND ", $where) : "";
    
    // Get tickets
    $query = "
        SELECT 
            st.id,
            st.subject,
            st.message,
            st.priority,
            st.status,
            st.created_at,
            st.updated_at,
            u.id as user_id,
            u.full_name as user_name,
            u.email as user_email,
            u.phone as user_phone,
            a.full_name as assigned_to_name
        FROM support_tickets st
        LEFT JOIN users u ON st.user_id = u.id
        LEFT JOIN admin_users a ON st.assigned_to = a.id
        {$whereClause}
        ORDER BY 
            CASE st.priority
                WHEN 'urgent' THEN 1
                WHEN 'high' THEN 2
                WHEN 'medium' THEN 3
                WHEN 'low' THEN 4
            END,
            st.created_at DESC
        LIMIT " . intval($limit) . " OFFSET " . intval($offset) . "
    ";
    
    $stmt = $db->prepare($query);
    $stmt->execute($params);
    $tickets = $stmt->fetchAll();
    
    // Get total count
    $countQuery = "SELECT COUNT(*) as total FROM support_tickets st LEFT JOIN users u ON st.user_id = u.id {$whereClause}";
    $countStmt = $db->prepare($countQuery);
    $countStmt->execute($params);
    $total = $countStmt->fetch()['total'];
    
    // Get stats
    $statsQuery = "
        SELECT 
            status,
            COUNT(*) as count
        FROM support_tickets
        GROUP BY status
    ";
    $statsStmt = $db->query($statsQuery);
    $statusStats = $statsStmt->fetchAll(PDO::FETCH_KEY_PAIR);
    
    // Format tickets
    foreach ($tickets as &$ticket) {
        $ticket['id'] = intval($ticket['id']);
        $ticket['ticket_id'] = 'TCT-' . str_pad($ticket['id'], 3, '0', STR_PAD_LEFT);
        $ticket['user_id'] = $ticket['user_id'] ? intval($ticket['user_id']) : null;
    }
    
    sendSuccess('Tickets retrieved successfully', [
        'tickets' => $tickets,
        'stats' => [
            'open' => intval($statusStats['open'] ?? 0),
            'in_progress' => intval($statusStats['in_progress'] ?? 0),
            'resolved' => intval($statusStats['resolved'] ?? 0),
            'closed' => intval($statusStats['closed'] ?? 0),
            'total' => intval($total)
        ],
        'pagination' => [
            'page' => $page,
            'limit' => $limit,
            'total' => intval($total),
            'pages' => ceil($total / $limit)
        ]
    ]);
    
} catch (Exception $e) {
    error_log("Admin Support Tickets List Error: " . $e->getMessage());
    sendError('Failed to retrieve tickets', null, 500);
}
