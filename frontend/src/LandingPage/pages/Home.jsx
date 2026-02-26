import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import SearchBar from '../components/Searchbar';
import Explore from '../components/Explore';
import PopularCities from '../components/PopularCities';
import PropertyCard from '../../UserDashboard/components/PropertyCard';
import UpcomingProjectsSection from '../components/UpcomingProjectsSection';
import { propertiesAPI } from '../../services/api.service';
import '../../UserDashboard/styles/BuyerHome.css';
import '../../UserDashboard/styles/PropertyCard.css';

const Home = () => {
  const navigate = useNavigate();
  const [properties, setProperties] = useState([]);
  
  // Scroll to top only on initial mount, not on every render
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  const [loading, setLoading] = useState(true);
  
  // Auto-scroll state (same as BuyerHome: scrollLeft-driven so manual scroll works)
  const [isAutoScrollPaused, setIsAutoScrollPaused] = useState(false);
  const scrollContainerRef = useRef(null);
  const wrapperRef = useRef(null);
  const carouselInteractionTimeoutRef = useRef(null);
  const manualScrollTimeoutRef = useRef(null);
  const isManualScrollingRef = useRef(false);
  const isProgrammaticScrollRef = useRef(false);
  const autoScrollAnimationRef = useRef(null);
  const lastFrameTimeRef = useRef(null);

  // Scroll-based auto-scroll: animate scrollLeft (same logic as BuyerHome)
  useEffect(() => {
    if (isAutoScrollPaused) return;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;
    const container = scrollContainerRef.current;
    const wrapper = wrapperRef.current;
    if (!container || !wrapper) return;

    const scrollWidth = wrapper.scrollWidth;
    const halfWidth = scrollWidth / 2;
    // Faster: ~50% in 120s (was 400s)
    const pixelsPerSecond = halfWidth / 120;

    const tick = (now) => {
      lastFrameTimeRef.current = lastFrameTimeRef.current ?? now;
      const delta = Math.min((now - lastFrameTimeRef.current) / 1000, 0.2);
      lastFrameTimeRef.current = now;

      const next = container.scrollLeft + pixelsPerSecond * delta;
      isProgrammaticScrollRef.current = true;
      if (next >= halfWidth) {
        container.scrollLeft = next - halfWidth;
      } else {
        container.scrollLeft = next;
      }
      requestAnimationFrame(() => {
        isProgrammaticScrollRef.current = false;
      });
      autoScrollAnimationRef.current = requestAnimationFrame(tick);
    };

    autoScrollAnimationRef.current = requestAnimationFrame(tick);
    return () => {
      if (autoScrollAnimationRef.current) {
        cancelAnimationFrame(autoScrollAnimationRef.current);
      }
      lastFrameTimeRef.current = null;
    };
  }, [isAutoScrollPaused]);

  useEffect(() => {
    const fetchProperties = async () => {
      try {
        setLoading(true);
        const response = await propertiesAPI.list({ limit: 50 });
        
        if (response.success && response.data && response.data.properties) {
          // Convert backend properties to frontend format (matching Buyer Dashboard)
          const backendProperties = response.data.properties.map(prop => {
            // Get the best image (cover_image or first image from array)
            let imageUrl = null;
            
            if (prop.cover_image && prop.cover_image.trim() !== '') {
              imageUrl = prop.cover_image;
            } else if (Array.isArray(prop.images) && prop.images.length > 0) {
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
              // Additional fields for compatibility
              propertyType: prop.property_type,
              projectType: prop.project_type || null,
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
        } else {
          setProperties([]);
        }
      } catch (error) {
        console.error('Error fetching properties:', error);
        setProperties([]);
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

  // Handle manual scroll detection (ignore programmatic scroll from auto-scroll)
  const handleScroll = useCallback(() => {
    if (isProgrammaticScrollRef.current) return;
    isManualScrollingRef.current = true;
    setIsAutoScrollPaused(true);

    if (manualScrollTimeoutRef.current) {
      clearTimeout(manualScrollTimeoutRef.current);
    }
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

  const handleViewAllProperties = (e) => {
    e.preventDefault();
    e.stopPropagation();
    navigate('/buyer-dashboard/search');
  };

  return (
    <div>
      <SearchBar heroImage="/Homeeuserr.jpeg" />
        {/* Upcoming Projects Section */}
        <UpcomingProjectsSection />

      
      {/* Mixed Properties Section - Matching Buyer Dashboard structure */}
      <div className="buyer-home-properties-section">
        <div className="buyer-section-header">
          <div className="buyer-section-header-content">
            <div>
              <h1>Explore Properties</h1>
              <p>Buy or Rent — All in One Place</p>
            </div>
            <button
              className="buyer-view-all-btn"
              onClick={handleViewAllProperties}
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
                />
              ))}
              {/* Duplicated cards for infinite loop effect */}
              {properties.map((property) => (
                <PropertyCard 
                  key={`duplicate-${property.id}`} 
                  property={property}
                  onCarouselInteractionStart={handleCarouselInteractionStart}
                  onCarouselInteractionEnd={handleCarouselInteractionEnd}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <PopularCities />
      
    </div>
  );
};

export default Home;