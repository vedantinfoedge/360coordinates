<?php
/**
 * Seller Leads API
 * GET /api/seller/leads/list.php
 * 
 * Returns leads generated when buyers click "Show Owner Details" on a property.
 * A lead = one view_owner interaction per (buyer_id, property_id) - no duplicates.
 * Only returns leads for properties owned by the logged-in seller.
 */

require_once __DIR__ . '/../../../config/config.php';
require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../../utils/response.php';
require_once __DIR__ . '/../../../utils/auth.php';

handlePreflight();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendError('Method not allowed', null, 405);
}

try {
    $user = requireUserType(['seller', 'agent']);
    $sellerId = $user['id'];

    $db = getDB();
    if (!$db) {
        sendError('Database connection failed', null, 500);
    }

    // Prefer leads table if it exists (one row per buyer+property when they clicked View Contact)
    $tableCheck = $db->query("SHOW TABLES LIKE 'leads'");
    if ($tableCheck->rowCount() > 0) {
        $stmt = $db->prepare("
            SELECT 
                l.id,
                l.buyer_id,
                l.property_id,
                l.created_at,
                p.title as property_title,
                u.full_name as buyer_name,
                u.email as buyer_email,
                u.phone as buyer_phone
            FROM leads l
            INNER JOIN properties p ON p.id = l.property_id
            INNER JOIN users u ON u.id = l.buyer_id
            WHERE l.seller_id = ?
            ORDER BY l.created_at DESC
        ");
        $stmt->execute([$sellerId]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    } else {
        // Fallback: view_owner from buyer_interaction_limits
        $stmt = $db->prepare("
            SELECT 
                bil.buyer_id,
                bil.property_id,
                bil.timestamp as created_at,
                p.title as property_title,
                u.full_name as buyer_name,
                u.email as buyer_email,
                u.phone as buyer_phone
            FROM buyer_interaction_limits bil
            INNER JOIN properties p ON p.id = bil.property_id AND p.user_id = ?
            INNER JOIN users u ON u.id = bil.buyer_id
            WHERE bil.action_type = 'view_owner'
            AND bil.id = (
                SELECT MIN(bil2.id)
                FROM buyer_interaction_limits bil2
                WHERE bil2.buyer_id = bil.buyer_id
                  AND bil2.property_id = bil.property_id
                  AND bil2.action_type = 'view_owner'
            )
            ORDER BY bil.timestamp DESC
        ");
        $stmt->execute([$sellerId]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    $leads = [];
    foreach ($rows as $row) {
        $leads[] = [
            'id' => isset($row['id']) ? intval($row['id']) : null,
            'buyer_id' => intval($row['buyer_id']),
            'property_id' => intval($row['property_id']),
            'property_title' => $row['property_title'] ?? 'Property',
            'buyer_name' => $row['buyer_name'] ?? 'Buyer',
            'buyer_email' => $row['buyer_email'] ?? '',
            'buyer_phone' => $row['buyer_phone'] ?? '',
            'created_at' => $row['created_at'],
        ];
    }

    sendSuccess('Leads retrieved successfully', [
        'leads' => $leads,
        'total' => count($leads),
    ]);

} catch (PDOException $e) {
    error_log("Seller Leads List PDO Error: " . $e->getMessage());
    $errorMessage = $e->getMessage();
    if (strpos($errorMessage, "doesn't exist") !== false || strpos($errorMessage, "Unknown table") !== false) {
        sendError('Leads feature not available. Database table may not exist.', null, 500);
    } else {
        sendError('Failed to fetch leads', null, 500);
    }
} catch (Exception $e) {
    error_log("Seller Leads List Error: " . $e->getMessage());
    sendError('Failed to fetch leads', null, 500);
}
