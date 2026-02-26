import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import '../styles/Propertycard.css';

const PropertyCard = ({ property }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const {
    image,
    title,
    price,
    location,
    bedrooms,
    bathrooms,
    area,
    status
  } = property;

  // Handler for View Details button
  const handleViewDetails = () => {
    // Allow viewing property details without login (public access)
    if (property?.id) {
      // Open property details in new tab - accessible without login
      window.open(`/details/${property.id}`, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="property-card">
      <div className="property-image-container">
        <img 
          src={image || '/placeholder-property.jpg'} 
          alt={title} 
          className="property-image"
        />
        <span className={`property-status ${status?.toLowerCase().replace(' ', '-')}`}>
          {status || 'For Sale'}
        </span>
      </div>
      
      <div className="property-content">
        <h3 className="property-title">{title}</h3>
        
        <div className="property-location">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
            <circle cx="12" cy="10" r="3"></circle>
          </svg>
          <span>{location}</span>
        </div>

        <div className="property-details">
          <div className="detail-item">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
              <polyline points="9 22 9 12 15 12 15 22"></polyline>
            </svg>
            <span>{bedrooms} Beds</span>
          </div>
          
          <div className="detail-item">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 6 6.5 3.5a1.5 1.5 0 0 0-1 0l-1 1a1.5 1.5 0 0 0 0 1L7 9"></path>
              <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"></path>
              <circle cx="11" cy="11" r="2"></circle>
            </svg>
            <span>{bathrooms} Baths</span>
          </div>
          
          <div className="detail-item">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="9" y1="3" x2="9" y2="21"></line>
            </svg>
            <span>{area} sq.ft</span>
          </div>
        </div>

        <div className="property-footer">
          <div className="property-price">
            <span className="price-label">Price</span>
            <span className="price-value">₹{price?.toLocaleString('en-IN')}</span>
          </div>
          
          <button className="view-details-btn" onClick={handleViewDetails}>
            View Details
          </button>
        </div>
      </div>
    </div>
  );
};

export default PropertyCard;