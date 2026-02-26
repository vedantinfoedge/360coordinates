import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import PropertyCard from '../components/PropertyCard';
import BuyerSearchBar from '../components/BuyerSearchBar';
import { propertiesAPI } from '../../services/api.service';
import '../styles/Filteredproperties.css';

const CityFilteredRent = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const cityParam = searchParams.get('city');
  const [filteredProperties, setFilteredProperties] = useState([]);
  const [loading, setLoading] = useState(true);

  const handleViewAllClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    navigate('/buyer-dashboard/search?propertyType=rent');
  };
  
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, []);


  useEffect(() => {
    const fetchProperties = async () => {
      try {
        setLoading(true);
        const apiParams = {
          status: 'rent',
          limit: 100
        };
        
        if (cityParam) {
          apiParams.location = cityParam;
        }
        
        const response = await propertiesAPI.list(apiParams);
        
        if (response.success && response.data && response.data.properties) {
          // Convert backend properties to frontend format and filter only 'rent' properties
          // Exclude upcoming projects - they should only appear in Upcoming Projects section
          const backendProperties = response.data.properties
            .filter(prop => {
              // Only include rent properties and exclude upcoming projects
              const isRent = prop.status === 'rent' || prop.status === 'For Rent';
              const isNotUpcoming = !prop.project_type || prop.project_type !== 'upcoming';
              return isRent && isNotUpcoming;
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
                status: 'For Rent', // Always set to 'For Rent' for this page
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

  return (
    <div className="buyer-filtered-properties-page">
      {/* Search Bar */}
      <BuyerSearchBar 
        status="For Rent"
        title="Explore the Best Rentals in Your City"
        subtitle="Search from thousands of verified properties across India"
        backgroundImage="/Renthome1.jpg"
      />

      <div className="buyer-filtered-header">
        <div className="buyer-filtered-header-content">
          <div>
            <h1>
              {cityParam ? `Properties for Rent in ${cityParam}` : 'All Properties for Rent'}
            </h1>
            <p className="buyer-filtered-count">
              {filteredProperties.length} {filteredProperties.length === 1 ? 'property' : 'properties'} found
            </p>
          </div>
          <button 
            className="buyer-view-all-btn"
            onClick={handleViewAllClick}
            aria-label="View all properties for rent"
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
            <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"></path>
            <path d="M14 2v4a2 2 0 0 0 2 2h4"></path>
            <path d="M10 9H8"></path>
            <path d="M16 13H8"></path>
            <path d="M16 17H8"></path>
          </svg>
          <h2>No Properties Found</h2>
          <p>
            {cityParam
              ? `We couldn't find any properties for rent in ${cityParam} at the moment.`
              : 'No properties available for rent.'}
          </p>
        </div>
      )}
    </div>
  );
};

export default CityFilteredRent;