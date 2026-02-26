import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/Explore.css';

const Explore = () => {
  const navigate = useNavigate();

  const exploreOptions = [
    {
      id: 1,
      title: 'Buy a Home',
      subtitle: 'BUY A HOME',
      description: 'Find, Buy & Own Your Dream Home',
      details: 'Explore from Apartments, land, builder floors, villas and more',
      buttonText: 'Explore Buying',
      image: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800',
      navigateTo: '/buy',
      gradient: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)'
    },
    {
      id: 2,
      title: 'Rent a Home',
      subtitle: 'RENT A HOME',
      description: 'Find Your Perfect Rental Property',
      details: 'Discover apartments, houses, and PG accommodations for rent',
      buttonText: 'Explore Rentals',
      image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800',
      navigateTo: '/rent',
      gradient: 'linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%)'
    },
    {
      id: 3,
      title: 'PG & Hostels',
      subtitle: 'PG & HOSTELS',
      description: 'Find Budget-Friendly Shared Living',
      details: 'Explore paying guest accommodations and hostels with amenities',
      buttonText: 'Explore PG/Hostels',
      image: 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=800',
      navigateTo: '/pghostel',
      gradient: 'linear-gradient(135deg, #ec4899 0%, #f472b6 100%)'
    },
    {
      id: 4,
      title: 'Sell/Rent Property',
      subtitle: 'LIST PROPERTY',
      description: 'Post Your Property For Free',
      details: 'List your property and connect with genuine buyers & tenants',
      buttonText: 'Post Property',
      image: 'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=800',
      navigateTo: '/login',
      gradient: 'linear-gradient(135deg, #022b5f 0%, #1e3a8a 100%)'
    }
  ];

  // Handler to navigate to appropriate page
  const handleExploreClick = (navigateTo) => {
    navigate(navigateTo);
  };

  return (
    <section className="explore-section">
      <div className="explore-container">
        <div className="explore-header">
          <h2 className="explore-main-title">
            Find Better Places to Live, Work and Wonder...
          </h2>
          <p className="explore-main-subtitle">
            Whether you're looking to buy, rent, or sell, we've got you covered with the best properties
          </p>
        </div>

        <div className="explore-grid">
          {exploreOptions.map((option, index) => (
            <div 
              key={option.id} 
              className="explore-card"
              style={{ animationDelay: `${index * 0.2}s` }}
              onClick={() => handleExploreClick(option.navigateTo)}
            >
              <div className="explore-card-image">
                <img src={option.image} alt={option.title} />
                <div className="explore-card-overlay" style={{ background: option.gradient }}></div>
              </div>
              
              <div className="explore-card-content">
                <span className="explore-card-subtitle">{option.subtitle}</span>
                <h3 className="explore-card-title">{option.description}</h3>
                <p className="explore-card-details">{option.details}</p>
                
                <button 
                  className="explore-card-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleExploreClick(option.navigateTo);
                  }}
                  style={{ background: option.gradient }}
                >
                  <span>{option.buttonText}</span>
                  <svg 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor"
                    className="button-arrow"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth="2" 
                      d="M13 7l5 5m0 0l-5 5m5-5H6"
                    />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Explore;