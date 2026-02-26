import React, { useState } from 'react';
import '../styles/Dashboard.css';

export default function BuyerTenantLandingPage() {
  const [hoveredCard, setHoveredCard] = useState(null);

  const benefits = [
    { icon: '🏠', title: 'Verified Properties Only', desc: 'Browse through authenticated listings' },
    { icon: '🔍', title: 'Advanced Search Filters', desc: 'Find exactly what you need' },
    { icon: '💰', title: 'Zero Brokerage', desc: 'Connect directly with owners' },
    { icon: '✅', title: 'Verified Owners', desc: 'Deal with authenticated sellers only' },
    { icon: '📱', title: 'Instant Notifications', desc: 'Get alerts for new properties' },
    { icon: '🗺️', title: 'Location Insights', desc: 'Detailed area information' }
  ];

  const steps = [
    { num: '1', title: 'Create FREE Account', desc: 'Sign up in seconds' },
    { num: '2', title: 'Browse Properties', desc: 'Use smart filters to find your home' },
    { num: '3', title: 'Connect Directly', desc: 'Chat with owners instantly' },
    { num: '4', title: 'Visit & Finalize', desc: 'Schedule visits and close the deal' }
  ];

  const propertyTypes = [
    { icon: '🏢', title: 'Apartments', count: '15,000+' },
    { icon: '🏡', title: 'Independent Houses', count: '8,500+' },
    { icon: '🏘️', title: 'Villas', count: '3,200+' },
    { icon: '🏬', title: 'Commercial', count: '5,700+' },
    { icon: '🏞️', title: 'Plots', count: '4,300+' },
    { icon: '🏭', title: 'Industrial', count: '2,100+' }
  ];

  const features = [
    { icon: '📸', title: 'Virtual Tours', desc: 'Explore properties from home' },
    { icon: '💬', title: 'Direct Chat', desc: 'Talk to owners directly' },
    { icon: '📊', title: 'Price Comparison', desc: 'Compare similar properties' },
    { icon: '🔔', title: 'Smart Alerts', desc: 'Get notified of matching listings' },
    { icon: '📍', title: 'Map View', desc: 'See properties on interactive map' },
    { icon: '⭐', title: 'Save Favorites', desc: 'Bookmark properties you like' }
  ];

  const stats = [
    { icon: '🏠', number: '35,000+', label: 'Active properties' },
    { icon: '✅', number: '100%', label: 'Verified listings' },
    { icon: '👥', number: '50,000+', label: 'Happy users' },
    { icon: '🎯', number: '4.9/5', label: 'User satisfaction' }
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
      {/* Hero Section */}
      <section className="hero-section">
        <h1 className="hero-title">Find Your Dream Home Without Any Brokerage</h1>
        <p className="hero-subtitle">Browse 35,000+ verified properties. Connect directly with owners. Move in faster.</p>
        <div className="cta-buttons">
          <button className="btn btn-primary">Login</button>
          <button className="btn btn-secondary">Register Free</button>
        </div>
      </section>

      {/* Property Types */}
      <section className="property-types">
        <h2>What Are You Looking For?</h2>
        <div className="types-grid">
          {propertyTypes.map((type, index) => (
            <div key={index} className="type-card">
              <span className="type-icon">{type.icon}</span>
              <h3>{type.title}</h3>
              <p>{type.count} listings</p>
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
        >
          <div className="blur-content">
            <div className="blur-item">Saved Properties: ████</div>
            <div className="blur-item">Recent Searches: ████</div>
            <div className="blur-item">Owner Messages: ████</div>
            <div className="blur-item">Scheduled Visits: ████</div>
          </div>
          {hoveredCard === 'dashboard' && (
            <div className="hover-message">🔒 Login to access your dashboard</div>
          )}
        </div>
      </section>

      {/* How It Works */}
      <section className="how-it-works">
        <h2>How It Works</h2>
        <div className="steps-container">
          {steps.map((step, index) => (
            <div key={index} className="step-card">
              <div className="step-number">{step.num}</div>
              <h3>{step.title}</h3>
              <p>{step.desc}</p>
            </div>
          ))}
        </div>
        <p className="section-cta">Start your property search now — It's 100% FREE!</p>
      </section>

      {/* Features Grid */}
      <section className="features-section">
        <h2>Powerful Features for Smart Search</h2>
        <div className="features-grid">
          {features.map((feature, index) => (
            <div key={index} className="feature-card">
              <span className="feature-icon">{feature.icon}</span>
              <h3>{feature.title}</h3>
              <p>{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Trust Stats */}
      <section className="trust-stats">
        <h2>Trusted by Thousands</h2>
        <div className="stats-grid">
          {stats.map((stat, index) => (
            <div key={index} className="stat-card">
              <span className="stat-icon">{stat.icon}</span>
              <h3>{stat.number}</h3>
              <p>{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Search Tips */}
      <section className="search-tips">
        <h2>Pro Tips for Finding Your Perfect Property</h2>
        <div className="tips-container">
          {searchTips.map((tip, index) => (
            <div key={index} className="tip-item">
              <span className="tip-number">{index + 1}</span>
              <p>{tip}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Reviews */}
      <section className="reviews-section">
        <h2>What Our Users Say</h2>
        <div className="reviews-container">
          {reviews.map((review, index) => (
            <div key={index} className="review-card">
              <p className="review-text">"{review.text}"</p>
              <p className="review-author">— {review.author}, {review.role}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="final-cta">
        <h2>🏡 Ready to Find Your Dream Property?</h2>
        <p>Join 50,000+ users who found their perfect home without paying brokerage!</p>
        <button className="btn btn-large">Start Searching Now →</button>
      </section>
    </div>
  );
}