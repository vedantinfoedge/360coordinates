import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import '../styles/Navbar.css';

const LandingNavbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMenuOpen(false);
  }, [location]);

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const isBuyRentActive = () => {
    return (location.pathname === '/buyer' || location.pathname === '/dashboard') && 
           (location.search.includes('type=sale') || location.search === '');
  };

  const isSellOwnerActive = () => {
    return location.pathname === '/seller' || location.pathname === '/search';
  };

  // Determine user role based on current route
  const getUserRole = () => {
    if (location.pathname === '/buyer' || location.pathname === '/dashboard') {
      return 'buyer';
    } else if (location.pathname === '/seller' || location.pathname === '/search') {
      return 'seller';
    } else if (location.pathname === '/agents') {
      return 'agent';
    }
    return null; // No role for home or other pages
  };

  const userRole = getUserRole();
  const loginUrl = userRole ? `/login?role=${userRole}` : '/login';
  const registerUrl = userRole ? `/register?role=${userRole}` : '/register';

  return (
    <nav className={`navbar ${scrolled ? 'navbar-scrolled' : ''}`}>
      <div className="navbar-container">
        <div className="navbar-content">
          {/* Logo */}
          <Link to="/" className="navbar-logo">
            <div className="logo-container">
              <img src="/finallogo.png" alt="India Propertys" className="logo-image" />
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <div className="nav-links-desktop">
            <Link to="/" className={`nav-link ${isActive('/') && !isActive('/buyer') && !isActive('/seller') && !isActive('/agents') && !isActive('/contact') && !isActive('/about') ? 'active' : ''}`}>
              <span>Home</span>
            </Link>
            <Link to="/buyer" className={`nav-link ${isBuyRentActive() ? 'active' : ''}`}>
              <span>Buy/Rent</span>
            </Link>
            <Link to="/seller" className={`nav-link ${isSellOwnerActive() ? 'active' : ''}`}>
              <span>Seller/Owner</span>
            </Link>
            <Link to="/agents" className={`nav-link ${isActive('/agents') ? 'active' : ''}`}>
              <span>Agent/Builder</span>
            </Link>
            <Link to="/contact" className={`nav-link ${isActive('/contact') ? 'active' : ''}`}>
              <span>Contact</span>
            </Link>
          </div>

          {/* Auth Buttons Desktop */}
          <div className="auth-buttons-desktop">
            <Link to={loginUrl} className="auth-button auth-button-secondary">
              <span>Login</span>
            </Link>
            <Link to={registerUrl} className="auth-button auth-button-primary">
              <span>Register</span>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className={`mobile-menu-button ${isMenuOpen ? 'open' : ''}`}
            aria-label="Toggle menu"
          >
            <span className="menu-icon-line"></span>
            <span className="menu-icon-line"></span>
            <span className="menu-icon-line"></span>
          </button>
        </div>

        {/* Mobile Menu */}
        <div className={`mobile-menu ${isMenuOpen ? 'open' : ''}`}>
          <div className="mobile-menu-content">
            <Link to="/" className={`mobile-nav-link ${isActive('/') && !isActive('/buyer') && !isActive('/seller') && !isActive('/agents') && !isActive('/contact') && !isActive('/about') ? 'active' : ''}`}>
              <span>Home</span>
            </Link>
            <Link to="/buyer" className={`mobile-nav-link ${isBuyRentActive() ? 'active' : ''}`}>
              <span>Buy/Rent</span>
            </Link>
            <Link to="/seller" className={`mobile-nav-link ${isSellOwnerActive() ? 'active' : ''}`}>
              <span>Sell/Owner</span>
            </Link>
            <Link to="/agents" className={`mobile-nav-link ${isActive('/agents') ? 'active' : ''}`}>
              <span>Agents/Builder</span>
            </Link>
            <Link to="/contact" className={`mobile-nav-link ${isActive('/contact') ? 'active' : ''}`}>
              <span>Contact</span>
            </Link>

            <div className="mobile-auth-buttons">
              <Link to={loginUrl} className="auth-button auth-button-secondary">
                <span>Login</span>
              </Link>
              <Link to={registerUrl} className="auth-button auth-button-primary">
                <span>Register</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default LandingNavbar;

