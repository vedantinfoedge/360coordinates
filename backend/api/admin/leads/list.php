<?php
/**
 * Admin Leads List API
 * GET /api/admin/leads/list.php
 * Returns leads (buyer viewed contact) with property title, buyer name, phone, email, date.
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

    // Check if leads table exists
    $tableCheck = $db->query("SHOW TABLES LIKE 'leads'");
    if ($tableCheck->rowCount() === 0) {
        sendSuccess('Leads retrieved successfully', [
            'leads' => [],
            'pagination' => ['page' => $page, 'limit' => $limit, 'total' => 0, 'total_pages' => 0],
        ]);
    }

    $countStmt = $db->query("SELECT COUNT(*) as total FROM leads");
    $total = (int) $countStmt->fetch()['total'];
    $totalPages = $total > 0 ? (int) ceil($total / $limit) : 0;

    $stmt = $db->prepare("
        SELECT 
            l.id,
            l.buyer_id,
            l.property_id,
            l.seller_id,
            l.created_at,
            p.title as property_title,
            u_buyer.full_name as buyer_name,
            u_buyer.email as buyer_email,
            u_buyer.phone as buyer_phone
        FROM leads l
        INNER JOIN properties p ON p.id = l.property_id
        INNER JOIN users u_buyer ON u_buyer.id = l.buyer_id
        ORDER BY l.created_at DESC
        LIMIT ? OFFSET ?
    ");
    $stmt->execute([$limit, $offset]);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $leads = [];
    foreach ($rows as $row) {
        $leads[] = [
            'id' => (int) $row['id'],
            'buyer_id' => (int) $row['buyer_id'],
            'property_id' => (int) $row['property_id'],
            'seller_id' => (int) $row['seller_id'],
            'property_title' => $row['property_title'] ?? 'Property',
            'buyer_name' => $row['buyer_name'] ?? 'Buyer',
            'buyer_email' => $row['buyer_email'] ?? '',
            'buyer_phone' => $row['buyer_phone'] ?? '',
            'created_at' => $row['created_at'],
        ];
    }

    sendSuccess('Leads retrieved successfully', [
        'leads' => $leads,
        'pagination' => [
            'page' => $page,
            'limit' => $limit,
            'total' => $total,
            'total_pages' => $totalPages,
        ],
    ]);

} catch (PDOException $e) {
    error_log("Admin Leads List PDO Error: " . $e->getMessage());
    sendError('Failed to fetch leads', null, 500);
} catch (Exception $e) {
    error_log("Admin Leads List Error: " . $e->getMessage());
    sendError('Failed to fetch leads', null, 500);
}
