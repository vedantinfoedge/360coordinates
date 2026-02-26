<?php
/**
 * Audit Log Helper
 * Logs admin actions (approve/reject/delete property) for audit trail.
 */

if (!function_exists('logAdminPropertyAction')) {
    /**
     * Log an admin property action to audit_logs table.
     * @param \PDO $db Database connection
     * @param int $adminId Admin user ID
     * @param string $actionType One of: approve_property, reject_property, delete_property
     * @param int|null $propertyId Property ID
     * @param string|null $details Optional (e.g. rejection reason)
     * @return bool True if logged, false if table missing or error
     */
    function logAdminPropertyAction($db, $adminId, $actionType, $propertyId = null, $details = null) {
        if (!$db || !$adminId || !$actionType) {
            return false;
        }
        $ip = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? null;
        if (is_array($ip)) {
            $ip = trim(explode(',', $ip)[0]);
        }
        if (strlen($ip ?? '') > 45) {
            $ip = substr($ip, 0, 45);
        }
        $details = $details !== null ? substr((string) $details, 0, 500) : null;
        try {
            $stmt = $db->prepare("
                INSERT INTO audit_logs (admin_id, action_type, property_id, details, ip_address, created_at)
                VALUES (?, ?, ?, ?, ?, NOW())
            ");
            $stmt->execute([$adminId, $actionType, $propertyId, $details, $ip]);
            return true;
        } catch (PDOException $e) {
            if (strpos($e->getMessage(), "doesn't exist") !== false) {
                error_log("Audit log: audit_logs table does not exist. Run audit_logs_migration.sql");
            } else {
                error_log("Audit log insert error: " . $e->getMessage());
            }
            return false;
        }
    }
}
