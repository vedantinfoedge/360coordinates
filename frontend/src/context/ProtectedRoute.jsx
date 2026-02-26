// src/context/ProtectedRoute.jsx
import React, { useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading, isVerified, verificationError, retryVerification } = useAuth();
  const location = useLocation();
  const [isRetrying, setIsRetrying] = useState(false);

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        flexDirection: 'column',
        gap: '1rem'
      }}>
        <div className="spinner" style={{
          width: '40px',
          height: '40px',
          border: '4px solid #f3f3f3',
          borderTop: '4px solid #0077C0',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
        <p>Loading...</p>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  // Check user_type (from registration) or role (from login)
  const userRole = user.user_type || user.role;
  
  // Special case: Allow buyers to access seller dashboard for role switching
  // This enables buyers to switch to seller dashboard using the same session
  const isSellerDashboardRoute = location.pathname.startsWith('/seller-dashboard');
  const isBuyerAccessingSeller = userRole === 'buyer' && isSellerDashboardRoute;
  
  if (allowedRoles && !allowedRoles.includes(userRole)) {
    // Allow buyer access to seller dashboard for role switching
    if (isBuyerAccessingSeller) {
      // Allow access - buyer can view seller dashboard with same session
    } else {
      return <Navigate to="/" replace />;
    }
  }

  // Show warning banner if token verification failed due to network error
  const showWarningBanner = !isVerified && verificationError;

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      await retryVerification();
    } finally {
      setIsRetrying(false);
    }
  };

  return (
    <>
      {showWarningBanner && (
        <div style={{
          backgroundColor: '#fff3cd',
          border: '1px solid #ffc107',
          color: '#856404',
          padding: '12px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          position: 'sticky',
          top: 0,
          zIndex: 1000,
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <div style={{ flex: 1 }}>
            <strong>⚠️ Connection Issue:</strong> Unable to verify your session. You're using cached credentials.
            {verificationError?.message && (
              <div style={{ fontSize: '0.9em', marginTop: '4px' }}>
                {verificationError.message}
              </div>
            )}
          </div>
          <button
            onClick={handleRetry}
            disabled={isRetrying}
            style={{
              marginLeft: '16px',
              padding: '8px 16px',
              backgroundColor: '#ffc107',
              color: '#856404',
              border: '1px solid #ffc107',
              borderRadius: '4px',
              cursor: isRetrying ? 'not-allowed' : 'pointer',
              fontWeight: 'bold',
              opacity: isRetrying ? 0.6 : 1
            }}
          >
            {isRetrying ? 'Retrying...' : 'Retry Verification'}
          </button>
        </div>
      )}
      {children}
    </>
  );
};

export default ProtectedRoute;
