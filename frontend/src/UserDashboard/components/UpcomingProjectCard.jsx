import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/UpcomingProjectCard.css';
import { propertiesAPI } from '../../services/api.service';

// ============================================================================
// FAVORITES UTILITY FUNCTIONS FOR UPCOMING PROJECTS
// ============================================================================

export const UpcomingProjectFavoritesManager = {
  // Get all favorite upcoming project IDs from localStorage
  getFavorites: () => {
    try {
      const favorites = localStorage.getItem('upcomingProjectFavorites');
      return favorites ? JSON.parse(favorites) : [];
    } catch (error) {
      console.error('Error reading upcoming project favorites:', error);
      return [];
    }
  },

  // Save favorites to localStorage
  saveFavorites: (favorites) => {
    try {
      localStorage.setItem('upcomingProjectFavorites', JSON.stringify(favorites));
    } catch (error) {
      console.error('Error saving upcoming project favorites:', error);
    }
  },

  // Toggle favorite status for an upcoming project
  toggleFavorite: (projectId) => {
    const favorites = UpcomingProjectFavoritesManager.getFavorites();
    const index = favorites.indexOf(projectId);
    
    if (index > -1) {
      favorites.splice(index, 1);
    } else {
      favorites.push(projectId);
    }
    
    UpcomingProjectFavoritesManager.saveFavorites(favorites);
    return favorites;
  },

  // Check if an upcoming project is favorited
  isFavorite: (projectId) => {
    const favorites = UpcomingProjectFavoritesManager.getFavorites();
    return favorites.includes(projectId);
  },

  // Get all favorited upcoming projects
  getFavoriteProjects: (projects) => {
    const favoriteIds = UpcomingProjectFavoritesManager.getFavorites();
    return (projects || []).filter(project => favoriteIds.includes(project.id));
  }
};

