import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FaAngleLeft, FaAngleRight, FaTimes, FaUser, FaComments, FaBed, FaCalendarAlt, FaRulerCombined } from 'react-icons/fa';
import '../styles/UpcomingProjectViewDetails.css';
import '../styles/ViewDetailPage.css';
import { propertiesAPI, buyerInteractionsAPI } from '../../services/api.service';
import { useAuth } from '../../context/AuthContext';
import { FavoritesManager } from '../components/PropertyCard';
import MapView from '../../components/Map/MapView';

const MAPBOX_TOKEN =
    process.env.REACT_APP_MAPBOX_ACCESS_TOKEN ||
    'pk.eyJ1Ijoic3VkaGFrYXJwb3VsIiwiYSI6ImNtaXp0ZmFrNTAxaTQzZHNiODNrYndsdTAifQ.YTMezksySLU7ZpcYkvXyqg';

// Amenities with icons matching AddPropertyPopup
const AMENITIES_WITH_ICONS = [
    { id: "parking", label: "Parking", icon: "🚗" },
    { id: "lift", label: "Lift", icon: "🛗" },
    { id: "security", label: "24x7 Security", icon: "👮" },
    { id: "24/7 Security", label: "24/7 Security", icon: "👮" },
    { id: "power_backup", label: "Power Backup", icon: "⚡" },
    { id: "gym", label: "Gym", icon: "🏋️" },
    { id: "Gymnasium", label: "Gymnasium", icon: "🏋️" },
    { id: "swimming_pool", label: "Swimming Pool", icon: "🏊" },
    { id: "garden", label: "Garden", icon: "🌳" },
    { id: "clubhouse", label: "Club House", icon: "🏛️" },
    { id: "Clubhouse", label: "Clubhouse", icon: "🏛️" },
    { id: "playground", label: "Children's Play Area", icon: "🎢" },
    { id: "Children's Play Area", label: "Children's Play Area", icon: "🎢" },
    { id: "cctv", label: "CCTV", icon: "📹" },
    { id: "intercom", label: "Intercom", icon: "📞" },
    { id: "fire_safety", label: "Fire Safety", icon: "🔥" },
    { id: "water_supply", label: "24x7 Water", icon: "💧" },
    { id: "gas_pipeline", label: "Gas Pipeline", icon: "🔥" },
    { id: "wifi", label: "WiFi", icon: "📶" },
    { id: "ac", label: "Air Conditioning", icon: "❄️" },
    { id: "Covered Parking", label: "Covered Parking", icon: "🚗" }
];

// Helper function to get icon for amenity
const getAmenityIcon = (amenityName) => {
    if (!amenityName) return "✓";

    const amenity = AMENITIES_WITH_ICONS.find(
        a => a.label.toLowerCase() === amenityName.toLowerCase() ||
            a.id.toLowerCase() === amenityName.toLowerCase().replace(/\s+/g, '_')
    );

    return amenity ? amenity.icon : "✓";
};

// Helper function to capitalize amenity names
const capitalizeAmenity = (amenityName) => {
    if (!amenityName) return "";

    // First try to find a matching amenity in our list to get the proper label
    const amenity = AMENITIES_WITH_ICONS.find(
        a => a.label.toLowerCase() === amenityName.toLowerCase() ||
            a.id.toLowerCase() === amenityName.toLowerCase().replace(/\s+/g, '_') ||
            a.label.toLowerCase() === amenityName.toLowerCase().replace(/\s+/g, ' ')
    );

    // If we found a match, use its label (which has proper capitalization)
    if (amenity) {
        return amenity.label;
    }

    // Otherwise, capitalize first letter of each word
    return amenityName
        .split(/\s+/)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
};

// Helper function to format price in Crores
const formatPriceRange = (price) => {
    if (!price) return '0';
    const priceInCr = price / 10000000;
    return priceInCr.toFixed(1);
};

// Helper function to format BHK types from configurations
const formatBhkType = (configurations) => {
    if (!configurations || !Array.isArray(configurations) || configurations.length === 0) {
        return null;
    }
    const bhkConfigs = configurations
        .filter(config => config && (config.includes('BHK') || config.includes('bhk')))
        .map(config => {
            const match = config.match(/(\d+)\s*BHK/i);
            return match ? `${match[1]} BHK` : config;
        })
        .filter((value, index, self) => self.indexOf(value) === index)
        .sort((a, b) => {
            const numA = parseInt(a.match(/\d+/)?.[0] || '0');
            const numB = parseInt(b.match(/\d+/)?.[0] || '0');
            return numA - numB;
        });

    if (bhkConfigs.length === 0) {
        if (configurations.some(c => c.toLowerCase().includes('villa'))) return 'Villa';
        if (configurations.some(c => c.toLowerCase().includes('plot'))) return 'Plot';
        return configurations.join(', ');
    }

    return bhkConfigs.join(', ');
};

