import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import PropertyCard from '../components/PropertyCard';
import BuyerSearchBar from '../components/BuyerSearchBar';
import { propertiesAPI } from '../../services/api.service';
import '../styles/Filteredproperties.css';

const CityFilteredBuy = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const cityParam = searchParams.get('city');
  const [filteredProperties, setFilteredProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid');

  const handleViewAllClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    navigate('/buyer-dashboard/search?propertyType=buy');
  };
  
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, []);

  useEffect(() => {
    const fetchProperties = async () => {
      try {
        setLoading(true);
        const apiParams = {
          status: 'sale',
          limit: 100
        };
        
        if (cityParam) {
          apiParams.location = cityParam;
        }
        
        const response = await propertiesAPI.list(apiParams);
        
        if (response.success && response.data && response.data.properties) {
          // Convert backend properties to frontend format and filter only 'sale' properties
          // Exclude upcoming projects - they should only appear in Upcoming Projects section
          const backendProperties = response.data.properties
            .filter(prop => {
              // Only include sale properties and exclude upcoming projects
              const isSale = prop.status === 'sale' || prop.status === 'For Sale';
              const isNotUpcoming = !prop.project_type || prop.project_type !== 'upcoming';
              return isSale && isNotUpcoming;
            })
            .map(prop => {
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
                status: 'For Sale', // Always set to 'For Sale' for this page
                propertyType: prop.property_type,
                projectType: prop.project_type || null, // Include project_type for reference
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
          
          setFilteredProperties(backendProperties);
        } else {
          setFilteredProperties([]);
        }
      } catch (error) {
        console.error('Error fetching properties:', error);
        setFilteredProperties([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProperties();
  }, [cityParam]);

  // Toggle between grid and list view
  const toggleViewMode = () => {
    setViewMode(viewMode === 'grid' ? 'list' : 'grid');
  };

  return (
    <div className="buyer-filtered-properties-page">
      {/* Search Bar */}
      <BuyerSearchBar 
        status="For Sale"
        title="Discover Properties Ready to Buy"
        subtitle="Search from thousands of verified properties across India"
        backgroundImage="/buyeee.jpeg"
      />

      <div className="buyer-filtered-header">
        <div className="buyer-filtered-header-content">
          <div>
            <h1>
              {cityParam ? `Properties for Sale in ${cityParam}` : 'All Properties for Sale'}
            </h1>
            <p className="buyer-filtered-count">
              {filteredProperties.length} {filteredProperties.length === 1 ? 'property' : 'properties'} found
            </p>
          </div>
          <button 
            className="buyer-view-all-btn"
            onClick={handleViewAllClick}
            aria-label="View all properties for sale"
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
      ) : filteredProperties.length > 0 ? (
        <div className="buyer-filtered-properties-grid">
          {filteredProperties.map((property) => (
            <PropertyCard key={property.id} property={property} />
          ))}
        </div>
      ) : (
        <div className="buyer-no-properties">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="64"
            height="64"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
            <polyline points="9 22 9 12 15 12 15 22"></polyline>
          </svg>
          <h2>No Properties Found</h2>
          <p>
            {cityParam
              ? `We couldn't find any properties for sale in ${cityParam} at the moment.`
              : 'No properties available for sale.'}
          </p>
        </div>
        
      )}
    </div>
  );
};

export default CityFilteredBuy;