import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/ChatUsOverlay.css';

const ChatUsOverlay = ({ isOpen, onClose }) => {
  const navigate = useNavigate();

  const handleSignup = () => {
    onClose();
    navigate('/register');
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="buyer-chatus-overlay" onClick={onClose}>
      <div className="buyer-chatus-overlay-content" onClick={(e) => e.stopPropagation()}>
        <button className="buyer-chatus-overlay-close" onClick={onClose} aria-label="Close">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </button>

        <div className="buyer-chatus-overlay-header">
          <div className="buyer-chatus-overlay-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h2 className="buyer-chatus-overlay-title">Start Chatting with Property Owners</h2>
          <p className="buyer-chatus-overlay-subtitle">
            Sign up to connect with sellers and agents, ask questions about properties, and get instant responses
          </p>
        </div>

        <div className="buyer-chatus-overlay-features">
          <div className="buyer-chatus-feature">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span>Chat directly with property owners</span>
          </div>
          <div className="buyer-chatus-feature">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span>Get instant answers to your questions</span>
          </div>
          <div className="buyer-chatus-feature">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span>Schedule property visits and negotiations</span>
          </div>
          <div className="buyer-chatus-feature">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span>Save your conversation history</span>
          </div>
        </div>

        <div className="buyer-chatus-overlay-actions">
          <button className="buyer-chatus-signup-btn" onClick={handleSignup}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="8.5" cy="7" r="4" stroke="currentColor" strokeWidth="2"/>
              <path d="M20 8v6M23 11h-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Sign Up Now
          </button>
          <button className="buyer-chatus-cancel-btn" onClick={onClose}>
            Maybe Later
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatUsOverlay;
