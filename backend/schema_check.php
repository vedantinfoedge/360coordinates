<?php
require_once __DIR__ . '/config/database.php';
$db = getDB();
$stmt = $db->query('DESCRIBE properties');
$fields = $stmt->fetchAll(PDO::FETCH_COLUMN);
echo implode("\n", $fields);
