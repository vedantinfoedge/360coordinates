<?php
/**
 * View Email Logs
 * 
 * Displays recent email sending attempts and their status
 */

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/database.php';

header('Content-Type: text/html; charset=utf-8');

// Get optional filter parameters
$userId = isset($_GET['user_id']) ? intval($_GET['user_id']) : null;
$limit = isset($_GET['limit']) ? intval($_GET['limit']) : 50;

try {
    $db = getDB();
    
    // Build query
    $query = "SELECT el.*, u.email as user_email, u.full_name 
              FROM email_logs el 
              LEFT JOIN users u ON el.user_id = u.id";
    
    $params = [];
    if ($userId) {
        $query .= " WHERE el.user_id = ?";
        $params[] = $userId;
    }
    
    $query .= " ORDER BY el.created_at DESC LIMIT ?";
    $params[] = $limit;
    
    $stmt = $db->prepare($query);
    $stmt->execute($params);
    $logs = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Get error summary
    $errorStmt = $db->query("
        SELECT status, COUNT(*) as count 
        FROM email_logs 
        GROUP BY status
    ");
    $errorSummary = $errorStmt->fetchAll(PDO::FETCH_ASSOC);
    
} catch (Exception $e) {
    die("Database error: " . $e->getMessage());
}

?>
<!DOCTYPE html>
<html>
<head>
    <title>Email Logs</title>
    <style>
        body { font-family: Arial; max-width: 1200px; margin: 20px auto; padding: 20px; background: #f5f5f5; }
        h1 { color: #333; }
        .summary { background: white; padding: 15px; margin: 20px 0; border-radius: 5px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .summary-item { display: inline-block; margin-right: 30px; }
        .success { color: #4caf50; font-weight: bold; }
        .failed { color: #f44336; font-weight: bold; }
        .pending { color: #ff9800; font-weight: bold; }
        table { width: 100%; border-collapse: collapse; background: white; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background: #1976d2; color: white; }
        tr:hover { background: #f5f5f5; }
        .status-success { color: #4caf50; font-weight: bold; }
        .status-failed { color: #f44336; font-weight: bold; }
        .status-pending { color: #ff9800; font-weight: bold; }
        pre { background: #f0f0f0; padding: 10px; border-radius: 3px; overflow-x: auto; font-size: 12px; max-height: 200px; overflow-y: auto; }
        .error-details { background: #ffebee; padding: 10px; border-radius: 3px; margin-top: 5px; }
        .filter-form { background: white; padding: 15px; margin: 20px 0; border-radius: 5px; }
        .filter-form input, .filter-form button { padding: 8px; margin: 5px; }
        .msg91-error-link { color: #1976d2; text-decoration: none; }
        .msg91-error-link:hover { text-decoration: underline; }
    </style>
</head>
<body>
    <h1>📧 Email Logs</h1>
    
    <div class="summary">
        <h2>Summary</h2>
        <?php foreach ($errorSummary as $summary): ?>
            <div class="summary-item">
                <span class="<?php echo strtolower($summary['status']); ?>">
                    <?php echo htmlspecialchars($summary['status']); ?>: 
                    <?php echo $summary['count']; ?>
                </span>
            </div>
        <?php endforeach; ?>
    </div>
    
    <div class="filter-form">
        <form method="GET">
            <label>User ID: <input type="number" name="user_id" value="<?php echo $userId ? htmlspecialchars($userId) : ''; ?>" placeholder="Filter by user ID"></label>
            <label>Limit: <input type="number" name="limit" value="<?php echo $limit; ?>" min="1" max="200"></label>
            <button type="submit">Filter</button>
            <a href="?" style="margin-left: 10px;">Clear</a>
        </form>
    </div>
    
    <?php if (empty($logs)): ?>
        <p>No email logs found.</p>
    <?php else: ?>
        <table>
            <thead>
                <tr>
                    <th>ID</th>
                    <th>User ID</th>
                    <th>User Email</th>
                    <th>Name</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Error Message</th>
                    <th>MSG91 Response</th>
                    <th>Created At</th>
                </tr>
            </thead>
            <tbody>
                <?php foreach ($logs as $log): ?>
                    <tr>
                        <td><?php echo htmlspecialchars($log['id']); ?></td>
                        <td><?php echo htmlspecialchars($log['user_id']); ?></td>
                        <td><?php echo htmlspecialchars($log['user_email'] ?? 'N/A'); ?></td>
                        <td><?php echo htmlspecialchars($log['full_name'] ?? 'N/A'); ?></td>
                        <td><?php echo htmlspecialchars($log['email_type']); ?></td>
                        <td>
                            <span class="status-<?php echo strtolower($log['status']); ?>">
                                <?php echo htmlspecialchars($log['status']); ?>
                            </span>
                        </td>
                        <td>
                            <?php if ($log['error_message']): ?>
                                <div class="error-details">
                                    <?php echo htmlspecialchars($log['error_message']); ?>
                                </div>
                            <?php else: ?>
                                -
                            <?php endif; ?>
                        </td>
                        <td>
                            <?php if ($log['msg91_response']): ?>
                                <?php 
                                $response = json_decode($log['msg91_response'], true);
                                if ($response && isset($response['code']) && $response['code'] == '401'): 
                                ?>
                                    <a href="msg91-error-418-fix.php" class="msg91-error-link" target="_blank">
                                        <strong>⚠️ Error 418 - Click for Fix Guide</strong>
                                    </a><br>
                                <?php endif; ?>
                                <pre><?php echo htmlspecialchars($log['msg91_response']); ?></pre>
                            <?php else: ?>
                                -
                            <?php endif; ?>
                        </td>
                        <td><?php echo htmlspecialchars($log['created_at']); ?></td>
                    </tr>
                <?php endforeach; ?>
            </tbody>
        </table>
    <?php endif; ?>
    
    <div style="margin-top: 30px; padding: 15px; background: white; border-radius: 5px;">
        <h2>🔧 Quick Actions</h2>
        <ul>
            <li><a href="msg91-error-418-fix.php" target="_blank">Fix Error 418 Guide</a></li>
            <li><a href="check-server-ip.php" target="_blank">Check Server IP</a></li>
            <li><a href="test-welcome-email-direct.php" target="_blank">Test Welcome Email</a></li>
            <li><a href="verify-msg91-config.php" target="_blank">Verify MSG91 Config</a></li>
        </ul>
    </div>
</body>
</html>

