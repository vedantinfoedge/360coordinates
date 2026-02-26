import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { authAPI } from '../../services/api.service';
import BuyerProfileOverlay from './BuyerProfileOverlay';
import '../styles/BuyerNavbar.css';
//hhxbjhbhj//
const Navbar = () => {
  const { user, logout, switchRole, token } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [showProfileOverlay, setShowProfileOverlay] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const userMenuRef = useRef(null);

  // Check if we're on a landing page route (searchresults only - not buyer dashboard routes)
  const isLandingPageRoute = location.pathname === '/searchresults' || location.pathname.startsWith('/searchresults');
  
  // Ensure we're NOT on buyer dashboard routes
  const isBuyerDashboardRoute = location.pathname.startsWith('/buyer-dashboard') || 
                                 location.pathname.startsWith('/buy') || 
                                 location.pathname.startsWith('/rent') || 
                                 location.pathname.startsWith('/pghostel') || 
                                 location.pathname.startsWith('/BuyerProfile') || 
                                 location.pathname.startsWith('/ChatUs') || 
                                 location.pathname.startsWith('/chatus') ||
                                 location.pathname.startsWith('/BuyerContactPage') ||
                                 location.pathname === '/BuyerHome';
  
  // Don't show overlay on search results page - allow normal navigation to profile/chat pages
  // Overlay is disabled for search results to allow direct navigation
  const shouldShowOverlay = false;

  // Handle logout
  const handleLogout = () => {
    logout();
    // Navigate to landing page home after logout using React Router
    navigate('/', { replace: true });
  };
  

  // Handle scroll effect - Optimized with requestAnimationFrame throttling
  // CRITICAL: Use useMemo to prevent unnecessary re-renders
  useEffect(() => {
    let ticking = false;
    let lastScrollY = 0;
    
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentScrollY = window.scrollY;
          // Only update state if scroll position actually changed significantly
          // This prevents constant re-renders during smooth scrolling
          if (Math.abs(currentScrollY - lastScrollY) > 5) {
            setScrolled(currentScrollY > 10);
            lastScrollY = currentScrollY;
          }
          ticking = false;
        });
        ticking = true;
      }
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  // Memoize scrolled state to prevent unnecessary className recalculations
  const navbarClassName = useMemo(() => {
    return `buyer-navbar ${scrolled ? 'buyer-navbar-scrolled' : ''}`;
  }, [scrolled]);

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMenuOpen(false);
  }, [location]);

  // Reset image error when user or profile_image changes
  useEffect(() => {
    setImageError(false);
  }, [user?.profile_image]);

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    };

    if (showUserMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showUserMenu]);

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    
    // Special case: /buyer-dashboard should match /BuyerHome
    if (path === '/BuyerHome') {
      return location.pathname === '/buyer-dashboard' || 
             location.pathname === '/BuyerHome' ||
             location.pathname.startsWith('/BuyerHome/');
    }
    
    // For other paths, check exact match or path followed by '/'
    return location.pathname === path || 
           location.pathname.startsWith(path + '/');
  };

  // Handle profile click - show overlay on landing page (search results), navigate on dashboard
  const handleProfileClick = (e) => {
    if (shouldShowOverlay) {
      e.preventDefault();
      e.stopPropagation();
      setShowUserMenu(false);
      // Always show overlay on landing page (search results)
      setShowProfileOverlay(true);
    }
  };

  // Handle chats click - show overlay on landing page (search results), navigate on dashboard
  const handleChatsClick = (e) => {
    if (shouldShowOverlay) {
      e.preventDefault();
      e.stopPropagation();
      setShowUserMenu(false);
      // Always show overlay on landing page (search results)
      setShowProfileOverlay(true);
    }
  };

  // Determine user role based on current route
  const getUserRole = () => {
    // Check if we're on a landing page route
    if (location.pathname === '/buyer' || location.pathname === '/dashboard') {
      return 'buyer';
    } else if (location.pathname === '/seller' || location.pathname === '/search') {
      return 'seller';
    } else if (location.pathname === '/agents') {
      return 'agent';
    }
    // For search results page, check query params or default to buyer
    if (location.pathname === '/searchresults' || location.pathname.startsWith('/searchresults')) {
      const searchParams = new URLSearchParams(location.search);
      const type = searchParams.get('type');
      if (type === 'rent') return 'seller';
      if (type === 'sale') return 'buyer';
      return 'buyer'; // Default for search results
    }
    return null; // No role for other pages
  };

  // Compute login and register URLs based on current route
  const userRole = getUserRole();
  const loginUrl = userRole ? `/login?role=${userRole}` : '/login';
  const registerUrl = userRole ? `/register?role=${userRole}` : '/register';

  // Handle login click
  const handleLoginClick = (e) => {
    e.preventDefault();
    setShowUserMenu(false);
    navigate(loginUrl);
  };

  // Handle signup click
  const handleSignupClick = (e) => {
    e.preventDefault();
    setShowUserMenu(false);
    navigate(registerUrl);
  };

  // Handle switch to seller dashboard
  const handleSwitchToSeller = async () => {
    console.log('🔄 Switch to Seller button clicked');
    
    if (!user || !token) {
      console.log('❌ No token or user - redirecting to login');
      navigate('/login');
      return;
    }
    
    try {
      console.log('🔄 Calling switchRole API to switch to seller...');
      const result = await switchRole('seller');
      
      if (result.success) {
        console.log('✅ Role switched to seller successfully');
        // Navigate to seller dashboard after successful role switch
        navigate('/seller-dashboard', { replace: false });
      } else {
        console.error('❌ Role switch failed:', result.message);
        // Still navigate - backend will handle authorization
        navigate('/seller-dashboard', { replace: false });
      }
    } catch (error) {
      console.error('❌ Error switching role:', error);
      // On error, still try to navigate - backend will handle authorization
      navigate('/seller-dashboard', { replace: false });
    }
  };

  return (
    <nav className={navbarClassName}>
      <div className="buyer-navbar-container">
        <div className="buyer-navbar-content">
          {/* Logo */}
          <Link to={shouldShowOverlay ? "/" : "/buyer-dashboard"} className="navbar-logo">
            <div className="logo-container">
              <img src="/finallogo.png" alt="India Propertys" className="logo-image" />
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="buyer-nav-links-desktop">
            <Link to="/buyer-dashboard" className={`buyer-nav-link ${isActive('/buyer-dashboard') || isActive('/BuyerHome') ? 'active' : ''}`}>
              <span>Home</span>
            </Link>
            <Link to="/buy" className={`buyer-nav-link ${isActive('/buy') ? 'active' : ''}`}>
              <span>Buy</span>
            </Link>
            <Link to="/rent" className={`buyer-nav-link ${isActive('/rent') ? 'active' : ''}`}>
              <span>Rent</span>
            </Link>
            <Link to="/pghostel" className={`buyer-nav-link ${isActive('/pghostel') ? 'active' : ''}`}>
              <span>PG / Hostel</span>
            </Link>
            <Link 
              to="/BuyerProfile" 
              className={`buyer-nav-link ${isActive('/BuyerProfile') ? 'active' : ''}`}
              onClick={handleProfileClick}
            >
              <span>Profile</span>
            </Link>
            <Link 
              to="/ChatUs" 
              className={`buyer-nav-link ${isActive('/ChatUs') ? 'active' : ''}`}
              onClick={handleChatsClick}
            >
              <span>Chats</span>
            </Link>
            <Link to="/BuyerContactPage" className={`buyer-nav-link ${isActive('/BuyerContactPage') ? 'active' : ''}`}>
              <span>Contact</span>
            </Link>
            
            {/* Switch to Seller Dashboard Button */}
            <button 
              className="buyer-switch-seller-btn" 
              title="Switch to Seller Dashboard"
              onClick={handleSwitchToSeller}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ marginRight: '6px' }}>
                <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="8.5" cy="7" r="4" stroke="currentColor" strokeWidth="2"/>
                <path d="M20 8v6M23 11h-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span>Sell Property</span>
            </button>
            
            {/* User Header */}
            <div 
              className="buyer-user-header" 
              ref={userMenuRef} 
              onClick={() => {
                if (shouldShowOverlay && !user) {
                  // On landing page (search results) without user, show profile overlay
                  setShowProfileOverlay(true);
                } else {
                  // On dashboard or with user, toggle user menu
                  setShowUserMenu(!showUserMenu);
                }
              }}
            >
              <div className="buyer-user-avatar">
                {user?.profile_image && !imageError ? (
                  <img 
                    src={user.profile_image} 
                    alt={user.full_name || 'User'} 
                    onError={() => setImageError(true)}
                  />
                ) : (
                  <span>{user?.full_name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'U'}</span>
                )}
              </div>
              
              {/* User Dropdown Menu */}
              {showUserMenu && (
                <div className="buyer-user-dropdown">
                  {user ? (
                    <>
                      {/* Greeting Section */}
                      <div className="buyer-user-dropdown-greeting">
                        <span className="buyer-greeting-text">
                          Hello, {user?.first_name || (user?.full_name ? user.full_name.split(' ')[0] : 'User')}
                        </span>
                        <svg className="buyer-heart-icon" width="18" height="18" viewBox="0 0 24 24" fill="none">
                          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" 
                            strokeWidth="0.5"/>
                        </svg>
                      </div>
                      <div className="buyer-dropdown-divider"></div>
                      <Link 
                        to="/BuyerProfile" 
                        onClick={(e) => {
                          if (shouldShowOverlay) {
                            e.preventDefault();
                            setShowUserMenu(false);
                            setShowProfileOverlay(true);
                            return;
                          }
                          setShowUserMenu(false);
                        }}
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                          <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="2"/>
                          <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2"/>
                        </svg>
                        My Profile
                      </Link>
                      <button onClick={handleLogout}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                          <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" 
                            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        Logout
                      </button>
                    </>
                  ) : (
                    <>
                      <button onClick={handleLoginClick}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" stroke="currentColor" strokeWidth="2"/>
                          <path d="M7 11V7a5 5 0 0110 0v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        Login
                      </button>
                      <button onClick={handleSignupClick}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                          <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <circle cx="8.5" cy="7" r="4" stroke="currentColor" strokeWidth="2"/>
                          <path d="M20 8v6M23 11h-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        Sign Up
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className={`buyer-mobile-menu-button ${isMenuOpen ? 'open' : ''}`}
            aria-label="Toggle menu"
          >
            <span className="buyer-menu-icon-line"></span>
            <span className="buyer-menu-icon-line"></span>
            <span className="buyer-menu-icon-line"></span>
          </button>
        </div>

        {/* Mobile Menu */}
        <div className={`buyer-mobile-menu ${isMenuOpen ? 'open' : ''}`}>
          <div className="buyer-mobile-menu-content">
            {/* Mobile User Info */}
            <div className="buyer-mobile-user-info">
              <div className="buyer-mobile-user-avatar">
                {user?.profile_image && !imageError ? (
                  <img 
                    src={user.profile_image} 
                    alt={user.full_name || 'User'} 
                    onError={() => setImageError(true)}
                  />
                ) : (
                  <span>{user?.full_name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'U'}</span>
                )}
              </div>
              <div className="buyer-mobile-user-details">
                <span className="buyer-mobile-user-name">{user?.full_name || user?.email?.split('@')[0] || 'User'}</span>
                <span className="buyer-mobile-user-email">{user?.email || ''}</span>
              </div>
            </div>
            
            <Link to="/buyer-dashboard" className={`buyer-mobile-nav-link ${isActive('/buyer-dashboard') || isActive('/BuyerHome') ? 'active' : ''}`}>
              <span>Home</span>
            </Link>
            <Link to="/buy" className={`buyer-mobile-nav-link ${isActive('/buy') ? 'active' : ''}`}>
              <span>Buy</span>
            </Link>
            <Link to="/rent" className={`buyer-mobile-nav-link ${isActive('/rent') ? 'active' : ''}`}>
              <span>Rent</span>
            </Link>
            <Link to="/pghostel" className={`buyer-mobile-nav-link ${isActive('/pghostel') ? 'active' : ''}`}>
              <span>PG / Hostel</span>
            </Link>
            <Link 
              to="/BuyerProfile" 
              className={`buyer-mobile-nav-link ${isActive('/BuyerProfile') ? 'active' : ''}`}
              onClick={handleProfileClick}
            >
              <span>Profile</span>
            </Link>
            <Link 
              to="/chatus" 
              className={`buyer-mobile-nav-link ${isActive('/chatus') ? 'active' : ''}`}
              onClick={handleChatsClick}
            >
              <span>Chats</span>
            </Link>
            <Link to="/BuyerContactPage" className={`buyer-mobile-nav-link ${isActive('/BuyerContactPage') ? 'active' : ''}`}>
              <span>Contact</span>
            </Link>
            {/* Switch to Seller Dashboard (mobile only via hamburger) */}
            <button 
              className="buyer-mobile-switch-btn" 
              title="Switch to Seller Dashboard"
              onClick={handleSwitchToSeller}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="8.5" cy="7" r="4" stroke="currentColor" strokeWidth="2"/>
                <path d="M20 8v6M23 11h-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span>Sell Property</span>
            </button>
            {/* Show Login/Signup buttons on landing page, Logout button on buyer dashboard */}
            {isLandingPageRoute ? (
              <>
                <Link 
                  to={loginUrl} 
                  className="buyer-mobile-logout-btn" 
                  style={{ background: 'rgba(59, 130, 246, 0.1)', borderColor: 'rgba(59, 130, 246, 0.3)', color: '#3b82f6' }} 
                  onClick={handleLoginClick}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" stroke="currentColor" strokeWidth="2"/>
                    <path d="M7 11V7a5 5 0 0110 0v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span>Login</span>
                </Link>
                <Link 
                  to={registerUrl} 
                  className="buyer-mobile-logout-btn" 
                  style={{ background: 'rgba(199, 238, 255, 0.5)', borderColor: 'rgba(0, 119, 192, 0.3)', color: '#0077C0', marginTop: '10px' }} 
                  onClick={handleSignupClick}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <circle cx="8.5" cy="7" r="4" stroke="currentColor" strokeWidth="2"/>
                    <path d="M20 8v6M23 11h-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span>Sign Up</span>
                </Link>
              </>
            ) : (
              <button onClick={handleLogout} className="buyer-mobile-logout-btn">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" 
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span>Logout</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Profile Overlay - Show on landing page routes (search results) only */}
      <BuyerProfileOverlay 
        isOpen={shouldShowOverlay && showProfileOverlay} 
        onClose={() => setShowProfileOverlay(false)} 
      />
    </nav>
  );
};

export default Navbar;