// Helper function to extract city from location string
const extractCity = (location) => {
  if (!location) return 'Unknown';
  const cities = ['Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai', 'Pune', 'Kolkata', 'Ahmedabad', 'Jaipur', 'Surat'];
  const locationUpper = location.toUpperCase();
  for (const city of cities) {
    if (locationUpper.includes(city.toUpperCase())) {
      return city;
    }
  }
  const parts = location.split(',');
  return parts.length > 1 ? parts[parts.length - 1].trim() : location.split(' ')[0];
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
    return 'N/A';
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

// Individual Upcoming Project Card Component
const UpcomingProjectCard = ({ project, onFavoriteToggle }) => {
    const navigate = useNavigate();
    const [showToast, setShowToast] = useState(false);
    const [isFavorited, setIsFavorited] = useState(false);

    // Check favorite status on mount and when project changes
    useEffect(() => {
        const checkFavoriteStatus = async () => {
            try {
                // Check local storage first for quick display
                const localFavorite = UpcomingProjectFavoritesManager.isFavorite(project.id);
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
                        setIsFavorited(favoriteIds.includes(project.id));
                    }
                }
            } catch (error) {
                console.error('Error checking favorite status:', error);
                // Fallback to local storage
                setIsFavorited(UpcomingProjectFavoritesManager.isFavorite(project.id));
            }
        };
        
        checkFavoriteStatus();
    }, [project.id]);

    // Handle favorite button click
    const handleFavoriteClick = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        try {
            // Import favoritesAPI dynamically to avoid circular dependencies
            const { favoritesAPI } = await import('../../services/api.service');
            const response = await favoritesAPI.toggle(project.id);
            
            if (response.success) {
                setIsFavorited(response.data.is_favorite !== undefined ? response.data.is_favorite : !isFavorited);
                // Also update local storage for offline support
                UpcomingProjectFavoritesManager.toggleFavorite(project.id);
                
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
            UpcomingProjectFavoritesManager.toggleFavorite(project.id);
            setIsFavorited(!isFavorited);
        }
    };

    const { id, image, title, location, priceRange, bhkType, projectStatus } = project;
    const statusDisplay = projectStatus || 'Upcoming';
    
    // Default placeholder image
    const placeholderImage = 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=500';
    
    // Ensure we have a valid image URL
    const imageUrl = image && image.trim() !== '' ? image : placeholderImage;

    // Handle image load errors
    const handleImageError = (e) => {
        console.warn('Image failed to load:', imageUrl, 'for project:', title);
        e.target.src = placeholderImage;
        e.target.onerror = null;
    };

    // Helper function to copy to clipboard
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
            textArea.style.top = '-999999px';
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

    // Handle share button click
    const handleShareClick = async (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (!project || !project.id) {
            console.error('Cannot share: project ID is missing');
            return;
        }

        const shareUrl = `${window.location.origin}/upcoming-project/${project.id}`;
        const shareData = {
            title: project.title || 'Upcoming Project',
            text: `Check out this upcoming project: ${project.title || 'Amazing Project'}`,
            url: shareUrl
        };

        if (navigator.share) {
            try {
                await navigator.share(shareData);
                console.log('Share successful');
            } catch (error) {
                if (error.name !== 'AbortError') {
                    console.error('Error sharing:', error);
                    await copyToClipboard(shareUrl);
                }
            }
        } else {
            await copyToClipboard(shareUrl);
        }
    };

    // Handle card click to navigate to details page - open in new tab
    const handleCardClick = (e) => {
        if (e.target.closest('button') || e.target.closest('a')) {
            return;
        }
        window.open(`/upcoming-project/${id}`, '_blank', 'noopener,noreferrer');
    };

    const priceDisplay = `₹${priceRange} Cr`;

    return (
        <div className="upcoming-project-card" onClick={handleCardClick}>
            <div className="upcoming-project-image-container">
                <img 
                    src={imageUrl} 
                    alt={title || 'Project image'} 
                    className="upcoming-project-image"
                    onError={handleImageError}
                    loading="lazy"
                />
                <span className="upcoming-project-status">{statusDisplay}</span>
                
                {/* ★ FAVORITE BUTTON */}
                <button 
                    className={`upcoming-favourite-btn ${isFavorited ? 'active' : ''}`}
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

                {/* SHARE BUTTON */}
                <button 
                    className="upcoming-share-btn"
                    onClick={handleShareClick}
                    aria-label="Share project"
                    title="Share project"
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
                    <div className="upcoming-share-toast">
                        Link copied!
                    </div>
                )}
            </div>

            <div className="upcoming-project-content">
                <h3 className="upcoming-project-title">{title}</h3>
                
                <div className="upcoming-project-location">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                        <circle cx="12" cy="10" r="3"></circle>
                    </svg>
                    <span>{location}</span>
                </div>

                <div className="upcoming-project-details">
                    {bhkType && bhkType !== 'N/A' && (
                        <div className="upcoming-detail-item">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M2 17l6-6 4 4 8-8"></path>
                                <path d="M17 2h5v5"></path>
                            </svg>
                            <span>{bhkType}</span>
                        </div>
                    )}
                    
                    <div className="upcoming-detail-item">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                            <line x1="9" y1="3" x2="9" y2="21"></line>
                        </svg>
                        <span>{statusDisplay}</span>
                    </div>
                </div>

                <div className="upcoming-project-footer">
                    <div className="upcoming-project-price">
                        <span className="upcoming-price-label">Price Range</span>
                        <span className="upcoming-price-value">{priceDisplay}</span>
                    </div>
                    
                    <button 
                        className="upcoming-view-details-btn"
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            window.open(`/upcoming-project/${id}`, '_blank', 'noopener,noreferrer');
                        }}
                    >
                        View Details
                    </button>
                </div>
            </div>
        </div>
    );
};

