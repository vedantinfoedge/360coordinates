import React, { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import './LocationPicker.css';



// Mapbox token - using environment variable or fallback
const MAPBOX_TOKEN = process.env.REACT_APP_MAPBOX_ACCESS_TOKEN || 'pk.eyJ1Ijoic3VkaGFrYXJwb3VsIiwiYSI6ImNtaXp0ZmFrNTAxaTQzZHNiODNrYndsdTAifQ.YTMezksySLU7ZpcYkvXyqg';

mapboxgl.accessToken = MAPBOX_TOKEN;

const LocationPicker = ({
  initialLocation = null,
  onLocationChange,
  onClose,
  defaultCenter = [78.9629, 20.5937], // Default: India center
  defaultZoom = 5
}) => {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const marker = useRef(null);
  const [location, setLocation] = useState(initialLocation);
  const [address, setAddress] = useState(initialLocation?.fullAddress || '');
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [coordinates, setCoordinates] = useState(initialLocation ? { lng: initialLocation.longitude, lat: initialLocation.latitude } : null);
  const [isSaving, setIsSaving] = useState(false);

  // Initialize map
  useEffect(() => {
    if (map.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: initialLocation 
        ? [initialLocation.longitude, initialLocation.latitude] 
        : defaultCenter,
      zoom: initialLocation ? 14 : defaultZoom
    });

    // Add controls
    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
    map.current.addControl(new mapboxgl.GeolocateControl({
      positionOptions: { enableHighAccuracy: true },
      trackUserLocation: false
    }), 'top-right');

    // Create draggable marker
    const el = document.createElement('div');
    el.className = 'location-picker-marker';
    el.innerHTML = `
      <div class="marker-pin">
        <span>📍</span>
      </div>
      <div class="marker-pulse"></div>
    `;

    marker.current = new mapboxgl.Marker({
      element: el,
      draggable: true
    })
      .setLngLat(initialLocation 
        ? [initialLocation.longitude, initialLocation.latitude]
        : defaultCenter
      )
      .addTo(map.current);

    // Handle marker drag end
    marker.current.on('dragend', () => {
      const lngLat = marker.current.getLngLat();
      setCoordinates({ lng: lngLat.lng, lat: lngLat.lat });
      updateLocation(lngLat.lng, lngLat.lat);
    });

    // Handle map click
    map.current.on('click', (e) => {
      const lngLat = { lng: e.lngLat.lng, lat: e.lngLat.lat };
      marker.current.setLngLat([lngLat.lng, lngLat.lat]);
      setCoordinates(lngLat);
      updateLocation(lngLat.lng, lngLat.lat);
    });

    // Initial reverse geocode if location exists
    if (initialLocation) {
      setCoordinates({ lng: initialLocation.longitude, lat: initialLocation.latitude });
      reverseGeocode(initialLocation.longitude, initialLocation.latitude);
    }

    // Cleanup
    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  // Reverse geocode to get address
  const reverseGeocode = useCallback(async (lng, lat) => {
    setIsLoading(true);
    try {
      // Use a more comprehensive geocoding request to get better state information
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${MAPBOX_TOKEN}&country=IN&types=address,locality,place,region&language=en`
      );
      const data = await response.json();

      if (data.features && data.features.length > 0) {
        const feature = data.features[0];
        const fullAddress = feature.place_name;
        setAddress(fullAddress);

        // Parse context for structured address
        const context = feature.context || [];
        const addressData = {
          longitude: lng,
          latitude: lat,
          fullAddress: fullAddress,
          address: feature.text || '',
          locality: '',
          city: '',
          state: '',
          pincode: '',
          country: ''
        };

        context.forEach(item => {
          if (item.id.startsWith('locality')) addressData.locality = item.text;
          if (item.id.startsWith('place')) addressData.city = item.text;
          if (item.id.startsWith('region')) addressData.state = item.text;
          if (item.id.startsWith('postcode')) addressData.pincode = item.text;
          if (item.id.startsWith('country')) addressData.country = item.text;
        });

        // If state not found in context, try to find it in all features
        if (!addressData.state) {
          for (const feat of data.features) {
            if (feat.place_type && feat.place_type.includes('region')) {
              addressData.state = feat.text;
              break;
            }
            const featContext = feat.context || [];
            for (const ctx of featContext) {
              if (ctx.id.startsWith('region')) {
                addressData.state = ctx.text;
                break;
              }
            }
            if (addressData.state) break;
          }
        }

        // Update location state (don't call onLocationChange here - only on save)
        setLocation(addressData);
      }
    } catch (error) {
      console.error('Reverse geocoding error:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Update location and reverse geocode
  const updateLocation = useCallback(async (lng, lat) => {
    await reverseGeocode(lng, lat);
  }, [reverseGeocode]);

  // Handle address search
  const handleSearch = async (searchQuery) => {
    if (!searchQuery || searchQuery.length < 3) return;

    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(searchQuery)}.json?access_token=${MAPBOX_TOKEN}&country=IN&types=place,locality,address&limit=1`
      );
      const data = await response.json();

      if (data.features && data.features.length > 0) {
        const [lng, lat] = data.features[0].center;
        setCoordinates({ lng, lat });
        marker.current.setLngLat([lng, lat]);
        map.current.flyTo({
          center: [lng, lat],
          zoom: 15,
          essential: true
        });
        updateLocation(lng, lat);
        setSearchQuery(''); // Clear search after selection
      }
    } catch (error) {
      console.error('Search error:', error);
    }
  };

  // Get current location
  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { longitude, latitude } = position.coords;
          setCoordinates({ lng: longitude, lat: latitude });
          marker.current.setLngLat([longitude, latitude]);
          map.current.flyTo({
            center: [longitude, latitude],
            zoom: 16,
            essential: true
          });
          updateLocation(longitude, latitude);
        },
        (error) => {
          console.error('Geolocation error:', error);
          alert('Unable to get your location. Please enable location services.');
        }
      );
    } else {
      alert('Geolocation is not supported by your browser.');
    }
  };

  // Handle save button
  const handleSave = () => {
    if (coordinates) {
      setIsSaving(true);
      
      // If we have location data (from reverse geocoding), use it, otherwise use coordinates
      const locationToSave = location || {
        longitude: coordinates.lng,
        latitude: coordinates.lat,
        fullAddress: address || `Location at ${coordinates.lat.toFixed(6)}, ${coordinates.lng.toFixed(6)}`
      };
      
      if (onLocationChange) {
        onLocationChange(locationToSave);
      }
      
      // Show success feedback for 1.5 seconds before closing
      setTimeout(() => {
        setIsSaving(false);
        if (onClose) {
          onClose();
        }
      }, 1500);
    }
  };

  return (
    <div className="location-picker-modal-content">
      <div className="location-picker-header">
        <h3>Select Property Location</h3>
        <button className="location-picker-close-btn" onClick={onClose} aria-label="Close">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </button>
      </div>

      <div className="location-picker-search-section">
        <div className="search-box">
          <input
            type="text"
            placeholder="Search location in India..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSearch(searchQuery);
              }
            }}
          />
          <button 
            type="button"
            onClick={() => handleSearch(searchQuery)}
            className="search-btn"
            title="Search"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2"/>
              <path d="m21 21-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
          <button 
            type="button"
            onClick={getCurrentLocation} 
            className="current-location-btn"
            title="Use current location"
          >
            📍
          </button>
        </div>
        
        <div className="location-picker-actions">
          <button type="button" className="cancel-btn" onClick={onClose} disabled={isSaving}>
            Cancel
          </button>
          <button 
            type="button" 
            className={`save-btn ${coordinates ? 'save-btn-active' : ''}`}
            onClick={handleSave}
            disabled={!coordinates || isLoading || isSaving}
          >
            {isSaving ? (
              <>
                <span className="saving-spinner"></span>
                Saving...
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ marginRight: '6px' }}>
                  <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Save Location
              </>
            )}
          </button>
        </div>
      </div>

      <div ref={mapContainer} className="location-picker-map" />

      <div className="location-picker-footer">
        <div className="selected-location-info">
          {isLoading ? (
            <>
              <span className="location-icon">📍</span>
              <div className="location-details">
                <span className="loading">Getting address...</span>
                {coordinates && (
                  <small className="coordinates">
                    Lat: {coordinates.lat.toFixed(6)}, Lng: {coordinates.lng.toFixed(6)}
                  </small>
                )}
              </div>
            </>
          ) : coordinates ? (
            <>
              <span className="location-icon">📍</span>
              <div className="location-details">
                <span className="location-text">
                  {address || `Location selected at ${coordinates.lat.toFixed(6)}, ${coordinates.lng.toFixed(6)}`}
                </span>
                <small className="coordinates">
                  Lat: {coordinates.lat.toFixed(6)}, Lng: {coordinates.lng.toFixed(6)}
                </small>
              </div>
              {isSaving && (
                <span className="save-success-indicator">✓ Saved!</span>
              )}
            </>
          ) : (
            <>
              <span className="location-icon">📍</span>
              <div className="location-details">
                <span className="location-text">
                  Click on map or drag marker to select location
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      <p className="location-picker-hint">
        💡 Tip: Click on the map or drag the marker to set exact property location
      </p>
    </div>
  );
};

export default LocationPicker;
