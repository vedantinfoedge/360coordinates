import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/SearchBar.css';

const SearchBar = () => {
  const navigate = useNavigate();
  
  const [searchData, setSearchData] = useState({
    location: '',
    propertyType: '',
    budget: '',
    bedrooms: ''
  });


  const propertyTypes = ['Apartment', 'Villa', 'Plot', 'Commercial',"PG / Hostel","Independent House","Row House","Bungalow","Studio Apartment","Penthouse","Farm House","Industrial N/A Land ","Plot / Land","Commercial Office","Commercial Shop","Retail Space","Co-working Space","Warehouse / Godown","Industrial Property","Hotel / Guest House",];
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

  return (
    <div className="buyer-search-bar-container">
      <div className="buyer-search-bar-wrapper">
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
              <input
                type="text"
                id="location"
                name="location"
                placeholder="City / Locality"
                value={searchData.location}
                onChange={handleInputChange}
                className="buyer-search-input"
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
  );
};

export default SearchBar;