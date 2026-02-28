import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import PropertyCard from '../components/PropertyCard';
import { propertiesAPI } from '../../services/api.service';
import LocationAutoSuggest from '../../components/LocationAutoSuggest/LocationAutoSuggest';
import '../styles/Filteredproperties.css';
import '../styles/BuyerSearchBar.css';

const CityProjects = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const cityParam = searchParams.get('city');
  const [filteredProperties, setFilteredProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, []);
  // SearchBar state
  const [searchData, setSearchData] = useState({
    location: '',
    propertyType: '',
    budget: '',
    bedrooms: ''
  });

  const propertyTypes = ['Apartment', 'Villa', 'Plot', 'Commercial',"PG / Hostel","Independent House","Row House","Bungalow","Studio Apartment","Penthouse","Farm House","Industrial N/A Land ","Plot / Land","Commercial Office","Commercial Shop","Retail Space","Warehouse / Godown","Industrial Property","Hotel / Guest House",];
  const bedroomOptions = ['1', '2', '3', '4', '5+'];
  const budgetRanges = [
    '0-25L',
    '25L-50L',
    '50L-75L',
    '75L-1Cr',
    '1Cr-2Cr',
    '2Cr+'
  ];

  const topCities = [
    'Mumbai',
    'Delhi',
    'Bangalore',
    'Hyderabad',
    'Ahmedabad',
    'Chennai',
    'Kolkata',
    'Pune',
    'Jaipur',
    'Surat'
  ];

  // SearchBar handlers
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setSearchData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSearch = (e) => {
    e.preventDefault();
    
    // Build query string
    const queryParams = new URLSearchParams();
    if (searchData.location) queryParams.append('location', searchData.location);
    if (searchData.propertyType) queryParams.append('type', searchData.propertyType);
    if (searchData.budget) queryParams.append('budget', searchData.budget);
    if (searchData.bedrooms) queryParams.append('bedrooms', searchData.bedrooms);
    
    // Navigate to search results page
    navigate(`/searchresults?${queryParams.toString()}`);
  };

  const handleQuickSearch = (city) => {
    navigate(`/searchresults?location=${city}`);
  };

  const handleBackClick = () => {
    navigate('/');
  };

  useEffect(() => {
    const fetchProperties = async () => {
      try {
        setLoading(true);
        const apiParams = {
          limit: 100
        };
        
        if (cityParam) {
          apiParams.location = cityParam;
        }
        
        const response = await propertiesAPI.list(apiParams);
        
        if (response.success && response.data && response.data.properties) {
          const backendProperties = response.data.properties.map(prop => {
            let imageUrl = prop.cover_image || 
                          (Array.isArray(prop.images) && prop.images.length > 0 ? prop.images[0] : null) ||
                          'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=500';
            
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
              status: prop.status === 'sale' ? 'For Sale' : (prop.status === 'rent' ? 'For Rent' : prop.status)
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
      {/* ========== SEARCH BAR WITH BACK BUTTON - START ========== */}
      <div className="buyer-search-bar-container">
        <div className="buyer-search-bar-wrapper">
          {/* Back Button */}
          <button onClick={handleBackClick} className="buyer-search-back-button">
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
              <path d="M19 12H5"></path>
              <path d="M12 19l-7-7 7-7"></path>
            </svg>
          </button>

          <h2 className="buyer-search-title">Find Your Dream Property</h2>
          <p className="buyer-search-subtitle">Search from thousands of verified properties across India</p>
          
          <form className="buyer-search-form" onSubmit={handleSearch}>
            <div className="buyer-search-inputs">
              {/* Location Input */}
              <div className="buyer-search-field">
                <label htmlFor="location" className="buyer-search-label">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                  </svg>
                  Location
                </label>
                <LocationAutoSuggest
                  placeholder="City / Locality"
                  value={searchData.location}
                  onChange={(locationData) => {
                    if (!locationData) {
                      setSearchData(prev => ({ ...prev, location: '' }));
                      return;
                    }
                    setSearchData(prev => ({
                      ...prev,
                      location: locationData.fullAddress || locationData.placeName || ''
                    }));
                  }}
                />
              </div>

              {/* Property Type */}
              <div className="buyer-search-field">
                <label htmlFor="propertyType" className="buyer-search-label">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
                  </svg>
                  Property Type
                </label>
                <select
                  id="propertyType"
                  name="propertyType"
                  value={searchData.propertyType}
                  onChange={handleInputChange}
                  className="buyer-search-select"
                >
                  <option value="">All Types</option>
                  {propertyTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              {/* Budget Range */}
              <div className="buyer-search-field">
                <label htmlFor="budget" className="buyer-search-label">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                  Budget
                </label>
                <select
                  id="budget"
                  name="budget"
                  value={searchData.budget}
                  onChange={handleInputChange}
                  className="buyer-search-select"
                >
                  <option value="">Any Budget</option>
                  {budgetRanges.map(range => (
                    <option key={range} value={range}>{range}</option>
                  ))}
                </select>
              </div>

              {/* Bedrooms */}
              <div className="buyer-search-field">
                <label htmlFor="bedrooms" className="buyer-search-label">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
                  </svg>
                  Bedrooms
                </label>
                <select
                  id="bedrooms"
                  name="bedrooms"
                  value={searchData.bedrooms}
                  onChange={handleInputChange}
                  className="buyer-search-select"
                >
                  <option value="">Any</option>
                  {bedroomOptions.map(option => (
                    <option key={option} value={option}>{option} BHK</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Search Button */}
            <button type="submit" className="buyer-search-button">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
              </svg>
              <span>Search Properties</span>
            </button>
          </form>

          {/* Quick Search Cities */}
          <div className="buyer-quick-search">
            <span className="buyer-quick-search-label">Popular Cities:</span>
            <div className="buyer-quick-search-buttons">
              {topCities.map(city => (
                <button
                  key={city}
                  type="button"
                  onClick={() => handleQuickSearch(city)}
                  className="buyer-quick-search-btn"
                >
                  {city}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
      {/* ========== SEARCH BAR WITH BACK BUTTON - END ========== */}

      <div className="buyer-filtered-header">
        <h1>
          {cityParam ? `Residential Projects in ${cityParam}` : 'All Residential Projects'}
        </h1>
        <p className="buyer-filtered-count">
          {filteredProperties.length} {filteredProperties.length === 1 ? 'project' : 'projects'} found
        </p>
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
            <rect x="3" y="3" width="7" height="7"></rect>
            <rect x="14" y="3" width="7" height="7"></rect>
            <rect x="14" y="14" width="7" height="7"></rect>
            <rect x="3" y="14" width="7" height="7"></rect>
          </svg>
          <h2>No Projects Found</h2>
          <p>
            {cityParam
              ? `We couldn't find any residential projects in ${cityParam} at the moment.`
              : 'No projects available.'}
          </p>
        </div>
      )}
    </div>
  );
};

export default CityProjects;