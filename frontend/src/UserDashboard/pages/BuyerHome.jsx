import React, { useState, useEffect, useLayoutEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import BuyerSearchBar from "../components/BuyerSearchBar";
import UpcomingProjectsSection from "../components/UpcomingProjectCard";
import PropertyCard from "../components/PropertyCard";
import { propertiesAPI } from "../../services/api.service";
import "../styles/BuyerHome.css";

const Home = () => {
  const navigate = useNavigate();
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Auto-scroll state
  const [isAutoScrollPaused, setIsAutoScrollPaused] = useState(false);
  const scrollContainerRef = useRef(null);
  const wrapperRef = useRef(null);
  const carouselInteractionTimeoutRef = useRef(null);
  const manualScrollTimeoutRef = useRef(null);
  const isManualScrollingRef = useRef(false);
  const wasPausedRef = useRef(false);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, []);

  // When pausing: sync container scroll to current animation position so manual scroll (both ways) works
  useLayoutEffect(() => {
    const justPaused = !wasPausedRef.current && isAutoScrollPaused;
    wasPausedRef.current = isAutoScrollPaused;
    if (!justPaused || !scrollContainerRef.current || !wrapperRef.current) return;
    const container = scrollContainerRef.current;
    const wrapper = wrapperRef.current;
    const style = window.getComputedStyle(wrapper);
    const transform = style.transform;
    let tx = 0;
    if (transform && transform !== "none") {
      const match = transform.match(/matrix\((.+)\)/);
      if (match) {
        const values = match[1].split(",").map((s) => parseFloat(s.trim()));
        if (values.length >= 6) tx = values[4];
      }
    }
    container.scrollLeft = Math.max(0, -tx);
    wrapper.style.transform = "translateX(0)";
  }, [isAutoScrollPaused]);

  // When resuming: sync animation to current scroll position so it continues from where user left off
  useLayoutEffect(() => {
    const justResumed = wasPausedRef.current && !isAutoScrollPaused;
    wasPausedRef.current = isAutoScrollPaused;
    if (!justResumed || !scrollContainerRef.current || !wrapperRef.current) return;
    const container = scrollContainerRef.current;
    const wrapper = wrapperRef.current;
    const scrollLeft = container.scrollLeft;
    const wrapperWidth = wrapper.scrollWidth;
    container.scrollLeft = 0;
    wrapper.style.transform = "";
    if (wrapperWidth > 0 && scrollLeft > 0) {
      const delaySec = (800 * scrollLeft) / wrapperWidth;
      wrapper.style.animation = "buyer-auto-scroll 400s linear infinite";
      wrapper.style.animationDelay = `-${delaySec}s`;
    } else {
      wrapper.style.animation = "";
      wrapper.style.animationDelay = "";
    }
  }, [isAutoScrollPaused]);

  // Fetch properties from API
  useEffect(() => {
    const fetchProperties = async () => {
      try {
        setLoading(true);
        setError("");
        const response = await propertiesAPI.list({ limit: 50 });
        
        if (response.success && response.data && response.data.properties) {
          // Convert backend properties to frontend format
          const backendProperties = response.data.properties.map(prop => {
            // Get the best image (cover_image or first image from array)
            // Filter out empty/null/undefined values
            let imageUrl = null;
            
            if (prop.cover_image && prop.cover_image.trim() !== '') {
              imageUrl = prop.cover_image;
            } else if (Array.isArray(prop.images) && prop.images.length > 0) {
              // Find first valid image URL
              const validImage = prop.images.find(img => img && img.trim() !== '');
              imageUrl = validImage || null;
            }
            
            // Fallback to placeholder if no valid image found
            if (!imageUrl || imageUrl.trim() === '') {
              imageUrl = 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=500';
            }
            
            return {
              id: prop.id,
              image: imageUrl,
              title: prop.title,
              price: parseFloat(prop.price),
              location: prop.location,
              bedrooms: prop.bedrooms || '0',
              bathrooms: prop.bathrooms || '0',
              area: parseFloat(prop.area),
              type: prop.property_type,
              status: prop.status === 'sale' ? 'For Sale' : (prop.status === 'rent' ? 'For Rent' : prop.status),
              // Additional fields
              propertyType: prop.property_type,
              projectType: prop.project_type || null, // Include project_type for filtering
              description: prop.description || '',
              amenities: Array.isArray(prop.amenities) ? prop.amenities : (prop.amenities ? [prop.amenities] : []),
              images: Array.isArray(prop.images) ? prop.images : (prop.images ? [prop.images] : []),
              latitude: prop.latitude,
              longitude: prop.longitude,
              createdAt: prop.created_at,
              seller_name: prop.seller_name,
              seller_phone: prop.seller_phone
            };
          });
          
          // Filter out upcoming projects - they should only appear in Upcoming Projects section
          const regularProperties = backendProperties.filter(prop => 
            !prop.projectType || prop.projectType !== 'upcoming'
          );
          
          setProperties(regularProperties);
          console.log('✅ Loaded', regularProperties.length, 'regular properties from backend (upcoming projects excluded)');
        } else {
          setProperties([]);
          setError('No properties available');
        }
      } catch (err) {
        setProperties([]);
        setError('Failed to load properties. Please try again later.');
        console.error("Error fetching properties:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchProperties();
  }, []);

  // ============================================================================
  // AUTO-SCROLL HANDLERS
  // ============================================================================
  
  // Handle carousel interaction start (pause auto-scroll)
  const handleCarouselInteractionStart = useCallback(() => {
    // Clear any pending resume timeout
    if (carouselInteractionTimeoutRef.current) {
      clearTimeout(carouselInteractionTimeoutRef.current);
    }
    setIsAutoScrollPaused(true);
  }, []);

  // Handle carousel interaction end (resume auto-scroll after delay)
  const handleCarouselInteractionEnd = useCallback(() => {
    // Clear any pending timeout
    if (carouselInteractionTimeoutRef.current) {
      clearTimeout(carouselInteractionTimeoutRef.current);
    }
    // Resume after a short delay to allow user to finish interacting
    carouselInteractionTimeoutRef.current = setTimeout(() => {
      setIsAutoScrollPaused(false);
    }, 500);
  }, []);

  // Handle hover events for pause/resume
  const handleMouseEnter = useCallback(() => {
    setIsAutoScrollPaused(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    // Only resume if not manually scrolling
    if (!isManualScrollingRef.current) {
      setIsAutoScrollPaused(false);
    }
  }, []);

  // Handle touch events for mobile
  const handleTouchStart = useCallback(() => {
    setIsAutoScrollPaused(true);
  }, []);

  const handleTouchEnd = useCallback(() => {
    // Resume after a short delay
    if (manualScrollTimeoutRef.current) {
      clearTimeout(manualScrollTimeoutRef.current);
    }
    manualScrollTimeoutRef.current = setTimeout(() => {
      setIsAutoScrollPaused(false);
    }, 2000);
  }, []);

  // Handle manual scroll detection
  const handleScroll = useCallback(() => {
    isManualScrollingRef.current = true;
    setIsAutoScrollPaused(true);
    
    // Clear any existing timeout
    if (manualScrollTimeoutRef.current) {
      clearTimeout(manualScrollTimeoutRef.current);
    }
    
    // Resume auto-scroll after user stops scrolling
    manualScrollTimeoutRef.current = setTimeout(() => {
      isManualScrollingRef.current = false;
      setIsAutoScrollPaused(false);
    }, 3000);
  }, []);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (carouselInteractionTimeoutRef.current) {
        clearTimeout(carouselInteractionTimeoutRef.current);
      }
      if (manualScrollTimeoutRef.current) {
        clearTimeout(manualScrollTimeoutRef.current);
      }
    };
  }, []);

  // Top cities data with background images from public/city-projects folder
  const topCities = [
    { 
      name: "Mumbai", 
      image: "/city-projects/Mumbai.jpg"
    },
    { 
      name: "Delhi", 
      image: "/city-projects/Delhi.jpg"
    },
    { 
      name: "Bangalore", 
      image: "/city-projects/Banglore.jpg"
    },
    { 
      name: "Hyderabad", 
      image: "/city-projects/Hydrabad.jpg"
    },
    { 
      name: "Chennai", 
      image: "/city-projects/Chennai.jpg"
    },
    { 
      name: "Pune", 
      image: "/city-projects/Pune.jpg"
    },
    { 
      name: "Kolkata", 
      image: "/city-projects/Kolkata.jpg"
    },
    { 
      name: "Ahmedabad", 
      image: "/city-projects/Ahmedabad.jpg"
    },
  ];

  const handleProjectsClick = (city) => {
    navigate(`/buyer-dashboard/search?city=${encodeURIComponent(city)}`);
  };

  const handleKeyDown = (e, city) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleProjectsClick(city);
    }
  };

  const handleViewAllClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    navigate('/buyer-dashboard/search');
  };

  return (
    <div className="buyer-page-wrapper home-page">
      {/* Search Bar */}
      <BuyerSearchBar />
      {/* Upcoming Projects Section */}
      <UpcomingProjectsSection />

      {/* Mixed Properties Section */}
      <div className="buyer-home-properties-section">
        <div className="buyer-section-header">
          <div className="buyer-section-header-content">
            <div>
              <h1>Explore Properties</h1>
              <p>Buy or Rent — All in One Place</p>
            </div>
            <button 
              className="buyer-view-all-btn"
              onClick={handleViewAllClick}
              aria-label="View all properties"
            >
              View All
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <p>Loading properties...</p>
          </div>
        ) : error ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#c33' }}>
            <p>{error}</p>
            <button 
              onClick={() => window.location.reload()} 
              style={{ marginTop: '1rem', padding: '0.5rem 1rem', cursor: 'pointer' }}
            >
              Retry
            </button>
          </div>
        ) : properties.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <p>No properties available at the moment.</p>
          </div>
        ) : (
          <div 
            className={`buyer-horizontal-scroll-container buyer-auto-scroll-container ${isAutoScrollPaused ? 'paused' : ''}`}
            ref={scrollContainerRef}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            onScroll={handleScroll}
          >
            <div 
              className="buyer-property-cards-wrapper buyer-auto-scroll-wrapper"
              ref={wrapperRef}
            >
              {/* Original cards */}
              {properties.map((property) => (
                <PropertyCard 
                  key={`original-${property.id}`} 
                  property={property}
                  onCarouselInteractionStart={handleCarouselInteractionStart}
                  onCarouselInteractionEnd={handleCarouselInteractionEnd}
                  onCardMouseEnter={handleMouseEnter}
                  onCardMouseLeave={handleMouseLeave}
                />
              ))}
              {/* Duplicated cards for infinite loop effect */}
              {properties.map((property) => (
                <PropertyCard 
                  key={`duplicate-${property.id}`} 
                  property={property}
                  onCarouselInteractionStart={handleCarouselInteractionStart}
                  onCarouselInteractionEnd={handleCarouselInteractionEnd}
                  onCardMouseEnter={handleMouseEnter}
                  onCardMouseLeave={handleMouseLeave}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      

      {/* SECTION: Browse Residential Projects in Top Cities */}
      <div className="buyer-city-projects-section">
        <div className="buyer-section-header">
          <h2>Browse Residential Projects in Top Cities</h2>
          <p>Explore premium residential projects across India</p>
        </div>

        <div className="buyer-city-projects-grid">
          {topCities.map((city) => (
            <div
              key={city.name}
              className="buyer-city-project-card"
              onClick={() => handleProjectsClick(city.name)}
              onKeyDown={(e) => handleKeyDown(e, city.name)}
              tabIndex={0}
              role="button"
              aria-label={`Explore projects in ${city.name}`}
              style={{ backgroundImage: `url(${city.image})` }}
            >
              <div className="buyer-city-project-overlay"></div>
              <div className="buyer-city-project-content">
                <h3 className="buyer-city-project-name">{city.name}</h3>
                <p className="buyer-city-project-subtitle">Explore Projects</p>
                <div className="buyer-city-project-arrow">
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
                    <path d="M5 12h14"></path>
                    <path d="m12 5 7 7-7 7"></path>
                  </svg>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};

export default Home;