import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';

// Global styles
import './App.css';

// =====================
// AUTH CONTEXT
// =====================
import { AuthProvider } from './context/AuthContext';

// =====================
// LANDING PAGE COMPONENTS
// =====================
import LandingPage from './LandingPage/LandingPage';
import PublicLayout from './LandingPage/components/PublicLayout';

// =====================
// USER (BUYER) DASHBOARD
// =====================
import BuyerNavbar from './UserDashboard/components/BuyerNavbar';
import BuyerFooter from './UserDashboard/components/Footer';
import BuyerHome from './UserDashboard/pages/BuyerHome';
import BuyerProfile from './UserDashboard/pages/BuyerProfile';
import BuyerContactPage from './UserDashboard/pages/BuyerContactPage';
import ViewDetailsPage from './UserDashboard/pages/ViewDetailsPage';
import UpcomingProjectViewDetails from './UserDashboard/pages/UpcomingProjectViewDetails';
import SearchResults from './UserDashboard/pages/SearchResults';
import CityFilteredBuy from './UserDashboard/pages/Cityfilteredbuy';
import CityFilteredRent from './UserDashboard/pages/Cityfilteredrent';
import CityFilteredPGHostel from './UserDashboard/pages/Cityfilteredpghostel';
import CityProjects from './UserDashboard/pages/Cityprojects';
import ChatUs from './UserDashboard/pages/ChatUs';
import BuyerAboutUs from './UserDashboard/pages/BuyerAboutUs';
import BuyerPrivacyPolicy from './UserDashboard/pages/BuyerPrivacyPolicy';
import BuyerTermsConditions from './UserDashboard/pages/BuyerTermsConditions';
import './UserDashboard/styles/global.css';

// =====================
// SELLER DASHBOARD
// =====================
import SellerDashboard from './Seller-Owner/Seller-dashboard';
import ProtectedRoute from './context/ProtectedRoute';
import BuyerProtectedRoute from './context/BuyerProtectedRoute';
import PublicRoute from './components/PublicRoute';

// =====================
// AGENT DASHBOARD
// =====================
import AgentDashboard from './Agent-dashboard/Agent-dashboard';

// =====================
// ADMIN DASHBOARD
// =====================
import Admin from './Admin/AdminLayout';

// =====================
// SEO TITLE MANAGEMENT
// =====================
function SEOHead() {
  const { pathname } = useLocation();

  useEffect(() => {
    // Ensure title is always set to 360Coordinates
    const baseTitle = '360Coordinates - Buy, Rent & Sell Properties in India';

    // Set document title
    document.title = baseTitle;

    // Update meta description if needed
    let metaDescription = document.querySelector('meta[name="description"]');
    if (!metaDescription) {
      metaDescription = document.createElement('meta');
      metaDescription.setAttribute('name', 'description');
      document.head.appendChild(metaDescription);
    }
    metaDescription.setAttribute('content', '360Coordinates - Find your dream property. Buy, Rent, or Sell properties across India. Real estate listings with verified sellers and agents.');

    // Update Open Graph title
    let ogTitle = document.querySelector('meta[property="og:title"]');
    if (!ogTitle) {
      ogTitle = document.createElement('meta');
      ogTitle.setAttribute('property', 'og:title');
      document.head.appendChild(ogTitle);
    }
    ogTitle.setAttribute('content', baseTitle);

    // Update Twitter title
    let twitterTitle = document.querySelector('meta[property="twitter:title"]');
    if (!twitterTitle) {
      twitterTitle = document.createElement('meta');
      twitterTitle.setAttribute('property', 'twitter:title');
      document.head.appendChild(twitterTitle);
    }
    twitterTitle.setAttribute('content', baseTitle);
  }, [pathname]);

  return null;
}

