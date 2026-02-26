import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/Search.css';

const Search = () => {
  const navigate = useNavigate();
  const [hoveredCard, setHoveredCard] = useState(null);

  // Handler to redirect to login
  const handleLoginClick = () => {
    navigate('/login');
  };

  const benefits = [
    { icon: '✔', title: 'Zero Brokerage', desc: 'List and sell without any commission' },
    { icon: '✔', title: 'Verified Buyers & Tenants', desc: 'Connect only with verified users' },
    { icon: '✔', title: 'High Visibility', desc: 'Reach thousands of active seekers' },
    { icon: '✔', title: 'Smart Matching', desc: 'AI-powered buyer recommendations' },
    { icon: '✔', title: 'Instant Notifications', desc: 'Get alerts for new leads immediately' },
    { icon: '✔', title: 'Easy Document Upload', desc: 'Secure and simple process' }
  ];

  const steps = [
    { num: '1', title: 'Create FREE Account', desc: 'Sign up in less than 60 seconds' },
    { num: '2', title: 'Upload Property Details', desc: 'Add photos, price, and features' },
    { num: '3', title: 'Get Leads & Close Deal', desc: 'Connect with serious buyers directly' }
  ];

  const reviews = [
    { text: 'Got 14 enquiries in 48 hours. Sold within a week!', author: 'Amit', role: 'Owner' },
    { text: 'Very smooth process and verified tenants only.', author: 'Nisha', role: 'Landlord' }
  ];

  const lockedFeatures = [
    'Dashboard with leads',
    'Daily enquiries',
    'Property visibility stats',
    'Promote listing options',
    'Chat with buyers/tenants',
    'Priority listing upgrade'
  ];

  const stats = [
    { icon: '🏠', number: '35,000+', label: 'Active property seekers' },
    { icon: '🧾', number: '16,000+', label: 'Listings closed' },
    { icon: '⭐', number: '4.8/5', label: 'Seller satisfaction' },
    { icon: '🔐', number: '100%', label: 'Verified & safe leads' }
  ];

  return (
    <div className="landing-page">
      {/* Hero Section */}
      <section className="hero-section">
        <h1 className="hero-title">Sell or Rent Your Property to 10,000+ Verified Buyers & Tenants</h1>
        <p className="hero-subtitle">Create a free account to list your property, upload photos, and connect directly with serious seekers.</p>
        <div className="cta-buttons">
          <button className="btn btn-primary" onClick={handleLoginClick}>Login</button>
          <button className="btn btn-secondary" onClick={handleLoginClick}>Register</button>
        </div>
      </section>

      {/* Dashboard Preview */}
      <section className="dashboard-preview">
        <h2>Your Seller Dashboard Awaits</h2>
        <div 
          className="preview-card"
          onMouseEnter={() => setHoveredCard('dashboard')}
          onMouseLeave={() => setHoveredCard(null)}
        >
          <div className="blur-content">
            <div className="blur-item">Property Analytics: ████</div>
            <div className="blur-item">Enquiry Messages: ████</div>
            <div className="blur-item">Property Views: ████</div>
          </div>
          {hoveredCard === 'dashboard' && (
            <div className="hover-message">🔒 Login to unlock your seller dashboard</div>
          )}
        </div>
      </section>

      {/* Benefits Section */}
      <section className="benefits-section">
        <h2>Why List With Us?</h2>
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
        <p className="section-cta">Start now — It's 100% free for owners.</p>
      </section>

      {/* Success Stories */}
      <section className="success-stories">
        <h2>Success Stories</h2>
        <div className="reviews-container">
          {reviews.map((review, index) => (
            <div key={index} className="review-card">
              <p className="review-text">"{review.text}"</p>
              <p className="review-author">— {review.author}, {review.role}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Locked Features */}
      <section className="locked-features">
        <h2>What You'll Get After Login</h2>
        <div className="features-grid">
          {lockedFeatures.map((feature, index) => (
            <div key={index} className="feature-item">
              <span className="lock-icon">🔒</span>
              <span>{feature}</span>
            </div>
          ))}
        </div>
        <p className="section-cta">Login to explore your full tools.</p>
      </section>

      {/* Trust Stats */}
      <section className="trust-stats">
        <h2>Already 5,200+ Owners Trust Us</h2>
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

      {/* Right People */}
      <section className="right-people">
        <h2>Show Your Property to the Right People</h2>
        <ul className="features-list">
          <li>Your property is shown to matched buyers/tenants.</li>
          <li>We reduce spam calls using smart filtering.</li>
          <li>Serious seekers only → saves time.</li>
        </ul>
        <button className="btn btn-primary" onClick={handleLoginClick}>Register & Start Listing →</button>
      </section>

      {/* Final CTA */}
      <section className="final-cta">
        <h2>🚀 Ready to Sell or Rent Your Property Faster?</h2>
        <p>Join thousands of owners using our platform.</p>
        <button className="btn btn-large" onClick={handleLoginClick}>Create your free account →</button>
      </section>
    </div>
  );
};

export default Search;