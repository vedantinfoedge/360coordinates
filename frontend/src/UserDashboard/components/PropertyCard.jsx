import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/PropertyCard.css';

// ============================================================================
// FAVORITES UTILITY FUNCTIONS
// ============================================================================

export const FavoritesManager = {
  // Get all favorite property IDs from localStorage
  getFavorites: () => {
    try {
      const favorites = localStorage.getItem('propertyFavorites');
      return favorites ? JSON.parse(favorites) : [];
    } catch (error) {
      console.error('Error reading favorites:', error);
      return [];
    }
  },

  // Save favorites to localStorage
  saveFavorites: (favorites) => {
    try {
      localStorage.setItem('propertyFavorites', JSON.stringify(favorites));
    } catch (error) {
      console.error('Error saving favorites:', error);
    }
  },

  // Toggle favorite status for a property
  toggleFavorite: (propertyId) => {
    const favorites = FavoritesManager.getFavorites();
    const index = favorites.indexOf(propertyId);
    
    if (index > -1) {
      favorites.splice(index, 1);
    } else {
      favorites.push(propertyId);
    }
    
    FavoritesManager.saveFavorites(favorites);
    return favorites;
  },

  // Check if a property is favorited
  isFavorite: (propertyId) => {
    const favorites = FavoritesManager.getFavorites();
    return favorites.includes(propertyId);
  },

  // Get all favorited properties (requires properties array to be passed)
  getFavoriteProperties: (properties) => {
    const favoriteIds = FavoritesManager.getFavorites();
    return (properties || []).filter(property => favoriteIds.includes(property.id));
  }
};

// ============================================================================
// PROPERTY VIEW HISTORY UTILITY FUNCTIONS
// ============================================================================

export const PropertyHistoryManager = {
  // Get all history entries - tries backend first, falls back to localStorage
  getHistory: async () => {
    try {
      // Try to get from backend if user is authenticated
      const user = JSON.parse(localStorage.getItem('userData') || 'null');
      if (user && user.user_type === 'buyer') {
        try {
          const { historyAPI } = await import('../../services/api.service');
          const response = await historyAPI.list();
          if (response.success && response.data && response.data.history) {
            // Format backend data to match localStorage format
            const formattedHistory = response.data.history.map(entry => {
              // Backend provides ph.created_at as viewed_at in SQL query
              // viewed_at IS the history record's created_at timestamp (when property was added to history)
              // This is the single source of truth for history timing
              const historyCreatedAt = entry.viewed_at || entry.viewedAt;
              
              if (!historyCreatedAt) {
                console.warn('History entry missing created_at timestamp:', entry);
              }
              
              return {
                propertyId: entry.propertyId || entry.id,
                propertyTitle: entry.propertyTitle || entry.title,
                ownerName: entry.ownerName || entry.seller_name || 'Property Owner',
                ownerContactNumber: entry.ownerContactNumber || entry.seller_phone || '',
                ownerEmail: entry.ownerEmail || entry.seller_email || '',
                actionType: entry.actionType || entry.action_type || 'viewed_owner_details',
                // Use ONLY history record's created_at (from ph.created_at via viewed_at)
                // This represents the exact time when property was added to buyer history
                created_at: historyCreatedAt,
                // Keep viewedAt for backward compatibility, but it should match created_at
                viewedAt: historyCreatedAt
              };
            });
            
            // Update localStorage cache
            PropertyHistoryManager.saveHistory(formattedHistory);
            return formattedHistory;
          }
        } catch (error) {
          console.warn('Failed to load history from backend, using localStorage:', error);
        }
      }
      
      // Fallback to localStorage
      // Ensure created_at is present for display consistency (use viewedAt as fallback for old entries)
      const history = localStorage.getItem('propertyViewHistory');
      const localHistory = history ? JSON.parse(history) : [];
      
      // Normalize localStorage entries to ensure created_at exists
      // For entries without created_at, use viewedAt (backward compatibility)
      return localHistory.map(entry => ({
        ...entry,
        created_at: entry.created_at || entry.viewedAt || null
      }));
    } catch (error) {
      console.error('Error reading property history:', error);
      return [];
    }
  },

  // Save history to localStorage (used as cache)
  saveHistory: (history) => {
    try {
      localStorage.setItem('propertyViewHistory', JSON.stringify(history));
    } catch (error) {
      console.error('Error saving property history:', error);
    }
  },

  // Add or update a property view history entry
  // actionType: 'viewed_owner_details' or 'chat_with_owner'
  addToHistory: async (propertyData) => {
    const {
      propertyId,
      propertyTitle,
      ownerName,
      ownerContactNumber,
      ownerEmail,
      actionType = 'viewed_owner_details' // Default action type
    } = propertyData;

    // Try to save to backend first
    const user = JSON.parse(localStorage.getItem('userData') || 'null');
    if (user && user.user_type === 'buyer') {
      try {
        const { historyAPI } = await import('../../services/api.service');
        await historyAPI.add(propertyId, actionType);
        // Backend save successful - reload history from backend
        return await PropertyHistoryManager.getHistory();
      } catch (error) {
        console.warn('Failed to save history to backend, using localStorage:', error);
        // Continue with localStorage fallback
      }
    }

    // Fallback to localStorage
    const history = PropertyHistoryManager.getHistorySync();
    const existingIndex = history.findIndex(entry => entry.propertyId === propertyId);

    const historyEntry = {
      propertyId,
      propertyTitle,
      ownerName,
      ownerContactNumber,
      ownerEmail,
      actionType,
      viewedAt: new Date().toISOString()
    };

    if (existingIndex > -1) {
      // Update existing entry with new timestamp and action type
      const existingEntry = history[existingIndex];
      if (existingEntry.actionType === 'viewed_owner_details' && actionType === 'chat_with_owner') {
        // Upgrade to chat action
        history[existingIndex] = historyEntry;
      } else {
        // Just update timestamp
        history[existingIndex] = {
          ...existingEntry,
          viewedAt: historyEntry.viewedAt,
          actionType: existingEntry.actionType === 'chat_with_owner' ? existingEntry.actionType : historyEntry.actionType
        };
      }
    } else {
      // Add new entry
      history.unshift(historyEntry);
    }

    // Keep only the latest 100 entries
    const maxEntries = 100;
    if (history.length > maxEntries) {
      history.splice(maxEntries);
    }

    PropertyHistoryManager.saveHistory(history);
    return history;
  },

  // Synchronous version of getHistory (for immediate access without async)
  getHistorySync: () => {
    try {
      const history = localStorage.getItem('propertyViewHistory');
      return history ? JSON.parse(history) : [];
    } catch (error) {
      console.error('Error reading property history:', error);
      return [];
    }
  },

  // Clear all history
  clearHistory: async () => {
    // Clear localStorage
    PropertyHistoryManager.saveHistory([]);
    
    // Note: Backend doesn't have a clear endpoint yet
    // If needed, we can add DELETE /api/buyer/history/clear.php
  },

  // Remove a specific history entry
  removeFromHistory: (propertyId) => {
    const history = PropertyHistoryManager.getHistorySync();
    const filtered = history.filter(entry => entry.propertyId !== propertyId);
    PropertyHistoryManager.saveHistory(filtered);
    return filtered;
  }
};