// =====================
// SCROLL TO TOP (GLOBAL)
// =====================
function ScrollToTop() {
  const { pathname } = useLocation();
  const prevPathnameRef = React.useRef(pathname);

  useEffect(() => {
    // CRITICAL: Only scroll to top on FULL page navigation (not dashboard tab switches)
    // Do NOT reset scroll for:
    // 1. Seller Dashboard routes (handles own scroll)
    // 2. Agent Dashboard routes (handles own scroll)
    // 3. Buyer Dashboard routes (sticky navbar + footer - preserve scroll position)
    // EXCEPTION: Always scroll to top when navigating TO home page from other buyer dashboard pages

    const isSellerDashboard = pathname.startsWith('/seller-dashboard');
    const isAgentDashboard = pathname.startsWith('/agent-dashboard') || pathname.startsWith('/Agent-dashboard');
    const isBuyerDashboard = pathname.startsWith('/buy') ||
      pathname.startsWith('/rent') ||
      pathname.startsWith('/pghostel') ||
      pathname.startsWith('/projects') ||
      pathname.startsWith('/BuyerHome') ||
      pathname.startsWith('/BuyerProfile') ||
      pathname.startsWith('/BuyerContactPage') ||
      pathname.startsWith('/ChatUs') ||
      pathname.startsWith('/chatus') ||
      // /details/:id and /searchresults are now public, so exclude them from buyer dashboard routes
      // pathname.startsWith('/details/') ||
      // pathname.startsWith('/searchresults') ||
      pathname.startsWith('/buyer-about') ||
      pathname.startsWith('/buyer-privacy-policy') ||
      pathname.startsWith('/buyer-terms-conditions') ||
      pathname.startsWith('/buyer-dashboard');

    // Check if navigating TO home page
    const isHomePage = pathname === '/buyer-dashboard' ||
      pathname === '/BuyerHome' ||
      pathname === '/buyer-dashboard/';

    // Check if previous page was a buyer dashboard page (buy, rent, pg, hostel, profile, chats, contact)
    const prevPath = prevPathnameRef.current;
    const wasBuyerDashboardPage = prevPath.startsWith('/buy') ||
      prevPath.startsWith('/rent') ||
      prevPath.startsWith('/pghostel') ||
      prevPath.startsWith('/projects') ||
      prevPath.startsWith('/BuyerProfile') ||
      prevPath.startsWith('/BuyerContactPage') ||
      prevPath.startsWith('/ChatUs') ||
      prevPath.startsWith('/chatus') ||
      prevPath.startsWith('/buyer-dashboard/buy') ||
      prevPath.startsWith('/buyer-dashboard/rent') ||
      prevPath.startsWith('/buyer-dashboard/pghostel') ||
      prevPath.startsWith('/buyer-dashboard/projects') ||
      prevPath.startsWith('/buyer-dashboard/profile') ||
      prevPath.startsWith('/buyer-dashboard/chat') ||
      prevPath.startsWith('/buyer-dashboard/BuyerContactPage');

    // Only scroll to top if:
    // 1. Not a dashboard route (Seller/Agent/Buyer) OR
    // 2. Navigating TO home page from other buyer dashboard pages
    // 3. AND it's a full page change (pathname actually changed)
    const isFullPageChange = prevPathnameRef.current !== pathname;

    if (isFullPageChange) {
      if (!isSellerDashboard && !isAgentDashboard && !isBuyerDashboard) {
        // Non-dashboard routes - always scroll to top
        window.scrollTo({ top: 0, behavior: 'instant' });
      } else if (isHomePage && wasBuyerDashboardPage) {
        // Navigating to home page from buy/rent/pg/hostel/profile/chats/contact - scroll to top
        window.scrollTo({ top: 0, behavior: 'instant' });
      }
    }

    prevPathnameRef.current = pathname;
  }, [pathname]);

  return null;
}

// =====================
// LAYOUT COMPONENTS
// =====================
const NoNavLayout = ({ children }) => <main>{children}</main>;

const BuyerDashboardLayout = ({ children }) => {
  const location = useLocation();
  // Check if current path is ChatUs (with or without query params, case-insensitive)
  const isChatUsPage = location.pathname.toLowerCase() === '/chatus' ||
    location.pathname.toLowerCase().startsWith('/chatus?') ||
    location.pathname === '/ChatUs' ||
    location.pathname.startsWith('/ChatUs?') ||
    location.pathname === '/buyer-dashboard/chat' ||
    location.pathname.startsWith('/buyer-dashboard/chat?');

  return (
    <div className="buyer-dashboard-app">
      <BuyerNavbar />
      <main className="buyer-main-content">{children}</main>
      {!isChatUsPage && <BuyerFooter />}
    </div>
  );
};

