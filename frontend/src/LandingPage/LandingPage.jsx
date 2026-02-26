import React from 'react';
import { Routes, Route } from 'react-router-dom';
import PublicLayout from './components/PublicLayout';

// Pages
import Home from './pages/Home';
import Seller from './pages/Seller';
import Buyer from './pages/Buyer';
import Agents from './pages/Agents';
import Contact from './pages/Contact';
import Login from './pages/Login';
import Register from './pages/Register';
import PostProperty from './components/Propertycard';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsConditions from './pages/TermConditions';
import AboutUs from './pages/AboutUs';

function LandingPage() {
  return (
    <PublicLayout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/seller" element={<Seller />} />
        <Route path="/buyer" element={<Buyer />} />
        <Route path="/search" element={<Seller />} />
        <Route path="/dashboard" element={<Buyer />} />
        <Route path="/agents" element={<Agents />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/post-property" element={<PostProperty />} />
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/terms-conditions" element={<TermsConditions />} />
        <Route path="/about" element={<AboutUs />} />
      </Routes>
    </PublicLayout>
  );
}

export default LandingPage;