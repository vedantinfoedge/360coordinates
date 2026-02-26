import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import PropertyCard from '../components/PropertyCard';
import BuyerSearchBar from '../components/BuyerSearchBar';
import { propertiesAPI } from '../../services/api.service';
import '../styles/Filteredproperties.css';

const CityFilteredPGHostel = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const cityParam = searchParams.get('city');
  const [filteredProperties, setFilteredProperties] = useState([]);
  const [loading, setLoading] = useState(true);

  const handleViewAllClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    navigate('/buyer-dashboard/search?propertyType=pg');
  };
  
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, []);


  useEffect(() => {
    const fetchProperties = async () => {
      try {
        setLoading(true);
        // Fetch all properties to filter for PG/Hostel OR available_for_bachelors
        const apiParams = {
          limit: 1000, // Increased limit to get more properties for filtering
        };
        
        if (cityParam) {
          apiParams.location = cityParam;
        }
        
        // Fetch properties with PG/Hostel type
        const pgHostelResponse = await propertiesAPI.list({
          ...apiParams,
          property_type: 'PG / Hostel'
        });
        
        // Fetch properties available for bachelors
        const bachelorsResponse = await propertiesAPI.list({
          ...apiParams,
          available_for_bachelors: true
        });
        
        // Combine and deduplicate properties
        const allProperties = [];
        const propertyIds = new Set();
        
        if (pgHostelResponse.success && pgHostelResponse.data && pgHostelResponse.data.properties) {
          pgHostelResponse.data.properties.forEach(prop => {
            if (!propertyIds.has(prop.id)) {
              propertyIds.add(prop.id);
              allProperties.push(prop);
            }
          });
        }
        
        if (bachelorsResponse.success && bachelorsResponse.data && bachelorsResponse.data.properties) {
          bachelorsResponse.data.properties.forEach(prop => {
            if (!propertyIds.has(prop.id)) {
              propertyIds.add(prop.id);
              allProperties.push(prop);
            }
          });
        }
        
        if (allProperties.length > 0) {
          // Convert backend properties to frontend format and filter:
          // Show properties that are either PG / Hostel OR available for bachelors
          // Note: Shows both sale and rent properties
          const backendProperties = allProperties
            .filter(prop => {
              const propType = prop.property_type || '';
              const isPGHostel = propType === 'PG / Hostel';
              const isAvailableForBachelors = prop.available_for_bachelors === 1 || prop.available_for_bachelors === true;
              // Show if it's PG/Hostel OR available for bachelors
              return isPGHostel || isAvailableForBachelors;
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
                status: prop.status === 'rent' ? 'For Rent' : (prop.status === 'sale' ? 'For Sale' : prop.status || 'For Rent'),
                propertyType: prop.property_type,
                description: prop.description || '',
                amenities: Array.isArray(prop.amenities) ? prop.amenities : (prop.amenities ? [prop.amenities] : []),
                images: Array.isArray(prop.images) ? prop.images : (prop.images ? [prop.images] : []),
                latitude: prop.latitude,
                longitude: prop.longitude,
                createdAt: prop.created_at,
                seller_name: prop.seller_name,
                seller_phone: prop.seller_phone,
                available_for_bachelors: prop.available_for_bachelors || 0
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
        title="Explore PG & Hostel Options"
        subtitle="Search from thousands of verified PG and Hostel properties across India"
        backgroundImage="/pghostel.jpg"
        defaultPropertyType="PG / Hostel"
      />

      <div className="buyer-filtered-header">
        <div className="buyer-filtered-header-content">
          <div>
            <h1>
              {cityParam ? `PG & Hostel Properties and Properties for Bachelors in ${cityParam}` : 'All PG & Hostel Properties and Properties for Bachelors'}
            </h1>
            <p className="buyer-filtered-count">
              {filteredProperties.length} {filteredProperties.length === 1 ? 'property' : 'properties'} found
            </p>
          </div>
          <button 
            className="buyer-view-all-btn"
            onClick={handleViewAllClick}
            aria-label="View all PG and hostel properties"
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
              ? `We couldn't find any PG/Hostel properties or properties available for bachelors in ${cityParam} at the moment.`
              : 'No PG/Hostel properties or properties available for bachelors found.'}
          </p>
        </div>
      )}
    </div>
  );
};

export default CityFilteredPGHostel;

