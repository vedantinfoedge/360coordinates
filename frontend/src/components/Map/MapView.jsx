import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { FavoritesManager } from '../../UserDashboard/components/PropertyCard';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import './MapView.css';

// Set your Mapbox access token - using Create React App environment variable
const MAPBOX_TOKEN = process.env.REACT_APP_MAPBOX_ACCESS_TOKEN || 'pk.eyJ1Ijoic3VkaGFrYXJwb3VsIiwiYSI6ImNtaXp0ZmFrNTAxaTQzZHNiODNrYndsdTAifQ.YTMezksySLU7ZpcYkvXyqg';
mapboxgl.accessToken = MAPBOX_TOKEN;

const MapView = ({
  properties = [],
  center = [73.8567, 18.5204], // Pune, Maharashtra
  zoom = 5,
  onPropertyClick,
  onMapClick,
  showControls = true,
  interactive = true,
  currentPropertyId = null, // ID of the property to highlight
  fullscreenSearchBar = null, // Optional React node: compact search bar shown in fullscreen mode
  variant = 'search' // 'search' or 'details' - effects popup styling
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const fullscreenWrapperRef = useRef(null);
  const mapContainer = useRef(null);
  const map = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const markersRef = useRef([]);
  const markersMapRef = useRef(new Map()); // Map to store propertyId -> marker mapping
  const [mapLoaded, setMapLoaded] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState(null); // Track selected property for popup
  const lastOpenedPopupRef = useRef(null); // Track last opened popup to avoid duplicates
  const lastSelectionFromMapRef = useRef(false); // True when selection came from clicking a map marker (so we open popup on 1st click only then)
  const favoriteStatesRef = useRef(new Map()); // Track favorite state per property
  const closeAllPopupsRef = useRef(null); // So we can close popups before programmatic flyTo (avoids popup "shuffle" during move)

  // Initialize map
  useEffect(() => {
    if (map.current) return; // Map already initialized

    if (!mapContainer.current) {
      console.error('Map container ref is null');
      return;
    }

    let resizeObserver = null;
    let handleResize = null;
    let checkDimensionsInterval = null;

    // Check if container has dimensions
    const container = mapContainer.current;
    const hasDimensions = container.offsetWidth > 0 && container.offsetHeight > 0;

    const initializeMap = () => {
      if (map.current) return; // Already initialized

      try {
        map.current = new mapboxgl.Map({
          container: mapContainer.current,
          style: 'mapbox://styles/mapbox/streets-v12',
          center: center,
          zoom: zoom,
          interactive: interactive
        });

        // Add navigation controls (fullscreen targets wrapper so search bar + map go fullscreen)
        if (showControls) {
          map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
          const fullscreenContainer = fullscreenWrapperRef.current || mapContainer.current;
          map.current.addControl(new mapboxgl.FullscreenControl({ container: fullscreenContainer }), 'top-right');
          map.current.addControl(new mapboxgl.GeolocateControl({
            positionOptions: { enableHighAccuracy: true },
            trackUserLocation: true
          }), 'top-right');
        }

        // Map load event
        map.current.on('load', () => {
          setMapLoaded(true);
          // Ensure map resizes after load
          setTimeout(() => {
            if (map.current) {
              map.current.resize();
            }
          }, 100);
        });

        // Close popups when map moves (drag, pan, zoom)
        const closeAllPopups = () => {
          markersRef.current.forEach(marker => {
            if (marker.getPopup() && marker.getPopup().isOpen()) {
              marker.getPopup().remove();
            }
          });
          lastOpenedPopupRef.current = null;
        };
        closeAllPopupsRef.current = closeAllPopups;

        // Close popups on map movement
        map.current.on('dragstart', closeAllPopups);
        map.current.on('movestart', closeAllPopups);
        map.current.on('zoomstart', closeAllPopups);

        // Map click event - but ignore clicks on markers
        if (onMapClick) {
          map.current.on('click', (e) => {
            // Check if click was on a marker element
            const target = e.originalEvent.target;
            if (target && (target.closest('.price-tag-marker') || target.closest('.mapboxgl-marker'))) {
              return; // Don't trigger map click if clicking on a marker
            }
            // Close popups when clicking on map
            closeAllPopups();
            onMapClick({
              lng: e.lngLat.lng,
              lat: e.lngLat.lat
            });
          });
        }

        // Handle resize events
        handleResize = () => {
          if (map.current && mapLoaded) {
            map.current.resize();
          }
        };
        window.addEventListener('resize', handleResize);

        // Also resize when container becomes visible
        resizeObserver = new ResizeObserver(() => {
          if (map.current && mapLoaded) {
            map.current.resize();
          }
        });

        if (mapContainer.current) {
          resizeObserver.observe(mapContainer.current);
        }
      } catch (error) {
        console.error('Error creating Mapbox map:', error);
      }
    };

    if (!hasDimensions) {
      // Wait for container to have dimensions
      checkDimensionsInterval = setInterval(() => {
        if (container.offsetWidth > 0 && container.offsetHeight > 0) {
          clearInterval(checkDimensionsInterval);
          initializeMap();
        }
      }, 100);

      // Timeout after 5 seconds
      setTimeout(() => {
        if (checkDimensionsInterval) {
          clearInterval(checkDimensionsInterval);
        }
        if (!map.current) {
          console.warn('Map container did not get dimensions, initializing anyway');
          initializeMap();
        }
      }, 5000);
    } else {
      initializeMap();
    }

    // Cleanup on unmount
    return () => {
      if (checkDimensionsInterval) {
        clearInterval(checkDimensionsInterval);
      }
      if (handleResize) {
        window.removeEventListener('resize', handleResize);
      }
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []); // Only run once on mount

  // Listen for fullscreen change to show/hide compact search bar and resize map
  useEffect(() => {
    const onFullscreenChange = () => {
      const active = !!fullscreenWrapperRef.current && document.fullscreenElement === fullscreenWrapperRef.current;
      setIsFullscreen(active);
      if (map.current) {
        setTimeout(() => map.current.resize(), 150);
      }
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  // Update center when prop changes
  useEffect(() => {
    if (map.current && mapLoaded) {
      map.current.flyTo({
        center: center,
        zoom: zoom,
        essential: true
      });
    }
  }, [center, zoom, mapLoaded]);

  // Center map on current property when it changes (e.g. hover on list card)
  useEffect(() => {
    if (!map.current || !mapLoaded || !currentPropertyId) return;

    const currentProperty = properties.find(p => p.id === currentPropertyId);
    if (currentProperty && currentProperty.longitude && currentProperty.latitude) {
      // Close any open popup *before* flying so it doesn't shuffle/jump during the animation
      closeAllPopupsRef.current?.();
      // Mark that this move was from list hover, not map click – so openCurrentPopup won't re-open a popup
      lastSelectionFromMapRef.current = false;
      map.current.flyTo({
        center: [currentProperty.longitude, currentProperty.latitude],
        zoom: 14,
        essential: true
      });
    }
  }, [currentPropertyId, properties, mapLoaded]);

  // Helper function to calculate distance between two coordinates (Haversine formula)
  const calculateDistance = useCallback((lat1, lon1, lat2, lon2) => {
    const R = 6371; // Radius of the Earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distanceKm = R * c;
    // Convert to degrees approximation (1 degree ≈ 111 km)
    return distanceKm / 111;
  }, []);

  // Navigate to property details page - open in new tab
  const navigateToProperty = useCallback((propertyId) => {
    if (!propertyId) {
      console.error('Invalid property ID for navigation:', propertyId);
      return;
    }

    try {
      // Open in new tab
      window.open(`/buyer-dashboard/details/${propertyId}`, '_blank', 'noopener,noreferrer');
    } catch (error) {
      console.error('Error navigating to property details:', error);
      // Fallback: use window location
      window.open(`/buyer-dashboard/details/${propertyId}`, '_blank', 'noopener,noreferrer');
    }
  }, []);

  // Format price helper - returns compact format (e.g., "45L", "6.5Cr")
  const formatPrice = useCallback((price) => {
    if (!price) return 'Price on Request';
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    if (isNaN(numPrice)) return 'Price on Request';

    if (numPrice >= 10000000) {
      const cr = numPrice / 10000000;
      return cr % 1 === 0 ? `${cr}Cr` : `${cr.toFixed(1)}Cr`;
    }
    if (numPrice >= 100000) {
      const lac = numPrice / 100000;
      return lac % 1 === 0 ? `${lac}L` : `${lac.toFixed(1)}L`;
    }
    if (numPrice >= 1000) {
      const k = numPrice / 1000;
      return k % 1 === 0 ? `${k}K` : `${k.toFixed(1)}K`;
    }
    return numPrice.toString();
  }, []);

  // Display price for marker/popup: use price range for upcoming projects, else formatted price
  const getDisplayPrice = useCallback((property) => {
    if (property.priceRange != null && property.priceRange !== '') {
      return `₹${property.priceRange} Cr`;
    }
    const formatted = formatPrice(property.price);
    return formatted === 'Price on Request' ? formatted : `₹${formatted}`;
  }, [formatPrice]);

  // Check favorite status for a property
  const checkFavoriteStatus = useCallback(async (propertyId) => {
    if (!propertyId) return false;

    try {
      // Check local storage first for quick display
      const localFavorite = FavoritesManager.isFavorite(propertyId);
      favoriteStatesRef.current.set(propertyId, localFavorite);

      // Then verify with API if user is authenticated
      if (user) {
        const { favoritesAPI } = await import('../../services/api.service');
        const response = await favoritesAPI.list();

        if (response.success) {
          const properties = response.data.properties || response.data.favorites || [];
          const favoriteIds = properties.map(p => p.id || p.property_id);
          const isFavorited = favoriteIds.includes(propertyId);
          favoriteStatesRef.current.set(propertyId, isFavorited);
          return isFavorited;
        }
      }

      return localFavorite;
    } catch (error) {
      console.error('Error checking favorite status:', error);
      const localFavorite = FavoritesManager.isFavorite(propertyId);
      favoriteStatesRef.current.set(propertyId, localFavorite);
      return localFavorite;
    }
  }, [user]);

  // Handle favorite button click
  const handleFavoriteClick = useCallback(async (propertyId, heartBtn) => {
    if (!user) {
      alert('Please login to add properties to favorites');
      navigate('/login');
      return;
    }

    try {
      const { favoritesAPI } = await import('../../services/api.service');
      const response = await favoritesAPI.toggle(propertyId);

      if (response.success) {
        const isFavorited = response.data.is_favorite !== undefined ? response.data.is_favorite : !favoriteStatesRef.current.get(propertyId);
        favoriteStatesRef.current.set(propertyId, isFavorited);

        // Update visual state
        const svg = heartBtn.querySelector('svg');
        if (svg) {
          if (isFavorited) {
            svg.setAttribute('fill', 'red');
            svg.setAttribute('stroke', 'red');
            heartBtn.classList.add('active');
          } else {
            svg.setAttribute('fill', 'none');
            svg.setAttribute('stroke', 'white');
            heartBtn.classList.remove('active');
          }
        }

        // Also update local storage for offline support
        FavoritesManager.toggleFavorite(propertyId);
      } else {
        console.error('Failed to toggle favorite:', response.message);
        alert(response.message || 'Failed to update favorite');
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      // Fallback to local storage if API fails
      const wasFavorited = favoriteStatesRef.current.get(propertyId);
      const isFavorited = !wasFavorited;
      favoriteStatesRef.current.set(propertyId, isFavorited);
      FavoritesManager.toggleFavorite(propertyId);

      // Update visual state
      const svg = heartBtn.querySelector('svg');
      if (svg) {
        if (isFavorited) {
          svg.setAttribute('fill', 'red');
          svg.setAttribute('stroke', 'red');
          heartBtn.classList.add('active');
        } else {
          svg.setAttribute('fill', 'none');
          svg.setAttribute('stroke', 'white');
          heartBtn.classList.remove('active');
        }
      }
    }
  }, [user, navigate]);

  // Copy to clipboard helper
  const copyToClipboard = useCallback(async (text) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }

      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();

      try {
        document.execCommand('copy');
        document.body.removeChild(textArea);
        return true;
      } catch (err) {
        document.body.removeChild(textArea);
        return false;
      }
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      return false;
    }
  }, []);

  // Handle share button click
  const handleShareClick = useCallback(async (property) => {
    if (!property || !property.id) {
      console.error('Cannot share: property ID is missing');
      return;
    }

    const shareUrl = `${window.location.origin}/details/${property.id}`;
    const shareData = {
      title: property.title || 'Property Listing',
      text: `Check out this property: ${property.title || 'Amazing Property'}`,
      url: shareUrl
    };

    // Check if Web Share API is supported (works great on mobile)
    if (navigator.share) {
      try {
        await navigator.share(shareData);
        console.log('Share successful');
      } catch (error) {
        // User cancelled or error occurred
        if (error.name !== 'AbortError') {
          console.error('Error sharing:', error);
          // Fallback to clipboard
          const copied = await copyToClipboard(shareUrl);
          if (copied) {
            alert('Link copied to clipboard!');
          } else {
            alert('Unable to share. Please copy the link manually: ' + shareUrl);
          }
        }
      }
    } else {
      // Fallback: Copy to clipboard for desktop
      const copied = await copyToClipboard(shareUrl);
      if (copied) {
        alert('Link copied to clipboard!');
      } else {
        alert('Please copy this link: ' + shareUrl);
      }
    }
  }, [copyToClipboard]);

  // Helper function to calculate optimal popup positioning based on available viewport space
  const calculateOptimalPopupPosition = useCallback((mapInstance, lngLat, popupElement) => {
    if (!mapInstance || !lngLat) {
      return { anchor: 'bottom', offset: [0, 25] };
    }

    // Get map container dimensions
    const mapContainer = mapInstance.getContainer();
    if (!mapContainer) {
      return { anchor: 'bottom', offset: [0, 25] };
    }

    const containerRect = mapContainer.getBoundingClientRect();
    const containerWidth = containerRect.width;
    const containerHeight = containerRect.height;

    // Convert lngLat to pixel coordinates
    const point = mapInstance.project(lngLat);
    const pinX = point.x;
    const pinY = point.y;

    // Get popup dimensions (if available, otherwise use estimated dimensions)
    let popupWidth = 350; // Default width (min-width from CSS is 320px, max is 380px)
    let popupHeight = 400; // Estimated height based on typical popup content

    if (popupElement) {
      const popupRect = popupElement.getBoundingClientRect();
      popupWidth = popupRect.width || popupWidth;
      popupHeight = popupRect.height || popupHeight;
    }

    // Define margins/padding
    const margin = 15;
    const offsetDistance = 25; // Distance from pin to popup edge

    // Calculate available space in each direction
    const spaceAbove = pinY;
    const spaceBelow = containerHeight - pinY;
    const spaceLeft = pinX;
    const spaceRight = containerWidth - pinX;

    // Check if popup fits in each direction
    const fitsAbove = spaceAbove >= (popupHeight + offsetDistance + margin);
    const fitsBelow = spaceBelow >= (popupHeight + offsetDistance + margin);
    const fitsLeft = spaceLeft >= (popupWidth + offsetDistance + margin);
    const fitsRight = spaceRight >= (popupWidth + offsetDistance + margin);

    // Calculate visible area for each position
    let bestVertical = 'bottom'; // Default to bottom (popup above pin)
    let bestHorizontal = 'center';
    let maxVisibleArea = 0;

    // Try vertical positioning (above/below)
    // Above (anchor: 'bottom')
    if (fitsAbove) {
      const visibleArea = Math.min(spaceAbove, popupHeight) * Math.min(popupWidth, containerWidth);
      if (visibleArea > maxVisibleArea) {
        maxVisibleArea = visibleArea;
        bestVertical = 'bottom';
      }
    }

    // Below (anchor: 'top')
    if (fitsBelow) {
      const visibleArea = Math.min(spaceBelow, popupHeight) * Math.min(popupWidth, containerWidth);
      if (visibleArea > maxVisibleArea) {
        maxVisibleArea = visibleArea;
        bestVertical = 'top';
      }
    }

    // If neither fits vertically, choose the one with more space
    if (!fitsAbove && !fitsBelow) {
      bestVertical = spaceAbove > spaceBelow ? 'bottom' : 'top';
    }

    // Calculate horizontal offset for optimal positioning
    // Mapbox centers popup by default, so offset[0] is horizontal shift from center
    let horizontalOffset = 0;

    // Calculate where popup would be if centered
    const centeredLeft = pinX - popupWidth / 2;
    const centeredRight = pinX + popupWidth / 2;

    // Check if centered position fits
    if (centeredLeft >= margin && centeredRight <= containerWidth - margin) {
      // Centered is fine
      horizontalOffset = 0;
    } else if (centeredLeft < margin) {
      // Popup goes off left edge, shift right
      horizontalOffset = margin - centeredLeft;
    } else {
      // Popup goes off right edge, shift left
      horizontalOffset = (containerWidth - margin) - centeredRight;
    }

    // Determine the final anchor and vertical offset
    let anchor = bestVertical;
    let verticalOffset = bestVertical === 'bottom' ? offsetDistance : -offsetDistance;
    let offset = [horizontalOffset, verticalOffset];

    return { anchor, offset };
  }, []);

  // Helper function to apply small offset for overlapping markers
  const applyMarkerOffset = useCallback((property, allProperties) => {
    const lat = property.latitude;
    const lng = property.longitude;

    // Check if there are other properties at the same location
    const sameLocationProps = allProperties.filter(p =>
      p.latitude === lat && p.longitude === lng
    );

    // If only one property at this location, no offset needed
    if (sameLocationProps.length <= 1) {
      return { lat, lng };
    }

    // Find the index of this property among properties at the same location
    const positionInGroup = sameLocationProps.findIndex(p => p.id === property.id);

    // Apply a small offset (approximately 50-100 meters) in a circular pattern
    const offsetDistance = 0.0005; // ~50 meters in degrees
    const angle = (2 * Math.PI * positionInGroup) / sameLocationProps.length;
    const offsetLat = lat + (offsetDistance * Math.cos(angle));
    const offsetLng = lng + (offsetDistance * Math.sin(angle));

    return { lat: offsetLat, lng: offsetLng };
  }, []);

  // Add/update property markers
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];
    markersMapRef.current.clear();
    lastOpenedPopupRef.current = null;

    console.log('🗺️ MapView: Adding markers for', properties.length, 'properties');

    // Count properties with and without coordinates
    const propertiesWithCoords = properties.filter(p => p.longitude && p.latitude);
    const propertiesWithoutCoords = properties.filter(p => !p.longitude || !p.latitude);

    if (propertiesWithoutCoords.length > 0) {
      console.warn(`⚠️ MapView: ${propertiesWithoutCoords.length} out of ${properties.length} properties are missing coordinates and will not appear on the map.`);
      console.warn('⚠️ Properties without coordinates:', propertiesWithoutCoords.map(p => ({ id: p.id, title: p.title, location: p.location })));
    }

    if (propertiesWithCoords.length === 0) {
      console.error('❌ MapView: No properties have valid coordinates. Map will be empty.');
      console.error('💡 Solution: Ensure properties have latitude/longitude values. Use LocationPicker when adding/editing properties.');
    }

    // Add new markers for each property
    properties.forEach((property, index) => {
      if (!property.longitude || !property.latitude) {
        return; // Skip silently (already logged above)
      }

      // Apply offset if multiple properties at same location
      const { lat: markerLat, lng: markerLng } = applyMarkerOffset(property, properties);

      if (markerLat !== property.latitude || markerLng !== property.longitude) {
        console.log(`📍 MapView: Applied offset for property ${property.id} (${property.title}) - Original: ${property.latitude}, ${property.longitude} → Offset: ${markerLat}, ${markerLng}`);
      }

      console.log('📍 MapView: Creating marker for property:', property.id, property.title, 'lat:', markerLat, 'lng:', markerLng);

      const isCurrentProperty = currentPropertyId !== null && property.id === currentPropertyId;

      // Get thumbnail/image
      const thumbnail = property.thumbnail ||
        (property.images && property.images.length > 0 ? (typeof property.images[0] === 'string' ? property.images[0] : property.images[0].url) : null) ||
        (property.cover_image || '/placeholder-property.jpg');

      // Create custom price tag marker element - small pill-shaped
      const displayPrice = getDisplayPrice(property);
      const el = document.createElement('div');
      el.className = `price-tag-marker ${isCurrentProperty ? 'selected' : ''}`;
      el.innerHTML = `
        <div class="price-tag">
          ${displayPrice}
        </div>
      `;

      // Get all images for carousel - check property.images, propertyData.images, cover_image, thumbnail
      const rawImages = (property.images && Array.isArray(property.images) && property.images.length > 0)
        ? property.images
        : (property.propertyData?.images && Array.isArray(property.propertyData.images) && property.propertyData.images.length > 0)
          ? property.propertyData.images
          : null;
      const allImages = rawImages
        ? rawImages.map(img => typeof img === 'string' ? img : (img && img.url) || '').filter(Boolean)
        : (property.cover_image ? [property.cover_image] : (thumbnail ? [thumbnail] : ['/placeholder-property.jpg']));

      const currentImageIndex = 0;
      const totalImages = allImages.length;

      // Format description (truncate if too long)
      const description = property.description || property.location || 'Property description';
      const truncatedDescription = description.length > 60 ? description.substring(0, 60) + '...' : description;

      // Format dates (if available)
      const checkInDate = property.check_in_date || '4 Jan';
      const checkOutDate = property.check_out_date || '9 Jan';
      const nights = property.nights || 5;

      // Create popup card - position will be calculated dynamically when it opens
      const popup = new mapboxgl.Popup({
        offset: 25,
        closeButton: false,
        closeOnClick: false,
        anchor: 'bottom', // Default, will be adjusted in open handler
        className: `map-card-container ${variant === 'details' ? 'premium-variant' : ''}`
      })
        .setHTML(`
          <div class="property-popup-card ${variant === 'details' ? 'details-popup' : ''}" data-property-id="${property.id}">
            <div class="popup-card-image-container">
              <div class="popup-card-image-wrapper ${totalImages > 1 ? 'popup-card-carousel' : ''}">
                ${totalImages > 1 ? `
                  <div class="popup-card-carousel-track">
                    ${allImages.map(img => `
                      <div class="popup-card-carousel-slide">
                        <img src="${img}" alt="${property.title || 'Property'}" class="popup-card-image" onerror="this.src='/placeholder-property.jpg';" />
                      </div>
                    `).join('')}
                  </div>
                ` : `
                  <img src="${allImages[0]}" alt="${property.title || 'Property'}" class="popup-card-image" onerror="this.src='/placeholder-property.jpg';" />
                `}
              </div>
              
              <div class="popup-card-image-overlay">
                <div class="popup-card-action-buttons">
                  <button class="popup-card-heart-btn" data-property-id="${property.id}" title="Save to favorites">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                    </svg>
                  </button>
                  <button class="popup-card-share-btn" data-property-id="${property.id}" title="Share property">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <circle cx="18" cy="5" r="3"></circle>
                      <circle cx="6" cy="12" r="3"></circle>
                      <circle cx="18" cy="19" r="3"></circle>
                      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
                    </svg>
                  </button>
                </div>
                <button class="popup-card-close-btn" title="Close">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>

              ${totalImages > 1 ? `
                <button class="popup-card-arrow popup-card-arrow-prev" title="Previous image">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"></polyline></svg>
                </button>
                <button class="popup-card-arrow popup-card-arrow-next" title="Next image">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
                </button>
                <div class="popup-card-pagination">
                  ${Array.from({ length: totalImages }, (_, i) => `
                    <span class="pagination-dot ${i === currentImageIndex ? 'active' : ''}" data-image-index="${i}" title="Image ${i + 1} of ${totalImages}"></span>
                  `).join('')}
                </div>
              ` : ''}
            </div>
            <div class="popup-card-content">
              <div class="popup-card-header">
                <h3 class="popup-card-title">${property.title || 'Property'}</h3>
              </div>
              <p class="popup-card-location">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                ${property.location || 'Location'}
              </p>
              <div class="popup-card-footer">
                <div class="popup-card-price-section">
                  <span class="popup-card-price">${getDisplayPrice(property)}</span>
                </div>
                <button class="popup-card-details-link">View Details</button>
              </div>
            </div>
          </div>
        `);

      // Create marker with offset coordinates if needed
      const marker = new mapboxgl.Marker(el)
        .setLngLat([markerLng, markerLat])
        .setPopup(popup)
        .addTo(map.current);

      // Handle marker click - open popup on click
      const markerElement = marker.getElement();

      // Ensure marker element is clickable
      markerElement.style.cursor = 'pointer';
      markerElement.style.pointerEvents = 'auto';

      // Track if popup was just opened by mousedown so we don't close it on the same gesture's click
      const openedByMousedownRef = { current: false };

      // Notify parent on pointer down (capture phase); mark that selection came from map so effect will open popup on 1st click
      const handlePointerDownCapture = (e) => {
        lastSelectionFromMapRef.current = true;
        if (onPropertyClick) {
          onPropertyClick(property);
        }
      };
      markerElement.addEventListener('pointerdown', handlePointerDownCapture, true);

      // On mousedown: open popup so it shows on 1st click (in case parent state is slow)
      const handleMarkerMouseDown = (e) => {
        e.stopPropagation();
        e.preventDefault();
        // Close any other open popups
        markersRef.current.forEach(m => {
          if (m !== marker && m.getPopup().isOpen()) {
            m.getPopup().remove();
          }
        });
        setSelectedProperty(property);
        if (!marker.getPopup().isOpen()) {
          marker.togglePopup();
          lastOpenedPopupRef.current = property.id;
          openedByMousedownRef.current = true;
          setTimeout(() => { openedByMousedownRef.current = false; }, 0);
        }
        lastSelectionFromMapRef.current = true;
        if (onPropertyClick) {
          onPropertyClick(property);
        }
      };
      markerElement.addEventListener('mousedown', handleMarkerMouseDown);

      // Handle clicks: toggle-close if already open (and not the same gesture as mousedown), else open
      const handleMarkerClick = (e) => {
        e.stopPropagation();
        markersRef.current.forEach(m => {
          if (m !== marker && m.getPopup().isOpen()) {
            m.getPopup().remove();
          }
        });
        setSelectedProperty(property);
        if (marker.getPopup().isOpen()) {
          if (!openedByMousedownRef.current) {
            marker.getPopup().remove();
            lastOpenedPopupRef.current = null;
            setSelectedProperty(null);
          }
        } else {
          marker.togglePopup();
          lastOpenedPopupRef.current = property.id;
        }
        if (onPropertyClick) {
          onPropertyClick(property);
        }
      };
      markerElement.addEventListener('click', handleMarkerClick);

      // Price-tag: same handlers so popup opens on first tap/click
      const priceTag = markerElement.querySelector('.price-tag');
      if (priceTag) {
        priceTag.style.pointerEvents = 'auto';
        priceTag.style.cursor = 'pointer';
        priceTag.addEventListener('pointerdown', handlePointerDownCapture, true);
        priceTag.addEventListener('mousedown', handleMarkerMouseDown);
        priceTag.addEventListener('click', (e) => {
          e.stopPropagation();
          handleMarkerClick(e);
        });
      }

      // Handle popup button clicks (heart, share, close, pagination)
      popup.on('open', () => {
        // Use setTimeout to ensure DOM is ready
        setTimeout(async () => {
          const popupElement = popup.getElement();
          if (!popupElement) return;

          // Calculate and apply optimal popup positioning
          // Use a simpler approach: close and reopen popup with correct anchor/offset if needed
          const adjustPopupPosition = () => {
            const markerLngLat = marker.getLngLat();

            // Get popup container
            const popupContainer = popupElement.closest('.mapboxgl-popup');
            if (!popupContainer) return;

            // Get actual popup dimensions
            const popupRect = popupElement.getBoundingClientRect();
            const popupWidth = popupRect.width || 350;
            const popupHeight = popupRect.height || 400;

            // Get container and pin position
            const container = map.current.getContainer();
            if (!container) return;

            const containerRect = container.getBoundingClientRect();
            const point = map.current.project(markerLngLat);
            const margin = 15;
            const offsetDistance = 25;

            // Determine best anchor based on available space
            const spaceAbove = point.y;
            const spaceBelow = containerRect.height - point.y;
            let finalAnchor = 'bottom'; // Default to above pin

            // Check which direction has more space and if popup fits
            const spaceNeeded = popupHeight + offsetDistance + margin;

            if (spaceAbove >= spaceNeeded) {
              // Enough space above, use bottom anchor (popup above pin)
              finalAnchor = 'bottom';
            } else if (spaceBelow >= spaceNeeded) {
              // Enough space below, use top anchor (popup below pin)
              finalAnchor = 'top';
            } else {
              // Not enough space in either direction, choose the one with more space
              finalAnchor = spaceAbove > spaceBelow ? 'bottom' : 'top';
            }

            // Update anchor class
            popupContainer.classList.remove('mapboxgl-popup-anchor-top', 'mapboxgl-popup-anchor-bottom',
              'mapboxgl-popup-anchor-left', 'mapboxgl-popup-anchor-right',
              'mapboxgl-popup-anchor-center');
            popupContainer.classList.add(`mapboxgl-popup-anchor-${finalAnchor}`);

            // Calculate horizontal offset to keep popup within bounds
            const centeredLeft = point.x - (popupWidth / 2);
            const centeredRight = point.x + (popupWidth / 2);
            let horizontalOffset = 0;

            if (centeredLeft < margin) {
              horizontalOffset = margin - centeredLeft;
            } else if (centeredRight > containerRect.width - margin) {
              horizontalOffset = (containerRect.width - margin) - centeredRight;
            }

            // Calculate where popup should be (in container-relative coordinates)
            let desiredX = point.x + horizontalOffset - (popupWidth / 2);
            let desiredY;

            if (finalAnchor === 'bottom') {
              // Popup above pin
              desiredY = point.y - popupHeight - offsetDistance;
              // Clamp to ensure it stays within container
              if (desiredY < margin) {
                desiredY = margin;
              }
            } else {
              // Popup below pin
              desiredY = point.y + offsetDistance;
              // Clamp to ensure it stays within container
              if (desiredY + popupHeight > containerRect.height - margin) {
                desiredY = containerRect.height - popupHeight - margin;
              }
            }

            // Clamp horizontal position
            desiredX = Math.max(margin, Math.min(desiredX, containerRect.width - popupWidth - margin));

            // Get current popup position in container coordinates
            // Mapbox positions popup container using transform, so we need to get its position
            const popupContainerRect = popupContainer.getBoundingClientRect();
            const containerScreenRect = container.getBoundingClientRect();

            // Convert current popup position to container-relative coordinates
            const currentX = popupContainerRect.left - containerScreenRect.left;
            const currentY = popupContainerRect.top - containerScreenRect.top;

            // Calculate adjustment needed (difference between desired and current)
            const adjustX = desiredX - currentX;
            const adjustY = desiredY - currentY;

            // Get current transform to preserve Mapbox's positioning
            const currentTransform = window.getComputedStyle(popupContainer).transform;
            let baseX = 0, baseY = 0;

            if (currentTransform && currentTransform !== 'none') {
              try {
                const matrix = new DOMMatrix(currentTransform);
                baseX = matrix.e;
                baseY = matrix.f;
              } catch (e) {
                // If parsing fails, use 0,0 as base
              }
            }

            // Apply adjustment via transform (additive to Mapbox's transform)
            popupContainer.style.transform = `translate(${baseX + adjustX}px, ${baseY + adjustY}px)`;
          };

          // Adjust position after Mapbox has positioned it
          setTimeout(() => {
            requestAnimationFrame(() => {
              requestAnimationFrame(adjustPopupPosition);
            });
          }, 100);

          // Also adjust position when map moves/zooms/resizes
          const handleMapMove = () => {
            if (popup.isOpen()) {
              setTimeout(() => {
                requestAnimationFrame(adjustPopupPosition);
              }, 100);
            }
          };

          map.current.on('move', handleMapMove);
          map.current.on('zoom', handleMapMove);
          map.current.on('resize', handleMapMove);

          // Cleanup on close
          popup.on('close', () => {
            map.current.off('move', handleMapMove);
            map.current.off('zoom', handleMapMove);
            map.current.off('resize', handleMapMove);
          });
          // Handle close button
          const closeBtn = popupElement.querySelector('.popup-card-close-btn');
          if (closeBtn) {
            closeBtn.addEventListener('click', (e) => {
              e.preventDefault();
              e.stopPropagation();
              marker.getPopup().remove();
              lastOpenedPopupRef.current = null;
              setSelectedProperty(null);
            });
          }

          // Check and set favorite status
          const heartBtn = popupElement.querySelector('.popup-card-heart-btn');
          if (heartBtn) {
            const isFavorited = await checkFavoriteStatus(property.id);
            const svg = heartBtn.querySelector('svg');
            if (svg) {
              if (isFavorited) {
                svg.setAttribute('fill', 'red');
                svg.setAttribute('stroke', 'red');
                heartBtn.classList.add('active');
              } else {
                svg.setAttribute('fill', 'none');
                svg.setAttribute('stroke', 'white');
                heartBtn.classList.remove('active');
              }
            }

            // Handle heart button click (favorite)
            heartBtn.addEventListener('click', (e) => {
              e.preventDefault();
              e.stopPropagation();
              handleFavoriteClick(property.id, heartBtn);
            });
          }

          // Handle share button
          const shareBtn = popupElement.querySelector('.popup-card-share-btn');
          if (shareBtn) {
            shareBtn.addEventListener('click', (e) => {
              e.preventDefault();
              e.stopPropagation();
              handleShareClick(property);
            });
          }

          // Handle pagination and arrows
          const paginationDots = popupElement.querySelectorAll('.pagination-dot');
          const prevArrow = popupElement.querySelector('.popup-card-arrow-prev');
          const nextArrow = popupElement.querySelector('.popup-card-arrow-next');
          let internalImageIndex = 0;

          const updatePopupImage = (newIndex) => {
            if (newIndex < 0) newIndex = totalImages - 1;
            if (newIndex >= totalImages) newIndex = 0;

            internalImageIndex = newIndex;
            const track = popupElement.querySelector('.popup-card-carousel-track');
            if (track) {
              track.style.transform = `translateX(-${newIndex * 100}%)`;
            }

            paginationDots.forEach((d, i) => {
              if (i === newIndex) d.classList.add('active');
              else d.classList.remove('active');
            });
          };

          if (prevArrow) {
            prevArrow.addEventListener('click', (e) => {
              e.preventDefault(); e.stopPropagation();
              updatePopupImage(internalImageIndex - 1);
            });
          }

          if (nextArrow) {
            nextArrow.addEventListener('click', (e) => {
              e.preventDefault(); e.stopPropagation();
              updatePopupImage(internalImageIndex + 1);
            });
          }

          paginationDots.forEach((dot, index) => {
            dot.addEventListener('click', (e) => {
              e.preventDefault(); e.stopPropagation();
              updatePopupImage(index);
            });
          });

          // Touch/swipe carousel support
          const imageContainer = popupElement.querySelector('.popup-card-image-container');
          if (imageContainer && totalImages > 1) {
            let touchStartX = 0;
            imageContainer.addEventListener('touchstart', (e) => {
              touchStartX = e.touches[0].clientX;
            }, { passive: true });
            imageContainer.addEventListener('touchend', (e) => {
              const touchEndX = e.changedTouches[0].clientX;
              const deltaX = touchStartX - touchEndX;
              if (Math.abs(deltaX) > 40) {
                e.preventDefault();
                updatePopupImage(deltaX > 0 ? internalImageIndex + 1 : internalImageIndex - 1);
              }
            }, { passive: false });
          }

          // Handle "View Details" click
          const detailsLink = popupElement.querySelector('.popup-card-details-link');
          if (detailsLink) {
            detailsLink.addEventListener('click', (e) => {
              e.preventDefault(); e.stopPropagation();
              navigateToProperty(property.id);
            });
          }
        }, 100);
      });

      // Backup method - attach listeners when popup is added to DOM
      const attachButtonListeners = async () => {
        const popupElement = popup.getElement();
        if (!popupElement) return;

        // Close button
        const closeBtn = popupElement.querySelector('.popup-card-close-btn');
        if (closeBtn && !closeBtn.hasAttribute('data-listener-attached')) {
          closeBtn.setAttribute('data-listener-attached', 'true');
          closeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            marker.getPopup().remove();
            lastOpenedPopupRef.current = null;
            setSelectedProperty(null);
          });
        }

        // Heart button
        const heartBtn = popupElement.querySelector('.popup-card-heart-btn');
        if (heartBtn && !heartBtn.hasAttribute('data-listener-attached')) {
          heartBtn.setAttribute('data-listener-attached', 'true');

          // Check and set favorite status
          const isFavorited = await checkFavoriteStatus(property.id);
          const svg = heartBtn.querySelector('svg');
          if (svg) {
            if (isFavorited) {
              svg.setAttribute('fill', 'red');
              svg.setAttribute('stroke', 'red');
              heartBtn.classList.add('active');
            } else {
              svg.setAttribute('fill', 'none');
              svg.setAttribute('stroke', 'white');
              heartBtn.classList.remove('active');
            }
          }

          heartBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            handleFavoriteClick(property.id, heartBtn);
          });
        }

        // Share button
        const shareBtn = popupElement.querySelector('.popup-card-share-btn');
        if (shareBtn && !shareBtn.hasAttribute('data-listener-attached')) {
          shareBtn.setAttribute('data-listener-attached', 'true');
          shareBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            handleShareClick(property);
          });
        }

        // Make entire popup card clickable (except action buttons)
        const popupCard = popupElement.querySelector('.property-popup-card');
        if (popupCard && !popupCard.hasAttribute('data-listener-attached')) {
          popupCard.setAttribute('data-listener-attached', 'true');
          popupCard.addEventListener('click', (e) => {
            // Don't navigate if clicking on action buttons (heart, share, close), carousel arrows, or pagination dots
            const clickedElement = e.target.closest('.popup-card-heart-btn, .popup-card-share-btn, .popup-card-close-btn, .popup-card-action-buttons, .popup-card-pagination, .pagination-dot, .popup-card-arrow');
            if (!clickedElement) {
              e.preventDefault();
              e.stopPropagation();
              navigateToProperty(property.id);
            }
          });
        }
      };

      // Try multiple times to ensure buttons are in DOM
      popup.on('open', () => {
        attachButtonListeners();
        setTimeout(attachButtonListeners, 50);
        setTimeout(attachButtonListeners, 150);
      });

      // Track popup close
      popup.on('close', () => {
        if (lastOpenedPopupRef.current === property.id) {
          lastOpenedPopupRef.current = null;
          setSelectedProperty(null);
        }
      });

      markersRef.current.push(marker);
      markersMapRef.current.set(property.id, marker);
      console.log('✅ MapView: Marker created successfully for property:', property.id, property.title);
    });

    // Open popup only when user clicked a marker. Do NOT auto-open on details page
    // (Mapbox Popup scrolls the window when opening, which would pull the page down to the map).
    const openCurrentPopup = () => {
      if (!currentPropertyId) return;
      const markerToOpen = markersMapRef.current.get(currentPropertyId);
      if (!markerToOpen || markerToOpen.getPopup().isOpen()) return;
      const fromMapClick = lastSelectionFromMapRef.current === true;
      if (fromMapClick) {
        markerToOpen.togglePopup();
      }
    };

    // Delay slightly to ensure markers are added to map
    setTimeout(openCurrentPopup, 50);

    console.log('🗺️ MapView: Total markers created:', markersRef.current.length);
  }, [properties, mapLoaded, onPropertyClick, currentPropertyId, navigateToProperty, applyMarkerOffset, formatPrice, checkFavoriteStatus, handleFavoriteClick, handleShareClick, variant]);

  // Expose map instance for external use
  const getMap = useCallback(() => map.current, []);

  return (
    <div
      ref={fullscreenWrapperRef}
      className={`map-view-fullscreen-wrapper ${isFullscreen ? 'fullscreen-active' : ''}`}
    >
      <div className="map-view-fullscreen-search">
        {fullscreenSearchBar}
      </div>
      <div className="map-wrapper">
        <div ref={mapContainer} className="map-container" />
        {!mapLoaded && (
          <div className="map-loading">
            <div className="loading-spinner"></div>
            <p>Loading map...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MapView;
