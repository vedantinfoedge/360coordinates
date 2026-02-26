<?php
/**
 * Public Statistics API
 * GET /api/public/stats.php
 * Returns public statistics for About Us page (no authentication required)
 */

require_once __DIR__ . '/../../config/config.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../utils/response.php';

handlePreflight();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendError('Method not allowed', null, 405);
}

try {
    $db = getDB();
    if (!$db) {
        sendError('Database connection failed', null, 500);
    }
    
    // Total Active Properties (only show active/approved properties)
    $stmt = $db->query("SELECT COUNT(*) as total FROM properties WHERE is_active = 1");
    $totalProperties = $stmt->fetch()['total'];
    
    // Total Users (all users including buyers, sellers, agents)
    $stmt = $db->query("SELECT COUNT(*) as total FROM users");
    $totalUsers = $stmt->fetch()['total'];
    
    // Total Registered Agents - count all users with user_type = 'agent'
    $stmt = $db->query("SELECT COUNT(*) as total FROM users WHERE user_type = 'agent'");
    $totalAgents = $stmt->fetch()['total'];
    
    // Total Cities (distinct cities from active properties)
    // Extract city from location field (format: "City, State" or just "City")
    try {
        $stmt = $db->query("
            SELECT COUNT(DISTINCT 
                CASE 
                    WHEN location LIKE '%,%' THEN TRIM(SUBSTRING_INDEX(location, ',', 1))
                    ELSE TRIM(location)
                END
            ) as total 
            FROM properties 
            WHERE is_active = 1 
            AND location IS NOT NULL 
            AND location != ''
        ");
        $totalCities = $stmt->fetch()['total'];
    } catch (PDOException $e) {
        // Fallback: count distinct locations if city extraction fails
        $stmt = $db->query("SELECT COUNT(DISTINCT location) as total FROM properties WHERE is_active = 1 AND location IS NOT NULL AND location != ''");
        $totalCities = $stmt->fetch()['total'];
    }
    
    // Define stat configuration with labels and display order
    $statsConfig = [
        [
            'key' => 'properties',
            'value' => intval($totalProperties),
            'label' => 'Properties Listed',
            'order' => 1
        ],
        [
            'key' => 'cities',
            'value' => intval($totalCities),
            'label' => 'Cities Covered',
            'order' => 2
        ],
        [
            'key' => 'users',
            'value' => intval($totalUsers),
            'label' => 'Happy Customers',
            'order' => 3
        ],
        [
            'key' => 'agents',
            'value' => intval($totalAgents),
            'label' => 'Verified Agents',
            'order' => 4
        ]
    ];
    
    // Sort by order
    usort($statsConfig, function($a, $b) {
        return $a['order'] - $b['order'];
    });
    
    // Also provide raw stats for backward compatibility
    $rawStats = [
        'total_properties' => intval($totalProperties),
        'total_users' => intval($totalUsers),
        'total_agents' => intval($totalAgents),
        'total_cities' => intval($totalCities),
    ];
    
    $response = [
        'stats' => $statsConfig,
        'raw' => $rawStats // For backward compatibility
    ];
    
    sendSuccess('Statistics retrieved successfully', $response);
    
} catch (Exception $e) {
    sendError('Failed to retrieve statistics: ' . $e->getMessage(), null, 500);
}

