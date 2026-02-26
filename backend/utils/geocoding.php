<?php
/**
 * Geocoding Utility
 * Converts location addresses to latitude/longitude coordinates using Mapbox Geocoding API
 */

/**
 * Geocode a location string to get coordinates
 * 
 * @param string $location The location/address string to geocode
 * @param string $country Optional country code (default: 'IN' for India)
 * @return array|null Returns ['latitude' => float, 'longitude' => float] or null on failure
 */
function geocodeLocation($location, $country = 'IN') {
    if (empty($location) || trim($location) === '') {
        return null;
    }
    
    // Mapbox Geocoding API token
    // You can set this in config.php or use environment variable
    $mapboxToken = defined('MAPBOX_ACCESS_TOKEN') 
        ? MAPBOX_ACCESS_TOKEN 
        : 'pk.eyJ1Ijoic3VkaGFrYXJwb3VsIiwiYSI6ImNtaXp0ZmFrNTAxaTQzZHNiODNrYndsdTAifQ.YTMezksySLU7ZpcYkvXyqg';
    
    if (empty($mapboxToken)) {
        error_log("Geocoding: Mapbox token not configured");
        return null;
    }
    
    // URL encode the location
    $encodedLocation = urlencode($location);
    
    // Mapbox Geocoding API endpoint
    // Using forward geocoding: address -> coordinates
    $url = "https://api.mapbox.com/geocoding/v5/mapbox.places/{$encodedLocation}.json";
    $url .= "?access_token={$mapboxToken}";
    $url .= "&country={$country}";
    $url .= "&types=address,locality,place,neighborhood,poi";
    $url .= "&limit=1";
    $url .= "&language=en";
    
    // Initialize cURL
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);
    
    // Check for cURL errors
    if ($curlError) {
        error_log("Geocoding cURL error: " . $curlError);
        return null;
    }
    
    // Check HTTP status code
    if ($httpCode !== 200) {
        error_log("Geocoding API returned HTTP {$httpCode} for location: {$location}");
        return null;
    }
    
    // Parse JSON response
    $data = json_decode($response, true);
    
    if (json_last_error() !== JSON_ERROR_NONE) {
        error_log("Geocoding JSON parse error: " . json_last_error_msg());
        return null;
    }
    
    // Check if we have results
    if (!isset($data['features']) || empty($data['features'])) {
        error_log("Geocoding: No results found for location: {$location}");
        return null;
    }
    
    // Get the first (most relevant) result
    $feature = $data['features'][0];
    
    // Extract coordinates (Mapbox returns [longitude, latitude])
    if (!isset($feature['center']) || !is_array($feature['center']) || count($feature['center']) < 2) {
        error_log("Geocoding: Invalid coordinates in response for location: {$location}");
        return null;
    }
    
    $longitude = floatval($feature['center'][0]);
    $latitude = floatval($feature['center'][1]);
    
    // Validate coordinates
    if ($latitude < -90 || $latitude > 90 || $longitude < -180 || $longitude > 180) {
        error_log("Geocoding: Invalid coordinate values for location: {$location}");
        return null;
    }
    
    return [
        'latitude' => $latitude,
        'longitude' => $longitude
    ];
}

/**
 * Geocode location if coordinates are missing
 * This is a helper function that only geocodes if coordinates are not already provided
 * 
 * @param string $location The location/address string
 * @param float|null $existingLatitude Existing latitude (if any)
 * @param float|null $existingLongitude Existing longitude (if any)
 * @param string $country Optional country code
 * @return array Returns ['latitude' => float|null, 'longitude' => float|null]
 */
function geocodeIfNeeded($location, $existingLatitude = null, $existingLongitude = null, $country = 'IN') {
    // If coordinates already exist and are valid, use them
    if ($existingLatitude !== null && $existingLongitude !== null 
        && $existingLatitude != 0 && $existingLongitude != 0
        && $existingLatitude >= -90 && $existingLatitude <= 90
        && $existingLongitude >= -180 && $existingLongitude <= 180) {
        return [
            'latitude' => floatval($existingLatitude),
            'longitude' => floatval($existingLongitude)
        ];
    }
    
    // If location is provided, try to geocode it
    if (!empty($location)) {
        $geocoded = geocodeLocation($location, $country);
        if ($geocoded) {
            return $geocoded;
        }
    }
    
    // Return null if geocoding failed or location is empty
    return [
        'latitude' => null,
        'longitude' => null
    ];
}

