import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import '../styles/Buyer.css';

export default function BuyerTenantLandingPage() {
  const [hoveredCard, setHoveredCard] = useState(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  // Handler to redirect to login if not authenticated
  const handleRequireAuth = (returnUrl = '/buyer-dashboard') => {
    if (!user) {
      navigate(`/login?role=buyer&returnUrl=${encodeURIComponent(returnUrl)}`);
    } else {
      navigate(returnUrl);
    }
  };
  

  const benefits = [
    { icon: '✅', title: 'Verified Properties Only', desc: 'Browse through authenticated listings' },
    { icon: '🔍', title: 'Advanced Search Filters', desc: 'Find exactly what you need' },
    { icon: '💰', title: 'Zero Brokerage', desc: 'Connect directly with owners' },
    { icon: '✓', title: 'Verified Owners', desc: 'Deal with authenticated sellers only' },
    { icon: '🔔', title: 'Instant Notifications', desc: 'Get alerts for new properties' },
    { icon: '📍', title: 'Location Insights', desc: 'Detailed area information' }
  ];

  const steps = [
    { num: '1', title: 'Create FREE Account', desc: 'Sign up in seconds' },
    { num: '2', title: 'Browse Properties', desc: 'Use smart filters to find your home' },
    { num: '3', title: 'Connect Directly', desc: 'Chat with owners instantly' },
    { num: '4', title: 'Visit & Finalize', desc: 'Schedule visits and close the deal' }
  ];

  const propertyTypes = [
    { image: '/property-images/Apartment.jpg', title: 'Apartment', count: '15,000+' },
    { image: '/property-images/Villa.jpg', title: 'Villa', count: '3,200+' },
    { image: '/property-images/Rowhouse.jpg', title: 'Row House', count: '2,800+' },
    { image: '/property-images/Banglow.jpg', title: 'Bungalow', count: '1,900+' },
    { image: '/property-images/StudioApartment.jpg', title: 'Studio Apartment', count: '4,200+' },
    { image: '/property-images/PlotLand.jpg', title: 'Plot / Land', count: '4,300+' },
    { image: '/property-images/CommercialOffice.jpg', title: 'Commercial Office', count: '3,500+' },
    { image: '/property-images/Hostel.jpg', title: 'PG / Hostel', count: '3,400+' }
  ];

  const features = [
    { icon: '📸', title: 'Virtual Tours', desc: 'Explore properties from home' },
    { icon: '💬', title: 'Direct Chat', desc: 'Talk to owners directly' },
    { icon: '🔔', title: 'Smart Alerts', desc: 'Get notified of matching listings' },
    { icon: '📍', title: 'Map View', desc: 'See properties on interactive map' },
    { icon: '⭐', title: 'Save Favorites', desc: 'Bookmark properties you like' }
  ];

  const stats = [
    { icon: '🏠', number: '35,000+', label: 'Active properties' },
    { icon: '✅', number: '100%', label: 'Verified listings' },
    { icon: '👥', number: '50,000+', label: 'Happy users' },
    { icon: '⭐', number: '4.9/5', label: 'User satisfaction' }
  ];

  const reviews = [
    { text: 'Found my dream apartment in just 3 days. No broker hassle!', author: 'Priya Sharma', role: 'Tenant' },
    { text: 'Amazing platform! Directly connected with owner and saved lakhs in brokerage.', author: 'Rahul Verma', role: 'Buyer' },
    { text: 'Best property search experience. Filters are so helpful!', author: 'Anjali Mehta', role: 'Tenant' }
  ];

  const searchTips = [
    'Use location filters to narrow down your search',
    'Set price range to see properties within budget',
    'Save your favorite properties for later',
    'Enable notifications for instant updates',
    'Contact multiple owners to compare options'
  ];

  return (
    <div className="buyer-landing-page">
      {/* Hero Section - Background image */}
      <div 
        className="buy-hero-sections"
        style={{
          backgroundImage: `url(${process.env.PUBLIC_URL}/LoginBuy.jpg)`
        }}
      >
        <h1 className="buy-hero-title">Your Next Home Is Just a Click Away</h1>
        <p className="buy-hero-subtitle">Browse 35,000+ verified properties. Connect directly with owners. Move in faster.</p>
        <div className="buy-cta-buttons">
          <button className="buy-btn buy-btn-primary" onClick={() => navigate('/login?role=buyer')}>Login</button>
          <button className="buy-btn buy-btn-secondary" onClick={() => navigate('/register?role=buyer')}>Register Free</button>
        </div>
      </div>

      {/* Property Types */}
      <section className="property-types">
        <h2>What Are You Looking For?</h2>
        <div className="types-grid">
          {propertyTypes.map((type, index) => (
            <div 
              key={index} 
              className="type-card"
              onClick={() => handleRequireAuth('/buyer-dashboard')}
              style={{ cursor: 'pointer', backgroundImage: `url(${type.image})` }}
            >
              <div className="type-card-overlay">
                <h3>{type.title}</h3>
                <p>{type.count} listings</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Benefits Section */}
      <section className="benefits-section">
        <h2>Why Choose Our Platform?</h2>
        <div className="benefits-grid">
          {benefits.map((benefit, index) => (
            <div key={index} className="benefit-card">
              <span className="benefit-icon">{benefit.icon}</span>
              <h3>{benefit.title}</h3>
              <p>{benefit.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Dashboard Preview */}
      <section className="dashboard-preview">
        <h2>Your Personal Property Dashboard</h2>
        <div 
          className="preview-card"
          onMouseEnter={() => setHoveredCard('dashboard')}
          onMouseLeave={() => setHoveredCard(null)}
          onClick={() => handleRequireAuth('/buyer-dashboard')}
          style={{ cursor: 'pointer' }}
        >
          <div className="blur-content">
            <div className="blur-item">Saved Properties: 7e97e97e97e9</div>
            <div className="blur-item">New Matches: 7e97e97e9</div>
            <div className="blur-item">Messages: 7e97e9</div>
          </div>
          {hoveredCard === 'dashboard' && !user && (
            <div className="hover-message">🔒 Login to unlock your dashboard</div>
          )}
        </div>
      </section>

      {/* Reviews Section */}
      <section className="reviews-section">
        <h2>What Our Users Say</h2>
        <div className="reviews-grid">
          {reviews.map((review, index) => (
            <div key={index} className="review-card">
              <p className="review-text">"{review.text}"</p>
              <p className="review-author">— {review.author}, {review.role}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Stats Section */}
      <section className="stats-section">
        <h2>Trusted by Thousands</h2>
        <div className="stats-grid">
          {stats.map((stat, index) => (
            <div key={index} className="stat-card">
              <p>{stat.label}</p>
              <span className="stat-icon">{stat.icon}</span>
              <h3>{stat.number}</h3>
            </div>
          ))}
        </div>
      </section>

      {/* Search Tips */}
      <section className="search-tips-section">
        <h2>Pro Tips for Property Search</h2>
        <div className="tips-container">
          {searchTips.map((tip, index) => (
            <div key={index} className="tip-item">
              <span className="tip-number">{index + 1}</span>
              <p>{tip}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Call to Action */}
      <section className="cta-section">
        <h2>Ready to Find Your New Home?</h2>
        <p>Sign up now and get access to the best property deals in your city.</p>
        <button className="cta-btn" onClick={() => handleRequireAuth('/buyer-dashboard')}>
          Start Your Search Now
        </button>
      </section>
    </div>
  );
}