// Image Slider Modal Component
const ImageSliderModal = ({ images, currentIndex, onClose, onNext, onPrev }) => {
    const isOpen = currentIndex !== null;

    if (!images || images.length === 0) return null;

    const currentImage = isOpen ? images[currentIndex] : null;
    const showControls = images.length > 1;

    return (
        <div className={`upcoming-image-slider-modal-overlay ${isOpen ? 'open' : ''}`}>
            {currentImage && (
                <div className="upcoming-image-slider-modal-content">
                    <button className="upcoming-slider-close-btn" onClick={onClose} aria-label="Close Slider">
                        <FaTimes />
                    </button>

                    <div className="upcoming-slider-controls">
                        {showControls && (
                            <button className="upcoming-slider-prev-btn" onClick={onPrev} aria-label="Previous Image">
                                <FaAngleLeft />
                            </button>
                        )}

                        <img
                            src={currentImage.url}
                            alt={currentImage.alt}
                            className="upcoming-slider-main-image"
                        />

                        {showControls && (
                            <button className="upcoming-slider-next-btn" onClick={onNext} aria-label="Next Image">
                                <FaAngleRight />
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

// Map feature: resolve coords from project or geocode location, then render MapView
const UpcomingProjectMapFeature = ({ project }) => {
    const [resolvedCoords, setResolvedCoords] = useState(null);

    const parseCoordinate = (coord) => {
        if (coord === null || coord === undefined || coord === '') return null;
        const parsed = typeof coord === 'string' ? parseFloat(coord) : coord;
        return isNaN(parsed) ? null : parsed;
    };

    const isValidCoordinate = (lat, lng) => {
        if (lat === null || lng === null) return false;
        return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
    };

    useEffect(() => {
        if (!project) {
            setResolvedCoords(null);
            return;
        }
        const lat = parseCoordinate(project.latitude);
        const lng = parseCoordinate(project.longitude);
        if (isValidCoordinate(lat, lng)) {
            setResolvedCoords({ lat, lng });
            return;
        }
        const locationText = project.location || project.fullAddress;
        if (!locationText || !MAPBOX_TOKEN) {
            setResolvedCoords(null);
            return;
        }
        let isCancelled = false;
        const geocodeLocation = async () => {
            try {
                const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
                    locationText
                )}.json?access_token=${MAPBOX_TOKEN}&country=in&limit=1`;
                const response = await fetch(url);
                if (!response.ok) return;
                const data = await response.json();
                const feature = data.features && data.features[0];
                if (!feature || !Array.isArray(feature.center) || feature.center.length < 2) return;
                const [lngVal, latVal] = feature.center;
                if (isCancelled) return;
                setResolvedCoords(isValidCoordinate(latVal, lngVal) ? { lat: latVal, lng: lngVal } : null);
            } catch (err) {
                if (!isCancelled) {
                    console.error('Error geocoding upcoming project location:', err);
                    setResolvedCoords(null);
                }
            }
        };
        geocodeLocation();
        return () => { isCancelled = true; };
    }, [project]);

    const latitude = resolvedCoords?.lat ?? null;
    const longitude = resolvedCoords?.lng ?? null;
    const hasValidCoordinates = isValidCoordinate(latitude, longitude);

    const mapProperties = project && hasValidCoordinates
        ? [{
            id: project.id,
            title: project.title,
            location: project.location,
            latitude,
            longitude,
            thumbnail: project.images?.[0]?.url ?? null,
            images: project.images,
            cover_image: project.images?.[0]?.url ?? null,
            seller_id: project.seller_id,
            priceRange: project.priceRange,
            isUpcomingProject: true
        }]
        : [];

    const mapCenter = hasValidCoordinates
        ? [longitude, latitude]
        : [78.9629, 20.5937];
    const mapZoom = hasValidCoordinates ? 14 : 5;

    return (
        <div className="map-card-container">
            <h3>Project Location</h3>
            <div className="map-embed-area" aria-label={`Map for ${project?.location || 'Project'}`}>
                {project && hasValidCoordinates ? (
                    <MapView
                        properties={mapProperties}
                        center={mapCenter}
                        zoom={mapZoom}
                        showControls={true}
                        interactive={true}
                        currentPropertyId={project.id}
                        variant="details"
                    />
                ) : (
                    <p className="map-placeholder-text">
                        Location for <strong>{project?.location || project?.fullAddress || 'this project'}</strong>
                        {project?.mapLink && (
                            <> — <a href={project.mapLink} target="_blank" rel="noopener noreferrer" style={{ color: '#0066cc', textDecoration: 'underline' }}>View on Map</a></>
                        )}
                    </p>
                )}
            </div>
        </div>
    );
};

const UpcomingProjectViewDetails = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const projectId = parseInt(id, 10);
    const { user } = useAuth();

    const [project, setProject] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [currentImageIndex, setCurrentImageIndex] = useState(null);
    const [showToast, setShowToast] = useState(false);
    const [showSalesDetails, setShowSalesDetails] = useState(false);

    // Favorite State
    const [isFavorited, setIsFavorited] = useState(false);

    // Property-based interaction tracking - tracks which projects have been interacted with
    // Load from localStorage to persist across page reloads
    const [interactedProperties, setInteractedProperties] = useState(() => {
        try {
            const stored = localStorage.getItem('buyer_interacted_properties');
            if (stored) {
                const parsed = JSON.parse(stored);
                return new Set(parsed.map(String)); // Convert to strings for consistency
            }
        } catch (error) {
            console.error('Error loading interacted properties from localStorage:', error);
        }
        return new Set();
    });

    // Combined Interaction Limits State (shared quota for both view_owner and chat_owner)
    const [combinedInteractionLimit, setCombinedInteractionLimit] = useState({
        remaining: 5,
        max: 5,
        used: 0,
        canPerform: true,
        resetTime: null,
        resetTimeSeconds: null
    });
    const [loadingLimits, setLoadingLimits] = useState(false);

    // Fetch project details
    useEffect(() => {
        const fetchProject = async () => {
            try {
                setLoading(true);
                const response = await propertiesAPI.getDetails(projectId);

                if (response.success && response.data && response.data.property) {
                    const prop = response.data.property;

                    // Parse upcoming_project_data
                    let upcomingData = {};
                    try {
                        if (typeof prop.upcoming_project_data === 'string') {
                            upcomingData = JSON.parse(prop.upcoming_project_data);
                        } else if (typeof prop.upcoming_project_data === 'object') {
                            upcomingData = prop.upcoming_project_data;
                        }
                    } catch (e) {
                        console.warn('Failed to parse upcoming_project_data:', e);
                    }

                    // Get images
                    let images = [];
                    if (Array.isArray(prop.images) && prop.images.length > 0) {
                        images = prop.images.map((img, idx) => ({
                            id: idx + 1,
                            url: img,
                            alt: prop.title
                        }));
                    } else if (prop.cover_image) {
                        images = [{ id: 1, url: prop.cover_image, alt: prop.title }];
                    }

                    if (images.length === 0) {
                        images = [{ id: 1, url: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=500', alt: prop.title }];
                    }

                    const bhkType = formatBhkType(upcomingData.configurations);
                    const priceRange = formatPriceRange(prop.price);

                    const formattedProject = {
                        id: prop.id,
                        title: prop.title,
                        location: prop.location,
                        priceRange: priceRange,
                        bhkType: bhkType,
                        builder: upcomingData.builderName || prop.seller_name || 'Builder',
                        builderLink: upcomingData.builderLink || `#builder-${prop.id}`,
                        description: prop.description || '',
                        configurations: upcomingData.configurations || [],
                        amenities: Array.isArray(prop.amenities) ? prop.amenities : (prop.amenities ? prop.amenities.split(',') : []),
                        images: images,
                        latitude: prop.latitude,
                        longitude: prop.longitude,
                        seller_id: prop.seller_id || prop.user_id || null,
                        user_id: prop.user_id || prop.seller_id || null,
                        seller_name: prop.seller_name || 'Builder',
                        seller_email: prop.seller_email || '',
                        seller_phone: prop.seller_phone || '',
                        upcomingData: upcomingData,
                        // Basic Details
                        projectType: prop.property_type || upcomingData.projectType || '',
                        projectStatus: upcomingData.projectStatus || 'UNDER CONSTRUCTION',
                        reraNumber: upcomingData.reraNumber || null,
                        // Location Details
                        city: upcomingData.city || prop.city || null,
                        area: upcomingData.area || null,
                        fullAddress: prop.additional_address || upcomingData.fullAddress || null,
                        state: prop.state || upcomingData.state || null,
                        pincode: upcomingData.pincode || null,
                        mapLink: upcomingData.mapLink || null,
                        // Configuration & Inventory
                        carpetAreaRange: upcomingData.carpetAreaRange || null,
                        numberOfTowers: upcomingData.numberOfTowers || null,
                        totalUnits: upcomingData.totalUnits || null,
                        floorsCount: upcomingData.floorsCount || null,
                        // Pricing & Timeline
                        startingPrice: upcomingData.startingPrice || null,
                        pricePerSqft: upcomingData.pricePerSqft || null,
                        bookingAmount: upcomingData.bookingAmount || null,
                        expectedLaunchDate: upcomingData.expectedLaunchDate || null,
                        expectedPossessionDate: upcomingData.expectedPossessionDate || null,
                        // Legal & Approval
                        reraStatus: upcomingData.reraStatus || null,
                        landOwnershipType: upcomingData.landOwnershipType || null,
                        bankApproved: upcomingData.bankApproved || null,
                        approvedBanks: upcomingData.approvedBanks || [],
                        // Sales Contact (for Show Details)
                        salesName: upcomingData.salesName || null,
                        salesNumber: upcomingData.salesNumber || null,
                        emailId: upcomingData.emailId || null,
                        mobileNumber: upcomingData.mobileNumber || null,
                        whatsappNumber: upcomingData.whatsappNumber || null,
                        alternativeNumber: upcomingData.alternativeNumber || null,
                        // Marketing
                        projectHighlights: upcomingData.projectHighlights || null,
                        usp: upcomingData.usp || null,
                        // Media
                        brochure: prop.brochure_url || upcomingData.brochure || null
                    };

                    setProject(formattedProject);
                } else {
                    setError('Project not found');
                }
            } catch (err) {
                console.error('Error fetching project:', err);
                setError(err.message || 'Failed to load project details');
            } finally {
                setLoading(false);
            }
        };

        if (projectId) {
            fetchProject();
        } else {
            setError('Invalid project ID');
            setLoading(false);
        }
    }, [projectId]);

    // Scroll to top when viewing a project. Run when content loads and again
    // after a short delay to override any scroll caused by the map initializing.
    useEffect(() => {
        if (projectId && !loading) {
            window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
            const t = setTimeout(() => {
                window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
            }, 350);
            return () => clearTimeout(t);
        }
    }, [projectId, loading]);

    // Check favorite status on mount and when project changes
    useEffect(() => {
        const checkFavoriteStatus = async () => {
            if (!projectId) return;

            try {
                // Check local storage first for quick display
                const localFavorite = FavoritesManager.isFavorite(projectId);
                setIsFavorited(localFavorite);

                // Then verify with API if user is authenticated
                const token = localStorage.getItem('authToken');
                if (token && user) {
                    const { favoritesAPI } = await import('../../services/api.service');
                    const response = await favoritesAPI.list();
                    if (response.success && response.data) {
                        // API returns properties array (not favorites array)
                        const properties = response.data.properties || response.data.favorites || [];
                        const favoriteIds = properties.map(p => p.id || p.property_id);
                        setIsFavorited(favoriteIds.includes(projectId));
                    }
                }
            } catch (error) {
                console.error('Error checking favorite status:', error);
                // Fallback to local storage
                setIsFavorited(FavoritesManager.isFavorite(projectId));
            }
        };

        checkFavoriteStatus();
    }, [projectId, user]);

    const imageCount = project?.images?.length || 0;

    const openSlider = useCallback((index) => {
        if (imageCount > 0) {
            setCurrentImageIndex(index);
        }
    }, [imageCount]);

    const closeSlider = useCallback(() => {
        setCurrentImageIndex(null);
    }, []);

    const nextImage = useCallback(() => {
        if (imageCount === 0) return;
        setCurrentImageIndex((prevIndex) =>
            (prevIndex + 1) % imageCount
        );
    }, [imageCount]);

    const prevImage = useCallback(() => {
        if (imageCount === 0) return;
        setCurrentImageIndex((prevIndex) =>
            (prevIndex - 1 + imageCount) % imageCount
        );
    }, [imageCount]);

    const handleBack = useCallback(() => {
        window.history.back();
    }, []);

    // Handle favorite button click
    const handleFavoriteClick = async (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (!user) {
            alert('Please login to add properties to favorites');
            navigate('/login');
            return;
        }

        try {
            // Import favoritesAPI dynamically to avoid circular dependencies
            const { favoritesAPI } = await import('../../services/api.service');
            const response = await favoritesAPI.toggle(projectId);

            if (response.success) {
                setIsFavorited(response.data.is_favorite !== undefined ? response.data.is_favorite : !isFavorited);
                // Also update local storage for offline support
                FavoritesManager.toggleFavorite(projectId);
            } else {
                console.error('Failed to toggle favorite:', response.message);
                alert(response.message || 'Failed to update favorite');
            }
        } catch (error) {
            console.error('Error toggling favorite:', error);
            // Fallback to local storage if API fails
            FavoritesManager.toggleFavorite(projectId);
            setIsFavorited(!isFavorited);
        }
    };

    const copyToClipboard = async (text) => {
        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(text);
                setShowToast(true);
                setTimeout(() => setShowToast(false), 2000);
                return;
            }

            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();

            try {
                const successful = document.execCommand('copy');
                if (successful) {
                    setShowToast(true);
                    setTimeout(() => setShowToast(false), 2000);
                }
            } finally {
                document.body.removeChild(textArea);
            }
        } catch (error) {
            console.error('Failed to copy to clipboard:', error);
        }
    };

    const handleShareClick = async () => {
        if (!project) return;

        const shareUrl = `${window.location.origin}/upcoming-project/${project.id}`;
        const shareData = {
            title: project.title || 'Upcoming Project',
            text: `Check out this upcoming project: ${project.title}`,
            url: shareUrl
        };

        if (navigator.share) {
            try {
                await navigator.share(shareData);
            } catch (error) {
                if (error.name !== 'AbortError') {
                    await copyToClipboard(shareUrl);
                }
            }
        } else {
            await copyToClipboard(shareUrl);
        }
    };

    // Fetch combined interaction limits (shared quota for both view_owner and chat_owner)
    const fetchInteractionLimits = useCallback(async () => {
        if (!user || user.user_type !== 'buyer' || !projectId) return;

        try {
            setLoadingLimits(true);
            // Since both actions share the same quota, we only need to check once
            const response = await buyerInteractionsAPI.checkLimit(projectId, 'view_owner');

            if (response.success) {
                setCombinedInteractionLimit({
                    remaining: response.data.remaining_attempts,
                    max: response.data.max_attempts,
                    used: response.data.used_attempts,
                    canPerform: response.data.can_perform_action,
                    resetTime: response.data.reset_time,
                    resetTimeSeconds: response.data.reset_time_seconds
                });
            }
        } catch (error) {
            console.error('Error fetching interaction limits:', error);
            // Don't block user if limit check fails - allow action but log error
        } finally {
            setLoadingLimits(false);
        }
    }, [user, projectId]);

    // Fetch interaction limits when project and user are available
    useEffect(() => {
        if (project && user && user.user_type === 'buyer') {
            fetchInteractionLimits();
        }
    }, [project, user, fetchInteractionLimits]);

    // Auto-show sales details if project has already been interacted with
    useEffect(() => {
        if (projectId && interactedProperties.has(String(projectId)) && !showSalesDetails) {
            setShowSalesDetails(true);
        }
    }, [projectId, interactedProperties, showSalesDetails]);

    // Shared property-based interaction handler
    // This ensures only ONE interaction is recorded per project, regardless of which button is clicked
    const handlePropertyInteraction = useCallback(async (actionType, onSuccess) => {
        if (!user || user.user_type !== 'buyer' || !projectId) {
            return false;
        }

        // Check if this project has already been interacted with (convert to string for consistency)
        if (interactedProperties.has(String(projectId))) {
            // Project already interacted with - allow action without deducting count
            if (onSuccess) {
                onSuccess();
            }
            return true;
        }

        // Check if combined limit is reached
        if (!combinedInteractionLimit.canPerform) {
            alert('Daily interaction limit reached. Try again after 12 hours.');
            return false;
        }

        try {
            // Record the interaction (only once per project)
            const response = await buyerInteractionsAPI.recordInteraction(projectId, actionType);

            if (response.success) {
                // Mark this project as interacted with (persist to localStorage)
                setInteractedProperties(prev => {
                    const updated = new Set([...prev, String(projectId)]);
                    try {
                        localStorage.setItem('buyer_interacted_properties', JSON.stringify([...updated]));
                    } catch (error) {
                        console.error('Error saving interacted properties to localStorage:', error);
                    }
                    return updated;
                });

                // Update combined limit state
                setCombinedInteractionLimit({
                    remaining: response.data.remaining_attempts,
                    max: response.data.max_attempts,
                    used: response.data.used_attempts,
                    canPerform: response.data.remaining_attempts > 0,
                    resetTime: response.data.reset_time,
                    resetTimeSeconds: response.data.reset_time_seconds
                });

                // Execute success callback
                if (onSuccess) {
                    onSuccess();
                }
                return true;
            } else {
                console.error('Failed to record interaction:', response);
                alert(response.message || 'Failed to record interaction');
                return false;
            }
        } catch (error) {
            console.error('Error recording interaction:', error);

            // Check if it's a rate limit error
            if (error.status === 429 && error.data) {
                setCombinedInteractionLimit({
                    remaining: error.data.remaining_attempts || 0,
                    max: error.data.max_attempts || 5,
                    used: error.data.used_attempts || 5,
                    canPerform: false,
                    resetTime: error.data.reset_time,
                    resetTimeSeconds: error.data.reset_time_seconds
                });
                alert(error.data.message || 'Daily interaction limit reached. Try again after 12 hours.');
            } else {
                const errorMsg = error.message || error.data?.message || 'Failed to record interaction. Please try again.';
                console.error('Full error details:', error);
                alert(errorMsg);
            }
            return false;
        }
    }, [user, projectId, interactedProperties, combinedInteractionLimit]);

    // Handler for Show Details button - reveals sales contact info only
    // Uses property-based interaction tracking - only deducts once per project
    const handleShowDetails = useCallback(async (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (!user) {
            alert('Please login to view details');
            // Redirect to login with return URL to come back to this project page
            const returnUrl = projectId ? `/upcoming-project/${projectId}` : '/';
            navigate(`/login?returnUrl=${encodeURIComponent(returnUrl)}`);
            return;
        }

        if (user.user_type !== 'buyer') {
            alert('Only buyers can view details');
            return;
        }

        // If already showing, do nothing (no toggle - stays visible)
        if (showSalesDetails) {
            return;
        }

        // Use shared property-based interaction handler
        await handlePropertyInteraction('view_owner', () => {
            // Show sales details display (only called if interaction succeeds or already interacted)
            setShowSalesDetails(true);
        });
    }, [user, projectId, showSalesDetails, navigate, handlePropertyInteraction]);

    // Handler for Chat with Builder button
    // Uses property-based interaction tracking - only deducts once per project
    const handleChatWithBuilder = useCallback(async () => {
        if (!user) {
            alert('Please login to chat with the builder');
            // Redirect to login with return URL to come back to this project page
            const returnUrl = projectId ? `/upcoming-project/${projectId}` : '/';
            navigate(`/login?returnUrl=${encodeURIComponent(returnUrl)}`);
            return;
        }

        if (user.user_type !== 'buyer') {
            alert('Only buyers can chat with builders');
            return;
        }

        if (!project) {
            alert('Project information not available');
            return;
        }

        // Get builder ID from project (seller_id or user_id)
        const receiverId = project.seller_id || project.user_id;

        if (!receiverId) {
            alert('Builder information not available');
            return;
        }

        // Check if user is trying to chat with themselves
        if (Number(user.id) === Number(receiverId)) {
            alert('You cannot chat with yourself. This is your project.');
            return;
        }

        // Use shared property-based interaction handler
        const success = await handlePropertyInteraction('chat_owner', async () => {
            // Do NOT create chat room here - it will be created when first message is sent
            // Generate chat room ID deterministically for navigation purposes only
            const { generateChatRoomId } = await import('../../services/firebase.service');
            const firebaseChatRoomId = generateChatRoomId(
                user.id,
                receiverId,
                projectId
            );

            // Get builder name from project
            const builderName = project.builder || project.seller_name || 'Builder';

            // Navigate to chat page with chat room ID and builder name for immediate display
            // The builder name is passed via URL so ChatUs can display it immediately
            // Chat room will be created when first message is sent
            const encodedBuilderName = encodeURIComponent(builderName);
            navigate(`/ChatUs?chatId=${firebaseChatRoomId}&ownerName=${encodedBuilderName}&propertyId=${projectId}`);
        });

        if (!success) {
            // Error already handled in handlePropertyInteraction
            return;
        }
    }, [user, project, projectId, navigate, handlePropertyInteraction]);

    useEffect(() => {
        const handleKeyPress = (e) => {
            if (currentImageIndex === null) return;

            if (e.key === 'Escape') {
                closeSlider();
            } else if (e.key === 'ArrowLeft') {
                prevImage();
            } else if (e.key === 'ArrowRight') {
                nextImage();
            }
        };

        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [currentImageIndex, closeSlider, nextImage, prevImage]);

    if (loading) {
        return (
            <div className="upcoming-details-wrapper">
                <div style={{ padding: '2rem', textAlign: 'center' }}>
                    <p>Loading project details...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="upcoming-details-wrapper">
                <div style={{ padding: '2rem', textAlign: 'center' }}>
                    <p style={{ color: '#c33', marginBottom: '1rem' }}>Error: {error}</p>
                    <button onClick={handleBack} style={{ padding: '0.5rem 1rem', cursor: 'pointer' }}>
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

    if (!project) {
        return (
            <div className="upcoming-details-wrapper">
                <div style={{ padding: '2rem', textAlign: 'center' }}>
                    <p style={{ color: '#c33', marginBottom: '1rem' }}>Project not found</p>
                    <button onClick={handleBack} style={{ padding: '0.5rem 1rem', cursor: 'pointer' }}>
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

    const thumbnailImages = project.images.slice(1, 5);
    const remainingCount = project.images.length - 5;

    return (
        <div className="upcoming-details-wrapper">
            <main className="upcoming-view-details-page">
                {/* Title and Location Container */}
                <div className="upcoming-title-location-container">
                    <div className="upcoming-details-container">
                        <div className="upcoming-details-container-actions">
                            <button
                                className={`upcoming-title-favourite-btn ${isFavorited ? 'active' : ''}`}
                                onClick={handleFavoriteClick}
                                aria-label={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
                                title={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="20"
                                    height="20"
                                    viewBox="0 0 24 24"
                                    fill={isFavorited ? 'white' : 'none'}
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                >
                                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                                </svg>
                            </button>
                            <button
                                className="upcoming-share-btn-details"
                                onClick={handleShareClick}
                                aria-label="Share"
                                title="Share"
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="20"
                                    height="20"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                >
                                    <circle cx="18" cy="5" r="3"></circle>
                                    <circle cx="6" cy="12" r="3"></circle>
                                    <circle cx="18" cy="19" r="3"></circle>
                                    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                                    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
                                </svg>
                            </button>
                        </div>

                        <header className="upcoming-project-header">
                            <div className="upcoming-header-top-row">
                                {/* Status Text on Left */}
                                <div className="upcoming-header-status-left">
                                    <span className="upcoming-project-status-text">Upcoming Project</span>
                                </div>

                                {/* Title and Location Centered */}
                                <div className="upcoming-header-center">
                                    <h1>{project.title}</h1>
                                    <div className="upcoming-project-location-row">
                                        <p className="upcoming-project-location">{project.location}</p>
                                    </div>
                                </div>
                            </div>
                        </header>
                    </div>
                </div>

                {/* Image Gallery Container - Separate Container */}
                {/* Image Gallery Container */}
                <div className="upcoming-image-gallery-container">

                    {/* ===== MOBILE SLIDER ===== */}
                    <div className="upcoming-mobile-image-slider">
                        <div className="upcoming-mobile-slider-track">
                            {project.images.map((img, index) => (
                                <div
                                    key={img.id}
                                    className="upcoming-mobile-slide"
                                    onClick={() => openSlider(index)}
                                >
                                    <img src={img.url} alt={img.alt} />
                                </div>
                            ))}
                        </div>

                        <div className="upcoming-mobile-slider-dots">
                            {project.images.map((_, idx) => (
                                <span key={idx} className="dot" />
                            ))}
                        </div>
                    </div>

                    {/* ===== DESKTOP GALLERY ===== */}
                    <div className="upcoming-image-gallery upcoming-desktop-only">
                        <div className="upcoming-main-image" onClick={() => openSlider(0)}>
                            <img
                                src={project.images[0]?.url || ''}
                                alt={project.images[0]?.alt || project.title}
                            />
                        </div>

                        <div className="upcoming-thumbnail-gallery">
                            {thumbnailImages.map((image, index) => (
                                <div
                                    key={image.id}
                                    className="upcoming-thumbnail"
                                    onClick={() => openSlider(index + 1)}
                                >
                                    <img src={image.url} alt={image.alt} />
                                    {index === 3 && remainingCount >= 0 && (
                                        <div className="upcoming-view-more-overlay">
                                            <span>Show all {project.images.length} photos</span>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                </div>

                <div className="upcoming-details-container">
                    <div className="upcoming-main-content-area">
                        {/* Price Display - Top of Main Content */}
                        <div className="upcoming-project-price-section">
                            <h2 className="upcoming-price-section-heading">Price Range</h2>
                            <div className="upcoming-project-price-display">
                                <span className="upcoming-price-amount">₹{project.priceRange} Cr</span>
                            </div>
                        </div>

                        {/* Project Highlights and Contact Card Side by Side */}
                        <div className="upcoming-highlights-contact-wrapper">
                            {/* Project Highlights */}
                            <div className="upcoming-project-highlights">
                                {project.bhkType && (
                                    <div className="upcoming-highlight-item">
                                        <FaBed className="upcoming-highlight-icon" />
                                        <div className="upcoming-highlight-content">
                                            <span className="upcoming-highlight-value">{project.bhkType}</span>
                                            <span className="upcoming-highlight-label">Configuration</span>
                                        </div>
                                    </div>
                                )}
                                <div className="upcoming-highlight-item">
                                    <FaCalendarAlt className="upcoming-highlight-icon" />
                                    <div className="upcoming-highlight-content">
                                        <span className="upcoming-highlight-value">Upcoming</span>
                                        <span className="upcoming-highlight-label">Status</span>
                                    </div>
                                </div>
                                {project.area && (
                                    <div className="upcoming-highlight-item">
                                        <FaRulerCombined className="upcoming-highlight-icon" />
                                        <div className="upcoming-highlight-content">
                                            <span className="upcoming-highlight-value">{project.area}</span>
                                            <span className="upcoming-highlight-label">area</span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Contact Card */}
                            <aside className="upcoming-agent-sidebar">
                                <div className="upcoming-detail-contact-card">
                                    {/* Show Details Button - Only show if sales details are not already visible */}
                                    {project && (
                                        <>
                                            {!showSalesDetails && (
                                                <div style={{ marginBottom: '1rem' }}>
                                                    <button
                                                        type="button"
                                                        onClick={handleShowDetails}
                                                        className="upcoming-contact-send-button"
                                                        disabled={(!interactedProperties.has(String(projectId)) && !combinedInteractionLimit.canPerform) || loadingLimits}
                                                        title={(!interactedProperties.has(String(projectId)) && !combinedInteractionLimit.canPerform) ? 'Daily interaction limit reached. Try again after 12 hours.' : ''}
                                                        style={{
                                                            marginTop: '0',
                                                            marginBottom: '0.5rem',
                                                            opacity: ((!interactedProperties.has(String(projectId)) && !combinedInteractionLimit.canPerform) || loadingLimits) ? 0.6 : 1,
                                                            cursor: ((!interactedProperties.has(String(projectId)) && !combinedInteractionLimit.canPerform) || loadingLimits) ? 'not-allowed' : 'pointer'
                                                        }}
                                                    >
                                                        <FaUser style={{ marginRight: '8px' }} />
                                                        Show Details
                                                    </button>

                                                    {/* Combined Usage Limit Display */}
                                                    {user && user.user_type === 'buyer' && (
                                                        <div style={{
                                                            fontSize: '0.75rem',
                                                            color: combinedInteractionLimit.canPerform ? '#666' : '#ef4444',
                                                            marginTop: '0.25rem',
                                                            padding: '0.25rem 0.5rem',
                                                            backgroundColor: combinedInteractionLimit.canPerform ? '#f3f4f6' : '#fee2e2',
                                                            borderRadius: '4px'
                                                        }}>
                                                            {combinedInteractionLimit.remaining} / {combinedInteractionLimit.max} interactions remaining
                                                            {combinedInteractionLimit.used > 0 && (
                                                                <span style={{ display: 'block', marginTop: '0.125rem', fontSize: '0.7rem' }}>
                                                                    Resets in 12 hours
                                                                </span>
                                                            )}
                                                            {!combinedInteractionLimit.canPerform && (
                                                                <span style={{ display: 'block', marginTop: '0.125rem', fontWeight: 'bold', fontSize: '0.7rem' }}>
                                                                    Daily interaction limit reached. Try again after 12 hours.
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* Sales Details Section - Always visible once shown (no hide toggle) - Shows only sales contact info */}
                                            {showSalesDetails && (
                                                <div className="upcoming-builder-details-section" style={{ marginBottom: '1rem' }}>
                                                    {project.salesName && (
                                                        <div className="upcoming-builder-detail-item">
                                                            <span className="upcoming-builder-detail-label">Sales Person:</span>
                                                            <span className="upcoming-builder-detail-value">{project.salesName}</span>
                                                        </div>
                                                    )}
                                                    {project.salesNumber && (
                                                        <div className="upcoming-builder-detail-item">
                                                            <span className="upcoming-builder-detail-label">Sales Phone:</span>
                                                            <a href={`tel:${project.salesNumber}`} className="upcoming-builder-detail-value upcoming-builder-detail-link">
                                                                {project.salesNumber}
                                                            </a>
                                                        </div>
                                                    )}
                                                    {project.mobileNumber && (
                                                        <div className="upcoming-builder-detail-item">
                                                            <span className="upcoming-builder-detail-label">Mobile:</span>
                                                            <a href={`tel:${project.mobileNumber}`} className="upcoming-builder-detail-value upcoming-builder-detail-link">
                                                                {project.mobileNumber}
                                                            </a>
                                                        </div>
                                                    )}
                                                    {project.emailId && (
                                                        <div className="upcoming-builder-detail-item">
                                                            <span className="upcoming-builder-detail-label">Email:</span>
                                                            <a href={`mailto:${project.emailId}`} className="upcoming-builder-detail-value upcoming-builder-detail-link">
                                                                {project.emailId}
                                                            </a>
                                                        </div>
                                                    )}
                                                    {project.whatsappNumber && (
                                                        <div className="upcoming-builder-detail-item">
                                                            <span className="upcoming-builder-detail-label">WhatsApp:</span>
                                                            <a href={`https://wa.me/${project.whatsappNumber.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="upcoming-builder-detail-value upcoming-builder-detail-link">
                                                                {project.whatsappNumber}
                                                            </a>
                                                        </div>
                                                    )}
                                                    {project.alternativeNumber && (
                                                        <div className="upcoming-builder-detail-item">
                                                            <span className="upcoming-builder-detail-label">Alternative:</span>
                                                            <a href={`tel:${project.alternativeNumber}`} className="upcoming-builder-detail-value upcoming-builder-detail-link">
                                                                {project.alternativeNumber}
                                                            </a>
                                                        </div>
                                                    )}
                                                    {project.fullAddress && (
                                                        <div className="upcoming-builder-detail-item">
                                                            <span className="upcoming-builder-detail-label">Office Address:</span>
                                                            <span className="upcoming-builder-detail-value">{project.fullAddress}</span>
                                                        </div>
                                                    )}
                                                    {/* Button state after reveal */}
                                                    <div style={{ marginTop: '1rem' }}>
                                                        <button
                                                            type="button"
                                                            className="upcoming-contact-send-button"
                                                            disabled={true}
                                                            style={{
                                                                opacity: 0.6,
                                                                cursor: 'not-allowed'
                                                            }}
                                                        >
                                                            Details Unlocked
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    )}

                                    {/* Chat with Builder Button - Show for all buyers when project exists */}
                                    {user && user.user_type === 'buyer' && project && (
                                        !project.seller_id || Number(user.id) !== Number(project.seller_id)
                                    ) && (!project.user_id || Number(user.id) !== Number(project.user_id)) && (
                                            <div style={{ marginTop: showSalesDetails ? '1rem' : '0' }}>
                                                <button
                                                    type="button"
                                                    onClick={handleChatWithBuilder}
                                                    className="upcoming-contact-send-button"
                                                    disabled={(!interactedProperties.has(String(projectId)) && !combinedInteractionLimit.canPerform) || loadingLimits}
                                                    title={(!interactedProperties.has(String(projectId)) && !combinedInteractionLimit.canPerform) ? 'Daily interaction limit reached. Try again after 12 hours.' : ''}
                                                    style={{
                                                        opacity: ((!interactedProperties.has(String(projectId)) && !combinedInteractionLimit.canPerform) || loadingLimits) ? 0.6 : 1,
                                                        cursor: ((!interactedProperties.has(String(projectId)) && !combinedInteractionLimit.canPerform) || loadingLimits) ? 'not-allowed' : 'pointer'
                                                    }}
                                                >
                                                    <FaComments style={{ marginRight: '8px' }} />
                                                    Chat with Builder
                                                </button>

                                                {/* Combined Usage Limit Display */}
                                                <div style={{
                                                    fontSize: '0.75rem',
                                                    color: combinedInteractionLimit.canPerform ? '#666' : '#ef4444',
                                                    marginTop: '0.25rem',
                                                    padding: '0.25rem 0.5rem',
                                                    backgroundColor: combinedInteractionLimit.canPerform ? '#f3f4f6' : '#fee2e2',
                                                    borderRadius: '4px'
                                                }}>
                                                    {combinedInteractionLimit.remaining} / {combinedInteractionLimit.max} interactions remaining
                                                    {combinedInteractionLimit.used > 0 && (
                                                        <span style={{ display: 'block', marginTop: '0.125rem', fontSize: '0.7rem' }}>
                                                            Resets in 12 hours
                                                        </span>
                                                    )}
                                                    {!combinedInteractionLimit.canPerform && (
                                                        <span style={{ display: 'block', marginTop: '0.125rem', fontWeight: 'bold', fontSize: '0.7rem' }}>
                                                            Daily interaction limit reached. Try again after 12 hours.
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                </div>
                            </aside>
                        </div>

                        {/* Project Details Section - Full Width */}
                        <div className="upcoming-project-details-full-section">
                            <h2>Project Details</h2>
                            <div className="upcoming-project-details-grid">
                                {project.builder && (
                                    <div className="upcoming-project-detail-item">
                                        <span className="upcoming-project-detail-label">Builder / Developer</span>
                                        <span className="upcoming-project-detail-value">{project.builder}</span>
                                    </div>
                                )}
                                {project.projectType && (
                                    <div className="upcoming-project-detail-item">
                                        <span className="upcoming-project-detail-label">Project Type</span>
                                        <span className="upcoming-project-detail-value">{project.projectType}</span>
                                    </div>
                                )}
                                {project.projectStatus && (
                                    <div className="upcoming-project-detail-item">
                                        <span className="upcoming-project-detail-label">Project Status</span>
                                        <span className="upcoming-project-detail-value">{project.projectStatus}</span>
                                    </div>
                                )}
                                {project.reraNumber && (
                                    <div className="upcoming-project-detail-item">
                                        <span className="upcoming-project-detail-label">RERA Number</span>
                                        <span className="upcoming-project-detail-value">{project.reraNumber}</span>
                                    </div>
                                )}
                                {project.bhkType && (
                                    <div className="upcoming-project-detail-item">
                                        <span className="upcoming-project-detail-label">Configuration</span>
                                        <span className="upcoming-project-detail-value">{project.bhkType}</span>
                                    </div>
                                )}
                                {project.carpetAreaRange && (
                                    <div className="upcoming-project-detail-item">
                                        <span className="upcoming-project-detail-label">Carpet Area Range</span>
                                        <span className="upcoming-project-detail-value">{project.carpetAreaRange}</span>
                                    </div>
                                )}
                                {project.numberOfTowers && (
                                    <div className="upcoming-project-detail-item">
                                        <span className="upcoming-project-detail-label">Number of Towers / Buildings</span>
                                        <span className="upcoming-project-detail-value">{project.numberOfTowers}</span>
                                    </div>
                                )}
                                {project.totalUnits && (
                                    <div className="upcoming-project-detail-item">
                                        <span className="upcoming-project-detail-label">Total Units</span>
                                        <span className="upcoming-project-detail-value">{project.totalUnits}</span>
                                    </div>
                                )}
                                {project.floorsCount && (
                                    <div className="upcoming-project-detail-item">
                                        <span className="upcoming-project-detail-label">Floors</span>
                                        <span className="upcoming-project-detail-value">{project.floorsCount}</span>
                                    </div>
                                )}
                                {project.location && (
                                    <div className="upcoming-project-detail-item">
                                        <span className="upcoming-project-detail-label">Location</span>
                                        <span className="upcoming-project-detail-value">{project.location}</span>
                                    </div>
                                )}
                                {project.city && (
                                    <div className="upcoming-project-detail-item">
                                        <span className="upcoming-project-detail-label">City</span>
                                        <span className="upcoming-project-detail-value">{project.city}</span>
                                    </div>
                                )}
                                {project.state && (
                                    <div className="upcoming-project-detail-item">
                                        <span className="upcoming-project-detail-label">State</span>
                                        <span className="upcoming-project-detail-value">{project.state}</span>
                                    </div>
                                )}
                                {project.fullAddress && (
                                    <div className="upcoming-project-detail-item">
                                        <span className="upcoming-project-detail-label">Address</span>
                                        <span className="upcoming-project-detail-value">{project.fullAddress}</span>
                                    </div>
                                )}
                                {project.pincode && (
                                    <div className="upcoming-project-detail-item">
                                        <span className="upcoming-project-detail-label">Pincode</span>
                                        <span className="upcoming-project-detail-value">{project.pincode}</span>
                                    </div>
                                )}
                                {project.startingPrice && (
                                    <div className="upcoming-project-detail-item">
                                        <span className="upcoming-project-detail-label">Starting Price</span>
                                        <span className="upcoming-project-detail-value">{project.startingPrice}</span>
                                    </div>
                                )}
                                {project.pricePerSqft && (
                                    <div className="upcoming-project-detail-item">
                                        <span className="upcoming-project-detail-label">Price per Sqft</span>
                                        <span className="upcoming-project-detail-value">₹{project.pricePerSqft}</span>
                                    </div>
                                )}
                                {project.bookingAmount && (
                                    <div className="upcoming-project-detail-item">
                                        <span className="upcoming-project-detail-label">Booking Amount</span>
                                        <span className="upcoming-project-detail-value">{project.bookingAmount}</span>
                                    </div>
                                )}
                                {project.expectedLaunchDate && (
                                    <div className="upcoming-project-detail-item">
                                        <span className="upcoming-project-detail-label">Expected Launch Date</span>
                                        <span className="upcoming-project-detail-value">
                                            {(() => {
                                                try {
                                                    const date = new Date(project.expectedLaunchDate);
                                                    return isNaN(date.getTime()) ? project.expectedLaunchDate : date.toLocaleDateString();
                                                } catch {
                                                    return project.expectedLaunchDate;
                                                }
                                            })()}
                                        </span>
                                    </div>
                                )}
                                {project.expectedPossessionDate && (
                                    <div className="upcoming-project-detail-item">
                                        <span className="upcoming-project-detail-label">Expected Possession Date</span>
                                        <span className="upcoming-project-detail-value">
                                            {(() => {
                                                try {
                                                    const date = new Date(project.expectedPossessionDate);
                                                    return isNaN(date.getTime()) ? project.expectedPossessionDate : date.toLocaleDateString();
                                                } catch {
                                                    return project.expectedPossessionDate;
                                                }
                                            })()}
                                        </span>
                                    </div>
                                )}
                                {project.reraStatus && (
                                    <div className="upcoming-project-detail-item">
                                        <span className="upcoming-project-detail-label">RERA Status</span>
                                        <span className="upcoming-project-detail-value">{project.reraStatus}</span>
                                    </div>
                                )}
                                {project.landOwnershipType && (
                                    <div className="upcoming-project-detail-item">
                                        <span className="upcoming-project-detail-label">Land Ownership</span>
                                        <span className="upcoming-project-detail-value">{project.landOwnershipType}</span>
                                    </div>
                                )}
                                {project.bankApproved && (
                                    <div className="upcoming-project-detail-item">
                                        <span className="upcoming-project-detail-label">Bank Approved</span>
                                        <span className="upcoming-project-detail-value">{project.bankApproved}</span>
                                    </div>
                                )}
                                {project.approvedBanks && project.approvedBanks.length > 0 && (
                                    <div className="upcoming-project-detail-item">
                                        <span className="upcoming-project-detail-label">Approved Banks</span>
                                        <span className="upcoming-project-detail-value">{project.approvedBanks.join(', ')}</span>
                                    </div>
                                )}
                                {project.mapLink && (
                                    <div className="upcoming-project-detail-item">
                                        <span className="upcoming-project-detail-label">Map Link</span>
                                        <span className="upcoming-project-detail-value">
                                            <a href={project.mapLink} target="_blank" rel="noopener noreferrer" style={{ color: '#0066cc', textDecoration: 'underline' }}>
                                                View on Map
                                            </a>
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Amenities Section */}
                        {project.amenities && project.amenities.length > 0 && (
                            <div className="upcoming-amenities-section">
                                <h2>What this place offers</h2>
                                <div className="upcoming-amenities-grid">
                                    {project.amenities.map((amenity, index) => (
                                        <div key={index} className="upcoming-amenity-item">
                                            <span className="upcoming-amenity-icon">{getAmenityIcon(amenity)}</span>
                                            <span>{capitalizeAmenity(amenity)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Description - Full Width */}
                        {project.description && (
                            <div className="upcoming-description-section">
                                <h2>About this place</h2>
                                <p>{project.description}</p>
                            </div>
                        )}

                        {/* Project Highlights */}
                        {project.projectHighlights && (
                            <div className="upcoming-description-section">
                                <h2>Project Highlights</h2>
                                <p>{project.projectHighlights}</p>
                            </div>
                        )}

                        {/* USP */}
                        {project.usp && (
                            <div className="upcoming-description-section">
                                <h2>Unique Selling Points</h2>
                                <p>{project.usp}</p>
                            </div>
                        )}


                        {/* Brochure Link */}
                        {project.brochure && (
                            <div className="upcoming-description-section">
                                <h2>Project Brochure</h2>
                                <div style={{ marginTop: '1rem' }}>
                                    <a
                                        href={typeof project.brochure === 'string' ? project.brochure : (project.brochure.url || project.brochure.file || project.brochure)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{
                                            display: 'inline-block',
                                            padding: '0.75rem 1.5rem',
                                            backgroundColor: '#0066cc',
                                            color: 'white',
                                            textDecoration: 'none',
                                            borderRadius: '8px',
                                            fontWeight: '500'
                                        }}
                                    >
                                        Download Brochure
                                    </a>
                                </div>
                            </div>
                        )}

                        {/* Location Map */}
                        <UpcomingProjectMapFeature project={project} />
                    </div>
                </div>
            </main>

            {/* Image Slider Modal */}
            <ImageSliderModal
                images={project.images}
                currentIndex={currentImageIndex}
                onClose={closeSlider}
                onNext={nextImage}
                onPrev={prevImage}
            />


            {/* Toast Notification */}
            {showToast && (
                <div className="upcoming-share-toast-details">
                    Link copied!
                </div>
            )}
        </div>
    );
};

export default UpcomingProjectViewDetails;