// Main Upcoming Projects Section Component
const UpcomingProjectsSection = () => {
    const navigate = useNavigate();
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const handleViewAllClick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        navigate('/buyer-dashboard/search?searchMode=upcoming-projects&project_type=upcoming');
    };

    useEffect(() => {
        const fetchUpcomingProjects = async () => {
            try {
                setLoading(true);
                setError(null);
                const response = await propertiesAPI.list({ limit: 50, project_type: 'upcoming' });
                
                if (response.success && response.data && response.data.properties) {
                    const upcomingProperties = response.data.properties;
                    
                    const mappedProjects = upcomingProperties.map(prop => {
                        let imageUrl = null;
                        if (prop.cover_image && prop.cover_image.trim() !== '') {
                            imageUrl = prop.cover_image;
                        } else if (Array.isArray(prop.images) && prop.images.length > 0) {
                            const validImage = prop.images.find(img => img && img.trim() !== '');
                            imageUrl = validImage || null;
                        }
                        if (!imageUrl || imageUrl.trim() === '') {
                            imageUrl = 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=500';
                        }
                        
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
                        
                        const city = extractCity(prop.location);
                        const bhkType = formatBhkType(upcomingData.configurations);
                        const priceRange = formatPriceRange(prop.price);
                        
                        return {
                            id: prop.id,
                            image: imageUrl,
                            title: prop.title,
                            location: prop.location,
                            city: city,
                            bhkType: bhkType,
                            priceRange: priceRange,
                            projectStatus: upcomingData.projectStatus,
                            builder: upcomingData.builderName || prop.seller_name || 'Builder',
                            builderLink: `#builder-${prop.id}`,
                            upcomingData: upcomingData,
                            propertyData: prop
                        };
                    });
                    
                    setProjects(mappedProjects);
                    console.log('✅ Loaded', mappedProjects.length, 'upcoming projects from API');
                } else {
                    setProjects([]);
                }
            } catch (err) {
                console.error('Error fetching upcoming projects:', err);
                setError('Failed to load upcoming projects');
                setProjects([]);
            } finally {
                setLoading(false);
            }
        };

        fetchUpcomingProjects();
    }, []);

    if (loading) {
        return (
            <div className="upcoming-projects-section">
                <div className="upcoming-section-header">
                    <div className="buyer-section-header-content">
                        <div>
                            <h2 className="upcoming-section-title">Explore Projects</h2>
                            <p className="upcoming-section-subtitle">Visit these projects and get benefits before the official launch!</p>
                        </div>
                        <button
                            className="buyer-view-all-btn"
                            onClick={handleViewAllClick}
                            aria-label="View all upcoming projects"
                        >
                            View All
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                        </button>
                    </div>
                </div>
                <div style={{ textAlign: 'center', padding: '2rem' }}>
                    <p>Loading upcoming projects...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="upcoming-projects-section">
                <div className="upcoming-section-header">
                    <div className="buyer-section-header-content">
                        <div>
                            <h2 className="upcoming-section-title"> Explore Projects</h2>
                            <p className="upcoming-section-subtitle">Visit these projects and get benefits before the official launch!</p>
                        </div>
                        <button
                            className="buyer-view-all-btn"
                            onClick={handleViewAllClick}
                            aria-label="View all upcoming projects"
                        >
                            View All
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                        </button>
                    </div>
                </div>
                <div style={{ textAlign: 'center', padding: '2rem', color: '#c33' }}>
                    <p>{error}</p>
                </div>
            </div>
        );
    }

    if (projects.length === 0) {
        return null;
    }

    return (
        <div className="upcoming-projects-section">
            <div className="upcoming-section-header">
                <div className="buyer-section-header-content">
                    <div>
                        <h2 className="upcoming-section-title">Explore Projects</h2>
                        <p className="upcoming-section-subtitle">Visit these projects and get benefits before the official launch!</p>
                    </div>
                    <button
                        className="buyer-view-all-btn"
                        onClick={handleViewAllClick}
                        aria-label="View all upcoming projects"
                    >
                        View All
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                    </button>
                </div>
            </div>

            <div className="upcoming-horizontal-scroll-container">
                <div className="upcoming-projects-wrapper">
                    {projects.map((project) => (
                        <UpcomingProjectCard 
                            key={project.id} 
                            project={project}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};

export { UpcomingProjectCard };
export default UpcomingProjectsSection;