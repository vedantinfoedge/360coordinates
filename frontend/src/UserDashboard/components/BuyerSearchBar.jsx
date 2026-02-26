import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import LocationAutoSuggest from '../../components/LocationAutoSuggest/LocationAutoSuggest';
import '../styles/BuyerSearchBar.css';

const SearchBar = ({ 
  status = null, // 'For Sale' or 'For Rent' or null for all
  title = 'Find Your Dream Property',
  subtitle = 'Search from thousands of verified properties across India',
  backgroundImage = '/Homeeuserr.jpeg',
  defaultPropertyType = null // Auto-apply property type (e.g., 'PG / Hostel' for PG Hostel page)
}) => {
  const navigate = useNavigate();

  const [searchData, setSearchData] = useState({
    location: '',
    propertyType: '',
    budget: '',
    bedrooms: '',
    area: ''
  });

  const [selectedLocation, setSelectedLocation] = useState(null);

  const propertyTypes = [
    'Apartment',
    'Studio Apartment',
    'Villa / Row House / Bungalow / Farm House',
    'Penthouse',
    'Plot / Land / Industrial Property',
    'Commercial Office',
    'Commercial Shop',
    'Co-working Space',
    'Warehouse / Godown',
    'PG / Hostel'
  ];

  const bedroomBasedTypes = [
    'Apartment',
    'Studio Apartment',
    'Villa / Row House / Bungalow / Farm House',
    'Penthouse',
    'PG / Hostel'
  ];

  const areaBasedTypes = [
    'Plot / Land / Industrial Property',
    'Commercial Office',
    'Commercial Shop',
    'Co-working Space',
    'Warehouse / Godown'
  ];

  const bedroomOptions = ['1 BHK', '2 BHK', '3 BHK', '4 BHK', '5+ BHK'];

  const areaRanges = [
    '0-500 sq ft',
    '500-1000 sq ft',
    '1000-2000 sq ft',
    '2000-5000 sq ft',
    '5000-10000 sq ft',
    '10000+ sq ft'
  ];

  const rentResidentialBudget = [
    '0K-5K',
    '5K-10K',
    '10K-20K',
    '20K-30K',
    '30K-50K',
    '50K-75K',
    '75K-1L',
    '1L-2L',
    '2L+'
  ];

  const saleResidentialBudget = [
    '0-25L',
    '25L-50L',
    '50L-75L',
    '75L-1Cr',
    '1Cr-2Cr',
    '2Cr-5Cr',
    '5Cr+'
  ];

  const commercialBudget = [
    '0-50L',
    '50L-1Cr',
    '1Cr-2Cr',
    '2Cr-5Cr',
    '5Cr-10Cr',
    '10Cr-25Cr',
    '25Cr+'
  ];

  const commercialRentBudget = [
    '0-10K',
    '10K-25K',
    '25K-50K',
    '50K-1L',
    '1L-2L',
    '2L-5L',
    '5L+'
  ];

  const isBedroomBased = useMemo(() => bedroomBasedTypes.includes(searchData.propertyType), [searchData.propertyType]);
  const isAreaBased = useMemo(() => areaBasedTypes.includes(searchData.propertyType), [searchData.propertyType]);

  const getBudgetRanges = () => {
    // If status is provided, use status-specific budgets
    if (status === 'For Sale') {
      // For Sale: use sale budgets
      if (!searchData.propertyType) {
        return saleResidentialBudget;
      }
      const propertyBudgetMap = {
        'Apartment': saleResidentialBudget,
        'Studio Apartment': saleResidentialBudget,
        'Villa / Row House / Bungalow / Farm House': saleResidentialBudget,
        'Penthouse': saleResidentialBudget,
        'PG / Hostel': saleResidentialBudget,
        'Plot / Land / Industrial Property': commercialBudget,
        'Commercial Office': commercialBudget,
        'Commercial Shop': commercialBudget,
        'Co-working Space': commercialBudget,
        'Warehouse / Godown': commercialBudget
      };
      return propertyBudgetMap[searchData.propertyType] || saleResidentialBudget;
    } else if (status === 'For Rent') {
      // For Rent: use rent budgets
      if (!searchData.propertyType) {
        return rentResidentialBudget;
      }
      const propertyBudgetMap = {
        'Apartment': rentResidentialBudget,
        'Studio Apartment': rentResidentialBudget,
        'Villa / Row House / Bungalow / Farm House': rentResidentialBudget,
        'Penthouse': rentResidentialBudget,
        'PG / Hostel': rentResidentialBudget,
        'Plot / Land / Industrial Property': commercialRentBudget,
        'Commercial Office': commercialRentBudget,
        'Commercial Shop': commercialRentBudget,
        'Co-working Space': commercialRentBudget,
        'Warehouse / Godown': commercialRentBudget
      };
      return propertyBudgetMap[searchData.propertyType] || rentResidentialBudget;
    } else {
      // Default: home page logic
      if (!searchData.propertyType) {
        return saleResidentialBudget;
      }
      const propertyBudgetMap = {
        'Apartment': saleResidentialBudget,
        'Studio Apartment': saleResidentialBudget,
        'Villa / Row House / Bungalow / Farm House': saleResidentialBudget,
        'Penthouse': saleResidentialBudget,
        'PG / Hostel': rentResidentialBudget,
        'Plot / Land / Industrial Property': commercialBudget,
        'Commercial Office': commercialBudget,
        'Commercial Shop': commercialBudget,
        'Co-working Space': commercialRentBudget,
        'Warehouse / Godown': commercialRentBudget
      };
      return propertyBudgetMap[searchData.propertyType] || saleResidentialBudget;
    }
  };

  const budgetRanges = useMemo(() => getBudgetRanges(), [searchData.propertyType, status]);

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

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    if (name === 'propertyType') {
      setSearchData(prev => ({
        ...prev,
        propertyType: value,
        bedrooms: '',
        area: '',
        budget: ''
      }));
    } else if (name === 'location') {
      setSearchData(prev => ({
        ...prev,
        location: value
      }));
    } else {
      setSearchData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSearch = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
  
    console.log('🔍 Search initiated with data:', searchData);
    console.log('📍 Selected location:', selectedLocation);
  
    const queryParams = new URLSearchParams();
    const loc = selectedLocation;
  
    // IMPROVED CITY EXTRACTION - Replace the existing city logic with this:
    let cityToAdd = null;
    
    // Priority 1: Check selectedLocation.city
    if (loc && loc.city) {
      cityToAdd = loc.city;
    }
    // Priority 2: Check if location string contains city (extract from comma-separated format)
    else if (searchData.location && searchData.location.trim() !== '') {
      const locationParts = searchData.location.split(',').map(part => part.trim());
      // For formats like "Locality, City" or "City" - take the last meaningful part or second-to-last
      if (locationParts.length >= 2) {
        // Usually: "Locality, City, State" - city is second part
        cityToAdd = locationParts[locationParts.length - 2];
      } else if (locationParts.length === 1) {
        // Just "City"
        cityToAdd = locationParts[0];
      }
    }
    // Priority 3: Check selectedLocation for alternative properties
    else if (loc) {
      // Check various possible property names
      cityToAdd = loc.city_name || loc.cityName || loc.locality || loc.administrative_area_level_2;
    }
  
    // Add city if we found one
    if (cityToAdd && cityToAdd.length > 1 && cityToAdd.length < 50) {
      queryParams.append('city', cityToAdd);
      console.log('✅ Added city:', cityToAdd);
    } else {
      console.log('⚠️ No city found to add');
    }
    
    // Add location (prefer placeName from selectedLocation, fallback to searchData.location)
    if (loc && loc.placeName) {
      queryParams.append('location', loc.placeName);
      console.log('✅ Added location (placeName):', loc.placeName);
    } else if (searchData.location && searchData.location.trim() !== '') {
      queryParams.append('location', searchData.location.trim());
      console.log('✅ Added location (searchData):', searchData.location);
    }

    // Add coordinates if available
    if (loc && loc.coordinates && loc.coordinates.lat && loc.coordinates.lng) {
      queryParams.append('lat', String(loc.coordinates.lat));
      queryParams.append('lng', String(loc.coordinates.lng));
      queryParams.append('radius', '10');
      console.log('✅ Added coordinates:', loc.coordinates);
    }

    // Add property type
    // If defaultPropertyType is provided and user hasn't selected a different type, use default
    const propertyTypeToUse = (searchData.propertyType && searchData.propertyType.trim() !== '') 
      ? searchData.propertyType 
      : (defaultPropertyType || '');
    
    if (propertyTypeToUse && propertyTypeToUse.trim() !== '') {
      queryParams.append('property_type', propertyTypeToUse);
      console.log('✅ Added property_type:', propertyTypeToUse, defaultPropertyType ? '(default from page)' : '');
    }
    
    // Add budget
    if (searchData.budget && searchData.budget.trim() !== '') {
      queryParams.append('budget', searchData.budget);
      console.log('✅ Added budget:', searchData.budget);
    }

    // Add bedrooms or area based on property type
    if (isBedroomBased && searchData.bedrooms && searchData.bedrooms.trim() !== '') {
      queryParams.append('bedrooms', searchData.bedrooms);
      console.log('✅ Added bedrooms:', searchData.bedrooms);
    } else if (isAreaBased && searchData.area && searchData.area.trim() !== '') {
      queryParams.append('area', searchData.area);
      console.log('✅ Added area:', searchData.area);
    }

    // Add status if provided
    if (status) {
      queryParams.append('status', status);
      console.log('✅ Added status:', status);
    }

    const queryString = queryParams.toString();
    const searchUrl = queryString ? `/buyer-dashboard/search?${queryString}` : '/buyer-dashboard/search';
    
    console.log('🚀 Navigating to:', searchUrl);
    console.log('📋 Query params:', queryString);

    // Navigate to search results and scroll to top
    navigate(searchUrl);
    
    // Scroll to top after navigation to show search results
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 100);
  };

  const handleQuickSearch = (city) => {
    const queryParams = new URLSearchParams();
    // Add both city and location for better filtering
    queryParams.append('city', city);
    queryParams.append('location', city);
    // Only add status if explicitly provided (don't auto-apply from page context)
    // This prevents "For Sale" from being auto-applied when user searches from home page
    if (status) {
      queryParams.append('status', status);
    }
    navigate(`/buyer-dashboard/search?${queryParams.toString()}`);
  };

  const bgSrc = backgroundImage ? `${process.env.PUBLIC_URL || ''}${backgroundImage}` : null;

  return (
    <div className="buyer-search-bar-hero">
      {bgSrc && <img src={bgSrc} alt="" className="buyer-search-bar-bg-image" />}
      <div className="buyer-search-bar-container">
      <div className="buyer-search-bar-wrapper">
        <h2 className="buyer-search-title">{title}</h2>
        <p className="buyer-search-subtitle">{subtitle}</p>

        <form 
          className="buyer-search-form" 
          onSubmit={(e) => {
            console.log('📝 Form submitted');
            handleSearch(e);
          }}
          noValidate
        >
          <div className="buyer-search-inputs">
            {/* Location Input */}
            <div className="buyer-search-field">
              <label htmlFor="location" className="buyer-search-label">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Location
              </label>
              <LocationAutoSuggest
                placeholder="City / Locality"
                value={searchData.location}
                onChange={(locationData) => {
                  if (!locationData) {
                    setSelectedLocation(null);
                    setSearchData(prev => ({ ...prev, location: '' }));
                    return;
                  }
                  
                  // Extract city from locationData or location string
                  let extractedCity = locationData.city || '';
                  
                  // If locationData doesn't have city, try to extract from location string
                  if (!extractedCity && (locationData.fullAddress || locationData.placeName)) {
                    const locationStr = (locationData.fullAddress || locationData.placeName || '').trim();
                    const parts = locationStr.split(',').map(p => p.trim()).filter(p => p.length > 0);
                    
                    // For formats like "Locality, City, State" - city is usually the second part
                    if (parts.length >= 2) {
                      extractedCity = parts[1];
                    } else if (parts.length === 1) {
                      extractedCity = parts[0];
                    }
                  }
                  
                  setSelectedLocation({
                    ...locationData,
                    city: extractedCity
                  });
                  
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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
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

            {/* Bedrooms / Area - Dynamic based on property type */}
            <div className="buyer-search-field">
              {isBedroomBased ? (
                <>
                  <label htmlFor="bedrooms" className="buyer-search-label">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
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
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </>
              ) : isAreaBased ? (
                <>
                  <label htmlFor="area" className="buyer-search-label">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                    </svg>
                    Area
                  </label>
                  <select
                    id="area"
                    name="area"
                    value={searchData.area}
                    onChange={handleInputChange}
                    className="buyer-search-select"
                  >
                    <option value="">Any Area</option>
                    {areaRanges.map(range => (
                      <option key={range} value={range}>{range}</option>
                    ))}
                  </select>
                </>
              ) : (
                <>
                  <label htmlFor="bedrooms" className="buyer-search-label">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                    Bedroom / Area
                  </label>
                  <select
                    id="bedrooms"
                    name="bedrooms"
                    value={searchData.bedrooms}
                    onChange={handleInputChange}
                    className="buyer-search-select"
                    disabled
                  >
                    <option value="">Select Property Type</option>
                  </select>
                </>
              )}
            </div>
          </div>

          <button 
            type="submit" 
            className="buyer-search-button"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <span>Search Properties</span>
          </button>
        </form>

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
    </div>
  );
};

export default SearchBar;
