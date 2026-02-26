import React, { useState, useEffect, useRef } from "react";
import SubscriptionPricingCard from "./SubscriptionPricingCard";
import "../styles/PlainTimerPage.css";
import { sellerDashboardAPI } from "../../services/api.service";

const PlainTimerPage = () => {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });
  const [loading, setLoading] = useState(true);
  const timerRef = useRef(null);

  useEffect(() => {
    const fetchAndStartTimer = async () => {
      try {
        const response = await sellerDashboardAPI.getStats();
        
        let endDate;
        
        if (response.success && response.data?.subscription?.end_date) {
          // Use actual subscription end_date from database
          endDate = new Date(response.data.subscription.end_date);
          
          if (isNaN(endDate.getTime())) {
            throw new Error('Invalid end date format');
          }
        } else {
          // Fallback: 3 months from now (shouldn't happen if subscription exists)
          endDate = new Date();
          endDate.setMonth(endDate.getMonth() + 3);
        }
        
        // Clear any existing timer
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
        
        // Start timer
        timerRef.current = setInterval(() => {
          const now = new Date().getTime();
          const distance = endDate.getTime() - now;

          if (distance < 0) {
            if (timerRef.current) clearInterval(timerRef.current);
            setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
          } else {
            setTimeLeft({
              days: Math.floor(distance / (1000 * 60 * 60 * 24)),
              hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
              minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
              seconds: Math.floor((distance % (1000 * 60)) / 1000)
            });
          }
        }, 1000);
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching subscription data:', err);
        // Fallback to 3 months from now
        const endDate = new Date();
        endDate.setMonth(endDate.getMonth() + 3);
        
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
        
        timerRef.current = setInterval(() => {
          const now = new Date().getTime();
          const distance = endDate.getTime() - now;

          if (distance < 0) {
            if (timerRef.current) clearInterval(timerRef.current);
            setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
          } else {
            setTimeLeft({
              days: Math.floor(distance / (1000 * 60 * 60 * 24)),
              hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
              minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
              seconds: Math.floor((distance % (1000 * 60)) / 1000)
            });
          }
        }, 1000);
        
        setLoading(false);
      }
    };

    fetchAndStartTimer();
    
    // Cleanup on unmount
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  if (loading) {
    return (
      <div className="seller-timer-page">
        <div className="seller-timer-content">
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <p>Loading subscription data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="seller-timer-page">
      <div className="seller-timer-content">
        <div className="seller-timer-badge">
          LIMITED TIME OFFER
        </div>

        <h1 className="seller-timer-title">
          <span className="seller-timer-title-purple">3 Months Free</span>
          <br />
          <span className="seller-timer-title-white">Premium Property Upload Access</span>
        </h1>

        <div className="seller-timer-card">
          <div className="seller-timer-header">
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              className="seller-timer-clock-icon"
            >
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
              <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <h2>Your Trial Expires In</h2>
          </div>

          <div className="seller-timer-display">
            {["days", "hours", "minutes", "seconds"].map((unit, idx) => (
              <React.Fragment key={unit}>
                <div className="seller-timer-time-block">
                  <div className="seller-timer-time-box">{String(timeLeft[unit]).padStart(2, "0")}</div>
                  <div className="seller-timer-time-label">{unit.toUpperCase()}</div>
                </div>
                {idx < 3 && <div className="seller-timer-separator">:</div>}
              </React.Fragment>
            ))}
          </div>
        </div>

        <div className="seller-timer-pricing-section">
          <h2 className="seller-timer-pricing-heading">After your trial</h2>
          <SubscriptionPricingCard variant="page" />
        </div>
      </div>
    </div>
  );
};

export default PlainTimerPage;