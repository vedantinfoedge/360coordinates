import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/Searchbar.css';

const topCities = [
  { name: 'Mumbai', image: '/city-projects/Mumbai.jpg' },
  { name: 'Delhi', image: '/city-projects/Delhi.jpg' },
  { name: 'Bangalore', image: '/city-projects/Banglore.jpg' },
  { name: 'Hyderabad', image: '/city-projects/Hydrabad.jpg' },
  { name: 'Chennai', image: '/city-projects/Chennai.jpg' },
  { name: 'Pune', image: '/city-projects/Pune.jpg' },
  { name: 'Kolkata', image: '/city-projects/Kolkata.jpg' },
  { name: 'Ahmedabad', image: '/city-projects/Ahmedabad.jpg' },
];

const PopularCities = () => {
  const navigate = useNavigate();

  const handleQuickSearch = (cityName) => {
    const params = new URLSearchParams();
    params.set('location', cityName);
    navigate(`/searchresults?${params.toString()}`);
  };

  return (
    <div className="landing-quick-search-container">
      <div className="landing-quick-search-header">
        <h2 className="landing-quick-search-title">Popular Cities:</h2>
      </div>
      <div className="landing-quick-search-grid">
        {topCities.map((city) => (
          <div
            key={city.name}
            className="landing-quick-search-card"
            onClick={() => handleQuickSearch(city.name)}
            style={{ backgroundImage: `url(${city.image})` }}
          >
            <div className="landing-quick-search-overlay"></div>
            <div className="landing-quick-search-content">
              <h3 className="landing-quick-search-name">{city.name}</h3>
              <p className="landing-quick-search-subtitle">Explore Projects</p>
              <div className="landing-quick-search-arrow">
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
  );
};

export default PopularCities;
