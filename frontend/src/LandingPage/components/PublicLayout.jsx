import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import LandingNavbar from './LandingNavbar';
import Footer from './Footer';
import PromoTrialPopup from './PromoTrialPopup';
import '../LandingPage.css';

const PublicLayout = ({ children }) => {
  const location = useLocation();
  const path = location.pathname.toLowerCase();
  // Fix wheel scrolling when over navbar
  useEffect(() => {
    const navbar = document.querySelector('.navbar');
    if (!navbar) return;

    const handleWheel = (e) => {
      // If wheel event is over navbar, manually scroll the window
      e.preventDefault();
      window.scrollBy({
        top: e.deltaY,
        left: 0,
        behavior: 'auto'
      });
    };

    // Attach to navbar element instead of window to avoid blocking main content scrolling
    navbar.addEventListener('wheel', handleWheel, { passive: false });
    return () => navbar.removeEventListener('wheel', handleWheel);
  }, []);

  // Pages where Navbar and Footer should be hidden
  const hideNavbarFooter = path === '/login' || path === '/register';

  // Determine background image based on route
  // Note: Home (/) uses SearchBar's <img> hero; Buyer, Seller, Agent use their own hero sections
  const getBackgroundImage = () => {
    if (path === '/') return null;
    // Removed background images for buyer, seller, and agent - they use hero section backgrounds only
    if (path === '/seller' || path === '/search') return null;
    if (path === '/buyer' || path === '/dashboard') return null;
    if (path === '/agents') return null;
    if (path === '/contact') return null;
    if (path === '/about') return null;
    return null;
  };

  const backgroundImage = getBackgroundImage();

  return (
    <div className="landing-page">
      {/* Separate Navbar Div */}
      {!hideNavbarFooter && (
        <div className="navbar-wrapper">
          <LandingNavbar />
        </div>
      )}
      
      {/* Main Content */}
      <main 
        className="main-content"
        style={backgroundImage && !hideNavbarFooter ? {
          '--landing-bg-image': `url(${backgroundImage})`
        } : {}}
      >
        {children}
      </main>

      {!hideNavbarFooter && <Footer />}
      
      {/* 90 Days Free Trial Promotional Popup */}
      <PromoTrialPopup />
    </div>
  );
};

export default PublicLayout;