// =====================
// MAIN APP COMPONENT
// =====================
function App() {
  return (
    <AuthProvider>
      <Router>
        <SEOHead /> {/* Manages title and meta tags for SEO */}
        <ScrollToTop /> {/* <-- ADDED HERE (Works for all pages) */}
        <div className="App">
          <Routes>

            {/* ==================== */}
            {/* PUBLIC SEARCH RESULTS */}
            {/* ==================== */}
            {/* Public search results - accessible without login, uses BuyerNavbar (as requested) */}
            {/* Must be before catch-all route to ensure proper matching */}
            <Route
              path="/searchresults"
              element={
                <PublicRoute>
                  <BuyerDashboardLayout>
                    <SearchResults />
                  </BuyerDashboardLayout>
                </PublicRoute>
              }
            />

            {/* ==================== */}
            {/* BUYER DASHBOARD ROUTES */}
            {/* ==================== */}
            {/* Buyer dashboard property details - with BuyerDashboardLayout (buyer-only) */}
            <Route path="/details/:id" element={<BuyerProtectedRoute><BuyerDashboardLayout><ViewDetailsPage /></BuyerDashboardLayout></BuyerProtectedRoute>} />

            {/* Upcoming Project details - available to buyers, guests, and agents */}
            <Route path="/upcoming-project/:id" element={<BuyerProtectedRoute allowAgents={true}><BuyerDashboardLayout><UpcomingProjectViewDetails /></BuyerDashboardLayout></BuyerProtectedRoute>} />

            {/* ==================== */}
            {/* PUBLIC PROPERTY DETAILS (FALLBACK) */}
            {/* ==================== */}
            {/* Public property details - accessible without login, uses PublicLayout */}
            {/* This route is now redundant but kept for backward compatibility */}
            {/* The /details/:id route above handles both authenticated and public users */}

            {/* ==================== */}
            {/* PUBLIC LANDING PAGES */}
            {/* ==================== */}
            {/* All landing page routes - Login/Register only accessible here */}
            <Route path="/*" element={<PublicRoute><LandingPage /></PublicRoute>} />

            {/* ==================== */}
            {/* BUYER DASHBOARD ROUTES (buyer role only; agents/sellers redirected) */}
            {/* ==================== */}
            {/* Strict isolation - Only dashboard routes */}
            <Route path="/buyer-dashboard" element={<BuyerProtectedRoute><BuyerDashboardLayout><BuyerHome /></BuyerDashboardLayout></BuyerProtectedRoute>} />
            <Route path="/buy" element={<BuyerProtectedRoute><BuyerDashboardLayout><CityFilteredBuy /></BuyerDashboardLayout></BuyerProtectedRoute>} />
            <Route path="/rent" element={<BuyerProtectedRoute><BuyerDashboardLayout><CityFilteredRent /></BuyerDashboardLayout></BuyerProtectedRoute>} />
            <Route path="/pghostel" element={<BuyerProtectedRoute><BuyerDashboardLayout><CityFilteredPGHostel /></BuyerDashboardLayout></BuyerProtectedRoute>} />
            <Route path="/projects" element={<BuyerProtectedRoute><BuyerDashboardLayout><CityProjects /></BuyerDashboardLayout></BuyerProtectedRoute>} />
            <Route path="/BuyerProfile" element={<BuyerProtectedRoute><BuyerDashboardLayout><BuyerProfile /></BuyerDashboardLayout></BuyerProtectedRoute>} />
            <Route path="/ChatUs" element={<BuyerProtectedRoute><BuyerDashboardLayout><ChatUs /></BuyerDashboardLayout></BuyerProtectedRoute>} />
            <Route path="/chatus" element={<BuyerProtectedRoute><BuyerDashboardLayout><ChatUs /></BuyerDashboardLayout></BuyerProtectedRoute>} />
            <Route path="/BuyerContactPage" element={<BuyerProtectedRoute><BuyerDashboardLayout><BuyerContactPage /></BuyerDashboardLayout></BuyerProtectedRoute>} />
            <Route path="/buyer-about" element={<BuyerProtectedRoute><BuyerDashboardLayout><BuyerAboutUs /></BuyerDashboardLayout></BuyerProtectedRoute>} />
            <Route path="/buyer-privacy-policy" element={<BuyerProtectedRoute><BuyerDashboardLayout><BuyerPrivacyPolicy /></BuyerDashboardLayout></BuyerProtectedRoute>} />
            <Route path="/buyer-terms-conditions" element={<BuyerProtectedRoute><BuyerDashboardLayout><BuyerTermsConditions /></BuyerDashboardLayout></BuyerProtectedRoute>} />
            {/* /details/:id moved to public routes above - keeping buyer-dashboard/details/:id for authenticated users */}
            {/* /searchresults moved to public routes above - keeping buyer-dashboard/search for authenticated users */}

            {/* Alternative routes with buyer-dashboard prefix */}
            <Route path="/BuyerHome" element={<BuyerProtectedRoute><BuyerDashboardLayout><BuyerHome /></BuyerDashboardLayout></BuyerProtectedRoute>} />
            <Route path="/buyer-dashboard/buy" element={<BuyerProtectedRoute><BuyerDashboardLayout><CityFilteredBuy /></BuyerDashboardLayout></BuyerProtectedRoute>} />
            <Route path="/buyer-dashboard/rent" element={<BuyerProtectedRoute><BuyerDashboardLayout><CityFilteredRent /></BuyerDashboardLayout></BuyerProtectedRoute>} />
            <Route path="/buyer-dashboard/pghostel" element={<BuyerProtectedRoute><BuyerDashboardLayout><CityFilteredPGHostel /></BuyerDashboardLayout></BuyerProtectedRoute>} />
            <Route path="/buyer-dashboard/projects" element={<BuyerProtectedRoute><BuyerDashboardLayout><CityProjects /></BuyerDashboardLayout></BuyerProtectedRoute>} />
            <Route path="/buyer-dashboard/profile" element={<BuyerProtectedRoute><BuyerDashboardLayout><BuyerProfile /></BuyerDashboardLayout></BuyerProtectedRoute>} />
            <Route path="/buyer-dashboard/chat" element={<BuyerProtectedRoute><BuyerDashboardLayout><ChatUs /></BuyerDashboardLayout></BuyerProtectedRoute>} />
            <Route path="/buyer-dashboard/BuyerContactPage" element={<BuyerProtectedRoute><BuyerDashboardLayout><BuyerContactPage /></BuyerDashboardLayout></BuyerProtectedRoute>} />
            <Route path="/buyer-dashboard/about" element={<BuyerProtectedRoute><BuyerDashboardLayout><BuyerAboutUs /></BuyerDashboardLayout></BuyerProtectedRoute>} />
            <Route path="/buyer-dashboard/privacy-policy" element={<BuyerProtectedRoute><BuyerDashboardLayout><BuyerPrivacyPolicy /></BuyerDashboardLayout></BuyerProtectedRoute>} />
            <Route path="/buyer-dashboard/terms-conditions" element={<BuyerProtectedRoute><BuyerDashboardLayout><BuyerTermsConditions /></BuyerDashboardLayout></BuyerProtectedRoute>} />
            <Route path="/buyer-dashboard/search" element={<BuyerProtectedRoute><BuyerDashboardLayout><SearchResults /></BuyerDashboardLayout></BuyerProtectedRoute>} />
            <Route path="/buyer-dashboard/details/:id" element={<BuyerProtectedRoute><BuyerDashboardLayout><ViewDetailsPage /></BuyerDashboardLayout></BuyerProtectedRoute>} />

            {/* ==================== */}
            {/* ADMIN & OTHER DASHBOARDS */}
            {/* ==================== */}
            <Route path="/admin/*" element={<Admin />} />

            {/* SELLER DASHBOARD - Protected Route */}
            <Route
              path="/seller-dashboard/*"
              element={
                <ProtectedRoute allowedRoles={['seller', 'agent']}>
                  <SellerDashboard />
                </ProtectedRoute>
              }
            />

            {/* AGENT DASHBOARD - Protected Route */}
            <Route
              path="/agent-dashboard/*"
              element={
                <ProtectedRoute allowedRoles={['agent']}>
                  <AgentDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/Agent-dashboard/*"
              element={
                <ProtectedRoute allowedRoles={['agent']}>
                  <AgentDashboard />
                </ProtectedRoute>
              }
            />

          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;