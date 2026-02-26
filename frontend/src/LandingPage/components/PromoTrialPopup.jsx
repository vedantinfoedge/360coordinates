import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './PromoTrialPopup.css';

const PromoTrialPopup = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const timeoutRef = useRef(null);
  const showDelayRef = useRef(null);

  // Check if popup should be shown on current route
  const shouldShowOnRoute = () => {
    const path = location.pathname.toLowerCase();
    
    // Do NOT show on login/register pages
    if (path === '/login' || path === '/register') {
      return false;
    }
    
    // Do NOT show on dashboard routes
    if (path.startsWith('/buyer') || path.startsWith('/seller') || path.startsWith('/agent')) {
      return false;
    }
    
    // Do NOT show on viewdetails pages
    if (path.includes('/details/') || path.includes('/viewdetails')) {
      return false;
    }
    
    // Show on all other landing pages
    return true;
  };

  // Manual close handler
  const handleClose = () => {
    setIsAnimating(false);
    setTimeout(() => {
      setIsVisible(false);
    }, 250); // Match CSS animation duration
    
    // Clear timeout if still running
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  // Handle CTA button click
  const handleCTAClick = () => {
    if (isAuthenticated) {
      // If authenticated, navigate to post property or seller dashboard
      navigate('/post-property');
    } else {
      // If not authenticated, navigate to register
      navigate('/register');
    }
    handleClose();
  };

  useEffect(() => {
    // Check if should show on current route
    if (!shouldShowOnRoute()) {
      return;
    }

    // Clear any existing timeouts
    if (showDelayRef.current) {
      clearTimeout(showDelayRef.current);
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Small delay to ensure smooth animation on page load
    showDelayRef.current = setTimeout(() => {
      setIsAnimating(true);
      setIsVisible(true);

      // Auto-hide after 10 seconds
      timeoutRef.current = setTimeout(() => {
        setIsAnimating(false);
        // Wait for fade-out animation to complete before hiding
        setTimeout(() => {
          setIsVisible(false);
        }, 250); // Match CSS animation duration
      }, 10000);
    }, 300); // Small delay for smooth page load

    // Cleanup on unmount or route change
    return () => {
      if (showDelayRef.current) {
        clearTimeout(showDelayRef.current);
        showDelayRef.current = null;
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [location.pathname]); // Re-check when route changes

  // Don't render if not visible
  if (!isVisible) {
    return null;
  }

  return (
    <div className={`promo-trial-popup-overlay ${isAnimating ? 'promo-trial-popup-visible' : 'promo-trial-popup-hidden'}`}>
      <div className="promo-trial-popup-container">
        <button 
          className="promo-trial-popup-close"
          onClick={handleClose}
          aria-label="Close popup"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
        <div className="promo-trial-popup-content">
          <div className="promo-trial-popup-icon">🎉</div>
          <h2 className="promo-trial-popup-title">90 Days Free Trial</h2>
          <p className="promo-trial-popup-subtitle">
            Post your property for free and reach genuine buyers & tenants.
          </p>
          
          <ul className="promo-trial-popup-features">
            <li className="promo-trial-popup-feature">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              <span>Unlimited listing edits</span>
            </li>
            <li className="promo-trial-popup-feature">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              <span>Verified buyer leads</span>
            </li>
            <li className="promo-trial-popup-feature">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              <span>Chat with buyers instantly</span>
            </li>
          </ul>

          <button 
            className="promo-trial-popup-cta"
            onClick={handleCTAClick}
          >
            Post Property Now
          </button>

          <p className="promo-trial-popup-limited">Limited time offer</p>
        </div>
      </div>
    </div>
  );
};

export default PromoTrialPopup;
