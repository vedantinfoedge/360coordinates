import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import BuyerNavbar from './UserDashboard/components/BuyerNavbar';
import Footer from './UserDashboard/components/Footer';

// Existing Pages
import BuyerHome from './UserDashboard/pages/BuyerHome';
import BuyerContactPage from './UserDashboard/pages/BuyerContactPage';
import ViewDetailsPage from './UserDashboard/pages/ViewDetailsPage';
import BuyerProfile from './UserDashboard/pages/BuyerProfile';
import SearchResults from './UserDashboard/pages/SearchResults';
import ChatUs  from './UserDashboard/pages/ChatUs';

// ⭐ NEW: City-Filtered Pages
import CityFilteredBuy from './UserDashboard/pages/Cityfilteredbuy';
import CityFilteredRent from './UserDashboard/pages/Cityfilteredrent';
import CityProjects from './UserDashboard/pages/Cityprojects';

import './UserDashboard/styles/global.css';
import './buyer-dashboard.css';

// ScrollToTop component - scrolls to top on route change
function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    // Scroll to top whenever route changes
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'instant' // Use 'instant' for immediate scroll without animation
    });
  }, [pathname]);

  return null;
}

function AppContent() {
  return (
    <div className="App">
      <ScrollToTop />
      <BuyerNavbar />
      <main className="buyer-main-content">
        <Routes>
          <Route path="/BuyerHome" element={<BuyerHome />} />
          <Route path="/buy" element={<CityFilteredBuy />} />
          <Route path="/rent" element={<CityFilteredRent />} />
          <Route path="/projects" element={<CityProjects />} />
          <Route path="/ChatUs" element={<ChatUs />} />
          <Route path="/buyercontactpage" element={<BuyerContactPage />} />
          <Route path="/BuyerProfile" element={<BuyerProfile />} />
          <Route path="/searchresults" element={<SearchResults />} />
          <Route path="/search" element={<SearchResults />} />
          <Route path="/details/:id" element={<ViewDetailsPage />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;