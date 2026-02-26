import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';

// Component imports
import AgentOverview from './Components/AgentOverview';
import AgentProperties from './Components/AgentProperties';
import AgentInquiries from './Components/AgentInquiries';
import AgentProfile from './Components/AgentProfile';
import Subscription from './Components/PlainTimerPage';
// Use buyer's ViewDetailsPage for all property details (same layout for buyers, sellers, and agents)
import ViewDetailsPage from '../UserDashboard/pages/ViewDetailsPage';
import UpcomingProjectViewDetails from '../UserDashboard/pages/UpcomingProjectViewDetails';
import AgentContactPage from './Components/AgentContactPage';

import { PropertyProvider, useProperty } from './Components/PropertyContext';
import { authAPI, sellerDashboardAPI } from '../services/api.service';
import { useAuth } from '../context/AuthContext';

import './Agent-dashboard.css';

// Inner component that uses PropertyContext
const AgentDashboardContent = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [user, setUser] = useState(null);
  const [imageError, setImageError] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { getStats, inquiries } = useProperty();
  const { logout } = useAuth();
  const userMenuRef = useRef(null);
  const [unreadChatMessages, setUnreadChatMessages] = useState(0);

  // Notification badge shows ONLY unread chat messages count
  // It reduces when messages are read
  const notifications = useMemo(() => {
    return unreadChatMessages;
  }, [unreadChatMessages]);

  // Function to refresh user data
  const refreshUserData = async () => {
    let currentUser = authAPI.getUser();

    // If no user data in localStorage, try to verify token and get fresh data
    if (!currentUser && authAPI.isAuthenticated()) {
      try {
        const response = await authAPI.verifyToken();
        if (response.success && response.data) {
          currentUser = response.data.user;
        }
      } catch (error) {
        console.error('Error verifying token:', error);
      }
    }

    setUser(currentUser);
    setImageError(false); // Reset image error when user changes
  };

  // Get user data on mount
  useEffect(() => {
    refreshUserData();
  }, []);

  // Refresh user data when navigating to profile (in case profile was updated)
  useEffect(() => {
    if (activeTab === 'profile') {
      refreshUserData();
    }
  }, [activeTab]);

  // Listen for user data updates from profile component
  useEffect(() => {
    const handleUserDataUpdate = () => {
      refreshUserData();
    };

    window.addEventListener('userDataUpdated', handleUserDataUpdate);

    return () => {
      window.removeEventListener('userDataUpdated', handleUserDataUpdate);
    };
  }, []);

  const [daysRemaining, setDaysRemaining] = useState(89);

  // Update active tab based on route
  useEffect(() => {
    // Check for both agent-pro-details (old route), /details/ (buyer's route), and upcoming-project
    const isDetailsPage = location.pathname.includes('/agent-pro-details/') ||
      location.pathname.includes('/details/') ||
      location.pathname.includes('/upcoming-project/');

    // If we're on details page, don't change activeTab
    if (isDetailsPage) {
      return;
    }

    // Otherwise, update activeTab based on pathname
    if (location.pathname.includes('/properties') || location.pathname === '/agent-dashboard/properties') {
      setActiveTab('properties');
    } else if (location.pathname.includes('/inquiries') || location.pathname === '/agent-dashboard/inquiries') {
      setActiveTab('inquiries');
    } else if (location.pathname.includes('/profile') || location.pathname === '/agent-dashboard/profile') {
      setActiveTab('profile');
    } else if (location.pathname.includes('/subscription') || location.pathname === '/agent-dashboard/subscription') {
      setActiveTab('subscription');
    } else if (location.pathname.includes('/support') || location.pathname === '/agent-dashboard/support') {
      setActiveTab('support');
    } else if (location.pathname === '/agent-dashboard' || location.pathname === '/agent-dashboard/') {
      setActiveTab('overview');
    }
  }, [location.pathname]);

  // Fetch subscription data on mount and update remaining days
  useEffect(() => {
    const fetchSubscriptionData = async () => {
      try {
        const response = await sellerDashboardAPI.getStats();

        if (response.success && response.data?.subscription?.end_date) {
          const endDate = new Date(response.data.subscription.end_date);
          const now = new Date();
          const diffTime = endDate.getTime() - now.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          setDaysRemaining(Math.max(0, diffDays));
        } else {
          // Fallback: calculate from trial start date if available
          const trialStartDate = localStorage.getItem('trialStartDate');
          if (trialStartDate) {
            const start = new Date(trialStartDate);
            const end = new Date(start);
            end.setMonth(end.getMonth() + 3);
            const now = new Date();
            const diffTime = end - now;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            setDaysRemaining(Math.max(0, diffDays));
          }
        }
      } catch (error) {
        console.error('Error fetching subscription data:', error);
        // Fallback: calculate from trial start date if available
        const trialStartDate = localStorage.getItem('trialStartDate');
        if (trialStartDate) {
          const start = new Date(trialStartDate);
          const end = new Date(start);
          end.setMonth(end.getMonth() + 3);
          const now = new Date();
          const diffTime = end - now;
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          setDaysRemaining(Math.max(0, diffDays));
        }
      }
    };

    fetchSubscriptionData();

    // Update remaining days every minute to keep it accurate
    const interval = setInterval(() => {
      fetchSubscriptionData();
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close sidebar on Escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isSidebarOpen) {
        setIsSidebarOpen(false);
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isSidebarOpen]);

  // Close sidebar when window is resized to desktop size
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 1024 && isSidebarOpen) {
        setIsSidebarOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isSidebarOpen]);

  const handleLogout = () => {
    logout();
    // Navigate to landing page home after logout
    window.location.href = '/';
  };

  // Close dropdown when clicking outside
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

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setIsSidebarOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Navigate to the appropriate route
    if (tab === 'overview') {
      navigate('/agent-dashboard');
    } else if (tab === 'properties') {
      navigate('/agent-dashboard/properties');
    } else if (tab === 'inquiries') {
      navigate('/agent-dashboard/inquiries');
    } else if (tab === 'profile') {
      navigate('/agent-dashboard/profile');
    } else if (tab === 'subscription') {
      navigate('/agent-dashboard/subscription');
    } else if (tab === 'support') {
      navigate('/agent-dashboard/support');
    }
  };

  const openProfileFromHeader = () => {
    handleTabChange('profile');
    setShowUserMenu(false);
  };

  const toggleUserMenu = (e) => {
    e.stopPropagation();
    setShowUserMenu(!showUserMenu);
  };

  const openInquiriesFromBell = () => {
    handleTabChange('inquiries');
  };

  const renderContent = () => {
    // Check if we're on property details page (use buyer's ViewDetailsPage for all)
    const isDetailsPage = location.pathname.includes('/agent-pro-details/') ||
      location.pathname.includes('/details/') ||
      location.pathname.includes('/upcoming-project/');

    if (isDetailsPage) {
      // Use upcoming project view if path contains it, otherwise standard details
      if (location.pathname.includes('/upcoming-project/')) {
        return <UpcomingProjectViewDetails />;
      }
      // Use buyer's ViewDetailsPage component (same layout for all users)
      return <ViewDetailsPage />;
    }

    switch (activeTab) {
      case 'overview':
        return <AgentOverview onNavigate={handleTabChange} />;
      case 'properties':
        return <AgentProperties />;
      case 'inquiries':
        return <AgentInquiries onUnreadCountChange={setUnreadChatMessages} />;
      case 'profile':
        return <AgentProfile />;
      case 'subscription':
        return <Subscription />;
      case 'support':
        return <AgentContactPage />;
      default:
        return <AgentOverview onNavigate={handleTabChange} />;
    }
  };

  const navItems = [
    {
      id: 'overview', label: 'Dashboard', icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <rect x="3" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2" />
          <rect x="14" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2" />
          <rect x="3" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2" />
          <rect x="14" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2" />
        </svg>
      )
    },
    {
      id: 'properties', label: 'My Properties', icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" stroke="currentColor" strokeWidth="2" />
          <polyline points="9,22 9,12 15,12 15,22" stroke="currentColor" strokeWidth="2" />
        </svg>
      )
    },
    {
      id: 'inquiries', label: 'Inquiries', icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" stroke="currentColor" strokeWidth="2" />
        </svg>
      )
    },
    {
      id: 'profile', label: 'Profile', icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="2" />
          <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2" />
        </svg>
      )
    },
    {
      id: 'subscription', label: 'Subscription', icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <rect x="2" y="5" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="2" />
          <path d="M2 10h20" stroke="currentColor" strokeWidth="2" />
          <path d="M6 15h4" stroke="currentColor" strokeWidth="2" />
          <path d="M14 15h4" stroke="currentColor" strokeWidth="2" />
        </svg>
      )
    }
  ];

  return (
    <div className="agent-dashboard">

      {/* HEADER */}
      <header className={`agent-header ${scrolled ? 'scrolled' : ''}`}>
        <div className="header-left">
          <button
            className={`menu-toggle ${isSidebarOpen ? 'active' : ''}`}
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          >
            <span></span><span></span><span></span>
          </button>

          <Link to="/agent-dashboard" className="agent-logo-link">
            <div className="logo">
              <div className="logo-icon-wrapper">
                <img src="/finallogo.png" alt="India Propertys" className="agent-logo-image" />
              </div>
            </div>
          </Link>
        </div>

        <nav className="header-nav">
          {navItems.map((item) => {
            // Don't highlight tab when on details page
            const isDetailsPage = location.pathname.includes('/agent-pro-details/') || location.pathname.includes('/details/');
            const isActive = !isDetailsPage && activeTab === item.id;

            return (
              <button
                key={item.id}
                className={`nav-btn ${isActive ? 'active' : ''}`}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleTabChange(item.id);
                }}
                type="button"
              >
                <span className="nav-icon">{item.icon}</span>
                <span className="nav-label">{item.label}</span>
                {item.id === 'inquiries' && notifications > 0 && (
                  <span className="nav-badge">{notifications}</span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="header-right">

          {/* Free Trial */}
          <button
            className={`free-trial-badge ${daysRemaining <= 7 ? 'urgent' : ''}`}
            onClick={() => handleTabChange('subscription')}
          >
            <span className="trial-text">Free Trial</span>
            <br />
            <span className="trial-days">{daysRemaining}</span>
            <span className="trial-text">days left</span>
          </button>

          {/* BELL ICON → OPEN INQUIRIES */}
          <button
            className="notification-btn"
            onClick={openInquiriesFromBell}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M18 8A6 6 0 106 8c0 7-3 9-3 9h18s-3-2-3-9"
                stroke="currentColor" strokeWidth="2" />
            </svg>
            {notifications > 0 && <span className="notification-badge">{notifications}</span>}
          </button>

          {/* USER PROFILE DROPDOWN */}
          <div className="user-profile" ref={userMenuRef} onClick={toggleUserMenu}>
            <div className="user-avatar">
              {user?.profile_image && !imageError ? (
                <img
                  src={user.profile_image}
                  alt={user.full_name || 'User'}
                  style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                  onError={() => setImageError(true)}
                />
              ) : (
                <span>
                  {user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'}
                </span>
              )}
              <span className="online-dot"></span>
            </div>
            <div className="user-info">
              <span className="user-name">{user?.full_name || 'Loading...'}</span>
              <span className="user-role">Pro Agent</span>
            </div>
            <button className="dropdown-btn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" />
              </svg>
            </button>

            {/* User Dropdown Menu */}
            {showUserMenu && (
              <div className="user-dropdown">
                <button onClick={openProfileFromHeader}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="2" />
                    <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2" />
                  </svg>
                  My Profile
                </button>
                <button onClick={() => {
                  setShowUserMenu(false);
                  handleTabChange('support');
                }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M13 7H7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    <path d="M17 11H7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                  Support
                </button>
                <button onClick={handleLogout}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"
                      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* MOBILE SIDEBAR OVERLAY */}
      <div
        className={`sidebar-overlay ${isSidebarOpen ? 'active' : ''}`}
        onClick={() => setIsSidebarOpen(false)}
      ></div>

      {/* MOBILE SIDEBAR */}
      <div className={`mobile-sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div className="mobile-sidebar-header">
          <Link to="/agent-dashboard" className="agent-logo-link">
            <div className="logo">
              <div className="logo-icon-wrapper">
                <img src="/logoswhite.png" alt="India Propertys" className="agent-logo-image" />
              </div>
            </div>
          </Link>
          <button
            className="close-sidebar"
            onClick={() => setIsSidebarOpen(false)}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="mobile-user-section">
          <div className="mobile-user-avatar">
            {user?.profile_image && !imageError ? (
              <img
                src={user.profile_image}
                alt={user.full_name || 'User'}
                style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                onError={() => setImageError(true)}
              />
            ) : (
              <span>
                {user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'}
              </span>
            )}
          </div>
          <div className="mobile-user-info">
            <div className="mobile-user-name">{user?.full_name || 'Loading...'}</div>
            <div className="mobile-user-role">Pro Agent</div>
          </div>
        </div>

        <nav className="mobile-nav">
          {navItems.map((item) => {
            const isDetailsPage = location.pathname.includes('/agent-pro-details/') || location.pathname.includes('/details/');
            const isActive = !isDetailsPage && activeTab === item.id;

            return (
              <button
                key={item.id}
                className={`mobile-nav-btn ${isActive ? 'active' : ''}`}
                onClick={() => {
                  handleTabChange(item.id);
                  setIsSidebarOpen(false);
                }}
              >
                <span className="mobile-nav-icon">{item.icon}</span>
                <span className="mobile-nav-label">{item.label}</span>
                {item.id === 'inquiries' && notifications > 0 && (
                  <span className="mobile-nav-badge">{notifications}</span>
                )}
              </button>
            );
          })}

          <div className="mobile-nav-divider"></div>

          <button
            className="mobile-nav-btn"
            onClick={() => handleTabChange('support')}
          >
            <span className="mobile-nav-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M13 7H7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <path d="M17 11H7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </span>
            <span className="mobile-nav-label">Support</span>
          </button>

          <div className="mobile-nav-divider"></div>

          <button
            className="mobile-nav-btn logout"
            onClick={() => {
              handleLogout();
              setIsSidebarOpen(false);
            }}
          >
            <span className="mobile-nav-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <span className="mobile-nav-label">Logout</span>
          </button>
        </nav>
      </div>

      <main className="agent-main">
        <div className="main-content-wrapper">
          {renderContent()}
        </div>
      </main>

    </div>
  );
};

// Outer component that provides PropertyContext
const AgentDashboard = () => {
  return (
    <PropertyProvider>
      <AgentDashboardContent />
    </PropertyProvider>
  );
};

export default AgentDashboard;
