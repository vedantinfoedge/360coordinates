import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { API_BASE_URL, API_ENDPOINTS } from '../../config/api.config';
import '../styles/AboutUs.css';

const AboutUs = () => {
  const [statsConfig, setStatsConfig] = useState([]);
  const [animatedStats, setAnimatedStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
    fetchStats();
  }, []);

  useEffect(() => {
    if (!loading && !hasAnimated && statsConfig.length > 0) {
      animateNumbers();
      setHasAnimated(true);
    }
  }, [loading, statsConfig]);

  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.PUBLIC_STATS}`);
      const data = await response.json();
      
      if (data.success && data.data) {
        // Check if new format with stats array exists
        if (data.data.stats && Array.isArray(data.data.stats)) {
          setStatsConfig(data.data.stats);
          // Initialize animated stats
          const initialAnimated = {};
          data.data.stats.forEach(stat => {
            initialAnimated[stat.key] = 0;
          });
          setAnimatedStats(initialAnimated);
        } else {
          // Fallback to old format for backward compatibility
          const fallbackStats = [
            { key: 'properties', value: data.data.total_properties || 0, label: 'Properties Listed', order: 1 },
            { key: 'cities', value: data.data.total_cities || 0, label: 'Cities Covered', order: 2 },
            { key: 'users', value: data.data.total_users || 0, label: 'Happy Customers', order: 3 },
            { key: 'agents', value: data.data.total_agents || 0, label: 'Verified Agents', order: 4 },
          ];
          setStatsConfig(fallbackStats);
          setAnimatedStats({
            properties: 0,
            cities: 0,
            users: 0,
            agents: 0,
          });
        }
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
      // Keep empty array on error
      setStatsConfig([]);
    } finally {
      setLoading(false);
    }
  };

  const animateNumbers = () => {
    const duration = 2000; // 2 seconds
    const steps = 60;
    const stepDuration = duration / steps;

    const animateValue = (start, end, key) => {
      let current = start;
      const increment = (end - start) / steps;
      const timer = setInterval(() => {
        current += increment;
        if ((increment > 0 && current >= end) || (increment < 0 && current <= end)) {
          current = end;
          clearInterval(timer);
        }
        setAnimatedStats(prev => ({ ...prev, [key]: Math.floor(current) }));
      }, stepDuration);
    };

    // Animate all stats dynamically
    statsConfig.forEach(stat => {
      animateValue(0, stat.value, stat.key);
    });
  };

  // Format number with commas
  const formatNumber = (num) => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  return (
    <div className="about-us-page">
      {/* Hero Section */}
      <section className="about-hero" style={{ backgroundImage: `url(${process.env.PUBLIC_URL}/AboutUs.png)` }}>
        <div className="about-hero-overlay"></div>
        <div className="about-hero-content">
          <h1 className="about-hero-title">About 360Coordinates</h1>
          <p className="about-hero-subtitle">
            Your Trusted Partner in Real Estate - Connecting Dreams to Reality
          </p>
        </div>
      </section>

      {/* Our Story Section */}
      <section className="about-section about-story">
        <div className="about-container">
          <div className="about-section-header">
            <h2 className="about-section-title">Our Story</h2>
            <div className="about-title-underline"></div>
          </div>
          <div className="about-story-content">
            <div className="about-story-text">
              <p className="about-paragraph">
                Founded with a vision to revolutionize the real estate industry in India, 360Coordinates 
                emerged as a trusted platform dedicated to simplifying property transactions. We recognized 
                the challenges faced by buyers, sellers, and renters in navigating the complex real estate 
                market and set out to create a seamless, transparent, and user-friendly solution.
              </p>
              <p className="about-paragraph">
                Since our inception, we have been committed to providing verified property listings, 
                transparent pricing, and expert support to make real estate transactions simpler, safer, 
                and faster. Our platform serves as a bridge connecting property seekers with their dream 
                homes and commercial spaces across India.
              </p>
              <p className="about-paragraph">
                Today, 360Coordinates stands as one of the leading real estate platforms, helping thousands 
                of users find their perfect property match. We continue to innovate and expand our services 
                to serve the evolving needs of the Indian real estate market.
              </p>
            </div>
            <div className="about-story-image">
              <div className="about-image-placeholder">
                <svg viewBox="0 0 400 300" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect width="400" height="300" fill="#f3f4f6"/>
                  <path d="M200 100L250 150L200 200L150 150L200 100Z" fill="#764ba2" opacity="0.3"/>
                  <circle cx="200" cy="150" r="40" fill="#003B73" opacity="0.2"/>
                </svg>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Mission & Vision Section */}
      <section className="about-section about-mission-vision">
        <div className="about-container">
          <div className="mission-vision-grid">
            <div className="mission-vision-card">
              <div className="mission-vision-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                </svg>
              </div>
              <h3 className="mission-vision-title">Our Mission</h3>
              <p className="mission-vision-text">
                To empower every Indian with seamless access to verified properties, transparent 
                transactions, and expert guidance, making real estate dreams achievable for everyone.
              </p>
            </div>
            <div className="mission-vision-card">
              <div className="mission-vision-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                  <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
                  <line x1="12" y1="22.08" x2="12" y2="12"/>
                </svg>
              </div>
              <h3 className="mission-vision-title">Our Vision</h3>
              <p className="mission-vision-text">
                To become India's most trusted and innovative real estate platform, transforming 
                how people buy, sell, and rent properties through technology, transparency, and 
                exceptional service.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose Us Section */}
      <section className="about-section about-why-choose">
        <div className="about-container">
          <div className="about-section-header">
            <h2 className="about-section-title">Why Choose 360Coordinates?</h2>
            <div className="about-title-underline"></div>
          </div>
          <div className="why-choose-grid">
            <div className="why-choose-item">
              <div className="why-choose-number">01</div>
              <h3 className="why-choose-title">Verified Listings</h3>
              <p className="why-choose-text">
                Every property on our platform is verified for authenticity, ensuring you 
                get accurate information and genuine listings.
              </p>
            </div>
            <div className="why-choose-item">
              <div className="why-choose-number">02</div>
              <h3 className="why-choose-title">Transparent Pricing</h3>
              <p className="why-choose-text">
                No hidden costs or surprises. We provide clear, upfront pricing information 
                for all properties and services.
              </p>
            </div>
            <div className="why-choose-item">
              <div className="why-choose-number">03</div>
              <h3 className="why-choose-title">Expert Support</h3>
              <p className="why-choose-text">
                Our team of real estate experts is always ready to assist you with property 
                search, negotiations, and transaction support.
              </p>
            </div>
            <div className="why-choose-item">
              <div className="why-choose-number">04</div>
              <h3 className="why-choose-title">Wide Selection</h3>
              <p className="why-choose-text">
                Browse through thousands of properties across India - from apartments and 
                villas to commercial spaces and plots.
              </p>
            </div>
            <div className="why-choose-item">
              <div className="why-choose-number">05</div>
              <h3 className="why-choose-title">Advanced Search</h3>
              <p className="why-choose-text">
                Use our powerful search filters to find properties that match your exact 
                requirements - location, price, size, and more.
              </p>
            </div>
            <div className="why-choose-item">
              <div className="why-choose-number">06</div>
              <h3 className="why-choose-title">Secure Transactions</h3>
              <p className="why-choose-text">
                We prioritize your security and privacy, ensuring safe and secure property 
                transactions with proper documentation support.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Statistics Section */}
      <section className="about-section about-stats">
        <div className="about-container">
          <div className="about-section-header">
            <h2 className="about-section-title">Our Achievements</h2>
            <div className="about-title-underline"></div>
          </div>
          <div className="stats-grid">
            {loading ? (
              <div className="stat-card">
                <div className="stat-number">...</div>
                <div className="stat-label">Loading...</div>
              </div>
            ) : statsConfig.length > 0 ? (
              statsConfig.map((stat) => (
                <div key={stat.key} className="stat-card">
                  <div className="stat-number" data-animate="true">
                    {formatNumber(animatedStats[stat.key] || 0)}+
                  </div>
                  <div className="stat-label">{stat.label}</div>
                </div>
              ))
            ) : (
              <div className="stat-card">
                <div className="stat-number">0+</div>
                <div className="stat-label">No data available</div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="about-section about-cta">
        <div className="about-container">
          <div className="cta-content">
            <h2 className="cta-title">Ready to Find Your Dream Property?</h2>
            <p className="cta-subtitle">
              Join thousands of satisfied customers who found their perfect property through 360Coordinates
            </p>
            <div className="cta-buttons">
              <Link to="/login" className="cta-button cta-primary">
                Start Searching
              </Link>
              <Link to="/login" className="cta-button cta-secondary">
                Contact Us
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AboutUs;