// ============================================================================
// PROPERTY CARD COMPONENT - WITH FAVORITES
// ============================================================================

const PropertyCard = ({ property, onFavoriteToggle, onCarouselInteractionStart, onCarouselInteractionEnd, onCardMouseEnter, onCardMouseLeave }) => {
    const navigate = useNavigate();
    // State to manage the favourite status
    const [isFavorited, setIsFavorited] = useState(false);
    const [showToast, setShowToast] = useState(false);
    // State to manage carousel current image index
    const [currentImageIndex, setCurrentImageIndex] = useState(0);

    // Check favorite status on mount and when property changes
    useEffect(() => {
        const checkFavoriteStatus = async () => {
            try {
                // Check local storage first for quick display
                const localFavorite = FavoritesManager.isFavorite(property.id);
                setIsFavorited(localFavorite);
                
                // Then verify with API if user is authenticated
                const token = localStorage.getItem('authToken');
                if (token) {
                    const { favoritesAPI } = await import('../../services/api.service');
                    const response = await favoritesAPI.list();
                    if (response.success && response.data) {
                        // API returns properties array (not favorites array)
                        const properties = response.data.properties || response.data.favorites || [];
                        const favoriteIds = properties.map(p => p.id || p.property_id);
                        setIsFavorited(favoriteIds.includes(property.id));
                    }
                }
            } catch (error) {
                console.error('Error checking favorite status:', error);
                // Fallback to local storage
                setIsFavorited(FavoritesManager.isFavorite(property.id));
            }
        };
        
        checkFavoriteStatus();
    }, [property.id]);

    // Handle favorite button click
    const handleFavoriteClick = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        try {
            // Import favoritesAPI dynamically to avoid circular dependencies
            const { favoritesAPI } = await import('../../services/api.service');
            const response = await favoritesAPI.toggle(property.id);
            
            if (response.success) {
                setIsFavorited(response.data.is_favorite !== undefined ? response.data.is_favorite : !isFavorited);
                // Also update local storage for offline support
                FavoritesManager.toggleFavorite(property.id);
                
                // Notify parent component if callback provided
                if (onFavoriteToggle) {
                    onFavoriteToggle();
                }
            } else {
                console.error('Failed to toggle favorite:', response.message);
            }
        } catch (error) {
            console.error('Error toggling favorite:', error);
            // Fallback to local storage if API fails
            FavoritesManager.toggleFavorite(property.id);
            setIsFavorited(!isFavorited);
        }
    };

    // Helper function to copy to clipboard with fallback
    const copyToClipboard = async (text) => {
        try {
            // Try modern Clipboard API first (requires HTTPS or localhost)
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(text);
                setShowToast(true);
                setTimeout(() => setShowToast(false), 2000);
                return;
            }
            
            // Fallback to execCommand for older browsers or non-HTTPS
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            textArea.style.top = '-999999px';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            
            try {
                const successful = document.execCommand('copy');
                if (successful) {
                    setShowToast(true);
                    setTimeout(() => setShowToast(false), 2000);
                } else {
                    throw new Error('execCommand failed');
                }
            } finally {
                document.body.removeChild(textArea);
            }
        } catch (error) {
            console.error('Failed to copy to clipboard:', error);
            // Last resort: show the link in a prompt
            const userConfirmed = window.confirm(`Share this property link:\n\n${text}\n\nClick OK to copy, then paste it manually.`);
            if (userConfirmed) {
                // Try one more time with clipboard API
                try {
                    if (navigator.clipboard && navigator.clipboard.writeText) {
                        await navigator.clipboard.writeText(text);
                        setShowToast(true);
                        setTimeout(() => setShowToast(false), 2000);
                    }
                } catch (finalError) {
                    console.error('Final clipboard attempt failed:', finalError);
                }
            }
        }
    };

    // Handle share button click
    const handleShareClick = async (e) => {
        e.preventDefault();
        e.stopPropagation();

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
                    await copyToClipboard(shareUrl);
                }
            }
        } else {
            // Fallback: Copy to clipboard for desktop
            await copyToClipboard(shareUrl);
        }
    };

    const { id, image, images, title, price, location, bedrooms, bathrooms, area, status, available_for_bachelors } = property;
    const isForRent = status === 'For Rent';
    const priceDisplay = isForRent ? `₹${price?.toLocaleString('en-IN')}` : `₹${price?.toLocaleString('en-IN')}`;
    const priceLabel = isForRent ? 'Price/Month' : 'Price';
    const isAvailableForBachelors = available_for_bachelors === 1 || available_for_bachelors === true;

    // Default placeholder image
    const placeholderImage = 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=500';
    
    // Collect images from property.images array or fallback to single image
    const propertyImages = useMemo(() => {
        if (images && Array.isArray(images) && images.length > 0) {
            return images.filter(img => img && img.trim() !== '');
        } else if (images && typeof images === 'string' && images.trim() !== '') {
            // Handle comma-separated string
            return images.split(',').map(img => img.trim()).filter(img => img !== '');
        } else if (image && image.trim() !== '') {
            return [image];
        }
        return [placeholderImage];
    }, [images, image, placeholderImage]);

    // Reset to first image when property changes
    useEffect(() => {
        setCurrentImageIndex(0);
    }, [id]);

    // Handle image load errors
    const handleImageError = (e) => {
        console.warn('Image failed to load:', e.target.src, 'for property:', title);
        e.target.src = placeholderImage;
        e.target.onerror = null; // Prevent infinite loop
    };

    // Carousel navigation functions with interaction callbacks for auto-scroll pause
    const goToNextImage = (e) => {
        e.preventDefault();
        e.stopPropagation();
        // Notify parent that carousel interaction started (pause auto-scroll)
        if (onCarouselInteractionStart) onCarouselInteractionStart();
        setCurrentImageIndex((prevIndex) => 
            prevIndex === propertyImages.length - 1 ? 0 : prevIndex + 1
        );
        // Resume auto-scroll after a delay (10 seconds)
        if (onCarouselInteractionEnd) {
            setTimeout(() => onCarouselInteractionEnd(), 10000);
        }
    };

    const goToPrevImage = (e) => {
        e.preventDefault();
        e.stopPropagation();
        // Notify parent that carousel interaction started (pause auto-scroll)
        if (onCarouselInteractionStart) onCarouselInteractionStart();
        setCurrentImageIndex((prevIndex) => 
            prevIndex === 0 ? propertyImages.length - 1 : prevIndex - 1
        );
        // Resume auto-scroll after a delay (10 seconds)
        if (onCarouselInteractionEnd) {
            setTimeout(() => onCarouselInteractionEnd(), 10000);
        }
    };

    const goToImage = (index, e) => {
        e.preventDefault();
        e.stopPropagation();
        // Notify parent that carousel interaction started (pause auto-scroll)
        if (onCarouselInteractionStart) onCarouselInteractionStart();
        setCurrentImageIndex(index);
        // Resume auto-scroll after a delay (10 seconds)
        if (onCarouselInteractionEnd) {
            setTimeout(() => onCarouselInteractionEnd(), 10000);
        }
    };

    // Handle card click to navigate to details page - open in new tab
    const handleCardClick = (e) => {
        // Don't navigate if clicking on buttons or links
        if (e.target.closest('button') || e.target.closest('a')) {
            return;
        }
        window.open(`/details/${id}`, '_blank', 'noopener,noreferrer');
    };

    return (
        <div
            className="buyer-property-card"
            onClick={handleCardClick}
            onMouseEnter={onCardMouseEnter}
            onMouseLeave={onCardMouseLeave}
        >
            <div className="buyer-property-image-container">
                {/* Image Carousel */}
                <div className="buyer-property-image-carousel">
                    {propertyImages.map((imgUrl, index) => (
                        <img 
                            key={index}
                            src={imgUrl} 
                            alt={`${title || 'Property'} - Image ${index + 1}`} 
                            className={`buyer-property-image ${index === currentImageIndex ? 'active' : ''}`}
                            onError={handleImageError}
                            loading={index === 0 ? 'eager' : 'lazy'}
                        />
                    ))}
                </div>

                {/* Navigation Arrows - Only show if more than 1 image */}
                {propertyImages.length > 1 && (
                    <>
                        <button 
                            className="buyer-carousel-arrow buyer-carousel-arrow-prev"
                            onClick={goToPrevImage}
                            aria-label="Previous image"
                            title="Previous image"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="15 18 9 12 15 6"></polyline>
                            </svg>
                        </button>
                        <button 
                            className="buyer-carousel-arrow buyer-carousel-arrow-next"
                            onClick={goToNextImage}
                            aria-label="Next image"
                            title="Next image"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="9 18 15 12 9 6"></polyline>
                            </svg>
                        </button>
                    </>
                )}

                {/* Pagination Dots - Only show if more than 1 image */}
                {propertyImages.length > 1 && (
                    <div className="buyer-carousel-pagination">
                        {propertyImages.map((_, index) => (
                            <button
                                key={index}
                                className={`buyer-carousel-dot ${index === currentImageIndex ? 'active' : ''}`}
                                onClick={(e) => goToImage(index, e)}
                                aria-label={`Go to image ${index + 1}`}
                                title={`Image ${index + 1}`}
                            />
                        ))}
                    </div>
                )}

                <span className={`buyer-property-status ${isForRent ? 'buyer-for-rent' : 'buyer-for-sale'}`}>{status}</span>
                
                {/* ★ FAVORITE BUTTON */}
                <button 
                    className={`buyer-favourite-btn ${isFavorited ? 'active' : ''}`}
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

                {/* ★ SHARE BUTTON */}
                <button 
                    className="buyer-share-btn"
                    onClick={handleShareClick}
                    aria-label="Share property"
                    title="Share property"
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

                {/* Toast notification */}
                {showToast && (
                    <div className="buyer-share-toast">
                        Link copied!
                    </div>
                )}

            </div>

            <div className="buyer-property-content">
                <h3 className="buyer-property-title">{title}</h3>
                
                <div className="buyer-property-location">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                        <circle cx="12" cy="10" r="3"></circle>
                    </svg>
                    <span>{location}</span>
                </div>

                <div className="buyer-property-details">
                    {(bedrooms && bedrooms !== '0' && bedrooms !== 0) && (
                    <div className="buyer-detail-item">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M2 17l6-6 4 4 8-8"></path>
                            <path d="M17 2h5v5"></path>
                        </svg>
                        <span>{bedrooms} {bedrooms === '1' || bedrooms === 1 ? 'Bed' : 'Beds'}</span>
                    </div>
                    )}

                    {(bathrooms && bathrooms !== '0' && bathrooms !== 0) && (
                    <div className="buyer-detail-item">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M9 6 6.5 3.5a1.5 1.5 0 0 0-1 0l-1 1a1.5 1.5 0 0 0 0 1L7 9"></path>
                            <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"></path>
                            <circle cx="11" cy="11" r="2"></circle>
                        </svg>
                        <span>{bathrooms} {bathrooms === '1' || bathrooms === 1 ? 'Bath' : 'Baths'}</span>
                    </div>
                    )}
                    
                    <div className="buyer-detail-item">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                            <line x1="9" y1="3" x2="9" y2="21"></line>
                        </svg>
                        <span>{area} sq.ft</span>
                    </div>
                </div>

                <div className="buyer-property-footer">
                    <div className="buyer-property-price">
                        <span className="buyer-price-label">{priceLabel}</span>
                        <span className="buyer-price-value">{priceDisplay}</span>
                    </div>
                    
                    <button 
                        className="buyer-view-details-btn"
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            window.open(`/details/${id}`, '_blank', 'noopener,noreferrer');
                        }}
                    >
                        View Details
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PropertyCard;