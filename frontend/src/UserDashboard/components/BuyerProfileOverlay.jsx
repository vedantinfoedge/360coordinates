import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/BuyerProfileOverlay.css';

const BuyerProfileOverlay = ({ isOpen, onClose }) => {
  const navigate = useNavigate();

  const handleSignup = () => {
    onClose();
    navigate('/register');
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="buyer-profile-overlay" onClick={onClose}>
      <div className="buyer-profile-overlay-content" onClick={(e) => e.stopPropagation()}>
        <button className="buyer-profile-overlay-close" onClick={onClose} aria-label="Close">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </button>

        <div className="buyer-profile-overlay-header">
          <div className="buyer-profile-overlay-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2"/>
            </svg>
          </div>
          <h2 className="buyer-profile-overlay-title">Create Your Profile</h2>
          <p className="buyer-profile-overlay-subtitle">
            Sign up to access your profile, save favorite properties, and get personalized recommendations
          </p>
        </div>

        <div className="buyer-profile-overlay-features">
          <div className="buyer-profile-feature">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span>Save your favorite properties</span>
          </div>
          <div className="buyer-profile-feature">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span>Get personalized property recommendations</span>
          </div>
          <div className="buyer-profile-feature">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span>Contact sellers directly</span>
          </div>
          <div className="buyer-profile-feature">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span>Track your property search history</span>
          </div>
        </div>

        <div className="buyer-profile-overlay-actions">
          <button className="buyer-profile-signup-btn" onClick={handleSignup}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="8.5" cy="7" r="4" stroke="currentColor" strokeWidth="2"/>
              <path d="M20 8v6M23 11h-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Sign Up Now
          </button>
          <button className="buyer-profile-cancel-btn" onClick={onClose}>
            Maybe Later
          </button>
        </div>
      </div>
    </div>
  );
};

export default BuyerProfileOverlay;
