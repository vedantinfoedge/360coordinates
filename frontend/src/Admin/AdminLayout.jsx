import React, { useState, useEffect, Suspense, lazy } from 'react';
import { useNavigate, useLocation, Routes, Route } from 'react-router-dom';
import { 
  Home, 
  Building2, 
  Users, 
  UserCheck, 
  CreditCard,
  LogOut,
  Menu,
  X
} from 'lucide-react';
import { API_BASE_URL, API_ENDPOINTS } from '../config/api.config';
import { adminFetch } from './utils/adminFetch';
import './AdminLayout.css';

// Lazy load page components to avoid initialization issues
const AdminDashboard = lazy(() => import('./Pages/AdminDashboard'));
const AdminProperties = lazy(() => import('./Pages/AdminProperties'));
const AdminUsers = lazy(() => import('./Pages/AdminUsers'));
const AdminAgents = lazy(() => import('./Pages/AdminAgents'));
const AdminSubscriptions = lazy(() => import('./Pages/AdminSubscriptions'));
const AdminLogin = lazy(() => import('./Pages/AdminLogin'));

const AdminLayout = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = React.useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Scroll effect for header (match seller dashboard)
  React.useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          setScrolled(window.scrollY > 10);
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close user menu when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) setShowUserMenu(false);
    };
    if (showUserMenu) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showUserMenu]);

  // Check if current page is login (hide navbar on login page)
  const isLoginPage = location.pathname === '/admin/login';

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [adminData, setAdminData] = useState(null);
  const [menuItems, setMenuItems] = useState([]);

  // Define all possible menu items with permissions
  const allMenuItems = [
    { path: '/admin/dashboard', icon: Home, label: 'Dashboard', roles: ['super_admin', 'admin', 'moderator'] },
    { path: '/admin/properties', icon: Building2, label: 'Properties', roles: ['super_admin', 'admin', 'moderator'] },
    { path: '/admin/users', icon: Users, label: 'Users', roles: ['super_admin', 'admin'] },
    { path: '/admin/agents', icon: UserCheck, label: 'Agent / Builder', roles: ['super_admin', 'admin'] },
    { path: '/admin/subscriptions', icon: CreditCard, label: 'Subscriptions', roles: ['super_admin', 'admin'] },
  ];

  // Filter menu items based on admin role
  const getMenuItemsForRole = (role) => {
    if (!role) return [];
    return allMenuItems.filter(item => item.roles.includes(role));
  };

  // Check authentication - verify session with backend, block until complete
  // When on login page, skip 401 redirect so we don't cause an infinite refresh loop
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const data = await adminFetch(API_ENDPOINTS.ADMIN_VERIFY, {
          skipRedirectOn401: isLoginPage,
        });
        if (data && data.admin) {
          const admin = data.admin;
          setAdminData(admin);
          setMenuItems(getMenuItemsForRole(admin.role));
          setIsAuthenticated(true);
          if (isLoginPage) {
            navigate('/admin/dashboard', { replace: true });
          }
        } else {
          setIsAuthenticated(false);
          if (!isLoginPage) {
            navigate('/admin/login', { replace: true });
          }
        }
      } catch (_) {
        setIsAuthenticated(false);
        // Only redirect to login if we're not already on the login page (prevents refresh loop)
        if (!isLoginPage) {
          navigate('/admin/login', { replace: true });
        }
      } finally {
        setIsCheckingAuth(false);
      }
    };

    checkAuth();
  }, [isLoginPage, navigate]);

  const handleLogout = async () => {
    try {
      await fetch(`${API_BASE_URL}/admin/auth/logout.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
    } catch (err) {
      console.error('Logout error:', err);
    }
    window.location.href = '/';
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  // Loading component
  const LoadingFallback = () => (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh' 
    }}>
      <div>Loading...</div>
    </div>
  );

  // Show loading while checking authentication
  if (isCheckingAuth) {
    return <LoadingFallback />;
  }

  // If on login page, just render login without the layout
  if (isLoginPage) {
    return (
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          <Route path="/login" element={<AdminLogin />} />
        </Routes>
      </Suspense>
    );
  }

  // If not authenticated, show nothing (redirect will happen in useEffect)
  if (!isAuthenticated) {
    return null;
  }

  const displayMenuItems = menuItems.length > 0 ? menuItems : allMenuItems;

  return (
    <div className="admin-layout">

      {/* Header - same structure as seller dashboard */}
      <header className={`admin-header ${scrolled ? 'scrolled' : ''}`}>
        <div className="admin-header-left">
          <button
            className={`admin-menu-toggle ${mobileMenuOpen ? 'active' : ''}`}
            onClick={toggleMobileMenu}
            aria-label="Toggle menu"
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
          <div className="admin-header-logo" onClick={() => navigate('/admin/dashboard')} title="Go to Dashboard">
            <div className="admin-logo-icon-wrapper">
              <img src="/finallogo.png" alt="Logo" />
            </div>
          </div>
        </div>

        <nav className="admin-header-nav">
          {displayMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                type="button"
                className={`admin-nav-btn ${isActive ? 'active' : ''}`}
                onClick={() => { navigate(item.path); closeMobileMenu(); }}
              >
                <span className="admin-nav-btn-icon"><Icon size={20} /></span>
                <span className="admin-nav-btn-label">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="admin-header-right">
          <div className="admin-user-header" ref={userMenuRef} onClick={() => setShowUserMenu(!showUserMenu)}>
            <div className="admin-user-avatar">
              <span>{adminData?.full_name?.charAt(0)?.toUpperCase() || adminData?.username?.charAt(0)?.toUpperCase() || 'A'}</span>
            </div>
            {showUserMenu && (
              <div className="admin-user-dropdown">
                <div className="admin-user-dropdown-info">
                  <span className="admin-user-dropdown-name">{adminData?.full_name || adminData?.username || 'Admin'}</span>
                  <span className="admin-user-dropdown-role">{adminData?.role?.replace('_', ' ') || 'Admin'}</span>
                </div>
                <button type="button" onClick={handleLogout}>
                  <LogOut size={18} />
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Mobile overlay & sidebar - same pattern as seller */}
      <div className={`admin-sidebar-overlay ${mobileMenuOpen ? 'active' : ''}`} onClick={closeMobileMenu} aria-hidden="true" />
      <aside className={`admin-mobile-sidebar ${mobileMenuOpen ? 'open' : ''}`}>
        <div className="admin-mobile-sidebar-header">
          <div className="admin-header-logo" onClick={() => { navigate('/admin/dashboard'); closeMobileMenu(); }}>
            <div className="admin-logo-icon-wrapper">
              <img src="/finallogo.png" alt="Logo" />
            </div>
            <span className="admin-logo-text">360Coordinates</span>
          </div>
          <button type="button" className="admin-close-sidebar" onClick={closeMobileMenu} aria-label="Close menu">
            <X size={24} />
          </button>
        </div>
        {adminData && (
          <div className="admin-mobile-user-section">
            <div className="admin-user-avatar">
              <span>{adminData.full_name?.charAt(0)?.toUpperCase() || adminData.username?.charAt(0)?.toUpperCase() || 'A'}</span>
            </div>
            <div className="admin-mobile-user-info">
              <span className="admin-mobile-user-name">{adminData.full_name || adminData.username || 'Admin'}</span>
              <span className="admin-mobile-user-role">{adminData.role?.replace('_', ' ') || 'Admin'}</span>
            </div>
          </div>
        )}
        <nav className="admin-mobile-nav">
          {displayMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                type="button"
                className={`admin-mobile-nav-btn ${isActive ? 'active' : ''}`}
                onClick={() => { navigate(item.path); closeMobileMenu(); }}
              >
                <span className="admin-mobile-nav-icon"><Icon size={20} /></span>
                <span className="admin-mobile-nav-label">{item.label}</span>
              </button>
            );
          })}
          <div className="admin-mobile-nav-divider" />
          <button type="button" className="admin-mobile-nav-btn logout" onClick={handleLogout}>
            <span className="admin-mobile-nav-icon"><LogOut size={20} /></span>
            <span className="admin-mobile-nav-label">Logout</span>
          </button>
        </nav>
      </aside>

      {/* Main Content - Routes are defined here */}
      <div className="admin-main">
        <div className="admin-content">
          <Suspense fallback={<LoadingFallback />}>
            <Routes>
              <Route path="/" element={<AdminDashboard />} />
              <Route path="/dashboard" element={<AdminDashboard />} />
              <Route path="/properties" element={<AdminProperties />} />
              <Route path="/users" element={<AdminUsers />} />
              <Route path="/agents" element={<AdminAgents />} />
              <Route path="/subscriptions" element={<AdminSubscriptions />} />
              <Route path="/login" element={<AdminLogin />} />
            </Routes>
          </Suspense>
        </div>
      </div>

    </div>
  );
};

export default AdminLayout;
