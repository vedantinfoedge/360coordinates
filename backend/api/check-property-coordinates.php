<?php
/**
 * Check Property Coordinates Diagnostic
 * 
 * This script checks how many properties have NULL or missing latitude/longitude values
 * 
 * Access: https://360coordinates.com/backend/api/check-property-coordinates.php
 * 
 * IMPORTANT: Delete this file after debugging for security!
 */

// Enable error reporting
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Set JSON header
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

require_once __DIR__ . '/../../config/config.php';
require_once __DIR__ . '/../../config/database.php';

$results = [
    'timestamp' => date('Y-m-d H:i:s'),
    'database_check' => [],
    'properties_analysis' => [],
    'recommendations' => []
];

try {
    $db = getDB();
    
    // Check if properties table exists
    $tablesQuery = $db->query("SHOW TABLES LIKE 'properties'");
    $hasPropertiesTable = $tablesQuery->rowCount() > 0;
    
    if (!$hasPropertiesTable) {
        $results['error'] = 'Properties table does not exist';
        echo json_encode($results, JSON_PRETTY_PRINT);
        exit();
    }
    
    // Check if latitude/longitude columns exist
    $columnsQuery = $db->query("SHOW COLUMNS FROM properties LIKE 'latitude'");
    $hasLatitude = $columnsQuery->rowCount() > 0;
    
    $columnsQuery = $db->query("SHOW COLUMNS FROM properties LIKE 'longitude'");
    $hasLongitude = $columnsQuery->rowCount() > 0;
    
    $results['database_check'] = [
        'properties_table_exists' => $hasPropertiesTable,
        'latitude_column_exists' => $hasLatitude,
        'longitude_column_exists' => $hasLongitude
    ];
    
    if (!$hasLatitude || !$hasLongitude) {
        $results['error'] = 'Latitude or longitude columns do not exist in properties table';
        echo json_encode($results, JSON_PRETTY_PRINT);
        exit();
    }
    
    // Get total properties count
    $totalQuery = $db->query("SELECT COUNT(*) as total FROM properties WHERE is_active = 1");
    $totalResult = $totalQuery->fetch();
    $totalProperties = intval($totalResult['total']);
    
    // Get properties with coordinates
    $withCoordsQuery = $db->query("
        SELECT COUNT(*) as count 
        FROM properties 
        WHERE is_active = 1 
        AND latitude IS NOT NULL 
        AND longitude IS NOT NULL
        AND latitude != 0 
        AND longitude != 0
    ");
    $withCoordsResult = $withCoordsQuery->fetch();
    $propertiesWithCoords = intval($withCoordsResult['count']);
    
    // Get properties without coordinates
    $withoutCoordsQuery = $db->query("
        SELECT COUNT(*) as count 
        FROM properties 
        WHERE is_active = 1 
        AND (latitude IS NULL OR longitude IS NULL OR latitude = 0 OR longitude = 0)
    ");
    $withoutCoordsResult = $withoutCoordsQuery->fetch();
    $propertiesWithoutCoords = intval($withoutCoordsResult['count']);
    
    // Get sample properties without coordinates
    $sampleQuery = $db->query("
        SELECT id, title, location, latitude, longitude 
        FROM properties 
        WHERE is_active = 1 
        AND (latitude IS NULL OR longitude IS NULL OR latitude = 0 OR longitude = 0)
        LIMIT 10
    ");
    $sampleProperties = $sampleQuery->fetchAll();
    
    // Get sample properties with coordinates
    $sampleWithQuery = $db->query("
        SELECT id, title, location, latitude, longitude 
        FROM properties 
        WHERE is_active = 1 
        AND latitude IS NOT NULL 
        AND longitude IS NOT NULL
        AND latitude != 0 
        AND longitude != 0
        LIMIT 5
    ");
    $sampleWithCoords = $sampleWithQuery->fetchAll();
    
    $results['properties_analysis'] = [
        'total_active_properties' => $totalProperties,
        'properties_with_coordinates' => $propertiesWithCoords,
        'properties_without_coordinates' => $propertiesWithoutCoords,
        'percentage_with_coords' => $totalProperties > 0 ? round(($propertiesWithCoords / $totalProperties) * 100, 2) : 0,
        'sample_without_coords' => $sampleProperties,
        'sample_with_coords' => $sampleWithCoords
    ];
    
    // Recommendations
    $recommendations = [];
    
    if ($propertiesWithoutCoords > 0) {
        $recommendations[] = "You have {$propertiesWithoutCoords} properties without coordinates. These will not show on the map.";
        $recommendations[] = "To fix: Update existing properties to include latitude/longitude when editing, or use a geocoding service to convert addresses to coordinates.";
        $recommendations[] = "When adding new properties, ensure the LocationPicker component saves coordinates to the database.";
    }
    
    if ($propertiesWithCoords === 0) {
        $recommendations[] = "WARNING: No properties have valid coordinates. All properties will be hidden on the map.";
        $recommendations[] = "Check if the LocationPicker component is properly saving coordinates when properties are added.";
    }
    
    $results['recommendations'] = $recommendations;
    
} catch (Exception $e) {
    $results['error'] = $e->getMessage();
    $results['trace'] = $e->getTraceAsString();
}

echo json_encode($results, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);

